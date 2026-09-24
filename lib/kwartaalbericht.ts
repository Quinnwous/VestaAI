import type { MarktanalyseSamenvatting } from './transactiesQuery'
import { berekenDelta } from './marktanalyse'
import { euro, procent, nlNL, datum } from './opmaak'

/**
 * Feitenblad + guardrail voor het kwartaalbericht (item 6.4, docs/roadmap.md
 * § 5 Fase 6): een AI-gegenereerde marktupdate mag UITSLUITEND cijfers
 * bevatten die letterlijk uit deze cijfers komen (`marktanalyseSamenvatting`,
 * plus het eigen aandeel) — nooit een verzonnen bedrag, percentage of
 * aantal. Pure functies, geen React, geen Claude-aanroep (die zit in
 * `lib/claude.ts` `schrijfKwartaalbericht`, die dit bestand importeert).
 *
 * Twee stappen:
 * 1. `bouwFeitenblad()` — zet de RPC-cijfers om in een klein, expliciet
 *    feitenblad: zowel een promptklare tekst (voor Claude) als een lijst
 *    losse `Feit`s (voor de guardrail).
 * 2. `controleerGuardrail()` — na generatie: haalt elk getal uit de
 *    gegenereerde tekst en controleert of het (in een voor de hand liggende
 *    NL-afronding) in het feitenblad voorkomt.
 */

// ─────────────────────────────────────────────────────────────────────────
// Feitenblad opbouwen
// ─────────────────────────────────────────────────────────────────────────

export type FeitEenheid = 'euro' | 'euro_m2' | 'procent' | 'dagen' | 'aantal'

export type Feit = {
  sleutel: string
  label: string
  waarde: number
  eenheid: FeitEenheid
}

export type Feitenblad = {
  /** Beschrijving van de actieve filters, bv. "Wassenaar · Vrijstaand · laatste 24 maanden". */
  contextLabel: string
  /** "1 okt 2024 – 20 sep 2026", of `null` als de periode onbekend is. */
  periodeLabel: string | null
  /** `null` als er geen betrouwbare vorige periode is (te weinig data of periode "Alles"). */
  vorigePeriodeLabel: string | null
  dataTotEnMet: string | null
  /** Alle losse feiten, voor de guardrail. */
  feiten: Feit[]
  /** Kant-en-klaar promptblok voor Claude — de enige toegestane cijferbron. */
  tekst: string
}

/**
 * Zelfde drempel als `MIN_N_BETROUWBAAR` in `components/MarktanalyseExplorer.tsx`
 * (bewust hier gedupliceerd i.p.v. geëxporteerd vanuit de component — een
 * component importeren in een pure lib zou de afhankelijkheid omdraaien).
 * Onder deze n toont de UI "geen vergelijking"; dit feitenblad doet hetzelfde.
 */
const MIN_N_VERGELIJKING = 6

const PERIODE_LABEL: Record<12 | 24 | 36 | 0, string> = {
  12: 'laatste 12 maanden',
  24: 'laatste 24 maanden',
  36: 'laatste 36 maanden',
  0: 'hele periode',
}

/** Korte, beschrijvende contextregel voor de prompt (geen guardrail-cijfer — puur framing). */
export function bouwContextLabel(filter: {
  plaatsen: string[]
  typen: string[]
  periode: 12 | 24 | 36 | 0
}): string {
  const plaatsDeel = filter.plaatsen.length
    ? filter.plaatsen.length <= 3
      ? filter.plaatsen.join(', ')
      : `${filter.plaatsen.slice(0, 3).join(', ')} +${filter.plaatsen.length - 3}`
    : 'hele werkgebied'
  const typeDeel = filter.typen.length
    ? filter.typen.length <= 3
      ? filter.typen.join(', ')
      : `${filter.typen.length} woningtypen`
    : 'alle woningtypen'
  return `${plaatsDeel} · ${typeDeel} · ${PERIODE_LABEL[filter.periode]}`
}

export type EigenAandeelInput = {
  nEigenHuidig: number
  nEigenVorig: number | null
}

export type FeitenbladInput = {
  samenvatting: MarktanalyseSamenvatting
  dataTotEnMet: string | null
  contextLabel: string
  periodeMaanden: 12 | 24 | 36 | 0
  eigenAandeel: EigenAandeelInput | null
}

function regel(label: string, weergave: string): string {
  return `- ${label}: ${weergave}`
}

