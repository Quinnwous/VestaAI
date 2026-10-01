# VestaAI — Architectuur

> **Hoe het gebouwd is, en welke regels bindend zijn voor élk nieuw stuk werk.**
> Wat er functioneel staat: `docs/productoverzicht.md`. Hoe we werken (DoD,
> agents, vangrails): `docs/werkwijze.md`. Valkuilen die we al eens tegenkwamen:
> `CLAUDE.md`. Botst dit document met de code, dan wint de code-realiteit —
> werk dan dit document bij.
>
> § 1–8 waren tot 30 sep 2026 § 3.1–3.8 van de roadmap. Oude verwijzingen
> "roadmap § 3.x" in code-commentaar = § x hier.

---

## 1. Datalagen — één module bevraagt `transacties`

- **`lib/transactiesQuery.ts` is de enige plek** in `app/`, `components/` en
  `lib/` waar `.from('transacties')`, `.from('transacties_met_coordinaten')` of
  een `rpc()` op transactiedata voorkomt. Guard: `lib/transactiesQuery.guard.test.ts`.
  Uitgezonderd: `scripts/` en `app/admin/` (service-role, met een harde
  `.eq('kantoor_id', …)` in elke query).
- **Altijd via de sessie-gebonden client** (`createServerSupabaseClient()`): RLS
  geeft dan alléén het eigen kantoor terug. Een handmatig `kantoor_id`-filter is
  nooit de enige bescherming.
- **Drie toegangspatronen:**
  1. **Eigen verkopen, compact, client-side** — `haalEigenVerkopen(kolommen)`:
     `.range()`-lus in blokken van 1.000, alleen `eigen_verkoop = true` en
     `uitgesloten_reden is null`, expliciete kolommenlijst. Een paar honderd
     rijen per jaar; de pure functies in `lib/marktanalyse.ts`,
     `lib/kerncijfers.ts`, `lib/verkoopkaart.ts` en `lib/geo.ts` filteren
     client-side binnen 100 ms. Voor: kerncijfers, verkoopkaart, "wij"-lijn,
     CSV-export.
  2. **Regionale dataset, geaggregeerd in Postgres** — RPC's met één
     `p_filters jsonb` (`TransactieFilterSchema` in `lib/schemas.ts`; volledig
     filtermodel in `docs/ontwerp/README.md` § 4): `marktanalyse_reeks`,
     `marktanalyse_samenvatting` (incl. vorige periode voor de delta),
     `marktanalyse_verdeling_prijsklasse`, `transacties_zoeken` (gepagineerd,
     gesorteerd), `prijsindex_kwartaal`, `transacties_plaatsen_wijken` en de
     concurrentie-RPC's (`concurrentie_marktaandeel`, `_segmenten`,
     `_ranglijst`, `_wij_vs_markt`, `_aandeel_jaar`, `_matrix`, `_profiel`).
     Gedeelde filterlogica in de SQL-helper `transacties_gefilterd()`.
     Elke RPC: `language sql`, `stable`, `security invoker`,
     `set search_path = public`, filtert altijd `uitgesloten_reden is null`.
     Budget < 300 ms bij 100.000 rijen; indexen op `(kantoor_id, verkoopdatum)`,
     `(kantoor_id, plaats)`, `(kantoor_id, woningtype_groep)`, gist op `geo`.
  3. **Referenties op locatie** — `referenties_in_straal(p_lat, p_lng,
     p_straal_m, p_filters)` via `ST_DWithin` op `geo`, met `afstand_m`.
- **Geen kale `select('*')`.** Elke query noemt zijn kolommen.
- `transacties_met_coordinaten` ontsluit `geo` als `lat`/`lng` (PostgREST geeft
  `geography` anders als EWKB-hex). Elke view op `transacties` krijgt
  `with (security_invoker = true)`, anders omzeilt hij RLS.
- **Plaatsnamen canoniek bij het schrijven** (`canoniekePlaats()` in
  `lib/plaatsNormalisatie.ts`): "Den Haag", niet "'s-Gravenhage". Vergelijk een
  plaats nooit kaal met het werkgebied.

## 2. Dossier los van content

- `POST /api/object` maakt een dossier aan uit de intake **zonder Claude**
  (~1 s): `input_json`, `fase = 'verkoopadvies'`, `content_status = 'geen'`,
  `outputs_json = LEEG_CONTENT_OUTPUT`, `lat/lng` uit de verrijking van de
  intake (anders zelf via `pdokLookup`). Daarna redirect naar het dossier.
