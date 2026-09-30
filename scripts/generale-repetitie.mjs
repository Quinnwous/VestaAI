/**
 * Generale repetitie (roadmap-item 12.5b) — loopt het klik-voor-klik-
 * demoscript (`docs/i4housing/demoscript.md`) automatisch af op 1920×1080 (standaard;
 * `--breedte` voor een ander formaat), meet de laadtijd per stap, en faalt
 * duidelijk zodra iets breekt dat Quinn tijdens de échte demo zou zien.
 *
 *   npm run demo:repetitie                      # demo-kantoor, poort 3101
 *   npm run demo:repetitie -- --kantoor=i4housing
 *   npm run demo:repetitie -- --breedte=1280 --port=3102
 *
 * Vereist dezelfde env als de andere DoD-scripts (.env.local:
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Optioneel DOD_EMAIL
 * om een ander account te forceren (wint van --kantoor).
 *
 * ⚠️ Schrijft niets naar de database en start geen betaalde Claude-call:
 * - Scène 4/5 maken géén nieuw dossier — ze lezen een bestaand dossier van
 *   het gekozen kantoor (verkoopadvies resp. in_verkoop met content_status
 *   'klaar') via de service-client, en klikken de aanmaak-/genereerknoppen
 *   nooit aan (alleen zichtbaarheid/klikbaarheid).
 * - Scène 4, stap 2 typt wél een écht adres in de intake (`SCENE4_ADRES`) en
 *   kiest de eerste BAG-suggestie via het toetsenbord — dit test de
 *   adres-autocomplete en de BAG-voorvulling van bouwjaar/oppervlak écht
 *   (regressietoets voor de BAG-les 27 sep 2026, zie CLAUDE.md). Dat roept
 *   `GET /api/bag` en `GET /api/verrijking` aan (beide alleen lezend,
 *   geverifieerd in de routecode); een netwerklistener bewaakt dat er tijdens
 *   die stappen geen niet-GET-verzoek naar `/api/` gaat. Ná de BAG-check
 *   klikt het script één keer "Volgende →" om de voorvulling zichtbaar te
 *   maken op wizardstap 2 (Woning) — verder dan die stap, of op "Woning
 *   aanmaken", wordt niet geklikt.
 * - "Kwartaalbericht schrijven" (scène 2) start bij het ÓPENEN van de modal
 *   al een Claude-call (useEffect in KwartaalberichtModal) — dus nooit
 *   klikken, alleen de knop zelf controleren.
 * - Referentie "Uitsluiten" en de makelaarscorrectie "Vastleggen" in de
 *   waardering persisteren op de achtergrond naar `objecten.waardering_json`
 *   (fire-and-forget) — nooit klikken, alleen controleren dat ze er zijn.
 *   De Garage/Tuin-correctiechips zijn wél puur lokale wat-als-state (geen
 *   fetch/server action in die handler) en worden daarom aan- en weer
 *   uitgezet.
 * - De fase-pil "In verkoop" (scène 4, stap 12) wijzigt `objecten.fase` én
 *   start automatisch contentgeneratie (fire-and-forget POST /api/generate)
 *   — nooit klikken, alleen zichtbaarheid/klikbaarheid controleren.
 * - De waardebepaling-pdf (GET, leest alleen `waardering_json`) en de
 *   brochure-pdf (GET, "genereert niets met AI") zijn expliciet read-only —
 *   die klikken we wél aan, en meten de duur.
 *
 * Bekende beperking: hoveren over een kaartpin (scène 6, stap 3) is
 * canvas-gerenderd door MapLibre en niet betrouwbaar te automatiseren met
 * een vaste selector — dat onderdeel wordt bewust overgeslagen (zie
 * eindrapport), niet nagemaakt met een schijnzekere check.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sessieCookie, toontFoutstaat, serviceClient, vereisEnv } from './lib/dodSessie.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'screenshots', 'repetitie')

// ── CLI-args ──
function argWaarde(vlag, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${vlag}=`))
  return hit ? hit.slice(vlag.length + 3) : fallback
}

const KANTOOR_SLUG = argWaarde('kantoor', process.env.DEMO_KANTOOR || 'demo')
const BREEDTE = Number(argWaarde('breedte', '1920'))
const HOOGTE = BREEDTE === 1920 ? 1080 : Math.round(BREEDTE * (9 / 16))
const POORT = argWaarde('port', process.env.DOD_PORT || process.env.PORT || '3101')
const BASE_URL = `http://localhost:${POORT}`
// DOD_EMAIL (env) wint altijd — zelfde gedrag als de andere DoD-scripts.
const EMAIL = process.env.DOD_EMAIL || (KANTOOR_SLUG === 'i4housing' ? 'quinn.berkouwer@icloud.com' : 'demo@vestaai.nl')
const TRAAG_MS = 3000

// Scène 4, stap 2 (intake): een écht bestaand adres binnen het BAG — geen
// fixture-adres (die bestaan niet in de BAG en leveren dus nooit een
// suggestie op). Zie CLAUDE.md § BAG-les (27 sep 2026): de adres-autocomplete
// en het bouwjaar/oppervlak-voorvullen deden maandenlang ongemerkt niets
// omdat een mislukte BAG-call stil tot "leeg" werd opgevouwen — dít is de
// regressietoets die dat nooit meer onopgemerkt laat gebeuren.
const SCENE4_ADRES = 'Langstraat 10 Wassenaar'

// ── dev-server: hergebruik een draaiende, of start er zelf één (patroon uit dod-screens.mjs) ──
async function bereikbaar() {
  try {
    const res = await fetch(`${BASE_URL}/login`, { redirect: 'manual', signal: AbortSignal.timeout(3000) })
    return res.status > 0
  } catch {
    return false
  }
}

async function startServer() {
  console.log(`▶ Geen server op ${BASE_URL} — start next dev op poort ${POORT} …`)
  const server = spawn('npx', ['next', 'dev', '-p', POORT], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  server.stderr.on('data', (d) => process.stderr.write(d))
  const tot = Date.now() + 120_000
  while (Date.now() < tot) {
    if (await bereikbaar()) break
    await new Promise((r) => setTimeout(r, 1000))
  }
  if (!(await bereikbaar())) {
    process.kill(-server.pid)
    throw new Error(`dev-server op ${BASE_URL} kwam niet binnen 2 minuten op`)
  }
  return server
}

// ── resultaten & rapportage ──
const resultaten = []

function schoon(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function maakFoutentracker(page) {
  const fouten = { page: [], console: [] }
  page.on('pageerror', (e) => fouten.page.push(e.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') fouten.console.push(msg.text())
  })
  return fouten
}

/** Voert één klik-voor-klik-stap uit, meet de duur, screenshot en registreert het resultaat. */
async function stap(page, fouten, scene, naam, fn) {
  fouten.page.length = 0
  fouten.console.length = 0
  const t0 = Date.now()
  let status = 'ok'
  let detail = ''
  try {
    await fn()
    if (await toontFoutstaat(page)) {
      status = 'fail'
      detail = 'foutstaat of Next.js-foutoverlay in de pagina'
    } else if (fouten.page.length) {
      status = 'fail'
      detail = `pageerror: ${fouten.page.join(' | ').slice(0, 220)}`
    } else if (fouten.console.length) {
      status = 'fail'
      detail = `console-error: ${fouten.console.join(' | ').slice(0, 220)}`
    }
  } catch (err) {
    status = 'fail'
    detail = (err?.message ?? String(err)).slice(0, 300)
  }
  const duurMs = Date.now() - t0
  if (status === 'ok' && duurMs > TRAAG_MS) {
    status = 'warn'
    detail = `traag: ${(duurMs / 1000).toFixed(1)}s (> 3s)`
  }
  const bestand = `${schoon(scene)}--${schoon(naam)}.png`
  try {
    await page.screenshot({ path: path.join(OUT_DIR, bestand), fullPage: true })
  } catch {
    /* pagina al dicht, of navigatie mislukte vóór er iets te schieten was */
  }
  resultaten.push({ scene, stap: naam, status, duurMs, detail, screenshot: bestand })
  const icoon = status === 'ok' ? '✅' : status === 'warn' ? '⚠️ ' : '❌'
  console.log(`${icoon} [${scene}] ${naam} — ${duurMs}ms${detail ? ' — ' + detail : ''}`)
  return status
}

