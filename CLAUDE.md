# VestaAI

> ## 🚦 Begin hier bij elke sessie
> **Lees eerst `docs/roadmap.md` § 📍 Stand van zaken** (fase, laatst opgeleverd, volgende
> item, blokkades, open vragen) vóór je iets anders doet. Dat document is het masterplan
> "demo-klaar" **v2** (herzien 16-17 sep 2026): het demoscript in zes scènes (§ 2), de
> bindende architectuurbesluiten (§ 3), en per item een Sonnet-klare spec (*Doel · Raakt ·
> Hergebruik · Spec · Tests · Klaar als*). Besluiten en opleveringen staan in
> `docs/besluiten.md` (logboek, nieuwste bovenaan).
>
> **Definition of Done** (elk item, zie `docs/roadmap.md` § 4 voor de volledige versie):
> `npm run typecheck && npm run test && npm run build` groen · huisstijl-hook schoon ·
> `npm run dod:screens` groen en `screenshots/` beoordeeld tegen `docs/ontwerpprincipes.md` · lege/laad/foutstaat
> aanwezig · `transacties` uitsluitend via `lib/transactiesQuery.ts` (vanaf fase 2, guard-test) ·
> elke nieuwe tabel met RLS per kantoor · docs bijgewerkt.
>
> **Vangrails productiedatabase:** back-up (`scripts/backup-data.mjs`) vóór elke
> risicovolle stap (migratie, import, bulk-update, opruimen); scripts dry-run als
> standaard; migraties via `apply_migration` en alleen na expliciet akkoord van Quinn als
> ze echte data raken.
>
> **Werkwijze:** Sonnet plant én bouwt vanuit de item-spec (mini-plan van ≤10 regels in de
> chat, plan mode alleen bij items gemarkeerd *(ontwerpkeuze)*). `/sessie-start` bij het
> begin, `/sessie-afronden` bij het einde van elke sessie.
>
> **Parallel met agents (sinds 23 sep 2026):** de hoofdsessie regisseert, Sonnet-subagents
> bouwen elk één roadmap-item in een eigen worktree (`isolation: worktree`, eigen dev-poort
> 31xx, node_modules als symlink). Keuze op nul bestandsoverlap; agents schrijven migraties
> maar passen ze niet toe, en raken `docs/roadmap.md`/`docs/besluiten.md` niet aan. Elke agent
> commit **na elke deelstap** (limietbestendig: bij een op gebruikslimiet gestopte sessie
> blijft het werk staan en wordt de agent hervat via SendMessage, niet opnieuw gestart).
> **Afspraak Quinn (27 sep 2026):** stopt de sessie of een agent op de gebruikslimiet en zegt
> Quinn daarna "ga door", dan hervat Claude zonder te vragen élke onderbroken agent via
> SendMessage (zelfde agent, zelfde worktree) en maakt de ronde af — nooit een nieuwe agent
> starten voor half werk. Uitzondering: stopte een agent vóór zijn eerste wijziging, dan is
> zijn worktree automatisch opgeruimd — hervatten zou hem zonder worktree in de hoofdmap laten
> werken; dan opnieuw starten met dezelfde opdracht (er gaat niets verloren).
> **Doorlopende rondes (Quinn 27 sep 2026):** is een ronde afgerond en live, dan start Claude
> meteen de volgende ronde uit `docs/roadmap.md` § Stand van zaken (volgende items, nul
> bestandsoverlap, weer met agents) — niet wachten op Quinn. Alleen stoppen bij iets
> onomkeerbaars (migratie die echte data raakt, verwijderen, betaalde API-rondes) of als
> er geen bouwbaar item meer is zonder input van Quinn; dat dan in één bericht melden.
>
> **Push/merge/live — automatisch aan het einde van elke ronde (besluit Quinn 17 sep,
> aangescherpt 26 sep 2026, geldt tot hij anders zegt):** tijdens een ronde alleen lokaal
> committen. Is een ronde klaar (alle items van die ronde gemerged en gereviewd), dan doet
> Claude **zelf, zonder dat Quinn "rond af" of `/sessie-afronden` hoeft te zeggen en zonder
> opnieuw toestemming te vragen**, alle stappen van `.claude/skills/sessie-afronden/SKILL.md`:
> DoD nalopen, docs bijwerken, committen, featurebranch pushen, PR naar `main` maken en
> mergen, en controleren dat de Vercel-deploy READY is zonder runtime-errors. Daarna pas de
> ronde melden. Reden: er is nog geen productiedata die verloren kan gaan. Migraties die
> échte data raken blijven akkoord-plichtig (vangrails hierboven).
>
> ⚠️ **Eén database, twee codeversies (les 17 sep 2026):** productie draait altijd de code
> van `main`, en er is maar één (productie)database. Een migratie die iets **weghaalt of
> hernoemt** (kolom droppen, enum-waarde wijzigen) breekt de live site zodra hij is toegepast
> en `main` nog oude code heeft — zo crashte `/dashboard` op `pitch_uitslag` na migratie 2.1.
> Regel: brekende migraties pas toepassen **samen met** push + merge van de code die erbij
> hoort (in dezelfde ronde, direct achter elkaar), of eerst een additieve variant (kolom
> toevoegen, code overzetten, later pas droppen). Additieve migraties (nieuwe tabel/kolom/
> functie) mogen wel tussendoor. Productkeuzes zelf maken en in
> `docs/besluiten.md` noteren; alleen blokkeren bij iets onomkeerbaars.

Multi-featureplatform voor makelaars, gebouwd in eerste instantie specifiek voor i4housing. De woning is de kern: één woningdossier per adres doorloopt drie fases (Verkoopadvies → In verkoop → Verkocht) — van waardebepaling en verkoopadvies tot de volledige contentsuite eenmaal de opdracht binnen is. Los daarvan: Marktinzichten, een interactieve verkenner van de eigen transactiedataset (marktanalyse, transacties opzoeken, concurrentieanalyse, verkoopkaart). Na inloggen draagt de hele omgeving het logo en de kleuren van het kantoor. Toegang is puur admin-beheerd (geen abonnementen), en er is één rol per kantoor. Strategie & doelen: `docs/goals.md` (leidend document — bij twijfel over product of prioriteiten: dit raadplegen).

