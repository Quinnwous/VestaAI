/**
 * Data-verrijking voor woninggeneratie.
 * Haalt WOZ, CBS-buurtdata en Overpass-voorzieningen op voor een adres.
 * Elke databron faalt stilzwijgend — de generatie gaat altijd door.
 */

const FETCH_TIMEOUT = 8000

async function fetchMet<T>(url: string, init?: RequestInit, timeoutMs = FETCH_TIMEOUT): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ─── PDOK Locatieserver ───────────────────────────────────────────────────────

interface PdokHit {
  centroide_ll?: string  // "POINT(lon lat)"
  buurtcode?: string     // BU...
  buurtnaam?: string
  wijkcode?: string      // WK...
  wijknaam?: string
  gemeentecode?: string  // GM...
  gemeentenaam?: string
  postcode?: string
  nummeraanduiding_id?: string
  adresseerbaarobject_id?: string
}

async function pdokLookup(adres: string): Promise<PdokHit | null> {
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(adres)}&fq=type:adres&rows=1&fl=centroide_ll,buurtcode,buurtnaam,wijkcode,wijknaam,gemeentecode,gemeentenaam,postcode,nummeraanduiding_id,adresseerbaarobject_id`
  const data = await fetchMet<{ response: { docs: PdokHit[] } }>(url)
  return data?.response?.docs?.[0] ?? null
}

function parsePdokCoord(centroide: string): { lat: number; lon: number } | null {
  const m = centroide.match(/POINT\(([0-9.]+)\s+([0-9.]+)\)/)
  if (!m) return null
  return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) }
}

// ─── WOZ Waardeloket ─────────────────────────────────────────────────────────

interface WozWaarde {
  peildatum: string   // "YYYY-01-01"
  vastgesteldeWaarde: number
}

interface WozObject {
  aanduiding: { postcode: string; huisnummer: number }
  wozWaarden: WozWaarde[]
}

export interface WozData {
  object_id: string | null
  waarden: Array<{ peildatum: string; waarde: number; belastingjaar: number }>
  stijging_pct: string | null
  per_m2: number | null
}

async function fetchWoz(adresseerbaarobjectId: string, oppervlakM2?: number): Promise<WozData | null> {
  if (!adresseerbaarobjectId) return null

  const data = await fetchMet<{ _embedded?: { wozObjecten?: WozObject[] }; identificatie?: string }>(
    `https://api.wozwaardeloket.nl/v1/wozobjecten?adresseerbaarobject=${adresseerbaarobjectId}`,
    { headers: { Accept: 'application/json' } },
  )

  const objecten = data?._embedded?.wozObjecten
  if (!objecten?.length) return null

  const obj = objecten[0]
  const waarden = (obj.wozWaarden ?? [])
    .map(w => ({
      peildatum: w.peildatum,
      waarde: w.vastgesteldeWaarde,
      belastingjaar: new Date(w.peildatum).getFullYear() + 1,
    }))
    .sort((a, b) => b.belastingjaar - a.belastingjaar)
    .slice(0, 5)

  if (!waarden.length) return null

  const nieuwste = waarden[0].waarde
  const oudste = waarden[waarden.length - 1].waarde
  const stijging_pct = waarden.length > 1
    ? `${(((nieuwste - oudste) / oudste) * 100).toFixed(1)}% over ${waarden.length - 1} jaar`
    : null

  return {
    object_id: data?.identificatie ?? null,
    waarden,
    stijging_pct,
    per_m2: oppervlakM2 ? Math.round(nieuwste / oppervlakM2) : null,
  }
}

// ─── CBS Kerncijfers wijken en buurten (live OData) ───────────────────────────
//
// Dataset 85984NED = jaargang 2024: de meest recente jaargang die óók inkomen
// publiceert (de 2025-jaargang heeft dat veld nog leeg, zelfs op gemeenteniveau).
//
// CBS onderdrukt cijfers op buurtniveau zodra een groep te klein wordt — inkomen
// ontbreekt daardoor in veel buurten. Daarom vragen we buurt, wijk, gemeente én
// de landelijke referentierij in één call op en zakken we per losse indicator
// naar het eerstvolgende niveau dat wél een cijfer heeft. Elk cijfer draagt zijn
// eigen herkomst mee, zodat de UI en de prompt nooit een gemeentecijfer als
// buurtfeit kunnen presenteren.

