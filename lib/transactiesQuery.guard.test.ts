import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'

/**
 * Dwingt § 3.1 af (docs/roadmap.md, bindend): `lib/transactiesQuery.ts` is de
 * enige plek in `app/`, `components/` en `lib/` die `transacties` of
 * `transacties_met_coordinaten` bevraagt, of een transactie-RPC aanroept.
 * `scripts/` en `app/admin/` zijn uitgezonderd (platform-admin/service-role,
 * buiten RLS — zie CLAUDE.md § transactiedataset). Plus: nergens een kale
 * `select('*')`/`select("*")` in productiecode.
 */

const ROOT = resolve(__dirname, '..')
const GESCANDE_MAPPEN = ['app', 'components', 'lib']
const UITGESLOTEN_PADEN = [
  join(ROOT, 'app', 'admin'),
  join(ROOT, 'lib', 'transactiesQuery.ts'),
  join(ROOT, 'lib', 'transactiesQuery.guard.test.ts'),
]

// Namen van de transactie-RPC's uit de migratie
// supabase/migrations/20260917_rpc_transacties.sql — een `.rpc(` met een van
// deze namen buiten lib/transactiesQuery.ts is een overtreding.
const TRANSACTIE_RPCS = [
  'transacties_gefilterd',
  'marktanalyse_reeks',
  'marktanalyse_samenvatting',
  'concurrentie_marktaandeel',
  'concurrentie_segmenten',
  'transacties_zoeken',
  'prijsindex_kwartaal',
  'referenties_in_straal',
]

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

/**
 * Verwijdert block- en line-comments zodat documentatie ("zie SQL-view
 * `transacties_met_coordinaten`") niet als overtreding telt — alleen
 * daadwerkelijke code. Grove heuristiek (geen volledige tokenizer), maar
 * ruim voldoende voor dit doel: alleen `.from(...)`/`.rpc(...)`-aanroepen in
 * dit project bevatten geen `//` of `/*` binnen hun stringargumenten.
 */
function zonderComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('transactiesQuery-guard (§ 3.1, docs/roadmap.md — bindend)', () => {
  it('geen `.from(\'transacties...\')` of de coördinaten-view buiten lib/transactiesQuery.ts', () => {
    const overtredingen: string[] = []
    for (const pad of BESTANDEN) {
      const inhoud = zonderComments(readFileSync(pad, 'utf8'))
      const treffers = [
        ...Array.from(inhoud.matchAll(/from\(\s*['"]transacties(_met_coordinaten)?['"]/g)),
        ...Array.from(inhoud.matchAll(/transacties_met_coordinaten/g)),
      ]
      if (treffers.length > 0) overtredingen.push(relative(ROOT, pad))
    }
    expect(overtredingen, `transacties-toegang buiten lib/transactiesQuery.ts gevonden in:\n${overtredingen.join('\n')}`).toEqual([])
  })

  it('geen `.rpc(...)` met een transactie-RPC-naam buiten lib/transactiesQuery.ts', () => {
    const overtredingen: string[] = []
    for (const pad of BESTANDEN) {
      const inhoud = zonderComments(readFileSync(pad, 'utf8'))
      for (const naam of TRANSACTIE_RPCS) {
        const patroon = new RegExp(`\\.rpc\\(\\s*['"]${naam}['"]`)
        if (patroon.test(inhoud)) {
          overtredingen.push(`${relative(ROOT, pad)} → .rpc('${naam}')`)
        }
      }
    }
    expect(overtredingen, `transactie-RPC-aanroep buiten lib/transactiesQuery.ts:\n${overtredingen.join('\n')}`).toEqual([])
  })

  it('geen kale select(\'*\') / select("*") in app/components/lib (buiten tests)', () => {
    const overtredingen: string[] = []
    for (const pad of BESTANDEN) {
      if (/\.test\.tsx?$/.test(pad)) continue
      const inhoud = readFileSync(pad, 'utf8')
      if (/select\(\s*['"]\*['"]\s*\)/.test(inhoud)) overtredingen.push(relative(ROOT, pad))
    }
    expect(overtredingen, `select('*') gevonden in:\n${overtredingen.join('\n')}`).toEqual([])
  })
})