/**
 * Bouwt het feitenblad uit `marktanalyseSamenvatting` (huidig + vorig) en het
 * eigen aandeel. Bevat uitsluitend: mediaan prijs, € per m², looptijd,
 * aantal, delta's t.o.v. de vorige periode en het eigen aandeel — exact de
 * lijst uit docs/roadmap.md item 6.4. Deltas worden `null` (en dus
 * weggelaten) als `vorig.n` te klein is voor een betrouwbare vergelijking —
 * zelfde regel als de tegels in `MarktanalyseExplorer.tsx`.
 */
export function bouwFeitenblad(input: FeitenbladInput): Feitenblad {
  const { huidig, vorig } = input.samenvatting
  const feiten: Feit[] = []
  const regels: string[] = []

  const voegToe = (
    sleutel: string,
    label: string,
    waarde: number | null | undefined,
    eenheid: FeitEenheid,
    weergave: (v: number) => string,
  ) => {
    if (waarde == null) return
    feiten.push({ sleutel, label, waarde, eenheid })
    regels.push(regel(label, weergave(waarde)))
  }

  const teWeinigVorig = vorig.n < MIN_N_VERGELIJKING
  const periodeLabel = huidig.van && huidig.tot ? `${datum(huidig.van)} – ${datum(huidig.tot)}` : null
  const vorigePeriodeLabel = !teWeinigVorig && vorig.van && vorig.tot ? `${datum(vorig.van)} – ${datum(vorig.tot)}` : null

  regels.push(`Selectie: ${input.contextLabel}`)
  if (input.dataTotEnMet) regels.push(`Data t/m: ${datum(input.dataTotEnMet)}`)
  regels.push('')
  regels.push(`Huidige periode${periodeLabel ? ` (${periodeLabel})` : ''}:`)
  voegToe('huidig_mediaan_prijs', 'Mediaan verkoopprijs', huidig.mediaanPrijs, 'euro', euro)
  voegToe('huidig_mediaan_m2', 'Mediaan prijs per m²', huidig.mediaanM2, 'euro_m2', v => `${euro(v)}/m²`)
  voegToe('huidig_mediaan_looptijd', 'Mediaan looptijd', huidig.mediaanLooptijd, 'dagen', v => `${nlNL.format(Math.round(v))} dagen`)
  voegToe('huidig_pct_tov_vraag', 'Verkocht t.o.v. vraagprijs', huidig.pctTovVraag, 'procent', procent)
  voegToe('huidig_aantal', 'Aantal verkopen', huidig.n, 'aantal', v => nlNL.format(Math.round(v)))
  // Periode-lengte in maanden: geen RPC-cijfer, maar een voor de hand liggend
  // getal in de tekst ("in de afgelopen 24 maanden") — zonder dit als feit op
  // te nemen zou de guardrail zo'n normale zin onterecht afkeuren.
  if (input.periodeMaanden > 0) {
    voegToe('periode_maanden', 'Periodelengte', input.periodeMaanden, 'aantal', v => `${v} maanden`)
  }

  if (huidig.n < MIN_N_VERGELIJKING) {
    regels.push(`Let op: dit is weinig data (n = ${huidig.n}) — benoem dit voorzichtig, geen schijnzeker getal.`)
  }

  if (!teWeinigVorig) {
    regels.push('')
    regels.push(`Vorige periode${vorigePeriodeLabel ? ` (${vorigePeriodeLabel})` : ''}:`)
    voegToe('vorig_mediaan_prijs', 'Mediaan verkoopprijs (vorige periode)', vorig.mediaanPrijs, 'euro', euro)
    voegToe('vorig_mediaan_m2', 'Mediaan prijs per m² (vorige periode)', vorig.mediaanM2, 'euro_m2', v => `${euro(v)}/m²`)
    voegToe('vorig_mediaan_looptijd', 'Mediaan looptijd (vorige periode)', vorig.mediaanLooptijd, 'dagen', v => `${nlNL.format(Math.round(v))} dagen`)
    voegToe('vorig_pct_tov_vraag', 'Verkocht t.o.v. vraagprijs (vorige periode)', vorig.pctTovVraag, 'procent', procent)
    voegToe('vorig_aantal', 'Aantal verkopen (vorige periode)', vorig.n, 'aantal', v => nlNL.format(Math.round(v)))

    regels.push('')
    regels.push('Verandering t.o.v. de vorige periode:')
    voegToe('delta_mediaan_prijs', 'Verandering mediaan verkoopprijs', berekenDelta(huidig.mediaanPrijs, vorig.mediaanPrijs, 'relatief'), 'procent', procent)
    voegToe('delta_mediaan_m2', 'Verandering mediaan prijs per m²', berekenDelta(huidig.mediaanM2, vorig.mediaanM2, 'relatief'), 'procent', procent)
    voegToe(
      'delta_mediaan_looptijd',
      'Verandering mediaan looptijd',
      berekenDelta(huidig.mediaanLooptijd, vorig.mediaanLooptijd, 'absoluut'),
      'dagen',
      v => `${v > 0 ? '+' : ''}${nlNL.format(Math.round(v))} dagen`,
    )
    voegToe(
      'delta_pct_tov_vraag',
      'Verandering verkocht t.o.v. vraagprijs',
      berekenDelta(huidig.pctTovVraag, vorig.pctTovVraag, 'absoluut'),
      'procent',
      v => `${v > 0 ? '+' : ''}${v.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} procentpunt`,
    )
    voegToe('delta_aantal', 'Verandering aantal verkopen', berekenDelta(huidig.n, vorig.n, 'relatief'), 'procent', procent)
  } else {
    regels.push('')
    regels.push('Geen betrouwbare vorige periode (te weinig data) — schrijf geen vergelijking of trend.')
  }

  if (input.eigenAandeel && huidig.n > 0) {
    const { nEigenHuidig, nEigenVorig } = input.eigenAandeel
    const aandeelPct = (nEigenHuidig / huidig.n) * 100
    regels.push('')
    regels.push('Eigen aandeel:')
    voegToe('eigen_aantal', 'Eigen verkopen in deze selectie', nEigenHuidig, 'aantal', v => nlNL.format(Math.round(v)))
    voegToe('eigen_aandeel_pct', 'Eigen aandeel van de selectie', aandeelPct, 'procent', v => procent(v, false))
    if (!teWeinigVorig && nEigenVorig != null && vorig.n > 0) {
      const aandeelVorigPct = (nEigenVorig / vorig.n) * 100
      voegToe('eigen_aandeel_vorig_pct', 'Eigen aandeel vorige periode', aandeelVorigPct, 'procent', v => procent(v, false))
      voegToe(
        'delta_eigen_aandeel_pct',
        'Verandering eigen aandeel',
        berekenDelta(aandeelPct, aandeelVorigPct, 'absoluut'),
        'procent',
        v => `${v > 0 ? '+' : ''}${v.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} procentpunt`,
      )
    }
  }

  const kop = 'FEITENBLAD — gebruik uitsluitend deze cijfers (elke voor de hand liggende NL-afronding is toegestaan), verzin er geen bij:'
  return {
    contextLabel: input.contextLabel,
    periodeLabel,
    vorigePeriodeLabel,
    dataTotEnMet: input.dataTotEnMet,
    feiten,
    tekst: `${kop}\n${regels.join('\n')}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Guardrail: getallen uit de gegenereerde tekst tegen het feitenblad toetsen
// ─────────────────────────────────────────────────────────────────────────

type Groep = 'geld' | 'procent' | 'dagen' | 'aantal'

function groepVanEenheid(eenheid: FeitEenheid): Groep {
  return eenheid === 'euro' || eenheid === 'euro_m2' ? 'geld' : eenheid
}

/**
 * Voor de hand liggende afgeronde varianten van één feit — zodat Claude's
 * eigen prozarondingen ("€ 425.000" → "ruim € 1,2 miljoen") allemaal als
 * "staat in het feitenblad" gelden, zonder dat een willekeurig ander getal
 * toevallig ook meteen doorglipt.
 */
function afgerondeVarianten(waarde: number, groep: Groep): number[] {
  switch (groep) {
    case 'geld': {
      const abs = Math.abs(waarde)
      const stappen = [1, 10, 100, 1_000, 10_000, 100_000].filter(s => s <= Math.max(1_000, abs))
      return Array.from(new Set(stappen.map(s => Math.round(waarde / s) * s)))
    }
    case 'procent': {
      const eenDecimaal = Math.round(waarde * 10) / 10
      const heel = Math.round(waarde)
      // Richting ("daling"/"stijging") kan in woorden staan i.p.v. een minteken.
      return Array.from(new Set([eenDecimaal, heel, -eenDecimaal, -heel]))
    }
    case 'dagen': {
      const heel = Math.round(waarde)
      return Array.from(new Set([heel, -heel]))
    }
    case 'aantal':
      return [Math.round(waarde)]
  }
}

/** Alle toegestane waarden per groep, opgebouwd uit alle feiten van het feitenblad. */
function toegestaneWaarden(feitenblad: Feitenblad): Record<Groep, number[]> {
  const result: Record<Groep, number[]> = { geld: [], procent: [], dagen: [], aantal: [] }
  for (const feit of feitenblad.feiten) {
    const groep = groepVanEenheid(feit.eenheid)
    result[groep].push(...afgerondeVarianten(feit.waarde, groep))
  }
  return result
}

/** "1.234.567" → 1234567, "3,2" → 3.2 — NL-notatie (punt = duizendtal, komma = decimaal). */
function parseNlGetal(ruw: string): number {
  return parseFloat(ruw.replace(/\./g, '').replace(',', '.'))
}

export type GevondenGetal = { ruw: string; waarde: number; groep: Groep }

/**
 * Haalt alle geld-, percentage-, dagen- en aantal-achtige getallen uit een
 * tekst. Bewust behoudend qua patronen (alleen cijfers, geen uitgeschreven
 * getallen als "twaalf") — dat dekt de NL-notatievarianten uit de spec
 * (`€ 425.000`, `3,2%`, `€ 1,2 mln`, "12 procent") zonder op willekeurige
 * jaartallen of adresnummers te reageren.
 */
export function vindGetallenInTekst(tekst: string): GevondenGetal[] {
  const gevonden: GevondenGetal[] = []

  // Euro-bedragen, met optioneel een mln/miljoen- of k/duizend-schaal.
  for (const m of Array.from(tekst.matchAll(/€\s?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)\s*(mln|miljoen|k|duizend)?/gi))) {
    const basis = parseNlGetal(m[1])
    if (Number.isNaN(basis)) continue
    const schaal = m[2]?.toLowerCase()
    const waarde = schaal === 'mln' || schaal === 'miljoen' ? basis * 1_000_000 : schaal === 'k' || schaal === 'duizend' ? basis * 1_000 : basis
    gevonden.push({ ruw: m[0], waarde, groep: 'geld' })
  }

  // Percentages: "3,2%", "3,2 %", "12 procent". `%` heeft geen \b-boundary
  // nodig (niet-woordteken naast een niet-woordteken geeft nooit een \b),
  // "procent" als los woord wel.
  for (const m of Array.from(tekst.matchAll(/(-?\d+(?:,\d+)?)\s?(%|\bprocent\b)/gi))) {
    const waarde = parseNlGetal(m[1])
    if (!Number.isNaN(waarde)) gevonden.push({ ruw: m[0], waarde, groep: 'procent' })
  }

  // Dagen: "34 dagen", "34 dgn".
  for (const m of Array.from(tekst.matchAll(/(\d+)\s?(dagen|dgn)\b/gi))) {
    gevonden.push({ ruw: m[0], waarde: parseInt(m[1], 10), groep: 'dagen' })
  }

  // Aantallen: "47 transacties", "47 verkopen", "47 woningen". Getal in
  // correcte NL-duizendtalnotatie (elke punt gevolgd door precies 3 cijfers)
  // — anders zou "€ 5.430. Woningen" (nieuwe zin na een punt) per ongeluk als
  // "5430 woningen" worden gelezen.
  for (const m of Array.from(tekst.matchAll(/(\d{1,3}(?:\.\d{3})*|\d+)\s?(transacties|verkopen|verkochte woningen|woningen|maanden)\b/gi))) {
    const waarde = parseNlGetal(m[1])
    if (!Number.isNaN(waarde)) gevonden.push({ ruw: m[0], waarde, groep: 'aantal' })
  }

  return gevonden
}

export type GuardrailResultaat = {
  ok: boolean
  onbekend: GevondenGetal[]
}

/** Kleine tolerantie tegen afrondingsverschillen (bv. `Math.round` in verschillende richtingen). */
const TOLERANTIE: Record<Groep, number> = { geld: 0.5, procent: 0.05, dagen: 0.5, aantal: 0.5 }

/**
 * Controleert of élk getal in `tekst` (in een voor de hand liggende NL-
 * afronding) in het feitenblad voorkomt. Dit is de kern van item 6.4: "elk
 * getal in de tekst moet in het feitenblad voorkomen".
 */
export function controleerGuardrail(tekst: string, feitenblad: Feitenblad): GuardrailResultaat {
  const toegestaan = toegestaneWaarden(feitenblad)
  const onbekend = vindGetallenInTekst(tekst).filter(g => !toegestaan[g.groep].some(v => Math.abs(v - g.waarde) <= TOLERANTIE[g.groep]))
  return { ok: onbekend.length === 0, onbekend }
}
