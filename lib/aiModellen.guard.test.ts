import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'

/**
 * Dwingt item 8.1 af (docs/architectuur.md § 6, bindend): "Nergens anders nog een
 * modelstring" — `lib/aiModellen.ts` is de enige plek in `app/`, `components/`
 * en `lib/` die een `claude-`- of `gemini-`-modelstring als letterlijke waarde
 * bevat. Elke Claude/Gemini API-aanroep importeert zijn model-id uit die ene
 * plek (uitgebreid met Gemini bij item 14.3, toen `GEMINI_STAGING` daar
 * belandde).
 */

const ROOT = resolve(__dirname, '..')
const GESCANDE_MAPPEN = ['app', 'components', 'lib']
const UITGESLOTEN_PADEN = [
  join(ROOT, 'lib', 'aiModellen.ts'),
  join(ROOT, 'lib', 'aiModellen.guard.test.ts'),
]

// Herkent een Claude- of Gemini-modelstring als quoted literal, bijv.
// 'claude-sonnet-4-6', "claude-haiku-4-5-20251001" of 'gemini-2.5-flash-image'
// — niet gevoelig voor het exacte model-id, zodat de test ook toekomstige
// modelnamen (claude-opus-5, gemini-3-flash, …) buiten aiModellen.ts betrapt.
const MODELSTRING_PATROON = /['"](?:claude|gemini)-[a-z0-9][a-z0-9.-]*['"]/g

function isUitgesloten(pad: string): boolean {
  return UITGESLOTEN_PADEN.some(u => pad === u || pad.startsWith(u + '/'))
}

function verzamelBestanden(dir: string, uit: string[] = []): string[] {
  if (!statSync(dir).isDirectory()) return uit
  for (const naam of readdirSync(dir)) {
    const pad = join(dir, naam)
    if (isUitgesloten(pad)) continue
    if (naam === 'node_modules' || naam === '.next') continue
    const info = statSync(pad)
    if (info.isDirectory()) {
      verzamelBestanden(pad, uit)
    } else if (/\.(ts|tsx)$/.test(naam)) {
      uit.push(pad)
    }
  }
  return uit
}

const BESTANDEN = GESCANDE_MAPPEN.flatMap(map => verzamelBestanden(join(ROOT, map)))

/** Verwijdert block- en line-comments zodat documentatie ("zie model X") niet meetelt. */
function zonderComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('aiModellen-guard (§ 6, item 8.1, docs/architectuur.md — bindend)', () => {
  it('geen letterlijke claude- of gemini-modelstring buiten lib/aiModellen.ts in app/components/lib', () => {
    const overtredingen: string[] = []
    for (const pad of BESTANDEN) {
      const inhoud = zonderComments(readFileSync(pad, 'utf8'))
      const treffers = inhoud.match(MODELSTRING_PATROON)
      if (treffers) overtredingen.push(`${relative(ROOT, pad)} → ${treffers.join(', ')}`)
    }
    expect(overtredingen, `modelstring buiten lib/aiModellen.ts gevonden in:\n${overtredingen.join('\n')}`).toEqual([])
  })
})
