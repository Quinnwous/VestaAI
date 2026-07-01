/**
 * Data-verrijking voor woninggeneratie.
 * Haalt WOZ, CBS-buurtdata en Overpass-voorzieningen op voor een adres.
 * Elke databron faalt stilzwijgend — de generatie gaat altijd door.
 */

const FETCH_TIMEOUT = 8000

async function fetchMet<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
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

// ─── CBS referentietabel (gemeente-niveau fallback) ───────────────────────────

const CBS_GEMEENTES: Record<string, { inkomen: number; pct_koop: number; woz_gem: number; pct_hoog_opgeleid: number; dichtheid: string }> = {
  wassenaar: { inkomen: 62800, pct_koop: 74, woz_gem: 624000, pct_hoog_opgeleid: 68, dichtheid: 'laag' },
  bloemendaal: { inkomen: 68500, pct_koop: 78, woz_gem: 712000, pct_hoog_opgeleid: 72, dichtheid: 'laag' },
  blaricum: { inkomen: 71200, pct_koop: 80, woz_gem: 748000, pct_hoog_opgeleid: 74, dichtheid: 'laag' },
  heemstede: { inkomen: 52400, pct_koop: 71, woz_gem: 542000, pct_hoog_opgeleid: 65, dichtheid: 'gemiddeld' },
  amsterdam: { inkomen: 37200, pct_koop: 28, woz_gem: 389000, pct_hoog_opgeleid: 55, dichtheid: 'hoog' },
  utrecht: { inkomen: 38100, pct_koop: 42, woz_gem: 358000, pct_hoog_opgeleid: 58, dichtheid: 'hoog' },
  'den haag': { inkomen: 33400, pct_koop: 46, woz_gem: 298000, pct_hoog_opgeleid: 44, dichtheid: 'hoog' },
  rotterdam: { inkomen: 30200, pct_koop: 40, woz_gem: 264000, pct_hoog_opgeleid: 38, dichtheid: 'hoog' },
  haarlem: { inkomen: 38800, pct_koop: 46, woz_gem: 368000, pct_hoog_opgeleid: 52, dichtheid: 'hoog' },
  leiden: { inkomen: 35600, pct_koop: 44, woz_gem: 338000, pct_hoog_opgeleid: 55, dichtheid: 'hoog' },
  delft: { inkomen: 32800, pct_koop: 43, woz_gem: 312000, pct_hoog_opgeleid: 56, dichtheid: 'hoog' },
  amstelveen: { inkomen: 42600, pct_koop: 55, woz_gem: 412000, pct_hoog_opgeleid: 62, dichtheid: 'gemiddeld' },
  eindhoven: { inkomen: 33600, pct_koop: 51, woz_gem: 298000, pct_hoog_opgeleid: 46, dichtheid: 'gemiddeld' },
  breda: { inkomen: 32400, pct_koop: 56, woz_gem: 286000, pct_hoog_opgeleid: 42, dichtheid: 'gemiddeld' },
  tilburg: { inkomen: 30800, pct_koop: 52, woz_gem: 268000, pct_hoog_opgeleid: 39, dichtheid: 'gemiddeld' },
  groningen: { inkomen: 29800, pct_koop: 38, woz_gem: 248000, pct_hoog_opgeleid: 52, dichtheid: 'hoog' },
  nijmegen: { inkomen: 30400, pct_koop: 46, woz_gem: 268000, pct_hoog_opgeleid: 50, dichtheid: 'hoog' },
  arnhem: { inkomen: 29600, pct_koop: 50, woz_gem: 254000, pct_hoog_opgeleid: 42, dichtheid: 'gemiddeld' },
  zwolle: { inkomen: 33200, pct_koop: 58, woz_gem: 292000, pct_hoog_opgeleid: 44, dichtheid: 'gemiddeld' },
}

const CBS_NATIONAAL = { inkomen: 30800, pct_koop: 57, woz_gem: 317000, pct_hoog_opgeleid: 41 }

export interface CbsData {
  gemeente: string
  data_niveau: 'gemeente' | 'nationaal'
  inkomen: number
  pct_koop: number
  woz_gem: number
  pct_hoog_opgeleid: number
  dichtheid: string
  buurtprofiel: 'Premium' | 'Bovengemiddeld' | 'Gemiddeld' | 'Ondergemiddeld'
}

function cbsOpzoeken(gemeentenaam: string): CbsData {
  const key = gemeentenaam.toLowerCase().trim()
  const data = CBS_GEMEENTES[key]

  if (data) {
    const score =
      (data.inkomen > CBS_NATIONAAL.inkomen * 1.3 ? 2 : data.inkomen > CBS_NATIONAAL.inkomen * 1.1 ? 1 : 0) +
      (data.woz_gem > CBS_NATIONAAL.woz_gem * 1.3 ? 2 : data.woz_gem > CBS_NATIONAAL.woz_gem * 1.1 ? 1 : 0) +
      (data.pct_hoog_opgeleid > CBS_NATIONAAL.pct_hoog_opgeleid * 1.3 ? 2 : data.pct_hoog_opgeleid > CBS_NATIONAAL.pct_hoog_opgeleid * 1.1 ? 1 : 0)

    const buurtprofiel: CbsData['buurtprofiel'] =
      score >= 5 ? 'Premium' : score >= 3 ? 'Bovengemiddeld' : score >= 1 ? 'Gemiddeld' : 'Ondergemiddeld'

    return { gemeente: gemeentenaam, data_niveau: 'gemeente', ...data, buurtprofiel }
  }

  return {
    gemeente: gemeentenaam,
    data_niveau: 'nationaal',
    ...CBS_NATIONAAL,
    dichtheid: 'gemiddeld',
    buurtprofiel: 'Gemiddeld',
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
}

function marktProfielOpzoeken(gemeentenaam: string): MarktData {
  const key = gemeentenaam.toLowerCase().trim()
  const type: GemeenteType = GEMEENTE_TYPE_MAP[key] ?? 'landelijk'
  return { gemeente_type: type, ...MARKT_PROFIELEN[type] }
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

  const [woz, voorzieningen] = await Promise.all([
    bagId ? fetchWoz(bagId, oppervlakM2) : Promise.resolve(null),
    coord ? fetchVoorzieningen(coord.lat, coord.lon) : Promise.resolve(null),
  ])

  const cbs = gemeente ? cbsOpzoeken(gemeente) : null
  const markt = gemeente ? marktProfielOpzoeken(gemeente) : null

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
    regels.push(`Gemeente ${v.cbs.gemeente}: gemiddeld inkomen €${v.cbs.inkomen.toLocaleString('nl-NL')}/inwoner · ${v.cbs.pct_koop}% koopwoningen · buurtprofiel: ${v.cbs.buurtprofiel}`)
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
    regels.push(`Markttype: ${m.label} · Verkooptijd: ${m.verkooptijd_weken} · Overbiedingskans: ${m.overbiedingskans_pct} (gem. ${m.overbod_pct}) · Marktomstandigheid: ${m.marktomstandigheid}`)
    regels.push(`Verkoopstrategie-advies: ${m.strategie}`)
    regels.push(`Seizoensadvies: ${m.seizoen_advies}`)
    regels.push(`WOZ-waardeontwikkeling gemeente 2019–2024: ${m.woz_trend_2019_2024} [indicatief — CBS]`)
  }

  return regels.length > 0
    ? `\nExtra contextdata (gebruik ter verrijking van de teksten, met name marktanalyse en buurtomschrijving):\n${regels.map(r => `- ${r}`).join('\n')}`
    : ''
}
