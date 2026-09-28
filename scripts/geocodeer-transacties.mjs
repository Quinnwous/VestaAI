/**
 * Geocodering van transacties (item 5.3, docs/roadmap.md § Fase 5): vult
 * `geo` (PostGIS-punt), `geocode_status` (`exact`/`benaderd`/`mislukt`) en —
 * alleen als ze nog leeg zijn — `wijk`/`buurt` in voor rijen die dat nog
 * missen, via de PDOK Locatieserver (`pdokZoek()` in lib/verrijking.ts +
 * `bouwPdokQuery()`/`beoordeelTreffer()` in lib/geocodering.ts).
 *
 * Hervatbaar: selecteert alléén rijen met `geocode_status is null` én
 * `geo is null`, dus een herhaalde run pakt precies op waar de vorige
 * stopte. Rijen waarvan de PDOK-**call** zelf mislukt (netwerk/HTTP-fout, óók
 * na de ene retry) blijven bewust op `geocode_status = null` staan — die
 * proberen we een volgende run opnieuw. Alleen een geslaagde call zonder
 * (matchende) treffer krijgt `geocode_status = 'mislukt'`.
 *
 * Toegang tot `transacties` — zelfde patroon als scripts/backtest-waardering.mjs
 * (`--kantoor`-tak): SERVICE-client (bypasst RLS) met een HARDE
 * `.eq('kantoor_id', <id>)`-filter in elke query — de enige plek in dit
 * script waar de service-role-key transacties raakt, en nooit zonder dat
 * filter. `scripts/` is uitgezonderd van de transactiesQuery-guard-test.
 *
 * Snelheid: max. ~10 PDOK-verzoeken/seconde (100ms pauze na elke call), één
 * retry bij een mislukte call.
 *
 * Dry-run (standaard): geocodeert een steekproef van max 20 rijen en print
 * per rij wat er geschreven zou worden — schrijft niets.
 * `--write`: weigert zonder een back-up van vandaag (`backups/<datum>…/
 * transacties.json`, zie scripts/backup-data.mjs) en schrijft dan `geo`,
 * `geocode_status` en (alleen als leeg) `wijk`/`buurt` voor élke geselecteerde
 * rij (tot aan `--limiet`, standaard alle openstaande rijen).
 *
 * Gebruik:
 *   npx tsx --env-file=.env.local scripts/geocodeer-transacties.mjs --kantoor=<id>
 *   npx tsx --env-file=.env.local scripts/geocodeer-transacties.mjs --kantoor=<id> --limiet=50
 *   npx tsx --env-file=.env.local scripts/geocodeer-transacties.mjs --kantoor=<id> --write
 *
 * Vereist in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beoordeelTreffer, bouwPdokQuery, naarGeoWkt } from '../lib/geocodering.ts'
import { pdokZoek } from '../lib/verrijking.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

const PDOK_PAUZE_MS = 100 // ~10 verzoeken/s
const DRY_RUN_MAX = 20
const SELECT_BATCH = 500

function log(...a) {
  // eslint-disable-next-line no-console
  console.log(...a)
}

function argWaarde(naam, standaard) {
  const vlag = process.argv.find(a => a.startsWith(`--${naam}=`))
  return vlag ? vlag.slice(naam.length + 3) : standaard
}

const KANTOOR_ID = argWaarde('kantoor', null)
const LIMIET_ARG = argWaarde('limiet', null)
const SCHRIJVEN = process.argv.includes('--write')

if (!KANTOOR_ID) {
  console.error('❌ --kantoor=<id> is verplicht.')
  console.error('   Gebruik: npx tsx --env-file=.env.local scripts/geocodeer-transacties.mjs --kantoor=<id> [--limiet=N] [--write]')
  process.exit(1)
}

function vereisEnv(namen) {
  const ontbreekt = namen.filter(k => !process.env[k])
  if (ontbreekt.length) {
    throw new Error(`${ontbreekt.join(', ')} ontbreekt — draai met: npx tsx --env-file=.env.local scripts/geocodeer-transacties.mjs --kantoor=<id>`)
  }
}

function slaap(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Weigert --write zonder een back-up van vandaag — zelfde vangrail als de
 * andere risicovolle scripts (CLAUDE.md § Vangrails productiedatabase).
 * Zoekt in backups/ naar een map die begint met de datum van vandaag (UTC,
 * zelfde ISO-tijdstip-vorm als scripts/backup-data.mjs schrijft) mét een
 * transacties.json erin.
 */
