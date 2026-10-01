/**
 * Blinde evaluatie van de contentsuite (item 8.1, docs/architectuur.md § 6):
 * per dossier in docs/evaluatie/dossiers/ genereert dit script één anonieme
 * variant per model uit `EVALUATIE_MODELLEN` (lib/aiModellen.ts — nu het
 * huidige CONTENT-model, CONTENT_KANDIDAAT en CONTENT_KANDIDAAT_HAIKU),
 * willekeurig gelabeld A/B/C en geschreven naar
 * docs/evaluatie/rondes/<datum>/<dossier>/<label>.json. De sleutel (welk
 * label bij welk model hoort, plus duur en tokens per aanroep) komt APART te
 * staan in docs/evaluatie/sleutels/<datum>.json, buiten de map die je tijdens
 * het beoordelen doorbladert — ook de duur, want die verraadt het model.
 *
 * Genereert standaard MET de huisstijl van i4 Housing (`kantoren.huisstijl_json`,
 * alleen lezend): het 4SALE!-sjabloon en de voorbeeldteksten zijn precies wat
 * een model in productie moet volgen, en de sjabloon-herkansing draait dan mee
 * (op hetzelfde model, zie `herschrijfFundaTekstMetSjabloon`). Andere bron:
 * `--kantoor <slug>`; de oude, kale vergelijking: `--zonder-huisstijl`.
 *
 * Standaard **dry-run**: toont het plan zonder een Claude API-call. Met
 * --write draaien per dossier alle modellen parallel (dossiers na elkaar) —
 * dat kost echt API-geld, dus alleen bewust draaien. Een bestaande ronde van
 * vandaag wordt nooit overschreven zonder --overschrijf. Een mislukte
 * generatie wordt in de sleutel genoteerd en niet herhaald.
 *
 *   npx tsx --env-file=.env.local scripts/evalueer-content.mjs
 *   npx tsx --env-file=.env.local scripts/evalueer-content.mjs --write
 *
 * (tsx i.p.v. node: dit script importeert lib/claude.ts en lib/aiModellen.ts
 * rechtstreeks — zelfde patroon als scripts/backtest-waardering.mjs, zie
 * docs/waardering/backtest.md.)
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomInt } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { generateContent } from '../lib/claude.ts'
import { EVALUATIE_MODELLEN } from '../lib/aiModellen.ts'
import { serviceClient } from './lib/dodSessie.mjs'

const SCHRIJVEN = process.argv.includes('--write')
const OVERSCHRIJVEN = process.argv.includes('--overschrijf')
const ZONDER_HUISSTIJL = process.argv.includes('--zonder-huisstijl')
const KANTOOR_SLUG = argWaarde('--kantoor') ?? 'i4housing'
const LABELS = ['A', 'B', 'C', 'D', 'E']
const HIER = dirname(fileURLToPath(import.meta.url))
const EVALUATIE_ROOT = join(HIER, '..', 'docs', 'evaluatie')
const DOSSIERS_DIR = join(EVALUATIE_ROOT, 'dossiers')

const log = (...a) => console.log(...a)
const kop = (t) => log(`\n── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`)

function argWaarde(naam) {
  const i = process.argv.indexOf(naam)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function vandaag() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function laadDossiers() {
  return readdirSync(DOSSIERS_DIR)
    .filter((n) => n.endsWith('.json'))
    .sort()
    .map((bestand) => ({
      naam: bestand.replace(/\.json$/, ''),
      input: JSON.parse(readFileSync(join(DOSSIERS_DIR, bestand), 'utf8')),
    }))
}

async function laadHuisstijl() {
  if (ZONDER_HUISSTIJL) return null
  const { data, error } = await serviceClient()
    .from('kantoren')
    .select('name, huisstijl_json')
    .eq('slug', KANTOOR_SLUG)
    .single()
  if (error || !data?.huisstijl_json) throw new Error(`Huisstijl van kantoor "${KANTOOR_SLUG}" niet gevonden: ${error?.message ?? 'leeg'}`)
  return { kantoor: data.name, huisstijl: data.huisstijl_json }
}

/** Willekeurige verdeling van de modellen over de labels (Fisher-Yates) — pas bepaald bij --write. */
function wijsToe() {
  const modellen = [...EVALUATIE_MODELLEN]
  for (let i = modellen.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[modellen[i], modellen[j]] = [modellen[j], modellen[i]]
  }
  return modellen.map((m, i) => ({ label: LABELS[i], ...m }))
}

/**
 * Echte Anthropic-client (zelfde instellingen als productie) die elke aanroep
 * noteert: kern-call (stream) of sjabloon-herkansing (create), met duur,
 * stop_reason en tokengebruik — voor de sleutel en de kostenberekening.
 */
