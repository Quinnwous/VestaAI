# VestaAI — Besluitenlogboek & opleverlog

> Logboek, geen werklijst. Het plan zelf staat in `docs/roadmap.md`. Nieuwe
> besluiten komen hier bovenaan (nieuwste eerst); `/sessie-afronden` voegt ze
> toe. `/sessie-start` leest alleen de bovenste datum-sectie.

---

### 17 sep 2026 (laatste Fable-sessie) — rekenkern waardering, proefrit 1.9, vier ontwerpprototypes

Laatste dag met Fable 5.1 als "brein" (daarna alleen Sonnet). Werkverdeling:
Sonnet-subagents bouwden (op het abonnement, geverifieerd door Quinn), Fable
schreef alleen de statistisch lastige module zelf en deed de reviews.

| Onderwerp | Besluit | Door |
|---|---|---|
| Rekenkern waardering (fase 4) | Gebouwd als pure TypeScript naast de `@deprecated` v1: `lib/waardering.ts` v2, `lib/prijsindex.ts`, `lib/cbsPrijsindex.ts`, schema's in `lib/schemas.ts`, 22 + 13 tests, synthetische backtest als vitest-vangrail (`lib/waardering.backtest.test.ts`, generator `lib/waardering.synthetisch.ts`). Methode in makelaarstaal met rekenvoorbeeld (= testcase) in `docs/waardering-methode.md`; dat document gaat naar de taxateur van i4 Housing voor de tussencheck (§ 8 actie 6) | Fable |
| Bandbreedte | Gewogen **P10–P90** i.p.v. P25–P75: een interkwartielband dekt per definitie maar de helft van de uitkomsten en haalde in de backtest 72 %; P10–P90 haalt 78 %. `BAND_PERCENTIELEN` is de kalibratieknop voor de echte backtest (4.8). Minimale marge ± 5 / 10 / 15 % bij n ≥ 6 / 4-5 / < 4 (de "+5/+10 punt"-regel was dubbelzinnig) | Fable |
| Correcties per referentie | Zonder correcties werden slecht gelabelde woningen 9 % en grotere woningen 3,6 % overschat. Daarom correcties zoals in een taxatierapport: prijsniveau per klasse (garage, tuin, labelklasse, bouwperiode) op de regionale set + Theil-Sen-helling voor grootte; alleen bij ≥ 30 verkopen per klasse, begrensd ± 15 % per kenmerk / ± 30 % totaal, per kenmerk schakelbaar en per referentie zichtbaar. Geen multivariate regressie (§ 3.3 blijft staan) | Fable |
| Plaatsfactor | Een verkoop in een andere plaats telt voor de helft mee in het gewicht (prijsniveaus verschillen per gemeente meer dan afstand verklaart) | Fable |
| Datalaag ↔ rekenkern | RPC's leveren `Kandidaat`-rijen en de `bouwIndex()`-vorm; `haalRegionaleSet()` vervangt de geplande RPC `kenmerk_paren` zodat er één implementatie van de methode is (roadmap 2.2/4.5) | Fable |
| CBS-terugval | StatLine-tabel **85792NED** (prijsindex 2020=100, regio) vastgelegd in `lib/cbsPrijsindex.ts`; regiocode uit de metadata halen, niet raden | Fable |
| Proefrit Sonnet (item 1.9) | Zie de entry hieronder. Uitkomst: specs en skills waren goed genoeg; het gat zat in de DoD-tooling (huisstijlcheck gaf groen op een gecrashte startpagina). Gefixt + item 1.9b | Fable/Sonnet |
| Ontwerpsessies | Alle vier resterende prototypes gebouwd door Sonnet en door Fable gereviewd met één correctieronde elk: `concurrentie.html` (balkvulling, trend over alle jaren, korte namen, overlay zonder blur), `transacties.html` (kleurcodering ratio, paginascroll met sticky kop, overlay, kopregel), `startpagina.html` (placeholders neutraal zodat er één hero blijft, acquisitie als standaardstaat), `waardebepaling.html` (eyebrow, drie-standen-chips voor correcties i.p.v. vijf rode toggles). Overlays dimmen voortaan zonder blur; een groep schakelaars gebruikt chips, de rode kit-toggle blijft voor losse schakelaars | Fable |
| README § 4 | Concurrentie filtert op plaats/wijk, type, periode en prijsklasse (5 klassen); "verkopend kantoor" is daar geen filter maar "verberg dit kantoor"; Segment B op Concurrentie naar backlog | Fable |
| Kit-beperking | Topbar heeft geen mobiele stand; prototypes worden op 1280/1440 beoordeeld, de app heeft zijn eigen `AppTopbar`. Centraal oplossen in kit.css staat op de backlog | Fable |
| Datums | Alles van de nacht 16→17 sep stond als 17-18/18 sep gelogd; git-log is leidend, overal gecorrigeerd | Fable |

