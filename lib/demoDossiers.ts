/**
 * 15 demo-woningdossiers voor scripts/seed-demo-kantoor.mjs (item 2.3, zie
 * docs/roadmap.md § Fase 2). Los van Supabase — het script vult alleen
 * `kantoor_id`/`makelaar_id` in en schrijft. Bewust handgeschreven (niet
 * willekeurig gegenereerd zoals de transacties): een dossier moet als
 * individueel, geloofwaardig voorbeeld standhouden in de UI, niet alleen
 * statistisch plausibel zijn.
 *
 * Verdeling over de fases (roadmap-spec "15 dossiers verdeeld over de
 * fases"): 5 verkoopadvies, 5 in_verkoop (2 met content), 5 verkocht (2 met
 * content) — "enkele met content" i.p.v. alle, zodat de fixture ook de lege
 * content-staat laat zien. Adressen liggen in dezelfde buurten als de
 * transactiefixture (lib/waardering.synthetisch.ts DEMO_BUURTEN) — geen
 * losstaande, verzonnen locaties.
 */
import type { ContentOutput, ObjectFase, PropertyInput } from './schemas'

/** Lege content-staat: alle verplichte strings leeg — zelfde vorm als een vers
 * aangemaakt dossier vóór content-generatie (geen halve/verzonnen output). */
const LEGE_OUTPUTS: ContentOutput = {
  funda_tekst: '',
  brochure_kort: '',
  brochure_lang: '',
  instagram_emotioneel: '',
  instagram_informatief: '',
  instagram_actie: '',
  linkedin_kantoor: '',
  linkedin_makelaar: '',
  koper_email: '',
  buurtomschrijving: '',
  open_huis: '',
  bezichtiging_followup_positief: '',
  bezichtiging_followup_negatief: '',
  video_script: '',
  energie_advies: '',
  kopersvragen_faq: '',
  marktanalyse: '',
}

function bouwContent(adres: string, buurtomschrijving: string, usp: string): ContentOutput {
  return {
    ...LEGE_OUTPUTS,
    funda_tekst: `Op een fraaie locatie aan de ${adres} bieden wij deze sfeervolle woning te koop aan. ${usp} Een bezichtiging is de beste manier om de kwaliteit van deze woning te ervaren.`,
    brochure_kort: `${adres} — ${usp}`,
    brochure_lang: `Deze woning aan de ${adres} combineert ruimte, licht en een uitstekende ligging. ${usp} Neem contact op voor een bezichtiging.`,
    instagram_emotioneel: `Thuiskomen op je mooiste plek 🏡 ${adres} — ${usp}`,
    instagram_informatief: `Nieuw te koop: ${adres}. ${usp}`,
    instagram_actie: `Bezichtiging inplannen voor ${adres}? Stuur ons een bericht.`,
    linkedin_kantoor: `Trots om ${adres} te mogen aanbieden. ${usp}`,
    linkedin_makelaar: `Nieuwe woning onder mijn hoede: ${adres}. ${usp}`,
    koper_email: `Beste geïnteresseerde,\n\nBedankt voor je interesse in ${adres}. ${usp}\n\nMet vriendelijke groet,\nDemo Makelaardij`,
    buurtomschrijving,
  }
}

export type DemoDossierDefinitie = {
  address: string
  plaats: string
  lat: number
  lng: number
  fase: ObjectFase
  status: 'draft' | 'published' | 'onder_bod' | 'verkocht'
  input: PropertyInput
  metContent: boolean
  buurtomschrijving: string
}

