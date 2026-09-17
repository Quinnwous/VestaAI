/**
 * Back-up van de belangrijkste tabellen naar lokale JSON-bestanden, vóór elke
 * risicovolle actie op de productiedatabase (migratie, import, bulk-update,
 * opruimen) — zie CLAUDE.md § Vangrails en docs/roadmap.md § 4 Werkwijze.
 *
 * We draaien op het gratis Supabase-plan zonder herstelbare back-ups, dus dit
 * script is de enige vangnet vóór een destructieve actie. Standaard alléén
 * lezen en wegschrijven (nooit destructief zelf); er is geen --write-vlag
 * nodig omdat dit script niets in de database verandert.
 *
 *   node --env-file=.env.local scripts/backup-data.mjs
 *
 * Schrijft naar VestaAI/backups/<ISO-tijdstip>/<tabel>.json (in .gitignore).
 * Controleert na afloop of het aantal weggeschreven rijen overeenkomt met het
 * aantal rijen dat de database rapporteert (count via head-request) — bij een
 * afwijking stopt het script met een foutcode in plaats van stilzwijgend door
 * te gaan met een onvolledige back-up.
 */
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

// De tabellen die er echt toe doen — zie CLAUDE.md § Datamodel. Bewust geen
// dode tabellen (post_planning/chatbot_*/referrals) en geen system-tabellen
// (spatial_ref_sys, wijken is publieke SEO-content, geen bedrijfsdata).
const TABELLEN = [
  'kantoren',
  'makelaars',
  'objecten',
  'transacties',
  'object_documenten',
  'object_fotos',
  'stijl_bewerkingen',
]

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
    // op een tabel die pas later gebouwd wordt (bv. gebruik_events).
    console.warn(`⚠️  ${naam}: kon niet tellen (${countError.message}) — overgeslagen.`)
    return { naam, overgeslagen: true }
  }

  // Pagineren i.p.v. één grote select — dezelfde reden als fase 4.2 van het
  // masterplan: Supabase geeft standaard hooguit 1000 rijen per query terug.
  const PAGE = 1000
  let alleRijen = []
  for (let from = 0; from < (verwachtAantal ?? 0) || from === 0; from += PAGE) {
    const to = from + PAGE - 1
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

  return { naam, aantal: alleRijen.length, verwacht: verwachtAantal, klopt }
}

async function main() {
  const tijdstip = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(PROJECT_ROOT, 'backups', tijdstip)
  await mkdir(dir, { recursive: true })

  console.log(`📦 Back-up naar backups/${tijdstip}/ …\n`)

  const resultaten = []
  for (const tabel of TABELLEN) {
    resultaten.push(await backupTabel(tabel, dir))
  }

  const mismatches = resultaten.filter(r => !r.overgeslagen && !r.klopt)
  if (mismatches.length > 0) {
    console.error(`\n❌ Back-up incompleet voor: ${mismatches.map(m => m.naam).join(', ')}`)
    console.error('   Niet doorgaan met de geplande risicovolle actie — controleer handmatig.')
    process.exit(1)
  }

  console.log(`\n✅ Back-up compleet: backups/${tijdstip}/`)
}

main().catch(err => {
  console.error('❌ Back-up mislukt:', err.message)
  process.exit(1)
})
