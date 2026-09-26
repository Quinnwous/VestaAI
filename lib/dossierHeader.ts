/**
 * Pure logica voor de dossierheader v2 (item 10.2, docs/roadmap.md § Fase 10),
 * los van React zodat hij mét vitest getest is vóór de UI (CLAUDE.md §
 * Conventies: "rekenlogica als pure functies in lib/, los van React").
 */

/**
 * Welke waarde de "Waarde"-StatTile toont: een makelaarscorrectie is het
 * laatste woord van de makelaar en wint dus altijd van de systeemwaardering
 * (zelfde voorrang als in `components/WaardebepalingPaneel.tsx`); zonder
 * correctie geldt de berekende uitkomst. `null` als er nog helemaal geen
 * waardering is (bv. een net aangemaakt dossier) — de tegel toont dan een
 * waarschuwing i.p.v. een schijnzeker getal (docs/ontwerpprincipes.md §
 * Data-weergave).
 */
export function bepaalWeergaveWaarde(
  uitkomst: { waarde: number | null } | null,
  correctie: { waarde: number } | null,
): number | null {
  if (correctie) return correctie.waarde
  if (uitkomst?.waarde != null) return uitkomst.waarde
  return null
}