/** Navigeert en controleert status + (niet-)doorverwezen-naar-/login. */
async function ga(page, pad, { verwachtIngelogd = true } = {}) {
  const res = await page.goto(pad, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(350)
  const status = res?.status() ?? 0
  if (status < 200 || status >= 400) throw new Error(`niet-2xx navigatie naar ${pad}: status ${status}`)
  const huidigPad = new URL(page.url()).pathname
  if (verwachtIngelogd && huidigPad.startsWith('/login')) {
    throw new Error(`doorgestuurd naar /login bij ${pad} — sessiecookie niet geaccepteerd`)
  }
  if (!verwachtIngelogd && huidigPad !== pad) {
    throw new Error(`onverwachte redirect: ${pad} → ${huidigPad} (kantoorslug onbekend?)`)
  }
  return res
}

/**
 * Pollt een <input>-veld (via `name`-attribuut, ook zichtbaar bij een
 * ouder-container met `display: none` — PropertyForm.tsx houdt latere
 * wizardstappen altijd gemount) tot het een niet-lege waarde heeft, of gooit
 * een duidelijke fout na `timeout`. Gebruikt voor de BAG-voorvulling van
 * bouwjaar/oppervlak_m2 na het kiezen van een adressuggestie — geen vaste
 * wachttijd, want de BAG-call (`/api/bag`, twee sequentiële Kadaster-calls +
 * EP-Online) is een externe netwerkaanroep met wisselende duur.
 */
async function wachtOpVeldWaarde(page, selector, { timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout
  const veld = page.locator(selector).first()
  for (;;) {
    const waarde = await veld.inputValue().catch(() => '')
    if (waarde && waarde.trim() !== '') return waarde
    if (Date.now() >= deadline) {
      throw new Error(`veld "${selector}" bleef leeg na ${timeout}ms — BAG-voorvulling werkt niet (regressie van de BAG-les 27 sep 2026)`)
    }
    await page.waitForTimeout(200)
  }
}

/** Zoekt een knop/link/tab op zichtbare tekst; gooit een duidelijke fout als niets matcht. */
async function vindKnop(page, naam, { timeout = 8000 } = {}) {
  const rollen = ['button', 'link', 'tab']
  const per = Math.max(1000, Math.floor(timeout / rollen.length))
  for (const rol of rollen) {
    const loc = page.getByRole(rol, { name: naam, exact: false }).first()
    try {
      await loc.waitFor({ state: 'visible', timeout: per })
      return loc
    } catch {
      /* volgende rol proberen */
    }
  }
  throw new Error(`knoplabel "${naam}" niet gevonden`)
}

async function verwachtTekst(page, tekst, { timeout = 8000 } = {}) {
  await page.getByText(tekst).first().waitFor({ state: 'visible', timeout })
}

/**
 * Opent een FilterDropdown (label = trigger-tekst) en vinkt één item aan,
 * sluit daarna via "Gereed". De checkbox-<input> zelf is visueel verborgen
 * (`opacity:0`, 0×0 — components/ui/Checkbox.tsx); Playwright ziet 'm dan als
 * "not stable" en time-out't op een directe klik. De <label> wraps een eigen
 * <span>{label}</span> zónder het telbadge erbij — dáár klikken (natief
 * label→input-gedrag) is wél stabiel.
 *
 * `overigeUitzetten`: de "Plaats"-filter is niet leeg by default — hij start
 * met élke plaats uit het werkgebied al aangevinkt (`standaardFilterState`/
 * `standaardConcurrentieFilter`, plaatsen = werkgebiedPlaatsen). Om écht
 * alléén `itemLabel` over te houden (zoals het demoscript bedoelt met
 * "Plaats → kies Wassenaar"), zetten we de genoemde overige plaatsen eerst
 * uit. **Niet** via de "Wis"-knop: die is voor dit veld kapot (zie het
 * eindrapport van deze sessie — `hooks/useFilterState.ts` `serialiseerFilterState()`
 * slaat een leeg array-veld altijd over bij het naar de URL schrijven, dus
 * `plaatsen: []` wordt nooit in de URL gezet en `parseerFilterState()` valt
 * bij het ontbrekende param terug op de — niet-lege — standaard; "Wis" doet
 * voor "Plaats" dus zichtbaar niets). Dit is een reëel app-issue, geen
 * scriptfout.
 *
 * Alle zoekopdrachten binnen de Popover zelf (`.vui-pop`, components/ui/
 * Popover.tsx), nooit `page.getByText(...)` over de hele pagina: op de
 * Concurrentie-pagina staat "Vrijstaand" bijvoorbeeld óók als typegroep-
 * label in de wie-wint-waar-matrix/ranglijst, en die rij is zelf een
 * klikbaar `role="button"` (opent het concurrentprofiel) — een ongescoopte
 * klik trof daardoor een matrixcel i.p.v. de checkbox, opende de drawer, en
 * liet de Popover zelf sluiten (Radix dismisst 'm als "outside interaction"
 * zodra er een andere overlay opent). `.last()` pakt de meest recent
 * geopende Popover als er toch meerdere in de DOM zouden staan.
 */
async function filterAanvinken(page, dropdownLabel, itemLabel, { overigeUitzetten = [] } = {}) {
  await page.getByRole('button', { name: dropdownLabel, exact: false }).first().click()
  const popover = page.locator('.vui-pop').last()
  await popover.waitFor({ state: 'visible', timeout: 8000 })
  for (const overig of overigeUitzetten) {
    const t = popover.getByText(overig, { exact: true }).first()
    if ((await t.count()) > 0) await t.click()
  }
  const labelTekst = popover.getByText(itemLabel, { exact: true }).first()
  await labelTekst.waitFor({ state: 'visible', timeout: 8000 })
  const cb = popover.getByRole('checkbox', { name: itemLabel, exact: false }).first()
  const staatAlAan = await cb.isChecked().catch(() => false)
  if (!staatAlAan) await labelTekst.click()
  await popover.getByRole('button', { name: 'Gereed', exact: true }).first().click()
}

/** Controleert dat een FilterDropdown-trigger (bv. "Plaats") de verwachte samenvattingstekst toont. */
async function verwachtFilterSamenvatting(page, dropdownLabel, verwachteTekst) {
  const knop = page.getByRole('button', { name: dropdownLabel, exact: false }).first()
  await knop.waitFor({ state: 'visible', timeout: 8000 })
  const tekst = await knop.innerText()
  if (!tekst.includes(verwachteTekst)) {
    throw new Error(`filterknop "${dropdownLabel}" toont niet "${verwachteTekst}" (huidige tekst: ${JSON.stringify(tekst)})`)
  }
}

// ── scènes ──

async function scene1Publiek(browser) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: BREEDTE, height: HOOGTE } })
  const page = await context.newPage()
  const fouten = maakFoutentracker(page)
  await stap(page, fouten, 'scene1', '1-login-pagina-in-huisstijl', async () => {
    await ga(page, `/login/${KANTOOR_SLUG}`, { verwachtIngelogd: false })
    await verwachtTekst(page, /wachtwoord|e-mailadres/i)
  })
  await context.close()
}

