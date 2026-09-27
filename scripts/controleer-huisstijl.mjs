/**
 * Visuele controle van de ingelogde omgeving (item 9.3, consistentiecontrole):
 * logt in als het DOD-account, loopt alle schermen langs — inclusief de
 * dossiertabs, lege staten, open menu's/sheets (Radix-portals), de kantoorlogin
 * (`/login/<slug>`) en de pdf's — maakt screenshots en meldt élke plek waar nog
 * VestaAI-groen of de naam "VestaAI" doorkomt.
 *
 *   node --env-file=.env.local scripts/controleer-huisstijl.mjs [poort] [--width=1728]
 *
 * Voor de Definition of Done niet los draaien maar via `npm run dod:screens`
 * (scripts/dod-screens.mjs), dat dit script op 390/1280/1920 px aanroept.
 * Inloggen via sessiecookie en foutstaat-detectie: scripts/lib/dodSessie.mjs.
 * De groentinten komen uit tailwind.config.ts en components/ui/tokens.ts
 * (scripts/lib/vestaGroen.mjs), dus een nieuwe groene token wordt vanzelf gevangen.
 * Exit 1 bij een runtime-fout, VestaAI-groen of de naam VestaAI.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serviceClient, sessieCookie, toontFoutstaat, poortUitArgs, DOD_EMAIL } from './lib/dodSessie.mjs'
import { vestaGroenen, pdfKleurBevindingen } from './lib/vestaGroen.mjs'

const POORT = poortUitArgs('3001')
const breedteArg = process.argv.find(a => a.startsWith('--width='))
const BREEDTE = breedteArg ? Number(breedteArg.split('=')[1]) : 1728
const BASIS = `http://localhost:${POORT}`
const UIT = `/tmp/vesta-shots-${BREEDTE}`

const GROENEN = vestaGroenen()

// Sinds 16 sep 2026: huisstijl en team zijn platform-admin-beheerd (/admin/kantoor/[id]) —
// het kantoor zelf ziet alleen de read-only /kantoor-pagina. /huisstijl en /settings bestaan niet meer.
const PAGINAS = [
  ['dashboard', '/dashboard'],
  ['woningen', '/woningen'],
  ['woningen-kaart', '/woningen?weergave=kaart'],
  ['woningen-leeg', '/woningen?search=zzqx-bestaat-niet'],
  ['object-nieuw', '/object/new'],
  ['kantoor', '/kantoor'],
  ['account', '/account'],
  ['marktanalyse', '/marktanalyse'],
  ['marktanalyse-transacties', '/marktanalyse/transacties'],
  ['marktanalyse-concurrentie', '/marktanalyse/concurrentie'],
  ['marktanalyse-kaart', '/marktanalyse/kaart'],
]

const supabase = serviceClient()

/** Kantoor van het DOD-account + per fase één dossier (RLS-gelijk: alleen eigen kantoor). */
async function eigenKantoorEnDossiers() {
  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('email', DOD_EMAIL).maybeSingle()
  if (!makelaar) return { kantoor: null, dossiers: [] }
  const { data: kantoor } = await supabase.from('kantoren').select('id, name, slug').eq('id', makelaar.kantoor_id).maybeSingle()
  const { data: objecten } = await supabase
    .from('objecten')
    .select('id, fase, waardering_json, content_status')
    .eq('kantoor_id', makelaar.kantoor_id)
    .order('created_at', { ascending: false })
    .limit(200)
  const dossiers = []
  for (const fase of ['verkoopadvies', 'acquisitie', 'in_verkoop', 'verkocht']) {
    const o = (objecten ?? []).find((x) => x.fase === fase)
    if (o) dossiers.push(o)
  }
  const metWaardering = (objecten ?? []).find((x) => x.waardering_json)
  const metContent = (objecten ?? []).find((x) => x.content_status === 'klaar')
  return { kantoor, dossiers, metWaardering, metContent }
}

