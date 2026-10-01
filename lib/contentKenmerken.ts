import type { PropertyInput } from './schemas'

/**
 * Kenmerkregels voor de contentprompt (`buildUserMessage` in lib/claude.ts).
 * Tot 1 okt 2026 kreeg de kern-call alleen adres, type, kamers, m², bouwjaar,
 * label, prijs, usp's en doelgroep mee — alles wat de makelaar verder in de
 * intake invult (slaapkamers, woonlagen, tuin, balkon, keuken- en badkamerjaar,
 * zonnepanelen …) bereikte het model nooit. In de blinde ronde van die dag
 * verzonnen alle drie de modellen daardoor verdiepingen en slaapkamers en
 * miste iedereen een balkon (docs/evaluatie/rondes/2026-10-01/oordeel.md).
 *
 * Alleen ingevulde velden komen mee; een expliciet "nee" (geen balkon, geen
 * zonnepanelen) ook, want dat voorkomt dat het model het tegendeel verzint.
 * Interne velden (courtage, prijsverwachting van de verkoper, WOZ) blijven
 * bewust buiten de prompt.
 */
type Taal = 'nl' | 'en'
type Vertaling = Record<string, { nl: string; en: string }>

const LIGGING: Vertaling = {
  hoekwoning: { nl: 'hoekwoning', en: 'corner house' },
  tussenwoning: { nl: 'tussenwoning', en: 'mid-terrace' },
  vrijstaand: { nl: 'vrijstaand', en: 'detached' },
  twee_onder_een_kap: { nl: 'twee-onder-een-kap', en: 'semi-detached' },
}
const ORIENTATIE: Vertaling = {
  noord: { nl: 'noorden', en: 'north' }, noordoost: { nl: 'noordoosten', en: 'north-east' },
  oost: { nl: 'oosten', en: 'east' }, zuidoost: { nl: 'zuidoosten', en: 'south-east' },
  zuid: { nl: 'zuiden', en: 'south' }, zuidwest: { nl: 'zuidwesten', en: 'south-west' },
  west: { nl: 'westen', en: 'west' }, noordwest: { nl: 'noordwesten', en: 'north-west' },
}
const PARKEREN: Vertaling = {
  garage: { nl: 'eigen garage', en: 'private garage' },
  carport: { nl: 'carport', en: 'carport' },
  oprit: { nl: 'eigen oprit', en: 'private driveway' },
  openbaar: { nl: 'openbaar parkeren', en: 'public parking' },
  geen: { nl: 'geen eigen parkeerplek', en: 'no private parking' },
}
const ISOLATIE: Vertaling = {
  dak: { nl: 'dak', en: 'roof' }, muur: { nl: 'muren', en: 'walls' },
  vloer: { nl: 'vloer', en: 'floor' }, glas: { nl: 'isolatieglas', en: 'insulated glazing' },
}
const ONDERHOUD: Vertaling = {
  uitstekend: { nl: 'uitstekend', en: 'excellent' }, goed: { nl: 'goed', en: 'good' },
  voldoende: { nl: 'voldoende', en: 'fair' }, opknapper: { nl: 'opknapper', en: 'needs renovation' },
}
const BIJZONDER: Vertaling = {
  water: { nl: 'aan het water', en: 'on the water' },
  park: { nl: 'aan of bij een park', en: 'on or near a park' },
  drukke_weg: { nl: 'aan een drukke weg', en: 'on a busy road' },
}

const vertaal = (tabel: Vertaling, waarde: string, taal: Taal) => tabel[waarde]?.[taal] ?? waarde
const jaNee = (b: boolean, taal: Taal) => (b ? (taal === 'en' ? 'yes' : 'ja') : (taal === 'en' ? 'no' : 'nee'))
const euro = (n: number) => `€${n.toLocaleString('nl-NL')}`

