/**
 * Back-up van alle bedrijfstabellen én Storage naar lokale bestanden, vóór
 * elke risicovolle actie op de productiedatabase (migratie, import,
 * bulk-update, opruimen) — zie CLAUDE.md § Vangrails en docs/werkwijze.md § 5.
 *
 * We draaien op het gratis Supabase-plan zonder herstelbare back-ups, dus dit
 * script is het enige vangnet vóór een destructieve actie. Standaard alléén
 * lezen en wegschrijven (nooit destructief zelf); er is geen --write-vlag
 * nodig omdat dit script niets in de database verandert.
 *
 *   node --env-file=.env.local scripts/backup-data.mjs [--zonder-storage]
 *
 * Schrijft naar VestaAI/backups/<ISO-tijdstip>/ (in .gitignore):
 *   - <tabel>.json per tabel
 *   - storage/<bucket>/<pad> per Storage-object (overgeslagen met --zonder-storage)
 *   - manifest.json — tijdstip, per tabel het aantal rijen, per bucket aantal
 *     bestanden en bytes (docs/werkwijze.md § 5 "Herstelprocedure" gebruikt dit
 *     om te controleren of een herstel compleet is).
 *
 * Controleert na afloop of het aantal weggeschreven rijen overeenkomt met het
 * aantal rijen dat de database rapporteert (count via head-request) — bij een
 * afwijking stopt het script met een foutcode in plaats van stilzwijgend door
 * te gaan met een onvolledige back-up.
 */
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { berekenPaginas, isStorageMap, maakManifest, storageBestandsPad } from './lib/backupPijplijn.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

const ZONDER_STORAGE = process.argv.includes('--zonder-storage')

// Alle bedrijfstabellen in schema public — gecontroleerd tegen de live
// database op 1 okt 2026 (`list_tables`). Bewust uitgesloten:
// - spatial_ref_sys: PostGIS-systeemtabel (SRID-referentiedata), geen
//   bedrijfsdata en niet per kantoor (8500+ vaste rijen, RLS staat uit).
const TABELLEN = [
  'kantoren',
  'makelaars',
  'objecten',
  'transacties',
  'object_documenten',
  'object_fotos',
  'stijl_bewerkingen',
  // Bevat snapshot_json waarmee een import wordt teruggedraaid (lib/importPijplijn.ts) —
  // zonder deze tabel in de back-up is een import na een herstel niet meer terug te draaien.
  'imports',
  'gebruik_events',
]

const PAGE = 1000

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY ontbreken.')
  console.error('   Draai dit script met: node --env-file=.env.local scripts/backup-data.mjs')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

async function backupTabel(naam, dir) {
  // count via head-request, los van de paginering hieronder, zodat we een
  // onafhankelijke referentie hebben om tegen te controleren.
  const { count: verwachtAantal, error: countError } = await supabase
    .from(naam)
    .select('*', { count: 'exact', head: true })

  if (countError) {
    // Een tabel die (nog) niet bestaat is geen fout van dit script — meld het
    // en ga door met de rest, zodat een back-up vóór fase 1/3 niet blokkeert
    // op een tabel die pas later gebouwd wordt.
    console.warn(`⚠️  ${naam}: kon niet tellen (${countError.message}) — overgeslagen.`)
    return { naam, overgeslagen: true }
  }

  let alleRijen = []
  for (const { from, to } of berekenPaginas(verwachtAantal ?? 0, PAGE)) {
    const { data, error } = await supabase.from(naam).select('*').range(from, to)
    if (error) throw new Error(`${naam}: leesfout bij rijen ${from}-${to}: ${error.message}`)
    if (!data || data.length === 0) break
    alleRijen = alleRijen.concat(data)
    if (data.length < PAGE) break
  }

  const bestand = path.join(dir, `${naam}.json`)
  await writeFile(bestand, JSON.stringify(alleRijen, null, 2), 'utf-8')

  const klopt = alleRijen.length === (verwachtAantal ?? 0)
  const symbool = klopt ? '✅' : '❌'
  console.log(`${symbool} ${naam}: ${alleRijen.length} rijen weggeschreven (verwacht: ${verwachtAantal})`)

  return { naam, aantal: alleRijen.length, verwacht: verwachtAantal, overgeslagen: false }
}

/**
 * Loopt één map in één bucket recursief door (Supabase's `list()` geeft
 * zowel bestanden als submappen terug binnen één `prefix`) en downloadt elk
 * bestand naar `<backupDir>/storage/<bucket>/<pad>`. Geeft het aantal
 * bestanden en totale bytes terug.
 */