- Content komt via `POST /api/generate { objectId }` — op de knop "Genereer
  content" of automatisch bij de overgang naar In verkoop. Kern in
  `lib/contentGeneratie.ts`: lock per dossier via `content_status = 'bezig'` +
  `content_bezig_sinds` (verloopt na 6 min, 409 bij een dubbele start), eindigt
  in `klaar` of `fout`. `components/ContentTekstenTab.tsx` pollt
  `/api/object/[id]/status` elke 3 s.
- ⚠️ NL+EN duurt ~3 min tegen een functielimiet van 300 s (echte duur nog niet
  gemeten, zie roadmap).
- `CONTENT_VERGRENDELD` (`lib/features.ts`, nu `false`) vergrendelt alleen de
  content-tabs en content-routes, nooit het aanmaken van een dossier. Een nieuwe
  content-route begint met die check.
- Fases: `verkoopadvies` → `in_verkoop` → `verkocht` (`ObjectFaseSchema`). De
  makelaar zet de fase zelf door met de fasestepper in de dossierheader
  (`components/DossierHeader.tsx` → `setObjectFase`); `fase_sinds` legt het moment vast. `objecten.status` (`draft`/`published`/`onder_bod`/`verkocht`)
  is de Funda-publicatiestatus binnen In verkoop, los van de fase.
- **Woningtype** in de intake = `woningtype_groep` (appartement/rijwoning/
  halfvrijstaand/vrijstaand) + optioneel `woningtype_sub`, dezelfde taxonomie als
  `transacties`. Oude dossiers met het platte `woningtype` worden bij elke
  `PropertyInputSchema.parse()` gemapt (`migreerOudWoningtype`); lees het type
  altijd via `woningtypeLabel()`.

## 3. Waarderingsmethode (vergelijkbare verkopen, uitlegbaar)

Uitleg in makelaarstaal met rekenvoorbeeld: `docs/waardering/methode.md`.
Rekenkern: `lib/waardering.ts` (`berekenWaarderingV2`), `lib/prijsindex.ts`,
`lib/cbsPrijsindex.ts`. Geen regressie — bij deze datasetschaal te schijnzeker.

- **Kandidaten:** `referenties_in_straal`, zelfde `woningtype_groep`
  (`appartement` · `rijwoning` = tussen/hoek/geschakeld · `halfvrijstaand` =
  twee-onder-een-kap · `vrijstaand` = vrijstaand/villa/bungalow/landhuis),
  oppervlak ± 35 %, bouwjaar ± 25 jaar (± 40 bij vrijstaand), verkoopdatum
  ≤ 36 maanden terug én vóór de peildatum. Straal start op 750 m en verbreedt
  (1.000 → 2.000 → 5.000 m, daarna 60 maanden) tot n ≥ 8; maximaal de 25 best
  passende blijven over. Zonder locatie: terugval op plaats + typegroep, met
  waarschuwing.
- **Per referentie, allemaal zichtbaar:** € per m² × indexfactor ×
  correctiefactor × oppervlak subject = geïmpliceerde waarde. Gewicht =
  gelijkenis × 1/(1 + afstand/500 m) × 1/(1 + maanden/12) × 0,5 bij een andere
  plaats.
- **Uitkomst:** gewogen mediaan; bandbreedte = gewogen P10–P90
  (`BAND_PERCENTIELEN` is de kalibratieknop), minimaal ± 5 % (n ≥ 6), ± 10 %
  (n 4-5), ± 15 % (n < 4); afgerond op € 1.000; `weinigData` bij n < 6 met een
  zichtbare waarschuwing.
- **Prijsindex:** mediaan € per m² per kwartaal uit de eigen regionale set
  (`prijsindex_kwartaal`), gladgestreken over 3 kwartalen, betrouwbaar vanaf 30
  verkopen. Anders: dichtstbijzijnde kwartaal binnen 2 met melding, dan de
  CBS-prijsindex (tabel 85792NED, `lib/cbsPrijsindexData.json`, bijwerken met
  `scripts/haal-cbs-prijsindex.mjs`), anders "geen tijdcorrectie" met
  waarschuwing.