const CBS_DATASET = '85984NED'
const CBS_JAAR = 2024
const CBS_BRON = `CBS Kerncijfers wijken en buurten ${CBS_JAAR}`

export type CbsNiveau = 'buurt' | 'wijk' | 'gemeente' | 'nederland'

const CBS_NIVEAU_LABEL: Record<CbsNiveau, string> = {
  buurt: 'buurtcijfer',
  wijk: 'wijkcijfer',
  gemeente: 'gemeentecijfer',
  nederland: 'landelijk cijfer',
}

interface CbsRij {
  WijkenEnBuurten: string
  Gemeentenaam_1: string | null
  AantalInwoners_5: number | null
  k_65JaarOfOuder_12: number | null
  HuishoudensTotaal_29: number | null
  HuishoudensMetKinderen_32: number | null
  GemiddeldeHuishoudensgrootte_33: number | null
  Bevolkingsdichtheid_34: number | null
  GemiddeldeWOZWaardeVanWoningen_39: number | null
  PercentageEengezinswoning_40: number | null
  Koopwoningen_47: number | null
  BouwjaarAfgelopenTienJaar_52: number | null
  BasisonderwijsVmboMbo1_67: number | null
  HavoVwoMbo24_68: number | null
  HboWo_69: number | null
  GemiddeldInkomenPerInwoner_78: number | null
}

const CBS_VELDEN: Array<keyof CbsRij> = [
  'WijkenEnBuurten',
  'Gemeentenaam_1',
  'AantalInwoners_5',
  'k_65JaarOfOuder_12',
  'HuishoudensTotaal_29',
  'HuishoudensMetKinderen_32',
  'GemiddeldeHuishoudensgrootte_33',
  'Bevolkingsdichtheid_34',
  'GemiddeldeWOZWaardeVanWoningen_39',
  'PercentageEengezinswoning_40',
  'Koopwoningen_47',
  'BouwjaarAfgelopenTienJaar_52',
  'BasisonderwijsVmboMbo1_67',
  'HavoVwoMbo24_68',
  'HboWo_69',
  'GemiddeldInkomenPerInwoner_78',
]

/** CBS bewaart regiocodes rechts opgevuld tot 10 tekens; zonder padding matcht `eq` niet. */
export function cbsRegioCode(code: string): string {
  return code.trim().padEnd(10, ' ')
}

type CbsRijen = Partial<Record<CbsNiveau, CbsRij>>

export interface CbsMetriek {
  waarde: number
  niveau: CbsNiveau
}

export interface CbsData {
  gemeente: string
  buurtnaam: string | null
  wijknaam: string | null
  bron: string
  /** Fijnste niveau waarvoor CBS überhaupt een rij had — zegt niets over losse indicatoren. */
  fijnste_niveau: CbsNiveau
  inkomen: CbsMetriek | null
  pct_koop: CbsMetriek | null
  woz_gem: CbsMetriek | null
  pct_hoog_opgeleid: CbsMetriek | null
  dichtheid_per_km2: CbsMetriek | null
  pct_eengezins: CbsMetriek | null
  huishoudensgrootte: CbsMetriek | null
  pct_65plus: CbsMetriek | null
  pct_met_kinderen: CbsMetriek | null
  dichtheid: string
  buurtprofiel: 'Premium' | 'Bovengemiddeld' | 'Gemiddeld' | 'Ondergemiddeld'
  /** Landelijke referentiewaarden uit dezelfde jaargang, voor eerlijke vergelijking. */
  nl: { inkomen: number | null; pct_koop: number | null; woz_gem: number | null; pct_hoog_opgeleid: number | null }
  /**
   * Strikt gemeenteniveau, zonder cascade. Nodig voor uitspraken óver de gemeente
   * (zoals het markttype): de gecascadeerde velden hierboven bevatten meestal het
   * buurtcijfer, en een dure buurt maakt de gemeente nog niet duur.
   */
  gemeente_niveau: { woz_gem: number | null; dichtheid_per_km2: number | null }
}

const NIVEAU_VOLGORDE: CbsNiveau[] = ['buurt', 'wijk', 'gemeente', 'nederland']