async function scene1Rest(page, fouten) {
  await stap(page, fouten, 'scene1', '2-inloggen-en-dashboard', async () => {
    await ga(page, '/dashboard')
  })
  await stap(page, fouten, 'scene1', '3-startbanner', async () => {
    // lib/begroeting.ts kent vier varianten (< 6 uur is "Goedenacht") — de
    // regex miste die tot 28 sep 2026, waardoor deze stap na middernacht
    // ten onrechte faalde (geen app-bug, puur een gat in dit script).
    await verwachtTekst(page, /Goedemorgen|Goedemiddag|Goedenavond|Goedenacht/)
  })
  await stap(page, fouten, 'scene1', '4-kerncijfers', async () => {
    for (const label of [
      'Verkocht laatste 12 maanden',
      'Gem. looptijd',
      'Prijs t.o.v. vraagprijs',
      'In verkoop',
      'Lopende verkoopadviezen',
    ]) {
      await verwachtTekst(page, label)
    }
    const marktaandeel = await page
      .getByText(/Marktaandeel/)
      .first()
      .isVisible()
      .catch(() => false)
    if (!marktaandeel) {
      console.log('   ℹ️  Marktaandeel-tegel niet zichtbaar — werkgebied waarschijnlijk niet ingesteld (bekende, nette terugval, geen fout)')
    }
  })
  await stap(page, fouten, 'scene1', '5-recent-bekeken', async () => {
    await verwachtTekst(page, 'Recent bekeken')
    const leeg = await page
      .getByText('Nog geen dossiers bekeken')
      .first()
      .isVisible()
      .catch(() => false)
    if (leeg) console.log('   ℹ️  "Recent bekeken" is leeg — legitiem bij een vers account, geen fout')
  })
}

