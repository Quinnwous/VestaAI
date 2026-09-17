/**
 * Demo-fixture: kantoor "Demo Makelaardij" met een geloofwaardige regio
 * (Wassenaar / Den Haag / Voorschoten / Leidschendam / Rijswijk), zodat elke
 * verkenner, kerncijfer, kaart en waardering vanaf nu op data draait i.p.v.
 * lege staten (item 2.3, zie docs/roadmap.md § Fase 2 en § 4 "Vangrails
 * productiedatabase").
 *
 * Rekenhart: lib/waardering.synthetisch.ts (`genereerDemoTransacties`) —
 * dezelfde deterministische generator als de backtest, uitgebreid met echte
 * buurten/straten, fictieve kantoren en `eigen_verkoop`. Dossiers:
 * lib/demoDossiers.ts (handgeschreven, niet willekeurig — 15 individuele
 * voorbeelden). Vangrail-logica (weigeren zonder demo-vlag, --reset-filter):
 * lib/demoFixtureGuard.ts, getest in scripts/seed-demo-kantoor.test.ts.
 *
 * Dit bestand is .mjs en importeert rechtstreeks .ts uit lib/ — dat kan Node
 * niet zonder loader, dus draai het via tsx (devDependency, toegevoegd voor
 * dit item):
 *
 *   npx tsx --env-file=.env.local scripts/seed-demo-kantoor.mjs                # dry-run (standaard, schrijft niets)
 *   npx tsx --env-file=.env.local scripts/seed-demo-kantoor.mjs --write        # schrijft (vereist env DEMO_PASSWORD)
 *   npx tsx --env-file=.env.local scripts/seed-demo-kantoor.mjs --write --reset  # verwijdert eerst bestaande demo-kantoor-rijen, dan opnieuw schrijven
 *
 * Vangrails (hard, zie docs/roadmap.md § 4):
 * - Standaard dry-run: rekent alles uit en print een samenvatting, schrijft niets.
 * - `--reset` alleen samen met `--write`, en raakt uitsluitend rijen van het
 *   geverifieerde demo-kantoor-id (lib/demoFixtureGuard.ts `bouwResetFilter`).
 * - Raakt uitsluitend een kantoor met `instellingen_json.demo === true`; bestaat
 *   er al een kantoor genaamd "Demo Makelaardij" zónder die vlag, dan weigert
 *   het script (lib/demoFixtureGuard.ts `beoordeelDemoKantoor`).
 */
import { createClient } from '@supabase/supabase-js'
import {
  genereerDemoTransacties,
  DEMO_KANTOREN,
  DEMO_KANTOOR_NAAM,
} from '../lib/waardering.synthetisch.ts'
import { DEMO_DOSSIERS, bouwDossierOutputs } from '../lib/demoDossiers.ts'
import { beoordeelDemoKantoor, bouwResetFilter } from '../lib/demoFixtureGuard.ts'

const SCHRIJVEN = process.argv.includes('--write')
const RESET = process.argv.includes('--reset')
const KANTOOR_NAAM = DEMO_KANTOOR_NAAM // 'Demo Makelaardij'
const DEMO_EMAIL = 'demo@vestaai.nl'
const BATCH = 500
const WERKGEBIED_PLAATSEN = ['Wassenaar', "'s-Gravenhage", 'Voorschoten', 'Leidschendam', 'Rijswijk']

const log = (...a) => console.log(...a)
const kop = (t) => log(`\n── ${t} ${'─'.repeat(Math.max(0, 70 - t.length))}`)

if (RESET && !SCHRIJVEN) {
  console.error('❌ --reset kan alleen samen met --write. Draai zonder --reset voor een dry-run.')
  process.exit(1)
}

// Een dry-run rekent alles uit en print, zonder database-verbinding — pas bij
// --write is er een Supabase-service-client (en DEMO_PASSWORD) nodig.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (SCHRIJVEN && (!url || !serviceKey)) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY ontbreken.')
  console.error('   Draai dit script met: npx tsx --env-file=.env.local scripts/seed-demo-kantoor.mjs --write')
  process.exit(1)
}