/** Zakt per indicator naar het fijnste niveau dat een cijfer heeft. */
function metriek(
  rijen: CbsRijen,
  lees: (rij: CbsRij) => number | null,
  vanaf: CbsNiveau = 'buurt',
): CbsMetriek | null {
  const start = NIVEAU_VOLGORDE.indexOf(vanaf)
  for (const niveau of NIVEAU_VOLGORDE.slice(start < 0 ? 0 : start)) {
    const rij = rijen[niveau]
    if (!rij) continue
    const waarde = lees(rij)
    if (waarde === null || waarde === undefined || Number.isNaN(waarde)) continue
    return { waarde, niveau }
  }
  return null
}

/** Aandeel hbo/wo binnen de bevolking met bekend opleidingsniveau (drie velden, zelfde niveau). */
function opleidingsniveau(rij: CbsRij): number | null {
  const hbo = rij.HboWo_69
  const laag = rij.BasisonderwijsVmboMbo1_67
  const midden = rij.HavoVwoMbo24_68
  if (hbo === null || laag === null || midden === null) return null
  const totaal = hbo + laag + midden
  if (totaal <= 0) return null
  return Math.round((hbo / totaal) * 100)
}

function dichtheidLabel(perKm2: number | null): string {
  if (perKm2 === null) return 'onbekend'
  if (perKm2 >= 2500) return 'hoog'
  if (perKm2 >= 1000) return 'gemiddeld'
  return 'laag'
}

async function fetchCbs(
  buurtcode: string | null,
  wijkcode: string | null,
  gemeentecode: string | null,
): Promise<CbsData | null> {
  const gemeenteCbs = gemeentecode
    ? gemeentecode.startsWith('GM') ? gemeentecode : `GM${gemeentecode}`
    : null

  const gevraagd: Array<[CbsNiveau, string]> = []
  if (buurtcode) gevraagd.push(['buurt', buurtcode])
  if (wijkcode) gevraagd.push(['wijk', wijkcode])
  if (gemeenteCbs) gevraagd.push(['gemeente', gemeenteCbs])
  if (!gevraagd.length) return null
  gevraagd.push(['nederland', 'NL00'])

  const filter = gevraagd
    .map(([, code]) => `WijkenEnBuurten eq '${cbsRegioCode(code)}'`)
    .join(' or ')

  const url =
    `https://opendata.cbs.nl/ODataApi/odata/${CBS_DATASET}/TypedDataSet` +
    `?$filter=${encodeURIComponent(filter)}` +
    `&$select=${CBS_VELDEN.join(',')}` +
    `&$format=json`

  const data = await fetchMet<{ value?: CbsRij[] }>(url, { headers: { Accept: 'application/json' } }, 10000)
  const waarden = data?.value
  if (!waarden?.length) return null

  // Terugkoppelen op de codes die we vroegen — CBS geeft geen niveau-veld terug dat we vertrouwen.
  const rijen: CbsRijen = {}
  for (const [niveau, code] of gevraagd) {
    const gezocht = cbsRegioCode(code)
    const rij = waarden.find(r => r.WijkenEnBuurten === gezocht)
    if (rij) rijen[niveau] = rij
  }

  const fijnste = NIVEAU_VOLGORDE.find(n => n !== 'nederland' && rijen[n])
  if (!fijnste) return null

  const inkomen = metriek(rijen, r => (r.GemiddeldInkomenPerInwoner_78 === null ? null : Math.round(r.GemiddeldInkomenPerInwoner_78 * 1000)))
  const woz_gem = metriek(rijen, r => (r.GemiddeldeWOZWaardeVanWoningen_39 === null ? null : r.GemiddeldeWOZWaardeVanWoningen_39 * 1000))
  const pct_koop = metriek(rijen, r => r.Koopwoningen_47)
  const pct_hoog_opgeleid = metriek(rijen, opleidingsniveau)
  const dichtheid_per_km2 = metriek(rijen, r => r.Bevolkingsdichtheid_34)
  const pct_eengezins = metriek(rijen, r => r.PercentageEengezinswoning_40)
  const huishoudensgrootte = metriek(rijen, r => r.GemiddeldeHuishoudensgrootte_33)
  const pct_65plus = metriek(rijen, r =>
    r.k_65JaarOfOuder_12 !== null && r.AantalInwoners_5 ? Math.round((r.k_65JaarOfOuder_12 / r.AantalInwoners_5) * 100) : null,
  )
  const pct_met_kinderen = metriek(rijen, r =>
    r.HuishoudensMetKinderen_32 !== null && r.HuishoudensTotaal_29 ? Math.round((r.HuishoudensMetKinderen_32 / r.HuishoudensTotaal_29) * 100) : null,
  )

  const nlRij = rijen.nederland ?? null
  const nl = {
    inkomen: nlRij?.GemiddeldInkomenPerInwoner_78 != null ? Math.round(nlRij.GemiddeldInkomenPerInwoner_78 * 1000) : null,
    pct_koop: nlRij?.Koopwoningen_47 ?? null,
    woz_gem: nlRij?.GemiddeldeWOZWaardeVanWoningen_39 != null ? nlRij.GemiddeldeWOZWaardeVanWoningen_39 * 1000 : null,
    pct_hoog_opgeleid: nlRij ? opleidingsniveau(nlRij) : null,
  }

  // Score alleen op indicatoren die we écht hebben én die niet zelf het landelijk
  // cijfer zijn — anders vergelijkt een buurt met zichzelf en valt alles op 'Gemiddeld'.
  const punten: number[] = []
  const scoor = (m: CbsMetriek | null, referentie: number | null) => {
    if (!m || referentie === null || referentie <= 0 || m.niveau === 'nederland') return
    const ratio = m.waarde / referentie
    punten.push(ratio > 1.3 ? 2 : ratio > 1.1 ? 1 : ratio < 0.85 ? -1 : 0)
  }
  scoor(inkomen, nl.inkomen)
  scoor(woz_gem, nl.woz_gem)
  scoor(pct_hoog_opgeleid, nl.pct_hoog_opgeleid)

  const gemiddeldeScore = punten.length ? punten.reduce((a, b) => a + b, 0) / punten.length : 0
  const buurtprofiel: CbsData['buurtprofiel'] =
    gemiddeldeScore >= 1.7 ? 'Premium'
      : gemiddeldeScore >= 1 ? 'Bovengemiddeld'
        : gemiddeldeScore >= 0 ? 'Gemiddeld'
          : 'Ondergemiddeld'

  const naam = (v: string | null | undefined) => (v ? v.trim() || null : null)

  return {
    gemeente: naam(rijen.gemeente?.Gemeentenaam_1) ?? naam(rijen.buurt?.Gemeentenaam_1) ?? '',
    buurtnaam: null,
    wijknaam: null,
    bron: CBS_BRON,
    fijnste_niveau: fijnste,
    inkomen,
    pct_koop,
    woz_gem,
    pct_hoog_opgeleid,
    dichtheid_per_km2,
    pct_eengezins,
    huishoudensgrootte,
    pct_65plus,
    pct_met_kinderen,
    dichtheid: dichtheidLabel(dichtheid_per_km2?.waarde ?? null),
    buurtprofiel,
    nl,
    gemeente_niveau: {
      woz_gem: rijen.gemeente?.GemiddeldeWOZWaardeVanWoningen_39 != null
        ? rijen.gemeente.GemiddeldeWOZWaardeVanWoningen_39 * 1000
        : null,
      dichtheid_per_km2: rijen.gemeente?.Bevolkingsdichtheid_34 ?? null,
    },
  }
}

