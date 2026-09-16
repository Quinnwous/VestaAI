/**
 * Visuele controle van de ingelogde omgeving: logt in als het i4housing-account,
 * loopt alle schermen langs, maakt screenshots en meldt élke plek waar nog een
 * VestaAI-groen (#1A6B45 / #2A8A5C en varianten) in een berekende stijl zit.
 *
 *   node --env-file=.env.local scripts/controleer-huisstijl.mjs [poort]
 */
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const POORT = process.argv[2] ?? '3001'
const BASIS = `http://localhost:${POORT}`
const EMAIL = 'quinn.berkouwer@icloud.com'
const UIT = '/tmp/vesta-shots'

const GROENEN = ['26, 107, 69', '42, 138, 92', '17, 66, 48', '199, 230, 213', '241, 247, 243']

const PAGINAS = [
  ['dashboard', '/dashboard'],
  ['object-nieuw', '/object/new'],
  ['huisstijl', '/huisstijl'],
  ['instellingen', '/settings'],
  ['marktanalyse', '/marktanalyse'],
]

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]

async function sessieCookie() {
  const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
  if (error) throw new Error(`magic link mislukt: ${error.message}`)
  const { data: sessie, error: vFout } = await supabase.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: 'email',
  })
  if (vFout) throw new Error(`verifyOtp mislukt: ${vFout.message}`)
  const waarde = 'base64-' + Buffer.from(JSON.stringify(sessie.session)).toString('base64')
  return { name: `sb-${projectRef}-auth-token`, value: waarde, domain: 'localhost', path: '/' }
}

async function main() {
  await mkdir(UIT, { recursive: true })
  const cookie = await sessieCookie()

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1728, height: 1080 } })
  await context.addCookies([cookie])
  const page = await context.newPage()

  // Eerst een echt dossier zoeken zodat we ook het werkblad kunnen zien.
  const { data: object } = await supabase.from('objecten').select('id, address').limit(1).maybeSingle()
  const routes = object ? [...PAGINAS, ['object-werkblad', `/object/${object.id}`]] : PAGINAS

  for (const [naam, pad] of routes) {
    await page.goto(BASIS + pad, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${UIT}/${naam}.png`, fullPage: false })

    const bevindingen = await page.evaluate((groenen) => {
      const raak = []
      for (const el of document.querySelectorAll('*')) {
        const s = getComputedStyle(el)
        for (const eigenschap of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor']) {
          const waarde = s[eigenschap]
          if (groenen.some((g) => waarde.includes(g))) {
            raak.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} → ${eigenschap}: ${waarde} · "${(el.textContent ?? '').trim().slice(0, 40)}"`)
          }
        }
        if (raak.length > 12) break
      }
      const body = getComputedStyle(document.body)
      const merk = getComputedStyle(document.querySelector('[style*="--merk"]') ?? document.body)
      const inhoud = document.querySelector('main p, main span, main h1, main div')
      return {
        groen: [...new Set(raak)],
        font: getComputedStyle(inhoud ?? document.body).fontFamily,
        merkKleur: merk.getPropertyValue('--merk').trim(),
        themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '(geen)',
        titel: document.title,
        bodyFont: body.fontFamily,
      }
    }, GROENEN)

    console.log(`\n── ${naam} (${pad})`)
    console.log('   titel      :', bevindingen.titel)
    console.log('   --merk     :', bevindingen.merkKleur)
    console.log('   theme-color:', bevindingen.themeColor)
    console.log('   font       :', bevindingen.font.slice(0, 70))
    if (bevindingen.groen.length) {
      console.log('   ⚠️ GROEN GEVONDEN:')
      bevindingen.groen.forEach((r) => console.log('     -', r))
    } else {
      console.log('   ✅ geen groen')
    }
  }

  // Grenscontrole: publieke pagina's moeten juist groen blijven — dus zónder sessie.
  const uitgelogd = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const publiek = await uitgelogd.newPage()
  for (const pad of ['/', '/login']) {
    await publiek.goto(BASIS + pad, { waitUntil: 'domcontentloaded' })
    const kleur = await publiek.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '(geen)')
    console.log(`\n── publiek ${pad} → ${publiek.url().replace(BASIS, '')} · theme-color: ${kleur} (moet #1A6B45 zijn)`)
  }

  await browser.close()
  console.log(`\nScreenshots: ${UIT}`)
}

main().catch((e) => {
  console.error('\n❌', e.message)
  process.exit(1)
})
