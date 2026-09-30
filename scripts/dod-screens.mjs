/**
 * Definition of Done, visuele stap in één commando:
 *
 *   npm run dod:screens               # gebruikt een draaiende server op DOD_PORT (3000), of start er zelf een
 *   npm run dod:screens -- --port=3001
 *   DOD_AXE=0 npm run dod:screens     # axe-scan (stap 3 hieronder) tijdelijk uit
 *
 * 1. controleer-huisstijl.mjs op 390, 1280 en 1920 px (runtime-fouten + VestaAI-groen)
 * 2. screenshots.mjs (alle routes × drie breedtes → screenshots/, beoordelen tegen
 *    docs/ontwerp/principes.md en, voor hero-schermen, skill `ontwerpreview`)
 * 3. axe-scan (item 14.4, `scripts/lib/axeCheck.mjs`): elke ingelogde route op
 *    390/1280/1920 px tegen wcag2a/wcag2aa/wcag21a/wcag21aa. `serious`/`critical`
 *    laat de DoD falen; `moderate`/`minor` worden alleen gelogd. Volledige
 *    bevindingen (alle impact-niveaus) staan na afloop in `screenshots/axe-rapport.json`
 *    (dat pad staat al in .gitignore). Uit te zetten met env `DOD_AXE=0`.
 * 4. linkcheck (item 14.4, `scripts/lib/linkCheck.mjs`): elke interne link op de
 *    publieke pagina's uit de live `/sitemap.xml` moet op 200 uitkomen (ankers
 *    inbegrepen); externe links worden overgeslagen. Dode link → exit 1.
 * 5. toetsenbordronde (item 14.4, `scripts/lib/toetsenbordCheck.mjs`): op de
 *    hero-routes tien keer Tab, en controleren dat elke focusstop een zichtbare
 *    focusindicator heeft. Alleen een waarschuwing (geen exit 1) — de hoofdsessie
 *    beoordeelt de uitkomst eerst.
 *
 * Exit 1 zodra stap 1, 2, 3 (serious/critical) of 4 faalt. Vereist .env.local met
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (en de gewone app-variabelen
 * voor de dev-server). ⚠️ .env.local wijst naar productie: deze scripts lezen
 * alleen, ze schrijven niets (behalve het lokale, genegeerde `screenshots/axe-rapport.json`).
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { poortUitArgs, vereisEnv, sessieCookie } from './lib/dodSessie.mjs'
import { AXE_ROUTES, metDossierRoute, voerAxeScan, logSamenvatting, moetFalen } from './lib/axeCheck.mjs'
import { sitemapPaden, controleerInterneLinks } from './lib/linkCheck.mjs'
import { TOETSENBORD_ROUTES, toetsenbordRonde, logWaarschuwingen } from './lib/toetsenbordCheck.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const POORT = poortUitArgs(process.env.DOD_PORT || '3000')
const BASIS = `http://localhost:${POORT}`

async function bereikbaar() {
  try {
    const res = await fetch(`${BASIS}/login`, { redirect: 'manual', signal: AbortSignal.timeout(3000) })
    return res.status > 0
  } catch {
    return false
  }
}

function draai(script, args) {
  return new Promise((resolve) => {
    const kind = spawn(process.execPath, ['--env-file=.env.local', script, ...args], { cwd: ROOT, stdio: 'inherit' })
    kind.on('exit', (code) => resolve(code ?? 1))
  })
}

async function startServer() {
  console.log(`▶ Geen server op ${BASIS} — start next dev op poort ${POORT} …`)
  const server = spawn('npx', ['next', 'dev', '-p', POORT], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  server.stdout.on('data', () => {})
  server.stderr.on('data', (d) => process.stderr.write(d))
  const tot = Date.now() + 120_000
  while (Date.now() < tot) {
    if (await bereikbaar()) break
    await new Promise((r) => setTimeout(r, 1000))
  }
  if (!(await bereikbaar())) {
    process.kill(-server.pid)
    throw new Error(`dev-server op ${BASIS} kwam niet binnen 2 minuten op`)
  }
  // Eerste compile per route is traag; één keer de zwaarste routes voorverwarmen.
  for (const pad of ['/dashboard', '/woningen', '/marktanalyse', '/marktanalyse/kaart']) {
    await fetch(BASIS + pad, { redirect: 'manual' }).catch(() => {})
  }
  return server
}

async function axeStap() {
  console.log('\n═══ Axe (toegankelijkheid) ═══')
  const cookie = await sessieCookie()
  const routes = await metDossierRoute(AXE_ROUTES)
  const bevindingen = await voerAxeScan({ basis: BASIS, cookie, routes })
  const groepen = logSamenvatting(bevindingen)
  await mkdir(path.join(ROOT, 'screenshots'), { recursive: true })
  await writeFile(
    path.join(ROOT, 'screenshots', 'axe-rapport.json'),
    JSON.stringify({ gegenereerdOp: new Date().toISOString(), tellingen: Object.fromEntries(Object.entries(groepen).map(([k, v]) => [k, v.length])), bevindingen }, null, 2),
  )
  console.log(`   volledig rapport: screenshots/axe-rapport.json (${bevindingen.length} bevinding(en) totaal)`)
  return moetFalen(bevindingen)
}

async function linkcheckStap() {
  console.log('\n═══ Linkcheck (publieke pagina\'s) ═══')
  const paden = await sitemapPaden(BASIS)
  console.log(`   ${paden.length} pagina('s) uit /sitemap.xml: ${paden.join(', ')}`)
  const dodeLinks = await controleerInterneLinks({ basis: BASIS, paden })
  if (dodeLinks.length) {
    console.error('   ❌ DODE LINKS:')
    dodeLinks.forEach((l) => console.error('     -', l))
    return true
  }
  console.log('   ✅ geen dode interne links')
  return false
}

async function toetsenbordStap() {
  console.log('\n═══ Toetsenbordronde (waarschuwing, geen blokkade) ═══')
  const cookie = await sessieCookie()
  const routes = await metDossierRoute(TOETSENBORD_ROUTES)
  const waarschuwingen = await toetsenbordRonde({ basis: BASIS, cookie, routes })
  logWaarschuwingen(waarschuwingen)
}

async function main() {
  vereisEnv()
  const server = (await bereikbaar()) ? null : await startServer()
  let fouten = 0
  try {
    for (const breedte of [390, 1280, 1920]) {
      console.log(`\n═══ Huisstijl ${breedte} px ═══`)
      if ((await draai('scripts/controleer-huisstijl.mjs', [POORT, `--width=${breedte}`])) !== 0) fouten++
    }
    console.log('\n═══ Screenshots ═══')
    if ((await draai('scripts/screenshots.mjs', [POORT])) !== 0) fouten++

    if (process.env.DOD_AXE === '0') {
      console.log('\n═══ Axe (toegankelijkheid) ═══\n   ⏭️  overgeslagen (DOD_AXE=0)')
    } else if (await axeStap()) {
      fouten++
    }

    if (await linkcheckStap()) fouten++

    // Alleen rapporteren — telt bewust niet mee in `fouten` (zie opdracht 14.4 punt 4).
    await toetsenbordStap()
  } finally {
    if (server) process.kill(-server.pid)
  }
  if (fouten) {
    console.error(`\n❌ dod:screens: ${fouten} stap(pen) gefaald`)
    process.exit(1)
  }
  console.log('\n✅ dod:screens groen — beoordeel nu screenshots/ tegen docs/ontwerp/principes.md')
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