// ─── Overpass voorzieningen ───────────────────────────────────────────────────

interface OverpassElement {
  type: 'node' | 'way'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
  _afstand_m?: number
}

export interface VoorzieningItem {
  naam: string
  afstand_m: number
  looptijd_min: number
}

export interface VoorzieningenData {
  supermarkt: VoorzieningItem[]
  apotheek: VoorzieningItem[]
  huisarts: VoorzieningItem[]
  scholen: VoorzieningItem[]
  ov_haltes: VoorzieningItem[]
  treinstation: VoorzieningItem[]
  groen: VoorzieningItem[]
  nabijheid_beoordeling: string
}

function afstandM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toVoorzieningItems(elements: OverpassElement[], lat: number, lon: number, max = 3): VoorzieningItem[] {
  return elements
    .map(el => {
      const elLat = el.lat ?? el.center?.lat ?? null
      const elLon = el.lon ?? el.center?.lon ?? null
      if (!elLat || !elLon) return null
      const afstand = afstandM(lat, lon, elLat, elLon)
      const naam = el.tags?.name ?? el.tags?.['name:nl'] ?? el.tags?.brand ?? 'Onbekend'
      return { naam, afstand_m: Math.round(afstand / 50) * 50, looptijd_min: Math.round((afstand / 80) * 2) / 2 }
    })
    .filter((x): x is VoorzieningItem => x !== null)
    .sort((a, b) => a.afstand_m - b.afstand_m)
    .slice(0, max)
}