async function scene2(page, fouten, werkgebiedPlaatsen) {
  let heeftData = true
  await stap(page, fouten, 'scene2', '1-naar-marktanalyse', async () => {
    await ga(page, '/marktanalyse')
    await verwachtTekst(page, 'Marktanalyse')
    const leeg = await page
      .getByText('Nog geen transacties')
      .first()
      .isVisible()
      .catch(() => false)
    if (leeg) {
      heeftData = false
      if (KANTOOR_SLUG === 'demo') {
        throw new Error('badge toont "Nog geen transacties" op het demo-kantoor — dat hoort altijd data te hebben')
      }
      console.log('   ℹ️  Geen transacties voor dit kantoor (bekende blokkade fase 5) — scène 2 verder overgeslagen')
    }
  })
  if (!heeftData) return

  await stap(page, fouten, 'scene2', '2-filter-plaats-wassenaar', async () => {
    // "Plaats" krijgt geen losse ×-pil onder de filterbalk (anders dan Type/
    // Prijs/Wijken e.d.) — de selectie toont alleen inline in de triggerknop
    // zelf. Demoscript-tekst "Filterpil 'Plaats: Wassenaar' verschijnt" is op
    // dat punt onnauwkeurig (zie eindrapport) — hier getoetst op de knoptekst.
    await filterAanvinken(page, 'Plaats', 'Wassenaar', {
      overigeUitzetten: werkgebiedPlaatsen.filter((p) => p !== 'Wassenaar'),
    })
    await verwachtFilterSamenvatting(page, 'Plaats', 'Wassenaar')
  })
  await stap(page, fouten, 'scene2', '3-filter-woningtype-vrijstaand', async () => {
    await filterAanvinken(page, 'Woningtype', 'Vrijstaand')
  })
  await stap(page, fouten, 'scene2', '4-periode-24-maanden', async () => {
    await page.getByRole('button', { name: '24 mnd', exact: true }).click()
  })
  await stap(page, fouten, 'scene2', '5-tegels-en-grafieken', async () => {
    for (const label of [
      'Mediaan verkoopprijs',
      'Mediaan prijs per m²',
      'Mediaan looptijd',
      'Verkocht t.o.v. vraagprijs',
      'Verkopen in de selectie',
    ]) {
      await verwachtTekst(page, label)
    }
  })
  await stap(page, fouten, 'scene2', '8-kwartaalbericht-knop-zichtbaar', async () => {
    const knop = await vindKnop(page, 'Kwartaalbericht schrijven')
    const disabled = await knop.isDisabled().catch(() => false)
    if (disabled) throw new Error('"Kwartaalbericht schrijven" is disabled — verwacht klikbaar na filtering met resultaten')
    // NIET klikken: het ÓPENEN van de modal start al een Claude-call (zie bestandskop).
  })
}

