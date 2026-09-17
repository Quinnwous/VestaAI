/**
 * Visuele controle van de ingelogde omgeving: logt in als het i4housing-account,
 * loopt alle schermen langs, maakt screenshots en meldt élke plek waar nog een
 * VestaAI-groen (#1A6B45 / #2A8A5C en varianten) in een berekende stijl zit.
 *
 *   node --env-file=.env.local scripts/controleer-huisstijl.mjs [poort] [--width=1728]
 *
 * Voor de Definition of Done niet los draaien maar via `npm run dod:screens`
 * (scripts/dod-screens.mjs), dat dit script op 390/1280/1920 px aanroept.
 * Inloggen via sessiecookie en foutstaat-detectie: scripts/lib/dodSessie.mjs.
 * Exit 1 bij een runtime-fout of een pagina met VestaAI-groen.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serviceClient, sessieCookie, toontFoutstaat, poortUitArgs } from './lib/dodSessie.mjs'

const POORT = poortUitArgs('3001')
const breedteArg = process.argv.find(a => a.startsWith('--width='))
const BREEDTE = breedteArg ? Number(breedteArg.split('=')[1]) : 1728
const BASIS = `http://localhost:${POORT}`
const UIT = `/tmp/vesta-shots-${BREEDTE}`

const GROENEN = ['26, 107, 69', '42, 138, 92', '17, 66, 48', '199, 230, 213', '241, 247, 243']

// Sinds 16 sep 2026: huisstijl en team zijn platform-admin-beheerd (/admin/kantoor/[id]) —
// het kantoor zelf ziet alleen de read-only /kantoor-pagina. /huisstijl en /settings bestaan niet meer.
const PAGINAS = [
  ['dashboard', '/dashboard'],
  ['woningen', '/woningen'],
  ['object-nieuw', '/object/new'],
  ['kantoor', '/kantoor'],
  ['account', '/account'],
  ['marktanalyse', '/marktanalyse'],
  ['marktanalyse-transacties', '/marktanalyse/transacties'],
  ['marktanalyse-concurrentie', '/marktanalyse/concurrentie'],
  ['marktanalyse-kaart', '/marktanalyse/kaart'],
]

const supabase = serviceClient()

async function main() {
  await mkdir(UIT, { recursive: true })
  const cookie = await sessieCookie()

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: BREEDTE, height: BREEDTE <= 480 ? 844 : 1080 } })
  await context.addCookies([cookie])
  const page = await context.newPage()
  const paginaFouten = []
  page.on('pageerror', (e) => paginaFouten.push(e.message))
  const gecrasht = []
  const metGroen = []

  // Eerst een echt dossier zoeken zodat we ook het werkblad kunnen zien.
  const { data: object } = await supabase.from('objecten').select('id, address').limit(1).maybeSingle()
  const routes = object ? [...PAGINAS, ['object-werkblad', `/object/${object.id}`]] : PAGINAS

  for (const [naam, pad] of routes) {
    await page.goto(BASIS + pad, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${UIT}/${naam}.png`, fullPage: false })

    // Runtime-fout? De foutstaat (app/(app)/error.tsx) of de Next-overlay
    // maakt de huisstijlcheck zinloos: een gecrashte pagina is nooit "schoon"
    // (proefrit 17 sep 2026: /dashboard crashte terwijl dit script groen gaf).
    const crash = await toontFoutstaat(page)
    if (crash || paginaFouten.length) {
      gecrasht.push(`${naam} (${pad})${paginaFouten.length ? ': ' + paginaFouten.join(' | ').slice(0, 300) : ''}`)
      paginaFouten.length = 0
    }

    const bevindingen = await page.evaluate((groenen) => {
      const raak = []
      for (const el of document.querySelectorAll('*')) {
        // De "VestaAI × [kantoorlogo]"-lockup in de topbar is met opzet vast
        // VestaAI-groen (CLAUDE.md § Conventies, besluit 16 sep 2026) — geen
        // bug, dus hier uitgesloten net als de bestandsuitzonderingen in de
        // huisstijl-check-hook (roadmap 1.9).
        if (el.closest('[title="VestaAI"]')) continue
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
      metGroen.push(`${naam} (${pad})`)
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
  if (gecrasht.length) console.error('\n❌ RUNTIME-FOUT op:', gecrasht.join('\n   '))
  if (metGroen.length) console.error('\n❌ VESTAAI-GROEN op:', metGroen.join('\n   '))
  if (gecrasht.length || metGroen.length) process.exit(1)
  console.log(`\n✅ Huisstijl schoon op ${BREEDTE} px`)
}

main().catch((e) => {
  console.error('\n❌', e.message)
  process.exit(1)
})
