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

*Bijgewerkt 30 sep 2026 (opschoning: roadmap gesplitst, docs heringedeeld,
dode code weg).*

- **Wat er staat:** het hele platform behalve het verkoopadviesdocument en de
  echte data van i4 Housing — zie `docs/productoverzicht.md`.
- **Doel:** de demo bij i4 Housing, begin tot half december 2026, op hun eigen
  data (§ 1).
- **Kritiek pad:** exports van Quinn → 5.1 exportanalyse → 5.5 import →
  M1 tussencheck taxateur → demovoorbereiding (12.1, 12.5, 12.7) → demo.
- **Volgende ronde, bouwbaar zonder input** (nul bestandsoverlap): 12.7 buurtdata
  demo-dossiers · 12.8 referentietabel · F1 CI op GitHub · F2 herstelplan compleet ·
  F5 dev-kwetsbaarheden · F6 docx-test.
- **Wacht op Quinn:** § 2 — vooral de exports (blokkeert alles op het kritieke
  pad), het voorbeeld-verkoopadvies en akkoord op de betaalde testruns.
- ⚠️ **Demo-realiteit:** i4 Housing heeft 0 transacties én 0 dossiers
  (demo-kantoor: ~8.000 transacties, 15 dossiers). Marktinzichten, kerncijfers
  en waardering tonen bij i4 de lege staat; de repetitie draait op
  `/login/demo`. Terugvalplan als de exports uitblijven: demo op het
  demo-kantoor in i4-huisstijl (beslissing Quinn, pas nodig als half december
  in gevaar komt).
- ⚠️ **Contentgeneratie:** de echte duur van NL + EN tegen de functielimiet van
  300 s is nog niet gemeten (D2).

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
staging-testrun · scène 3 (als het verkopend kantoor ontbreekt) · verkoopadvies
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
5. **Team-accounts i4** (12.1): akkoord om de zes accounts aan te maken
   (`docs/i4housing/i4housing-team.md`), wachtwoorden en de teamfoto.
6. **Akkoord betaalde testruns** (samen een paar euro): smoke-generatie NL + EN
   (meet meteen de echte duur), staging-testrun, EN-kwartaalbericht, en
   EN-content voor het demo-dossier van scène 5.
7. **Zes ongebruikte geheimen op Vercel verwijderen** (`STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/_PRO/_KANTOOR`,
   `CRON_SECRET`): Vercel → project vesta-ai → Settings → Environment
   Variables → per regel ⋯ → Remove. Of eenmalig `npx vercel login`, dan doet
   Claude het. Daarna de Stripe-sleutel in het Stripe-dashboard intrekken.
8. **Oordelen:** pastelkleuren van de kaart (`/marktanalyse/kaart`) en i4-blauw
   op knoppen `#007BC0` in plaats van `#0080C8` (voor AA-contrast, met het oog
   niet te zien).
9. **Akkoord opruimmigratie 2** (F7): tabel `nps_responses` (leeg) en kolom
   `makelaars.first_generated_at` (nooit gevuld) weghalen.
10. **Akkoord GitHub opruimen:** de 41 gemergde branches op GitHub weghalen en
    voortaan na elke merge automatisch laten verwijderen
    (`gh pr merge --delete-branch`). Alles zit al in `main`; er gaat niets
    verloren.
11. **Nieuwe juridische teksten lezen** (voorwaarden v1.1 en privacyverklaring,
    30 sep).

### Vóór de demo of vóór het eerste betaalde contract

12. **Vercel Pro** — het Hobby-plan is volgens Vercels fair-use-regels voor
    niet-commercieel gebruik; zodra i4 Housing betaalt is Pro nodig. Het geeft
    ook ruimere functieduur (content NL + EN) en terugrollen naar elke eerdere
    deploy. Liefst al vóór de demo.
