#!/usr/bin/env node
/**
 * Controleert of de omgeving alle sleutels heeft die de app nodig heeft, vóór
 * je `npm run dev`/`build` draait. Eén bron van waarheid: `.env.example`
 * (groepen `# == verplicht ==` / `# == optioneel ==`) — geen tweede,
 * hardgecodeerde lijst hier, zie scripts/lib/envCheck.mjs.
 *
 * Laadt `.env.local` (als dat bestaat) en legt die naast `process.env`
 * (een al gezette omgevingsvariabele wint altijd, zelfde gedrag als
 * dotenv/`--env-file`). Print **alleen sleutelnamen**, nooit waarden.
 *
 *   node scripts/check-env.mjs
 *   npm run env:check
 *
 * Exit 1 als een verplichte sleutel ontbreekt of leeg is. Optionele sleutels
 * die ontbreken zijn alleen een waarschuwing (exit blijft 0 daarvoor).
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnvExampleGroepen, parseDotEnv, controleerEnv } from './lib/envCheck.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function log(...a) {
  // eslint-disable-next-line no-console
  console.log(...a)
}

const voorbeeldPad = path.join(ROOT, '.env.example')
if (!existsSync(voorbeeldPad)) {
  console.error('❌ .env.example ontbreekt in de projectroot — kan niet controleren welke sleutels nodig zijn.')
  process.exit(1)
}
const groepen = parseEnvExampleGroepen(readFileSync(voorbeeldPad, 'utf8'))

const lokaalPad = path.join(ROOT, '.env.local')
const uitBestand = existsSync(lokaalPad) ? parseDotEnv(readFileSync(lokaalPad, 'utf8')) : {}
// process.env wint van .env.local, zoals dotenv/--env-file dat ook doen.
const env = { ...uitBestand, ...process.env }

const { ontbrekendVerplicht, ontbrekendOptioneel } = controleerEnv({ groepen, env })

if (ontbrekendOptioneel.length) {
  log('⚠️  Optionele sleutels ontbreken (feature werkt dan niet, de rest van de app wel):')
  for (const sleutel of ontbrekendOptioneel) log(`   - ${sleutel}`)
}

if (ontbrekendVerplicht.length) {
  console.error('❌ Verplichte sleutels ontbreken of zijn leeg:')
  for (const sleutel of ontbrekendVerplicht) console.error(`   - ${sleutel}`)
  console.error('\nZie .env.example voor uitleg per sleutel.')
  process.exit(1)
}

log('✅ Alle verplichte omgevingsvariabelen zijn aanwezig.')