- **Kenmerkcorrecties** (garage, tuin, energielabel A-B/C-D/E-G, bouwperiode):
  per referentie, zoals de correctiekolommen van een taxatierapport —
  niveau(klasse subject)/niveau(klasse referentie), alleen bij ≥ 30 verkopen per
  klasse. Grootte via Theil-Sen-helling van ln(€ per m²) op oppervlak. Begrensd
  op ± 15 % per kenmerk en ± 30 % totaal; per kenmerk een schakelaar.
- **WOZ** staat als ijkpunt náást de waarde (met peiljaar) — nooit als invoer.
  WOZ per woning vult de makelaar zelf in (`lib/woz.ts`): een gratis, toegestane
  WOZ-API bestaat niet.
- **Handmatig:** referenties uitsluiten/toevoegen (`waardering_json.handmatig`)
  en een makelaarscorrectie met verplichte motivatie.
- **Opslag:** `objecten.waardering_json` als `WaarderingOpslagSchema`
  `{ versie: 2, uitkomst, correctie, handmatig }`; v1 wordt bij het lezen
  gemigreerd (`migreerWaarderingJson`). Het schema in `lib/schemas.ts` is
  leidend, niet deze samenvatting.
- **Eén bron voor scherm, pdf en presentatie:** de pdf-route en de
  presentatiemodus lezen de opgeslagen `waardering_json` en rekenen niets
  opnieuw uit.
- **Backtest** (`scripts/backtest-waardering.mjs` → `docs/waardering/backtest.md`):
  elke eigen verkoop van de laatste 24 maanden, gewaardeerd met alleen eerdere
  transacties. Lat: mediane fout ≤ 7 %, ≥ 75 % binnen de band. Demo-fixture:
  6,1 % / 76 %. Op echte data opnieuw draaien na de import.
- **Disclaimer** op elke uitkomst en pdf: indicatie op basis van vergelijkbare
  verkopen, geen taxatie in de zin van NRVT/NWWI.

## 4. Contentsjabloon en outputset

- `huisstijl_json.tekstsjabloon` (optioneel): `{ opening_label, secties:
  [{ kop, instructie }], slotzin, doel_woorden, engels: { opening_label,
  koppen[] } }`. i4housing-preset: `4SALE!` · `WOONCOMFORT` · `BUITENLEVEN` ·
  `LOCATIE` · `GOED OM TE WETEN`, ± 480 woorden, met EN-koppen. Beheer via
  `/admin/kantoor/[id]` → Tekstsjabloon.
- `lib/tekstsjabloon.ts` rendert het sjabloon als derde cachebaar systeemblok
  en valideert koppen (volgorde) en slotzin; bij een afwijking één gerichte
  herkansing van alleen `funda_tekst` (alleen als de kern-call < 110 s duurde).
- **Outputset v2** — kern (één call): `funda_tekst`, `brochure_tekst`,
  `instagram`, `linkedin_kantoor`, `sneak_preview` (WhatsApp, ≤ 600 tekens),
  `koper_email`, `buurtomschrijving`. Extra's op knopdruk via
  `POST /api/object/[id]/extra?type=` (409 zolang de kern loopt): open huis,
  follow-ups, videoscript, energieadvies, FAQ. Extra's blijven bij opnieuw
  genereren staan (`behoudExtras()` in `lib/contentExtra.ts`).
- Lees `outputs_json` in de UI altijd via `metLegacyFallback()`
  (`ResultTabs.tsx`): het komt ongevalideerd uit de database en oude dossiers
  missen velden. Oude sleutels blijven optioneel in `ContentOutputSchema`.
- NL en EN parallel (`generateContentBeideTalen`); Engels is best-effort en
  blokkeert NL niet. Bewerken/herschrijven werkt alleen op NL.
- `content_keuzes` bestaat alleen nog als optioneel schemaveld voor oude
  dossiers (bewust, 29 sep); de keuzevinkjes in de intake zijn weg.

## 5. Kaart

- **Eén stack: MapLibre GL + PDOK BRT-Achtergrondkaart (vectortiles, stijl
  pastel)** in `components/kaart/`: `BasisKaart` + lagen als props. Gebruikt door
  verkoopkaart, dossierkaart (referenties + eigen verkopen) en `/woningen`.
- `BasisKaart` laadt lazy (mount pas binnen 200 px van de viewport); boven de
  vouw `direct` meegeven.
- Zware libs in een laag: alleen het type statisch importeren, de runtime via
  `await import()` in het effect (anders zit `maplibre-gl` alsnog in de
  hoofdbundel).
