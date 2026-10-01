# VestaAI — Kostenschatting

> **Stand 1 oktober 2026.** Gebaseerd op de code zoals die nu draait (Outputset
> v2, `lib/aiModellen.ts`, `lib/claude.ts`) en op actuele tarieven — bron en
> datum staan per regel. Vóór het prijsgesprek met i4 Housing — roadmap F8.

> Doel: inzicht in de variabele API-kosten per dossier en de infrastructuurkosten
> bij het huidige gebruik door i4housing, de enige klant.
> Gaat over kosten die VestaAI zelf maakt, niet over wat klanten betalen — zie
> `doelen.md` § Prijzen (daar bewust nog geen cijfers: toegang is admin-beheerd,
> i4housing betaalt nog niets vast).

---

## 1. Wat genereert één dossier nu?

Sinds item 8.3 (Outputset v2, `docs/architectuur.md` § 4) is de hoofdgeneratie
geen 17-velden-call meer, maar een kleine **kern** (altijd) plus **extra's** op
knopdruk:

- **Kern** (één Claude-call per taal, altijd NL **en** EN parallel sinds het
  besluit van 16 sep): `funda_tekst`, `brochure_tekst`, `instagram`,
  `linkedin_kantoor`, `sneak_preview`, `koper_email`, `buurtomschrijving`.
- **Extra's** (los, op aanvraag via "Meer…"): `open_huis`, `followup_positief`,
  `followup_negatief`, `video_script`, `kopersvragen_faq`, `energie_advies`.
  Blijven staan bij een nieuwe kerngeneratie.
- **Sjabloon-herkansing**: alleen als het kantoor een tekstsjabloon heeft
  (i4housing wel) én `funda_tekst` de kop-/structuureis niet volgt — een
  gerichte, kleine herschrijving van alléén dat veld.
- **Virtual staging**: los, per foto, op knopdruk.
- **Documentassistent**: los, per vraag over een geüpload document.
- **Prijswijziging / herschrijven**: losse, kleine calls, incidenteel.
- **Kwartaalbericht, USP-extractie, stijlprofiel destilleren**: geen
  dossierkosten — periodiek resp. bij intake/huisstijl-setup.

## 2. Modellen (uit `lib/aiModellen.ts`)

| Constante | Model-id | Gebruikt voor |
|---|---|---|
| `CONTENT` | `claude-sonnet-4-6` | Kern, extra's, prijswijziging, sjabloon-herkansing, kwartaalbericht |
| `CONTENT_KANDIDAAT` | `claude-sonnet-5` | Nog **niet productief** — alleen de blinde evaluatieset (item 8.1), wacht op Quinns oordeel |
| `EXTRACTIE` / `HERSCHRIJF` | `claude-haiku-4-5` | Letterlijke extractie (huisstijl-PDF, brochure-seed); `HERSCHRIJF` = per-veld herschrijven |
| `SAMENVATTING` | `claude-sonnet-4-6` | Documentassistent-chat, USP-extractie, stijlprofiel/geleerde-regels destilleren |
| `GEMINI_STAGING` | `gemini-2.5-flash-image` | Virtual staging |

