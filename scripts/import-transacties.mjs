/**
 * Importscript voor de transactiedataset-pijplijn (item 5.2, docs/roadmap.md
 * § Fase 5) — leest een Brainbay- of Realworks-export (CSV of XLSX), draait
 * hem door de volledige pijplijn (`lib/importPijplijn.ts`: mappen →
 * normaliseren → kwaliteit → ontdubbelen) en print een rapport. Standaard
 * een dry-run (leest alleen, schrijft niets); `--write` upsert de rijen
 * echt.
 *
 *   npx tsx --env-file=.env.local scripts/import-transacties.mjs \
 *     --bron brainbay|realworks --bestand <pad> --kantoor <kantoor-id> [--write]
 *
 * Vereist in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Draait via `tsx` (niet kaal `node`) omdat dit script rechtstreeks
 * `lib/*.ts`-modules importeert — zelfde patroon als
 * scripts/backtest-waardering.mjs.
 *
 * `--kantoor`: er is geen ingelogde sessie voor een willekeurig kantoor
 * tijdens een importbatch, dus dit script gebruikt overal de SERVICE-client
 * (bypasst RLS) met een HARDE `.eq('kantoor_id', …)`-filter in elke query op
 * `transacties`/`kantoren` — nooit zonder dat filter (zelfde patroon en
 * toelichting als `haalDatasetMetKantoorFilter()` in
 * scripts/backtest-waardering.mjs). `scripts/` is uitgezonderd van de
 * transactiesQuery-guard-test.
 *
 * `eigen_verkoop` wordt afgeleid via `isEigenKantoor()`
 * (lib/kantoorNormalisatie.ts) tegen `kantoren.instellingen_json.
 * kantoor_aliassen` van het opgegeven kantoor — zonder aliassen wordt élke
 * rij `eigen_verkoop: false` (het script waarschuwt dan expliciet).
 *
 * `--write` weigert zonder een back-up van vandaag (`backups/<ISO
 * vandaag>…/`, zie scripts/backup-data.mjs) en schrijft de `imports`-rij
 * (status 'bezig', mét `snapshot_json`/`kwaliteitsrapport_json` al gevuld)
 * VÓÓR de eerste upsert-batch — zo blijft een halverwege mislukte import ook
 * terug te draaien (afspraak hoofdsessie 28 sep 2026: de terugdraaier
 * accepteert zowel status 'klaar' als 'mislukt'). Bij afronden wordt alleen
 * nog status/aantallen/klaar_op bijgewerkt. Upsert in batches van 500 met
 * `import_id` en `onConflict: 'kantoor_id,adres_sleutel,verkoopdatum'`.
 *
 * ⚠️ Dit script wordt in deze ronde NIET met --write gedraaid (er zijn nog
 * geen echte Brainbay/Realworks-exports, zie item 5.1). Een dry-run op een
 * synthetisch testbestand (scripts/fixtures/) is wel prima — die leest
 * alleen (het kantoor-record), schrijft niets.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// xlsx = de officiële SheetJS-release van cdn.sheetjs.com (de npm-versie
// 0.18.5 is verouderd en heeft bekende kwetsbaarheden). ⚠️ In ESM heeft
// SheetJS geen toegang tot het bestandssysteem (`readFile` → "Cannot access
// file"): lees het bestand zelf in en geef de buffer aan `XLSX.read()`.
import * as XLSX from 'xlsx'
import { parseCsv } from '../lib/transactieImport.ts'
import { voerImportPijplijnUit, bouwSnapshot, telNieuwEnBijgewerkt, maakUpsertBatches } from '../lib/importPijplijn.ts'
import { PROFIELEN } from '../lib/importProfielen.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const BATCH = 500
const SLEUTEL_CHUNK = 200 // PostgREST/URL-limiet voor .in(): veel sleutels in stukken opvragen

function log(...a) {
  // eslint-disable-next-line no-console
  console.log(...a)
}

function faal(bericht) {
  console.error(`❌ ${bericht}`)
  process.exit(1)
}

function argWaarde(naam, standaard) {
  const vlag = process.argv.find(a => a.startsWith(`--${naam}=`))
  if (vlag) return vlag.slice(naam.length + 3)
  const i = process.argv.indexOf(`--${naam}`)
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]
  return standaard
}
function heeftVlag(naam) {
  return process.argv.includes(`--${naam}`)
}

const BRON = argWaarde('bron', null)
const BESTAND = argWaarde('bestand', null)
const KANTOOR_ID = argWaarde('kantoor', null)
const WRITE = heeftVlag('write')

if (BRON !== 'brainbay' && BRON !== 'realworks') {
  faal("--bron is verplicht en moet 'brainbay' of 'realworks' zijn.\n   Gebruik: npx tsx --env-file=.env.local scripts/import-transacties.mjs --bron brainbay|realworks --bestand <pad> --kantoor <id> [--write]")
}
if (!BESTAND) faal('--bestand is verplicht (pad naar een .csv of .xlsx bestand).')
if (!KANTOOR_ID) faal('--kantoor is verplicht (kantoor-id, zie /admin).')
if (!fs.existsSync(BESTAND)) faal(`Bestand niet gevonden: ${BESTAND}`)

function vereisEnv(namen) {
  const ontbreekt = namen.filter(k => !process.env[k])
  if (ontbreekt.length) {
    faal(`${ontbreekt.join(', ')} ontbreekt — draai met: npx tsx --env-file=.env.local scripts/import-transacties.mjs …`)
  }
}

/** Leest CSV of XLSX naar { headers, rijen } — rijen als string[][], net als parseCsv() voor CSV. */
function leesBestand(pad) {
  const ext = path.extname(pad).toLowerCase()
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(fs.readFileSync(pad), { type: 'buffer', cellDates: false })
    const eersteBlad = workbook.SheetNames[0]
    if (!eersteBlad) return { headers: [], rijen: [] }
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[eersteBlad], { header: 1, raw: false, defval: '' })
    const headers = (matrix[0] ?? []).map(h => String(h ?? '').trim())
    const rijen = matrix.slice(1).map(r => headers.map((_, i) => (r[i] == null ? '' : String(r[i]))))
    return { headers, rijen }
  }
  const tekst = fs.readFileSync(pad, 'utf-8')
  const alleRijen = parseCsv(tekst)
  if (alleRijen.length === 0) return { headers: [], rijen: [] }
  return { headers: alleRijen[0], rijen: alleRijen.slice(1) }
}