export function kenmerkRegels(input: PropertyInput, taal: Taal): string[] {
  const en = taal === 'en'
  const r: string[] = []
  const regel = (nl: string, engels: string, waarde: string | number) => r.push(`${en ? engels : nl}: ${waarde}`)

  if (input.slaapkamers !== undefined) regel('Slaapkamers', 'Bedrooms', input.slaapkamers)
  if (input.badkamers !== undefined) regel('Badkamers', 'Bathrooms', input.badkamers)
  if (input.woonlagen !== undefined) regel('Woonlagen', 'Floors (living levels)', input.woonlagen)
  if (input.perceel_m2 !== undefined) regel('Perceel', 'Plot', `${input.perceel_m2} m²`)
  if (input.inhoud_m3 !== undefined) regel('Inhoud', 'Volume', `${input.inhoud_m3} m³`)

  const s = input.staat_afwerking
  if (s) {
    if (s.onderhoud_binnen) regel('Onderhoud binnen', 'Interior condition', vertaal(ONDERHOUD, s.onderhoud_binnen, taal))
    if (s.onderhoud_buiten) regel('Onderhoud buiten', 'Exterior condition', vertaal(ONDERHOUD, s.onderhoud_buiten, taal))
    if (s.keuken_jaar) regel('Keuken uit', 'Kitchen from', s.keuken_jaar)
    if (s.badkamer_jaar) regel('Badkamer uit', 'Bathroom from', s.badkamer_jaar)
    if (s.isolatie?.length) regel('Isolatie', 'Insulation', s.isolatie.map(i => vertaal(ISOLATIE, i, taal)).join(', '))
    if (s.zonnepanelen !== undefined) regel('Zonnepanelen', 'Solar panels', jaNee(s.zonnepanelen, taal))
    if (s.recent_verbouwd) regel('Recent verbouwd', 'Recent renovations (in Dutch)', s.recent_verbouwd)
  }

  const l = input.ligging_buitenruimte
  if (l) {
    if (l.ligging) regel('Ligging', 'Position', vertaal(LIGGING, l.ligging, taal))
    if (l.tuin_m2 !== undefined) {
      const orientatie = l.tuin_orientatie ? (en ? `, facing ${vertaal(ORIENTATIE, l.tuin_orientatie, taal)}` : ` op het ${vertaal(ORIENTATIE, l.tuin_orientatie, taal)}`) : ''
      regel('Tuin', 'Garden', `${l.tuin_m2} m²${orientatie}`)
    } else if (l.tuin_orientatie) {
      regel('Tuin', 'Garden', en ? `facing ${vertaal(ORIENTATIE, l.tuin_orientatie, taal)}` : `op het ${vertaal(ORIENTATIE, l.tuin_orientatie, taal)}`)
    }
    if (l.achterom !== undefined) regel('Achterom', 'Rear access', jaNee(l.achterom, taal))
    // De intake zegt niet wélke van de twee: anders schreef het model letterlijk "het balkon of dakterras".
    if (l.balkon_dakterras !== undefined) regel('Buitenruimte op de verdieping (balkon of dakterras, niet gespecificeerd)', 'Outdoor space upstairs (balcony or roof terrace, not specified)', jaNee(l.balkon_dakterras, taal))
    if (l.garage_parkeren) regel('Parkeren', 'Parking', vertaal(PARKEREN, l.garage_parkeren, taal))
    if (l.berging !== undefined) regel('Berging', 'Storage room', jaNee(l.berging, taal))
    if (l.uitzicht) regel('Uitzicht', 'View (in Dutch)', l.uitzicht)
    if (l.bijzondere_ligging?.length) regel('Bijzondere ligging', 'Notable location', l.bijzondere_ligging.map(b => vertaal(BIJZONDER, b, taal)).join(', '))
    if (l.monument) regel('Monument', 'Listed building', jaNee(true, taal))
    if (l.vve_bijdrage_per_maand !== undefined) regel('VvE-bijdrage', 'HOA contribution', `${euro(l.vve_bijdrage_per_maand)} ${en ? 'per month' : 'per maand'}`)
    if (l.erfpacht) {
      regel('Erfpacht', 'Ground lease', l.erfpacht.van_toepassing
        ? `${jaNee(true, taal)}${l.erfpacht.canon_per_jaar !== undefined ? `, ${en ? 'ground rent' : 'canon'} ${euro(l.erfpacht.canon_per_jaar)} ${en ? 'per year' : 'per jaar'}` : ''}${l.erfpacht.afgekocht_tot ? `, ${en ? 'bought off until' : 'afgekocht tot'} ${l.erfpacht.afgekocht_tot}` : ''}`
        : jaNee(false, taal))
    }
  }
  return r
}

/** Vaste regel onder de kenmerken: feiten alleen hieruit, niets bijverzinnen. */
export function feitenRegel(taal: Taal): string {
  return taal === 'en'
    ? 'Facts (rooms, bedrooms, floors, features, years, outdoor space) only from the data above — do not invent any. Atmosphere and lifestyle may be described freely.'
    : 'Feiten (kamers, slaapkamers, verdiepingen, voorzieningen, jaartallen, buitenruimte) alleen uit de gegevens hierboven — verzin er geen bij. Sfeer en leefstijl mag je vrij beschrijven.'
}