13. **Tussencheck taxateur (M1):** `docs/waardering/methode.md` (rekenvoorbeeld
    en vijf vragen in § 6) naar de taxateur van i4 Housing, met het prototype
    https://claude.ai/artifact/H1hunisisuRxJLPNHsaXWm; contactpersoon noemen.
14. **Blind oordeel content** (± 30 min, betaalde calls): huidige model tegen de
    kandidaat `claude-sonnet-5` — pas daarna een modelwissel.
15. **Google Search Console** en de omleiding van de Vercel-alias.
16. **Vóór het eerste betaalde contract:** Supabase Pro (herstelpunten, geen
    slaapstand), definitieve verwerkersovereenkomst (⚠️ de import is formeel al
    verwerking — hoort er vóór 5.5 te liggen), prijsafspraak (eerst F8), en een
    jurist die voorwaarden + privacyverklaring toetst.
17. **Bedrijfsgegevens** — KvK-inschrijving, vestigingsadres, btw-id en een
    zakelijk mailadres (bv. `info@vestaai.nl`). Deblokkeert E1. Uiterlijk vóór het
    eerste betaalde contract.
18. **Gemini betaalde laag bevestigen** (Google AI Studio → API-sleutel →
    billing aan): op de gratis laag mag Google ingestuurde foto's gebruiken, en
    dan klopt de privacyverklaring niet. Geen blokkade.
19. *Later:* **beeldrechten** van i4 (sfeerbeelden, teamfoto, logo) in het
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

- [ ] **12.1 Team-accounts i4** *(na akkoord Quinn, § 2 punt 5)*: de zes
  makelaars uit `docs/i4housing/i4housing-team.md` aanmaken **zonder
  welkomstmail** met `scripts/maak-team-accounts.mjs` (dry-run eerst; gebruikt
  de startwachtwoorden uit `backups/`), begroeting met voornaam, teamfoto als
  banner via het bestaande `achtergrond_url`-veld (Quinn keurt de foto goed).
- [ ] **12.5 Demovoorbereiding, rest:**
  - **Demo-dossiers in het i4-kantoor** — i4 heeft er nu 0; de drie gekozen
    demo-dossiers staan in het demo-kantoor. Na 5.5 drie echte, recente
    adressen van i4 aanmaken (één per fase), zodat de waardering op hun eigen
    data rekent.
  - Het dossier van scène 5 met EN-content (betaald, § 2 punt 6) en foto's — in
    beide kantoren (het demo-kantoor is het terugvalplan). Nu heeft geen enkel
    demo-dossier EN-content of foto's.
  - `docs/i4housing/demoscript.md` en `npm run demo:repetitie` overzetten naar
    `/login/i4housing` zodra 5.5 live is.
  - Vercel Pro actief · Supabase-check de dag ervoor (slaapstand) · demo-freeze
    (branch `demo`, 48 uur geen deploys) · generale repetitie met screenshots.
  *Klaar als:* generale repetitie op i4-data zonder haperingen, alle checks
  groen.
- [ ] **12.7 Buurt & data gevuld in de demo-dossiers** *(gevonden 30 sep)* —
  voorzieningen (Overpass) staan op `mislukt` bij álle vier gecontroleerde
  dossiers, ook de drie demo-dossiers; CBS staat op `leeg` bij Storm van
  's-Gravesandeweg 3 (het In verkoop-dossier van scène 5) en Damlaan 7. In de
  demo toont het tabblad dan foutmeldingen. Eerst "Ververs" proberen; blijft
  het mislukken, dan uitzoeken. Hypotheses: Overpass is overbelast (bekend) →
  een tweede endpoint of korte cache; de PDOK-opzoeking faalt bij een
  straatnaam met een apostrof ("'s-Gravesandeweg") → geen buurtcode → CBS leeg.
  *Klaar als:* de demo-dossiers tonen buurtcijfers en voorzieningen, en een
  mislukte bron blijft eerlijk "mislukt" melden.