Artifact-links (prototypes, gepubliceerd 17 sep):
concurrentie https://claude.ai/artifact/3Q3toKB4sENg3yRKmvVXoU ·
transacties https://claude.ai/artifact/FU2FbGSxhrkurHkvEadQe5 ·
startpagina https://claude.ai/artifact/Va49HD5pyFyAmafBVJnDzB ·
waardebepaling https://claude.ai/artifact/H1hunisisuRxJLPNHsaXWm
(marktanalyse en verkoopkaart: zie de entry van 17 sep "ontwerprichting").

**Opgeleverd (17 sep, Fable):** commits 9824a37 (rekenkern), b5aa393 (1.9 +
review), 5643720 (CBS), 1b101bb (6.2/6.3), c493fb9 (startpagina) en de
slotcommit met waardebepaling. Synthetische backtest: 400 woningen, mediane
fout 5,2 %, 78 % binnen de band. Volgende sessie (Sonnet): `/sessie-start` →
item 1.9b.

## Besluiten

### 17 sep 2026 (proefrit) — item 1.9 bugs + fallback-opruiming gebouwd

Losse testsessie (proefrit: bouwt Sonnet zelfstandig een item op basis van
CLAUDE.md + de skills + de roadmap-spec, zonder tussentijdse vragen) leverde
roadmap-item **1.9 Bugs + fallback-opruiming** (a) t/m (e) volledig af.
Eigen beslissingen bij spec-ambiguïteit, telkens genomen zonder Quinn te
kunnen raadplegen:

| Onderwerp | Besluit | Door |
|---|---|---|
| `--merk-licht` | Nieuw token, apart van `--merk-zacht` (die blijft de bijna-witte achtergrondtint): `lichter(primair, .25)`, bedoeld voor verlopen (hero-tegel). `docs/ontwerp/README.md` § 2 en roadmap 1.9e spraken elkaar tegen over of dit een nieuw token was of een hernoeming van `--merk-zacht` | sessie |
| `--merk-diep` | Bleek al te bestaan in `lib/branding.ts` — roadmap 1.9e noemde 'm abusievelijk als "nieuw toe te voegen"; ongewijzigd gelaten, geen dubbel token | sessie |
| Centrale fallback-kleuren (`:root` in `app/globals.css`, 1.9b) | Exact herberekend via de bestaande `donkerder()`/`lichter()`-functies op `VESTA_MERK`, niet overgenomen van de onderling verschillende hexjes die al los in components stonden (bleken 4-5 varianten per token te zijn, nooit consistent) | sessie |
| `var(--merk-rgb, 26,107,69)`-fallbacks | Ook opgeruimd, niet alleen de hex-varianten die spec (a)/(c) letterlijk noemen — zelfde soort lek (kapotte kantoor-lookup onzichtbaar) | sessie |
| `bg-green-100`/`text-green-900` (StatusToggle, FaseToggle ×2, StatistiekenPaneel) | Vervangen door `var(--merk-zacht)`/`var(--merk-hover)` — hardgecodeerd Tailwind-groen, geen `var()`-fallback dus strikt buiten spec (a)'s tekst, maar wel de met naam genoemde "Raakt"-bestanden en het item-doel ("laatste zichtbare groen weg") | sessie |
| `StatusToggle.tsx:10` kapotte class | `bg-[var(--merk-zacht,#EAF5EE)]0` had een stray `0` ná de Tailwind-arbitrary-class (dus geen geldige utility, geen kleur); weggehaald, de statusdot gebruikt nu een solide `var(--merk)` i.p.v. de zachte tint | sessie |
| Demo-knop "Vul een voorbeeld in" (`NewObjectForm.tsx`) | Achter `process.env.NODE_ENV !== 'production'`. `instellingen_json.demo` bestaat nog niet (komt in fase 2) en `lib/schemas.ts` was deze sessie verboden terrein — dus alleen de "dev"-helft van "alleen in dev/demo" gebouwd; "demo"-helft is een openstaand vervolgpunt | sessie |
| `scripts/controleer-huisstijl.mjs` | Uitgebreid met een uitzondering voor de "VestaAI × kantoor"-lockup (`title="VestaAI"`, bewust groen per CLAUDE.md) en een `--width`-flag. Zonder de uitzondering meldt het script op élke pagina groen en is "meldt niets" (roadmap 1.9 Klaar-als) nooit haalbaar; `--width` was nodig omdat `scripts/screenshots.mjs` lokaal niet draait (zie hieronder) | sessie |
| `scripts/repair-i4housing-branding.mjs` | `MERK.vorm` stond nog hardgecodeerd op `'strak'` — zonder fix zou `--write` de besluit-wijziging (17 sep, strak → zacht) juist weer hebben teruggedraaid. Dry-run bevestigde vóór de fix `"vorm": "strak"` in de live database; ná `--write` staat hij op `"zacht"` | sessie |