function vereisBackupVandaag() {
  const backupsDir = path.join(PROJECT_ROOT, 'backups')
  const vandaag = new Date().toISOString().slice(0, 10)
  const heeftBackup = fs.existsSync(backupsDir) && fs.readdirSync(backupsDir).some(naam => naam.startsWith(vandaag))
  if (!heeftBackup) {
    faal(`Geen back-up van vandaag (${vandaag}) gevonden in backups/ — draai eerst: node --env-file=.env.local scripts/backup-data.mjs`)
  }
}

const BESTAANDE_KOLOMMEN = [
  'id', 'adres_sleutel', 'verkoopdatum', 'import_id',
  'adres', 'postcode', 'plaats', 'wijk', 'buurt', 'geo',
  'verkoopprijs', 'vraagprijs', 'looptijd_dagen', 'woningtype',
  'woonoppervlak_m2', 'perceel_m2', 'inhoud_m3', 'bouwjaar', 'energielabel',
  'kamers', 'garage', 'tuin', 'buitenruimte', 'eigen_verkoop', 'verkopend_kantoor',
  'bron', 'huisnummer', 'toevoeging', 'woningtype_groep', 'woningtype_sub',
  'geocode_status', 'uitgesloten_reden', 'aankopend_kantoor', 'verkopend_kantoor_norm',
]

/** Bestaande rijen van dit kantoor die een van de sleutels raken — gechunkt, harde kantoor_id-filter. */
async function haalBestaandeRijen(service, kantoorId, sleutels) {
  if (sleutels.length === 0) return []
  const alles = []
  for (let i = 0; i < sleutels.length; i += SLEUTEL_CHUNK) {
    const chunk = sleutels.slice(i, i + SLEUTEL_CHUNK)
    const { data, error } = await service
      .from('transacties')
      .select(BESTAANDE_KOLOMMEN.join(','))
      .eq('kantoor_id', kantoorId) // ⚠️ harde filter — service-client bypasst RLS, dit is de enige bescherming
      .in('adres_sleutel', chunk)
    if (error) throw new Error(`bestaande rijen ophalen mislukt (chunk ${i / SLEUTEL_CHUNK + 1}): ${error.message}`)
    alles.push(...(data ?? []))
  }
  return alles
}

function printRapport(rapport) {
  log(`\n📊 Kwaliteitsrapport`)
  log(`   Rauwe rijen: ${rapport.totaalRuw}`)
  log(`   Overgeslagen (geen adres/sleutel, niet geïmporteerd): ${rapport.overgeslagen.length}`)
  for (const o of rapport.overgeslagen.slice(0, 10)) log(`     regel ${o.regel}: ${o.reden}`)
  if (rapport.overgeslagen.length > 10) log(`     … en ${rapport.overgeslagen.length - 10} meer`)
  log(`   Na ontdubbelen: ${rapport.totaalGeimporteerd} rijen (${rapport.samengevoegd} Brainbay/Realworks-paren samengevoegd)`)
  log(`   Met coördinaat: ${rapport.pctMetCoordinaat}%`)
  log(`   Eigen verkopen: ${rapport.aantalEigenVerkopen}`)

  if (rapport.perUitsluitreden.length > 0) {
    log(`\n   Uitgesloten (blijven bestaan, tellen niet mee in waardering/marktanalyse):`)
    for (const r of rapport.perUitsluitreden) log(`     ${r.label}: ${r.aantal}`)
  }
  if (rapport.perPlaats.length > 0) {
    log(`\n   Per plaats (top 10):`)
    for (const p of rapport.perPlaats.slice(0, 10)) log(`     ${p.plaats}: ${p.aantal}`)
  }
  if (rapport.perJaar.length > 0) {
    log(`\n   Per jaar:`)
    for (const j of rapport.perJaar) log(`     ${j.jaar}: ${j.aantal}`)
  }
}