if (SCHRIJVEN && !process.env.DEMO_PASSWORD) {
  console.error('❌ --write vereist env DEMO_PASSWORD (wachtwoord voor het account demo@vestaai.nl).')
  console.error('   Zet DEMO_PASSWORD in .env.local of geef hem mee: DEMO_PASSWORD=... npx tsx --env-file=.env.local scripts/seed-demo-kantoor.mjs --write')
  process.exit(1)
}

const supabase = SCHRIJVEN ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null

function mediaan(waarden) {
  const s = [...waarden].sort((a, b) => a - b)
  if (s.length === 0) return null
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function euro(n) {
  return n === null ? '—' : `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

// ── 1. Genereren (puur, geen I/O) ───────────────────────────────────────────
kop('1. Genereren')
const transacties = genereerDemoTransacties()
log(`transacties gegenereerd: ${transacties.length}`)

const sleutelSet = new Set(transacties.map(t => `${t.adres_sleutel}|${t.verkoopdatum}`))
if (sleutelSet.size !== transacties.length) {
  log(`⚠️ ${transacties.length - sleutelSet.size} rijen delen een (adres_sleutel, verkoopdatum) — bij upsert overschrijven die elkaar (verwacht bij een gegenereerde dataset van deze omvang, geen fout).`)
}

// ── 2. Dry-run-samenvatting ──────────────────────────────────────────────────
kop('2. Samenvatting — aantallen per plaats')
const perPlaats = new Map()
for (const t of transacties) perPlaats.set(t.plaats, (perPlaats.get(t.plaats) ?? 0) + 1)
for (const [plaats, n] of [...perPlaats.entries()].sort((a, b) => b[1] - a[1])) {
  log(`  ${plaats.padEnd(16)} ${String(n).padStart(5)}  (${(100 * n / transacties.length).toFixed(1)}%)`)
}

kop('Aantallen per typegroep')
const perType = new Map()
for (const t of transacties) perType.set(t.woningtype_groep, (perType.get(t.woningtype_groep) ?? 0) + 1)
for (const [type, n] of [...perType.entries()].sort((a, b) => b[1] - a[1])) {
  log(`  ${type.padEnd(16)} ${String(n).padStart(5)}  (${(100 * n / transacties.length).toFixed(1)}%)`)
}

kop('Aantallen per jaar')
const perJaar = new Map()
for (const t of transacties) {
  const jaar = t.verkoopdatum.slice(0, 4)
  perJaar.set(jaar, (perJaar.get(jaar) ?? 0) + 1)
}
for (const [jaar, n] of [...perJaar.entries()].sort()) log(`  ${jaar}  ${n}`)

kop('Eigen-verkoop-aandeel')
const eigen = transacties.filter(t => t.eigen_verkoop)
const jarenActief = new Set(transacties.map(t => t.verkoopdatum.slice(0, 4))).size
log(`  ${eigen.length} van ${transacties.length}  (${(100 * eigen.length / transacties.length).toFixed(1)}%, ≈${Math.round(eigen.length / jarenActief)}/jaar over ${jarenActief} jaar)`)

kop('Marktaandelen per kantoor')
const perKantoor = new Map()
for (const t of transacties) perKantoor.set(t.verkopend_kantoor, (perKantoor.get(t.verkopend_kantoor) ?? 0) + 1)
for (const k of DEMO_KANTOREN) {
  const n = perKantoor.get(k.naam) ?? 0
  log(`  ${k.naam.padEnd(28)} ${String(n).padStart(5)}  (${(100 * n / transacties.length).toFixed(1)}%, doel ${(k.kans * 100).toFixed(1)}%)`)
}

kop('Prijsniveaus — mediaan per plaats × typegroep')
const perCombi = new Map()
for (const t of transacties) {
  const key = `${t.plaats} / ${t.woningtype_groep}`
  if (!perCombi.has(key)) perCombi.set(key, [])
  perCombi.get(key).push(t.verkoopprijs)
}
for (const [key, prijzen] of [...perCombi.entries()].sort()) {
  log(`  ${key.padEnd(34)} n=${String(prijzen.length).padStart(4)}  mediaan=${euro(mediaan(prijzen))}`)
}

kop('Uitgesloten rijen')
const uitgesloten = transacties.filter(t => t.uitgesloten_reden)
log(`  ${uitgesloten.length} van ${transacties.length}  (${(100 * uitgesloten.length / transacties.length).toFixed(1)}%)`)
const redenen = new Map()
for (const t of uitgesloten) redenen.set(t.uitgesloten_reden, (redenen.get(t.uitgesloten_reden) ?? 0) + 1)
for (const [reden, n] of redenen) log(`    ${n}× ${reden}`)

kop('Voorbeeldrijen (5)')
const voorbeelden = []
const gezien = new Set()
for (const t of [...transacties.slice(0, 3), ...eigen.slice(0, 1), ...uitgesloten.slice(0, 1)]) {
  const sleutel = `${t.adres_sleutel}|${t.verkoopdatum}`
  if (gezien.has(sleutel)) continue
  gezien.add(sleutel)
  voorbeelden.push(t)
}
for (const t of voorbeelden) {
  log(`  ${t.straat} ${t.huisnummer}, ${t.plaats} · ${t.woningtype_groep}${t.woningtype_sub ? ' (' + t.woningtype_sub + ')' : ''} · ${euro(t.verkoopprijs)} · ${t.verkoopdatum} · ${t.verkopend_kantoor}${t.eigen_verkoop ? ' [eigen_verkoop]' : ''}${t.uitgesloten_reden ? ' [uitgesloten: ' + t.uitgesloten_reden + ']' : ''}`)
}

kop('Dossiers')
const fases = new Map()
for (const d of DEMO_DOSSIERS) fases.set(d.fase, (fases.get(d.fase) ?? 0) + 1)
log(`  totaal: ${DEMO_DOSSIERS.length}  (${[...fases.entries()].map(([f, n]) => `${f}=${n}`).join(', ')})`)
log(`  met content: ${DEMO_DOSSIERS.filter(d => d.metContent).length}`)
for (const d of DEMO_DOSSIERS) log(`    [${d.fase}] ${d.address}${d.metContent ? ' (content)' : ''}`)

if (!SCHRIJVEN) {
  kop('Dry-run — niets geschreven')
  log('Draai opnieuw met --write om te schrijven (vereist env DEMO_PASSWORD). Voeg --reset toe om eerst bestaande demo-kantoor-rijen te verwijderen.')
  process.exit(0)
}

// ── 3. Schrijven ─────────────────────────────────────────────────────────────
kop('3. Kantoor opzoeken/aanmaken')
const { data: bestaandKantoor, error: kantoorZoekError } = await supabase
  .from('kantoren')
  .select('id, name, instellingen_json')
  .eq('name', KANTOOR_NAAM)
  .maybeSingle()

if (kantoorZoekError) {
  console.error('❌', kantoorZoekError.message)
  process.exit(1)
}

const beoordeling = beoordeelDemoKantoor(bestaandKantoor, KANTOOR_NAAM)
if (!beoordeling.ok) {
  console.error('❌', beoordeling.reden)
  process.exit(1)
}

let kantoorId = beoordeling.kantoorId
if (beoordeling.actie === 'aanmaken') {
  const { data: nieuw, error } = await supabase
    .from('kantoren')
    .insert({
      name: KANTOOR_NAAM,
      huisstijl_json: {
        schrijftoon: 'informeel',
        slogan: 'Uw referentie voor de regio',
        primaire_kleur: '#2E3A46',
        accent_kleur: '#6B7280',
        lettertype: 'jakarta',
        vorm: 'zacht',
        voorbeelden: [],
      },
      instellingen_json: {
        demo: true,
        werkgebied: { plaatsen: WERKGEBIED_PLAATSEN },
      },
    })
    .select('id')
    .single()
  if (error) { console.error('❌', error.message); process.exit(1) }
  kantoorId = nieuw.id
  log(`  aangemaakt: ${KANTOOR_NAAM} (${kantoorId})`)
} else {
  log(`  hergebruikt: ${KANTOOR_NAAM} (${kantoorId})`)
}

if (RESET) {
  kop('Reset — bestaande demo-kantoor-rijen verwijderen')
  const filter = bouwResetFilter(kantoorId)
  for (const tabel of ['transacties', 'objecten', 'imports']) {
    const { error, count } = await supabase.from(tabel).delete({ count: 'exact' }).match(filter)
    if (error) { console.error(`❌ ${tabel}:`, error.message); process.exit(1) }
    log(`  ${tabel}: ${count ?? 0} rijen verwijderd`)
  }
}

kop('4. Import-rij')
const { data: importRij, error: importError } = await supabase
  .from('imports')
  .insert({ kantoor_id: kantoorId, bron: 'fixture', bestandsnaam: 'seed-demo-kantoor.mjs', status: 'bezig' })
  .select('id')
  .single()
if (importError) { console.error('❌', importError.message); process.exit(1) }
log(`  import_id ${importRij.id}`)

kop('5. Transacties schrijven')
let geschreven = 0
for (let i = 0; i < transacties.length; i += BATCH) {
  const batch = transacties.slice(i, i + BATCH).map(t => ({
    kantoor_id: kantoorId,
    import_id: importRij.id,
    bron: t.bron,
    adres: `${t.straat} ${t.huisnummer}`,
    postcode: null,
    plaats: t.plaats,
    wijk: t.wijk,
    buurt: t.buurt,
    geo: `POINT(${t.lng} ${t.lat})`,
    verkoopprijs: t.verkoopprijs,
    vraagprijs: t.vraagprijs,
    verkoopdatum: t.verkoopdatum,
    looptijd_dagen: t.looptijd_dagen,
    woningtype: t.woningtype_sub ?? t.woningtype_groep,
    woonoppervlak_m2: t.woonoppervlak_m2,
    bouwjaar: t.bouwjaar,
    energielabel: t.energielabel,
    garage: t.garage,
    tuin: t.tuin,
    eigen_verkoop: t.eigen_verkoop,
    verkopend_kantoor: t.verkopend_kantoor,
    adres_sleutel: t.adres_sleutel,
    huisnummer: t.huisnummer,
    toevoeging: t.toevoeging,
    woningtype_groep: t.woningtype_groep,
    woningtype_sub: t.woningtype_sub,
    geocode_status: t.geocode_status,
    uitgesloten_reden: t.uitgesloten_reden,
    verkopend_kantoor_norm: t.verkopend_kantoor_norm,
  }))
  const { error, count } = await supabase
    .from('transacties')
    .upsert(batch, { onConflict: 'kantoor_id,adres_sleutel,verkoopdatum', count: 'exact' })
  if (error) { console.error(`❌ batch ${i / BATCH + 1}:`, error.message); process.exit(1) }
  geschreven += count ?? batch.length
  log(`  batch ${i / BATCH + 1}: ${batch.length} rijen (cumulatief ${geschreven})`)
}

kop('6. Demo-account')
// De trigger handle_new_user (erfenis van zelf-aanmelden) maakt bij elke nieuwe
// auth-user al een makelaars-rij plus een eigen proefkantoor aan. Zelfde aanpak
// als plaatsInKantoor() in app/admin/actions.ts: de rij verplaatsen en het
// zwerfkantoor opruimen — maar alleen als het leeg is en door de trigger komt.
async function plaatsDemoMakelaar(id, huidigKantoorId) {
  const { error } = await supabase
    .from('makelaars')
    .update({ kantoor_id: kantoorId, name: 'Demo Makelaar', role: 'makelaar' })
    .eq('id', id)
  if (error) { console.error('❌', error.message); process.exit(1) }
  if (!huidigKantoorId || huidigKantoorId === kantoorId) return
  const { data: zwerf } = await supabase.from('kantoren').select('id, trial_ends_at, instellingen_json').eq('id', huidigKantoorId).maybeSingle()
  if (!zwerf || zwerf.instellingen_json?.demo === true || !zwerf.trial_ends_at) return
  const tel = async (tabel) => (await supabase.from(tabel).select('id', { count: 'exact', head: true }).eq('kantoor_id', huidigKantoorId)).count ?? 0
  if ((await tel('makelaars')) === 0 && (await tel('objecten')) === 0 && (await tel('transacties')) === 0) {
    await supabase.from('kantoren').delete().eq('id', huidigKantoorId)
    log(`  zwerfkantoor van de signup-trigger opgeruimd (${huidigKantoorId})`)
  }
}

let makelaarId = null
const { data: bestaandeMakelaar } = await supabase.from('makelaars').select('id, kantoor_id').eq('email', DEMO_EMAIL).maybeSingle()
if (bestaandeMakelaar) {
  makelaarId = bestaandeMakelaar.id
  await plaatsDemoMakelaar(makelaarId, bestaandeMakelaar.kantoor_id)
  log(`  hergebruikt: ${DEMO_EMAIL} (${makelaarId})`)
} else {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { kantoor_id: kantoorId, role: 'makelaar' },
  })
  if (createError || !created?.user) {
    console.error('❌ account aanmaken mislukt:', createError?.message ?? 'onbekende fout')
    console.error('   (bestaat de auth-user al zonder makelaars-rij? controleer handmatig in Supabase Auth.)')
    process.exit(1)
  }
  makelaarId = created.user.id
  const { data: triggerRij } = await supabase.from('makelaars').select('kantoor_id').eq('id', makelaarId).maybeSingle()
  if (triggerRij) {
    await plaatsDemoMakelaar(makelaarId, triggerRij.kantoor_id)
  } else {
    const { error: makelaarError } = await supabase.from('makelaars').insert({
      id: makelaarId,
      kantoor_id: kantoorId,
      name: 'Demo Makelaar',
      email: DEMO_EMAIL,
      role: 'makelaar',
    })
    if (makelaarError) { console.error('❌', makelaarError.message); process.exit(1) }
  }
  log(`  aangemaakt: ${DEMO_EMAIL} (${makelaarId})`)
}

kop('7. Dossiers schrijven')
let dossiersGeschreven = 0
let dossiersOvergeslagen = 0
for (const d of DEMO_DOSSIERS) {
  const { data: bestaandDossier } = await supabase
    .from('objecten')
    .select('id')
    .eq('kantoor_id', kantoorId)
    .eq('address', d.address)
    .maybeSingle()
  if (bestaandDossier) { dossiersOvergeslagen++; continue }

  const outputs = bouwDossierOutputs(d)
  const { error } = await supabase.from('objecten').insert({
    kantoor_id: kantoorId,
    makelaar_id: makelaarId,
    address: d.address,
    input_json: d.input,
    outputs_json: outputs,
    content_status: outputs.funda_tekst ? 'klaar' : 'geen',
    content_gegenereerd_op: outputs.funda_tekst ? new Date().toISOString() : null,
    status: d.status,
    fase: d.fase,
    lat: d.lat,
    lng: d.lng,
  })
  if (error) { console.error(`❌ dossier ${d.address}:`, error.message); process.exit(1) }
  dossiersGeschreven++
}
log(`  geschreven: ${dossiersGeschreven}, overgeslagen (al aanwezig): ${dossiersOvergeslagen}`)

kop('8. Import-rij afronden')
await supabase
  .from('imports')
  .update({
    status: 'klaar',
    klaar_op: new Date().toISOString(),
    aantal_rijen: transacties.length,
    aantal_nieuw: geschreven,
    aantal_bijgewerkt: 0,
    aantal_uitgesloten: uitgesloten.length,
  })
  .eq('id', importRij.id)

kop('Klaar')
log(`kantoor_id: ${kantoorId}`)
log(`transacties geschreven (upsert): ${geschreven}`)
log(`dossiers geschreven: ${dossiersGeschreven} (${dossiersOvergeslagen} al aanwezig)`)
log(`demo-account: ${DEMO_EMAIL}`)