> **Koerswijziging 15 september 2026.** VestaAI was een AI-contentplatform (Funda-teksten, brochures, virtual staging) en werd daarnaast een waarderingsplatform. Alle prijzen/abonnementen/Stripe zijn uit de code gehaald (niet bevroren — verwijderd).
>
> **Herstructurering 16 september 2026** (zie `docs/besluiten.md` voor het volledige besluitenlogboek): de micro/macro-navigatie is vervangen door een **fasemodel** — één woningdossier per adres met fases Acquisitie → In verkoop → Verkocht, in plaats van een los "Content"-hoofdmenu. Daarnaast: **één rol per kantoor** (geen kantoor-admin meer; huisstijl, courtage en team zijn platform-admin-beheerd via `/admin`), een echte **transactiedataset** (tabel `transacties`, CSV-import via `/admin/transacties`) die de waardering, marktinzichten en de verkoopkaart voedt, en content die standaard **NL + EN** tegelijk genereert.

> **Copyregel:** geen "Founding Member"-taal gebruiken.

> 🎨 **Bouwregel (verplicht, geldt voor élke nieuwe UI).** Alles achter de login wordt meteen in
> de huisstijl van het kantoor gebouwd — niet achteraf omgezet. Kleur via `var(--merk*)` (nooit
> een hardgecodeerde hex of een Tailwind-kleurclass, want de `blue`-schaal rendert groen),
> vorm en lettertype via `var(--merk-radius-*)`/`var(--merk-font-*)`, tekst informeel ("je/jouw")
> zonder de naam VestaAI, en "woning" in plaats van "object". Volledige checklist:
> `.claude/skills/kantoorhuisstijl/SKILL.md`. Een hook waarschuwt bij overtredingen.
> Uitzonderingen die bewust VestaAI-groen blijven: landing, `/login`, `/contact`, `/admin`,
> `LandingPageClient`, `PublicNav` en `components/ui/tokens.ts`.

## Hoofdstructuur

Fasemodel (besluit 16 sep 2026) — volledig besluitenlogboek in `docs/besluiten.md`:

