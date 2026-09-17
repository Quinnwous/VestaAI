/**
 * Pure functies voor de kerncijfers op de startpagina (masterplan fase 1.6,
 * zie docs/roadmap.md). Los van React en Supabase, zodat ze zonder een
 * testdatabase te testen zijn — zie docs/ontwerpprincipes.md § Data: elke
 * statistiek toont zijn n en geeft bij te weinig data een waarschuwing i.p.v.
 * een schijnzeker getal.
 *
 * Geen pitch-concept meer (besluit Quinn 17 sep 2026, item 1.9c): er bestaan
 * geen "gewonnen/verloren pitches" en geen winratio meer — `berekenPitchCijfers`
 * en `PitchRow`/`PitchCijfers` zijn vervallen.
 */

export type ObjectFaseRow = { fase: string }
export type EigenVerkoopRow = {
  verkoopprijs: number | null
  vraagprijs: number | null
  looptijd_dagen: number | null
  verkoopdatum: string | null
}

/**
 * Filtert rijen op de laatste `maanden` maanden, t.o.v. `nu` (standaard:
 * vandaag — als parameter voor deterministisch testen). `datumVeld` haalt de
 * relevante datum uit elke rij (bv. `created_at` of `verkoopdatum`); rijen
 * zonder datum vallen buiten de selectie.
 */
export function filterOpLaatsteMaanden<T>(
  rows: T[],
  maanden: number,
  datumVeld: (row: T) => string | null | undefined,
  nu: Date = new Date(),
): T[] {
  const grens = new Date(nu)
  grens.setMonth(grens.getMonth() - maanden)
  return rows.filter(r => {
    const datum = datumVeld(r)
    if (!datum) return false
    return new Date(datum) >= grens
  })
}

/** Telt woningdossiers per fase. */
export function tellFases(rows: ObjectFaseRow[]): { verkoopadvies: number; inVerkoop: number; verkocht: number } {
  return {
    verkoopadvies: rows.filter(r => r.fase === 'verkoopadvies').length,
    inVerkoop: rows.filter(r => r.fase === 'in_verkoop').length,
    verkocht: rows.filter(r => r.fase === 'verkocht').length,
  }
}

export type VerkoopStatistieken = {
  aantal: number
  gemLooptijdDagen: number | null
  /** Gemiddeld percentage boven (positief) of onder (negatief) de vraagprijs. */
  gemPrijsTovVraagprijsPct: number | null
}

/** Filtert eigen verkopen op verkoopjaar. */
export function filterOpJaar(rows: EigenVerkoopRow[], jaar: number): EigenVerkoopRow[] {
  return rows.filter(r => r.verkoopdatum && new Date(r.verkoopdatum).getFullYear() === jaar)
}

/**
 * Gemiddelde looptijd en prijs-t.o.v.-vraagprijs over een set eigen verkopen.
 * Rijen zonder de benodigde velden tellen niet mee in dat specifieke
 * gemiddelde (geen 0 aannemen voor ontbrekende data).
 */
export function berekenVerkoopstatistieken(rows: EigenVerkoopRow[]): VerkoopStatistieken {
  const looptijden = rows.map(r => r.looptijd_dagen).filter((n): n is number => n != null)
  const gemLooptijdDagen = looptijden.length > 0
    ? Math.round(looptijden.reduce((a, b) => a + b, 0) / looptijden.length)
    : null

  const percentages = rows
    .filter(r => r.verkoopprijs != null && r.vraagprijs != null && r.vraagprijs > 0)
    .map(r => ((r.verkoopprijs as number) / (r.vraagprijs as number) - 1) * 100)
  const gemPrijsTovVraagprijsPct = percentages.length > 0
    ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10
    : null

  return { aantal: rows.length, gemLooptijdDagen, gemPrijsTovVraagprijsPct }
}