async function scene3(page, fouten) {
  let heeftMatrix = false
  await stap(page, fouten, 'scene3', '1-naar-concurrentie', async () => {
    await ga(page, '/marktanalyse/concurrentie')
    await verwachtTekst(page, 'Concurrentie')
    const onbekend = await page
      .getByText('Verkopend kantoor onbekend in deze export')
      .first()
      .isVisible()
      .catch(() => false)
    if (onbekend) {
      console.log('   ℹ️  "Verkopend kantoor onbekend in deze export" — scène 3 conform demoscript-terugvalplan overgeslagen')
    } else {
      heeftMatrix = true
    }
  })
  if (!heeftMatrix) return

  await stap(page, fouten, 'scene3', '2-filter-en-matrix', async () => {
    // Let op: Concurrentie's "Wis" reset naar `standaardConcurrentieFilter`
    // (dus wéér het volledige werkgebied, niet leeg zoals bij Marktanalyse —
    // lib/concurrentie.ts) — isoleert Wassenaar hier dus niet. Geen harde
    // assertie op "alleen Wassenaar" hieronder; alleen dat filteren zonder
    // fouten werkt.
    await filterAanvinken(page, 'Plaats', 'Wassenaar')
    await filterAanvinken(page, 'Woningtype', 'Vrijstaand')
    await verwachtTekst(page, /marktaandeel/i)
  })
  await stap(page, fouten, 'scene3', '5-concurrentprofiel-drawer', async () => {
    const rij = page.locator('div[role="button"]').first()
    await rij.waitFor({ state: 'visible', timeout: 8000 })
    await rij.click()
    await page.waitForTimeout(500)
  })
}

