# VestaAI — Roadmap: wat er nog moet gebeuren

> **Alleen open werk.** Wat er al staat: `docs/productoverzicht.md`. Hoe het
> gebouwd is (bindend): `docs/architectuur.md`. Hoe we werken (DoD, agents,
> vangrails): `docs/werkwijze.md`. Besluiten en opleveringen:
> `docs/besluiten.md`.
>
> **Is een item af**, haal het dan hier weg (niet afvinken en laten staan),
> beschrijf het in het productoverzicht en zet een regel in het
> besluitenlogboek. Nieuwe ideeën → § 5 Backlog, nooit het lopende item in.
>
> **Voor Sonnet:** neem het item dat onder 📍 als "volgende" staat. Schrijf eerst
> een mini-plan van ≤ 10 regels (bestanden, volgorde, tests), bouw, rond af met
> `/sessie-afronden`. Kies zelf bij twijfel over een productkeuze, noteer het in
> `docs/besluiten.md`; blokkeer alleen bij iets onomkeerbaars.
>
> Itemnummers (5.1, 12.1, …) komen uit het masterplan v2 (16-17 sep). Code-
> commentaar noemt soms een afgerond item of "roadmap § Fase N": de
> geschiedenis daarvan staat in `docs/besluiten.md`.

---

## 📍 Stand van zaken

*Bijgewerkt 1 okt 2026. Laatst gedaan: de betaalde testronde op 1 okt —
blinde modelvergelijking (CONTENT blijft Sonnet 4.6), de echte duur van NL + EN
op Vercel gemeten (± 102 s), EN-content voor het scène 5-dossier, het
EN-kwartaalbericht getest, en daaruit drie promptfixes (hele intake mee, geen
gedwongen verzinsels, aanspreekvorm). Eerder die dag 12.1 en rondes R en S.*

- **Wat er staat:** het hele platform behalve het verkoopadviesdocument en de
  echte data van i4 Housing — zie `docs/productoverzicht.md`.
- **Doel:** de demo bij i4 Housing, begin tot half december 2026, op hun eigen
  data (§ 1).
- **Kritiek pad:** exports van Quinn → 5.1 exportanalyse → 5.5 import →
  M1 tussencheck taxateur → demovoorbereiding (12.5, 12.7) → demo.
- **Volgende ronde:** D4 (EN-getalnotatie kwartaalbericht) en D5 (opgeslagen
  buurtdata bij het genereren) — allebei bouwbaar zonder input, nul overlap.
- **Wacht op Quinn:** § 2 — vooral de exports (blokkeert alles op het kritieke
  pad), het voorbeeld-verkoopadvies en Gemini-billing (staging werkt pas dan).
- ⚠️ **Demo-realiteit:** i4 Housing heeft 0 transacties én 0 dossiers
  (demo-kantoor: ~8.000 transacties, 15 dossiers). Marktinzichten, kerncijfers
  en waardering tonen bij i4 de lege staat; de repetitie draait op
  `/login/demo`. Terugvalplan als de exports uitblijven: demo op het
  demo-kantoor in i4-huisstijl (beslissing Quinn, pas nodig als half december
  in gevaar komt).
- **Contentgeneratie gemeten (1 okt):** NL + EN op Vercel ± 102 s (NL ± 82 s,
  EN ± 63 s, plus ± 18 s Overpass-time-outs vooraf) — ruim binnen 300 s. Gemeten
  op het demo-kantoor zonder sjabloon; i4 mét sjabloon kan ± 10-20 s langer
  duren (herkansing). Opnieuw meten: `scripts/meet-contentgeneratie.mjs`.

---

## 1. Het doel: de demo

Eén demo bij i4 Housing (laptop op groot scherm), in hun eigen omgeving, op hun
eigen data, ± 25 minuten, in zes scènes — klik-voor-klik uitgewerkt met een
terugvalplan per scène in `docs/i4housing/demoscript.md`:

1. "Dit is óns platform" — kantoorlogin, startpagina, kerncijfers uit hun data.
2. "Eindelijk snappen we onze data" — marktanalyse + kwartaalbericht.
3. "Wie wint waar" — concurrentieanalyse (vereist verkopend kantoor in Brainbay).
4. "Hiermee zetten we het verkoopadvies op papier" — dossier, waardering, pdf.
5. "Dit scheelt ons uren" — content NL + EN, brochure, stijl leren.
6. "Onze verkopen op de kaart" — verkoopkaart (afsluiter).