- **Woningdossier** (`app/(app)/object/[id]/` + `components/ObjectWorkspace.tsx`) — één dossier per adres, met **één gedeelde intake** (`components/PropertyForm.tsx`, een zesstappen-wizard: adres, woning, staat & afwerking, ligging & buitenruimte, verhaal, commercieel). Elk nieuw dossier start in fase **Acquisitie**, en doorloopt:
  - **Verkoopadvies** (voorheen "Acquisitie"; hernoemd op besluit Quinn 17 sep 2026 — label overal "Verkoopadvies", interne waarde sinds schema v2 (2.1) ook `verkoopadvies` — in code én data, geverifieerd 27 sep 2026) — alleen waardebepaling en verkoopadvies zichtbaar (er zijn nog geen foto's of een vaste vraagprijs). **Geen pitch-concept meer (besluit Quinn 17 sep 2026):** de opdracht is zo goed als binnen zodra het verkoopadvies op papier staat; er bestaan geen "gewonnen/verloren pitches", geen winratio, geen scorebord. Sinds item 1.9c (17 sep 2026) is dat uit de code: geen uitslag-schakelaar, scorebord of winratio meer, en de code leest of schrijft `objecten.pitch_uitslag` niet; de kolom zelf vervalt in schema v2 (2.1). De makelaar zet het dossier zelf door naar In verkoop met de knop in `FaseToggle`.
  - **In verkoop** — hetzelfde als Verkoopadvies, plus de volledige contentsuite (Funda/brochure/social/e-mail/buurt, virtual staging, documentenassistent, export) — zie `components/ObjectWorkspace.tsx`. Dossier en content zijn los (fase 3, 17 sep 2026): `POST /api/object` maakt een dossier aan zonder Claude (~1 s, `content_status = 'geen'`, `outputs_json` = `LEEG_CONTENT_OUTPUT`); content komt via `POST /api/generate { objectId }` op knopdruk ("Genereer content") of automatisch bij de overgang naar In verkoop. Kernlogica in `lib/contentGeneratie.ts`: lock per dossier via `content_status = 'bezig'` + `content_bezig_sinds` (verloopt na 6 min, 409 bij dubbele start), eindigt in `klaar` of `fout`. `components/ContentTekstenTab.tsx` toont de staten en pollt `/api/object/[id]/status` elke 3 s. ⚠️ NL+EN duurt ~3 min tegen een Vercel-limiet van 300 s.
  - **Woningtype** in de intake is `woningtype_groep` (appartement/rijwoning/halfvrijstaand/vrijstaand) + optioneel `woningtype_sub`, dezelfde taxonomie als `transacties`. Oude dossiers met het vroegere platte `woningtype` worden bij elke `PropertyInputSchema.parse()` gemapt (`migreerOudWoningtype`); lees het type altijd via `woningtypeLabel()`, nooit zelf.
  - **Verkocht** — alles blijft bereikbaar, puur archief-gelabeld.
  - **Waardering (Module B)** — `lib/waardering.ts` + `components/WaardebepalingPaneel.tsx`: vergelijkbare-verkopen-methode (geen regressie — bij deze dataset-schaal te schijnzeker) op de tabel `transacties`, met modulaire aan/uit-blokken (garage/tuin) via vergelijkbare-paren, een bandbreedte die verbreedt bij weinig referenties, en een makelaar-correctie met verplichte motivatie (`waardering-actions.ts`, kolom `objecten.waardering_json`). Puur een onderbouwde indicatie voor het verkoopadvies — geen NWWI-taxatie. **Pdf van één pagina** (item 4.7): `GET /api/pdf/waardebepaling?object_id=…` + `components/WaardebepalingPdfTemplate.tsx`, knop in het paneel. De route **rekent niets opnieuw uit** — hij leest de opgeslagen `waardering_json`, zodat de pdf nooit een ander bedrag toont dan het scherm. Sinds 28 sep met een statische locatiekaart (`lib/statischeKaart.ts`: PDOK-pastel-WMTS-tegels samengesteld met `sharp`, genummerde top-6-referenties); best-effort — mislukken de tegels (3 s timeout), dan komt de pdf zonder kaart. ⚠️ `sharp`: nooit `.extract()` direct na `.composite()` in één keten (eerst naar een buffer). ~2,5 s.
  - **AI USP-extractor** — `lib/claude.ts` `extraheerUsps()` + `/api/object/[id]/usps`: vertaalt de vrije intaketekst naar gestructureerde USP's (`components/UspExtractorPaneel.tsx`, kolom `objecten.usps_structuur`).
  - **Verkoopadvies** — nog te bouwen (`docs/roadmap.md` fase 11, bewust geblokkeerd tot Quinns voorbeelddocument er is; het datacontract staat daar al). Alle onderliggende data (waardering, buurtkaart, kantoorprofiel, courtage) is al beschikbaar.
  - **Dossierkaart** (`components/WaarderingKaart.tsx`, in `WaardebepalingPaneel`) — één kaart met twee lagen: "Referenties" (van de waardering) en "Eigen verkopen" binnen 250/500/1000 m (sinds 27 sep 2026; het losse `StraalKaartPaneel` is weg). Standaardlaag en kader: `lib/dossierKaart.ts`.
- **Marktinzichten** (`app/(app)/marktanalyse/`, los van één woning) — vier interactieve explorers, geen statische dashboards:
  - **Marktanalyse** (`components/MarktanalyseExplorer.tsx` + `lib/marktanalyse.ts`) — filters op type/wijk/periode, segmentvergelijking, recharts-grafieken (prijs, m²-prijs, doorlooptijd).
  - **Transacties opzoeken** (`components/TransactiesZoeken.tsx`) — zoeken/filteren over de dataset; "meenemen als referentie" wacht op verdere waarderings-integratie.
  - **Concurrentieanalyse** (`components/ConcurrentieExplorer.tsx` + `lib/concurrentie.ts`) — marktaandeel, wie wint welk segment, presteren wij beter, concurrent-profielen. Draait op `transacties.verkopend_kantoor`; toont een eerlijke lege staat zolang dat veld niet gevuld is.
  - **Verkoopkaart** (`app/(app)/marktanalyse/kaart/`, `components/VerkoopkaartExplorerV2.tsx`, logica `lib/verkoopkaart.ts`) — alleen eigen verkopen als beeldmerk-pin op MapLibre, met live filters, tijdlijn en zijlijst, en een schakelbare laag buurtgrenzen (CBS 2024 via PDOK, proxy `app/api/kaart/buurtgrenzen`, `lib/buurtgrenzen.ts`; standaard uit).
- **Verhuur** — volledig uit de app gehaald (fase 1.3, masterplan 16-17 sep 2026, zie `docs/roadmap.md`). Stond eerder als "Binnenkort" in de topbar; nu bewust níet gebouwd, geen restant meer in de navigatie.
- **⌘K-zoeken** (`components/ZoekPalet.tsx`, knop in `AppTopbar`, `app/api/zoeken`, `lib/zoeken.ts`) — woningen van het eigen kantoor, pagina's en een snelkoppeling naar Transacties opzoeken (`?zoek=`).
- **Kantoor** (`app/(app)/kantoor/`) — read-only pagina achter het profielmenu (avatar rechtsboven): huisstijl-preview, kantoorgegevens, team, statistieken. Bewerken kan alleen via `/admin/kantoor/[id]` (platform-admin). Eigen naam/wachtwoord staan sinds fase 1.7 op `/account`, niet meer hier.

**Eén rol per kantoor** (besluit 16 sep 2026): iedereen met een login binnen een kantoor ziet en kan hetzelfde — geen kantoor-admin meer. De kolom `makelaars.role` bestaat nog maar stuurt geen rechten meer binnen het kantoor. Platform-admin (Quinn, `lib/admin.ts`) is een los concept.

**Transactiedataset** (tabel `transacties`, zie "Datamodel") — i4housing's eigen Brainbay- en Realworks-verkoopdata. **Strikt per kantoor afgeschermd via RLS** (besluit masterplan 16-17 sep 2026, zie `docs/besluiten.md`): een ingelogde makelaar ziet alléén de transacties van zijn eigen kantoor, nooit die van een ander kantoor (ook niet het interne demo-/testkantoor). Dit verving een eerdere, bewust foute inrichting als "gedeelde referentiepool" die bij verificatie een live cross-tenant datalek bleek — zie de migratie `20260916213323_rls_kantoor_isolatie_transacties.sql` en `supabase/schema-baseline.sql` voor de volledige toedracht. Geïmporteerd door de platform-admin via `/admin/transacties` (CSV, kolomherkenning via aliassen in `lib/transactieImport.ts`, upsert op kantoor+adres+datum voor herhaalbare herimport) — het kantoor importeert zelf niets (concierge-model, zie `docs/goals.md` § Bedieningsmodel). De kolom `eigen_verkoop` bepaalt wat op de verkoopkaart een vlaggetje krijgt (alleen eigen verkopen); de rest van de dataset voedt waardering en marktanalyse. `verkopend_kantoor` (optioneel) voedt de concurrentieanalyse, zodra bevestigd dat de export dit veld bevat.

⚠️ **Elke query op `transacties` (en de view `transacties_met_coordinaten`) via de sessie-gebonden client** (`createServerSupabaseClient()`) krijgt automatisch alléén het eigen kantoor terug dankzij RLS — reken hier niet op een handmatig `.eq('kantoor_id', …)`-filter als enige bescherming, en voeg bij een nieuwe view op deze tabel altijd `with (security_invoker = true)` toe (anders draait de view als de aanmakende rol en omzeilt hij RLS alsnog).

**Huisstijl** (`lib/branding.ts`) — bouwt uit `kantoren.huisstijl_json` een volledig palet en zet dat als CSS-variabelen (`--merk*`) in `app/(app)/layout.tsx`: kleuren (`primaire_kleur`, `accent_kleur`), lettertype (`jakarta` · `gantari` · `nunito`), vormtaal (`zacht` · `strak`), favicon, contactgegevens en sfeerbeeld. Volledig **platform-admin-beheerd** sinds 16 sep 2026: bewerkbaar formulier in `app/admin/kantoor/HuisstijlForm.tsx` (bereikbaar via `/admin/kantoor/[id]`), het kantoor zelf ziet alleen een read-only preview op `/kantoor`. Componenten in de ingelogde omgeving gebruiken `var(--merk)` etc., nooit een hardgecodeerde merkkleur. **Kantoorinstellingen** (courtage, kantoorprofiel, werkgebied — `lib/schemas.ts` `KantoorInstellingenSchema`, kolom `kantoren.instellingen_json`) zijn eveneens platform-admin-beheerd via `app/admin/kantoor/InstellingenForm.tsx`.

**Stijl leren** (`stijl_bewerkingen`-tabel) — als een makelaar een gegenereerde tekst handmatig bijwerkt, kan het kantoor zelf de daaruit gedestilleerde schrijfregels goedkeuren via `components/StijlLerenPaneel.tsx`, gemount in het woningdossier zelf (niet in een instellingenscherm — dat is sinds 16 sep 2026 platform-admin-gebied).

Eerste pilotkantoor: **i4 Housing** (Wassenaar, NVM). Geverifieerd uit hun eigen theme-CSS op i4housing.nl: blauw `#0080C8`, rood `#C61E45`, lettertype Proxima Nova (betaald → we voeren Nunito Sans als vrije tegenhanger). Vorm: sinds 17 sep 2026 **`zacht`** (afgeronde, Apple-achtige stijl — besluit Quinn, zie `docs/besluiten.md`; was `strak`, wordt omgezet in roadmap-item 1.9). Ontwerpkit en prototypes: `docs/ontwerp/` (README = spec voor tokens, primitives, filtermodel, pin). Platform-admin is `quinn.berkouwer@gmail.com` (vaste waarde in `lib/admin.ts`, uitbreidbaar via env `PLATFORM_ADMIN_EMAILS`); `quinn.berkouwer@icloud.com` is een gewone makelaar bij i4 Housing (handig als `DOD_EMAIL` voor de kantoorkant). Logo/favicon/sfeerbeelden staan in Storage-bucket `kantoor-assets` onder de kantoor-id; `scripts/repair-i4housing-branding.mjs` zet het geheel opnieuw goed (standaard dry-run, `--write` om te schrijven) en `scripts/controleer-huisstijl.mjs` logt in met Playwright en meldt élke plek waar nog VestaAI-groen of de naam doorkomt — ook in dossiertabs, lege staten, Radix-portals, `/login/<slug>` en de pdf's (item 9.3; de groentinten leidt `scripts/lib/vestaGroen.mjs` af uit de tokenbestanden).

⚠️ **Nooit `new Date()` (of iets anders dat per omgeving verschilt) in een client component** — les 19 sep 2026. Productie draait op Vercel in **UTC**, de makelaar zit in **Europe/Amsterdam**: de server schreef "Goedemorgen" waar de browser "Goedemiddag" verwachtte. Dat is een hydratiemismatch (React #425/#422), en die breekt niet alleen dát stukje tekst maar laat de **hele pagina half-levend** achter — het profielmenu in de topbar reageerde daardoor nergens meer op, terwijl er niets mis was met de topbar. Reken tijd/datum/willekeur server-side uit (zie `lib/begroeting.ts`) en geef het door als prop. Verdenk bij "knop doet niets" altijd eerst de hydratie: `page.on('pageerror')` in Playwright wijst het binnen een minuut aan, en het is meestal een ándere component op dezelfde pagina. Zelfde categorie: laat een element nooit op `opacity: 0` staan tot een `useEffect` het zichtbaar maakt — faalt de hydratie, dan blijft het onzichtbaar. Gebruik een CSS-animatie.

⚠️ **Een dynamic import beschermt de kinderen niet** — les 27 sep 2026 (12.3): `BasisKaart` was `dynamic(ssr:false)`, maar de laag-componenten (`VerkopenLaag`, `ReferentiesLaag`, `WoningenKaartLaag`) importeerden zelf `maplibre-gl`, dus 278 kB gzip zat alsnog in de hoofdbundel van elke kaartpagina. Zware libs in een laag: alleen het type statisch importeren, de runtime via `await import()` in het effect. Controleer met `ANALYZE=true npm run build`.

⚠️ **Kaarten laden lazy** (sinds 27 sep 2026): `BasisKaart` mount MapLibre pas als de kaart binnen 200 px van de viewport komt. Staat een kaart boven de vouw (hoofdinhoud van de pagina), geef dan `direct` mee — anders ziet de gebruiker eerst een skelet.

⚠️ **BAG-API (Kadaster): vrije tekst via `q`, `pageSize` ≥ 10** — les 27 sep 2026: de adres-autocomplete en het voorvullen van bouwjaar/oppervlakte deden ongemerkt niets (hoe lang precies is niet nagegaan), omdat `/adressen?zoekresultaat=…` een 400 gaf en de routes dat stil tot "leeg" opvouwden. Alles loopt nu via `lib/bag.ts` (`q`, `adressenuitgebreid` voor bouwjaar + oppervlakte in één call, header `Accept-Crs: epsg:28992`); een mislukte call wordt gelogd. Zelfde les als bij de verrijking: een externe bron die faalt mag nooit ongemerkt als "geen resultaat" doorgaan.

⚠️ **Eigen overlays op een MapLibre-kaart nooit rechtsboven** — les 27 sep 2026: daar zit `NavigationControl` (de zoomknoppen). Bedieningselementen (laagschakelaar, straal-pillen) in de kaartkop, niet óp de kaart. Alleen zichtbaar op een screenshot, niet in typecheck/tests.

⚠️ **Een standaardkeuze die eenmalig in een `useEffect` wordt gezet, wacht op de écht geladen data** — les 27 sep 2026: de dossierkaart koos "Eigen verkopen" bij een dossier met 17 referenties, omdat het effect al vuurde op een memo die vóór de fetch een waarde had (opgeslagen uitkomst) terwijl de coördinaten nog leeg waren. Gate op de fetch-resultaten (`serverData`), niet op een placeholder.

⚠️ **Verouderde "nog niet toegepast"-commentaren kosten dubbel werk** — les 27 sep 2026 (op 28 sep opnieuw gezien bij de concurrentie-v2-RPC's; daarna systematisch opgeruimd — alleen `transacties.makelaar_id` is echt nog niet toegepast): een oud bestandscommentaar in `lib/transactiesQuery.ts` liet een performance-meting concluderen dat "Transacties opzoeken" nog een RPC nodig had, terwijl die al sinds 6.2 live stond. Werk bij het toepassen van een migratie ook de commentaren in code en migratiebestand bij; bij twijfel: `pg_get_functiondef()` op productie.

⚠️ **Een Next-routebestand (`route.ts`) mag alleen route-exports hebben** (`GET`/`POST`/`maxDuration`/…) — een geëxporteerde hulpfunctie laat `next build` falen terwijl typecheck en tests groen zijn. Hulpfuncties in `lib/`.

⚠️ **Nooit een absoluut pad als `logo_url`** — dat was de oorzaak van het "?"-logo: `/kantoren/i4housing/logo.png` bestond alleen lokaal en niet in de deploy. Assets horen in Storage, met een volledige URL.

⚠️ **`var(--merk,#1A6B45)`-fallbacks maken een kapotte kantoor-lookup onzichtbaar**: bij een mislukte database-query valt de hele omgeving stil terug op VestaAI-groen, zonder foutmelding. Zie je onverwacht groen in de ingelogde omgeving, controleer dan eerst of de kantoor-query wel data teruggeeft — het is zelden een CSS-bug.

⚠️ **`overflow: hidden` op een container clipt ook een `position: absolute`-kind erin** — les 23 sep 2026: het profielmenu in `AppTopbar.tsx` viel "weg achter de pagina" doordat de topbar-rij `overflow: hidden` had (bedoeld om de scrollende nav-pillen binnen de balk te houden) en het dropdown-menu daar toevallig ook in stond. Geen stacking-/z-index-bug, gewoon geclipt. Zet `overflow: hidden`/`auto` altijd op het kleinste element dat het echt nodig heeft (hier: de nav zelf, die al zijn eigen `overflowX: auto` had), nooit op een gedeelde rij-container waar ook een popover/dropdown in leeft.

⚠️ **Een Sheet/Dialog die je opent vanuit een menu, mount je búiten dat menu** — les 23 sep 2026 (feedbackknop, 12.4): de sheet stond eerst ín het avatar-/mobiele menu; het sluiten van dat menu bij het openen van de sheet unmountte de sheet meteen weer, dus hij ging op 390 px nooit open. Lift de open-state naar de ouder (`AppTopbar`) en houd de sheet zelf altijd gemount (zie `components/FeedbackKnop.tsx`).

⚠️ **Radix-portals staan búiten de merk-variabelen** — les 24 sep 2026: `--merk*` stond alleen inline op de layout-div van `app/(app)/layout.tsx`, maar Sheet/Popover/Tooltip/SelectMenu renderen via een portal direct in `<body>` en erfden daar de VestaAI-groene terugval van `:root` uit `globals.css` (het concurrentprofiel was groen bij een zwart kantoor). Sindsdien schrijft de layout de variabelen óók als `:root`-regel (`brandingRootCss()` in `lib/branding.ts`). Zie je groen in een drawer/dropdown: eerst controleren of die regel er staat.

⚠️ **Gratis externe bronnen in `lib/verrijking.ts` zijn onbetrouwbaar, en een stille terugval maakt dat onzichtbaar** — les 24 sep 2026. De publieke Overpass-servers geven onder last 504/429/timeouts (3 van 12 geslaagd in een meting), en het oude WOZ-endpoint bestond al maanden niet meer; beide vielen stil terug op "leeg". Regels: elke bron geeft `ok`/`leeg`/`mislukt`/`niet_gekoppeld` (nooit fouten opvouwen tot leeg), een mislukte bron wordt gelogd (`[verrijking] …`, zonder adres), en voor alles wat in de demo zit bestaat een stabiele terugval (CBS). **WOZ per woning vult de makelaar zelf in** (besluit Quinn 24 sep: alleen gratis, en een gratis toegestane WOZ-API bestaat niet): `input_json.woz_waarde`/`woz_peiljaar`, `lib/woz.ts`, `components/WozKaart.tsx`. De backend van het WOZ-waardeloket (`api.kadaster.nl/lvwoz/…`) is geen toegestane API — niet omheen bouwen.

**Landingspagina** (`components/LandingPageClient.tsx`) — het oorspronkelijke, uitgebreide marketingontwerp. Geen prijzen, geen zelf-aanmelden — CTA's wijzen naar `/contact` (toegang aanvragen) of `/login`. Nieuwe kantoren worden handmatig klaargezet via `/admin`.

**Content-vlag** (`lib/features.ts`, `CONTENT_VERGRENDELD`) — momenteel `false` (ontgrendeld). Zet 'm op `true` om de contentsuite in één keer weer op slot te zetten. Content genereert sinds 16 sep 2026 altijd **NL + EN parallel** (`generateContentBeideTalen` in `lib/claude.ts`, draait de bestaande generateContent-pipeline twee keer — Engels is best-effort en blokkeert NL niet bij falen); `ResultTabs.tsx` toont een NL/EN-toggle zodra Engelse content bestaat, bewerken/herschrijven blijft uitsluitend op NL werken. De vinkjes in intakestap 5 (`content_keuzes`) filteren sinds 8.3 niets meer (`toepassenContentKeuzes()` is weg) — opruimen staat als volgend item in de roadmap. **Tekstsjabloon** (item 8.2): `huisstijl_json.tekstsjabloon` schrijft de opbouw van `funda_tekst` hard voor (openingslabel, koppen in volgorde, slotzin, richtlengte, EN-koppen/-slotzin); `lib/tekstsjabloon.ts` rendert het als derde cachebaar systeemblok en valideert de output, met bij een afwijking één gerichte herkansing van alleen `funda_tekst` (sinds 8.3; alleen als de kern-call < 110 s duurde). Beheer via `/admin/kantoor/[id]` → Tekstsjabloon. **Outputset v2** (item 8.3): de kern-call levert 7 velden (Funda, brochure, Instagram, LinkedIn, WhatsApp-sneak-preview, koper-e-mail, buurt); extra's (open huis, follow-ups, videoscript, energieadvies, FAQ) komen op knopdruk via `POST /api/object/[id]/extra?type=` (409 zolang de kern loopt) en blijven bij opnieuw genereren staan (`behoudExtras()` in `lib/contentExtra.ts`). Lees `outputs_json` in de UI altijd via `metLegacyFallback()` (`ResultTabs.tsx`) — het komt ongevalideerd uit de database en oude dossiers missen de nieuwe velden.

**Toegang** (`app/admin/`) — puur admin-beheerd, geen plan of proefperiode. De platform-admin maakt via `/admin` een kantoor aan (`createKantoor`) en koppelt daar accounts aan met een zelfgekozen wachtwoord (`addMakelaarAccount`), ook voor extra teamleden bij een bestaand kantoor (via `/admin/kantoor/[id]`, `VoegTeamlidToe.tsx`/`TeamBeheer.tsx`). Intrekken van toegang gaat via `setActief` (bant/ontbant alle auth-users van een kantoor). Zelf-aanmelden en self-serve teamuitnodigingen bestaan niet meer (geen `/auth/verify`-flow meer).

## Stack

| Laag | Tech |
|------|------|
| Frontend + API routes | Next.js 14 (App Router) |
| Database + Auth + Storage | Supabase (+ PostGIS-extensie voor `transacties.geo`) |
| AI engine (contentsuite, AI USP-extractor) | Claude API — `claude-sonnet-4-6` |
| Virtual staging | Gemini API — `gemini-2.0-flash-exp` (`GOOGLE_AI_API_KEY`) |
| Transactiedataset (waardering, marktinzichten, kaart) | i4housing's eigen Realworks-verkoopdata + overige verkopen, CSV-import via `/admin/transacties` |
| Kaart | MapLibre GL + PDOK BRT-Achtergrondkaart-vectortiles (pastel), één stack in `components/kaart/` — Leaflet is weg sinds item 7.4 |
| Grafieken | `recharts` |
| PDF export | react-pdf — ⚠️ de ingebouwde Helvetica is **WinAnsi**: `·` `•` `×` `²` `—` `€` renderen, maar `⚠` (U+26A0) en de meeste emoji niet. Styles worden pas tijdens het renderen gevalideerd, dus typecheck én build zien een kapotte style-prop níet — dek een nieuw pdf-document af met een test die hem écht rendert (`components/WaardebepalingPdfTemplate.test.ts`). Een logo-URL altijd eerst door `bruikbaarLogo()`: `<Image>` kent geen `onError` en een dode URL laat de hele generatie klappen |
| Transactionele e-mail | Resend |
| Styling | Tailwind CSS |
| Validatie | Zod |
| Deploy | Vercel |

Geen betalingsverwerker meer — Stripe is volledig verwijderd (zie "Prijzen" hieronder).

## Datamodel (Supabase)

```sql
kantoren:     id, name, logo_url, huisstijl_json, instellingen_json
makelaars:    id, kantoor_id, name, email, role  -- role stuurt sinds 16 sep geen rechten meer
objecten:     id, kantoor_id, makelaar_id, address, input_json, outputs_json, outputs_json_en,
              created_at, status, fase, pitch_uitslag, lat, lng, waardering_json, usps_structuur
transacties:  id, kantoor_id, adres, postcode, plaats, wijk, buurt, geo (geography),
              verkoopprijs, vraagprijs, verkoopdatum, looptijd_dagen, woningtype,
              woonoppervlak_m2, perceel_m2, inhoud_m3, bouwjaar, energielabel, kamers,
              garage, tuin, buitenruimte, eigen_verkoop, verkopend_kantoor, created_at
```

`objecten.fase` (`verkoopadvies` | `in_verkoop` | `verkocht`, zie `ObjectFaseSchema` in `lib/schemas.ts`) bepaalt welke modules zichtbaar zijn — zie `components/ObjectWorkspace.tsx`. `objecten.status` (`draft`/`published`/`onder_bod`/`verkocht`) is de Funda-publicatiestatus binnen de fase In verkoop, los van `fase` zelf. `transacties_met_coordinaten` is een view die `geo` als `lat`/`lng`-floats ontsluit (PostgREST geeft `geography` anders als EWKB-hex terug) — gebruik die view, niet de tabel zelf, voor alles dat coördinaten nodig heeft.

`huisstijl_json.primaire_kleur` + `.accent_kleur` voeden `lib/branding.ts`. `instellingen_json` (courtage, kantoorprofiel, werkgebied) volgt `lib/schemas.ts` `KantoorInstellingenSchema`.

Nog niet toegepast op de database (migraties staan klaar in `supabase/migrations/`, vereisen Quinns akkoord): het opruimen van `post_planning`/`chatbot_leads`/`chatbot_faq`/`referrals` en de kolommen `kantoren.plan`/`trial_ends_at`/`stripe_id`/`referral_code`/`objecten.chat_publiek`/`chat_foto_url`/`object_documenten.publiek_chatbaar` — allemaal ongebruikt sinds de koerswijzigingen van 15 en 16 sep 2026.

## Prijzen

**Volledig verwijderd op 15 sep 2026** (niet bevroren — weg): geen abonnementen, geen `lib/plans.ts`, geen Stripe (checkout/customer-portal/webhooks-routes, de `stripe`-npm-dependency, en de trial-waarschuwings-cron zijn allemaal verwijderd). Toegang is puur admin-beheerd, zie "Toegang" hierboven. Nieuwe prijslogica komt pas als daar opnieuw over besloten wordt — zie `docs/goals.md` § Prijzen.

## Mappenstructuur

```
VestaAI/
├── app/
│   ├── page.tsx               # landingspagina (LandingPageClient) — gesloten platform, geen prijzen
│   ├── login/page.tsx         # alleen inloggen + wachtwoord-reset
│   ├── login/[slug]/          # kantoorlogin in huisstijl (9.1) — branding via RPC kantoor_branding_publiek
│   ├── (app)/                 # ingelogde route-group met topbar (AppTopbar) + kantoorbranding
│   │   ├── dashboard/          #   startpagina na inloggen (sinds fase 1.6, 16-17 sep 2026):
│   │   │                       #   StartBanner + Kerncijfers (geen snelkoppelingen sinds 1.9c)
│   │   ├── woningen/            #   woningdossier-lijst, fase-filters, knop "Woning toevoegen" in de kop
│   │   ├── object/new · [id]/  #   gedeelde intake (PropertyForm) · woningdossier (ObjectWorkspace,
│   │   │                       #   fase-afhankelijk: waardering/verkoopadvies altijd, content pas
│   │   │                       #   vanaf "In verkoop")
│   │   ├── marktanalyse/        #   4 interactieve explorers: marktanalyse · transacties ·
│   │   │                       #   concurrentie · kaart (elk een eigen pil in de topbar, geen subnav)
│   │   ├── kantoor/             #   read-only: huisstijl-preview, team, statistieken
│   │   └── account/             #   "Mijn account" (fase 1.7): naam wijzigen, wachtwoord wijzigen
│   ├── admin/                  # platform-admin: kantoor/account-beheer, per-kantoor huisstijl +
│   │   ├── kantoor/[id]/        #   instellingen + team (HuisstijlForm/InstellingenForm/TeamBeheer),
│   │   └── transacties/         #   transactie-CSV-import
│   └── api/                    # generate (NL+EN), fotos/documenten/pdf/export, verrijking,
│                                #   object/[id]/usps, stats, object, auth, me
├── components/
│   ├── AppTopbar.tsx           # topbar (herbouwd 1.3; plat vanaf 1.9c): Overzicht · Woningdossier · Marktanalyse · Transacties · Concurrentie · Verkoopkaart, geen dropdowns;
│   │                           #   avatarmenu rechtsboven (Mijn account · Kantoor · Uitloggen).
│   │                           #   Verhuur volledig uit de app (was hier "op slot")
│   ├── ObjectWorkspace.tsx     # woningdossier, fase-afhankelijke weergave
│   ├── BrochurePdfTemplate.tsx # brochure-pdf in kantoorstijl (8.4, GET /api/pdf/brochure)
│   ├── DezeWoningPaneel.tsx    # live samenvatting naast de intake (10.5)
│   ├── WaardebepalingPaneel.tsx / UspExtractorPaneel.tsx   # Module B
│   ├── VerkoopkaartExplorerV2.tsx / WaarderingKaart.tsx   # op components/kaart/ (TransactieMinikaart staat ín kaart/)
│   ├── MarktanalyseExplorer.tsx / ConcurrentieExplorer.tsx / TransactiesZoeken.tsx
│   ├── StijlLerenPaneel.tsx    # "leren van bewerkingen", gemount in het woningdossier
│   ├── LandingPageClient.tsx   # uitgebreide marketing-landingspagina
│   ├── InAanbouw.tsx           # herbruikbaar paneel voor bewust vergrendelde functies
│   ├── InlogFormulier.tsx      # gedeelde login (generiek VestaAI-groen of kantoorstijl)
│   ├── kaart/                  # MapLibre-stack (fase 7): BasisKaart, VerkopenLaag, StraalLaag, HoverKaart,
│   │                           #   ReferentiesLaag/SubjectPin/ReferentiePin, KaderLaag (herkaderen na mount);
│   │                           #   worker zelf gehost in public/maplibre-gl/ (guard-test)
│   └── ui/                     # design-system: tokens.ts + primitives (o.a. AppPagina, StatTile,
│                               #   EmptyState, Skeleton — sinds fase 1.1)
├── lib/
│   ├── branding.ts             # kantoorpalet uit huisstijl_json → CSS-variabelen
│   ├── waardering.ts           # referentieselectie, bandbreedte, kenmerk-effecten (vergelijkbare-paren)
│   ├── marktanalyse.ts / concurrentie.ts   # aggregatielogica voor de explorers
│   ├── filterVergelijk.ts       # bereikGelijk/verzamelingGelijk voor filterpillen (niet zelf kopiëren)
│   ├── transactieImport.ts     # CSV-parser met kolomherkenning via aliassen
│   ├── geo.ts                  # haversine-afstand (straal-filter verkoopkaart)
│   ├── features.ts             # CONTENT_VERGRENDELD-vlag + contentVergrendeldAntwoord()
│   ├── admin.ts                # platform-admin-lijst (isPlatformAdmin)
│   ├── schemas.ts              # Zod-schemas + TypeScript types (client-safe)
│   ├── claude.ts                # Claude API wrapper (contentsuite NL+EN, USP-extractor)
│   ├── aiModellen.ts            # énige plek voor Claude-modelstrings (8.1, guard-test)
│   ├── opmaak.ts                # nl-NL-opmaak voor élk getal/datum (Amsterdamse tijd)
│   ├── gebruik.ts               # logGebruik() → gebruik_events (Recent bekeken, 10.4)
│   ├── verrijking.ts            # WOZ/CBS/Overpass/PDOK-verrijking (incl. coördinaat)
│   ├── bag.ts                   # BAG-API: adres zoeken (q) + bouwjaar/oppervlakte (adressenuitgebreid)
│   ├── ensureMakelaar.ts        # vangnet: koppelt uitgenodigd account aan zijn kantoor
│   └── supabase.ts · email.ts
├── docs/
│   ├── goals.md                # strategie & doelen (leidend, koerswijziging 15 sep)
│   ├── roadmap.md              # masterplan v2: stand van zaken, demoscript, architectuur-
│   │                           #   besluiten, fases met Sonnet-klare item-specs, planning
│   ├── besluiten.md            # besluitenlogboek + opleverlog (nieuwste bovenaan)
│   ├── ontwerpprincipes.md     # layout/typografie/beweging/data-weergave (DoD-toetsing)
│   ├── ontwerp/                # interactieve HTML-prototypes per hero-scherm = de spec
│   │                           #   (roadmap § 3.8; Sonnet port 1-op-1; review via skill
│   │                           #   `ontwerpreview`)
│   ├── kostenschatting.md      # interne API-/infrakosten
│   ├── voorstel-i4housing.html/.pdf  # klantvoorstel v1 (datakoppeling + één kostenlijst, 2 p.), 17 sep 2026;
│   │                           #   html is de bron (logo inline), pdf via Playwright gerenderd
│   ├── i4housing-onderzoek.md  # klantonderzoek i4housing
│   └── data-integraties/       # API-referenties (CBS-buurtdata etc.)
```

## To-do-conventie

`docs/roadmap.md` is het werkplan: items binnen een fase worden afgevinkt (`- [ ]` → `- [x]`); een volledig afgeronde fase wordt ingeklapt tot één regel met ✅ (zoals fase 0). Wat is opgeleverd en welke besluiten zijn genomen staat in `docs/besluiten.md` — niet in de roadmap, zodat die elke sessie goedkoop te lezen blijft. Nieuwe ideeën gaan naar roadmap § 9 Backlog, nooit het lopende item in.

## Conventies

- TypeScript strict mode — geen `any`.
- Server Components als default; `'use client'` alleen waar interactiviteit nodig.
- **Aanspreekvorm:** de ingelogde omgeving schrijft informeel ("je/jouw"), de publieke pagina's (landing, `/login`, `/contact`) formeel ("u"). Eén globale keuze, geen instelling per kantoor — dat zou een vertaallaag over elke string vragen.
- **Geen productnaam in de kantooromgeving** (met één uitzondering): achter de login staat nergens "VestaAI" in zichtbare tekst; schrijf neutraal ("we", "het platform") of gebruik de kantoornaam uit `branding.naam`. De paginatitels krijgen hun achtervoegsel van de route-group-layout, dus pagina-`metadata` bevat alleen de paginanaam. **Uitzondering (besluit 16 sep 2026, herzien):** de topbar (`components/AppTopbar.tsx`) toont linksboven een klein "VestaAI × [kantoorlogo]"-lockup, vast VestaAI-groen — Quinn wil zichtbaar houden dat het platform van VestaAI is. Nergens anders in de kantooromgeving groeit dit uit tot meer tekst of een groter element.
- **Grijstinten kleurloos houden:** geen groen-getinte grijzen (`#E9EFEB`, `#F1F7F3`, `#9AA6A0` …) in de ingelogde omgeving — die vloeken bij een blauw of rood kantoor. Neutraal grijs of `var(--merk-zacht)`/`var(--merk-rand)` gebruiken; de palette staat in `components/ui/tokens.ts`.
- **Semantische kleuren nooit aan `--merk-accent` hangen:** een afgevinkte stap of succesmelding in de accentkleur wordt rood bij i4 Housing en leest dan als fout. Gebruik `var(--merk)` of neutraal grijs. Een tweede, louter onderscheidende datareeks in een grafiek (bv. "Segment B" naast "Segment A") mag wél `--merk-accent` gebruiken — dat is geen semantische status.
- Merkkleuren in de ingelogde omgeving altijd via `var(--merk)`/`var(--merk-hover)`/`var(--merk-zacht)`/`var(--merk-rand)`/`var(--merk-accent)`/`var(--merk-op)` (gezet door `lib/branding.ts` in `app/(app)/layout.tsx`) — **nooit** een hardgecodeerde hexkleur voor iets dat merkgebonden is. Dat is wat white-label per kantoor laat werken.
- Een nieuwe content-route (of het heropenen van een bestaande) begint met de `CONTENT_VERGRENDELD`-check uit `lib/features.ts` totdat Quinn expliciet besluit het slot eraf te halen.
- Nieuwe accounts, kantoren of teamleden **nooit** via een self-serve flow — alleen via `/admin` (`createKantoor`/`addMakelaarAccount`) of, binnen een bestaand kantoor, via `/admin/kantoor/[id]`. Toegang is expliciet geen self-signup-product.
- API-calls naar Claude altijd via `lib/claude.ts`, nooit direct in een component.
- Zod-schemas en TypeScript-types in `lib/schemas.ts` — importeer die in client components (niet `lib/claude.ts`, want die bundelt de Anthropic SDK).
- Rekenlogica (waardering, marktanalyse, concurrentie, CSV-import, geo-afstand) staat als pure functies in `lib/*.ts`, los van React — makkelijk te testen, zie de bijbehorende `*.test.ts`-bestanden.
- Statistische claims (waardering, kenmerk-effecten) altijd met het aantal onderliggende referenties tonen, en bij te weinig data een expliciete waarschuwing i.p.v. een schijnzeker getal — zie `lib/waardering.ts`.
- `.env.local` nooit committen; er is geen `.env.example` (ontbreekt — zie roadmap als dit opvalt).
- **UI/design-system** (Claude Design-redesign, juli 2026): herbruikbare primitives + tokens in `components/ui/` (kleuren/typografie in `tokens.ts`; Tailwind `forest`-scale + `font-serif`). Signatuur: Newsreader serif-koppen met cursief accentwoord + eyebrow-labels (`PageHeader`/`SerifTitle`/`Eyebrow`). `tokens.ts` blijft VestaAI's eigen groene basisstijl (landing, auth, admin) — de merkkleuren van een ingelogd kantoor lopen via `--merk*`, niet via `tokens.ts`. Hover/focus die inline-styles moeten overrulen: `.vui-*`-classes in `globals.css` (met `!important`). ⚠️ De Tailwind `blue`-scale is projectbreed geremapt naar groen (`tailwind.config.ts`) — **niet verwijderen**; landing/auth/admin leunen erop.

## Commands

- `npm run dev` — start lokale server
- `npm run test` — unit tests (Vitest). Componenten (`.tsx`) mogen getest worden: `vitest.config.ts` zet JSX aan via `oxc: { jsx: { runtime: 'automatic' } }` — Vite 8 draait op oxc, dus de oude `esbuild`-optie doet níets meer, ook al noemt de foutmelding esbuild en tsconfig's `jsx: preserve`.
- `npm run typecheck` — TypeScript check
- `npm run build` — productie-build
- `npm run e2e` — Playwright-suite in `e2e/` (zie `e2e/README.md`): kantoorlogin, dossier < 5 s, waardering + pdf, kaart zonder CSP-fout, admin, RLS-isolatie tussen kantoren. Content-tests alleen met `E2E_GENERATE=1` (kost API-geld). Maakt en verwijdert één testdossier, uitsluitend in het demo-kantoor.
- `npm run demo:repetitie` — generale repetitie van `docs/demoscript.md`: loopt de zes scènes af met Playwright (demo-kantoor, 1920×1080), screenshots naar `screenshots/repetitie/`, exit 1 bij `pageerror`/lege staat/ontbrekend knoplabel. Alleen lezend: klikt niets aan dat schrijft of geld kost. Zelfde inlog en `.env.local`-eisen als `dod:screens` (hieronder).
- `npm run dod:screens` — DoD-visueel: huisstijlcheck (VestaAI-groen, foutstaat, `pageerror`) op 390/1280/1920 px + screenshots van alle ingelogde routes naar `screenshots/`; exit 1 bij een fout. Gebruikt een draaiende server op `DOD_PORT` (standaard 3000) of start zelf `next dev`. Vereist in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (plus de gewone app-variabelen); optioneel `DOD_EMAIL` (standaard `demo@vestaai.nl`, het demo-kantoor met data; i4 Housing via `DOD_EMAIL=quinn.berkouwer@icloud.com`). Logt in via een sessiecookie (`scripts/lib/dodSessie.mjs`), niet via de magic-link-redirect — die wijst naar productie. Alleen lezend, maar ⚠️ `.env.local` wijst naar de productiedatabase.