**Prompt caching** (`lib/claude.ts`, item 8.1): de kern-call (en de
sjabloon-herkansing) cachen het huisstijlblok + taalspecifieke basisblok via
`cache_control`. **Niet** gecached: de documentassistent-chat (elke vraag stuurt
het document opnieuw volledig mee, geen `cache_control` op dat blok) en de
losse extra/prijswijziging/kwartaalbericht-calls (geen systeemprompt om te
cachen). Effect op de kern-call is bescheiden (zie § 3) — de aanbeveling uit de
vorige versie van dit document ("caching kan de documentassistent 70–90%
goedkoper maken") is dus nog steeds **niet geïmplementeerd**, geen gerealiseerd
voordeel.

## 3. Tarieven (bron + datum per regel)

| Dienst | Tarief | Bron / datum |
|---|---|---|
| Claude Sonnet 4.6 (`claude-sonnet-4-6`) | $3,00 / 1M input · $15,00 / 1M output | `claude-api`-skill, modeltabel (gecachet 24 jun 2026, geraadpleegd 1 okt 2026) |
| Claude Haiku 4.5 (`claude-haiku-4-5`) | $1,00 / 1M input · $5,00 / 1M output | idem |
| Claude Sonnet 5 (`claude-sonnet-5`, kandidaat, nog niet productief) | $2,00 / 1M input · $10,00 / 1M output | idem |
| Prompt cache write / read | ~1,25× / ~0,10× van het input-tarief | idem (Anthropic-standaard, ephemeral 5 min TTL) |
| Gemini 2.5 Flash Image (`gemini-2.5-flash-image`, betaalde laag, GA) | $30,00 / 1M output-tokens → **$0,039 per gegenereerde afbeelding** (1.290 tokens/afbeelding); input $0,30/1M tokens | Google AI-pricing, via websearch 1 okt 2026 (ai.google.dev/gemini-api/docs/pricing) |
| Vercel Pro | $20 / maand per seat (~€18) | Websearch 1 okt 2026 |
| Supabase Pro | $25 / maand per project, incl. $10 compute-credit (~€22) | Websearch 1 okt 2026 |
| Resend | Free tot 3.000 e-mails/mo; Pro $20/mo vanaf 50.000 e-mails (~€18) | Websearch 1 okt 2026 |
| Plausible Starter | $9 / maand tot 10.000 pageviews (~€8) | Websearch 1 okt 2026 — **welk plan nu actief is, niet geverifieerd: controleren** |
| Domein `vestaai.nl` (TransIP) | ~€16,50/jaar verlenging (~€1,40/mo) | Websearch 1 okt 2026 — richtprijs, TransIP's eigen factuur kan afwijken: **controleren bij volgende verlenging** |

Wisselkoers gebruikt: $1 ≈ €0,88 (1 okt 2026).

**Huidige plannen** (`docs/productoverzicht.md` § 13, roadmap § 2 punt 10):
Vercel **Hobby** en Supabase **gratis**. Dat `/api/generate` en
`/api/object/[id]/hergenereer` met `maxDuration = 300` werken, zegt niets over
het plan: met Fluid Compute is 300 s sinds 2025 op álle Vercel-plannen de
standaard, ook op Hobby. Pro is nodig omdat Hobby volgens Vercels fair-use-
regels niet-commercieel is (zodra i4 betaalt), en geeft een ruimere maximale
functieduur (tot 800 s) plus terugrollen naar elke eerdere deploy.

## 4. Kostensplit per feature (per taal, tenzij anders vermeld)

### Kern (altijd NL + EN, 7 velden)

Input bestaat uit het gedeelde huisstijlblok (**3.373 tokens**, gemeten via
`count_tokens` op een i4housing-achtig profiel, zie `lib/claude.ts`
commentaar) + het taalspecifieke basisblok (**1.569 tokens**, idem gemeten) +
het tekstsjabloonblok (i4 heeft er een: schatting ~300 tokens) + de
objectgegevens (~180 tokens) ≈ **5.400 tokens**. Output: `KERN_MAX_TOKENS =
6000`, werkelijk gebruikt (code-schatting) ~3.300 tokens content + overhead ≈
**3.500 tokens**.

| | Zonder cache-hit | Met cache-write (1,25×) | Met cache-read (0,10×, binnen 5 min TTL) |
|---|---|---|---|
| Kosten per taal | $0,069 ≈ **€0,06** | $0,072 ≈ €0,07 | $0,055 ≈ €0,05 |

Caching scheelt dus maar ~€0,01–0,02 per call (output domineert de kostprijs,
niet input) — en is bij i4's lage volume (dossiers meestal niet binnen 5
minuten na elkaar) in de praktijk onzeker. **Aanname voor de scenario's
hieronder: €0,06 per taal, €0,12 per dossier voor NL + EN samen**, zonder op
caching te rekenen.

### Extra's (op aanvraag, geen systeemprompt/caching)

| Type | `max_tokens` | Geschatte kosten |
|---|---|---|
| `open_huis` | 500 | €0,005 |
| `followup_positief` | 600 | €0,007 |
| `followup_negatief` | 500 | €0,005 |
| `video_script` | 500 | €0,005 |
| `kopersvragen_faq` | 1.600 | €0,017 |
| `energie_advies` | 1.300 | €0,012 |

Gemiddeld ≈ €0,008 per extra. **Aanname: gemiddeld 2 extra's per dossier** →
≈ €0,02/dossier.

### Overige losse calls

| Call | Model | Geschatte kosten | Frequentie (aanname) |
|---|---|---|---|
| Prijswijziging (VERKOCHT/PRIJSREDUCTIE) | CONTENT | €0,01 | ~50% van dossiers 1×: €0,005/dossier |
| Herschrijven van één veld | HERSCHRIJF (Haiku) | €0,005–0,01 | ~2×/dossier: €0,02/dossier |
| Sjabloon-herkansing (alleen bij afwijking) | CONTENT | €0,03 | incidenteel, niet in dossier-aanname |
| USP-extractie | SAMENVATTING | <€0,01 | 1×/dossier (intake), verwaarloosbaar |
| Kwartaalbericht | CONTENT | €0,01–0,02 | een paar keer per jaar per kantoor, **niet per dossier** |