- [ ] **12.8 Referentietabel op laptopbreedte** *(gevonden 30 sep)* — op
  1280 px breken de kolommen Prijs en €/m² in de referentietabel van de
  waardering af over twee regels ("€ / 430.000"). Kolombreedtes of
  `white-space: nowrap` op bedragen; controleren op 1280 en 1920 px.

### C. Verkoopadvies (masterplan fase 11) — geblokkeerd op het voorbeeld

- [ ] **C1 Verkoopadviesdocument** *(2-3 sessies, zodra Quinns voorbeeld er
  is)*: de datalaag staat (`lib/verkoopadvies.ts` +
  `lib/verkoopadviesLaden.ts`: `VerkoopadviesInput = { dossier, waardering,
  kantoor, marktcontext, makelaar }` en een gereedheidscheck). Te bouwen: losse,
  herschikbare secties in `@react-pdf/renderer` in kantoorstijl, een
  `VerkoopadviesPaneel` in de verkoopadviesfase, een render-test.
  *Klaar als:* binnen 1 minuut klaar en structureel gelijk aan het voorbeeld.

### D. Content — resterende checks (masterplan fase 8)

- [ ] **D1 Staging-testrun** *(betaald, schrapbaar)*: één echte foto door
  `gemini-2.5-flash-image`; label "Virtueel ingericht" zichtbaar, kwaliteit
  beoordeeld.
- [ ] **D2 Echte duur NL + EN meten** *(betaald)*: `E2E_GENERATE=1` op
  `e2e/content.spec.ts`. Komt hij boven ± 240 s, dan NL en EN in twee aparte
  functie-aanroepen splitsen (of Vercel Pro met langere duur). Plus één keer het
  EN-kwartaalbericht tegen de echte API.
- [ ] **D3 Modelkeuze** *(na het blinde oordeel, § 2 punt 14)*: wint de
  kandidaat, dan `CONTENT` in `lib/aiModellen.ts` wisselen en de kostenschatting
  bijwerken.
- *Klaar als (fase):* i4-tekst volgt het sjabloon 1-op-1 in NL en EN; brochure
  niet te onderscheiden van hun eigen werk; scène 5 loopt zonder wachttijd-
  verrassing.

### E. Juridisch (masterplan fase 14)

- [ ] **E1 (14.2) Bedrijfsgegevens + zakelijk e-mailadres** *(geblokkeerd: § 2
  punt 17)*: wettelijk verplichte gegevens (art. 3:15d BW, art. 20
  Handelsregisterwet: naam, KvK-nummer, vestigingsadres, btw-id, e-mail) in één
  constante `lib/bedrijf.ts`, gelezen door de footer van de publieke pagina's,
  `/contact`, privacy en voorwaarden (art. 7 krijgt een plaats). Het gmail-adres
  vervangen door het zakelijke adres. *Klaar als:* grep op het gmail-adres in
  `app/` en `components/` geeft niets meer, behalve `lib/admin.ts`.

### F. Fundament en onderhoud — nieuw uit de opschoning van 30 sep

Bouwbaar zonder input, tenzij anders vermeld. F1, F2, F5 en F6 hebben geen
bestandsoverlap en kunnen parallel.

- [ ] **F1 CI op GitHub** — er draait nu niets automatisch: typecheck, lint en
  tests gebeuren alleen lokaal. Eén workflow (`.github/workflows/ci.yml`) die bij
  elke PR en push naar `main` `npm ci`, `npm run typecheck`, `npm run lint` en
  `npm run test` draait (tests die secrets nodig hebben, slaan zichzelf al over).
  Geen secrets nodig, geen deploygedrag. *Klaar als:* een PR toont een groene
  check, en een bewust kapotte test maakt hem rood.