- De MapLibre-worker staat zelf gehost in `public/maplibre-gl/` (guard:
  `lib/maplibreWorker.guard.test.ts`). CSP in `next.config.mjs`:
  `worker-src 'self' blob:` en `connect-src` met `https://api.pdok.nl`.
- Eigen bedieningselementen in de kaartkop, nooit rechtsboven óp de kaart (daar
  zitten de zoomknoppen).
- Statische kaart voor de waardebepaling-pdf: `lib/statischeKaart.ts`
  (PDOK-WMTS-tegels samengesteld met `sharp`, 3 s timeout, best-effort).
- Buurtgrenzen: CBS 2024 via PDOK OGC API, eigen proxy
  `app/api/kaart/buurtgrenzen` (`lib/buurtgrenzen.ts`), standaard uit.

## 6. AI-modellen

- **`lib/aiModellen.ts` is de enige plek met een modelstring** (guard:
  `lib/aiModellen.guard.test.ts`, vangt `claude-*` en `gemini-*`). Nu:
  `CONTENT` = `claude-sonnet-4-6` (kandidaten `CONTENT_KANDIDAAT` =
  `claude-sonnet-5` en `CONTENT_KANDIDAAT_HAIKU` = `claude-haiku-4-5`, blind
  vergeleken op 1 okt 2026: geen wissel), `EXTRACTIE` en `HERSCHRIJF` =
  `claude-haiku-4-5`, `SAMENVATTING` = `claude-sonnet-4-6`, `GEMINI_STAGING` =
  `gemini-3.1-flash-image` (vereist Gemini-billing).
- Modellen die standaard denken (Sonnet 5): `denkenUit(model)` meegeven en de
  tekst uit het eerste tekstblok lezen, nooit blind `content[0]` — anders
  vreten denk-tokens `max_tokens` op en is blok 0 geen tekst.
- De contentprompt krijgt de hele intake mee (`lib/contentKenmerken.ts`) plus
  de regel "feiten alleen hieruit"; een nieuw intakeveld hoort daar ook bij.
- Claude-calls alleen via `lib/claude.ts`; client components importeren
  schema's uit `lib/schemas.ts`, nooit uit `lib/claude.ts` (bundelt de SDK).
- Prompt caching (`cache_control`) op systeemprompt + stijlprofiel: NL en EN
  delen dezelfde prefix.
- **Modelwissel alleen na de blinde evaluatie** (`docs/evaluatie/`,
  `scripts/evalueer-content.mjs`, oordeel van Quinn).

## 7. URL-state, opmaak en primitives

- `useFilterState(schema)` (`hooks/useFilterState.ts`, Zod-getypte querystring)
  voor elke verkenner: de filterstand staat in de URL.
- `lib/opmaak.ts` (`euro`, `procent`, `dagen`, `datum`, `m2`, `nlNL`, …) voor
  élk getal en elke datum, in Amsterdamse tijd.
- `lib/grafiekThema.ts` voor recharts: merkkleuren, `--merk-accent` alleen als
  onderscheidende tweede reeks. `recharts` alleen in `components/grafieken/`, via
  `next/dynamic` met een skelet van exact dezelfde hoogte.
- Primitives in `components/ui/` (tokens, AppPagina, StatTile, EmptyState,
  Skeleton, FilterBar, DataTable, …), geëxporteerd via `components/ui/index.ts`.
  Een nieuwe primitive bouw je bij zijn eerste gebruiker, met een korte
  gebruiksregel bovenaan. Geen showcasepagina.
- Filtervergelijkingen via `lib/filterVergelijk.ts` (`bereikGelijk`,
  `verzamelingGelijk`) — niet zelf kopiëren.

## 8. Ontwerpspoor voor interactieve verkenners (hero-schermen)

- **Het prototype ís de spec.** Voor elk hero-scherm staat een interactief
  HTML-prototype in `docs/ontwerp/` (marktanalyse, transacties, concurrentie,
  verkoopkaart, waardebepaling, startpagina + dossierheader; gedeelde kit
  `kit.css`/`kit.js`; handleiding `docs/ontwerp/README.md`). Een wijziging aan
  een hero-scherm port je 1-op-1 vanuit het prototype; alleen de datalaag is
  `lib/transactiesQuery.ts`.