### Virtual staging (Gemini, betaald sinds de GA-release)

€0,039 ≈ **€0,04 per foto** (plus een kleine invoerkost voor de kale
kamerfoto, verwaarloosbaar). **Aanname: bij gebruik 10 foto's per pand**
(ongewijzigd t.o.v. de vorige versie) → €0,37/pand als de feature wordt
gebruikt.

### Documentassistent (1 PDF + n vragen)

Model is `SAMENVATTING` (**Claude Sonnet 4.6**, niet Haiku — ongewijzigd
t.o.v. vorige versie, maar nu expliciet bevestigd in de code). Via de
Anthropic Files API: de PDF wordt eenmalig geüpload, maar **de inhoud wordt
per vraag opnieuw als tokens in rekening gebracht** (geen caching). Schatting:
~5.000 tokens PDF + systeemprompt/vraag ≈ 5.100 input, ~500 output per vraag
→ **≈ €0,02 per vraag**, 5 vragen ≈ **€0,10 per sessie**. **Aanname: 30% van
de dossiers gebruikt dit 1× (5 vragen)** → €0,03/dossier gemiddeld.

## 5. Totaal per dossier

| Onderdeel | Aanname | Kosten |
|---|---|---|
| Kern NL + EN | altijd | €0,12 |
| Extra's | gemiddeld 2 | €0,02 |
| Prijswijziging | 50% van dossiers | €0,005 |
| Herschrijven | gemiddeld 2× | €0,02 |
| Documentassistent | 30% van dossiers, 5 vragen | €0,03 |
| **Subtotaal zonder staging** | | **≈ €0,20/dossier** |
| Virtual staging (10 foto's) | *indien gebruikt* | +€0,37 |
| **Subtotaal met staging** | | **≈ €0,57/dossier** |

> **Vuistregel:** zonder staging ~€0,20/dossier; met staging (10 foto's)
> ~€0,57/dossier. Dit is lager dan de vorige schatting (€0,36/€0,73) — vooral
> omdat de kern-call sinds Outputset v2 maar 7 velden schrijft in plaats van
> 17, ook al staat er nu standaard een NL+EN-verdubbeling en een uitgebreider
> systeemprompt (huisstijl + sjabloon) tegenover.

## 6. Gebruik nu (alleen lezend, `gebruik_events` + `objecten`, 1 okt 2026)

- `gebruik_events` logt alleen `dossier_bekeken` (2.452 events, laatste 7 dagen)
  — **geen enkele content-/staging-/documentassistent-actie wordt hier
  gelogd**, dus deze tabel zegt niets over AI-kosten.
- `objecten`: alleen het **demo-kantoor** heeft dossiers (15, allemaal binnen
  2 seconden aangemaakt op 17 sep — duidelijk seed-/testdata, geen NL+EN, geen
  echt gebruik). **i4housing heeft nog 0 objecten** (consistent met
  `CLAUDE.md`).
- `object_documenten` en `stijl_bewerkingen`: beide 0 rijen.

Conclusie: er is op dit moment **geen gemeten echt gebruik** om op te
begroten — alles hieronder zijn aannames over toekomstig i4-gebruik, geen
metingen. Zodra i4 een paar weken echt draait, dit hoofdstuk vervangen door
werkelijke tellingen.

## 7. Vaste infrastructuurkosten

| Service | Plan | Kosten/mo | Noodzakelijk? |
|---|---|---|---|
| **Vercel** | Pro (nu Hobby) | $20 (~€18) | **JA, zodra i4 betaalt** — Hobby is volgens de fair-use-regels niet-commercieel. Bonus: functieduur tot 800 s (ruimte voor content NL + EN, zie D2) en terugrollen naar elke deploy. |
| **Supabase** | Pro vóór een betalende klant (nu gratis) | $25 (~€22) | Geen slaapstand na 7 dagen inactiviteit en dagelijkse back-ups (7 dagen bewaard); Point-in-Time Recovery is een aparte betaalde add-on. Er is één productiedatabase, dus dit is het vangnet naast de lokale back-up. |
| **Resend** | Free | €0 | Ruim voldoende (limiet 3.000 e-mails/mo) bij één kantoor. |
| **Plausible** | Starter (plan niet bevestigd) | $9 (~€8) | Optioneel. |
| **Domein** `vestaai.nl` | — | ~€1,40 | Verplicht, verwaarloosbaar. |

**Vaste infra na het eerste contract: ≈ €41/mo** (Vercel Pro €18 + Supabase
Pro €22 + domein €1,40), **≈ €50/mo met Plausible**. Nu (Hobby + gratis):
alleen het domein en eventueel Plausible.

## 8. Drie gebruiksscenario's voor i4 (aannames expliciet)

Alle scenario's: elk dossier krijgt altijd NL+EN-kern; staging-adoptie is de
belangrijkste variabele en wordt hier op 50% gehouden (10 foto's bij de helft
van de dossiers) om de scenario's onderling vergelijkbaar te houden — in
werkelijkheid onbekend, zie § 6.

| Scenario | Dossiers/mo | Staging (50%, 10 foto's) | Variabele kosten/mo | + Vaste infra | **Totaal/mo** |
|---|---|---|---|---|---|
| Klein | 5 | 2,5 panden gestaged | ≈ €1,90 | €41–50 | **≈ €43–52** |
| Middel | 15 | 7,5 panden gestaged | ≈ €5,80 | €41–50 | **≈ €47–56** |
| Groot | 30 | 15 panden gestaged | ≈ €11,60 | €41–50 | **≈ €53–62** |

Rekenwijze: gestaged dossier ≈ €0,57, niet-gestaged ≈ €0,20 (§ 5); bv. Klein
= 2,5 × €0,57 + 2,5 × €0,20 ≈ €1,90.

**Conclusie:** op dit volume is de variabele API-kost nog steeds
verwaarloosbaar ten opzichte van de vaste infra — dat was ook de conclusie van
de vorige versie en blijft onveranderd waar. De vaste kosten (Vercel/Supabase)
zijn de eigenlijke bodemprijs, niet de AI-calls.

## 9. Wat de kandidaat-modelwissel (D3, Sonnet 5) zou schelen

`CONTENT_KANDIDAAT = claude-sonnet-5` ($2/$10 per 1M) is ~33% goedkoper dan
`CONTENT = claude-sonnet-4-6` ($3/$15) op zowel input als output, en is **nog
niet productief** — alleen gebruikt in de blinde evaluatieset
(`scripts/evalueer-content.mjs`, item 8.1), in afwachting van Quinns oordeel
over de kwaliteit.

Als de wissel wordt gewonnen en doorgevoerd, scheelt dat ~33% op alles wat via
`CONTENT` loopt: kern, extra's, prijswijziging, sjabloon-herkansing en
kwartaalbericht — **niet** op de documentassistent/USP-extractie/herschrijven
(die lopen via `SAMENVATTING`/`HERSCHRIJF`, een apart besluit). Op het
"Groot"-scenario (30 dossiers/mo) is het niet-staging-deel ≈ 30 × €0,20 =
€6,00, waarvan hooguit een derde wegvalt: de variabele kosten gaan van
≈ €11,60 naar ≈ €9,60 per maand (staging loopt via Gemini en verandert niet).
Op dit volume een paar euro; de modelkeuze hoort op kwaliteit te vallen, niet
op prijs.

## 10. Kostprijs-ondergrens (geen prijsvoorstel)

Dit document gaat uitsluitend over kostprijs — een prijsvoorstel aan i4housing
is aan Quinn. Als ondergrens per maand (kostprijs, geen marge):

- **Klein (5 dossiers/mo): ≈ €43–52/mo**
- **Middel (15 dossiers/mo): ≈ €47–56/mo**
- **Groot (30 dossiers/mo): ≈ €53–62/mo**

De bandbreedte komt alleen van wel/niet Plausible; het verschil tussen de
scenario's komt van het dossiervolume, vooral van staging. Niet meegerekend:
Quinns eigen tijd (support, import, onderhoud) — die is de echte kostprijs.

## 11. Open actiepunten

1. **Vercel Pro en Supabase Pro afsluiten** vóór het eerste betaalde contract
   (roadmap § 2 punten 10 en 14) — nu Hobby en gratis.
2. **Plausible-plan bevestigen** — welk plan nu actief is, staat niet vast.
3. **Werkelijk i4-gebruik meten** zodra er een paar weken productiedata is
   (§ 6) — vervang de aannames in § 8 door tellingen.
4. Domeinprijs is een richtprijs (TransIP-aggregators lopen uiteen) —
   verwaarloosbaar bedrag, maar controleer bij de volgende jaarlijkse
   verlenging.
