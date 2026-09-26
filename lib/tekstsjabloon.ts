import type { TekstsjabloonConfig } from './schemas'

export type { TekstsjabloonConfig }

type Taal = 'nl' | 'en'

/**
 * Kop-labels + sectie-instructies in de gevraagde taal. De EN-configuratie
 * overschrijft alleen de kop-labels (`engels.opening_label`/`engels.koppen`,
 * parallel aan `secties`); de instructietekst per sectie blijft hetzelfde —
 * die stuurt de inhoud, niet de schrijftaal (dat regelt de rest van de
 * systeemprompt al, zie BASE_SYSTEM_PROMPT_NL/_EN in lib/claude.ts).
 * `engels` ontbreekt of heeft een afwijkend aantal koppen (zou de
 * schema-refine al moeten afvangen, maar dit is de runtime-vangrail) → val
 * terug op de Nederlandse koppen.
 */
function koppenVoorTaal(sjabloon: TekstsjabloonConfig, taal: Taal): { kop: string; instructie: string }[] {
  if (taal === 'en' && sjabloon.engels && sjabloon.engels.koppen.length === sjabloon.secties.length) {
    return sjabloon.secties.map((sectie, i) => ({ kop: sjabloon.engels!.koppen[i], instructie: sectie.instructie }))
  }
  return sjabloon.secties.map((sectie) => ({ kop: sectie.kop, instructie: sectie.instructie }))
}

function openingLabelVoorTaal(sjabloon: TekstsjabloonConfig, taal: Taal): string {
  return taal === 'en' && sjabloon.engels ? sjabloon.engels.opening_label : sjabloon.opening_label
}

/**
 * Rendert het tekstsjabloon als verplichte, harde structuur voor funda_tekst
 * (item 8.2, roadmap § 3.4). Pure functie, geen Claude-aanroep — wordt in
 * lib/claude.ts als los, cachebaar systeemprompt-blok toegevoegd ná de
 * taalspecifieke basisregels (BASE_SYSTEM_PROMPT_NL/_EN), zodat deze
 * override — die de generieke lengte-/alinea-eisen van funda_tekst
 * vervangt — het laatst gelezen (en dus het zwaarst wegende) instructieblok
 * is. Zonder sjabloon blijft het bestaande generieke format ongewijzigd
 * (deze functie wordt dan simpelweg niet aangeroepen).
 */
export function renderTekstsjabloonPrompt(sjabloon: TekstsjabloonConfig, taal: Taal): string {
  const openingLabel = openingLabelVoorTaal(sjabloon, taal)
  const koppen = koppenVoorTaal(sjabloon, taal)
  const koppenRegel = koppen.map((k) => k.kop).join(', ')
  const sectieRegels = koppen.map((k, i) => `${i + 1}. ${k.kop} — ${k.instructie}`).join('\n')

  if (taal === 'en') {
    return `FUNDA_TEKST — MANDATORY OFFICE TEMPLATE (replaces the length and paragraph rules for funda_tekst above; the other rules there — no price mention, no discrimination, no excessive punctuation — still apply):
- Open with "${openingLabel}" on its own line, followed by a short, summarising introduction sentence.
- Then use EXACTLY these headings, each on its own line, in EXACTLY this order: ${koppenRegel}.
${sectieRegels}
- Close with this sentence, LITERALLY and unchanged: "${sjabloon.slotzin}"
- Target length: approximately ${sjabloon.doel_woorden} words (reasonable margin — the 700-word minimum above no longer applies).`
  }

  return `FUNDA-TEKST — VERPLICHT KANTOORSJABLOON (vervangt de lengte- en alinea-eisen voor funda_tekst hierboven; de overige regels daar — geen prijsvermelding, geen discriminatie, geen overdreven leestekens — blijven gelden):
- Open met "${openingLabel}" op een eigen regel, gevolgd door een korte, samenvattende introductiezin.
- Gebruik daarna EXACT deze tussenkopjes, elk op een eigen regel, in EXACT deze volgorde: ${koppenRegel}.
${sectieRegels}
- Sluit af met deze zin, LETTERLIJK en ongewijzigd: "${sjabloon.slotzin}"
- Richtlengte: ongeveer ${sjabloon.doel_woorden} woorden (redelijke marge — de 700-woorden-ondergrens hierboven geldt hier niet meer).`
}

export type SjabloonControle = { ok: boolean; fouten: string[] }

/**
 * Valideert een gegenereerde funda_tekst tegen het sjabloon: opening-label
 * aanwezig, alle koppen aanwezig in de juiste volgorde (elke volgende kop
 * moet ná de vorige gevonden worden), en de slotzin letterlijk aanwezig.
 * Pure functie — het "één herkansing, dan accepteren met waarschuwing"-
 * patroon zit in `generateContent` (lib/claude.ts), dezelfde aanpak als
 * `controleerGuardrail` in lib/kwartaalbericht.ts.
 */
export function valideerTekstsjabloon(tekst: string, sjabloon: TekstsjabloonConfig, taal: Taal): SjabloonControle {
  const fouten: string[] = []
  const openingLabel = openingLabelVoorTaal(sjabloon, taal)
  const koppen = koppenVoorTaal(sjabloon, taal).map((k) => k.kop)

  if (!tekst.includes(openingLabel)) {
    fouten.push(taal === 'en' ? `Opening label "${openingLabel}" is missing` : `Openingslabel "${openingLabel}" ontbreekt`)
  }

  let zoekVanaf = 0
  for (const kop of koppen) {
    const idx = tekst.indexOf(kop, zoekVanaf)
    if (idx === -1) {
      fouten.push(
        taal === 'en'
          ? `Heading "${kop}" is missing or out of order`
          : `Kopje "${kop}" ontbreekt of staat niet in de juiste volgorde`,
      )
    } else {
      zoekVanaf = idx + kop.length
    }
  }

  if (!tekst.includes(sjabloon.slotzin)) {
    fouten.push(
      taal === 'en'
        ? 'The mandatory closing sentence is missing or was not copied literally'
        : 'De verplichte slotzin ontbreekt of is niet letterlijk overgenomen',
    )
  }

  return { ok: fouten.length === 0, fouten }
}

/**
 * Correctie-instructie voor de ene toegestane herkansing (zelfde patroon als
 * de guardrail-correctie in `schrijfKwartaalbericht`, lib/claude.ts).
 */
export function bouwSjabloonCorrectie(fouten: string[], taal: Taal): string {
  const lijst = fouten.map((f) => `- ${f}`).join('\n')
  return taal === 'en'
    ? `\n\nIMPORTANT: your previous funda_tekst did not correctly follow the mandatory template:\n${lijst}\nRewrite funda_tekst so it follows the template exactly (headings, order and closing sentence).`
    : `\n\nBelangrijk: je vorige funda_tekst volgde het verplichte sjabloon niet correct:\n${lijst}\nSchrijf funda_tekst opnieuw en volg het sjabloon exact (koppen, volgorde en slotzin).`
}
