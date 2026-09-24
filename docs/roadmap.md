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

- **Fase:** 6 grotendeels af (6.1-6.3 ✅, 6.4 kwartaalbericht open); uit 7, 8, 9,
  10, 12 en 13 zijn losse items vooruit gebouwd door parallelle Sonnet-agents
  (werkwijze: CLAUDE.md § Parallel met agents). Fase 5 geblokkeerd op de exports.
  Opleverdetails staan in `docs/besluiten.md`, niet hier.
- **Laatst opgeleverd (23-24 sep, PR `feat/fase-6`):** 6.1 marktanalyse v2
  (~6 s → ~1,2 s), 6.2 transacties v2, 6.3 concurrentie v2, 7.1 `BasisKaart`
  (MapLibre, proef achter `/marktanalyse/kaart?kaart=v2`), 8.1 `lib/aiModellen.ts`
  + prompt caching + evaluatieset (nog niet gedraaid), 9.1 inloggen in
  kantoorstijl (`/login/i4housing`), 10.3 Buurt & data, 10.4 Recent bekeken,
  10.6 stijl-leren vindbaar, 12.4 feedbackknop, 13.1 publieke copy. Plus: CSP liet
  Plausible nooit toe (gerepareerd), kantoorkleuren ontbraken in alle
  Radix-portals (gerepareerd via `brandingRootCss()`). Zeven migraties toegepast
  (alle additief of achterwaarts compatibel, na back-up).
- **Volgende items:** **6.4** kwartaalbericht (gebruikt `lib/aiModellen.ts`) ·
  **7.2** verkoopkaart-explorer v2 op `BasisKaart` (daarna 7.3, 7.4) · **8.2**
  tekstsjabloon-model · **10.1/10.2** woningen- en dossierheader v2. Deze zijn
  grotendeels onafhankelijk → weer parallel te verdelen (6.4 en 8.2 raken allebei
  `lib/claude.ts`: niet tegelijk).
- **Buurt & data (24 sep, opgelost op `feat/sessie-24sep`):** Overpass is
  overbelast, niet stuk → terugval-mirror + CBS-buurtafstanden; WOZ per woning
  is **niet gekoppeld** (loket heeft geen toegestane API) → CBS-buurtgemiddelde
  als ijkpunt. Scène 4 ("BAG/WOZ vullen voor", "WOZ ernaast") hangt af van
  Quinns keuze voor een WOZ-bron (§ 8, punt 14). Details: `docs/besluiten.md`.
- **Prestatie (dev, demo-kantoor):** marktanalyse ~1,2 s, transacties ~1,2 s,
  concurrentie ~1,6 s eerste load. Productiemeting volgt in 12.3.
- ⚠️ NL+EN-contentgeneratie duurt ~3 min tegen een Vercel-limiet van 300 s → fase 8.
- **Blokkades (geen van alle blokkeert het bouwen):**
  - Verwerkersovereenkomst i4housing (concept: `docs/verwerkersovereenkomst-concept.md`)
    juridisch toetsen + tekenen vóór de import van echte data (fase 5.5).
  - Brainbay- en Realworks-exports nog niet ontvangen (fase 5.1; status 23 sep).
  - Brainbay-licentievoorwaarden: schriftelijk bevestigen dat tonen van
    regionale NVM-data in een platform van een derde (VestaAI) is toegestaan.
  - Voorbeeld-verkoopadvies van Quinn (fase 11 — bewust geblokkeerd).
  - Twee handmatige Supabase Auth-instellingen (dashboard): self-signup uit,
    leaked-password-protection aan.
  - Vercel-team staat op **Hobby**: vóór de demo naar Pro, zie § 8.
- **Open vragen voor Quinn:** WOZ-bron voor scène 4 (§ 8, punt 14)? ·
  blinde evaluatieronde content (8.1) draaien? ·
  pastelkleuren van de nieuwe kaart goed (`?kaart=v2`)?

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
| 1 | **"Dit is óns platform"** (2 min) | `/login/i4housing` in hun stijl → startpagina "Goedemorgen Marc" met teamfoto, kerncijfers uit hún data (verkocht 12 mnd, gem. looptijd, marktaandeel Wassenaar, prijs t.o.v. vraagprijs), recent bekeken, deze week — geen snelkoppelingen (besluit 17 sep) | Het is hun platform | 1.9 · 1.10 · 2.5 · 9.1 · 10.4 · 12.1 |
| 2 | **"Eindelijk snappen we onze data"** (5 min) | Marktinzichten → filters (Wassenaar · vrijstaand · 24 mnd) → kerncijfers met delta t.o.v. vorige periode, grafieken prijs/€ per m²/looptijd, segment A vs B → knop **Kwartaalbericht** → Claude schrijft hun Q3-marktupdate in hun toon met de echte cijfers | Inzicht + uren bespaard | 2.2 · 6.1 · 6.4 |
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

### Fase 1 — UI-fundament + nieuwe schil (1.1-1.8 ✅ · rest 1 sessie)