- **Interactieprimitives komen uit Radix** (Dialog/Sheet, Popover, Slider,
  Tooltip, Select), tabellen uit TanStack Table (`DataTable`). Zelf bouwen mag
  alleen wat Radix niet levert (StatTile, ChartCard, FilterBar, FilterPills,
  kaartlagen). Gethemed via `--merk*`.
- **Grafieken:** geen library-defaults. Directe eindlabels in plaats van een
  legendabox, dunne lichte rasterlijnen, eigen tooltipkaart met alle reeksen én
  n, "mooie" y-asstappen (`€ 1,2 mln`), `tabular-nums`. "Wij" = merkkleur met
  licht vlak, "markt" = donker neutraal dun, segment B = accent. Nooit een
  dubbele as.
- **Interactiecontract** (elke verkenner): filter → resultaat < 100 ms
  client-side, skeleton alleen bij het eerste laden, hover toont detail, klik
  op een grafiekelement filtert (crossfilter-chip), filterstand in de URL,
  volledig toetsenbordbedienbaar met merkkleurige focusring, sticky filterbar,
  `prefers-reduced-motion`, lege/weinig-data/laad/foutstaat zoals in het
  prototype.
- **Kaartpin** = mini-beeldmerk van het kantoor (SVG in
  `docs/ontwerp/README.md` § 6), frosted hover-kaart, lijst en kaart wijzen naar
  elkaar.
- **Visuele review hoort bij de DoD:** skill `ontwerpreview` — screenshot naast
  prototype; pas AKKOORD sluit het item.

## 9. Datamodel (Supabase, project `uvpcjpejocjmlxxyhqyz`, eu-central-1)

Live gecontroleerd op 30 sep 2026; `nps_responses` en
`makelaars.first_generated_at` zijn op 1 okt weggehaald (opruimmigratie 2).

```
kantoren          id, name, slug, logo_url, huisstijl_json, instellingen_json,
                  admin_notified_at, created_at
makelaars         id (= auth.users.id), kantoor_id, name, email, role, created_at
objecten          id, kantoor_id, makelaar_id, address, fase, fase_sinds, status,
                  input_json, outputs_json, outputs_json_en, content_status,
                  content_gegenereerd_op, content_bezig_sinds, waardering_json,
                  usps_structuur, verrijking_json, notitie, lat, lng, created_at
object_fotos      id, object_id, kantoor_id, url, storage_pad, soort, bestandsnaam
object_documenten id, object_id, kantoor_id, bestandsnaam, storage_pad, mime_type,
                  grootte_bytes, anthropic_file_id
stijl_bewerkingen id, kantoor_id, object_id, sleutel, origineel, bewerkt, verwerkt
transacties       id, kantoor_id, bron, import_id, adres, adres_sleutel, huisnummer,
                  toevoeging, postcode, plaats, wijk, buurt, geo, geocode_status,
                  verkoopprijs, vraagprijs, prijs_m2, verkoopdatum, looptijd_dagen,
                  woningtype, woningtype_groep, woningtype_sub, woonoppervlak_m2,
                  perceel_m2, inhoud_m3, bouwjaar, energielabel, kamers, garage,
                  tuin, buitenruimte, eigen_verkoop, verkopend_kantoor,
                  verkopend_kantoor_norm, aankopend_kantoor, uitgesloten_reden
imports           id, kantoor_id, bron, bestandsnaam, aantal_rijen/_nieuw/
                  _bijgewerkt/_uitgesloten, kwaliteitsrapport_json, snapshot_json,
                  status, gestart_op, klaar_op, teruggedraaid_op
gebruik_events    id, kantoor_id, makelaar_id, object_id, type, created_at
view              transacties_met_coordinaten (security_invoker, + lat/lng)
```

- `huisstijl_json` volgt `HuisstijlSchema`, `instellingen_json`
  `KantoorInstellingenSchema` (courtage, kantoorprofiel, werkgebied,
  `kantoor_aliassen`, `demo`) — beide in `lib/schemas.ts`. Instellingen altijd
  samenvoegen (`voegInstellingenSamen()`), nooit vervangen.
- **RLS kantoorbreed:** iedereen binnen een kantoor mag elk dossier lezen,
  wijzigen en verwijderen (één rol per kantoor; `makelaars.role` stuurt geen
  rechten meer). Transacties strikt per kantoor. Policies altijd met
  `(select my_kantoor_id())` / `(select auth.uid())`, nooit kaal.
  `object_fotos`/`stijl_bewerkingen` hebben geen policy en lopen alleen via de
  service-client (bewust).