export const DEMO_DOSSIERS: DemoDossierDefinitie[] = [
  // ── Verkoopadvies (5) — nog geen content, alleen waardering/advies ──────
  {
    address: 'Kerkehoutlaan 12, Wassenaar', plaats: 'Wassenaar', lat: 52.1465, lng: 4.4041,
    fase: 'verkoopadvies', status: 'draft',
    input: { adres: 'Kerkehoutlaan 12, Wassenaar', woningtype_groep: 'vrijstaand', woningtype_sub: 'Villa', kamers: 7, oppervlak_m2: 285, bouwjaar: 1998, energielabel: 'B', prijsverwachting_verkoper: 2450000, usps: 'Vrijstaande villa op ruim perceel · dubbele garage · zonnig aangelegde tuin op het zuidwesten', doelgroep: 'Gezinnen met kinderen', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Deijlerweg 45, Wassenaar', plaats: 'Wassenaar', lat: 52.1358, lng: 4.3847,
    fase: 'verkoopadvies', status: 'draft',
    input: { adres: 'Deijlerweg 45, Wassenaar', woningtype_groep: 'vrijstaand', woningtype_sub: 'Vrijstaande woning', kamers: 6, oppervlak_m2: 210, bouwjaar: 1975, energielabel: 'C', prijsverwachting_verkoper: 1595000, usps: 'Karakteristieke jaren-70-woning · veel privacy · nabij Landgoed Backershagen', doelgroep: 'Doorstromers', taal: 'nl', ligging_buitenruimte: { ligging: 'twee_onder_een_kap' } },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Van Alkemadelaan 88, Den Haag', plaats: "'s-Gravenhage", lat: 52.0992, lng: 4.3238,
    fase: 'verkoopadvies', status: 'draft',
    input: { adres: 'Van Alkemadelaan 88, Den Haag', woningtype_groep: 'appartement', kamers: 3, oppervlak_m2: 110, bouwjaar: 1962, energielabel: 'D', prijsverwachting_verkoper: 545000, usps: 'Ruim hoekappartement · uitzicht over het Haagse Bos · eigen berging', doelgroep: 'Young professionals', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Leidseweg 21, Voorschoten', plaats: 'Voorschoten', lat: 52.1249, lng: 4.4472,
    fase: 'verkoopadvies', status: 'draft',
    input: { adres: 'Leidseweg 21, Voorschoten', woningtype_groep: 'rijwoning', woningtype_sub: 'Tussenwoning', kamers: 5, oppervlak_m2: 135, bouwjaar: 1955, energielabel: 'D', prijsverwachting_verkoper: 685000, usps: 'Dorpse ligging · verbouwde keuken · fietsafstand van station Voorschoten', doelgroep: 'Gezinnen met kinderen', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Damlaan 7, Leidschendam', plaats: 'Leidschendam', lat: 52.0841, lng: 4.4009,
    fase: 'verkoopadvies', status: 'draft',
    input: { adres: 'Damlaan 7, Leidschendam', woningtype_groep: 'appartement', kamers: 3, oppervlak_m2: 92, bouwjaar: 2005, energielabel: 'A', prijsverwachting_verkoper: 425000, usps: 'Modern appartement aan de Vliet · balkon op het zuiden · eigen parkeerplaats', doelgroep: 'Starters', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
  // ── In verkoop (5, waarvan 2 met content) ───────────────────────────────
  {
    address: "Storm van 's-Gravesandeweg 3, Wassenaar", plaats: 'Wassenaar', lat: 52.1533, lng: 4.3716,
    fase: 'in_verkoop', status: 'published',
    input: { adres: "Storm van 's-Gravesandeweg 3, Wassenaar", woningtype_groep: 'vrijstaand', woningtype_sub: 'Villa', kamers: 8, oppervlak_m2: 340, bouwjaar: 2010, energielabel: 'A+', vraagprijs: 3200000, prijsverwachting_verkoper: 3200000, usps: 'Moderne villa in de duinzone · thuisbioscoop · verwarmd buitenzwembad', doelgroep: 'Vermogende gezinnen', taal: 'nl' },
    metContent: true, buurtomschrijving: 'Wassenaar-Duinzoom ligt tegen de duinen en het Landgoed Meijendel aan — rust, ruimte en toch op tien minuten van Den Haag en Leiden.',
  },
  {
    address: 'Nassaulaan 56, Den Haag', plaats: "'s-Gravenhage", lat: 52.0978, lng: 4.2874,
    fase: 'in_verkoop', status: 'onder_bod',
    input: { adres: 'Nassaulaan 56, Den Haag', woningtype_groep: 'appartement', kamers: 4, oppervlak_m2: 145, bouwjaar: 1920, energielabel: 'C', vraagprijs: 795000, prijsverwachting_verkoper: 795000, usps: 'Statig herenhuisappartement · originele details · loopafstand van het strand', doelgroep: 'Doorstromers', taal: 'nl' },
    metContent: true, buurtomschrijving: 'Het Statenkwartier is een van de meest gewilde buurten van Den Haag: brede lanen, statige architectuur en het strand van Scheveningen op fietsafstand.',
  },
  {
    address: 'Haagweg 102, Rijswijk', plaats: 'Rijswijk', lat: 52.0389, lng: 4.3382,
    fase: 'in_verkoop', status: 'published',
    input: { adres: 'Haagweg 102, Rijswijk', woningtype_groep: 'rijwoning', woningtype_sub: 'Hoekwoning', kamers: 5, oppervlak_m2: 128, bouwjaar: 1988, energielabel: 'B', vraagprijs: 549000, prijsverwachting_verkoper: 549000, usps: 'Hoekwoning met ruime tuin · dichtbij station Rijswijk · goed onderhouden', doelgroep: 'Gezinnen met kinderen', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Langstraat 9, Wassenaar', plaats: 'Wassenaar', lat: 52.1414, lng: 4.4024,
    fase: 'in_verkoop', status: 'published',
    input: { adres: 'Langstraat 9, Wassenaar', woningtype_groep: 'rijwoning', woningtype_sub: 'Tussenwoning', kamers: 4, oppervlak_m2: 118, bouwjaar: 1932, energielabel: 'D', vraagprijs: 725000, prijsverwachting_verkoper: 725000, usps: 'Karakteristieke woning in het centrum · op loopafstand van winkels en station', doelgroep: 'Doorstromers', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Rembrandtlaan 14, Voorschoten', plaats: 'Voorschoten', lat: 52.1251, lng: 4.4479,
    fase: 'in_verkoop', status: 'onder_bod',
    input: { adres: 'Rembrandtlaan 14, Voorschoten', woningtype_groep: 'vrijstaand', woningtype_sub: 'Vrijstaande woning', kamers: 6, oppervlak_m2: 175, bouwjaar: 1968, energielabel: 'C', vraagprijs: 1095000, prijsverwachting_verkoper: 1095000, usps: 'Twee-onder-een-kapwoning · grote achtertuin op het zuiden · garage', doelgroep: 'Gezinnen met kinderen', taal: 'nl', ligging_buitenruimte: { ligging: 'twee_onder_een_kap' } },
    metContent: false, buurtomschrijving: '',
  },
  // ── Verkocht (5, waarvan 2 met content) ─────────────────────────────────
  {
    address: 'Bankastraat 33, Den Haag', plaats: "'s-Gravenhage", lat: 52.0871, lng: 4.3013,
    fase: 'verkocht', status: 'verkocht',
    input: { adres: 'Bankastraat 33, Den Haag', woningtype_groep: 'appartement', kamers: 3, oppervlak_m2: 98, bouwjaar: 1925, energielabel: 'C', vraagprijs: 465000, prijsverwachting_verkoper: 465000, usps: 'Lichte bovenwoning in de Archipelbuurt · dakterras · nabij Vredespaleis', doelgroep: 'Young professionals', taal: 'nl' },
    metContent: true, buurtomschrijving: 'De Archipelbuurt dankt haar naam aan de straten die vernoemd zijn naar eilanden in de Indonesische archipel — een levendige, internationale buurt vlak bij het centrum.',
  },
  {
    address: 'Rust en Vreugdlaan 5, Wassenaar', plaats: 'Wassenaar', lat: 52.1459, lng: 4.4049,
    fase: 'verkocht', status: 'verkocht',
    input: { adres: 'Rust en Vreugdlaan 5, Wassenaar', woningtype_groep: 'vrijstaand', woningtype_sub: 'Villa', kamers: 7, oppervlak_m2: 260, bouwjaar: 2001, energielabel: 'A', vraagprijs: 2150000, prijsverwachting_verkoper: 2150000, usps: 'Vrijstaande villa in Kerkehout · privétuin met poolhouse · dubbele oprit', doelgroep: 'Vermogende gezinnen', taal: 'nl' },
    metContent: true, buurtomschrijving: 'Kerkehout is een van de meest gewilde villawijken van Wassenaar: ruime kavels, veel groen en op enkele minuten van het dorpscentrum.',
  },
  {
    address: 'Vlietweg 18, Leidschendam', plaats: 'Leidschendam', lat: 52.0963, lng: 4.3983,
    fase: 'verkocht', status: 'verkocht',
    input: { adres: 'Vlietweg 18, Leidschendam', woningtype_groep: 'vrijstaand', woningtype_sub: 'Vrijstaande woning', kamers: 5, oppervlak_m2: 155, bouwjaar: 1980, energielabel: 'C', vraagprijs: 875000, prijsverwachting_verkoper: 875000, usps: 'Twee-onder-een-kapwoning aan de Vliet · eigen aanlegsteiger', doelgroep: 'Doorstromers', taal: 'nl', ligging_buitenruimte: { ligging: 'twee_onder_een_kap' } },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Beresteinlaan 210, Den Haag', plaats: "'s-Gravenhage", lat: 52.0894, lng: 4.3483,
    fase: 'verkocht', status: 'verkocht',
    input: { adres: 'Beresteinlaan 210, Den Haag', woningtype_groep: 'appartement', kamers: 3, oppervlak_m2: 78, bouwjaar: 1972, energielabel: 'D', vraagprijs: 335000, prijsverwachting_verkoper: 335000, usps: 'Instapklaar appartement · nabij winkelcentrum Leyweg · goede OV-verbinding', doelgroep: 'Starters', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
  {
    address: 'Generaal Spoorlaan 44, Rijswijk', plaats: 'Rijswijk', lat: 52.0395, lng: 4.3374,
    fase: 'verkocht', status: 'verkocht',
    input: { adres: 'Generaal Spoorlaan 44, Rijswijk', woningtype_groep: 'rijwoning', woningtype_sub: 'Hoekwoning', kamers: 4, oppervlak_m2: 112, bouwjaar: 1965, energielabel: 'D', vraagprijs: 495000, prijsverwachting_verkoper: 495000, usps: 'Hoekwoning met berging · rustige straat · vlakbij Te Werve-park', doelgroep: 'Starters', taal: 'nl' },
    metContent: false, buurtomschrijving: '',
  },
]

/** Bouwt `outputs_json` voor een dossierdefinitie — placeholdertekst voor de
 * "met content"-dossiers, anders de lege-content-vorm (zie LEGE_OUTPUTS). */
export function bouwDossierOutputs(dossier: DemoDossierDefinitie): ContentOutput {
  if (!dossier.metContent) return LEGE_OUTPUTS
  return bouwContent(dossier.address, dossier.buurtomschrijving, dossier.input.usps ?? '')
}