function meetClient(aanroepen) {
  const echt = new Anthropic({ maxRetries: 1, timeout: 280_000 })
  const noteer = (soort, model, bericht, ms) =>
    aanroepen.push({ soort, model, ms, stop_reason: bericht.stop_reason, usage: bericht.usage })
  return {
    beta: echt.beta,
    messages: {
      stream(params) {
        const t0 = Date.now()
        const stream = echt.messages.stream(params)
        return {
          finalMessage: async () => {
            const bericht = await stream.finalMessage()
            noteer('kern', params.model, bericht, Date.now() - t0)
            return bericht
          },
        }
      },
      async create(params) {
        const t0 = Date.now()
        const bericht = await echt.messages.create(params)
        noteer('herkansing', params.model, bericht, Date.now() - t0)
        return bericht
      },
    },
  }
}

async function genereerVariant(input, huisstijl, { label, naam, model }, dossierDir) {
  const aanroepen = []
  const t0 = Date.now()
  try {
    const output = await generateContent(input, huisstijl ?? undefined, meetClient(aanroepen), undefined, undefined, model)
    writeFileSync(join(dossierDir, `${label}.json`), JSON.stringify(output, null, 2))
    log(`  ✓ ${label} klaar`)
    return { naam, model, ms: Date.now() - t0, aanroepen }
  } catch (err) {
    log(`  ✗ ${label} mislukt — niet herhaald (zie sleutel)`)
    return { naam, model, ms: Date.now() - t0, aanroepen, fout: err instanceof Error ? err.message : String(err) }
  }
}

async function main() {
  const datum = vandaag()
  const dossiers = laadDossiers()
  const rondeDir = join(EVALUATIE_ROOT, 'rondes', datum)
  const sleutelPad = join(EVALUATIE_ROOT, 'sleutels', `${datum}.json`)
  const bron = await laadHuisstijl()

  kop('Evaluatieronde ' + datum)
  log(`${dossiers.length} dossiers:`, dossiers.map((d) => d.naam).join(', '))
  log('Modellen:', EVALUATIE_MODELLEN.map((m) => `${m.naam} (${m.model})`).join(', '))
  log('Huisstijl:', bron
    ? `${bron.kantoor} — sjabloon ${bron.huisstijl.tekstsjabloon ? 'ja' : 'nee'}, ${(bron.huisstijl.voorbeelden ?? []).length} voorbeeldteksten`
    : 'geen (--zonder-huisstijl)')
  log('Uitvoer naar:', rondeDir)
  log('Sleutel apart naar:', sleutelPad)

  const aantal = dossiers.length * EVALUATIE_MODELLEN.length
  if (!SCHRIJVEN) {
    kop('Dry-run — geen API-calls')
    log(`Zou ${aantal} volledige kern-generaties draaien (per dossier alle modellen parallel),`)
    log(`willekeurig gelabeld ${LABELS.slice(0, EVALUATIE_MODELLEN.length).join('/')}.`)
    log('\nDraai met --write om dit echt uit te voeren (kost API-geld).')
    return
  }

  if (existsSync(sleutelPad) && !OVERSCHRIJVEN) {
    throw new Error(`Er staat al een ronde van ${datum} (${sleutelPad}). Bewust opnieuw? Voeg --overschrijf toe.`)
  }

  kop(`Genereren (--write actief, ${aantal} generaties)`)
  mkdirSync(rondeDir, { recursive: true })
  mkdirSync(dirname(sleutelPad), { recursive: true })

  const sleutel = {
    datum,
    huisstijl: bron ? KANTOOR_SLUG : null,
    modellen: EVALUATIE_MODELLEN,
    dossiers: {},
  }

  for (const { naam, input } of dossiers) {
    kop(naam)
    const dossierDir = join(rondeDir, naam)
    mkdirSync(dossierDir, { recursive: true })
    const toewijzing = wijsToe()
    const resultaten = await Promise.all(
      toewijzing.map((variant) => genereerVariant(input, bron?.huisstijl, variant, dossierDir)),
    )
    sleutel.dossiers[naam] = Object.fromEntries(toewijzing.map((v, i) => [v.label, resultaten[i]]))
    // Na elk dossier wegschrijven: een afgebroken run verliest geen betaalde generaties.
    writeFileSync(sleutelPad, JSON.stringify(sleutel, null, 2))
  }

  writeFileSync(
    join(rondeDir, 'overzicht.json'),
    JSON.stringify({ datum, dossiers: dossiers.map((d) => d.naam), labels: LABELS.slice(0, EVALUATIE_MODELLEN.length) }, null, 2),
  )

  const mislukt = Object.values(sleutel.dossiers).flatMap((d) => Object.values(d)).filter((r) => r.fout).length
  kop('Klaar')
  log(`${dossiers.length} dossiers x ${EVALUATIE_MODELLEN.length} varianten → ${rondeDir}${mislukt ? ` (${mislukt} mislukt)` : ''}`)
  log(`Sleutel (niet openen vóór het oordeel!): ${sleutelPad}`)
  log('Zie docs/evaluatie/README.md voor hoe te beoordelen.')
}

main().catch((err) => {
  console.error('Evaluatie mislukt:', err)
  process.exit(1)
})