- Storage-bucket `kantoor-assets`: logo, favicon en sfeerbeelden onder de
  kantoor-id. `logo_url` is altijd een volledige Storage-URL, nooit een pad.
- Migraties: `supabase/migrations/`, toepassen via `apply_migration`.
  Nog niet toegepast: `20260924190000_transacties_makelaar_id.sql` (wacht op een
  makelaarsveld in de exports). Controle: `scripts/controleer-schema.mjs`.
  `supabase/schema-baseline.sql` is de stand van 17 sep (verouderd, zie roadmap).

## 10. Stack en infrastructuur

| Laag | Keuze |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack voor `dev`/`build`). Middleware heet `proxy.ts` |
| Database, auth, storage | Supabase (Postgres 17 + PostGIS), gratis plan — geen herstelpunten |
| Hosting | Vercel, functies in `fra1` (`vercel.json`), naast de database; Hobby-plan |
| AI | Claude API (content, extractie, herschrijven, samenvatting); Gemini (virtual staging) |
| E-mail | Resend (domein vestaai.nl, afzender noreply@vestaai.nl) |
| Kaart | MapLibre GL + PDOK |
| Grafieken | recharts (lazy, alleen `components/grafieken/`) |
| Pdf | `@react-pdf/renderer` — ingebouwde Helvetica is WinAnsi (`⚠` en emoji renderen niet); een nieuw pdf-document krijgt een test die hem écht rendert; logo's eerst door `bruikbaarLogo()` |
| Beeld | `sharp` (staging-label, statische kaart) |
| UI | Radix-primitives, TanStack Table, Tailwind (de `blue`-schaal is geremapt naar groen — niet verwijderen), eigen tokens |
| Validatie | Zod |
| Analytics | Plausible, alleen op de publieke pagina's (`components/PlausibleScript.tsx`) |
| Tests | Vitest (unit, incl. `.tsx` via oxc), Playwright (e2e, DoD-scripts, axe) |

Productie: `https://www.vestaai.nl` (het kale domein stuurt door).

## 11. Externe bronnen

| Bron | Waarvoor | Code | Let op |
|---|---|---|---|
| BAG (Kadaster) | adres zoeken, bouwjaar + oppervlakte | `lib/bag.ts` | vrije tekst via `q`, `pageSize` ≥ 10, `Accept-Crs: epsg:28992` |
| PDOK Locatieserver | coördinaat, buurt/wijk, geocodering import | `lib/verrijking.ts`, `lib/geocodering.ts` | "12 A" is een huisletter, geen toevoeging |
| CBS buurtcijfers | Buurt & data, buurtprofiel | `lib/verrijking.ts` (`fetchCbs`) | tabel 85984NED (2024); naslag `docs/databronnen/cbs-buurtdata.md` |
| CBS prijsindex | terugval tijdcorrectie waardering | `lib/cbsPrijsindex.ts` | tabel 85792NED, lokaal json-bestand |
| Overpass (OSM) | voorzieningen | `lib/verrijking.ts` | onbetrouwbaar onder last — status `mislukt` nooit als "leeg" tonen |
| PDOK BRT + OGC API | kaarttegels, buurtgrenzen | `components/kaart/`, `lib/buurtgrenzen.ts` | — |
| Brainbay / Realworks | transactiedataset | `scripts/import-transacties.mjs`, `lib/importPijplijn.ts` | concierge: Quinn importeert, het kantoor niet |

Elke bron geeft `ok`/`leeg`/`mislukt`/`niet_gekoppeld`; een mislukte call wordt
gelogd (zonder adres) en valt nooit stil terug op "geen resultaat". `pdokLookup()`
geeft sinds item 12.9 (1 okt 2026) zelf ook een status: een PDOK-uitval maakt CBS
en voorzieningen (die allebei PDOK's buurt/wijk/gemeentecode resp. coördinaat
nodig hebben) `mislukt` in plaats van het misleidende `leeg`.

