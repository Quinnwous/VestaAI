/**
 * Blinde A/B-evaluatie van de contentsuite (item 8.1, docs/roadmap.md § 3.6/8):
 * per dossier in docs/evaluatie/dossiers/ genereert dit script twee anonieme
 * varianten — één met het huidige CONTENT-model, één met de kandidaat
 * CONTENT_KANDIDAAT (lib/aiModellen.ts) — willekeurig gelabeld "A"/"B" en
 * geschreven naar docs/evaluatie/rondes/<datum>/<dossier>/{A,B}.json. De
 * sleutel (welk label bij welk model hoort) komt APART te staan in
 * docs/evaluatie/sleutels/<datum>.json, buiten de map die je tijdens het
 * beoordelen doorbladert — zo blijft de vergelijking echt blind.
 *
 * Genereert bewust ZONDER kantoorhuisstijl: dit isoleert de vergelijking tot
 * "welk model volgt de instructies beter/schrijft beter Nederlands", los van
 * een specifiek stijlprofiel. Wil je ook i4housing's huisstijl meenemen, doe
 * dat in een aparte ronde — geen productie-database-koppeling in dit script.
 *
 * Standaard **dry-run**: toont het plan (dossiers, modellen, outputpaden)
 * zonder een Claude API-call te doen. Draai met --write om de 5 dossiers x 2
 * modellen (10 volledige contentsuite-generaties, elk ~2-4 min) écht te
 * genereren — dat kost echt API-geld, dus alleen bewust draaien.
 *
 *   npx tsx --env-file=.env.local scripts/evalueer-content.mjs
 *   npx tsx --env-file=.env.local scripts/evalueer-content.mjs --write
 *
 * (tsx i.p.v. node: dit script importeert lib/claude.ts en lib/aiModellen.ts
 * rechtstreeks — zelfde patroon als scripts/backtest-waardering.mjs, zie
 * docs/waardering-backtest.md.)
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomInt } from 'crypto'
import { generateContent } from '../lib/claude.ts'
import { CONTENT, CONTENT_KANDIDAAT } from '../lib/aiModellen.ts'

const SCHRIJVEN = process.argv.includes('--write')
const HIER = dirname(fileURLToPath(import.meta.url))
const EVALUATIE_ROOT = join(HIER, '..', 'docs', 'evaluatie')
const DOSSIERS_DIR = join(EVALUATIE_ROOT, 'dossiers')

const log = (...a) => console.log(...a)
const kop = (t) => log(`\n── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`)

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

/** Willekeurige A/B-toewijzing per dossier — pas bepaald bij --write, niet vooraf zichtbaar. */
function wijsToe() {
  const contentIsA = randomInt(0, 2) === 0
  return contentIsA
    ? { A: 'CONTENT', B: 'CONTENT_KANDIDAAT' }
    : { A: 'CONTENT_KANDIDAAT', B: 'CONTENT' }
}

async function main() {
  const datum = vandaag()
  const dossiers = laadDossiers()
  const rondeDir = join(EVALUATIE_ROOT, 'rondes', datum)
  const sleutelPad = join(EVALUATIE_ROOT, 'sleutels', `${datum}.json`)

  kop('Evaluatieronde ' + datum)
  log(`${dossiers.length} dossiers:`, dossiers.map((d) => d.naam).join(', '))
  log('CONTENT (huidig):', CONTENT)
  log('CONTENT_KANDIDAAT:', CONTENT_KANDIDAAT)
  log('Uitvoer naar:', rondeDir)
  log('Sleutel apart naar:', sleutelPad)

  if (!SCHRIJVEN) {
    kop('Dry-run — geen API-calls')
    log('Zou per dossier 2 volledige contentsuite-generaties draaien (CONTENT + CONTENT_KANDIDAAT),')
    log('willekeurig labelen als A/B, en wegschrijven naar:')
    for (const { naam } of dossiers) {
      log(`  ${join(rondeDir, naam, 'A.json')}`)
      log(`  ${join(rondeDir, naam, 'B.json')}`)
    }
    log('\nDraai met --write om dit echt uit te voeren (kost API-geld — 10 generaties, elk ~2-4 min).')
    return
  }

  kop('Genereren (--write actief)')
  mkdirSync(rondeDir, { recursive: true })
  mkdirSync(dirname(sleutelPad), { recursive: true })

  const sleutel = { datum, content_model: CONTENT, content_kandidaat_model: CONTENT_KANDIDAAT, dossiers: {} }

  for (const { naam, input } of dossiers) {
    kop(naam)
    const toewijzing = wijsToe()
    sleutel.dossiers[naam] = toewijzing

    const modelPerLabel = {
      A: toewijzing.A === 'CONTENT' ? CONTENT : CONTENT_KANDIDAAT,
      B: toewijzing.B === 'CONTENT' ? CONTENT : CONTENT_KANDIDAAT,
    }

    const dossierDir = join(rondeDir, naam)
    mkdirSync(dossierDir, { recursive: true })

    for (const label of ['A', 'B']) {
      log(`  → variant ${label} (model verborgen tot beoordeling)…`)
      // generateContent(input, huisstijlOrClient, clientArg, verrijkingTekst, documentFileIds, modelOverride)
      // Bewust geen huisstijl/verrijking/documenten: isoleert de vergelijking tot het model zelf.
      const output = await generateContent(input, undefined, undefined, undefined, undefined, modelPerLabel[label])
      writeFileSync(join(dossierDir, `${label}.json`), JSON.stringify(output, null, 2))
      log(`    opgeslagen: ${join(dossierDir, `${label}.json`)}`)
    }
  }

  writeFileSync(sleutelPad, JSON.stringify(sleutel, null, 2))
  writeFileSync(
    join(rondeDir, 'overzicht.json'),
    JSON.stringify({ datum, dossiers: dossiers.map((d) => d.naam) }, null, 2),
  )

  kop('Klaar')
  log(`${dossiers.length} dossiers x 2 varianten geschreven naar ${rondeDir}`)
  log(`Sleutel (niet openen vóór het oordeel!): ${sleutelPad}`)
  log('Zie docs/evaluatie/README.md voor hoe te beoordelen.')
}

main().catch((err) => {
  console.error('Evaluatie mislukt:', err)
  process.exit(1)
})