async function heeftBackupVanVandaag() {
  const vandaag = new Date().toISOString().slice(0, 10)
  const backupsDir = path.join(PROJECT_ROOT, 'backups')
  let entries
  try {
    entries = await readdir(backupsDir, { withFileTypes: true })
  } catch {
    return false
  }
  return entries.some(entry =>
    entry.isDirectory() &&
    entry.name.startsWith(vandaag) &&
    existsSync(path.join(backupsDir, entry.name, 'transacties.json')),
  )
}

/**
 * Alle openstaande rijen van dit kantoor (`geocode_status is null` én
 * `geo is null`), gepagineerd. HARDE `.eq('kantoor_id', …)`-filter — zie
 * bestandscommentaar hierboven.
 */
async function haalOpenstaandeRijen(client, kantoorId, limiet) {
  const alles = []
  let van = 0
  for (;;) {
    const tot = van + SELECT_BATCH - 1
    const { data, error } = await client
      .from('transacties')
      .select('id, adres, postcode, huisnummer, toevoeging, plaats, wijk, buurt')
      .eq('kantoor_id', kantoorId) // ⚠️ harde filter — service-client bypasst RLS, dit is de enige bescherming
      .is('geocode_status', null)
      .is('geo', null)
      .order('id', { ascending: true })
      .range(van, tot)
    if (error) throw new Error(`transacties ophalen (kantoor ${kantoorId}) mislukt: ${error.message}`)
    const rijen = data ?? []
    alles.push(...rijen)
    if (limiet && alles.length >= limiet) return alles.slice(0, limiet)
    if (rijen.length < SELECT_BATCH) break
    van += SELECT_BATCH
  }
  return alles
}

/**
 * Geocodeert één rij: bouwt de PDOK-query, doet de call (met één retry bij
 * 'mislukt'), en beoordeelt de treffer. `callMislukt: true` betekent dat de
 * call zelf (na retry) nog steeds mislukte — die rij laten we ongemoeid
 * (geocode_status blijft null, opnieuw proberen bij de volgende run).
 */
async function geocodeerRij(rij) {
  const query = bouwPdokQuery(rij)
  if (!query) {
    return { rij, uitkomst: beoordeelTreffer(rij, null), callMislukt: false }
  }

  let poging = await pdokZoek(query.q, query.fq)
  await slaap(PDOK_PAUZE_MS)
  if (poging.status === 'mislukt') {
    poging = await pdokZoek(query.q, query.fq)
    await slaap(PDOK_PAUZE_MS)
  }

  if (poging.status === 'mislukt') {
    return { rij, uitkomst: null, callMislukt: true, reden: poging.reden }
  }

  const doc = poging.data?.response?.docs?.[0] ?? null
  return { rij, uitkomst: beoordeelTreffer(rij, doc), callMislukt: false }
}