**Verversen zonder dataverlies** (item 12.9): de "Ververs"-route
(`POST /api/object/[id]/verrijking`) overschreef `verrijking_json` voorheen in
zijn geheel — faalde één bron op dat moment (bv. Overpass overbelast), dan was
goede data domweg weg. `voegVerrijkingSamen()` (`lib/verrijkingOpslag.ts`)
voegt een verse poging nu per bron samen met de vorige opslag: mislukt een
bron terwijl de vorige data `ok` was, dan blijft die staan (met de datum
waarop die écht is opgehaald, `bronMeta` in `lib/schemas.ts`) en meldt
`BuurtDataTab.tsx` dat eerlijk — nooit oud stilzwijgend als nieuw tonen.

**Buurtdata in de contentprompt** (item D5, 1 okt 2026): `genereerContentVoorObject`
leest eerst `verrijking_json` (`verwerkOpgeslagenVerrijking`) en maakt daar met
`verrijkingOpslagNaarPrompt()` dezelfde prompttekst van als `verrijkingNaarPrompt()`
— zonder het vuistregel-marktblok, dat niet wordt opgeslagen. Live
`fetchVerrijking()` alleen als `kiesVerrijkingsbron()` niets bruikbaars vindt
(geen opslag, alle bronnen leeg, of ouder dan `VERRIJKING_MAX_LEEFTIJD_DAGEN` =
180). Reden: een live Overpass-call liep op productie in time-outs (± 18 s per
generatie) terwijl het dossier de data al had.

## 12. Beveiliging en privacy

- Kantoorscheiding via RLS (§ 9); isolatie getest in `e2e/rls.spec.ts`.
- Service-role-client alleen server-side, altijd met een expliciet
  `kantoor_id`-filter.
- Platform-admin is een los concept (`lib/admin.ts`, vaste e-mail plus
  `PLATFORM_ADMIN_EMAILS`); `/admin` controleert dat per actie.
- Security-headers en CSP in `next.config.mjs` (HSTS-preload, `frame DENY`).
- Wachtwoord-reset op de kantoorlogin heeft een rate-limit (in-memory per
  instance, `lib/resetRateLimit.ts`).
- Geen tracking achter de login; transactiedata geldt als persoonsgegeven
  (privacyverklaring). Anthropic bewaart API-invoer 30 dagen.

## 13. Auth en e-mail

- **Inloggen** met e-mail + wachtwoord (`components/InlogFormulier.tsx`) op
  `/login` of de kantoorlogin `/login/<slug>`. Zelf registreren bestaat niet;
  in Supabase staat "Allow new users to sign up" nog aan (roadmap § 2 punt 4).
- **Wachtwoord-reset:** de mail linkt naar
  `{{ .SiteURL }}/auth/reset-password?token_hash=…&type=recovery`; de pagina
  doet `verifyOtp` pas na een klik, zodat een mailscanner die de link opent de
  token niet verbruikt. De kantoorlogin heeft een eigen reset-mail in kantoorstijl
  (`app/api/auth/kantoor-reset`, `lib/kantoorResetMail.ts`, met rate-limit).
- ⚠️ **Supabase Site URL = `https://vestaai.nl`, zonder `/**`.** De wildcard hoort
  alleen bij de Redirect URLs; met `/**` in de Site URL landde elke resetlink op
  `/login` (bug 2 juli). Het kale domein stuurt met 308 door naar
  `www.vestaai.nl` en behoudt de query, dus maillinks blijven werken.
- **E-mail via Resend:** domein `vestaai.nl` geverifieerd (DNS bij TransIP),
  afzender `noreply@vestaai.nl`; ook de Supabase-auth-mails lopen via
  Resend-SMTP (`smtp.resend.com:465`). `RESEND_API_KEY` is een send-only-sleutel
  (kan geen domeinen of mails uitlezen). De onderwerpregels van de
  Supabase-mails zijn nog Engels (backlog).
- **Accounts:** `addMakelaarAccount` (`/admin`) maakt de auth-user (e-mail al
  bevestigd) en het makelaar-record, en mailt de persoon meteen;
  `scripts/maak-team-accounts.mjs` doet hetzelfde zonder mail. `ensureMakelaar`
  is het vangnet als het makelaar-record ontbreekt.
- **Nieuwe klant:** bij het eerste dashboardbezoek van een kantoor
  (`kantoren.admin_notified_at is null`) gaat er atomisch één welkomstmail naar
  het eerste lid en een melding naar de platform-admin (`lib/nieuweKlant.ts`).
  Beide huidige kantoren zijn al verwerkt: nieuwe teamleden van i4 krijgen
  daardoor geen mail.