async function scene4(page, fouten, dossier) {
  await stap(page, fouten, 'scene4', '1-woning-toevoegen-knop-zichtbaar', async () => {
    await ga(page, '/woningen')
    const knop = await vindKnop(page, 'Woning toevoegen')
    if (!(await knop.isVisible())) throw new Error('"Woning toevoegen" niet zichtbaar')
    // NIET klikken/aanmaken: rest van deze scène gebruikt een bestaand verkoopadvies-dossier.
  })

  // Bewaakt tijdens het typen/kiezen van het adres dat er geen niet-GET-
  // verzoek naar /api/ gaat — handleAdresSelect (PropertyForm.tsx) roept
  // /api/bag en /api/verrijking aan; beide zijn geverifieerd read-only
  // (route-code, zie bestandskop), maar deze listener vangt een toekomstige
  // regressie op zonder dat iemand de route-code opnieuw moet nalezen.
  const nietGetVerzoeken = []
  const bewaakSchrijfacties = (req) => {
    if (req.method() !== 'GET' && req.url().includes('/api/')) nietGetVerzoeken.push(`${req.method()} ${req.url()}`)
  }
  page.on('request', bewaakSchrijfacties)

  await stap(page, fouten, 'scene4', '2-adres-typen-suggestie-verschijnt', async () => {
    await ga(page, '/object/new')
    const invoer = page.getByPlaceholder('Herengracht 1, Amsterdam').first()
    await invoer.waitFor({ state: 'visible', timeout: 8000 })
    await invoer.click()
    // Teken voor teken typen (geen .fill()) — dat is wat de debounce +
    // BAG-call in AddressAutocomplete.tsx écht triggert, i.p.v. één instant
    // onChange die de listener zou kunnen missen.
    await invoer.pressSequentially(SCENE4_ADRES, { delay: 60 })
    try {
      await page.getByRole('listbox').waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      throw new Error(
        `geen BAG-suggestie binnen 5s voor "${SCENE4_ADRES}" — adres-autocomplete/BAG-koppeling (lib/bag.ts, /api/bag/suggest) lijkt stil te falen`,
      )
    }
    const aantalOpties = await page.getByRole('option').count()
    if (aantalOpties === 0) throw new Error(`listbox verscheen maar toont geen enkele optie voor "${SCENE4_ADRES}"`)
  })

  await stap(page, fouten, 'scene4', '3-suggestie-kiezen-toetsenbord', async () => {
    const invoer = page.getByPlaceholder('Herengracht 1, Amsterdam').first()
    const eersteOptie = page.getByRole('option').first()
    const optieTekst = (await eersteOptie.textContent().catch(() => ''))?.trim() ?? ''
    if (!optieTekst) throw new Error('eerste BAG-suggestie heeft geen leesbare tekst')
    // ArrowDown (activeert optie 0, aria-activedescendant) + Enter (kiest
    // haar) — test zo de combobox-ARIA i.p.v. een muisklik op de <li>.
    await invoer.press('ArrowDown')
    await invoer.press('Enter')
    const huidigeWaarde = await invoer.inputValue()
    if (!huidigeWaarde.trim()) throw new Error('adresveld is leeg na ArrowDown+Enter — toetsenbordselectie in AddressAutocomplete werkt niet')
    const expanded = await invoer.getAttribute('aria-expanded')
    if (expanded !== 'false') throw new Error(`combobox aria-expanded is "${expanded}" na selectie — listbox lijkt niet gesloten`)
    if (await page.getByRole('listbox').isVisible().catch(() => false)) {
      throw new Error('listbox staat nog open na het kiezen van een suggestie via het toetsenbord')
    }
  })

  await stap(page, fouten, 'scene4', '4-bag-voorvulling-bouwjaar-oppervlak', async () => {
    const bouwjaar = await wachtOpVeldWaarde(page, 'input[name="bouwjaar"]', { timeout: 8000 })
    const oppervlak = await wachtOpVeldWaarde(page, 'input[name="oppervlak_m2"]', { timeout: 8000 })
    console.log(`      (BAG-voorvulling: bouwjaar=${bouwjaar}, oppervlak_m2=${oppervlak})`)
    if (nietGetVerzoeken.length > 0) {
      throw new Error(`adres typen/kiezen deed niet-GET-verzoek(en) naar /api/: ${nietGetVerzoeken.join(', ')} — dit hoort puur lezend te zijn`)
    }
    // Naar wizardstap 2 (Woning) om de voorvulling ook zichtbaar te maken op
    // de screenshot — geen schrijfactie, puur lokale stap-state (`setStap`).
    await page.getByRole('button', { name: 'Volgende', exact: false }).first().click()
    await page.locator('input[name="bouwjaar"]').waitFor({ state: 'visible', timeout: 5000 })
  })

  page.off('request', bewaakSchrijfacties)

  if (!dossier) {
    console.log('   ⚠️  Geen dossier in fase "Verkoopadvies" gevonden voor dit kantoor — resterende scène 4-stappen overgeslagen')
    return
  }

  await stap(page, fouten, 'scene4', '5-dossier-openen', async () => {
    await ga(page, `/object/${dossier.id}`)
    await verwachtTekst(page, 'Verkoopadvies')
  })

  await stap(page, fouten, 'scene4', '6-waardebepaling-hero', async () => {
    const leeg = await page
      .getByText('Nog geen referenties binnen 5 km')
      .first()
      .isVisible()
      .catch(() => false)
    if (leeg) {
      throw new Error(`waardering toont "Nog geen referenties binnen 5 km" op "${dossier.address}" — kies voor de demo een adres met referenties`)
    }
    await verwachtTekst(page, 'Indicatieve waarde')
    await verwachtTekst(page, 'Referenties')
  })

  await stap(page, fouten, 'scene4', '8-referentie-uitsluiten-knop-zichtbaar', async () => {
    const knop = page.locator('button[title="Uitsluiten"]').first()
    await knop.waitFor({ state: 'visible', timeout: 8000 })
    // NIET klikken: persisteert op de achtergrond naar objecten.waardering_json (zie bestandskop).
  })

  await stap(page, fouten, 'scene4', '9-correctie-chip-garage-tuin', async () => {
    const chip = page.getByRole('button', { name: 'Garage', exact: true })
    if ((await chip.count()) > 0) {
      await chip.first().click()
      await page.waitForTimeout(300)
      await chip.first().click() // terugzetten — puur lokale wat-als-state, geen schrijfactie
    } else {
      console.log('   ℹ️  "Garage"-correctiechip niet gevonden (mogelijk geen data voor die correctie op dit adres)')
    }
  })

  await stap(page, fouten, 'scene4', '10-makelaarscorrectie-velden-zichtbaar', async () => {
    await verwachtTekst(page, 'Makelaarscorrectie')
    await vindKnop(page, 'Vastleggen')
    // NIET klikken: schrijft objecten.waardering_json (correctie) — schrijfactie.
  })

  await stap(page, fouten, 'scene4', '11-waardebepaling-pdf', async () => {
    const knop = await vindKnop(page, 'Waardebepaling-pdf')
    const t0 = Date.now()
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), knop.click()])
    const duurMs = Date.now() - t0
    const pad = await download.path()
    if (!pad) throw new Error('pdf-download leverde geen bestand op')
    console.log(`      (waardebepaling-pdf-duur: ${(duurMs / 1000).toFixed(1)}s)`)
    if (duurMs > 10000) throw new Error(`pdf duurde ${(duurMs / 1000).toFixed(1)}s — belofte in het demoscript is < 10s`)
  })

  await stap(page, fouten, 'scene4', '12-fase-pil-in-verkoop-zichtbaar', async () => {
    const pil = page.getByRole('button', { name: 'In verkoop', exact: true })
    await pil.waitFor({ state: 'visible', timeout: 8000 })
    const disabled = await pil.isDisabled().catch(() => false)
    if (disabled) throw new Error('fase-pil "In verkoop" is disabled')
    // NIET klikken: wijzigt objecten.fase én start automatisch contentgeneratie (Claude-call) — schrijfactie + kosten.
  })
}