async function main() {
  vereisEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (SCHRIJVEN && !(await heeftBackupVanVandaag())) {
    console.error('❌ Geen back-up van vandaag gevonden (backups/<datum>…/transacties.json).')
    console.error('   Draai eerst: node --env-file=.env.local scripts/backup-data.mjs')
    process.exit(1)
  }

  const limietArgNum = LIMIET_ARG ? Number(LIMIET_ARG) : null
  // Dry-run blijft altijd op max. 20 rijen, ook met een grotere --limiet.
  const effectieveLimiet = SCHRIJVEN ? limietArgNum : Math.min(limietArgNum ?? DRY_RUN_MAX, DRY_RUN_MAX)

  log(`📍 Geocoderen kantoor ${KANTOOR_ID} — ${SCHRIJVEN ? 'WRITE' : 'dry-run'}${effectieveLimiet ? ` (max ${effectieveLimiet} rijen)` : ''}\n`)

  const rijen = await haalOpenstaandeRijen(client, KANTOOR_ID, effectieveLimiet)
  if (rijen.length === 0) {
    log('✅ Niets te doen — geen rijen met geocode_status is null én geo is null voor dit kantoor.')
    return
  }
  log(`${rijen.length} rij(en) op te pakken.\n`)

  const resultaten = []
  for (const rij of rijen) {
    const resultaat = await geocodeerRij(rij)
    resultaten.push(resultaat)
    const label = resultaat.callMislukt
      ? `mislukt (call, opnieuw proberen: ${resultaat.reden ?? 'onbekend'})`
      : resultaat.uitkomst.status
    log(`  ${label.padEnd(38)} ${rij.adres ?? '(geen adres)'}${rij.plaats ? `, ${rij.plaats}` : ''}`)
  }

  const exact = resultaten.filter(r => !r.callMislukt && r.uitkomst.status === 'exact')
  const benaderd = resultaten.filter(r => !r.callMislukt && r.uitkomst.status === 'benaderd')
  const mislukt = resultaten.filter(r => !r.callMislukt && r.uitkomst.status === 'mislukt')
  const callMislukt = resultaten.filter(r => r.callMislukt)

  const teSchrijven = [...exact, ...benaderd, ...mislukt] // callMislukt-rijen blijven op geocode_status = null

  if (SCHRIJVEN) {
    log(`\n✍️  ${teSchrijven.length} rij(en) schrijven…`)
    for (const { rij, uitkomst } of teSchrijven) {
      const update = { geocode_status: uitkomst.status }
      if (uitkomst.lat !== null && uitkomst.lng !== null) update.geo = naarGeoWkt(uitkomst.lat, uitkomst.lng)
      if (!rij.wijk && uitkomst.wijk) update.wijk = uitkomst.wijk
      if (!rij.buurt && uitkomst.buurt) update.buurt = uitkomst.buurt

      const { error } = await client.from('transacties').update(update).eq('id', rij.id).eq('kantoor_id', KANTOOR_ID)
      if (error) console.error(`  ❌ ${rij.id} (${rij.adres}): ${error.message}`)
    }
    log('✅ Klaar met schrijven.')
  } else {
    log('\n(dry-run — niets geschreven. Draai met --write om dit vast te leggen.)')
  }

  // ── Eindrapport ────────────────────────────────────────────────────────
  const totaalBeoordeeld = exact.length + benaderd.length + mislukt.length
  const pctExact = totaalBeoordeeld ? Math.round((exact.length / totaalBeoordeeld) * 1000) / 10 : 0

  log('\n📊 Eindrapport')
  log(`  Verwerkt: ${resultaten.length}`)
  log(`  Exact:                     ${exact.length}${totaalBeoordeeld ? ` (${pctExact}%)` : ''}`)
  log(`  Benaderd:                  ${benaderd.length}`)
  log(`  Mislukt (geen treffer):    ${mislukt.length}`)
  log(`  Mislukt (call, retry later): ${callMislukt.length}`)

  if (mislukt.length > 0) {
    log('\n  Top-10 mislukte adressen (geen treffer):')
    for (const { rij } of mislukt.slice(0, 10)) {
      log(`   - ${rij.adres ?? '(geen adres)'}${rij.plaats ? `, ${rij.plaats}` : ''}`)
    }
  }
}

main().catch(err => {
  console.error('❌ Geocoderen mislukt:', err.message)
  process.exit(1)
})