/** Controle in de pagina: groen in berekende stijlen (incl. SVG en verlopen) + zichtbare naam "VestaAI". */
async function inspecteer(page) {
  return page.evaluate((groenen) => {
    const root = document.querySelector('[style*="--merk"]') ?? document.documentElement
    const rs = getComputedStyle(root)
    // Heeft het kantoor zelf een groene merkkleur, dan is die natuurlijk toegestaan.
    const naarRgb = (v) => {
      const m = v.trim().match(/^#([0-9a-f]{6})$/i)
      if (!m) return null
      const n = parseInt(m[1], 16)
      return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
    }
    const eigen = new Set(['--merk', '--merk-hover', '--merk-zacht', '--merk-rand', '--merk-accent', '--merk-diep', '--merk-op']
      .map((k) => naarRgb(rs.getPropertyValue(k))).filter(Boolean))
    const verboden = groenen.filter((g) => !eigen.has(g))
    const bevat = (waarde) => verboden.find((g) => waarde.includes(`(${g}`) || waarde.includes(`(${g})`))

    const raak = []
    const eigenschappen = ['color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor', 'fill', 'stroke']
    for (const el of document.querySelectorAll('body *')) {
      // De "VestaAI × [kantoorlogo]"-lockup in de topbar is met opzet vast
      // VestaAI-groen (CLAUDE.md § Conventies, besluit 16 sep 2026).
      if (el.closest('[title="VestaAI"]')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none') continue
      for (const eigenschap of eigenschappen) {
        const waarde = s[eigenschap]
        if (!waarde || waarde === 'none') continue
        // fill/stroke staan standaard op zwart/none; alleen SVG-elementen tellen.
        if ((eigenschap === 'fill' || eigenschap === 'stroke') && !(el instanceof SVGElement)) continue
        if (eigenschap.startsWith('border') && parseFloat(s[eigenschap.replace('Color', 'Width')]) === 0) continue
        if (eigenschap === 'outlineColor' && s.outlineStyle === 'none') continue
        const g = bevat(waarde.replace(/rgba?\(/g, '('))
        if (g) {
          const cls = el.getAttribute('class')
          raak.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls.split(' ')[0] : ''} → ${eigenschap}: rgb(${g}) · "${(el.textContent ?? '').trim().slice(0, 40)}"`)
        }
      }
      if (raak.length > 15) break
    }

    // Zichtbare naam "VestaAI" buiten de lockup (CLAUDE.md § Conventies).
    const naam = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const n = walker.currentNode
      // E-mailadressen (demo@vestaai.nl) zijn gegevens, geen merknaam.
      const zonderMail = (n.textContent ?? '').replace(/\S+@\S+/g, '')
      if (!/vesta\s?ai/i.test(zonderMail)) continue
      const ouder = n.parentElement
      if (!ouder || ouder.closest('script,style,noscript,[title="VestaAI"]')) continue
      const r = ouder.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      naam.push(`"${(n.textContent ?? '').trim().slice(0, 60)}"`)
    }

    const inhoud = document.querySelector('main p, main span, main h1, main div')
    return {
      groen: [...new Set(raak)],
      naam: [...new Set(naam)],
      font: getComputedStyle(inhoud ?? document.body).fontFamily,
      merkKleur: rs.getPropertyValue('--merk').trim(),
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '(geen)',
      titel: document.title,
    }
  }, GROENEN)
}

async function main() {
  await mkdir(UIT, { recursive: true })
  const cookie = await sessieCookie()
  const { kantoor, dossiers, metWaardering, metContent } = await eigenKantoorEnDossiers()

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: BREEDTE, height: BREEDTE <= 480 ? 844 : 1080 } })
  await context.addCookies([cookie])
  const page = await context.newPage()
  const paginaFouten = []
  page.on('pageerror', (e) => paginaFouten.push(e.message))
  page.on('crash', () => console.error('   ⚠️ pagina gecrasht (renderer)'))
  const gecrasht = []
  const metGroen = []
  const metNaam = []

  async function controleer(naam, pad, { page: p = page, actie } = {}) {
    if (pad) {
      // networkidle kan uitblijven (pollende componenten, kaarttiles): dan na 10 s gewoon door.
      await p.goto(BASIS + pad, { waitUntil: 'load', timeout: 90_000 })
      await p.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      await p.waitForTimeout(600)
    }
    if (actie) {
      await actie(p)
      await p.waitForTimeout(500)
    }
    await p.screenshot({ path: `${UIT}/${naam}.png`, fullPage: false })

    // Een gecrashte pagina is nooit "schoon" (proefrit 17 sep 2026).
    const crash = await toontFoutstaat(p)
    if (crash || paginaFouten.length) {
      gecrasht.push(`${naam} (${pad ?? 'interactie'})${paginaFouten.length ? ': ' + paginaFouten.join(' | ').slice(0, 300) : ''}`)
      paginaFouten.length = 0
    }

    const b = await inspecteer(p)
    console.log(`\n── ${naam} (${pad ?? 'interactie'})`)
    console.log('   titel      :', b.titel)
    console.log('   --merk     :', b.merkKleur)
    console.log('   font       :', b.font.slice(0, 70))
    if (b.groen.length) {
      metGroen.push(`${naam} (${pad ?? 'interactie'})`)
      console.log('   ⚠️ GROEN GEVONDEN:')
      b.groen.forEach((r) => console.log('     -', r))
    }
    if (b.naam.length) {
      metNaam.push(`${naam} (${pad ?? 'interactie'})`)
      console.log('   ⚠️ NAAM VestaAI ZICHTBAAR:', b.naam.join(' · '))
    }
    if (!b.groen.length && !b.naam.length) console.log('   ✅ schoon')
  }

  for (const [naam, pad] of PAGINAS) await controleer(naam, pad)

  // Dossiers: één per fase, met elk tabblad.
  for (const d of dossiers) {
    const basis = `/object/${d.id}`
    await controleer(`dossier-${d.fase}`, basis)
    for (const tab of ['Buurt & data', 'Content en media']) {
      const knop = page.getByRole('button', { name: tab, exact: false }).first()
      if (await knop.count()) {
        await controleer(`dossier-${d.fase}-${tab.split(' ')[0].toLowerCase()}`, null, { actie: () => knop.click() })
      }
    }
  }

  // Radix-portals: accountmenu en feedbacksheet (les 24 sep 2026: die erfden VestaAI-groen).
  await controleer('menu-account', '/dashboard', {
    actie: async (p) => {
      const knop = p.getByRole('button', { name: /Accountmenu|Menu openen/ }).first()
      if (await knop.isVisible()) await knop.click()
    },
  })
  await controleer('sheet-feedback', null, {
    actie: async (p) => {
      const item = p.getByText('Feedback geven', { exact: true }).first()
      if (await item.isVisible().catch(() => false)) await item.click()
    },
  })
  await page.keyboard.press('Escape')

  // Kantoorlogin (/login/<slug>): zonder sessie, maar in kantoorstijl.
  const uitgelogd = await browser.newContext({ viewport: { width: BREEDTE, height: BREEDTE <= 480 ? 844 : 1080 } })
  const publiek = await uitgelogd.newPage()
  publiek.on('pageerror', (e) => paginaFouten.push(e.message))
  if (kantoor?.slug) await controleer(`login-${kantoor.slug}`, `/login/${kantoor.slug}`, { page: publiek })

  // Grenscontrole: publieke pagina's moeten juist groen blijven.
  for (const pad of ['/', '/login']) {
    await publiek.goto(BASIS + pad, { waitUntil: 'domcontentloaded' })
    const kleur = await publiek.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '(geen)')
    console.log(`\n── publiek ${pad} → ${publiek.url().replace(BASIS, '')} · theme-color: ${kleur} (moet #1A6B45 zijn)`)
  }

  // Pdf's: kleuroperatoren in de (gecomprimeerde) contentstreams + metadata.
  const pdfs = []
  if (metWaardering) pdfs.push(['pdf-waardebepaling', `/api/pdf/waardebepaling?object_id=${metWaardering.id}`])
  if (metContent) pdfs.push(['pdf-brochure', `/api/pdf/generate?object_id=${metContent.id}`])
  for (const [naam, pad] of pdfs) {
    const res = await context.request.get(BASIS + pad, { timeout: 60_000 })
    const type = res.headers()['content-type'] ?? ''
    console.log(`\n── ${naam} (${pad}) → ${res.status()} ${type}`)
    if (!res.ok() || !type.includes('pdf')) {
      gecrasht.push(`${naam} (${pad}): ${res.status()} ${type}`)
      continue
    }
    const { groen, naam: naamHits } = pdfKleurBevindingen(await res.body(), GROENEN)
    if (groen.length) {
      metGroen.push(`${naam} (${pad})`)
      console.log('   ⚠️ GROEN GEVONDEN:', groen.slice(0, 8).join(' · '))
    }
    if (naamHits.length) {
      metNaam.push(`${naam} (${pad})`)
      console.log('   ⚠️ NAAM VestaAI in metadata:', naamHits.join(' · '))
    }
    if (!groen.length && !naamHits.length) console.log('   ✅ schoon')
  }

  await browser.close()
  console.log(`\nScreenshots: ${UIT}`)
  if (gecrasht.length) console.error('\n❌ RUNTIME-FOUT op:\n   ' + gecrasht.join('\n   '))
  if (metGroen.length) console.error('\n❌ VESTAAI-GROEN op:\n   ' + metGroen.join('\n   '))
  if (metNaam.length) console.error('\n❌ NAAM VestaAI op:\n   ' + metNaam.join('\n   '))
  if (gecrasht.length || metGroen.length || metNaam.length) process.exit(1)
  console.log(`\n✅ Huisstijl schoon op ${BREEDTE} px`)
}

main().catch((e) => {
  console.error('\n❌', e.message)
  process.exit(1)
})
