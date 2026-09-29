# VestaAI — Roadmap v2 (masterplan "demo-klaar", herzien 16-17 sep 2026)

> **Dit is het leidende plan.** Begin elke sessie bij § 📍 Stand van zaken.
> Besluiten en opleveringen staan in `docs/besluiten.md` (logboek), strategie in
> `docs/goals.md`, ontwerpregels in `docs/ontwerpprincipes.md`.
>
> **Voor Sonnet — zo gebruik je dit document.** Neem het item dat in Stand van
> zaken als "volgende" staat. Elk item heeft *Doel · Raakt · Hergebruik · Spec ·
> Tests · Klaar als*. Schrijf eerst een mini-plan van ≤10 regels in de chat
> (bestanden, volgorde, tests), bouw dan, en rond af met `/sessie-afronden`.
> Botsen spec en code, dan wint de code-realiteit — noteer de afwijking in
> Stand van zaken. § 3 (architectuurbesluiten) is bindend voor élk item.
> Twijfel je over een productkeuze: kies zelf, noteer het in `docs/besluiten.md`,
> blokkeer alleen bij iets onomkeerbaars (migratie op echte data, verwijderen).

---

## 📍 Stand van zaken

*Bijgewerkt 30 sep 2026 (ronde O, PR #48). Geschiedenis per ronde: `docs/besluiten.md`.*

- **Af:** fases 0-4, 6, 7, 9, 10 en 13. Fase 5 is voorbereid tot aan de exports
  (5.2-5.4 af, importpijplijn en geocodering liggen klaar). Next 16 + React 19
  en functies in Frankfurt sinds 29 sep.
- **Laatst opgeleverd (ronde O):** 12.6 performance mobiel ronde 2 —
  recharts lazy, `react-dom/server` uit de kaartlagen, dossier-tabs pas mounten
  bij het eerste bezoek, kantoorfonts zonder preload, Plausible `lazyOnload`,
  ui-barrel tree-shakebaar. Initiële JS (gzip): marktanalyse 209 → 77 kB,
  concurrentie 197 → 65, woningen 132 → 69, transacties 161 → 91, kaart
  159 → 76, layout 66 → 37. Kwaliteit: A/B tegen `main` — wat de gebruiker
  ziet verschijnt even snel, alle checks groen (dod:screens 33/33, e2e 10/10,
  repetitie 0 fouten). Verder: meetscript `scripts/meet-lighthouse.mjs`,
  kantoor-admin-achterdeur op `kantoren` gedicht (migratie toegepast),
  roadmap/CLAUDE.md opgeschoond. Nameting Lighthouse: zie 12.6.
- **Open en bouwbaar zonder input:** weinig. Kandidaten: dossier-LCP verder
  omlaag (verkoopadvies-fase, `WaardebepalingPaneel` + kaart zijn de grootste
  hydratie), landingspagina naar > 90 (nu 86, § 11-eis) en kantoorlogin (82),
  31 react-hooks-lintmeldingen.
- **Open, wacht op Quinn (§ 8):** exports (5.1 → 5.5 → M1), licentie Brainbay,
  voorbeeld-verkoopadvies (fase 11), team-accounts (12.1), akkoord betaalde
  testruns (8.5, smoke-generatie, EN-kwartaalbericht), opruimmigratie,
  6 ongebruikte Stripe-/cron-geheimen op Vercel, Supabase-auth 2 klikken,
  kantoorprofiel i4, pastelkleuren kaart, Vercel Pro.
- ⚠️ **Demo-realiteit:** het i4housing-kantoor heeft 0 transacties (demo-kantoor
  7.996) — marktinzichten, kerncijfers en waardering tonen daar de lege staat.
  Repetitie op `/login/demo`. Terugvalplan als de exports uitblijven: demo op
  het demo-kantoor in i4housing-huisstijl (beslissing Quinn, pas nodig als half
  december in gevaar komt).
- **Zodra de exports binnen zijn:** 5.1 exportanalyse → `lib/importProfielen.ts`
  definitief → `kantoor_aliassen` van i4 Housing zetten (naam zoals in de
  export) → dry-run → `--write` → geocoderen → backtest → M1-tussencheck.
- ⚠️ **Contentgeneratie:** kern-call sinds 8.3 kleiner (6.000 max_tokens), maar
  de echte duur NL+EN tegen de Vercel-limiet van 300 s is nog niet gemeten —
  zit in de betaalde testruns (§ 8 punt 6).
- **Blokkades (geen ervan blokkeert het bouwen):** exports · Brainbay-licentie
  · voorbeeld-verkoopadvies · verwerkersovereenkomst (uitgesteld tot in
  gebruik, maar formeel vóór 5.5) · Vercel Hobby.
- **Open vragen voor Quinn:** blinde evaluatieronde content (8.1) draaien? ·
  pastelkleuren van de kaart goed?

---

## 1. Waarom v2 — wat er structureel anders is dan v1

v1 (16-17 sep) was een goed geordende werklijst, maar bouwde weken lang
verkenners en waardering tegen een lege tabel, plande UI-primitives vóór hun
eerste gebruiker, en liet de demo pas in de laatste fase vorm krijgen. v2:

1. **Demo-backwards.** § 2 beschrijft de demo in zes scènes. Elke fase dient
   een scène; wat in geen scène zit is polish en staat in de schrapvolgorde.
2. **Data eerst.** Fase 2 zet een realistische synthetische demo-fixture neer
   (werkgebied Wassenaar e.o., ~8.000 regionale rijen) vóórdat er één
   verkenner wordt aangeraakt. Echte data (fase 5) vervangt hem zodra de
   exports er zijn — de demo draait op i4housing's eigen data.
3. **Datalagen vastgelegd** (§ 3.1). Eén module bevraagt `transacties`;
   regionaal wordt in Postgres geaggregeerd; een test bewaakt dat.
4. **Dossier los van content** (§ 3.2). Een dossier aanmaken duurt seconden,
   niet minuten; content komt op verzoek. Dit is een echte bug in het
   fasemodel zoals het nu staat (`/api/generate` blokkeert het aanmaken).
5. **Waardering die een taxateur herkent** (§ 3.3): locatie, tijd via een
   prijsindex uit de eigen dataset, transparante correcties per referentie,
   WOZ als ijkpunt, handmatige referenties, backtest, en één tussencheck bij
   hun taxateur.
6. **Content in hún format** (§ 3.4): het 4SALE!-sjabloon uit
   `docs/i4housing-onderzoek.md` wordt een gestructureerd model, de outputset
   is teruggesnoeid tot wat ze gebruiken, en er komt een
   sneak-preview-WhatsApp-bericht en een kwartaalbericht op echte cijfers bij.
7. **Import via script** (concierge-model), niet via een 1 MB-upload.
8. **Geen primitives-fase.** Elke primitive wordt gebouwd bij zijn eerste
   gebruiker. Foutlogging naar voren.
9. **Sonnet-klare item-specs** en een scherpe demo-minimum-lijn (§ 6).

---

## 2. De demo — zes scènes

Eén demo bij i4housing (laptop op groot scherm), in hun eigen omgeving, op hun
eigen data. ±25 minuten. Elke scène noemt de items die hem dragen.

| # | Scène | Wat ze zien | Belofte | Gedragen door |
|---|---|---|---|---|
| 1 | **"Dit is óns platform"** (2 min) | `/login/i4housing` in hun stijl → startpagina "Goedemorgen Marc" met teamfoto (tot 12.1: merkverloop), kerncijfers uit hún data (verkocht 12 mnd, gem. looptijd, marktaandeel Wassenaar, prijs t.o.v. vraagprijs), recent bekeken ("deze week" geschrapt onder 10.4) — geen snelkoppelingen (besluit 17 sep) | Het is hun platform | 1.9 · 1.10 · 2.5 · 9.1 · 10.4 · 12.1 |
| 2 | **"Eindelijk snappen we onze data"** (5 min) | Marktinzichten → filters (Wassenaar · vrijstaand · 24 mnd) → kerncijfers met delta t.o.v. vorige periode, grafieken prijs/€ per m²/looptijd, segment A vs B → knop **Kwartaalbericht schrijven** → Claude schrijft hun Q3-marktupdate in hun toon met de echte cijfers | Inzicht + uren bespaard | 2.2 · 6.1 · 6.4 |
| 3 | **"Wie wint waar"** (3 min) | Concurrentie → marktaandeel in Wassenaar, wie wint vrijstaand > € 1 mln, i4housing vs. markt op looptijd en prijs t.o.v. vraagprijs, profiel van één concurrent | Positie in de regio | 6.3 (vereist verkopend kantoor in Brainbay) |
| 4 | **"Hiermee zetten we het verkoopadvies op papier"** (7 min) | Nieuw dossier: adres typen → BAG/WOZ vullen voor → dossier staat er *direct* → waardering: referenties op de kaart binnen de straal, tabel met correcties (tijd · m² · afstand), bandbreedte, WOZ ernaast, wat-als (garage/tuin/label), één referentie uitsluiten → waarde verandert live → makelaarscorrectie met motivatie → **Waardebepaling (pdf)** in hun stijl in < 10 s → makelaar zet het dossier door naar In verkoop | Het verkoopadvies staat, de opdracht volgt | 3.1-3.4 · 4.1-4.8 · 7.3 |
| 5 | **"Dit scheelt ons uren"** (5 min) | In het dossier: **Genereer content** → timer en skeletons → Funda-tekst in 4SALE!-format NL en EN naast elkaar, brochure-pdf in hun stijl, Instagram, LinkedIn, sneak-preview-WhatsApp-bericht, koper-e-mail → inline bewerken → "stijl leren" | Uren bespaard | 8.1-8.4 |
| 6 | **"Onze verkopen op de kaart"** (2 min, afsluiter) | Verkoopkaart: eigen verkopen als vlaggetjes in merkkleur, periode-schuiver 2019 → nu, hover-card, filter op type | Trots + overzicht | 7.1 · 7.2 |

**Demo-minimum** (de lijn waaronder niets geschrapt mag worden): scènes 1, 2, 4
en 5 volledig; scène 3 zodra Brainbay het verkopend kantoor blijkt te bevatten;
scène 6 met alleen 7.1-7.3 (afspeelknop mag vervallen). Zie § 6 voor de
schrapvolgorde.

---

## 3. Architectuurbesluiten (bindend voor elk item)

### 3.1 Datalagen — één module bevraagt `transacties`

- **`lib/transactiesQuery.ts` is de enige plek** in `app/`, `components/` en
  `lib/` waar `.from('transacties')`, `.from('transacties_met_coordinaten')`
  of een `rpc()` op transactiedata voorkomt. Een vitest-guard
  (`lib/transactiesQuery.guard.test.ts`) grept de codebase en faalt bij een
  tweede plek. Scripts (`scripts/`) zijn uitgezonderd.
- **Drie toegangspatronen:**
  1. **Eigen verkopen, compact, client-side.** `haalEigenVerkopen(kolommen)`
     haalt in een `.range()`-lus (blokken van 1.000) alleen
     `eigen_verkoop = true` en `uitgesloten_reden is null` op, met een
     expliciete kolommenlijst. ±150 rijen/jaar → ≤ 2.000 rijen → de bestaande
     pure functies (`lib/marktanalyse.ts`, `lib/kerncijfers.ts`, `lib/geo.ts`)
     filteren client-side binnen 100 ms. Gebruikt door: kerncijfers,
     verkoopkaart, straalpaneel, CSV-export. (Dossier-tellingen draaien op
     `objecten`, niet op `transacties`.)
  2. **Regionale dataset, geaggregeerd in Postgres.** Alles wat over de hele
     regio gaat (duizenden tot tienduizenden rijen) loopt via RPC's met één
     `p_filters jsonb`-parameter (Zod-schema `TransactieFilterSchema` in
     `lib/schemas.ts`: `plaatsen[]`, `wijken[]`, `typen[]` (subtypes uit de
     taxonomie), `datum_van`, `datum_tot`, `prijs_min/max`, `opp_min/max`,
     `perceel_min/max`, `bouwjaar_min/max`, `energielabels[]`, `kamers_min`,
     `tuin`, `garage`, `tov_vraagprijs`, `looptijd_max`, `makelaars[]`,
     `kantoren[]`, `alleen_eigen` — volledig filtermodel in
     `docs/ontwerp/README.md` § 4):
     `marktanalyse_reeks` (kwartaalrijen: n, mediaan prijs, mediaan € per m²,
     mediaan looptijd, % t.o.v. vraagprijs), `marktanalyse_samenvatting`
     (dezelfde cijfers voor de hele periode + de vorige periode voor de
     delta), `concurrentie_marktaandeel`, `concurrentie_segmenten`,
     `transacties_zoeken` (gepagineerd, gesorteerd) en `prijsindex_kwartaal`.
     Elke RPC: `language sql`, `stable`, `security invoker`,
     `set search_path = public`, filtert altijd `uitgesloten_reden is null`.
     RLS doet de kantoorscheiding (invoker). Budget: < 300 ms bij 100.000
     rijen; indexen op `(kantoor_id, verkoopdatum)`, `(kantoor_id, plaats)`,
     `(kantoor_id, woningtype_groep)`, gist op `geo`.
  3. **Referenties op locatie.** `referenties_in_straal(p_lat, p_lng,
     p_straal_m, p_filters)` via `ST_DWithin` op `geo`, geeft `afstand_m` mee.
- **Geen kale `select('*')`, nergens.** Elke query noemt kolommen.
- `transacties_met_coordinaten` blijft de view voor lat/lng (met
  `security_invoker = true`); elke nieuwe view op `transacties` krijgt dat ook.

### 3.2 Dossier los van content

- `POST /api/object` maakt een dossier aan uit de intake **zonder Claude**:
  `input_json`, `fase = 'acquisitie'`, `lat/lng` uit de verrijking die de
  intake al deed bij adreskeuze (`NewObjectForm` stuurt ze mee; ontbreken ze,
  dan doet de route zelf `pdokLookup` uit `lib/verrijking.ts`). Antwoord in
  < 5 s, redirect naar het dossier.
- `POST /api/generate` wordt "genereer voor dossier-id": idempotent, lock per
  dossier (niet per gebruiker), zet `objecten.content_status`
  (`geen` · `bezig` · `klaar` · `fout`) en `content_gegenereerd_op`.
  Triggers: fase → In verkoop (automatisch, als status `geen`) en de knop
  "Genereer content". De 7-daagse cache-op-identieke-invoer vervalt.
- `CONTENT_VERGRENDELD` vergrendelt alleen content-tabs en `/api/generate`,
  nooit meer het aanmaken van een dossier (`object/new`).
- Intake in de verkoopadviesfase vraagt minimaal: adres, woningtype, oppervlak,
  bouwjaar. `usps` en `doelgroep` worden optioneel in `PropertyInputSchema`;
  `/api/generate` eist ze alsnog (400 met "Vul eerst stap Verhaal in").

### 3.3 Waarderingsmethode (vergelijkbare verkopen, uitlegbaar)

> **Rekenkern gebouwd op 17 sep 2026 (Fable):** `lib/waardering.ts` (v2, naast
> de `@deprecated` v1), `lib/prijsindex.ts`, `lib/cbsPrijsindex.ts` (stub met
> TODO voor de tabel-id), schema's `WaarderingUitkomstSchema` /
> `WaarderingOpslagSchema` in `lib/schemas.ts`, 22 + 13 tests en een
> synthetische backtest (`lib/waardering.backtest.test.ts`, generator
> `lib/waardering.synthetisch.ts`). Uitleg in makelaarstaal met rekenvoorbeeld:
> `docs/waardering-methode.md`. De regels hieronder zijn daarop bijgewerkt;
> Sonnet sluit in fase 4 alleen RPC's, actions en UI aan.

- **Kandidaten:** `referenties_in_straal`, zelfde `woningtype_groep`
  (`appartement` · `rijwoning` = tussen/hoek/geschakeld · `halfvrijstaand` =
  twee-onder-een-kap · `vrijstaand` = vrijstaand/villa/bungalow/landhuis),
  oppervlak ± 35 %, bouwjaar ± 25 jaar (± 40 bij vrijstaand), verkoopdatum
  ≤ 36 maanden terug én vóór de peildatum. Straal start op 750 m en verbreedt
  automatisch (1.000 → 2.000 → 5.000 m, daarna 60 maanden) tot n ≥ 8; de
  gebruikte straal staat in de uitkomst; maximaal de 25 best passende blijven
  over. Zonder locatie: terugval op plaats + typegroep met waarschuwing.
- **Per referentie, allemaal zichtbaar:** € per m², indexfactor (§ prijsindex)
  × correctiefactor (§ correcties) → × oppervlak subject = **geïmpliceerde
  waarde**; gewicht = gelijkenis (score type/oppervlak/bouwjaar) ×
  1/(1 + afstand/500 m) × 1/(1 + maanden/12) × 0,5 bij een andere plaats
  (prijsniveaus verschillen per gemeente meer dan afstand verklaart).
- **Uitkomst:** gewogen mediaan van de geïmpliceerde waarden; bandbreedte =
  gewogen **P10–P90** (P25–P75 dekt per definitie maar de helft van de
  uitkomsten; P10–P90 gekalibreerd op de synthetische backtest, `BAND_PERCENTIELEN`
  is de kalibratieknop voor 4.8), minimaal ± 5 % (n ≥ 6), ± 10 % (n 4-5),
  ± 15 % (n < 4); afgerond op € 1.000; `weinigData` bij n < 6 met een
  zichtbare waarschuwing.
- **Prijsindex:** `prijsindex_kwartaal(werkgebied, typegroep)` = mediaan € per
  m² per kwartaal uit de eigen regionale dataset (zelfde vorm als
  `bouwIndex()` in `lib/prijsindex.ts`), gladgestreken over 3 kwartalen
  gewogen naar n; betrouwbaar als het venster ≥ 30 verkopen telt; factor =
  index(peildatum) / index(kwartaal referentie). Ontbreekt een betrouwbaar
  kwartaal: dichtstbijzijnde binnen 2 kwartalen mét melding, daarna de
  CBS-prijsindex bestaande koopwoningen (regio, `lib/cbsPrijsindex.ts`), en
  anders "geen tijdcorrectie" mét waarschuwing.
- **Kenmerk-effecten en correcties** (garage, tuin, energielabelklasse
  A-B / C-D / E-G, bouwperiode < 1945 / 1945-1975 / 1975-2000 / 2000+):
  prijsniveau (mediaan € per m²) per klasse op de regionale set binnen
  werkgebied + typegroep (n ≥ 3 per klasse om te tonen). **Toegepast als
  correctie per referentie** zoals de correctiekolommen in een taxatierapport:
  niveau(klasse subject) / niveau(klasse referentie) waar beide klassen bekend,
  verschillend en ≥ 30 verkopen groot zijn. **Grootte:** Theil-Sen-helling
  van ln(€ per m²) op oppervlak binnen de typegroep, toegepast op het
  m²-verschil. Begrenzing ± 15 % per kenmerk, ± 30 % totaal; per kenmerk een
  schakelaar (`opties.correcties`, standaard aan) en per referentie zichtbaar
  in `referenties[].correcties`. Geen multivariate regressie. (Backtest
  zonder deze correcties: label E-G +9 %, grotere woningen +3,6 % overschat.)
- **WOZ** (uit `lib/verrijking.ts`) staat als ijkpunt náást de waarde, met
  peildatum — nooit als invoer.
- **Handmatig:** referenties uitsluiten/toevoegen; opgeslagen in
  `waardering_json.handmatig`; makelaarscorrectie met motivatie blijft.
- **Datacontract** `WaarderingUitkomstSchema` (versie 2) in `lib/schemas.ts`
  — leidend is het schema, niet deze samenvatting: `{ versie, peildatum,
  waarde, laag, hoog, n, weinigData, straal_m, maanden, methode, index_basis,
  index_tm, referenties[{ id, adres, afstand_m, verkoopdatum, prijs, m2,
  prijs_m2, index_factor, index_basis, correcties{}, correctie_factor, gewicht,
  gelijkenis, maanden, waarde_geimpliceerd, handmatig }], effecten, grootte,
  correcties{ aan, toegepast, toelichting }, woz, waarschuwingen[] }`.
  Opslag in `objecten.waardering_json` als `WaarderingOpslagSchema`
  `{ versie: 2, uitkomst, correctie, handmatig{ uitgesloten[], toegevoegd[] } }`;
  v1-json (`{ correctie }`) wordt bij lezen gemigreerd (`migreerWaarderingJson`).
- **Backtest** (`scripts/backtest-waardering.mjs`): elke eigen verkoop van de
  laatste 24 maanden wordt gewaardeerd met uitsluitend transacties van vóór
  haar verkoopdatum. Rapport in `docs/waardering-backtest.md`: mediaan
  absolute fout, % binnen bandbreedte, per typegroep. Demo-lat: mediaan fout
  ≤ 7 %, ≥ 75 % binnen de band. Niet gehaald → bandbreedte verbreden
  (`BAND_PERCENTIELEN`), geen schijnzekerheid. Synthetisch (17 sep, 400
  woningen, 7 % ruis): 5,2 % / 78 %; als vitest-vangrail vastgezet.
- **Disclaimer** op elke uitkomst en pdf: indicatieve waardebepaling op basis
  van vergelijkbare verkopen, geen taxatie in de zin van NRVT/NWWI.

### 3.4 Contentsjabloon-model

- `HuisstijlSchema.tekstsjabloon` (optioneel): `{ opening_label, secties:
  [{ kop, instructie }], slotzin, doel_woorden, engels: { opening_label,
  koppen[] } }`. i4housing-preset: `4SALE!` · `WOONCOMFORT` · `BUITENLEVEN` ·
  `LOCATIE` · `GOED OM TE WETEN` (bullets "- ") · slotzin "Enthousiast over
  deze woning? Neem contact op met ons kantoor. Wij plannen graag een afspraak
  met je in." · 480 woorden · EN: `4SALE!` · `LIVING COMFORT` · `OUTDOOR
  LIVING` · `LOCATION` · `GOOD TO KNOW`.
- De promptbouwer rendert het sjabloon als harde structuur; een validator
  controleert koppen (volgorde) en slotzin en laat één keer opnieuw genereren.
  Zonder sjabloon geldt het huidige generieke format.
- **Outputset v2.** Kern (één call): `funda_tekst` (sjabloon), `brochure_tekst`,
  `instagram`, `linkedin_kantoor`, `sneak_preview` (WhatsApp, ≤ 600 tekens,
  NL), `koper_email`, `buurtomschrijving`. Extra (aparte call, op knopdruk):
  `open_huis`, `followup_positief`, `followup_negatief`, `video_script`,
  `kopersvragen_faq`, `energie_advies`. Vervalt: 2 van de 3 Instagram-varianten
  (herschrijven dekt dat), `linkedin_makelaar`, `marktanalyse` (vervangen door
  het kwartaalbericht op echte cijfers). Oude sleutels blijven optioneel in
  `ContentOutputSchema` zodat bestaande dossiers geldig blijven.
- Engels blijft best-effort parallel; NL is leidend voor bewerken/herschrijven.

### 3.5 Kaart

- **MapLibre GL + PDOK BRT-Achtergrondkaart vectortiles** (stijl **pastel** —
  besluit 17 sep: iets meer kleur; de beeldmerk-pins blijven leesbaar). Eén stack: `components/kaart/BasisKaart.tsx`
  (dynamic import, geen SSR) + lagen als props. Gebruikt door verkoopkaart,
  straalpaneel én de referentiekaart in de waardering. Leaflet verdwijnt na de
  migratie.
- CSP (`next.config.mjs`): `worker-src 'self' blob:` en `connect-src` +
  `https://api.pdok.nl` (en het tile-/style-domein dat de proof oplevert).
- Proof van één uur aan het begin van fase 7; faalt CSP of soepelheid, dan
  Leaflet met canvas-renderer en dezelfde `BasisKaart`-API.

### 3.6 AI-modellen

- `lib/aiModellen.ts` centraliseert: `CONTENT` (nu `claude-sonnet-4-6`;
  kandidaat: nieuwste Sonnet, na blinde vergelijking), `EXTRACTIE` (Haiku),
  `SAMENVATTING` (Sonnet). Nergens anders een modelstring.
- Prompt caching (`cache_control`) op het systeemprompt + stijlprofiel: NL en
  EN delen dezelfde prefix.
- Modelwissel alleen na de blinde evaluatieset (8.1).

### 3.7 URL-state, opmaak en primitives

- `useFilterState(schema)` (Zod-getypte querystring) voor elke verkenner;
  `lib/opmaak.ts` (`euro`, `procent`, `dagen`, `datum`, `m2`, `nlNL`) voor
  élk getal; `lib/grafiekThema.ts` voor recharts (merkkleuren, `--merk-accent`
  alleen als tweede reeks).
- Nieuwe primitives worden gebouwd in de sessie van hun eerste gebruiker,
  geëxporteerd uit `components/ui/index.ts`, met een 5-regel gebruikscomment
  bovenaan. Geen showcasepagina.

### 3.8 Ontwerpspoor voor interactieve verkenners (bindend voor hero-schermen)

Waarom: een verkenner die uit een tekst-spec wordt gebouwd, wordt de meest
letterlijke vertaling ervan — een formulierrij, een tabel en een grafiek met
library-defaults. Dat oogt amateuristisch, hoe goed de data ook is. Daarom:

- **Het prototype ís de spec.** Voor elk hero-scherm bestaat vóór de bouw een
  interactief HTML-prototype in `docs/ontwerp/` (artifact-formaat, één
  bestand, kantoorhuisstijl, synthetische data, álle staten via een
  prototype-strip). Sonnet port het 1-op-1: layout, spacing, staten,
  interacties, formattering — alleen de datalaag wordt
  `lib/transactiesQuery.ts`. Klaar (v2, 17 sep): `marktanalyse.html`,
  `verkoopkaart.html`, plus de gedeelde kit `kit.css` + `kit.js` (tokens,
  primitives, opmaak, woningtype-taxonomie, echt logo). **Handleiding:
  `docs/ontwerp/README.md`** — ontwerprichting "i4 · zacht" (Apple-achtig,
  blauw primair + rood accent zichtbaar), tokens → app, primitives → Radix,
  het filtermodel per verkenner, de taxonomie, de pin en port-instructies.
  Nog te maken (één ontwerpsessie per stuk, op een sterk ontwerpmodel —
  Fable/Opus — of via Claude Design, daarna als bestand hier neergezet, op
  dezelfde kit): `concurrentie.html`, `transacties.html`,
  `waardebepaling.html`, `startpagina.html` (dashboard + dossierheader).
- **Interactieprimitives komen uit Radix** (shadcn/ui-patroon), niet uit
  eigen bouw: `Slider`, `Popover`, `Select`/`Combobox`, `Sheet` (Drawer),
  `Tooltip`, `Tabs`, `Command`; tabellen via TanStack Table. Gethemed via
  `--merk*` (kleur, radius, font), zodat de vorm van het kantoor overal
  doorwerkt (i4 Housing sinds 17 sep: "zacht", radius 10-20 px, Apple-achtig —
  was "strak"). Zelf bouwen mag alleen wat Radix niet levert (`StatTile`,
  `ChartCard`, `FilterBar`, `FilterPills`, kaartlagen). Filters zijn
  dropdown-popovers met samenvatting en tel-badge; elk actief filter is een
  pil met ×; het volledige filtermodel (plaats/wijk, woningtype-taxonomie met
  subtypes, prijs, oppervlak, perceel, bouwjaar, energielabel, kamers,
  kenmerken, t.o.v. vraagprijs, looptijd, verkocht door, verkopend kantoor,
  segment B) staat in `docs/ontwerp/README.md` § 4.
- **Grafiekthema** (`lib/grafiekThema.ts`, recharts): geen library-defaults.
  Geen legendabox waar directe eindlabels volstaan (met botsingscorrectie);
  rasterlijnen dun en licht; eigen tooltipkaart met alle reeksen én n; y-as
  met "mooie" stappen en korte labels (`€ 1,2 mln`); `tabular-nums`; "wij" =
  merkkleur met licht vlak, "markt" = donker neutraal dun (context, geen
  categorie — de dataviz-validator keurt neutraal af als *categorie*; hier is
  het bewust de referentielijn), segment B = accent. Nooit een dubbele as.
- **Interactiecontract** (checkbaar, geldt voor elke verkenner): filter →
  zichtbaar resultaat < 100 ms client-side, skeleton alleen bij het eerste
  laden; hover onthult altijd detail; klik op een grafiekelement filtert
  (crossfilter, zichtbaar als chip in de filterbar); filterstand in de URL;
  volledig toetsenbordbedienbaar met merkkleurige focusring; getal-tweens
  400 ms; sticky filterbar; `prefers-reduced-motion`; lege/weinig-data/laad/
  foutstaat exact als in het prototype.
- **Kaart:** PDOK-basiskaart in pastelstijl (iets meer kleur); pin = mini-
  beeldmerk zoals het i4-logo (blauwe ruit, rode omlijning, rood stokje —
  SVG in `docs/ontwerp/README.md` § 6); frosted hover-kaart; lijst en kaart
  wijzen naar elkaar; tijdlijn met afspeelknop; vloeiend pannen/zoomen
  (MapLibre, § 3.5).
- **Visuele review is onderdeel van de DoD:** skill `ontwerpreview`
  (`.claude/skills/ontwerpreview/SKILL.md`) — screenshot van de app naast
  screenshot van het prototype, beoordeeld door een subagent met vision plus
  de checklist; pas AKKOORD sluit het item.

---

## 4. Werkwijze, Sonnet-protocol & Definition of Done

**Sessieritme (dagelijks, VestaAI als eigen VS Code-workspace — anders laden
hook en skills niet):**
1. `/sessie-start` — leest Stand van zaken, geeft status in ≤ 8 regels.
2. Neem het volgende item. Mini-plan (≤ 10 regels) in de chat: bestanden,
   volgorde, tests, wat je hergebruikt. Plan mode alleen bij items gemarkeerd
   *(ontwerpkeuze)*.
3. Bouwen: rekenlogica eerst als pure functie in `lib/` mét vitest-test, dan
   de UI. Grote, parallelle deelklussen zonder bestandsoverlap → subagent
   (`model: sonnet`, `isolation: worktree`), expliciet genoemd bij het item.
4. Definition of Done (hieronder) + `npm run dod:screens`.
5. `/sessie-afronden` — DoD, commit/PR, Stand van zaken, `docs/besluiten.md`.

**Definition of Done (elk item):**
- `npm run typecheck && npm run test && npm run build` groen.
- Huisstijl-hook schoon: `var(--merk*)`, "je/jouw", geen "VestaAI" achter de
  login, geen groene grijzen, geen `var(--merk…, #hex)`-fallbacks.
- `npm run dod:screens` groen (huisstijlcheck + screenshots op 390/1280/1920 px;
  start zelf een dev-server als er geen draait; faalt op VestaAI-groen, foutstaat,
  `pageerror` en niet-2xx), en de screenshots in `screenshots/` beoordeeld tegen
  `docs/ontwerpprincipes.md`; op 390 px breekt niets.
- **Elke geraakte route is écht bekeken**: geen foutstaat, geen
  Next-error-overlay. Een check die "schoon" meldt op een gecrashte pagina
  telt niet (proefrit 17 sep: de startpagina crashte terwijl alles groen was).
- Lege, laad- en foutstaat aanwezig; skeletons, geen spinners; geen
  console-errors; elke statistiek toont n en "data t/m".
- `transacties` alleen via `lib/transactiesQuery.ts` (guard-test groen).
- Hero-schermen (§ 3.8): `ontwerpreview` AKKOORD — de gebouwde pagina naast
  het prototype in `docs/ontwerp/`, alle afwijkingen opgelost.
- Nieuwe tabel → RLS per kantoor, in een migratie via `apply_migration`.
- Docs bijgewerkt: CLAUDE.md-architectuur als er iets structureels wijzigt,
  Stand van zaken altijd.

**Vangrails productiedatabase** (geen Supabase Pro, dus geen herstelpunten):
back-up (`scripts/backup-data.mjs`) vóór elke migratie/import/bulk-update;
scripts dry-run standaard, `--write` expliciet; seed-/opruimscripts raken
alleen kantoren met `instellingen_json.demo === true` (afgedwongen met een
test); imports hebben een `import_id` en zijn terug te draaien; migraties via
`apply_migration` en alleen na akkoord van Quinn als ze echte data raken;
`scripts/controleer-schema.mjs` in `/sessie-afronden`; de opruimmigratie
`20260916_opruimen_ongebruikt.sql` blijft liggen tot back-up + akkoord.

**Git:** featurebranch per fase → PR → `main` → Vercel-deploy READY en geen
runtime-errors (Vercel-MCP).

---

## 5. Fases

Volgorde: 1 → 2 → 3 → 4 → (5 zodra exports binnen zijn, parallel aan 4 vanaf
4.3) → 6 → 7 → 8 (parallel via subagent vanaf fase 3) → 9 → 10 → 11 (geblokkeerd)
→ 12. Fase 13 parallel na de merge van fase 1.

### Fase 0 — Veiligheid, fundament & documentatie ✅ (17 sep 2026)
RLS-datalek en SECURITY DEFINER-view gefixt, import-upsert gefixt, auth-checks,
CSP, back-upscript, schemabaseline, sessieskills, concept-verwerkersovereenkomst.
Details: `docs/besluiten.md`.

### Fase 1 — UI-fundament + nieuwe schil ✅ (18 sep 2026)
Nieuwe schil (1.1-1.8), bugs + fallback-opruiming (1.9), geen pitch-concept en
platte navigatie (1.9c), DoD-tooling (1.9b), prototypes bijgetrokken (0.1),
Google-logo & SEO-basis (1.10), PR `feat/nieuwe-schil` live (1.11). Details:
`docs/besluiten.md` 16-18 sep.

### Fase 2 — Datafundament & demo-fixture ✅ (17 sep 2026)

Schema v2 + `imports` (2.1), `lib/transactiesQuery.ts` met RPC's en guard (2.2),
demo-fixture "Demo Makelaardij" (2.3), foutlogging `meldFout` (2.4), kerncijfers
op transactiedata (2.5). Details en besluiten: `docs/besluiten.md` 17 sep.
De tussenfase (verkenners kregen alle rijen) is met fase 6 afgesloten: alles
draait op de RPC's.

### Fase 3 — Dossierkern: aanmaken zonder wachten ✅ (17 sep 2026)

Dossier aanmaken zonder Claude + `content_status`-lock (3.1), intake met
woningtype-groep/-subtype (3.2), `object/new` niet meer vergrendeld (3.3),
`DossierHeader` met klikbare fasestepper en `fase_sinds` (3.4). Details:
`docs/besluiten.md` 17 sep. ⚠️ NL+EN-generatie was ~3 min tegen 300 s limiet;
sinds 8.3 is de kern-call kleiner, maar de echte duur is nog niet gemeten (§ 8).

### Fase 4 — Waardering die taxateurs overtuigt ✅ (18 sep 2026)

Referentieselectie op straal met verbredingsladder (4.1), prijsindex uit eigen
data met CBS-terugval (4.2), rekenkern v2 met gewogen band (4.3), referenties
handmatig uitsluiten/toevoegen (4.4), kenmerk-effecten via vergelijkbare paren
(4.5), paneel geport uit het prototype incl. referentiekaart (4.6),
waardebepaling-pdf van één pagina in kantoorstijl (4.7), backtest (4.8).
**Backtest: mediane fout 6,1 % · 76 % binnen de band** — demo-lat (≤ 7 % /
≥ 75 %) gehaald, `docs/waardering-backtest.md`. Details: `docs/besluiten.md`
17-18 sep.

### Fase 5 — Echte data: import i4housing (4 sessies; start zodra de exports er zijn, parallel aan fase 4 vanaf 4.3)

- [ ] **5.1 Exportanalyse** → `docs/data/exportanalyse.md`: per bestand
  (Brainbay, Realworks) kolommen + voorbeeldwaarden, datumdefinities
  (aanmelding/transactie/overdracht), verkopend én aankopend kantoor,
  coördinaten (RD X/Y of lat/lng of alleen postcode), aantal rijen, periode,
  plaatsen, woningtype-waarden, encoding en scheidingsteken. Beantwoordt:
  bevat Brainbay i4housing's eigen verkopen ook (→ ontdubbelen)? Hoe heet
  i4housing in de kantoorkolom (aliassen)?
- [x] **5.2 Importscript** *(28 sep, formaat-onafhankelijk; aliassen per bron voorlopig tot 5.1)* `scripts/import-transacties.mjs --bron brainbay|realworks --bestand <pad> [--write]`
  *Raakt:* nieuw script, `lib/importProfielen.ts` (kolomaliassen per bron,
  bovenop de bestaande `ALIASSEN` uit `lib/transactieImport.ts`), `lib/rd.ts`
  (RD → WGS84; test met het RD-nulpunt Amersfoort (155000, 463000) →
  52,155172 N / 5,387203 O), `lib/kantoorNormalisatie.ts` (naam → norm:
  lowercase, zonder B.V./Makelaars/NVM/leestekens; aliaslijst eigen kantoor in
  `instellingen_json.kantoor_aliassen` → `eigen_verkoop`), plausibiliteitsregels
  in `lib/transactieKwaliteit.ts` (prijs € 50 k–10 mln, oppervlak 20-1.000 m²,
  € per m² 500-15.000, bouwjaar 1600-2027, verkoopdatum binnen bereik,
  verplichte velden) → `uitgesloten_reden`; ontdubbelen Realworks vs Brainbay
  op `adres_sleutel` + verkoopdatum ± 90 dagen (Realworks-rij wint, ontbrekende
  velden aangevuld uit Brainbay); XLSX én CSV (SheetJS als devDependency, alleen
  in het script). Weigert zonder back-up van vandaag. Dry-run print het
  kwaliteitsrapport (aantallen per reden, top-10 voorbeelden, per plaats/jaar);
  `--write` upsert in batches van 500 met `import_id`, schrijft de `imports`-rij.
  *Tests:* rd, normalisatie, kwaliteit, ontdubbelen, profiel-mapping (pure
  functies).
- [x] **5.3 Geocodering** *(28 sep; toevoeging niet in de PDOK-query — "12 A" is een huisletter)* `scripts/geocodeer-transacties.mjs`: hergebruik
  `pdokLookup` uit `lib/verrijking.ts`; postcode + huisnummer → `exact`,
  straat + plaats → `benaderd`, anders `mislukt`; hervatbaar op
  `geocode_status is null`; ~10 verzoeken/s; rapport; alleen rijen zonder `geo`.
- [x] **5.4 `/admin/transacties` v2** *(28 sep; ook een mislukte import is terug te draaien)* — importhistorie (bron, datum, nieuw/
  bijgewerkt/uitgesloten, geocode-%), kwaliteitsrapport per import, knop
  "Laatste import terugdraaien" (verwijdert rijen met dat `import_id`, herstelt
  bijgewerkte rijen uit `snapshot_json`, zet `teruggedraaid_op`), de bestaande
  CSV-vorm blijft voor kleine correcties. "Data t/m"-badge leest hieruit.
- [ ] **5.5 Import uitvoeren** (na back-up + getekende verwerkersovereenkomst
  + licentiebevestiging): dry-run → rapport bespreken → `--write` → geocoderen
  → backtest opnieuw → **Mijlpaal M1: tussencheck** — één waardebepaling-pdf
  van een recente eigen verkoop naar hun taxateur met de vraag "klopt dit
  ongeveer?". Antwoord vastleggen in `docs/besluiten.md`.
- [ ] **5.6 Fixture herijken** (optioneel): verdelingen van de fixture in lijn
  brengen met de echte data, zodat de fixture een eerlijke terugval blijft.
- **Klaar als:** ≥ 95 % `exact` gegeocodeerd; herimport levert 0 dubbelen;
  terugdraaien werkt; alle verkenners tonen echte, plausibele cijfers;
  backtest op echte data gedocumenteerd; tussencheck gedaan.

### Fase 6 — Marktinzichten, concurrentie & kwartaalbericht ✅ (26 sep 2026)
Radix-primitives (6.0, zonder shadcn-classlaag — zie besluiten 19 sep),
marktanalyse-explorer v2 (6.1), transacties opzoeken v2 op de RPC
`transacties_zoeken` (6.2), concurrentie v2 met vijf RPC's (6.3),
kwartaalbericht met cijfer-guardrail (6.4). Details: `docs/besluiten.md`.

### Fase 7 — Kaart ✅ (26 sep 2026)
MapLibre + PDOK-pastel als enige kaartstack (`components/kaart/`): verkoopkaart v2, straal per woning, referentiekaart, `/woningen`-kaart; Leaflet verwijderd. Details: `docs/besluiten.md`.

### Fase 8 — Content in i4housing-format (4 sessies; parallel via subagent in een worktree zodra fase 3 is gemerged — raakt `lib/claude.ts`, `lib/schemas.ts` (alleen `ContentOutputSchema`/`HuisstijlSchema`), `components/ResultTabs.tsx`, pdf-routes, `HuisstijlForm.tsx`)

- [x] **8.1 `lib/aiModellen.ts` + prompt caching + evaluatieset** —
  modelconstanten (§ 3.6), `cache_control` op systeemprompt; `docs/evaluatie/`
  met 5 dossiers (JSON-fixtures, echte i4housing-achtige woningen) en
  `scripts/evalueer-content.mjs` dat per dossier twee anonieme varianten
  (A/B: huidig vs kandidaat-model of oud vs nieuw sjabloon) naar
  `docs/evaluatie/rondes/<datum>/` schrijft voor een blind oordeel door Quinn.
- [x] **8.2 Tekstsjabloon-model** *(§ 3.4)* — schema, promptbouwer (rendert
  koppen als harde structuur, `doel_woorden`), validator + één herkansing,
  admin-formulier in `app/admin/kantoor/HuisstijlForm.tsx` (label, secties,
  slotzin, doel_woorden, EN-koppen), i4housing-preset via
  `scripts/repair-i4housing-branding.mjs` (uitbreiden; dry-run). Tests op
  promptrender en validator.
- [x] **8.3 Outputset v2 + ervaring** — `ContentOutputSchema` v2 (oude sleutels
  optioneel), `sneak_preview`, extra's via `POST /api/object/[id]/extra?type=`,
  `ResultTabs`: kern-tabs + "Meer…"-menu voor extra's, timer + skeleton per tab
  (3.1), Funda-tekst NL en EN náást elkaar op ≥ 1280 px, kopieerknop per veld.
- [x] **8.4 Brochure-pdf in kantoorstijl** — logo, kleuren, lettertype, foto's
  uit `FotoBibliotheek`, kenmerkentabel uit de intake, `brochure_stijl.slot_tekst`;
  vergelijk naast een echte i4housing-brochure (uit `seed-i4housing-content.mjs`).
- [ ] **8.5 Virtual staging model-check** (schrapbaar) — model is al vervangen
  (`gemini-2.5-flash-image` i.p.v. `gemini-2.0-flash-exp`, 29 sep); rest: één
  betaalde testrun met een echte foto (wacht op akkoord Quinn, § 8).
- **Klaar als:** blinde vergelijking gewonnen (Quinn); i4housing-tekst volgt het
  sjabloon 1-op-1 in NL en EN; brochure niet te onderscheiden van hun eigen werk;
  scène 5 loopt met timer.

### Fase 9 — White-label-wow ✅ (27 sep 2026)
Kantoorlogin `/login/<slug>`, reset-mail in kantoorstijl, consistentiecontrole (huisstijlcheck incl. tabs, portals, pdf's). Details: `docs/besluiten.md`.

### Fase 10 — Woningdossier premium ✅ (27 sep 2026)
`/woningen` v2 (tabel + kaart), dossierheader v2, Buurt & data, Recent bekeken, stijl-leren vindbaar, intake tweekoloms met live "Deze woning"-paneel. Details: `docs/besluiten.md`.

### Fase 11 — Verkoopadvies (2-3 sessies; **geblokkeerd** tot Quinns voorbeeld er is)

Datacontract alvast vast: `VerkoopadviesInput = { dossier (intake),
waardering (v2), kantoor (instellingen: courtage, profiel, werkgebied),
marktcontext (marktanalyseSamenvatting voor plaats + typegroep), makelaar }`.
Losse, herschikbare secties in `@react-pdf/renderer` in kantoorstijl; het
`VerkoopadviesPaneel` komt terug in de verkoopadviesweergave zodra dit bestaat.
**Klaar als:** binnen 1 minuut klaar en structureel gelijk aan het voorbeeld.
Zonder voorbeeld: demo zonder dit onderdeel (scène 4 eindigt bij de pdf).

### Fase 12 — Demo-klaar & productierijp (3 sessies)

- [ ] **12.1 Team-accounts i4housing** — via `/admin/kantoor/[id]` de zes
  makelaars uit `docs/i4housing-team.md` (namen bevestigd 29 sep; wachtwoorden
  van Quinn; ⚠️ `addMakelaarAccount` mailt direct — aanmaken zonder mail, of pas
  vlak voor de demo); begroeting op
  `/dashboard` met voornaam; teamfoto als banner via het bestaande
  `achtergrond_url`-veld in `HuisstijlForm.tsx` (geen apart `bannerfoto`-veld
  nodig; Quinn keurt de foto goed).
- [x] **12.2 E2e** — `e2e/`: login via slug, dossier aanmaken (< 5 s),
  waardering toont n en pdf-knop, kaart laadt zonder CSP-fout, content
  (`E2E_GENERATE=1`), admin-importhistorie, **RLS-test** met twee kantoren
  (fixture + i4housing) via REST: kantoor A ziet 0 rijen van B.
- [x] **12.3 Performance** — Lighthouse op dashboard/marktanalyse/dossier
  (> 85 performance, > 95 accessibility), `@next/bundle-analyzer`, RPC-timings
  op echte data gelogd in `docs/data/performance.md`.
  Desktop > 85 en a11y 100 gehaald; **mobiel > 85 niet** (alleen het
  dashboard) → vervolg in 12.6.
- [ ] **12.6 Performance mobiel, ronde 2** *(29-30 sep, loopt)* — meten met
  `scripts/meet-lighthouse.mjs` (ingelogd, productie, mediaan van 3 runs;
  nulmeting `docs/data/lighthouse-voor-perfronde.json`: dashboard 87,
  marktanalyse 64, concurrentie 51, woningen 82, dossier 58). Diagnose: het
  LCP-element is overal de h1 uit de server-HTML, 87 % van de LCP is render
  delay (wachten op JS-download en hydratie op traag 4G). Aanpak: recharts lazy
  (P1), `react-dom/server` uit de kaartlagen en dossier-tabs pas mounten bij
  het eerste bezoek (P2), kantoorfonts zonder preload, Plausible `lazyOnload`,
  `sideEffects` + directe imports voor de ui-barrel.
  *Klaar als:* nameting op productie vastgelegd naast de nulmeting; wat de 85
  nog tegenhoudt benoemd.
- [x] **12.4 Feedbackknop** — klein: knop in het avatarmenu → Resend-mail naar
  Quinn met pagina-URL + tekst. Gebruiksoverzicht in `/admin` (schrapbaar).
- [ ] **12.5 Demo-voorbereiding** — ✅ 12.5a `docs/demoscript.md` (§ 2 uitgewerkt tot
  klik-voor-klik, met terugvalplan per scène; 27 sep) · ✅ 12.5b
  `npm run demo:repetitie` (27 sep). Rest: drie demo-dossiers uit echte
  recente adressen (één per fase), Vercel Pro actief, Supabase-check de dag
  ervoor, demo-freeze (branch `demo`, 48 uur geen deploys), generale repetitie
  met screenshots.
- **Klaar als:** alle "klaar als" van fase 1-10 gehaald; generale repetitie
  zonder haperingen; alle checks groen.

### Fase 13 — Publieke site ✅ (27 sep 2026)
Verouderde copy eruit (13.1) en landingspagina herpositioneerd op waardering + marktinzicht, content, white-label en concierge (13.2). Details: `docs/besluiten.md`.

---

## 6. Planning, mijlpalen & schrapvolgorde

| Fase | Sessies | Cumulatief | Week (bij dagelijks werken) |
|---|---|---|---|
| 1 rest | 1 | 1 | 1 |
| 2 datafundament | 4 | 5 | 1-2 |
| 3 dossierkern | 2 | 7 | 2 |
| 4 waardering | 5 | 12 | 3-4 |
| 5 echte data (parallel) | 4 | 16 | 3-5 |
| 6 marktinzichten | 7 | 23 | 5-6 |
| 7 kaart | 4 | 27 | 7 |
| 8 content (parallel mogelijk) | 4 | 31 | 6-8 |
| 9 white-label | 2 | 33 | 8 |
| 10 dossier premium | 3 | 36 | 9 |
| 11 verkoopadvies | 3 (geblokkeerd) | 39 | — |
| 12 demo-klaar | 3 | 42 | 10 |
| 13 publieke site | 2 (parallel) | 44 | — |
| Ontwerpsessies § 3.8 (concurrentie, transacties, waardebepaling, startpagina) | 0 (alle vier gedaan op 17 sep) | 0 | prototype = spec; alleen nog `ontwerpreview` per item |
| Herwerk na ontwerpreviews (15 %) | ~7 | ~55 | |

**Richtdatum demo:** begin tot half december 2026 (week 10-12 vanaf 22 sep),
mits exports in week 1-3 binnen zijn. Loopt het uit: eerst schrappen, nooit de
demo-minimum-lijn overschrijden.

**Mijlpalen**
- **M0** (eind week 2): fase 1 gemerged, fixture live, guard groen.
- **M1** (week 5): waardering v2 op echte data + tussencheck-pdf naar de
  taxateur.
- **M2** (week 7): marktinzichten, concurrentie en kwartaalbericht op echte
  data.
- **M3** (week 9): kaart + content in i4housing-format + login in kantoorstijl.
- **M4** (week 10-11): dossier premium, generale repetitie → demo.

**Schrapvolgorde bij uitloop** (eerst geschrapt bovenaan): fase 13 → na de
demo · 10.4 tijdlijn (Recent bekeken blijft) · 7.2 afspeelknop · 9.2
reset-mail · 10.5 intake tweekoloms · 6.3 concurrentprofiel-drawer (matrix en
aandeel blijven) · 8.5 staging-check · 12.4 gebruiksoverzicht · 5.6 fixture
herijken.

**Parallel werk (subagents, `model: sonnet`, `isolation: worktree`):** fase 8
zodra fase 3 is gemerged (bestanden zonder overlap met fase 4-7); fase 13
zodra fase 1 is gemerged; binnen fase 5 mag 5.3 (geocodering) naast 5.4.

---

## 7. Risico's

| Risico | Mitigatie |
|---|---|
| Exports komen laat of zijn rommeliger dan gedacht | Fixture (2.3) houdt het werk gaande; 5.1 exportanalyse vóór er één regel importcode wordt geschreven; kwaliteitsregels + rapport |
| Brainbay-licentie staat tonen in een platform van een derde niet toe | Schriftelijke bevestiging vóór 5.5 (§ 8); tot die tijd alleen fixture-data in de omgeving |
| Brainbay bevat i4housing's eigen verkopen dubbel t.o.v. Realworks | Ontdubbelen op `adres_sleutel` + ± 90 dagen (5.2), test op de fixture |
| Kantoornamen inconsistent ("i4 Housing B.V." vs "i4housing") | `kantoorNormalisatie` + aliaslijst per kantoor (5.2) |
| Taxateurs vertrouwen de waardering niet | Locatie + index + transparante tabel + WOZ-ijkpunt + backtest + tussencheck M1 |
| Regionale set groter dan verwacht (> 100 k rijen) | RPC-aggregatie is het ontwerp; indexen; timings gelogd in 12.3; werkgebied-filter als standaard |
| Vercel Hobby kapt lange functies af tijdens de demo | Vercel Pro vóór de demo (§ 8); generatie is sinds fase 3 losgekoppeld van het aanmaken en toont een timer |
| Supabase gratis pauzeert na 7 dagen inactiviteit | Dagelijks gebruik; check de dag vóór de demo (12.5) |
| Dataverlies op productie zonder Pro | Back-up vóór elke risicovolle stap; imports terug te draaien |
| Datalek tussen kantoren | RLS + `security_invoker` (fase 0); REST-test met twee kantoren (12.2) |
| Nieuw AI-model verandert de toon | Blinde evaluatieset (8.1) vóór elke wissel |
| Kaarttechniek botst met CSP of performance | Proof van één uur (7.1); Leaflet-terugval achter dezelfde API |
| Grote demo zonder tussentijdse feedback | Scherpe klaar-als-criteria, screenshotreviews, tussencheck M1, generale repetitie |
| Uitloop | Schrapvolgorde § 6; nieuwe ideeën → backlog, nooit het lopende item |

## 8. Acties Quinn

Gecontroleerd op 30 sep 2026. **Blokkeert de demo:**

1. **Brainbay- en Realworks-exports** aanleveren (liefst XLSX/CSV, alle jaren,
   met verkopend én aankopend kantoor en coördinaten als dat kan). Het
   i4-kantoor heeft nu 0 transacties (demo-kantoor: 7.996) — zonder exports
   geen demo op eigen data. Deblokkeert 5.1 → 5.5 → M1.
2. **Brainbay-licentie schriftelijk** laten bevestigen (tonen van regionale
   NVM-data in VestaAI aan i4housing zelf) — vóór 5.5.
3. **Voorbeeld-verkoopadvies** — deblokkeert fase 11 (datalaag staat klaar).

**Klein, kan elk moment:**

4. **Supabase-dashboard, 2 klikken** (nog open, advisor meldt het op 30 sep
   nog): self-signup uit (Auth → Providers → Email → "Allow new users to sign
   up") en leaked-password-protection aan (Auth → Attack Protection).
5. **Team-accounts i4** (12.1): akkoord om de zes accounts aan te maken
   (`docs/i4housing-team.md`), wachtwoorden, en teamfoto goedkeuren.
6. **Akkoord betaalde testruns (paar euro):** smoke-generatie
   (`E2E_GENERATE=1`, meet ook de echte duur NL+EN tegen de 300 s-limiet),
   8.5 staging-testrun, EN-kwartaalbericht tegen de echte API.
7. **Akkoord opruimmigratie** (`20260916_opruimen_ongebruikt.sql`, na
   back-up): 4 legacy-tabellen (`post_planning`, `chatbot_leads`,
   `chatbot_faq`, `referrals`) en 7 kolommen staan er op 30 sep nog. Kandidaat
   om mee te nemen: tabel `wijken` (geen enkele code gebruikt hem meer).
8. **Kantoorprofiel i4 aanvullen:** "opgericht" en kenmerken ontbreken nog
   (de verkoopadvies-gereedheidscheck meldt het).
9. **Oordeel pastelkleuren kaart** (`/marktanalyse/kaart`).
10. **Akkoord: 6 ongebruikte geheimen van Vercel verwijderen** —
    `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/_PRO/_KANTOOR`
    en `CRON_SECRET` (Stripe en de cron zijn sinds 15 sep uit de code; een
    live Stripe-sleutel laten staan is onnodig risico). Claude kan het doen
    via de Vercel-MCP zodra je ja zegt.

**Vóór de demo / later:**

11. **Vercel Pro** activeren (team staat op Hobby; "wachten we even mee", 28 sep).
12. **Tussencheck taxateur:** `docs/waardering-methode.md` (rekenvoorbeeld +
    vijf vragen in § 6) naar de taxateur van i4 Housing, met het prototype
    https://claude.ai/artifact/H1hunisisuRxJLPNHsaXWm (deel-instelling aan);
    contact noemen voor M1.
13. **Blind oordeel content** (8.1, ± 30 min, betaalde calls) — bewust
    uitgesteld (23 sep).
14. **Search Console** + omleiding Vercel-alias (na 1.10).
15. **Artifacts prototypes herpubliceren** (item 0.1): de gepubliceerde
    versies zijn van vóór 0.1; upload werd door auto-mode geblokkeerd.
16. **Vóór het eerste betaalde contract:** Supabase Pro, definitieve
    verwerkersovereenkomst (⚠️ de import is formeel al verwerking — hoort er
    vóór 5.5 te liggen), prijsafspraak. Sentry-account (backlog).

## 9. Backlog & geparkeerd

Opgeschoond op 30 sep 2026 (afgehandeld en daarom weg: Next-upgrade — Next 16
live sinds 29 sep; status concurrentie-v2-RPC's — geverifieerd 27 sep;
database-hardening — toegepast 28 sep; `PLATFORM_ADMIN_EMAILS` — staat lokaal
én op Vercel niet, beide vallen terug op `lib/admin.ts`, dus gelijk).

**Vóór de demo, wacht op data of Quinn:** filter "Verkocht door" op de
verkoopkaart zodra `transacties.makelaar_id` gevuld kan worden (migratie
`20260924190000_transacties_makelaar_id.sql` klaar, niet toegepast; vraagt een
makelaarsveld in de exports) · smoke-generatie, 8.5 en EN-kwartaalbericht één
keer echt draaien (§ 8 punt 6).

**Techniek, klein (bouwbaar zonder input):** 31 meldingen van
`eslint-plugin-react-hooks` v7 op bestaande componenten (niet in de DoD) ·
kantoor-reset
rate-limit is in-memory per instance (zachte rem; tabel als het ooit nodig is) ·
Gemini-modelstring staat in `app/api/fotos/staging/route.ts`, niet in
`lib/aiModellen.ts` (§ 11 noemt alleen Claude-modellen; verhuizen bij 8.5). · preview-deploys hebben
op Vercel alleen `STRIPE_*`/`CRON_SECRET`/`GOOGLE_AI_API_KEY`, de rest van de
env-vars staat alleen op production — een PR-preview is dus niet bruikbaar
om te testen (bewust laten zolang we direct naar `main` mergen).

**Na de demo:** Sentry of vergelijkbare foutmonitoring · streaming van content
naar de UI (nu: timer + skeletons) · A/B-segmentvergelijking uitbreiden ·
keukentafel-/presentatiemodus · maatwerkverzoeken-flow (tabel `verzoeken`,
statusflow, Resend-melding — zie v1) · jaarlijkse CBS-jaargang
(`lib/verrijking.ts`, tabel `85984NED`) · Supabase-mailonderwerpen
vernederlandsen · dossiers aanmaken uit een Realworks-objectexport (hun huidige
aanbod in één keer als dossiers "In verkoop") · 4RENT!-variant van het sjabloon
(zie observatie Verhuur in `docs/besluiten.md`).

**Periodieke actie (geen bouwwerk):** herimport Brainbay/Realworks met
`scripts/import-transacties.mjs` + geocodering — terugkerend voor Quinn.

**Database, bewust zo:** `object_fotos`/`stijl_bewerkingen` zonder policy
(alleen via de service-client, 24 sep nagegaan) · PostGIS/`pg_trgm` in
`public` en `spatial_ref_sys` zonder RLS (Supabase-standaard voor PostGIS,
verplaatsen breekt meer dan het oplevert).

**Ontwerp-kit (oogst item 0.1, 17 sep):** `K.sparkline(waarden)` in `kit.js`
(staat nu gekopieerd in vijf prototypes) · `.btn:disabled` in `kit.css` (twee
prototypes definiëren het lokaal) · mobiele stand van de kit-topbar
(`startpagina.html` heeft een lokale workaround). Alleen de prototypes; de app
heeft eigen componenten.

**Geparkeerd (16 sep):** waardecheck-widget op hun site · ROI-dashboard ·
prijsadvies bij lange looptijd.

## 10. Bewust níet doen

- ❌ **Verhuur** — uit de app (16-17 sep). Niet terugzetten zonder besluit
  (observatie in `docs/besluiten.md`: i4housing doet aantoonbaar verhuur).
- ❌ **Regiolaag op de verkoopkaart** — alleen eigen verkopen, ook in het
  straalpaneel. Regionale data voedt wél waardering, marktanalyse en de
  referentiekaart in het dossier (dat is geen regiolaag maar de onderbouwing
  van één waarde).
- ❌ **Content-kalender, foto-verbetering, object-chatbot** — verwijderd 15 sep.
- ❌ **Zelf aanmelden / prijzen / abonnementen** — geschrapt 15 sep; alles via
  `/admin`.
- ❌ **Kantoor-admin-rol** — vervangen door één rol per kantoor (16 sep).
- ❌ **Regressie voor kenmerk-effecten** — vergelijkbare-paren blijft.
- ❌ **Koperskant** (kopersdatabase, zoekprofielen, bezichtigingen, leads).
- ❌ **Live koppelingen** (Realworks-API, Funda-publicatie, auto-posten,
  WordPress) — alles via kopiëren/plakken of bestandsimport.
- ❌ **Facturatie/boekhouding**, **AI-inbox**, **bezichtigingsplanner**.
- ❌ **Losse primitives-fase of showcasepagina** (v2).
- ❌ **Upload-UI voor grote imports** — script is de weg (v2).

## 11. Permanente kwaliteit

- `npm run typecheck && npm run test` groen vóór elke commit; `build` vóór
  elke PR.
- `transacties` uitsluitend via `lib/transactiesQuery.ts` (guard-test).
- Elke nieuwe tabel met persoons- of transactiedata: RLS per kantoor; elke
  nieuwe view: `security_invoker = true`.
- Elke statistiek toont n en "data t/m"; te weinig data → waarschuwing.
- Elk nieuw scherm: niets breekt op 390 px; Lighthouse landing > 90/95.
- Geen modelstring buiten `lib/aiModellen.ts`; geen Claude-call buiten
  `lib/claude.ts`.
- Geen zelfgebouwde interactieprimitive waar Radix hem levert; geen
  grafiek met library-defaults; geen hero-scherm zonder prototype en
  `ontwerpreview` (§ 3.8).