- [ ] **F2 Herstelplan compleet** *(vóór 5.5)* — zonder Supabase Pro is de
  lokale back-up het enige vangnet, en die is onvolledig:
  (1) `scripts/backup-data.mjs` mist de tabel `imports` (daar staat de
  `snapshot_json` die een import terugdraait) en `gebruik_events`;
  (2) Storage (`kantoor-assets`, foto's, documenten) wordt niet meegenomen;
  (3) `supabase/schema-baseline.sql` is van 17 sep — ververs hem uit de live
  database (alleen structuur, policies en functies; `execute_sql` alleen
  lezend); (4) een korte herstelprocedure in `docs/werkwijze.md` § 5.
  *Klaar als:* een back-up bevat alle tabellen + Storage, en de baseline klopt
  met `scripts/controleer-schema.mjs`.
- [ ] **F3 Bewaarbeleid back-ups** — `backups/` bevat 12 sets productiedata
  (86 MB) op de laptop, plus een bestand met startwachtwoorden in platte tekst.
  Voorstel: de laatste 5 bewaren plus de set vlak vóór elke migratie of import;
  het wachtwoordbestand weg zodra 12.1 klaar is. Uitdunnen = verwijderen →
  akkoord Quinn per keer.
- [ ] **F4 Foutmonitoring** *(vóór i4 dagelijks gaat werken, uiterlijk na de
  demo)* — `meldFout()` logt nu alleen naar de console, dus fouten staan alleen
  kort in de Vercel-logs en niemand krijgt een seintje. Sentry (gratis laag) of
  een vergelijkbare dienst op `meldFout` aansluiten; account = actie Quinn.
- [ ] **F5 Kwetsbaarheden in de dev-tooling** — `npm audit` meldt 4 (2 hoog)
  in `@vitest/mocker`, `brace-expansion` en `browserslist`; productie heeft er 0.
  `npm audit fix` crasht op het URL-geïnstalleerde `xlsx` → gericht updaten of
  `overrides`. *Klaar als:* `npm audit` 0, alle checks groen.
- [ ] **F6 Docx-test draait nooit** — `lib/docx.test.ts` slaat zichzelf altijd
  over, omdat de fixture klantdata is en niet in git staat. Maak een kleine
  synthetische `.docx` als fixture, zodat de documentenassistent echt getest is.
- [ ] **F7 Opruimmigratie 2** *(na akkoord, § 2 punt 9)*: `nps_responses` en
  `makelaars.first_generated_at` droppen, het veld uit `lib/supabase.ts` halen.
  Veilig: geen code gebruikt ze. Back-up vooraf.
- [ ] **F8 Kostenschatting bijwerken** *(vóór het prijsgesprek)* —
  `docs/strategie/kostenschatting.md` rekent nog met 17 contenttypes, Gemini
  2.0 gratis en Vercel-limieten van toen. Opnieuw met outputset v2 + extra's,
  Gemini 2.5 betaald, Vercel Pro en Supabase Pro.
- [ ] **F9 Lint-omzeilingen herstructureren** *(bij aanraking)* — in
  `StatTile`, `WaardePresentatie`, `WaardebepalingPaneel`, `BuurtDataTab` en
  `KwartaalberichtModal` staat een setState in
  `requestAnimationFrame`/`queueMicrotask`. Werkt, maar is omzeilen.
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
| Content NL + EN duurt langer dan de functielimiet | Meten (D2); splitsen of Vercel Pro |
| Dataverlies op productie (geen Supabase Pro) | Back-up vóór elke risicovolle stap; F2; Supabase Pro vóór het eerste contract |
| Supabase gratis pauzeert na 7 dagen inactiviteit | Dagelijks gebruik; check de dag vóór de demo |
| Fouten bij de klant blijven onopgemerkt | F4 foutmonitoring; feedbackknop |
| Nieuw AI-model verandert de toon | Blinde evaluatie vóór elke wissel (D3) |
| Datalek tussen kantoren | RLS + `security_invoker`; `e2e/rls.spec.ts` test beide richtingen |
| Uitloop | Schrapvolgorde (§ 1); nieuwe ideeën naar de backlog |

---

## 5. Backlog en geparkeerd

**Na de demo:** streaming van content naar de UI (nu voortgang + skeletons) ·
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