async function scene5(page, fouten, dossier) {
  if (!dossier) {
    console.log('   ⚠️  Geen "In verkoop"-dossier met content_status \'klaar\' gevonden voor dit kantoor — scène 5 overgeslagen')
    return
  }

  await stap(page, fouten, 'scene5', '1-content-tab-openen', async () => {
    await ga(page, `/object/${dossier.id}?tab=content`)
    const legeStaat = await page
      .getByText('Nog geen content gegenereerd')
      .first()
      .isVisible()
      .catch(() => false)
    if (legeStaat) {
      throw new Error(`dossier "${dossier.address}" heeft content_status='klaar' in de database maar toont de lege staat`)
    }
    await verwachtTekst(page, 'Funda')
  })

  await stap(page, fouten, 'scene5', '4-tab-funda', async () => {
    await page.getByRole('tab', { name: 'Funda', exact: true }).click()
  })

  await stap(page, fouten, 'scene5', '5-tab-whatsapp', async () => {
    await page.getByRole('tab', { name: 'WhatsApp', exact: true }).click()
  })

  await stap(page, fouten, 'scene5', '6-brochure-pdf', async () => {
    await page.getByRole('tab', { name: 'Brochure', exact: true }).click()
    const knop = await vindKnop(page, 'Exporteer PDF')
    const t0 = Date.now()
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), knop.click()])
    const duurMs = Date.now() - t0
    const pad = await download.path()
    if (!pad) throw new Error('brochure-pdf leverde geen bestand op')
    console.log(`      (brochure-pdf-duur: ${(duurMs / 1000).toFixed(1)}s)`)
  })

  await stap(page, fouten, 'scene5', '8-leren-van-bewerkingen', async () => {
    const kop = page.getByText('Leren van je bewerkingen', { exact: false }).first()
    await kop.waitFor({ state: 'visible', timeout: 8000 })
    await kop.scrollIntoViewIfNeeded().catch(() => {})
    // Drie mogelijke staten (components/StijlLerenPaneel.tsx): 0 bewerkingen
    // (platte tekst), 1..minimum-1 ("te weinig om te analyseren") of
    // ≥ minimum (knop "Analyseer N bewerkingen"). Alleen de laatste is
    // klikbaar — en die klikken we hier niet aan ("Analyseer" kost een
    // Claude-call). Dit is verwacht/legitiem als het demo-dossier nog geen
    // vooraf gezette bewerkingen heeft (zie demoscript-voorbereiding); geen
    // van de drie staten is dus een fout op zichzelf.
    const analyseKnop = page.getByRole('button', { name: /^Analyseer/ })
    if ((await analyseKnop.count()) > 0) {
      console.log('   ℹ️  "Analyseer N bewerkingen" staat klaar (≥ minimum bewerkingen) — niet aangeklikt, kost een Claude-call')
    } else {
      const teWeinig = await page
        .getByText('nog te weinig om te analyseren', { exact: false })
        .first()
        .isVisible()
        .catch(() => false)
      console.log(
        teWeinig
          ? '   ℹ️  "Leren van je bewerkingen" toont "te weinig om te analyseren" — vooraf gezette bewerkingen ontbreken (zie demoscript-terugvalplan)'
          : '   ℹ️  "Leren van je bewerkingen" toont 0 bewerkingen — dossier heeft nog geen vooraf gezette tekstbewerkingen',
      )
    }
  })
}