**Opgeleverd (17 sep, proefrit):** item 1.9 (a)-(e) — zie
`docs/roadmap.md` § Stand van zaken voor status en het volledige
bevindingenrapport (documentatie-onduidelijkheden) in de sessie-uitvoer.
DoD: typecheck/test/build groen, `controleer-huisstijl.mjs` schoon op
390/1280/1920 px over 9 pagina's, `--write` op de i4housing-huisstijl
uitgevoerd. **Openstaande bevinding (niet gefixt, buiten scope 1.9):**
`/dashboard` gooit op elke breedte een harde runtime-fout ("Functions
cannot be passed directly to Client Components") — `Kerncijfers.tsx`
(server component) geeft inline pijl-functies door aan `opmaak`-props van
`StatTile` (client component). Bron: `app/(app)/dashboard/Kerncijfers.tsx:37,46,53`.

**Vervolg (Fable, 17 sep, review van de proefrit):** de crash is gefixt
(`'use client'` op `Kerncijfers.tsx`; props zijn allemaal serialiseerbaar) en
gecontroleerd met een screenshot. Belangrijkste les: `controleer-huisstijl.mjs`
meldde "schoon" op een gecrashte pagina — het script faalt nu (exit 1) op de
foutstaat, de Next-overlay en `pageerror`. De rest van de tooling-oogst
(`screenshots.mjs` lokaal kapot: `E2E_TEST_EMAIL` + redirect naar productie)
is roadmap-item **1.9b** geworden, vóór 1.10; DoD § 4 en de skills
`sessie-afronden`/`ontwerpreview` verwijzen tot dan naar
`controleer-huisstijl.mjs --width=<px>`. Overige spec-onduidelijkheden zijn
verwerkt: README § 2 (tokens), item 2.3 (demo-knop tweede helft + hergebruik
van de synthetische generator). Datumcorrectie: alles van de nacht 16→17 sep
stond als "17-18/18 sep" gelogd; de git-log is leidend, dus overal 16-17/17 sep.
Oordeel over de proefrit zelf: Sonnet bouwde 1.9 volledig en nam
verdedigbare beslissingen bij elke onduidelijkheid; het enige echte gat zat
in de tooling, niet in de specs. Werkwijze v2 blijft staan.

### 17 sep 2026 (later) — ontwerprichting "i4 · zacht" + filtermodel

Quinns reactie op de eerste prototypes: meer i4housing (blauw én rood
zichtbaar), afgeronde hoeken, professionele Apple-achtige stijl, véél meer
filteropties met dropdowns en meer variabelen, kaart met iets meer kleur en
huisjes die op het logo lijken. Niet bouwen, wél alles vastleggen zodat het
morgen in één keer goed gaat.

| Onderwerp | Besluit | Door |
|---|---|---|
| Vorm i4 Housing | `huisstijl_json.vorm` van `strak` naar **`zacht`** (radius 10-20 px). Wordt gezet in item 1.9 via het repair-script; CLAUDE.md-tekst "knoppen zonder afronding" is achterhaald | Quinn |
| Stijlrichting | **Apple-achtig**: frosted balken, segmented met schuivende thumb, dropdown-filters als pillen, zachte schaduw met zweem merkkleur, hero-tegel in blauw verloop, ambient-verlopen op de achtergrond. Vastgelegd in `docs/ontwerp/README.md` § 1 en `docs/ontwerpprincipes.md` | Quinn / plan v2 |
| Rood terug | Accentkleur zichtbaar: echt logo in de topbar, live-stip, tel-badges op filters, segment B, pin-omlijning + stokje, schakelaar-aan. Nooit semantisch (ongunstig = amber) | plan v2 |
| Filtermodel | Dropdown-popovers met samenvatting en tel-badge; plaats/wijk met zoekveld; woningtype-taxonomie (4 groepen × 20 subtypes); schuivers voor prijs/oppervlak/bouwjaar/perceel; energielabel-chips; kamers; kenmerken; t.o.v. vraagprijs; looptijd; verkocht door (teamlid); verkopend kantoor; actieve filterpillen; alles in de URL. Tabel per verkenner in `README.md` § 4; `TransactieFilterSchema` en kolom `woningtype_sub` volgen eruit (roadmap § 3.1, 2.1, 3.2) | plan v2 |
| Kaart | PDOK **pastel** i.p.v. grijs; pin = **mini-beeldmerk** (blauwe ruit, rode omlijning, wit hart, rood stokje) afgeleid van het i4-logo (`i4-Housing-logo-231x77-1.png` van i4housing.nl); hover-kaart met makelaar; filter "Verkocht door" | Quinn / plan v2 |
| Gedeelde kit | `docs/ontwerp/kit.css` + `kit.js` = tokens en primitives voor álle prototypes én de spec voor `globals.css`/`components/ui`; nieuwe tokens `--merk-diep/-licht/-accent-zacht/-rand/-rgb`, `--control`, `--goed/--let` | plan v2 |
| Artifacts v2 | Marktanalyse https://claude.ai/artifact/W3319zFnBY52XkspasLFfi · Verkoopkaart https://claude.ai/artifact/Qy5Ny5c9Hs39GTNxUFJkNm (zelfde URL's als v1, opnieuw gepubliceerd met de kit) | plan v2 |

### 17 sep 2026 — ontwerpspoor voor interactieve verkenners (roadmap § 3.8)

Aanleiding: Quinn wil dat de verkenners (marktanalyse, transacties,
concurrentie, verkoopkaart) "Claude-artifact-achtig" professioneel worden en
niet tekstueel/amateuristisch, in i4housing-huisstijl.

| Onderwerp | Besluit | Door |
|---|---|---|
| Prototype = spec | Voor elk hero-scherm bestaat vóór de bouw een interactief HTML-prototype in `docs/ontwerp/` (kantoorhuisstijl, synthetische data, alle staten). Sonnet port het 1-op-1; de tekst-spec is samenvatting, niet bron. v1's "direct bouwen, geen mockups" is hiermee herzien voor hero-schermen | plan v2 |
| Wie ontwerpt | Ontwerpsessies op een sterk ontwerpmodel (Fable/Opus) of via Claude Design; 1 sessie per prototype; resultaat altijd als bestand in de repo | plan v2 |
| Primitives | Interactieprimitives uit Radix (shadcn/ui-patroon) + TanStack Table, gethemed via `--merk*`; zelf bouwen alleen wat Radix niet levert. Nieuw item 6.0 | plan v2 |
| Grafiekthema | Geen library-defaults; wij = merk met vlak, markt = donker neutraal (referentielijn, bewust geen categorie), segment B = accent; directe eindlabels met botsingscorrectie; eigen tooltipkaart | plan v2 |
| Review | Skill `ontwerpreview`: screenshot app naast screenshot prototype, beoordeeld door subagent met vision + checklist; onderdeel van de DoD voor hero-schermen | plan v2 |
| Eerste prototypes | `docs/ontwerp/marktanalyse.html` en `docs/ontwerp/verkoopkaart.html` opgeleverd (Fable, 17 sep) | plan v2 |

### 17 sep 2026 — klantvoorstel v1 voor i4housing opgesteld (nog niet verstuurd)

`docs/voorstel-i4housing.html` (bron, logo inline) + `.pdf` (Playwright-render,
2 pagina's A4, i4housing-huisstijl, informele toon, "ik"-vorm). Pagina 1:
datakoppeling (Realworks + NVM/Brainbay + open data → dataset alleen van
i4housing → waardering, marktanalyse, concurrentie, i4housing-kaart), het
verkoopadvies dat voortaan op die vier is gebaseerd, en "het wordt steeds
beter" (leert van verkopen en tekstaanpassingen; pitch/fases bewust niet genoemd). Pagina 2: één
kostenlijst (Vercel Pro, Supabase Pro, Claude API, Claude Pro, domein/e-mail,
beheer 5 uur/mnd à € 20 = € 100), bij elkaar ± € 200; voorstel € 250/mnd excl. btw
(12 mnd vast, geen "afgerond"-regel en geen tariefdatum in het document); bouw t/m demo € 0; maandelijks, geen looptijd. Bewust
weggelaten (Quinn, 17 sep): afspraken, benodigdheden, planning, handtekening,
virtual staging.

### 16-17 sep 2026 — masterplan herzien naar v2 ("demo-backwards")

Aanleiding: Quinn liet het masterplan van 16-17 sep kritisch tegen het licht
houden (Fable 5.1 als medeoprichter-brein), met als eis dat Sonnet het plan
daarna zonder verdere uitleg tot een topproduct kan uitwerken. Vier vragen
zijn vooraf door Quinn beantwoord; de rest zijn plankeuzes.

| Onderwerp | Besluit | Door |
|---|---|---|
| Brainbay-export | Bevat **regionale NVM-transacties van álle kantoren** in het werkgebied, incl. verkopend kantoor. Duizenden rijen; concurrentieanalyse is dus echt mogelijk | Quinn |
| Demo-data | De demo draait op **i4housing's eigen data in hun eigen omgeving**. Het demo-kantoor ("Demo Makelaardij") wordt ontwikkel-fixture en noodterugval, geen demo-podium | Quinn |
| Tussencheck | **Eén gerichte tussencheck** vóór de grote demo is toegestaan: één waardebepaling-pdf van een recente eigen verkoop naar hun taxateur ("klopt dit ongeveer?"). Lost de tegenspraak tussen `goals.md` (kort-cyclisch) en het masterplan (één demo) op | Quinn |
| Verkoopadvies | Blijft wachten op Quinns voorbeelddocument. Wél wordt het datacontract alvast vastgelegd zodat de bouw daarna één sessie kost | Quinn |
| Planmethode | **Demo-backwards**: het demoscript (6 scènes) staat vooraan in de roadmap; elke fase dient een scène. Wat in geen scène zit is polish en staat in de schrapvolgorde | plan v2 |
| Data eerst | Vóór elke verkenner of waardering komt een **realistische synthetische demo-fixture** (werkgebied Wassenaar e.o., duizenden regionale rijen + ~150 eigen verkopen/jaar). Niemand bouwt nog tegen 0 rijen | plan v2 |
| Datalagen | Drie lagen, vastgelegd in `lib/transactiesQuery.ts` (de enige module die `transacties` bevraagt): regionaal → aggregatie in Postgres (RPC's); eigen verkopen → compacte projectie client-side; referenties → `ST_DWithin`-RPC | plan v2 |
| Import | Primair via **script** (`scripts/import-transacties.mjs`, concierge-model, dry-run standaard) i.p.v. een upload-UI met 1 MB-limiet. `/admin/transacties` toont importhistorie, kwaliteitsrapport en terugdraaiknop | plan v2 |
| Dossier ≠ content | Een dossier aanmaken is **direct** (geen wachttijd op Claude). Content wordt pas gegenereerd bij de overgang naar In verkoop of op knopdruk. Scheelt kosten voor verloren pitches en maakt de acquisitiescène demo-bestendig | plan v2 |
| Prijsindex | Kwartaalindex **uit de eigen regionale dataset** (mediaan €/m² per kwartaal, per woningtypegroep, gladgestreken); CBS-prijsindex bestaande koopwoningen alleen als terugval bij te weinig regionale data | plan v2 |
| Contentsjabloon | Het i4housing-format (4SALE! · WOONCOMFORT · BUITENLEVEN · LOCATIE · GOED OM TE WETEN · vaste slotzin, ±480 woorden, NL+EN) wordt een **gestructureerd `tekstsjabloon`** in `HuisstijlConfig`, niet een prompt-hint. Outputset teruggesnoeid tot wat i4housing gebruikt, plus een **sneak-preview-WhatsApp-bericht** (hun eigen kanaal) | plan v2 |
| Kwartaalbericht | De "kwartaalcijfers-generator" gaat van de backlog naar het kernplan: i4housing publiceert nu handmatig kwartaalcijfers; dit wordt scène 2 van de demo | plan v2 |
| Primitives | **Geen losse primitives-fase.** `FilterBar`/`useFilterState`/`lib/opmaak.ts`/`ChartCard`/`grafiekThema` worden gebouwd in dezelfde sessie als hun eerste gebruiker (marktanalyse); `RangeSlider` bij de kaart; `DataTable`/`Drawer` bij transacties zoeken. Geen `/admin/ui`-showcase | plan v2 |
| Kaarttechniek | **MapLibre GL + PDOK BRT-vectortiles (grijze/pastelstijl)** is de keuze; geen aparte spike-sessie, wel een time-boxed proof van één uur aan het begin van de kaartfase. Faalt CSP of performance, dan Leaflet met canvas-renderer | plan v2 |
| Foutlogging | `global-error.tsx` + `error.tsx` + `lib/fouten.ts` gaan naar Fase 2 (vroeg), niet naar de demo-fase — je wilt weten wat er misgaat terwijl je bouwt op echte data | plan v2 |
| Logboek | Besluitenlogboek en opleverlog verhuisd van `docs/roadmap.md` naar dit bestand, zodat de roadmap een werkplan blijft dat elke sessie goedkoop te lezen is | plan v2 |
| Vercel | Team staat op **Hobby**. Vóór de demo naar Pro (zie roadmap § Acties Quinn): de generate-route (`maxDuration 300`) en staging (120 s) mogen in de demo niet afkappen | plan v2 |
| Verhuur | Blijft buiten scope (besluit 16-17 sep). Genoteerd als observatie: i4housing voert aantoonbaar 4RENT!-teksten en heeft een afdeling Beheer — na de demo heroverwegen, het tekstsjabloon ondersteunt 4RENT! zonder extra werk | observatie |

### 17 sep 2026 — fase 0 uitgevoerd: twee live beveiligingsproblemen gevonden en gefixt

Bij het uitvoeren van fase 0.1 (databasestatus via de Supabase-MCP) bleek het
risico uit het masterplan geen toekomstig risico te zijn, maar een **actief,
live probleem**:

- **Cross-tenant datalek in `transacties`.** De policy "Ingelogde makelaars
  lezen de transactiedataset" liet elke ingelogde makelaar van élk kantoor
  alle transacties van alle kantoren lezen — en de pagina's
  `marktanalyse/page.tsx`, `transacties/page.tsx` en `concurrentie/page.tsx`
  bevragen `transacties` al met de sessie-gebonden client (niet service-role).
  Dit was dus geen theoretisch risico voor zodra het demo-kantoor bestaat,
  maar een bug die vandaag al fout gaat zodra twee kantoren allebei data
  hebben.
- **RLS-omzeiling via de view.** `transacties_met_coordinaten` was aangemaakt
  als `SECURITY DEFINER` (eigenaar `postgres`), wat RLS op de onderliggende
  tabel volledig omzeilt voor wie de view bevraagt — vastgesteld met
  `grant`-informatie dat zowel `anon` als `authenticated` een SELECT-recht op
  de view hadden. Zonder de fix zou dit ook via de publieke anon-key
  (zonder inloggen) uitleesbaar zijn geweest zodra er rijen in stonden.
- **Fix:** migratie `20260916213323_rls_kantoor_isolatie_transacties.sql` —
  nieuwe policy scoped op `kantoor_id`, view herschapen met
  `security_invoker = true`, `grant select` alleen aan `authenticated`.
  Getest met een rolled-back transactie: twee test-kantoren, de policy geeft
  aantoonbaar alleen het eigen kantoor terug.
- Op hetzelfde moment ontdekt en gefixt: de import-upsert in
  `app/admin/transacties/actions.ts` gebruikte
  `onConflict: 'kantoor_id,adres,verkoopdatum'`, wat niet matchte met de
  bestaande functionele index (`coalesce(verkoopdatum, …)`) — élke import met
  een botsende rij faalde met Postgres-foutcode 42P10. Gereproduceerd en
  gefixt via migratie `20260916213816_fix_transacties_upsert_sleutel.sql`
  (`nulls not distinct`-index).
- Ook vastgesteld: `handle_new_user()` (de oude self-signup-trigger die
  automatisch een kantoor+makelaar aanmaakt) bestaat nog als functie, maar is
  **niet meer als trigger gekoppeld** aan `auth.users` — het zelf-registratie-
  risico via de database is dus kleiner dan aangenomen in het masterplan
  (self-signup op providerniveau uitzetten blijft wel een actie, als tweede
  verdedigingslinie).
- Alle betrokken tabellen waren op het moment van de fix leeg (0 rijen), dus
  geen back-up nodig vóór deze specifieke actie — het back-upscript (0.2)
  is desondanks gebouwd en getest, voor elke volgende risicovolle stap.

**Les voor de rest van het plan:** DDL die buiten `apply_migration` om wordt
uitgevoerd (bijvoorbeeld via de SQL Editor) komt niet in de migratiehistorie
terecht — dit is precies hoe de 16-sep-migraties "onzichtbaar" konden blijven
terwijl hun effect allang op de database stond. Vanaf nu gaat elke
schemawijziging via `apply_migration` (zie sessie-afronden-skill).

### 16-17 sep 2026 — masterplan "demo-klaar" (v1)

| Onderwerp | Besluit |
|---|---|
| Blauwe balk | Weg |
| Verhuur | Volledig uit de app. Bewust níet doen (voorlopig) |
| Navigatie | Overzicht · Woningdossier · Marktinzichten. **Kantoor alleen in het profielmenu** (avatar met initiaal → Mijn account · Kantoor · Uitloggen) |
| Breedte | Fluïde, max 1680 px. Ontworpen voor 1280–1920 px + 1080p-scherm. Mobiel: niets breekt, geen polijstwerk |
| "Aan de slag"-blok | Weg |
| Na inloggen | Startpagina: teambanner (adminveld `bannerfoto`), begroeting + snelkoppelingen, kerncijfers, recent bekeken |
| Mijn account | Naam wijzigen, e-mail tonen, wachtwoord wijzigen |
| Kaart | **Alleen eigen verkopen, ook in het straalpaneel**. Standaardstraal per woning **500 m** (schuiver 100–1000 m) |
| Transactiedata | **Strikt per kantoor afgeschermd** (RLS). De "gedeelde referentiepool" vervalt; verkopen van andere kantoren staan toch al onder het kantoor-id van i4housing |
| Kern van het product | Waarde · markt · concurrentie op eigen Brainbay- en Realworks-data. Content is een volwaardig onderdeel |
| Exports | **Volledige** Brainbay- + Realworks-exports in week 1, na een verwerkersovereenkomst (AVG) |
| Demo | Eén grote demo; ~~neutraal demo-kantoor voor data, i4housing-omgeving voor look-and-feel~~ → herzien 16-17 sep: eigen data in eigen omgeving |
| Verkoopadvies | Wacht op het voorbeelddocument van Quinn |
| Ontwerp | Direct bouwen, geen mockups. Compensatie: harde ontwerpstandaard + zelfreview via screenshots |
| Database | Blijft productie. **Supabase Pro zo lang mogelijk uitstellen**, daarom eigen back-ups + vangrails |
| Hosting | Beide gratis. Vercel Pro vóór het eerste betaalde contract → herzien 16-17 sep: vóór de demo |
| Apparaten | Laptop/desktop. Keukentafel-modus → backlog |
| Idee-bundel (waardecheck-widget, ROI-dashboard, prijsadvies) | Geparkeerd |
| Werkwijze | Opus plant, Sonnet bouwt (`/model opusplan`); dagelijks een sessie → herzien 16-17 sep: item-specs in de roadmap zijn Sonnet-klaar |

### 16 sep 2026 — fasemodel-herstructurering

- Micro/macro-navigatie vervangen door een **fasemodel**: één woningdossier per
  adres met fases Acquisitie → In verkoop → Verkocht.
- **Eén rol per kantoor** (geen kantoor-admin meer); huisstijl, courtage en
  team zijn platform-admin-beheerd via `/admin`.
- Echte **transactiedataset** (tabel `transacties`, CSV-import via
  `/admin/transacties`) voedt waardering, marktinzichten en verkoopkaart.
- Content genereert standaard **NL + EN** tegelijk.
- Kantoor-admin-rol vervangen — niet terugzetten.
- Regressie voor kenmerk-effecten bewust vermeden — vergelijkbare-paren-methode
  blijft de standaard (zie `docs/goals.md` § Risico's).
- Koperskant expliciet buiten scope — VestaAI dient de verkoperskant.

### 15 sep 2026 — koerswijziging naar waardering

- VestaAI was een AI-contentplatform; wordt een multi-featureplatform
  (waardering + marktinzichten naast content).
- Alle prijzen/abonnementen/Stripe volledig verwijderd (niet bevroren — weg).
- Toegang puur admin-beheerd, geen self-signup, geen proefperiode.
- Content-kalender, foto-verbetering en object-chatbot volledig verwijderd.

---

## Opgeleverd

- 16-17 sep 2026 — masterplan herzien naar v2 (demo-backwards, data eerst,
  Sonnet-klare item-specs); besluitenlogboek naar `docs/besluiten.md`;
  `goals.md`/`CLAUDE.md`/sessieskills in lijn gebracht. Geen code gewijzigd.
- 17 sep 2026 — fase 1.1 t/m 1.8: `docs/ontwerpprincipes.md`,
  `scripts/screenshots.mjs`, ui-primitives (`AppPagina`/`StatTile`/
  `EmptyState`/`Skeleton`); topbar herbouwd (groter logo, Verhuur weg,
  avatarmenu); blauwe contactbalk weg; volle breedte op `/woningen`,
  `object/[id]`, marktanalyse, `/kantoor`; "Aan de slag"-blok weg; lijst
  verhuisd naar `/woningen`, nieuwe startpagina op `/dashboard` (banner +
  kerncijfers, `lib/kerncijfers.ts` + 11 tests) met gedeelde auth-helper
  `lib/haalIngelogdeMakelaar.tsx`; nieuwe `/account`-pagina (naam + wachtwoord);
  kantoorpagina opgeschoond ("VestaAI" eruit, profiel/uitloggen verhuisd).
  `typecheck`/`test` (114 tests)/`build` groen.
- 17 sep 2026 — fase 0 (0.1 t/m 0.9) volledig doorlopen: RLS-datalek in
  `transacties` + SECURITY DEFINER-view gefixt, kapotte import-upsert gefixt,
  auth-check toegevoegd aan 3 API-routes, CSP opgeschoond (Stripe eruit),
  back-upscript gebouwd en getest, baseline-schemadump geschreven,
  documentatie (CLAUDE.md/goals.md/root-CLAUDE.md) geactualiseerd, geheugen
  opgeschoond, sessieskills (`sessie-start`/`sessie-afronden`) en de
  concept-verwerkersovereenkomst geschreven. `typecheck`/`test`/`build` groen.
- 16 sep 2026 — masterplan "demo-klaar" opgesteld en vastgelegd in
  `docs/roadmap.md`, verwijzing toegevoegd bovenaan `CLAUDE.md` (PR #15).
