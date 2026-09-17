# VestaAI — Besluitenlogboek & opleverlog

> Logboek, geen werklijst. Het plan zelf staat in `docs/roadmap.md`. Nieuwe
> besluiten komen hier bovenaan (nieuwste eerst); `/sessie-afronden` voegt ze
> toe. `/sessie-start` leest alleen de bovenste datum-sectie.

---

## Besluiten

### 18 sep 2026 (later) — ontwerprichting "i4 · zacht" + filtermodel

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

### 18 sep 2026 — ontwerpspoor voor interactieve verkenners (roadmap § 3.8)

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
| Eerste prototypes | `docs/ontwerp/marktanalyse.html` en `docs/ontwerp/verkoopkaart.html` opgeleverd (Fable, 18 sep) | plan v2 |

### 17 sep 2026 — klantvoorstel v1 voor i4housing opgesteld (nog niet verstuurd)

`docs/voorstel-i4housing.html` (bron, logo inline) + `.pdf` (Playwright-render,
2 pagina's A4, i4housing-huisstijl, informele toon, "ik"-vorm). Pagina 1:
datakoppeling (Realworks + NVM/Brainbay + open data → dataset alleen van
i4housing → waardering, marktanalyse, concurrentie, i4housing-kaart), het
verkoopadvies dat voortaan op die vier is gebaseerd, en "het wordt steeds
beter" (leert van verkopen, tekstaanpassingen, pitches). Pagina 2: één
kostenlijst (Vercel Pro, Supabase Pro, Claude API, Claude Pro, domein/e-mail,
beheer 5 uur/mnd à € 20 = € 100), bij elkaar ± € 200, afgerond naar boven
€ 250/mnd excl. btw; bouw t/m demo € 0; maandelijks, geen looptijd. Bewust
weggelaten (Quinn, 17 sep): afspraken, benodigdheden, planning, handtekening,
virtual staging.

### 17-18 sep 2026 — masterplan herzien naar v2 ("demo-backwards")

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
| Demo | Eén grote demo; ~~neutraal demo-kantoor voor data, i4housing-omgeving voor look-and-feel~~ → herzien 17-18 sep: eigen data in eigen omgeving |
| Verkoopadvies | Wacht op het voorbeelddocument van Quinn |
| Ontwerp | Direct bouwen, geen mockups. Compensatie: harde ontwerpstandaard + zelfreview via screenshots |
| Database | Blijft productie. **Supabase Pro zo lang mogelijk uitstellen**, daarom eigen back-ups + vangrails |
| Hosting | Beide gratis. Vercel Pro vóór het eerste betaalde contract → herzien 17-18 sep: vóór de demo |
| Apparaten | Laptop/desktop. Keukentafel-modus → backlog |
| Idee-bundel (waardecheck-widget, ROI-dashboard, prijsadvies) | Geparkeerd |
| Werkwijze | Opus plant, Sonnet bouwt (`/model opusplan`); dagelijks een sessie → herzien 17-18 sep: item-specs in de roadmap zijn Sonnet-klaar |

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

- 17-18 sep 2026 — masterplan herzien naar v2 (demo-backwards, data eerst,
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
