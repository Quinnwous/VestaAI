# Blinde evaluatie: CONTENT vs. CONTENT_KANDIDAAT

Item 8.1 (`docs/roadmap.md` § 3.6/8): een modelwissel voor het CONTENT-model
(`lib/aiModellen.ts`) gebeurt pas nadat Quinn een blinde vergelijking heeft
gewonnen — niet op basis van een claim uit een release-aankondiging.

## Wat hier staat

- `dossiers/` — 5 vaste testwoningen (Wassenaar/Leiden/Den Haag/Voorschoten,
  qua profiel vergelijkbaar met i4housing's eigen aanbod), geldige
  `PropertyInputSchema`-invoer. Gevalideerd in `dossiers.test.ts`
  (`npm run test`).
- `rondes/<datum>/<dossier>/{A,B}.json` — per evaluatieronde, per dossier, de
  twee anonieme generaties. **Dit is de map die je doorbladert om te
  beoordelen.**
- `sleutels/<datum>.json` — welk label (A/B) bij welk model hoort, **apart**
  van `rondes/` zodat je hem niet per ongeluk ziet tijdens het beoordelen.

## Hoe een ronde draaien

```bash
# Dry-run (standaard) — toont het plan, geen API-calls, geen kosten
npx tsx --env-file=.env.local scripts/evalueer-content.mjs

# Echt genereren — 5 dossiers x 2 modellen = 10 volledige contentsuite-
# generaties, elk ~2-4 min, kost echt API-geld
npx tsx --env-file=.env.local scripts/evalueer-content.mjs --write
```

Genereert bewust **zonder** kantoorhuisstijl — dit isoleert de vergelijking
tot "welk model volgt de instructies beter en schrijft beter Nederlands",
los van een specifiek stijlprofiel. Wil je i4housing's eigen huisstijl
meewegen, is dat een bewuste vervolgronde (het script raakt hiervoor bewust
geen productiedatabase aan).

**Over prompt caching (item 8.1) — zie ook `lib/aiModellen.ts`/`lib/claude.ts`:**
het systeemprompt van `generateContent` is opgesplitst in een gedeeld
huisstijlblok (NL+EN identiek) en een taalspecifiek basisblok, elk met een
eigen `cache_control`-breekpunt. Een live `count_tokens`-meting (gratis
endpoint) bevestigde dat een realistisch i4housing-achtig huisstijlblok
3373 tokens haalt en het taalspecifieke blok alléén 1569 tokens — beide ruim
boven de ondergrens van 1024 tokens voor `claude-sonnet-4-6`. Deze
evaluatieronde draait zónder huisstijl, dus alleen het taalspecifieke blok
is hier cachebaar (nog steeds nuttig tussen de 10 generaties van één ronde).

## Hoe beoordelen (Quinn)

1. Open per dossier `rondes/<datum>/<dossier>/A.json` en `B.json` naast
   elkaar — bijvoorbeeld `funda_tekst` eerst, dat is het zwaarste veld (min.
   700 woorden, de meeste regels uit `lib/claude.ts`).
2. Beoordeel op wat er in `lib/claude.ts` als eis staat: opening niet met het
   adres/"Deze woning", minimaal 6 alinea's met eigen focus, concrete
   onderbouwing bij superlatieven, natuurlijk Nederlands (geen anglicismen of
   rare woordvolgorde), geen overdreven leestekens.
3. Noteer per dossier een voorkeur (A, B, of "geen duidelijk verschil") —
   bijvoorbeeld in een aantekening naast deze map, hoeft niet hier
   vastgelegd.
4. Herhaal voor de andere kernvelden als de `funda_tekst`-voorkeur niet
   overtuigend is (`brochure_lang`, `koper_email`, `buurtomschrijving`).
5. **Pas ná je oordeel** open je `sleutels/<datum>.json` om te zien welk
   label welk model was.
6. Kandidaat wint overtuigend (meerderheid van de 5 dossiers, geen ernstige
   nieuwe fouten in de kandidaat-teksten) → modelwissel: `CONTENT` in
   `lib/aiModellen.ts` naar de waarde van `CONTENT_KANDIDAAT`, en het besluit
   (met welke ronde/datum) vastleggen in `docs/besluiten.md`.

## Waarom dry-run de standaard is

Elke generatie is een echte, betaalde Claude API-call (volledige
contentsuite, `max_tokens: 16000`). Dit script draait daarom nooit
automatisch met `--write` — dat is een bewuste, expliciete actie van de
hoofdsessie/Quinn, niet iets wat een subagent of CI stilzwijgend aftrapt.