**Demo-minimum** (hier gaat niets onder): scènes 1, 2, 4 en 5 volledig; scène 3
zodra Brainbay het verkopend kantoor blijkt te bevatten; scène 6 mag zonder
afspeelknop. Zonder voorbeeld-verkoopadvies eindigt scène 4 bij de
waardebepaling-pdf.

**Mijlpalen:** M1 tussencheck (één waardebepaling-pdf van een recente eigen
verkoop naar hun taxateur: "klopt dit ongeveer?") → generale repetitie op
`/login/i4housing` → demo-freeze (48 uur geen deploys) → demo.

**Schrappen bij uitloop** (eerst bovenaan): 5.6 fixture herijken · D1
staging · scène 3 (als het verkopend kantoor ontbreekt) · verkoopadvies
(als het voorbeeld uitblijft).

---

## 2. Wacht op Quinn

### Blokkeert de demo

1. **Brainbay- en Realworks-exports** aanleveren (liefst XLSX/CSV, alle jaren,
   met verkopend én aankopend kantoor, een makelaarsveld en coördinaten als dat
   kan). Deblokkeert 5.1 → 5.5 → M1.
2. **Brainbay-licentie schriftelijk** laten bevestigen: tonen van regionale
   NVM-data in VestaAI aan i4 Housing zelf — vóór 5.5.
3. **Voorbeeld-verkoopadvies** — deblokkeert C1 (de datalaag staat klaar).

### Klein, kan elk moment

4. **Supabase-dashboard, twee klikken:** self-signup uit (Auth → Providers →
   Email → "Allow new users to sign up") en leaked-password-protection aan
   (Auth → Attack Protection). De security-advisor meldt het nog.