async function scene6(page, fouten) {
  await stap(page, fouten, 'scene6', '1-verkoopkaart-openen', async () => {
    await ga(page, '/marktanalyse/kaart')
    await verwachtTekst(page, 'Verkoopkaart')
  })
  await stap(page, fouten, 'scene6', '2-afspeelknop', async () => {
    const knop = page.getByRole('button', { name: 'Afspelen door de tijd', exact: true })
    await knop.waitFor({ state: 'visible', timeout: 8000 })
    await knop.click()
    await page.waitForTimeout(1500)
    const pauzeKnop = page.getByRole('button', { name: 'Pauzeren', exact: true })
    if ((await pauzeKnop.count()) > 0) await pauzeKnop.first().click()
  })
  console.log('   ℹ️  Stap 3 (hover op een pin) is canvas-gerenderd door MapLibre en niet betrouwbaar te automatiseren — bewust overgeslagen')
  await stap(page, fouten, 'scene6', '4-filter-woningtype', async () => {
    await filterAanvinken(page, 'Woningtype', 'Vrijstaand')
  })
}

// ── rapport ──
function rapport() {
  console.log('\n═══ Eindrapport generale repetitie ═══')
  const kolomScene = Math.max(6, ...resultaten.map((r) => r.scene.length))
  const kolomStap = Math.max(4, ...resultaten.map((r) => r.stap.length))
  console.log(`${'Scène'.padEnd(kolomScene)}  ${'Stap'.padEnd(kolomStap)}  Status   Duur`)
  let totaalMs = 0
  let fout = 0
  let waarschuwing = 0
  for (const r of resultaten) {
    totaalMs += r.duurMs
    if (r.status === 'fail') fout++
    if (r.status === 'warn') waarschuwing++
    const icoon = r.status === 'ok' ? '✅ ok  ' : r.status === 'warn' ? '⚠️  warn' : '❌ fail'
    console.log(`${r.scene.padEnd(kolomScene)}  ${r.stap.padEnd(kolomStap)}  ${icoon}  ${String(r.duurMs).padStart(6)}ms${r.detail ? '  — ' + r.detail : ''}`)
  }
  console.log(`\nTotaal: ${resultaten.length} stappen, ${(totaalMs / 1000).toFixed(1)}s, ${fout} fout(en), ${waarschuwing} waarschuwing(en)`)
  console.log(`Screenshots: ${path.relative(ROOT, OUT_DIR)}/`)
  return fout
}

// ── main ──
async function main() {
  vereisEnv()
  await mkdir(OUT_DIR, { recursive: true })

  const server = (await bereikbaar()) ? null : await startServer()
  let foutenAantal = 0
  try {
    const service = serviceClient()
    const { data: kantoor, error: kantoorFout } = await service
      .from('kantoren')
      .select('id,name,instellingen_json')
      .eq('slug', KANTOOR_SLUG)
      .maybeSingle()
    if (kantoorFout) throw new Error(`kantoor-lookup mislukt: ${kantoorFout.message}`)
    if (!kantoor) throw new Error(`kantoor met slug "${KANTOOR_SLUG}" niet gevonden`)
    const werkgebiedPlaatsen = kantoor.instellingen_json?.werkgebied?.plaatsen ?? ['Wassenaar']

    async function eersteDossier(fase, extra = {}) {
      let q = service.from('objecten').select('id,address,fase,content_status').eq('kantoor_id', kantoor.id).eq('fase', fase)
      for (const [k, v] of Object.entries(extra)) q = q.eq(k, v)
      const { data } = await q.order('created_at').limit(1).maybeSingle()
      return data
    }
    const verkoopadviesDossier = await eersteDossier('verkoopadvies')
    const inVerkoopKlaarDossier = await eersteDossier('in_verkoop', { content_status: 'klaar' })

    console.log(
      `ℹ️  Kantoor: ${kantoor.name} (${KANTOOR_SLUG}) op ${BASE_URL}, viewport ${BREEDTE}×${HOOGTE}\n` +
        `   verkoopadvies-dossier: ${verkoopadviesDossier?.address ?? '(geen)'}\n` +
        `   in_verkoop (klaar)-dossier: ${inVerkoopKlaarDossier?.address ?? '(geen)'}`,
    )

    const browser = await chromium.launch()
    try {
      await scene1Publiek(browser)

      const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: BREEDTE, height: HOOGTE } })
      const cookie = await sessieCookie(EMAIL)
      await context.addCookies([cookie])
      const page = await context.newPage()
      const fouten = maakFoutentracker(page)

      await scene1Rest(page, fouten)
      await scene2(page, fouten, werkgebiedPlaatsen)
      await scene3(page, fouten)
      await scene4(page, fouten, verkoopadviesDossier)
      await scene5(page, fouten, inVerkoopKlaarDossier)
      await scene6(page, fouten)

      await context.close()
    } finally {
      await browser.close()
    }
  } finally {
    if (server) process.kill(-server.pid)
    foutenAantal = rapport()
  }

  if (foutenAantal > 0) {
    console.error(`\n❌ generale-repetitie: ${foutenAantal} stap(pen) gefaald`)
    process.exit(1)
  }
  console.log('\n✅ generale-repetitie groen')
}

main().catch((err) => {
  console.error('❌', err.message)
  rapport()
  process.exit(1)
})