- [x] **1.9 Bugs + fallback-opruiming**
  *Doel:* laatste zichtbare groen weg en het fallback-lek dichten.
  *Raakt:* `components/StatusToggle.tsx:10` (kapotte class),
  `components/FaseToggle.tsx:15,81` en `StatistiekenPaneel.tsx:89`
  (hardgecodeerd groen), demo-knop alleen in dev/demo, `app/globals.css`,
  `.claude/hooks/huisstijl-check.sh`.
  *Spec:* (a) alle `var(--merk…, #hex)`-fallbacks in `app/(app)/` en
  `components/` (behalve de uitzonderingen uit CLAUDE.md) → `var(--merk…)`;
  (b) de fallbacks één keer centraal in `globals.css` op `:root` (VestaAI-groen
  als default, zodat een kapotte kantoor-lookup wél zichtbaar groen wordt maar
  niet meer per component verstopt zit); (c) hook uitbreiden met een check op
  `var\(--merk[a-z-]*,\s*#`. Doe (a) met één zoek-vervang plus visuele controle
  op 3 pagina's. (d) Verouderde verwijzingen in code-comments bijwerken:
  `components/ui/StatTile.tsx:11` (`motion` fase 2.2 → geen library, zie
  ontwerpprincipes) en `app/globals.css:8` (`roadmap.md § Besluitenlogboek` →
  `docs/besluiten.md`). (e) **i4 Housing `huisstijl_json.vorm` van `strak`
  naar `zacht`** (besluit 17 sep, Apple-achtig) via
  `scripts/repair-i4housing-branding.mjs --write`, en `lib/branding.ts`
  uitbreiden met `--merk-diep`, `--merk-licht`, `--merk-accent-zacht/-rand/-rgb`
  (afgeleid uit primaire/accentkleur; zie `docs/ontwerp/README.md` § 2).
  *Klaar als:* `scripts/controleer-huisstijl.mjs` meldt niets; grep op
  `var(--merk` met een hex erin geeft 0 buiten de uitzonderingen.