async function fetchVoorzieningen(lat: number, lon: number, radius = 1500): Promise<VoorzieningenData | null> {
  const query = `[out:json][timeout:15];
(
  node["shop"~"supermarket|convenience"]["name"](around:${radius},${lat},${lon});
  node["amenity"="pharmacy"](around:${radius},${lat},${lon});
  node["amenity"="doctors"](around:${radius},${lat},${lon});
  node["amenity"~"school|secondary"](around:${radius},${lat},${lon});
  node["public_transport"="stop_position"](around:600,${lat},${lon});
  node["railway"="station"](around:${radius},${lat},${lon});
  way["leisure"~"park|garden"](around:${radius},${lat},${lon});
);
out center;`

  const data = await fetchMet<{ elements: OverpassElement[] }>('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!data?.elements?.length) return null

  const els = data.elements

  const supermarkten = toVoorzieningItems(els.filter(e => e.tags?.shop === 'supermarket' || e.tags?.shop === 'convenience'), lat, lon)
  const apotheken = toVoorzieningItems(els.filter(e => e.tags?.amenity === 'pharmacy'), lat, lon)
  const huisartsen = toVoorzieningItems(els.filter(e => e.tags?.amenity === 'doctors'), lat, lon)
  const scholen = toVoorzieningItems(els.filter(e => e.tags?.amenity === 'school' || e.tags?.amenity === 'secondary'), lat, lon)
  const ovHaltes = toVoorzieningItems(els.filter(e => e.tags?.public_transport === 'stop_position'), lat, lon)
  const treinstations = toVoorzieningItems(els.filter(e => e.tags?.railway === 'station'), lat, lon, 1)
  const groen = toVoorzieningItems(els.filter(e => e.tags?.leisure === 'park' || e.tags?.leisure === 'garden'), lat, lon)

  const nabijheid = (() => {
    const superAfstand = supermarkten[0]?.afstand_m ?? 9999
    const ovAfstand = ovHaltes[0]?.afstand_m ?? 9999
    if (superAfstand <= 400 && ovAfstand <= 400) return 'Uitstekend'
    if (superAfstand <= 800 && ovAfstand <= 600) return 'Goed'
    if (superAfstand <= 1200) return 'Voldoende'
    return 'Beperkt'
  })()

  return {
    supermarkt: supermarkten,
    apotheek: apotheken,
    huisarts: huisartsen,
    scholen,
    ov_haltes: ovHaltes,
    treinstation: treinstations,
    groen,
    nabijheid_beoordeling: nabijheid,
  }
}

// ─── Marktdynamiek gemeente-type ─────────────────────────────────────────────

type GemeenteType = 'premium' | 'randstadcentrum' | 'randstadbuiten' | 'middelgroot' | 'landelijk'

interface MarktProfiel {
  label: string
  verkooptijd_weken: string
  overbiedingskans_pct: string
  overbod_pct: string
  voorraad_maanden: string
  marktomstandigheid: string
  strategie: string
  seizoen_advies: string
  woz_trend_2019_2024: string
}

const GEMEENTE_TYPE_MAP: Record<string, GemeenteType> = {
  wassenaar: 'premium', bloemendaal: 'premium', bergen: 'premium', blaricum: 'premium',
  laren: 'premium', heemstede: 'premium', rozendaal: 'premium', eemnes: 'premium',
  amsterdam: 'randstadcentrum', rotterdam: 'randstadcentrum',
  'den haag': 'randstadcentrum', "'s-gravenhage": 'randstadcentrum', utrecht: 'randstadcentrum',
  haarlem: 'randstadbuiten', leiden: 'randstadbuiten', delft: 'randstadbuiten',
  zoetermeer: 'randstadbuiten', amstelveen: 'randstadbuiten', barendrecht: 'randstadbuiten',
  gouda: 'randstadbuiten', 'alphen aan den rijn': 'randstadbuiten',
  eindhoven: 'middelgroot', breda: 'middelgroot', tilburg: 'middelgroot',
  groningen: 'middelgroot', nijmegen: 'middelgroot', arnhem: 'middelgroot',
  zwolle: 'middelgroot', apeldoorn: 'middelgroot', enschede: 'middelgroot',
  maastricht: 'middelgroot',
}

const MARKT_PROFIELEN: Record<GemeenteType, MarktProfiel> = {
  premium: {
    label: 'Premiumgemeente',
    verkooptijd_weken: '4–8 weken',
    overbiedingskans_pct: '30–50%',
    overbod_pct: '5–15% boven vraagprijs',
    voorraad_maanden: '2–4 maanden',
    marktomstandigheid: 'Verkopersmarkt (€400k–€900k); neutraal boven €900k',
    strategie: 'Biedingsprocedure effectief €400k–€900k; stille verkoop aanbevolen boven €1M',
    seizoen_advies: 'Best: april–juni en september–oktober; rustigst augustus en december',
    woz_trend_2019_2024: '+43–45% cumulatief (boven nationaal +35%)',
  },
  randstadcentrum: {
    label: 'Randstadcentrum',
    verkooptijd_weken: '3–6 weken',
    overbiedingskans_pct: '60–75%',
    overbod_pct: '8–20% boven vraagprijs',
    voorraad_maanden: '<2 maanden',
    marktomstandigheid: 'Uitgesproken verkopersmarkt (appartementen/tussenwoningen); neutraal boven €1,5M',
    strategie: 'Biedingsprocedure sterk aanbevolen; publiceer dinsdag/woensdag voor Funda-weekendviews',
    seizoen_advies: 'Doorlopend actief; lichte dip augustus en december',
    woz_trend_2019_2024: '+38–40% cumulatief (boven nationaal +35%)',
  },
  randstadbuiten: {
    label: 'Randstadbuiten',
    verkooptijd_weken: '4–8 weken',
    overbiedingskans_pct: '40–60%',
    overbod_pct: '5–12% boven vraagprijs',
    voorraad_maanden: '2–3 maanden',
    marktomstandigheid: 'Verkopersmarkt tot licht neutraal',
    strategie: 'Biedingsprocedure effectief; marktconforme vraagprijs als instapstrategie',
    seizoen_advies: 'Lente en vroege herfst meest actief',
    woz_trend_2019_2024: '+36–38% cumulatief (rond nationaal gemiddelde)',
  },
  middelgroot: {
    label: 'Middelgrote stad',
    verkooptijd_weken: '5–10 weken',
    overbiedingskans_pct: '30–50%',
    overbod_pct: '3–10% boven vraagprijs',
    voorraad_maanden: '2–4 maanden',
    marktomstandigheid: 'Neutraal tot licht verkopersmarkt',
    strategie: 'Marktconforme vraagprijs; biedingsprocedure optioneel',
    seizoen_advies: 'Lente actief; zomer en winter rustiger',
    woz_trend_2019_2024: '+30–35% cumulatief (rond of licht onder nationaal)',
  },
  landelijk: {
    label: 'Landelijk/overig',
    verkooptijd_weken: '6–14 weken',
    overbiedingskans_pct: '15–30%',
    overbod_pct: '0–5% boven vraagprijs',
    voorraad_maanden: '3–5 maanden',
    marktomstandigheid: 'Neutraal tot licht kopersmarkt',
    strategie: 'Realistische vraagprijs essentieel; onderhandelingsruimte ingebouwd',
    seizoen_advies: 'Lente meest actief; overige seizoenen rustiger',
    woz_trend_2019_2024: '+30–35% cumulatief (nationaal gemiddelde als proxy)',
  },
}

export interface MarktData extends MarktProfiel {
  gemeente_type: GemeenteType
  /** 'lijst' = expliciet ingedeelde gemeente, 'afgeleid' = geclassificeerd op CBS-cijfers. */
  herkomst: 'lijst' | 'afgeleid'
}

/**
 * Gemeentes buiten GEMEENTE_TYPE_MAP belandden voorheen allemaal op 'landelijk',
 * ook dure forensengemeentes als Oegstgeest of Gooise Meren (WOZ ~1,5× landelijk).
 * Met echte CBS-cijfers classificeren we die nu op WOZ-niveau en bevolkingsdichtheid.
 * Bewust géén 'Randstad'-labels afleiden: dat is een marktoordeel dat niet uit
 * demografie volgt — die twee typen blijven voorbehouden aan de expliciete lijst.
 */
function marktProfielOpzoeken(gemeentenaam: string, cbs: CbsData | null): MarktData {
  const key = gemeentenaam.toLowerCase().trim()
  const uitLijst = GEMEENTE_TYPE_MAP[key]
  if (uitLijst) return { gemeente_type: uitLijst, herkomst: 'lijst', ...MARKT_PROFIELEN[uitLijst] }

  // Strikt gemeenteniveau — nooit de gecascadeerde buurtcijfers, zie CbsData.gemeente_niveau.
  const wozGemeente = cbs?.gemeente_niveau.woz_gem ?? null
  const wozNl = cbs?.nl.woz_gem ?? null
  const dichtheid = cbs?.gemeente_niveau.dichtheid_per_km2 ?? null

  // Drempel geijkt op CBS 2024: 1,45× landelijk isoleert 8 van 342 gemeentes —
  // de welgestelde forensengemeentes (Laren, De Bilt, Gooise Meren, Oegstgeest,
  // Wijdemeren, Ouder-Amstel, Landsmeer, Bergen NH) die voorheen 'landelijk' heetten.
  let type: GemeenteType = 'landelijk'
  if (wozGemeente && wozNl && wozGemeente / wozNl >= 1.45) type = 'premium'
  else if (dichtheid !== null && dichtheid >= 1200) type = 'middelgroot'

  return { gemeente_type: type, herkomst: 'afgeleid', ...MARKT_PROFIELEN[type] }
}

// ─── Hoofd export ─────────────────────────────────────────────────────────────

export interface VerrijkingData {
  woz: WozData | null
  cbs: CbsData | null
  voorzieningen: VoorzieningenData | null
  markt: MarktData | null
  gemeente: string | null
}

export async function fetchVerrijking(adres: string, oppervlakM2?: number): Promise<VerrijkingData> {
  const pdok = await pdokLookup(adres)

  const coord = pdok?.centroide_ll ? parsePdokCoord(pdok.centroide_ll) : null
  const gemeente = pdok?.gemeentenaam ?? null
  const bagId = pdok?.adresseerbaarobject_id ?? null

  const [woz, voorzieningen, cbsRuw] = await Promise.all([
    bagId ? fetchWoz(bagId, oppervlakM2) : Promise.resolve(null),
    coord ? fetchVoorzieningen(coord.lat, coord.lon) : Promise.resolve(null),
    fetchCbs(pdok?.buurtcode ?? null, pdok?.wijkcode ?? null, pdok?.gemeentecode ?? null),
  ])

  // PDOK kent de buurt- en wijknaam; CBS levert die niet in bruikbare vorm.
  const cbs: CbsData | null = cbsRuw
    ? {
        ...cbsRuw,
        gemeente: cbsRuw.gemeente || gemeente || '',
        buurtnaam: pdok?.buurtnaam ?? null,
        wijknaam: pdok?.wijknaam ?? null,
      }
    : null

  const markt = gemeente ? marktProfielOpzoeken(gemeente, cbs) : null

  return { woz, cbs, voorzieningen, markt, gemeente }
}

// ─── Verrijking → leesbare string voor Claude-prompt ─────────────────────────

export function verrijkingNaarPrompt(v: VerrijkingData): string {
  const regels: string[] = []

  if (v.woz && v.woz.waarden.length > 0) {
    const meest_recent = v.woz.waarden[0]
    regels.push(`WOZ-waarde: €${meest_recent.waarde.toLocaleString('nl-NL')} (peildatum ${meest_recent.peildatum}, belastingjaar ${meest_recent.belastingjaar})`)
    if (v.woz.stijging_pct) regels.push(`WOZ-stijging: ${v.woz.stijging_pct}`)
    if (v.woz.per_m2) regels.push(`WOZ per m²: €${v.woz.per_m2.toLocaleString('nl-NL')}`)
  }

  if (v.cbs) {
    const c = v.cbs
    // Kleine gemeentes hebben een buurt met dezelfde naam ("Vaals, Vaals") — niet verdubbelen.
    const gebied = c.buurtnaam && c.buurtnaam !== c.gemeente
      ? `${c.buurtnaam}${c.gemeente ? `, ${c.gemeente}` : ''}`
      : c.buurtnaam ?? c.gemeente
    const wat = (m: CbsMetriek | null, toon: (w: number) => string) =>
      m ? `${toon(m.waarde)} (${CBS_NIVEAU_LABEL[m.niveau]})` : null

    const cijfers = [
      wat(c.woz_gem, w => `gemiddelde WOZ €${w.toLocaleString('nl-NL')}`),
      wat(c.inkomen, w => `gemiddeld inkomen €${w.toLocaleString('nl-NL')}/inwoner`),
      wat(c.pct_koop, w => `${w}% koopwoningen`),
      wat(c.pct_hoog_opgeleid, w => `${w}% hbo/wo-opgeleid`),
      wat(c.pct_eengezins, w => `${w}% eengezinswoningen`),
      wat(c.pct_65plus, w => `${w}% 65-plussers`),
      wat(c.pct_met_kinderen, w => `${w}% huishoudens met kinderen`),
      wat(c.huishoudensgrootte, w => `gemiddelde huishoudensgrootte ${w.toLocaleString('nl-NL')}`),
      wat(c.dichtheid_per_km2, w => `${w.toLocaleString('nl-NL')} inwoners/km²`),
    ].filter((x): x is string => x !== null)

    if (cijfers.length) {
      regels.push(`Buurtdata ${gebied} — ${c.bron}: ${cijfers.join(' · ')}`)
      regels.push(
        'Let op bij bovenstaande buurtdata: het niveau tussen haakjes geeft aan waar het cijfer vandaan komt. ' +
        'CBS onderdrukt cijfers voor kleine gebieden; een wijk- of gemeentecijfer mag je niet als buurtfeit presenteren. ' +
        'Noem zo\'n cijfer dan op het niveau dat erbij staat, of laat het weg.',
      )
    }

    const ref = [
      c.nl.woz_gem !== null ? `WOZ €${c.nl.woz_gem.toLocaleString('nl-NL')}` : null,
      c.nl.inkomen !== null ? `inkomen €${c.nl.inkomen.toLocaleString('nl-NL')}/inwoner` : null,
      c.nl.pct_koop !== null ? `${c.nl.pct_koop}% koop` : null,
      c.nl.pct_hoog_opgeleid !== null ? `${c.nl.pct_hoog_opgeleid}% hbo/wo` : null,
    ].filter((x): x is string => x !== null)
    if (ref.length) regels.push(`Landelijk gemiddelde ter vergelijking (${c.bron}): ${ref.join(' · ')}`)

    regels.push(`Buurtprofiel: ${c.buurtprofiel} (afgeleid uit bovenstaande CBS-cijfers t.o.v. het landelijk gemiddelde)`)
  }

  if (v.voorzieningen) {
    const vz = v.voorzieningen
    const items: string[] = []
    if (vz.supermarkt[0]) items.push(`supermarkt op ${vz.supermarkt[0].afstand_m}m (${vz.supermarkt[0].naam})`)
    if (vz.ov_haltes[0]) items.push(`OV-halte op ${vz.ov_haltes[0].afstand_m}m`)
    if (vz.treinstation[0]) items.push(`station ${vz.treinstation[0].naam} op ${vz.treinstation[0].afstand_m}m`)
    if (vz.scholen[0]) items.push(`school op ${vz.scholen[0].afstand_m}m`)
    if (vz.groen[0]) items.push(`park op ${vz.groen[0].afstand_m}m`)
    if (items.length > 0) regels.push(`Nabijheid (${vz.nabijheid_beoordeling}): ${items.join(' · ')}`)
  }

  if (v.markt) {
    const m = v.markt
    const marktBron = m.herkomst === 'afgeleid'
      ? 'regionale typering, afgeleid uit CBS-WOZ en bevolkingsdichtheid van deze gemeente'
      : 'regionale typering op basis van gemeentecategorie'
    regels.push(`Markttype: ${m.label} · Verkooptijd: ${m.verkooptijd_weken} · Overbiedingskans: ${m.overbiedingskans_pct} (gem. ${m.overbod_pct}) · Marktomstandigheid: ${m.marktomstandigheid} [${marktBron} — geen actuele meting voor dit specifieke object]`)
    regels.push(`Verkoopstrategie-advies: ${m.strategie}`)
    regels.push(`Seizoensadvies: ${m.seizoen_advies}`)
    regels.push(`WOZ-waardeontwikkeling gemeente 2019–2024: ${m.woz_trend_2019_2024} [indicatief — regionale schatting]`)
  }

  return regels.length > 0
    ? `\nExtra contextdata (gebruik ter verrijking van de teksten, met name marktanalyse en buurtomschrijving):\n${regels.map(r => `- ${r}`).join('\n')}`
    : ''
}
