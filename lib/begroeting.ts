/**
 * Begroeting en datum voor de startpagina.
 *
 * Waarom dit op de server hoort en niet in de client-component: `new Date()`
 * in een client component levert op Vercel (UTC) een ándere uitkomst dan in de
 * browser van de makelaar (Europe/Amsterdam). Dat is een hydratiemismatch —
 * React-fout #425 — en die zag je op /dashboard: de server schreef
 * "Goedemorgen" waar de browser "Goedemiddag" verwachtte. Een mislukte
 * hydratie laat de héle pagina half-levend achter, inclusief het profielmenu
 * in de topbar dat daardoor niet meer opende (19 sep 2026).
 *
 * Oplossing: de server rekent beide strings uit in de Nederlandse tijdzone en
 * geeft ze door als props. Server en client renderen dan dezelfde tekst.
 */

const TIJDZONE = 'Europe/Amsterdam'

/** Uur van de dag (0-23) in Nederland, ongeacht de tijdzone van de server. */
export function uurInNederland(nu: Date): number {
  const uur = new Intl.DateTimeFormat('nl-NL', { timeZone: TIJDZONE, hour: 'numeric', hour12: false }).format(nu)
  // "24" komt voor als middernacht-notatie in sommige ICU-versies.
  return Number(uur) % 24
}

/** Goedemorgen/-middag/-avond/-nacht op basis van de Nederlandse kloktijd. */
export function begroetingVoor(nu: Date): string {
  const uur = uurInNederland(nu)
  if (uur < 6) return 'Goedenacht'
  if (uur < 12) return 'Goedemorgen'
  if (uur < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

/** "Vrijdag 19 september" — met hoofdletter, zoals in het prototype. */
export function datumVoor(nu: Date): string {
  const tekst = new Intl.DateTimeFormat('nl-NL', {
    timeZone: TIJDZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(nu)
  return tekst.charAt(0).toUpperCase() + tekst.slice(1)
}

/**
 * De contextregel onder de begroeting (prototype: "2 dossiers wachten op
 * content"). Toont het eerstvolgende dat aandacht vraagt; is er niets, dan een
 * feitelijke stand in plaats van een lege regel of een loze aanmoediging.
 */
export function contextregel({ wachtOpContent, inVerkoop, verkoopadviezen }: {
  wachtOpContent: number
  inVerkoop: number
  verkoopadviezen: number
}): string {
  if (wachtOpContent > 0) {
    return `${wachtOpContent} ${wachtOpContent === 1 ? 'dossier wacht' : 'dossiers wachten'} op content`
  }
  if (inVerkoop > 0) {
    return `${inVerkoop} ${inVerkoop === 1 ? 'woning' : 'woningen'} in verkoop`
  }
  if (verkoopadviezen > 0) {
    return `${verkoopadviezen} ${verkoopadviezen === 1 ? 'lopend verkoopadvies' : 'lopende verkoopadviezen'}`
  }
  return 'Nog geen lopende dossiers'
}