async function main() {
  vereisEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { headers, rijen: ruweRijen } = leesBestand(BESTAND)
  if (headers.length === 0) faal('Geen kolomkoppen gevonden in het bestand.')
  log(`📄 ${path.basename(BESTAND)}: ${ruweRijen.length} rijen, ${headers.length} kolommen (bron: ${BRON})`)

  const { data: kantoor, error: kantoorError } = await service
    .from('kantoren')
    .select('id, name, instellingen_json')
    .eq('id', KANTOOR_ID) // ⚠️ harde filter — service-client bypasst RLS
    .maybeSingle()
  if (kantoorError || !kantoor) faal(`Kantoor ${KANTOOR_ID} niet gevonden: ${kantoorError?.message ?? 'geen resultaat'}`)

  const kantoorAliassen = kantoor.instellingen_json?.kantoor_aliassen ?? []
  if (kantoorAliassen.length === 0) {
    log(`⚠️  Geen kantoor_aliassen ingesteld voor "${kantoor.name}" — élke rij wordt eigen_verkoop: false.`)
    log(`   Zet instellingen_json.kantoor_aliassen via /admin/kantoor/${KANTOOR_ID} voor een correcte "eigen verkopen"-vlag.`)
  }

  const profiel = PROFIELEN[BRON]
  const { rijen, rapport } = voerImportPijplijnUit(ruweRijen, headers, profiel, kantoorAliassen)

  printRapport(rapport)

  if (!WRITE) {
    log('\n🧪 Dry-run — niets geschreven. Voeg --write toe om dit echt te importeren.')
    return
  }

  vereisBackupVandaag()

  const alleSleutels = Array.from(new Set(rijen.map(r => r.adres_sleutel)))
  const bestaandeRijen = await haalBestaandeRijen(service, KANTOOR_ID, alleSleutels)

  const snapshot = bouwSnapshot(bestaandeRijen, rijen)
  const { nieuw, bijgewerkt } = telNieuwEnBijgewerkt(bestaandeRijen, rijen)
  const uitgesloten = rijen.filter(r => r.uitgesloten_reden).length

  if (snapshot.afgekapt) {
    log(`\n⚠️  Snapshot afgekapt (> ${bijgewerkt} bijgewerkte rijen) — terugdraaien van deze import zal niet (volledig) mogelijk zijn.`)
  }

  // imports-rij VOOR de upserts, met snapshot_json al gevuld — zo blijft een
  // halverwege mislukte import ook terug te draaien (zie bestandscommentaar).
  const { data: importRij, error: importError } = await service
    .from('imports')
    .insert({
      kantoor_id: KANTOOR_ID,
      bron: BRON,
      bestandsnaam: path.basename(BESTAND),
      aantal_rijen: rijen.length,
      aantal_nieuw: nieuw,
      aantal_bijgewerkt: bijgewerkt,
      aantal_uitgesloten: uitgesloten,
      kwaliteitsrapport_json: rapport,
      snapshot_json: snapshot,
      status: 'bezig',
    })
    .select('id')
    .single()
  if (importError || !importRij) faal(`imports-rij aanmaken mislukt: ${importError?.message ?? 'onbekende fout'}`)
  const importId = importRij.id
  log(`\n📝 imports-rij aangemaakt: ${importId} (status: bezig, snapshot al opgeslagen)`)

  try {
    let geschreven = 0
    // Per kolomset (maakUpsertBatches): lege geo/wijk/buurt overschrijven een
    // eerder gegeocodeerde waarde niet bij een herimport.
    const batches = maakUpsertBatches(rijen.map(r => ({ ...r, kantoor_id: KANTOOR_ID, import_id: importId })), BATCH)
    for (const [n, batch] of batches.entries()) {
      const { error } = await service.from('transacties').upsert(batch, { onConflict: 'kantoor_id,adres_sleutel,verkoopdatum' })
      if (error) throw new Error(`batch ${n + 1}: ${error.message}`)
      geschreven += batch.length
      log(`   … ${geschreven}/${rijen.length} weggeschreven`)
    }

    const { error: klaarError } = await service
      .from('imports')
      .update({ status: 'klaar', klaar_op: new Date().toISOString() })
      .eq('id', importId)
    if (klaarError) throw new Error(`imports-rij afronden mislukt: ${klaarError.message}`)

    log(`\n✅ Import klaar: ${nieuw} nieuw, ${bijgewerkt} bijgewerkt, ${uitgesloten} uitgesloten van de ${rijen.length} geïmporteerde rijen.`)
  } catch (err) {
    await service.from('imports').update({ status: 'mislukt' }).eq('id', importId)
    console.error(`\n❌ Import mislukt: ${err.message}`)
    console.error('   De imports-rij (status: mislukt) is terug te draaien — de snapshot was al opgeslagen vóór de upserts.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Onverwachte fout:', err.message)
  process.exit(1)
})
