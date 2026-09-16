/**
 * Pure functies voor de kerncijfers op de startpagina (masterplan fase 1.6,
 * zie docs/roadmap.md) en het pitch-scorebord op /woningen. Los van React en
 * Supabase, zodat ze zonder een testdatabase te testen zijn — zie
 * docs/ontwerpprincipes.md § Data: elke statistiek toont zijn n en geeft bij
 * te weinig data een waarschuwing i.p.v. een schijnzeker getal.
 */

export type PitchRow = { pitch_uitslag: string | null; created_at?: string | null }
export type ObjectFaseRow = { fase: string }
export type EigenVerkoopRow = {
  verkoopprijs: number | null
  vraagprijs: number | null
  looptijd_dagen: number | null
  verkoopdatum: string | null
}

export type PitchCijfers = {
  open: number
  gewonnen: number
  verloren: number
  /** Percentage (0-100), of null als er nog geen enkele pitch beslist is. */
  winratio: number | null
}

/** Telt open/gewonnen/verloren en de winratio over een set acquisitie-pitches. */
export function berekenPitchCijfers(rows: PitchRow[]): PitchCijfers {
  const open = rows.filter(r => (r.pitch_uitslag ?? 'open') === 'open').length
  const gewonnen = rows.filter(r => r.pitch_uitslag === 'gewonnen').length
  const verloren = rows.filter(r => r.pitch_uitslag === 'verloren').length
  const beslist = gewonnen + verloren
  const winratio = beslist > 0 ? Math.round((gewonnen / beslist) * 100) : null
  return { open, gewonnen, verloren, winratio }
}

/**
 * Filtert rijen met een `created_at` op de laatste `maanden` maanden, t.o.v.
 * `nu` (standaard: vandaag — als parameter voor deterministisch testen).
 * Rijen zonder `created_at` vallen buiten de selectie.
 */
export function filterOpLaatsteMaanden<T extends { created_at?: string | null }>(
  rows: T[],
  maanden: number,
  nu: Date = new Date(),
): T[] {
  const grens = new Date(nu)
  grens.setMonth(grens.getMonth() - maanden)
  return rows.filter(r => {
    if (!r.created_at) return false
    return new Date(r.created_at) >= grens
  })
}

/** Telt woningdossiers per fase. */
export function tellFases(rows: ObjectFaseRow[]): { acquisitie: number; inVerkoop: number; verkocht: number } {
  return {
    acquisitie: rows.filter(r => r.fase === 'acquisitie').length,
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
