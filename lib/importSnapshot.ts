/**
 * Contract voor `imports.snapshot_json` (fase 5, docs/roadmap.md § Fase 5):
 * één plek die vastlegt wat een import bewaart om hem later terug te kunnen
 * draaien. Schrijver: `scripts/import-transacties.mjs` (5.2) en de
 * CSV-import in `/admin/transacties`; lezer: "Laatste import terugdraaien"
 * (5.4).
 *
 * Terugdraaien van import X (alleen de laatste import van een kantoor):
 * - elke rij in `bijgewerkt` krijgt haar `vorige` kolomwaarden terug
 *   (inclusief de vorige `import_id`);
 * - elke andere rij met `import_id = X` was nieuw → verwijderen;
 * - `imports.status = 'teruggedraaid'`, `teruggedraaid_op = now()`.
 * Is `afgekapt` true, dan paste niet elke vorige waarde in de snapshot en kan
 * de import niet (volledig) worden teruggedraaid — de UI moet dat zeggen in
 * plaats van half terug te draaien.
 */

export const IMPORT_SNAPSHOT_VERSIE = 1

/** Maximaal aantal bijgewerkte rijen dat in één snapshot wordt bewaard. */
export const MAX_SNAPSHOT_RIJEN = 20_000

export type ImportSnapshotRij = {
  /** `transacties.id` van de bijgewerkte rij. */
  id: string
  /** Kolomwaarden van vóór de import, alleen de kolommen die de import schreef. */
  vorige: Record<string, unknown>
}

export type ImportSnapshot = {
  versie: typeof IMPORT_SNAPSHOT_VERSIE
  bijgewerkt: ImportSnapshotRij[]
  /** true als er meer dan `MAX_SNAPSHOT_RIJEN` bijgewerkte rijen waren. */
  afgekapt: boolean
}

export function leesImportSnapshot(json: unknown): ImportSnapshot | null {
  if (!json || typeof json !== 'object') return null
  const s = json as Partial<ImportSnapshot>
  if (s.versie !== IMPORT_SNAPSHOT_VERSIE || !Array.isArray(s.bijgewerkt)) return null
  const bijgewerkt = s.bijgewerkt.filter(
    (r): r is ImportSnapshotRij =>
      !!r && typeof r === 'object' && typeof (r as ImportSnapshotRij).id === 'string' &&
      !!(r as ImportSnapshotRij).vorige && typeof (r as ImportSnapshotRij).vorige === 'object',
  )
  return { versie: IMPORT_SNAPSHOT_VERSIE, bijgewerkt, afgekapt: s.afgekapt === true }
}
