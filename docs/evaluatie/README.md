# Blinde evaluatie van het contentmodel

Item 8.1 (`docs/architectuur.md` § 6): een modelwissel voor het CONTENT-model
(`lib/aiModellen.ts`) gebeurt pas nadat Quinn een blinde vergelijking heeft
gewonnen — niet op basis van een claim uit een release-aankondiging.

Sinds 1 okt 2026 vergelijkt een ronde alle modellen uit `EVALUATIE_MODELLEN`
tegelijk: het huidige `CONTENT`, `CONTENT_KANDIDAAT` (nieuwste Sonnet) en
`CONTENT_KANDIDAAT_HAIKU` (sneller en goedkoper, besluit Quinn).

## Wat hier staat

- `dossiers/` — 5 vaste testwoningen (Wassenaar/Leiden/Den Haag/Voorschoten,
  qua profiel vergelijkbaar met i4housing's eigen aanbod), geldige
  `PropertyInputSchema`-invoer. Gevalideerd in `dossiers.test.ts`
  (`npm run test`).
- `rondes/<datum>/<dossier>/{A,B,C}.json` — per ronde, per dossier, de
  anonieme generaties. **Dit is de map die je doorbladert om te beoordelen.**
- `sleutels/<datum>.json` — welk label bij welk model hoort, plus per
  generatie de duur, `stop_reason` en het tokengebruik van elke aanroep (kern
  en eventuele sjabloon-herkansing). **Apart** van `rondes/`, want ook de duur
  verraadt het model.

## Hoe een ronde draaien

```bash
# Dry-run (standaard) — toont het plan, geen API-calls, geen kosten
npx tsx --env-file=.env.local scripts/evalueer-content.mjs

# Echt genereren — 5 dossiers x 3 modellen = 15 kern-generaties, per dossier
# de modellen parallel (± 15 min), kost echt API-geld
npx tsx --env-file=.env.local scripts/evalueer-content.mjs --write
```

Genereert standaard **met de huisstijl van i4 Housing** (alleen lezend uit
`kantoren.huisstijl_json`): het 4SALE!-sjabloon en de voorbeeldteksten zijn
precies wat het model in productie moet volgen, en de sjabloon-herkansing
draait dan mee — op hetzelfde model als de kern-call, zodat een kandidaat zijn
tekst nooit door het huidige model laat herschrijven. `--kantoor <slug>` kiest
een ander kantoor, `--zonder-huisstijl` geeft de kale vergelijking (alleen
"welk model schrijft beter Nederlands"). Een bestaande ronde van dezelfde dag
wordt niet overschreven zonder `--overschrijf`; een mislukte generatie staat
in de sleutel en wordt niet herhaald.

**Over prompt caching** — zie ook `lib/aiModellen.ts`/`lib/claude.ts`: het
systeemprompt van `generateContent` is opgesplitst in een gedeeld huisstijlblok
(NL+EN identiek) en een taalspecifiek basisblok, elk met een eigen
`cache_control`-breekpunt. Een live `count_tokens`-meting bevestigde dat een
realistisch i4housing-achtig huisstijlblok 3373 tokens haalt en het
taalspecifieke blok alléén 1569 tokens — beide boven de ondergrens van 1024
tokens voor Sonnet; voor Haiku ligt die ondergrens hoger (zie de
`claude-api`-skill), dus daar is caching minder zeker.

## Hoe beoordelen (Quinn)

1. Lees per dossier de varianten naast elkaar — `funda_tekst` eerst, dat is het
   zwaarste veld (min. 700 woorden, de meeste regels uit `lib/claude.ts`).
   Handiger dan de JSON-bestanden: een beoordelingspagina die de teksten naast
   elkaar zet en de sleutel pas na het stemmen toont.
2. Beoordeel op wat er in `lib/claude.ts` als eis staat: opening niet met het
   adres/"Deze woning", het 4SALE!-sjabloon gevolgd, concrete onderbouwing bij
   superlatieven, natuurlijk Nederlands (geen anglicismen of rare
   woordvolgorde), geen overdreven leestekens.
3. Noteer per dossier een voorkeur (of "geen duidelijk verschil").
4. Twijfel je bij `funda_tekst`, kijk dan naar `brochure_tekst`, `koper_email`
   en `buurtomschrijving`.
5. **Pas ná je oordeel** de sleutel bekijken.
6. Wint een kandidaat overtuigend (meerderheid van de dossiers, geen ernstige
   nieuwe fouten) → modelwissel: `CONTENT` in `lib/aiModellen.ts` naar die
   waarde, besluit (met ronde/datum) in `docs/besluiten.md`, kostenschatting
   bijwerken, en de duur opnieuw meten (`scripts/meet-contentgeneratie.mjs`).

## Waarom dry-run de standaard is

Elke generatie is een echte, betaalde Claude API-call (volledige
kern-contentsuite). Dit script draait daarom nooit automatisch met `--write`
— dat is een bewuste, expliciete actie van de hoofdsessie/Quinn, niet iets wat
een subagent of CI stilzwijgend aftrapt.
