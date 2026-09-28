/**
 * Pure logica voor "Laatste import terugdraaien" (item 5.4, docs/roadmap.md
 * § Fase 5) — los van React en van Supabase, zodat hij zonder database te
 * testen is. `app/admin/transacties/actions.ts` haalt de invoer op (de
 * import zelf, de laatste import-id van dat kantoor, de rijen met dit
 * `import_id`) en voert het plan dat hier uitkomt daadwerkelijk uit.
 *
 * Zie `lib/importSnapshot.ts` voor het contract van `imports.snapshot_json`
 * — dat bestand is gedeeld met de importpijplijn (5.2/5.3) en wordt hier
 * alleen gelezen, nooit gewijzigd.
 *
 * De snapshot die een import bewaart wordt sinds item i2
 * (docs/specs/i2-admin-csv-via-pijplijn.md) uitsluitend gebouwd door
 * `bouwSnapshot()` in `lib/importPijplijn.ts` — dit bestand had eerder een
 * eigen, bijna-identieke `bouwSnapshotUitBestaande()` voor de admin-CSV-
 * import, maar twee bouwers voor één contract liepen uit elkaar. Die is
 * verwijderd; `app/admin/transacties/actions.ts` roept nu dezelfde
 * `bouwSnapshot()` aan als `scripts/import-transacties.mjs`.
 */
import {
  leesImportSnapshot,
  type ImportSnapshot, type ImportSnapshotRij,
} from './importSnapshot'

/** Alleen de kolommen van een `imports`-rij die `planTerugdraai` nodig heeft. */
export type ImportVoorTerugdraai = {
  id: string
  kantoor_id: string
  status: 'bezig' | 'klaar' | 'mislukt' | 'teruggedraaid'
}

export type PlanTerugdraaiInput = {
  /** De import die (mogelijk) wordt teruggedraaid. */
  imp: ImportVoorTerugdraai
  /** Id van de meest recente niet-teruggedraaide import van dit kantoor, of `null` als er geen is. */
  laatsteImportIdVanKantoor: string | null
  /** Ruwe `imports.snapshot_json` van `imp` — wordt hier gelezen via `leesImportSnapshot`. */
  snapshot: unknown
  /** Ids van `transacties`-rijen met `import_id = imp.id`, zoals ze nu in de tabel staan. */
  rijIdsMetImportId: string[]
}

export type PlanTerugdraaiResultaat =
  | { ok: false; reden: string }
  | { ok: true; herstel: ImportSnapshotRij[]; verwijder: string[] }

/**
 * Bepaalt wat terugdraaien van `imp` zou betekenen, zonder iets te wijzigen.
 * `verwijder` = rijen met `import_id = imp.id` die niet in de snapshot als
 * "bijgewerkt" staan (dus door déze import zijn toegevoegd, niet gewijzigd).
 */
export function planTerugdraai(input: PlanTerugdraaiInput): PlanTerugdraaiResultaat {
  const { imp, laatsteImportIdVanKantoor, snapshot, rijIdsMetImportId } = input

  if (imp.id !== laatsteImportIdVanKantoor) {
    return {
      ok: false,
      reden: 'Dit is niet meer de laatste import van dit kantoor — alleen de meest recente import kan worden teruggedraaid.',
    }
  }
  // Ook een mislukte import mag terug: juist dan staat de dataset half
  // bijgewerkt. Kan alleen omdat de snapshot vóór de eerste schrijfactie
  // wordt opgeslagen (lib/importSnapshot.ts). 'bezig' niet: die kan nog lopen.
  if (imp.status !== 'klaar' && imp.status !== 'mislukt') {
    return {
      ok: false,
      reden: `Deze import heeft status "${imp.status}" — alleen een afgeronde of mislukte import kan worden teruggedraaid.`,
    }
  }

  const gelezen = leesImportSnapshot(snapshot)
  if (!gelezen) {
    return { ok: false, reden: 'Geen (geldige) snapshot beschikbaar voor deze import — terugdraaien is niet mogelijk.' }
  }
  if (gelezen.afgekapt) {
    return {
      ok: false,
      reden: 'De snapshot van deze import is afgekapt (te veel bijgewerkte rijen om te bewaren) — terugdraaien zou niet alles ongedaan maken en is daarom uitgeschakeld.',
    }
  }

  const bijgewerkteIds = new Set(gelezen.bijgewerkt.map(r => r.id))
  const verwijder = rijIdsMetImportId.filter(id => !bijgewerkteIds.has(id))

  return { ok: true, herstel: gelezen.bijgewerkt, verwijder }
}