- [x] **0.1 Prototypes bijtrekken naar het referentiebeeld** *(feedback
  Quinn 17 sep; 1 korte sessie, Sonnet-agents per bestand, geen app-code)*
  *Doel:* alle zes prototypes in `docs/ontwerp/` zien eruit als
  `concurrentie.html` / `startpagina.html` / `waardebepaling.html`
  (README § 1 referentiebeeld + regel 2b), zodat "prototype = spec" één stijl
  betekent.
  *Raakt:* `docs/ontwerp/transacties.html` (grootste afwijking), `marktanalyse.html`,
  `verkoopkaart.html`; README-bestandstabel; artifacts opnieuw publiceren
  (zelfde URL's via `url`, links in `docs/besluiten.md` 17 sep).
  *Spec transacties:* boven de tabel een tegelrij zoals concurrentie: hero
  "n transacties in selectie" (merkverloop, delta t.o.v. vorige periode,
  sparkline) + tegels mediaan prijs, mediaan € per m², mediaan looptijd, %
  boven vraagprijs (elk met n); tabel in een kaart met kaartkop (titel +
  ondertitel "gesorteerd op …"); sortering als segmented in de kaartkop i.p.v.
  losse dropdown; rode microdetails: live-stip, tel-badges, notificatie-stip
  op "Exporteer CSV" als er een export klaarstaat. De dichte tabel, sheet en
  filters blijven zoals ze zijn.
  *Spec navigatie en startpagina (besluit Quinn 17 sep, avond):* `kit.js`
  `topbar()` wordt plat — zes pillen Overzicht · Woningdossier · Marktanalyse ·
  Transacties · Concurrentie · Verkoopkaart, geen subnav meer (centraal in de
  kit, want het raakt alle prototypes); `startpagina.html` zonder
  snelkoppelingen, zonder winratio-tegel (→ "Prijs t.o.v. vraagprijs"), zonder
  "pitches deze week"/"pitch gewonnen" (→ "verkoopadvies verstuurd"), en de
  dossierheader zonder pitch-uitslag-schakelaar en met fasestap "Verkoopadvies"
  i.p.v. "Acquisitie"; `waardebepaling.html` dossierheader idem.
  *Spec marktanalyse/verkoopkaart:* kaartkoppen en tegels op de norm brengen,
  placeholders neutraal, 2-3 rode microdetails per scherm (databadge-stip,
  tel-badges, pin-ring op de kaart, accentstreepje bij het kwartaalbericht),
  overlays dimmen zonder blur.
  *Klaar als:* per bestand een screenshot op 1280 px naast het referentiebeeld
  beoordeeld (vision-subagent, checklist `ontwerpreview`) met AKKOORD in
  `docs/besluiten.md`; geen console-fouten; kit.css/kit.js alleen aangepast
  als een regel in álle prototypes terugkomt (dan centraal, met notitie).
- [x] **1.9c Geen pitch-concept, platte navigatie, startpagina zonder snelkoppelingen** *(besluit Quinn 17 sep, avond)*
  *Doel:* het product vertelt niet meer dat er een pitch gewonnen moet worden;
  de opdracht is zo goed als binnen zodra het verkoopadvies op papier staat.
  Navigatie wordt plat en de startpagina rustiger.
  *Raakt:* `components/AppTopbar.tsx`, `app/(app)/dashboard/page.tsx` +
  `Snelkoppelingen.tsx` (weg) + `Kerncijfers.tsx`, `lib/kerncijfers.ts` (+ test),
  `app/(app)/woningen/page.tsx` + `WoningenClient.tsx` + `PitchScorebord.tsx`
  (weg), `app/(app)/object/[id]/FaseToggle.tsx` + `actions.ts` + `page.tsx`,
  `lib/schemas.ts` (`PitchUitslagSchema` weg), `lib/supabase.ts` (type),
  `app/(app)/marktanalyse/layout*` (subnav weg), CLAUDE.md § Fasemodel.
  *Spec:* (a) topbar plat, zes pillen zonder dropdowns: Overzicht ·
  Woningdossier (→ `/woningen`) · Marktanalyse · Transacties · Concurrentie ·
  Verkoopkaart; de subnav van marktinzichten vervalt; actieve pil zoals in de
  prototypes (`docs/ontwerp/kit.js` `topbar()` na item 0.1). (b) "Woning
  toevoegen" verhuist naar de kop van `/woningen` als primaire knop; de
  snelkoppelingen op de startpagina verdwijnen. (c) Pitch-concept weg:
  `PitchScorebord`, winratio-tegel, uitslag-schakelaar in `FaseToggle`, de
  server action voor de uitslag, `PitchUitslagSchema`; de kolom
  `objecten.pitch_uitslag` blijft tot 2.1 in de database staan (geen migratie
  nu) maar wordt nergens meer gelezen of geschreven. (f) **Fase "Acquisitie"
  heet overal "Verkoopadvies"** (besluit Quinn 17 sep): labels in
  `FaseToggle`, `ObjectWorkspace`, `/woningen`-filters, lege staten, seed-
  content en hints; de interne waarde `acquisitie` blijft tot 2.1. De fasestap Verkoopadvies →
  In verkoop zet de makelaar handmatig (bestaande `FaseToggle`). (d) De
  vrijgekomen kerncijfer-tegel wordt "Prijs t.o.v. vraagprijs" (eigen verkopen,
  12 mnd, met n). (e) Teksten die "pitch" zeggen (hints, lege staten,
  seed-content) herschrijven naar "verkoopadvies".
  *Klaar als:* `grep -ri pitch app components lib` geeft 0 treffers buiten
  historische comments; typecheck/test groen; screenshots van dashboard,
  woningen en topbar op 1280 px; CLAUDE.md-boom klopt.
- [x] **1.9b DoD-tooling lokaal werkend** *(oogst van de proefrit, 17 sep)*
  *Doel:* de Definition of Done moet zonder handwerk uitvoerbaar zijn, anders
  wordt hij overgeslagen — precies wat de proefrit liet zien.
  *Raakt:* `scripts/screenshots.mjs`, `scripts/controleer-huisstijl.mjs`,
  `CLAUDE.md` § Omgeving, `.claude/skills/sessie-afronden/SKILL.md`,
  `.claude/skills/ontwerpreview/SKILL.md`.
  *Spec:* (a) `screenshots.mjs` draait lokaal niet: `E2E_TEST_EMAIL` ontbreekt
  in `.env.local` en de magic-link-redirect wijst naar productie i.p.v.
  `localhost` — laat het script inloggen zoals `controleer-huisstijl.mjs`
  (sessiecookie via `sessieCookie()`, deel die helper) en documenteer de
  vereiste env-variabelen bovenin het script én in CLAUDE.md; (b) beide
  scripts falen (exit 1) op een runtime-fout (foutstaat "Er is iets
  misgegaan", `nextjs-portal`, `pageerror`) — in `controleer-huisstijl.mjs`
  op 17 sep gedaan, `screenshots.mjs` volgt; (c) één npm-script
  `npm run dod:screens` dat beide op 390/1280/1920 px draait; (d) de
  DoD-regel in § 4 en de twee skills verwijzen daarna alleen nog naar dat
  commando.
  *Klaar als:* `npm run dod:screens` slaagt op een schone checkout met
  `.env.local`, en faalt aantoonbaar als een pagina de foutstaat toont.
- [x] **1.10 Google-logo & SEO-basis** — `app/icon.png`, `favicon.ico`,
  `apple-icon.png`; manifest repareren; canonical + JSON-LD; opengraph-image;
  robots/sitemap (met `/woningen`, `/account`, `/dashboard` in disallow).
  *Klaar als:* alle icoon-URL's geven 200 op productie.
- [x] **1.11 PR `feat/nieuwe-schil` → `main`**; deploy READY; screenshots van
  dashboard, woningen, dossier, marktanalyse bewaard als referentie.
  *Gedaan 18 sep:* PR #20 gemerged (25 commits, fases 2.2 t/m 4), productie-
  deploy READY op vestaai.nl, rooktest op alle ingelogde routes + de pdf-route
  groen, geen runtime-fouten. Hiermee draait `main` weer op hetzelfde schema
  als de database.
- **Klaar als:** 1.9-1.11 gedaan en de "klaar als"-lijst van v1 (geen blauwe
  balk/Verhuur, avatarmenu, startpagina, `/woningen`, account, kantoorpagina)
  blijft groen.

### Fase 2 — Datafundament & demo-fixture ✅ (17 sep 2026)

Schema v2 + `imports` (2.1), `lib/transactiesQuery.ts` met RPC's en guard (2.2),
demo-fixture "Demo Makelaardij" (2.3), foutlogging `meldFout` (2.4), kerncijfers
op transactiedata (2.5). Details en besluiten: `docs/besluiten.md` 17 sep.
**Open tussenfase:** verkenners krijgen nog alle rijen via
`haalTransactiesVoorVerkenner`; fase 6 zet ze op de RPC's.

### Fase 3 — Dossierkern: aanmaken zonder wachten ✅ (17 sep 2026)

Dossier aanmaken zonder Claude + `content_status`-lock (3.1), intake met
woningtype-groep/-subtype (3.2), `object/new` niet meer vergrendeld (3.3),
`DossierHeader` met klikbare fasestepper en `fase_sinds` (3.4). Details:
`docs/besluiten.md` 17 sep. ⚠️ NL+EN-generatie ~3 min tegen 300 s limiet → fase 8.

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
- [ ] **5.2 Importscript** `scripts/import-transacties.mjs --bron brainbay|realworks --bestand <pad> [--write]`
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
- [ ] **5.3 Geocodering** `scripts/geocodeer-transacties.mjs`: hergebruik
  `pdokLookup` uit `lib/verrijking.ts`; postcode + huisnummer → `exact`,
  straat + plaats → `benaderd`, anders `mislukt`; hervatbaar op
  `geocode_status is null`; ~10 verzoeken/s; rapport; alleen rijen zonder `geo`.
- [ ] **5.4 `/admin/transacties` v2** — importhistorie (bron, datum, nieuw/
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

### Fase 6 — Marktinzichten, concurrentie & kwartaalbericht (7 sessies)

- [x] **6.0 Primitives-basis uit Radix** (1 sessie, § 3.8) — `npm i` van de
  Radix-primitives via het shadcn/ui-patroon (`components/ui/` blijft de
  barrel; geen aparte `ui`-map ernaast), thema-mapping van shadcn's CSS-
  variabelen op `--merk*` (kleur, `--merk-radius-*`, font) in `globals.css`,
  `Sheet`/`Popover`/`Slider`/`Tooltip`/`Select`/`Tabs` beschikbaar en
  gethemed, TanStack Table geïnstalleerd. Eén werkend voorbeeld: de `Drawer`
  (Sheet) die 6.2 en 4.4 gebruiken. ⚠️ De Tailwind-`blue`-remap in
  `tailwind.config.ts` blijft staan; shadcn gebruikt semantische tokens, geen
  `blue`-schaal.
  *Klaar als:* elk van deze primitives rendert in i4housing-stijl (strak,
  merkkleur) én in VestaAI-stijl (zacht, groen) zonder hardgecodeerde kleur.
  *Opgeleverd 19 sep, mét één afwijking van deze spec.* **Wél** de zes Radix-
  primitives + TanStack Table; **niet** het shadcn-class-patroon. Reden: shadcn
  stuurt kleur via Tailwind-classes op een eigen tokenlaag
  (`--background`/`--primary`/…), en die laag zou naast `components/ui/tokens.ts`
  een tweede waarheid worden die synchroon gehouden moet blijven — precies de
  drift waar de VestaAI-groen-bugs vandaan kwamen. Bovendien verbiedt de
  bouwregel in CLAUDE.md Tailwind-kleurclasses achter de login (de `blue`-schaal
  rendert groen). De primitives zijn daarom inline gestyled met `tokens.ts` +
  `var(--merk*)`, net als alle bestaande primitives; alleen wat een inline style
  niet kán uitdrukken (`[data-state]`, `:focus-visible`, `[data-highlighted]`)
  staat als `.vui-*` in `globals.css`, inclusief `prefers-reduced-motion`.
  Geen `clsx`/`cva`/`tailwind-merge` toegevoegd. De Radix-winst (focus-trap,
  Escape, scroll-lock, focus-herstel, botsingscorrectie, toetsenbordnavigatie)
  is volledig binnen. Bewijs in productie: de drawer "Referentie toevoegen"
  (4.4) draait nu op `Sheet`, met de handmatige Escape-listener eruit.
- [x] **6.1 Marktanalyse-explorer v2** *(port van `docs/ontwerp/marktanalyse.html`
  — bouwt daarbij `FilterBar`, `ChartCard`, `useFilterState`, `lib/opmaak.ts`,
  `lib/grafiekThema.ts`)*
  *Raakt:* `components/MarktanalyseExplorer.tsx`, `app/(app)/marktanalyse/page.tsx`,
  nieuwe primitives in `components/ui/`, `lib/opmaak.ts` (+ tests),
  `lib/grafiekThema.ts`, `hooks/useFilterState.ts` (+ test).
  *Ontwerp:* het prototype (+ `kit.css`/`kit.js`, `docs/ontwerp/README.md`)
  is leidend voor layout, staten en interactie: frosted filterbalk met
  dropdown-filters (plaats/wijk met zoekveld, woningtype-taxonomie met
  subtypes, prijs- en oppervlakschuivers, "Meer filters" met bouwjaar/
  energielabel/kamers/perceel/kenmerken/t.o.v. vraagprijs), periode-segmented,
  actieve filterpillen, segment B; hero-tegel in merkblauw + 4 tegels met
  delta en sparkline; 2 vloeiende lijngrafieken met verloopvlak/crosshair/
  eindlabels; looptijd-staven met wij-lijn; prijsklasse-balken met
  crossfilter; kwartaalbericht-modal. Onderstaande tekst is de samenvatting,
  niet de bron.
  *Spec boven de vouw:* `FilterBar` (plaats/wijk multi-select met chips,
  typegroep-`SegmentedToggle`, periode-presets 12/24/36 mnd + eigen bereik,
  "vergelijk met segment B" als tweede rij) → rij van 5 `StatTile`s met delta
  t.o.v. de vorige periode (mediaan prijs, mediaan € per m², mediaan looptijd,
  % t.o.v. vraagprijs, aantal) → twee `ChartCard`s naast elkaar (prijs & € per
  m² per kwartaal; looptijd per kwartaal), daaronder verdeling naar
  prijsklasse (staven, klik = filter → crossfilter) en typegroep. Elke kaart:
  n, "data t/m", skeleton bij laden. Standaardfilter = werkgebied van het
  kantoor. Filterstand in de URL.
  *Data:* `marktanalyseReeks` + `marktanalyseSamenvatting` (regionaal),
  `haalEigenVerkopen` voor de eigen lijn in dezelfde grafiek ("wij" vs
  "markt").
- [x] **6.2 Transacties opzoeken v2** *(ontwerpsessie gedaan 17 sep →
  `docs/ontwerp/transacties.html`, § 3.8)* — `DataTable` (TanStack,
  server-gepagineerd via `zoekTransacties`, 50/pagina, sorteerbaar, dichte
  rijen zoals Stripe), `Sheet` met alle velden + minikaart, "gebruik als
  referentie" (4.4), CSV-export uitsluitend eigen verkopen (client-side uit
  `haalEigenVerkopen`). URL-state.
- [x] **6.3 Concurrentie v2** *(ontwerpsessie gedaan 17 sep →
  `docs/ontwerp/concurrentie.html`, § 3.8)* — marktaandeel per plaats/typegroep/prijsklasse
  met het eigen kantoor uitgelicht (merkkleur) en trend per jaar; matrix "wie
  wint waar" (plaats × typegroep → top-kantoor + aandeel); "wij vs. markt"
  (looptijd, prijs t.o.v. vraagprijs, € per m²); concurrentprofiel in een
  `Drawer` (top 8, schrapbaar). Werkt op `verkopend_kantoor_norm`; eerlijke
  lege staat als dat veld leeg is. *Hergebruik:* `lib/concurrentie.ts` als
  referentie-implementatie voor de RPC-tests.
- [ ] **6.4 Kwartaalbericht** — knop "Schrijf kwartaalbericht" in de
  marktanalyse: `lib/kwartaalbericht.ts` bouwt een feitenblad (uitsluitend
  cijfers uit `marktanalyseSamenvatting` + reeks: mediaan prijs, € per m²,
  looptijd, aantal, delta's, eigen aandeel), Claude schrijft 250-350 woorden in
  de kantoortoon (stijlprofiel), NL en optioneel EN; **guardrail:** elk getal
  in de tekst moet in het feitenblad voorkomen (controle na generatie; anders
  één keer opnieuw); resultaat in een `Modal` met kopiëren en download `.md`.
  Geen opslag. Model via `lib/aiModellen.ts`.
- **Klaar als:** de kernvragen uit scène 2 en 3 in ≤ 3 klikken; filters in de
  URL; delta's kloppen (test tegen pure functie); kwartaalbericht bevat geen
  cijfer dat niet in het feitenblad staat.

### Fase 7 — Kaart (4 sessies)

- [x] **7.1 Proof + `BasisKaart`** *(§ 3.5)* — proof van één uur (MapLibre +
  PDOK-vectortiles + CSP op een preview-deploy); dan `components/kaart/BasisKaart.tsx`,
  `VerkopenLaag` (markers in merkkleur, clustering > 200 punten), `StraalLaag`
  (cirkel), `HoverKaart` (adres · prijs · datum · m²). `npm i maplibre-gl`.
- [ ] **7.2 Verkoopkaart-explorer v2** *(port van `docs/ontwerp/verkoopkaart.html`,
  § 3.8; het prototype gebruikt een statische PDOK-achtergrond omdat een
  artifact geen tiles mag laden — in de app is dit MapLibre met live tiles)*
  — eigen verkopen als mini-beeldmerk-pins (blauwe ruit, rode omlijning) op
  de pastel-basiskaart, tijdlijn (`Slider`) met afspeelknop (schrapbaar),
  dropdown-filters (woningtype-taxonomie, prijs, oppervlak, verkocht door
  teamlid, meer), actieve filterpillen, kerncijfers "in beeld" met hero-tegel,
  zijlijst (sorteren datum/prijs/looptijd) gesynchroniseerd met kaart en
  hover, frosted hover-kaart, URL-state;
  kaart en filters reageren < 100 ms (client-side op `haalEigenVerkopen`).
- [ ] **7.3 Straal per woning** — `StraalKaartPaneel` op `BasisKaart`, standaard
  500 m, schuiver 100-1.000 m, alleen eigen verkopen; de referentiekaart in de
  waardering (4.6) schakelt over naar `BasisKaart`.
- [ ] **7.4 Leaflet opruimen** — `Verkoopkaart.tsx`/`VerkoopkaartClient.tsx`,
  `leaflet`/`react-leaflet`/`@types/leaflet` uit `package.json`, CSP-regels.
- **Klaar als:** vloeiend met de volledige eigen dataset; geen CSP-fouten;
  één kaartstack in de codebase.

### Fase 8 — Content in i4housing-format (4 sessies; parallel via subagent in een worktree zodra fase 3 is gemerged — raakt `lib/claude.ts`, `lib/schemas.ts` (alleen `ContentOutputSchema`/`HuisstijlSchema`), `components/ResultTabs.tsx`, pdf-routes, `HuisstijlForm.tsx`)

- [x] **8.1 `lib/aiModellen.ts` + prompt caching + evaluatieset** —
  modelconstanten (§ 3.6), `cache_control` op systeemprompt; `docs/evaluatie/`
  met 5 dossiers (JSON-fixtures, echte i4housing-achtige woningen) en
  `scripts/evalueer-content.mjs` dat per dossier twee anonieme varianten
  (A/B: huidig vs kandidaat-model of oud vs nieuw sjabloon) naar
  `docs/evaluatie/rondes/<datum>/` schrijft voor een blind oordeel door Quinn.
- [ ] **8.2 Tekstsjabloon-model** *(§ 3.4)* — schema, promptbouwer (rendert
  koppen als harde structuur, `doel_woorden`), validator + één herkansing,
  admin-formulier in `app/admin/kantoor/HuisstijlForm.tsx` (label, secties,
  slotzin, doel_woorden, EN-koppen), i4housing-preset via
  `scripts/repair-i4housing-branding.mjs` (uitbreiden; dry-run). Tests op
  promptrender en validator.
- [ ] **8.3 Outputset v2 + ervaring** — `ContentOutputSchema` v2 (oude sleutels
  optioneel), `sneak_preview`, extra's via `POST /api/object/[id]/extra?type=`,
  `ResultTabs`: kern-tabs + "Meer…"-menu voor extra's, timer + skeleton per tab
  (3.1), Funda-tekst NL en EN náást elkaar op ≥ 1280 px, kopieerknop per veld.
- [ ] **8.4 Brochure-pdf in kantoorstijl** — logo, kleuren, lettertype, foto's
  uit `FotoBibliotheek`, kenmerkentabel uit de intake, `brochure_stijl.slot_tekst`;
  vergelijk naast een echte i4housing-brochure (uit `seed-i4housing-content.mjs`).
- [ ] **8.5 Virtual staging model-check** (schrapbaar) — `gemini-2.0-flash-exp`
  pinnen of vervangen door het huidige stabiele beeldmodel; één testrun.
- **Klaar als:** blinde vergelijking gewonnen (Quinn); i4housing-tekst volgt het
  sjabloon 1-op-1 in NL en EN; brochure niet te onderscheiden van hun eigen werk;
  scène 5 loopt met timer.

### Fase 9 — White-label-wow (2 sessies)

- [x] **9.1 Inloggen in kantoorstijl** — kolom `kantoren.slug` (migratie),
  `app/login/[slug]/page.tsx` (logo, kleuren, sfeerbeeld, tabtitel/favicon van
  het kantoor), middleware laat `/login/` door, na uitloggen terug naar de
  laatst gebruikte slug (cookie), `/login` zonder slug blijft VestaAI-groen.
- [ ] **9.2 Reset-mail in kantoorstijl** (schrapbaar) — `generateLink` +
  Resend-sjabloon met logo/kleuren.
- [ ] **9.3 Consistentiecontrole** — `scripts/controleer-huisstijl.mjs` draaien
  op alle routes incl. pdf's en lege staten; alles wat groen doorlaat fixen.
- **Klaar als:** van inloglink tot pdf nergens VestaAI-groen of de naam
  (behalve de topbar-lockup).

### Fase 10 — Woningdossier premium (3 sessies)

- [ ] **10.1 `/woningen` v2** — tabel- en kaartweergave (`BasisKaart`), zoeken,
  filters fase/makelaar, URL-state, knop "Woning toevoegen" in de kop (sinds
  1.9c); `PitchScorebord` is vervallen.
- [ ] **10.2 Dossierheader v2** — foto (eerste uit `FotoBibliotheek` of
  merkverloop), waarde/vraagprijs/dagen-in-fase als `StatTile`s, acties
  (pdf, content, fase).
- [x] **10.3 Verrijkingsdata in het dossier** — tab "Buurt & data": WOZ,
  CBS-buurtcijfers, voorzieningen (uit `lib/verrijking.ts`, al opgehaald bij
  de intake; opslaan in `objecten.verrijking_json` via migratie).
- [x] **10.4 `gebruik_events` + Recent bekeken + tijdlijn** — tabel
  `gebruik_events` (kantoor_id, makelaar_id, object_id, type, created_at; RLS),
  `lib/gebruik.ts` `logGebruik()`, `RecentBekeken` op `/dashboard`;
  dossiertijdlijn (schrapbaar).
- [ ] **10.5 Intake tweekoloms** (schrapbaar) — wizard links, `WoningdataPanel`
  rechts, `AppPagina` volle breedte op `object/new`.
- [x] **10.6 `StijlLerenPaneel` vindbaar** — vaste plek onder de teksten met
  teller "3 bewerkingen wachten op je oordeel".
- **Klaar als:** dossier leest als één verhaal; fase in één oogopslag.

### Fase 11 — Verkoopadvies (2-3 sessies; **geblokkeerd** tot Quinns voorbeeld er is)

Datacontract alvast vast: `VerkoopadviesInput = { dossier (intake),
waardering (v2), kantoor (instellingen: courtage, profiel, werkgebied),
marktcontext (marktanalyseSamenvatting voor plaats + typegroep), makelaar }`.
Losse, herschikbare secties in `@react-pdf/renderer` in kantoorstijl; het
`VerkoopadviesPaneel` komt terug in de verkoopadviesweergave zodra dit bestaat.
**Klaar als:** binnen 1 minuut klaar en structureel gelijk aan het voorbeeld.
Zonder voorbeeld: demo zonder dit onderdeel (scène 4 eindigt bij de pdf).

### Fase 12 — Demo-klaar & productierijp (3 sessies)

- [ ] **12.1 Team-accounts i4housing** — via `/admin/kantoor/[id]` de vijf
  makelaars met hun echte naam (wachtwoorden van Quinn); begroeting op
  `/dashboard` met voornaam; teamfoto als banner via het bestaande
  `achtergrond_url`-veld in `HuisstijlForm.tsx` (geen apart `bannerfoto`-veld
  nodig; Quinn keurt de foto goed).
- [ ] **12.2 E2e** — `e2e/`: login via slug, dossier aanmaken (< 5 s),
  waardering toont n en pdf-knop, kaart laadt zonder CSP-fout, content
  (`E2E_GENERATE=1`), admin-importhistorie, **RLS-test** met twee kantoren
  (fixture + i4housing) via REST: kantoor A ziet 0 rijen van B.
- [ ] **12.3 Performance** — Lighthouse op dashboard/marktanalyse/dossier
  (> 85 performance, > 95 accessibility), `@next/bundle-analyzer`, RPC-timings
  op echte data gelogd in `docs/data/performance.md`.
- [x] **12.4 Feedbackknop** — klein: knop in het avatarmenu → Resend-mail naar
  Quinn met pagina-URL + tekst. Gebruiksoverzicht in `/admin` (schrapbaar).
- [ ] **12.5 Demo-voorbereiding** — `docs/demoscript.md` (§ 2 uitgewerkt tot
  klik-voor-klik, met terugvalplan per scène), drie demo-dossiers uit echte
  recente adressen (één per fase), Vercel Pro actief, Supabase-check de dag
  ervoor, demo-freeze (branch `demo`, 48 uur geen deploys), generale repetitie
  met screenshots.
- **Klaar als:** alle "klaar als" van fase 1-10 gehaald; generale repetitie
  zonder haperingen; alle checks groen.

### Fase 13 — Publieke site (parallel via subagent, 2-3 sessies; niet kritiek)

Start na de merge van fase 1 (voorkomt conflicten in `app/layout.tsx`).
- [x] 13.1 Verouderde copy eruit (`over-ons`, `privacy`, metadata/OG).
- [ ] 13.2 `LandingPageClient.tsx` herpositioneren naar het nieuwe verhaal
  (data + waardering + content, één klant, geen prijzen).
- **Klaar als:** geen claim in strijd met het huidige model; Lighthouse > 90/95.

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

1. **Vóór fase 5.5:** verwerkersovereenkomst juridisch laten toetsen en
   tekenen; **Brainbay-licentievoorwaarden schriftelijk** laten bevestigen
   (tonen van regionale NVM-data in VestaAI aan i4housing zelf).
2. **Week 1-3:** volledige Brainbay- en Realworks-exports ophalen (liefst
   XLSX/CSV, alle jaren, met verkopend én aankopend kantoor en coördinaten als
   dat kan).
3. **Supabase-dashboard:** self-signup uit (Auth → Providers → Email) en
   leaked-password-protection aan (Auth → Policies).
4. **Vercel Pro** activeren vóór fase 12 (team staat op Hobby).
5. Teamfoto i4housing goedkeuren (12.1) en de vijf namen + wachtwoorden
   aanleveren.
6. **Tussencheck taxateur:** `docs/waardering-methode.md` (met het
   rekenvoorbeeld en de vijf vragen in § 6) naar de taxateur van i4 Housing
   sturen, samen met de link naar het prototype
   https://claude.ai/artifact/H1hunisisuRxJLPNHsaXWm (deel-instelling
   aanzetten). Antwoorden verwerken in § 3.3 vóór item 4.3 het paneel omzet.
6. Search Console + omleiding Vercel-alias (na 1.10).
7. Blind oordeel in de evaluatieset (8.1) — één keer, ± 30 minuten.
8. Contact voor de tussencheck M1 (welke taxateur, welk adres).
9. Voorbeeld-verkoopadvies (deblokkeert fase 11).
10. Akkoord op de opruimmigratie (na back-up).
11. Vóór het eerste betaalde contract: Supabase Pro, definitieve
    verwerkersovereenkomst, prijsafspraak.
13. ~~Branch pushen + PR #17 mergen~~ — geen actie meer voor Quinn: Claude
    pusht, merget en zet live bij "rond af" (besluit 17 sep, CLAUDE.md).
    Wel daarna: Search Console (punt 6).
14. **WOZ per woning (scène 4):** kiezen tussen (a) een betaalde WOZ-API — o.a.
    Altum AI (al in gebruik bij Dealwijs; prijs per call en voorwaarden voor
    gebruik in een klantplatform nog te checken) of woz-api.nl; (b) de makelaar
    vult de WOZ uit de beschikking van de verkoper in bij de intake (gratis,
    één veld); (c) zo laten: CBS-buurtgemiddelde. Advies Claude: (b) nu, (a)
    alleen als i4housing het automatisch wil. Bouwen = `fetchWoz` in
    `lib/verrijking.ts` + `WOZ_GEKOPPELD`.
12. **Artifacts prototypes herpubliceren** (item 0.1): de zes bijgewerkte
    bestanden staan lokaal, de gepubliceerde versies zijn nog van vóór 0.1.
    Toestemming geven voor de upload (auto-mode blokkeerde hem), of zelf laten
    doen in een sessie zonder auto-mode.

## 9. Backlog & geparkeerd

**Vóór de demo oppakken (uit de sessie van 23-24 sep):** omweg `vorigePeriodeFilter()` weghalen nu de SQL-fix is toegepast (12.3) ·
minikaart in de transactie-sheet op `BasisKaart` (7.2) · gedeelde kop
"Zoeken in de markt" in `app/(app)/marktanalyse/layout.tsx` weg zodra alle
vier verkenners een eigen kop hebben (kop-op-kop) · pastelkleuren van de kaart
laten beoordelen door Quinn (`pdokPastelStijl()`).

**Backlog na de demo:** Sentry of vergelijkbare foutmonitoring · streaming van
content naar de UI (nu: timer + skeletons) · statische kaart in de
waardebepaling-pdf · A/B-segmentvergelijking uitbreiden · keukentafel-/
presentatiemodus · maatwerkverzoeken-flow (tabel `verzoeken`, statusflow,
Resend-melding — zie v1) · ⌘K zoeken · Next 15-upgrade · jaarlijkse
CBS-jaargang (`lib/verrijking.ts`, tabel `85984NED`) · Supabase-mailonderwerpen
vernederlandsen · dossiers aanmaken uit een Realworks-objectexport (hun huidige
aanbod in één keer als dossiers "In verkoop") · wijk-/buurtgrenzen op de kaart
(CBS via PDOK) · 4RENT!-variant van het sjabloon (zie observatie Verhuur in
`docs/besluiten.md`).

**Periodieke actie (geen bouwwerk):** herimport Brainbay/Realworks met
`scripts/import-transacties.mjs` + geocodering — terugkerend voor Quinn.

**Twee kaarten in het dossier (18 sep):** de nieuwe referentiekaart (4.6) en
het oudere `StraalKaartPaneel` ("In de buurt verkocht") staan nu allebei op de
waarderingstab. Samenvoegen of één laten vervallen bij item 10.2.

**Database-hardening (security-advisor, 17 sep):** `SECURITY DEFINER`-functies
`handle_new_user()`, `rls_auto_enable()`, `my_kantoor_id()`, `is_kantoor_admin()`
zijn via `/rest/v1/rpc` aan te roepen door `anon`; de trigger `handle_new_user`
maakt bovendien bij elke nieuwe auth-user een proefkantoor aan (erfenis van
zelf-aanmelden, 17 sep gezien bij de demo-fixture) → trigger droppen
(accounts ontstaan alleen via `/admin`, `plaatsInKantoor`) en `revoke execute … from anon`
(en `rls_auto_enable` ook van `authenticated`); `object_fotos` en
`stijl_bewerkingen` hebben RLS zonder policy (bewust service-role? nagaan);
leaked-password-protection aan (§ 8 punt 3). Uiterlijk in fase 12.

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