async function backupStorageMap(bucket, prefix, backupDir) {
  let offset = 0
  let aantalBestanden = 0
  let totaalBytes = 0

  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) throw new Error(`storage/${bucket}/${prefix}: kon niet lezen: ${error.message}`)
    if (!data || data.length === 0) break

    for (const item of data) {
      const objectPad = prefix ? `${prefix}/${item.name}` : item.name

      if (isStorageMap(item)) {
        const sub = await backupStorageMap(bucket, objectPad, backupDir)
        aantalBestanden += sub.aantalBestanden
        totaalBytes += sub.totaalBytes
        continue
      }

      const { data: bestand, error: downloadError } = await supabase.storage.from(bucket).download(objectPad)
      if (downloadError) {
        throw new Error(`storage/${bucket}/${objectPad}: download mislukt: ${downloadError.message}`)
      }
      const lokaalPad = storageBestandsPad(backupDir, bucket, objectPad)
      await mkdir(path.dirname(lokaalPad), { recursive: true })
      await writeFile(lokaalPad, Buffer.from(await bestand.arrayBuffer()))

      aantalBestanden += 1
      totaalBytes += item.metadata?.size ?? bestand.size ?? 0
    }

    if (data.length < 100) break
    offset += 100
  }

  return { aantalBestanden, totaalBytes }
}

/** Meet eerst de totale omvang (alleen listen, niet downloaden) zodat die vooraf gemeld kan worden. */
async function meetStorageMap(bucket, prefix) {
  let offset = 0
  let aantalBestanden = 0
  let totaalBytes = 0

  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`storage/${bucket}/${prefix}: kon niet lezen: ${error.message}`)
    if (!data || data.length === 0) break

    for (const item of data) {
      const objectPad = prefix ? `${prefix}/${item.name}` : item.name
      if (isStorageMap(item)) {
        const sub = await meetStorageMap(bucket, objectPad)
        aantalBestanden += sub.aantalBestanden
        totaalBytes += sub.totaalBytes
      } else {
        aantalBestanden += 1
        totaalBytes += item.metadata?.size ?? 0
      }
    }

    if (data.length < 100) break
    offset += 100
  }

  return { aantalBestanden, totaalBytes }
}

function formatteerBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function backupStorage(dir) {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`storage: kon buckets niet listen: ${error.message}`)

  console.log(`\n📏 Storage-omvang meten (${buckets.length} bucket(s)) …`)
  const metingen = []
  for (const bucket of buckets) {
    const meting = await meetStorageMap(bucket.name, '')
    metingen.push({ naam: bucket.name, ...meting })
    console.log(`   ${bucket.name}: ${meting.aantalBestanden} bestanden, ${formatteerBytes(meting.totaalBytes)}`)
  }
  const totaalBytes = metingen.reduce((n, m) => n + m.totaalBytes, 0)
  console.log(`   Totaal: ${formatteerBytes(totaalBytes)}`)

  console.log(`\n📦 Storage downloaden naar backups/${path.basename(dir)}/storage/ …`)
  const resultaten = []
  for (const bucket of buckets) {
    const res = await backupStorageMap(bucket.name, '', dir)
    resultaten.push({ naam: bucket.name, aantalBestanden: res.aantalBestanden, totaalBytes: res.totaalBytes })
    console.log(`✅ ${bucket.name}: ${res.aantalBestanden} bestanden gedownload (${formatteerBytes(res.totaalBytes)})`)
  }

  return { overgeslagen: false, buckets: resultaten }
}

async function main() {
  const tijdstip = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(PROJECT_ROOT, 'backups', tijdstip)
  await mkdir(dir, { recursive: true })

  console.log(`📦 Back-up naar backups/${tijdstip}/ …\n`)

  const tabelResultaten = []
  for (const tabel of TABELLEN) {
    tabelResultaten.push(await backupTabel(tabel, dir))
  }

  let storageResultaat = { overgeslagen: true, buckets: [] }
  if (ZONDER_STORAGE) {
    console.log('\n⏭️  Storage overgeslagen (--zonder-storage).')
  } else {
    storageResultaat = await backupStorage(dir)
  }

  const manifest = maakManifest({ tijdstip, tabellen: tabelResultaten, storage: storageResultaat })
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

  if (!manifest.volledig) {
    const namen = manifest.tabellen.filter((t) => t.klopt === false).map((t) => t.naam)
    console.error(`\n❌ Back-up incompleet voor: ${namen.join(', ')}`)
    console.error('   Niet doorgaan met de geplande risicovolle actie — controleer handmatig.')
    process.exit(1)
  }

  console.log(`\n✅ Back-up compleet: backups/${tijdstip}/ (manifest.json geschreven)`)
}

main().catch((err) => {
  console.error('❌ Back-up mislukt:', err.message)
  process.exit(1)
})