5. **Gemini-billing aanzetten** (Google AI Studio → API-sleutel → billing,
   ± 5 min). Zonder billing werkt virtual staging niet: het project zit op de
   gratis laag, met quotum 0 voor beeldmodellen (gemeten 1 okt). Lost meteen het
   privacypunt op (op de gratis laag mag Google ingestuurde foto's gebruiken).
   Daarna draait Claude D1.
6. **Zes ongebruikte geheimen op Vercel verwijderen** (`STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/_PRO/_KANTOOR`,
   `CRON_SECRET`): Vercel → project vesta-ai → Settings → Environment
   Variables → per regel ⋯ → Remove. Of eenmalig `npx vercel login`, dan doet
   Claude het. Daarna de Stripe-sleutel in het Stripe-dashboard intrekken.
7. **Oordelen:** pastelkleuren van de kaart (`/marktanalyse/kaart`) en i4-blauw
   op knoppen `#007BC0` in plaats van `#0080C8` (voor AA-contrast, met het oog
   niet te zien).
8. **Nieuwe juridische teksten lezen** (voorwaarden v1.1 en privacyverklaring,
    30 sep).

### Vóór de demo of vóór het eerste betaalde contract

9. **Vercel Pro** — het Hobby-plan is volgens Vercels fair-use-regels voor
    niet-commercieel gebruik; zodra i4 Housing betaalt is Pro nodig. Geeft ook
    terugrollen naar elke eerdere deploy. Voor de functieduur is het niet nodig
    (content NL + EN ± 102 s, gemeten 1 okt). Liefst al vóór de demo.
10. **Tussencheck taxateur (M1):** `docs/waardering/methode.md` (rekenvoorbeeld
    en vijf vragen in § 6) naar de taxateur van i4 Housing, met het prototype
    https://claude.ai/artifact/H1hunisisuRxJLPNHsaXWm; contactpersoon noemen.
11. **Google Search Console** en de omleiding van de Vercel-alias.
12. **Vóór het eerste betaalde contract:** Supabase Pro (herstelpunten, geen
    slaapstand), definitieve verwerkersovereenkomst (⚠️ de import is formeel al
    verwerking — hoort er vóór 5.5 te liggen), prijsafspraak (kostprijs ≈ €44–65/mnd bij 5–30 dossiers: `docs/strategie/kostenschatting.md`), en een
    jurist die voorwaarden + privacyverklaring toetst.
13. **Bedrijfsgegevens** — KvK-inschrijving, vestigingsadres, btw-id en een
    zakelijk mailadres (bv. `info@vestaai.nl`). Deblokkeert E1. Uiterlijk vóór het
    eerste betaalde contract.
14. *Later:* **beeldrechten** van i4 (sfeerbeelden, teamfoto, logo) in het
    contract of de verwerkersovereenkomst laten opnemen.

---

## 3. Open werk per spoor

### A. Echte data — kritiek pad (masterplan fase 5)

- [ ] **5.1 Exportanalyse** *(start zodra de exports er zijn)* →
  `docs/i4housing/exportanalyse.md`: per bestand (Brainbay, Realworks) kolommen
  en voorbeeldwaarden, datumdefinities (aanmelding/transactie/overdracht),
  verkopend én aankopend kantoor, makelaarsveld, coördinaten (RD, lat/lng of
  alleen postcode), aantal rijen, periode, plaatsen, woningtype-waarden,
  encoding en scheidingsteken. Beantwoordt: bevat Brainbay i4's eigen verkopen
  ook (→ ontdubbelen)? Hoe heet i4 in de kantoorkolom (→ aliassen)?
  *Daarna:* `lib/importProfielen.ts` definitief (de aliassen per bron zijn nu
  voorlopig) en `kantoor_aliassen` van i4 zetten in `/admin/kantoor/[id]`.
- [ ] **5.5 Import uitvoeren** *(na back-up, getekende verwerkersovereenkomst en
  licentiebevestiging)*: dry-run → rapport bespreken met Quinn → `--write` →
  geocoderen → backtest opnieuw (`docs/waardering/backtest.md`) → **M1
  tussencheck**. Antwoord van de taxateur in `docs/besluiten.md`.
  *Klaar als:* ≥ 95 % `exact` gegeocodeerd, herimport levert 0 dubbelen,
  terugdraaien werkt, alle verkenners tonen echte en plausibele cijfers,
  backtest op echte data gedocumenteerd, tussencheck gedaan.
- [ ] **5.7 Filter "Verkocht door" op de verkoopkaart** *(als de export een
  makelaarsveld heeft)*: migratie `20260924190000_transacties_makelaar_id.sql`
  toepassen (klaar, niet toegepast) en het filter aanzetten.
- [ ] **5.6 Fixture herijken** *(optioneel)*: verdelingen van de demo-fixture in
  lijn brengen met de echte data, zodat hij een eerlijke terugval blijft.

### B. Demo-klaar (masterplan fase 12)

- [ ] **12.5 Demovoorbereiding, rest:**
  - **Demo-dossiers in het i4-kantoor** — i4 heeft er nu 0; de drie gekozen
    demo-dossiers staan in het demo-kantoor. Na 5.5 drie echte, recente
    adressen van i4 aanmaken (één per fase), zodat de waardering op hun eigen
    data rekent.
  - Het dossier van scène 5 (demo-kantoor) heeft sinds 1 okt NL + EN-content
    uit een volledige intake. Nog te doen: vlak vóór de demo één keer opnieuw
    genereren (€0,12; dan zitten de je-vorm en het balkonlabel van 1 okt erin
    — de huidige tekst zegt "u" en "het balkon of dakterras"), dáárna 4+
    handmatige bewerkingen (voor "Leren van je bewerkingen"), en foto's
    uploaden (brochure + staging, na § 2 punt 5). Hetzelfde in het i4-kantoor
    na 5.5.
  - `docs/i4housing/demoscript.md` en `npm run demo:repetitie` overzetten naar
    `/login/i4housing` zodra 5.5 live is.
  - Vercel Pro actief · Supabase-check de dag ervoor (slaapstand) · demo-freeze
    (branch `demo`, 48 uur geen deploys) · generale repetitie met screenshots.
  *Klaar als:* generale repetitie op i4-data zonder haperingen, alle checks
  groen.

### C. Verkoopadvies (masterplan fase 11) — geblokkeerd op het voorbeeld

- [ ] **C1 Verkoopadviesdocument** *(2-3 sessies, zodra Quinns voorbeeld er
  is)*: de datalaag staat (`lib/verkoopadvies.ts` +
  `lib/verkoopadviesLaden.ts`: `VerkoopadviesInput = { dossier, waardering,
  kantoor, marktcontext, makelaar }` en een gereedheidscheck). Te bouwen: losse,
  herschikbare secties in `@react-pdf/renderer` in kantoorstijl, een
  `VerkoopadviesPaneel` in de verkoopadviesfase, een render-test.
  *Klaar als:* binnen 1 minuut klaar en structureel gelijk aan het voorbeeld.

### D. Content — resterende checks (masterplan fase 8)

- [ ] **D1 Staging** *(betaald, ± €0,07; na § 2 punt 5)*: één foto door
  `gemini-3.1-flash-image` op productie (stockfoto klaar: Unsplash, Lisa Anna,
  lege woonkamer); label "Virtueel ingericht" zichtbaar, kwaliteit beoordeeld,
  origineel + resultaat in het scène 5-dossier.
- [ ] **D4 EN-kwartaalbericht in Engelse notatie** *(bouwbaar)*: de guardrail
  dwingt nu ook in het Engels de NL-notatie af ("2.064 homes", "€ 949.500") en
  "procentpunt" blijft onvertaald. Voor Engelse lezers (expats, 4RENT) leest
  dat als een fout. `controleerGuardrail` beide notaties laten accepteren,
  Engelse notatie en "percentage point" laten schrijven, test die beide rendert.
- [ ] **D5 Opgeslagen buurtdata bij het genereren** *(bouwbaar)*:
  `genereerContentVoorObject` haalt de buurtdata live op (Overpass liep op 1 okt
  twee keer in een time-out, ± 18 s per generatie, en dan ontbreken de
  voorzieningen in de tekst), terwijl het dossier ze al opgeslagen heeft
  (`verrijking_json`). Eerst de opgeslagen versie gebruiken; alleen live ophalen
  als die er niet is.
- *Klaar als (fase):* i4-tekst volgt het sjabloon 1-op-1 in NL en EN; brochure
  niet te onderscheiden van hun eigen werk; scène 5 loopt zonder wachttijd-
  verrassing.

### E. Juridisch (masterplan fase 14)

- [ ] **E1 (14.2) Bedrijfsgegevens + zakelijk e-mailadres** *(geblokkeerd: § 2
  punt 13)*: wettelijk verplichte gegevens (art. 3:15d BW, art. 20
  Handelsregisterwet: naam, KvK-nummer, vestigingsadres, btw-id, e-mail) in één
  constante `lib/bedrijf.ts`, gelezen door de footer van de publieke pagina's,
  `/contact`, privacy en voorwaarden (art. 7 krijgt een plaats). Het gmail-adres
  vervangen door het zakelijke adres. *Klaar als:* grep op het gmail-adres in
  `app/` en `components/` geeft niets meer, behalve `lib/admin.ts`.

### F. Fundament en onderhoud — nieuw uit de opschoning van 30 sep

Bouwbaar zonder input, tenzij anders vermeld. (F1, F2, F5, F6, F7 en F8 zijn op
1 okt gedaan — zie besluiten.)

- [ ] **F3 Bewaarbeleid back-ups** — `backups/` bevat 14 sets productiedata
  (± 107 MB) op de laptop, plus drie bestanden met de startwachtwoorden van het
  i4-team in platte tekst. Voorstel: de laatste 5 bewaren plus de set vlak vóór
  elke migratie of import; de wachtwoordbestanden weg zodra het team zijn
  wachtwoord heeft gewijzigd (12.1 is op 1 okt gedaan). Uitdunnen = verwijderen →
  akkoord Quinn per keer.
- [ ] **F4 Foutmonitoring** *(vóór i4 dagelijks gaat werken, uiterlijk na de
  demo)* — `meldFout()` logt nu alleen naar de console, dus fouten staan alleen
  kort in de Vercel-logs en niemand krijgt een seintje. Sentry (gratis laag) of
  een vergelijkbare dienst op `meldFout` aansluiten; account = actie Quinn.
- [ ] **F9 Lint-omzeilingen herstructureren** *(bij aanraking)* — in
  `StatTile`, `WaardePresentatie`, `BuurtDataTab` en `KwartaalberichtModal`
  staat een setState in `requestAnimationFrame`/`queueMicrotask`. Werkt, maar
  is omzeilen. `WaardebepalingPaneel` is op 1 okt herschreven naar "state
  aanpassen tijdens render" — dat is het patroon voor de rest.
- [ ] **F10 Codemappen herindelen** *(optioneel, laagste prioriteit)* — `lib/`
  heeft ± 80 modules plat naast elkaar, `components/` ± 45. Groeperen per domein
  (waardering, import, kaart, content, marktinzichten, …) maakt het beter te
  overzien, maar raakt honderden imports en alle padverwijzingen in de docs.
  Alleen met een codemod en volledige verificatie (typecheck, lint, tests,
  build, dod:screens, elk script één keer droog), op een moment zonder openstaande
  branches. Bewust niet gedaan op 30 sep: risico groter dan winst zolang er
  gebouwd wordt.

---

## 4. Risico's

| Risico | Mitigatie |
|---|---|
| Exports komen laat of zijn rommeliger dan gedacht | Fixture houdt het werk gaande; 5.1 vóór er één regel importcode wordt aangepast; kwaliteitsregels + rapport; terugvalplan demo-kantoor |
| Brainbay-licentie staat tonen in een platform van derden niet toe | Schriftelijke bevestiging vóór 5.5; tot die tijd alleen fixture-data |
| Taxateurs vertrouwen de waardering niet | Transparante referentietabel, WOZ-ijkpunt, backtest, M1-tussencheck |
| Content NL + EN duurt langer dan de functielimiet | Gemeten 1 okt: ± 102 s van 300 s; opnieuw meten na elke prompt- of modelwissel (`scripts/meet-contentgeneratie.mjs`) |
| Buurtbron faalt tijdens de demo (Overpass overbelast) | Verversen overschrijft nooit meer goede data (12.9, 1 okt); de UI meldt dan "gegevens van <datum>" — in de demo toch niet op "Ververs" klikken |
| Dataverlies op productie (geen Supabase Pro) | Volledige back-up (alle tabellen + Storage + manifest) vóór elke risicovolle stap; herstelprocedure in werkwijze § 5; Supabase Pro vóór het eerste contract |
| Supabase gratis pauzeert na 7 dagen inactiviteit | Dagelijks gebruik; check de dag vóór de demo |
| Fouten bij de klant blijven onopgemerkt | F4 foutmonitoring; feedbackknop |
| Nieuw AI-model verandert de toon | Blinde evaluatie vóór elke wissel (`docs/evaluatie/`, 3 modellen tegelijk) |
| AI verzint feiten in klantteksten | Hele intake in de prompt en "feiten alleen hieruit" (1 okt); bij twijfel de tekst naast de intake leggen |
| Datalek tussen kantoren | RLS + `security_invoker`; `e2e/rls.spec.ts` test beide richtingen |
| Uitloop | Schrapvolgorde (§ 1); nieuwe ideeën naar de backlog |

---

## 5. Backlog en geparkeerd

**Na de demo:** Sonnet 5 opnieuw vergelijken mét structured outputs
(`output_config.format`) — zonder de JSON-herkansing goedkoper en sneller dan
Sonnet 4.6 (`docs/evaluatie/rondes/2026-10-01/oordeel.md`) · de vier routes
buiten `lib/claude.ts` die `content[0]` lezen naar het eerste tekstblok (nodig
bij een model dat denkt) · streaming van content naar de UI (nu voortgang + skeletons) ·
A/B-segmentvergelijking uitbreiden · maatwerkverzoeken-flow (tabel `verzoeken`,
statusflow, Resend-melding) · gebruiksoverzicht in `/admin` · dossiers
aanmaken uit een Realworks-objectexport (hun huidige aanbod in één keer "In
verkoop") · 4RENT!-variant van het tekstsjabloon · Supabase-mailonderwerpen
vernederlandsen · jaarlijks de nieuwste CBS-jaargang (eerst controleren of
inkomen gevuld is, zie `docs/databronnen/cbs-buurtdata.md`) · na Supabase Pro:
een aparte ontwikkeldatabase (nu wijst `.env.local` naar productie).

**Performance mobiel:** marktanalyse (80) en dossier (76) blijven onder 85 —
besluit Quinn 30 sep: voor nu goed, geen derde ronde.

**Techniek, bewust zo:** rate-limit van de kantoor-reset is in-memory per
instance (zachte rem) · preview-deploys hebben niet alle env-vars (bewust zolang
we direct naar `main` mergen) · `object_fotos`/`stijl_bewerkingen` zonder policy
(alleen via de service-client) · PostGIS/`pg_trgm` in `public` en
`spatial_ref_sys` zonder RLS (Supabase-standaard).

**Periodiek (geen bouwwerk):** herimport Brainbay/Realworks + geocodering
(Quinn) · onderhoud volgens `docs/werkwijze.md` § 8.

**Geparkeerd (16 sep):** waardecheck-widget op hun site · ROI-dashboard ·
prijsadvies bij lange looptijd.

Wat bewust níet gebouwd wordt: `docs/productoverzicht.md` § 14.
