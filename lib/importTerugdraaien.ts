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
 */
import {
  IMPORT_SNAPSHOT_VERSIE, MAX_SNAPSHOT_RIJEN, leesImportSnapshot,
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
  if (imp.status !== 'klaar') {
    return {
      ok: false,
      reden: `Deze import heeft status "${imp.status}" — alleen een afgeronde import (status "klaar") kan worden teruggedraaid.`,
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

/** Ruwe, bestaande transactierij zoals opgehaald vóór een nieuwe import — precies de kolommen die een import schrijft, plus de sleutel om op te matchen. */
export type BestaandeTransactieVoorSnapshot = {
  id: string
  adresSleutel: string
  verkoopdatum: string | null
  /** Exact de kolomwaarden die een import overschrijft (incl. `import_id`) — wat terugkomt bij een herstel. */
  vorige: Record<string, unknown>
}

/** `${adres_sleutel}|${verkoopdatum ?? ''}` — dezelfde sleutel als de unieke index `transacties_natuurlijke_sleutel_idx`. */
export function bouwSleutel(adresSleutel: string, verkoopdatum: string | null): string {
  return `${adresSleutel}|${verkoopdatum ?? ''}`
}

/**
 * Bouwt de snapshot die een nieuwe import moet bewaren, vóór de upsert: elke
 * bestaande rij waarvan de sleutel ook in de nieuwe CSV/het nieuwe bestand
 * voorkomt wordt straks overschreven en komt dus in `bijgewerkt` terecht met
 * haar huidige (=vorige) kolomwaarden. Een bestaande rij die niet matcht,
 * wordt door deze import niet aangeraakt en hoort niet in de snapshot. Een
 * rij uit `nieuweSleutels` zonder match in `bestaande` is nieuw (wordt bij
 * terugdraaien simpelweg verwijderd, niet hersteld).
 */
export function bouwSnapshotUitBestaande(
  bestaande: BestaandeTransactieVoorSnapshot[],
  nieuweSleutels: Set<string>,
): ImportSnapshot {
  const kandidaten = bestaande.filter(r => nieuweSleutels.has(bouwSleutel(r.adresSleutel, r.verkoopdatum)))
  const afgekapt = kandidaten.length > MAX_SNAPSHOT_RIJEN
  const beperkt = afgekapt ? kandidaten.slice(0, MAX_SNAPSHOT_RIJEN) : kandidaten

  return {
    versie: IMPORT_SNAPSHOT_VERSIE,
    bijgewerkt: beperkt.map(r => ({ id: r.id, vorige: r.vorige })),
    afgekapt,
  }
}
