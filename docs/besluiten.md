# VestaAI — Besluitenlogboek & opleverlog

> Logboek, geen werklijst. Het plan zelf staat in `docs/roadmap.md`. Nieuwe
> besluiten komen hier bovenaan (nieuwste eerst); `/sessie-afronden` voegt ze
> toe. `/sessie-start` leest alleen de bovenste datum-sectie.

---

### 23 sep 2026 (sessie Sonnet) — profielmenu viel weg achter de pagina

| Onderwerp | Besluit | Door |
|---|---|---|
| Dropdown geclipt door `overflow: hidden` | Quinn meldde dat het profielmenu (avatarknop rechtsboven) achter de pagina viel — een andere oorzaak dan de hydratiebug van 19 sep op dezelfde component. De topbar-rij (`components/AppTopbar.tsx`) had `overflow: hidden` om de nav-pillen binnen de balk te houden; het (absoluut gepositioneerde) profielmenu zat in diezelfde container en werd daardoor geclipt in plaats van getoond. Nav-pillen scrollen al zelf via hun eigen `overflowX: auto`, dus de clip op de hele rij was overbodig — verwijderd. Eén regel, geen andere aanpak overwogen | Sonnet |
| Direct live | Op Quinns verzoek meteen gepusht, PR #26 aangemaakt en gemerged naar `main` — niet gewacht tot sessie-einde, conform de uitzondering in CLAUDE.md dat Quinn buiten de normale afspraak om alsnog expliciet om live kan vragen | Quinn + Sonnet |
| DoD achteraf gecontroleerd | `npm run typecheck && npm run test && npm run build` groen, huisstijl-hook schoon op het gewijzigde bestand. `npm run dod:screens` crashte lokaal (exit 137, vermoedelijk resource-limiet van de sandbox); in plaats daarvan `scripts/controleer-huisstijl.mjs` los gedraaid tegen een handmatig gestarte dev-server — alle ingelogde routes groen, geen runtime-errors, geen VestaAI-groen-lek | Sonnet |

---

### 19 sep 2026 (sessie Opus) — item 6.0 + welkomstblok + hydratiebug

| Onderwerp | Besluit | Door |
|---|---|---|
| 6.0 zonder shadcn | Wél de Radix-primitives, **niet** het shadcn-class-patroon dat de roadmap-spec noemde. shadcn stuurt kleur via Tailwind-classes op een eigen tokenlaag (`--background`/`--primary`/…); die zou naast `components/ui/tokens.ts` een tweede waarheid worden die synchroon moet blijven — precies de drift waar de VestaAI-groen-bugs vandaan kwamen. Bovendien verbiedt de bouwregel in CLAUDE.md Tailwind-kleurclasses achter de login (de `blue`-schaal rendert groen). Primitives dus inline gestyled met `tokens.ts` + `var(--merk*)`; alleen wat een inline style niet kán (`[data-state]`, `:focus-visible`, `[data-highlighted]`) staat als `.vui-*` in `globals.css`. Geen `clsx`/`cva`/`tailwind-merge` | Opus |
| Primitives bewijzen in productie | Geen showcasepagina en geen dode code: de drawer "Referentie toevoegen" (4.4) is overgezet op `Sheet`. Gemeten in de browser dat focus-trap, scroll-lock, Escape en focus-herstel werken. Het handwerk had wél `aria-modal`, maar géén focus-trap en liet de achtergrond zichtbaar voor schermlezers — Radix zet in plaats daarvan `aria-hidden` op alles daarbuiten, wat beter wordt ondersteund | Opus |
| e2e-auth gerepareerd | `e2e/auth.setup.ts` bezocht de magic link, die naar de **productie**-URL redirect; lokaal logde hij dus nooit in en alle ingelogde e2e-tests sloegen stilletjes over. Nu dezelfde cookie-aanpak als `scripts/lib/dodSessie.mjs`. Daarbij bleek de dashboard-smoketest nog te toetsen op de snelkoppelingen die 1.9c had verwijderd | Opus |
| Welkomstbanner: geen foto | De aangeleverde teamfoto was 399×501 px en werd op desktop ~3× opgeschaald: te vaag (oordeel Quinn). In plaats daarvan het ontwerp dat al in `docs/ontwerp/startpagina.html` § `.kantoorbanner` stond — merkverloop met fijn raster en diagonale glans. Bewust beeld i.p.v. terugval, scherp op elk scherm, werkt in elke kantoorkleur. Contextregel eronder met een echt getal ("3 dossiers wachten op content"), meeliftend op de bestaande objecten-query. `banner_url`/`banner_focus_y` blijven bestaan voor een latere scherpe foto (≥ 1600 px) | Quinn + Opus |
| ⚠️ Hydratie sloopt de hele pagina | `StartBanner` was een client component met `new Date()`: op Vercel (UTC) een andere begroeting dan in de browser (Amsterdam) → hydratiemismatch (React #425/#422). Op productie gemeten dat die fouten **alleen op `/dashboard`** optraden. Gevolg: de hele pagina bleef half-levend, inclusief het profielmenu in de topbar dat niet meer opende. Datum en begroeting komen nu uit `lib/begroeting.ts`, server-side in `Europe/Amsterdam`, als props. Banner is nu een server component en de fade-in is CSS i.p.v. JS-state — hij stond op `opacity: 0` tot JS draaide, dus bij falende hydratie simpelweg onzichtbaar | Opus |

---

### 18 sep 2026 (sessie Opus) — fase 4 afgerond met item 4.7 (waardebepaling-pdf)

| Onderwerp | Besluit | Door |
|---|---|---|
| 4.7 opbouw | `app/api/pdf/waardebepaling/route.ts` (GET, `object_id`) + `components/WaardebepalingPdfTemplate.tsx` + `WaardebepalingPdfButton.tsx`. De route **rekent niets opnieuw uit**: hij leest de opgeslagen `objecten.waardering_json` (v1 wordt gemigreerd via `migreerWaarderingJson`). Zo kan de pdf nooit een ander bedrag tonen dan het scherm waar de makelaar hem opent | Sonnet + Opus |
| Toegang | Sessie-client voor auth, daarna service-client mét expliciete `.eq('kantoor_id', …)` — zelfde patroon als `waardering-actions.ts`. Geverifieerd: 400 zonder waardering, 400 zonder `object_id`, **404 op een dossier van een ander kantoor**, redirect naar `/login` zonder sessie | Opus |
| Kenmerk-effecten in de pdf | Niet de vier losse kolommen (klasse/pct/n) maar de kant-en-klare `toelichting` uit `lib/waardering.ts`, die de referentieklasse noemt ("A-B +7 % t.o.v. C-D"). Kenmerken waarvan de woning ín de referentieklasse valt ("zonder +0 % t.o.v. zonder") worden **weggelaten**: op het scherm zijn ze nuttig naast een aan/uit-chip, in een document voor de verkoper zijn ze ruis. `grootte` hoort er wél bij (stond er eerst niet in) | Opus |
| Waarschuwingen | De volledige `uitkomst.waarschuwingen` komt mee in een eigen blok, niet alleen de weinig-data-melding — § 3.3 verbiedt een schijnzeker getal zonder caveats. Geen ⚠-glyph: react-pdf's ingebouwde Helvetica is WinAnsi en kent U+26A0 niet (`•` wel) | Opus |
| Logo-vangrail | `bruikbaarLogo()` (HEAD-check vooraf) blijft verplicht: react-pdf's `<Image>` kent geen `onError`, dus een verlopen logo-URL laat de hele generatie klappen. Demo Makelaardij heeft geen logo → terugval op de kantoornaam; met i4 Housing's echte logo geverifieerd | Opus |
| Nieuwe test + vitest-config | `components/WaardebepalingPdfTemplate.test.ts` rendert het document écht en telt de pagina's (ook mét lange correctiemotivatie — het langste variabele blok). Reden: react-pdf valideert zijn styles pas tijdens het renderen, dus typecheck en build zien een kapotte style-prop niet; de makelaar wel. Hiervoor moest `vitest.config.ts` JSX aanzetten: Vite 8 gebruikt oxc, dus `oxc: { jsx: { runtime: 'automatic' } }` — niet de oude `esbuild`-optie, die doet niets meer | Opus |
| Meting | 1,0 s per pdf (lat: < 10 s), één pagina in alle geteste varianten | Opus |

---

### 18 sep 2026 (sessie Opus/Sonnet) — fase 4 deel 1: waardering op echte data

| Onderwerp | Besluit | Door |
|---|---|---|
| 4.1/4.3/4.5 aansluiting | Server action `berekenWaardering(objectId, opties)`: subject uit het dossier, kandidaten via `referentiesInStraal` (max 5 km) + `haalRegionaleSet`, dan `berekenWaarderingV2()`; opslag als v2 (`WaarderingOpslagSchema`), oude v1-json wordt bij lezen gemigreerd. Wat-als-schakelaars rekenen client-side door zonder nieuwe serveraanroep. v1 (`berekenWaardebepaling` c.s.) verwijderd. `page.tsx` laadt niet langer de volledige transactietabel per dossierbezoek | Sonnet |
| Prijsindex-bron | `prijsindexKwartaal` (RPC) wordt **niet** gebruikt: die filtert alleen op subtype. `berekenWaarderingV2` bouwt de index zelf uit de regionale set (werkgebied + typegroep), gelijk aan § 3.3 en aan de backtest — productie en kalibratie blijven zo identiek | Sonnet |
| CBS-terugval | `scripts/haal-cbs-prijsindex.mjs` haalt tabel 85792NED op (regio GM0518 's-Gravenhage, code uit de metadata); `lib/cbsPrijsindexData.json` wordt **wel** gecommit — er is geen build-stap die het script draait, anders heeft productie nooit een terugval | Sonnet + Opus |
| Bug plaatsnamen | Werkgebied zegt "'s-Gravenhage", adressen zeggen "Den Haag": zonder normalisatie woog `plaatsFactorVoor()` elke referentie in dezelfde stad half mee en vond de terugval-zonder-locatie 0 kandidaten. Subject-plaats wordt nu gecanoniseerd met `plaatsenGelijk()` | Sonnet |
| 4.8 backtest | `scripts/backtest-waardering.mjs` + `lib/backtest.ts` (meetlogica gedeeld met de vitest-vangrail) + `docs/waardering-backtest.md`: 400 woningen, peildatum = dag vóór verkoop, **mediane fout 6,1 %, 76 % binnen de band** — demo-lat (≤ 7 % / ≥ 75 %) gehaald, geen aanpassing aan de bandregels. Per typegroep blijft vrijstaand het zwakst (8 %) | Sonnet |
| Mac wakker houden | Automatische hook ingetrokken op verzoek van Quinn (zie 17 sep); hij zet `caffeinate` zelf aan voor een gekozen duur | Quinn |

---

### 17 sep 2026 (sessie Opus/Sonnet, deel 2) — items 1.9c, 1.9b, 1.10

Twee Sonnet-agents parallel (1.9c app-code, 1.10 SEO — geen bestandsoverlap,
alleen typecheck parallel, build daarna door de orchestrator); 1.9b schreef de
orchestrator zelf.

| Onderwerp | Besluit | Door |
|---|---|---|
| Kerncijfertegels (1.9c) | Vijf tegels: Lopende verkoopadviezen · In verkoop · Verkocht dit jaar (kalenderjaar) · Gem. looptijd en Prijs t.o.v. vraagprijs over de **laatste 12 maanden** (was "dit jaar"; beide delen n en de weinig-data-grens). Geen dubbele tegel: de al bestaande vraagprijs-tegel is de vervanger van de winratio. `filterOpLaatsteMaanden` kreeg een datum-accessor zodat hij ook op `verkoopdatum` werkt | Sonnet |
| Mobiele topbar (1.9c) | ≤ 900 px: pillen en avatar weg, hamburger met dezelfde zes items plat onder elkaar plus het profielblok | Sonnet |
| Fasestap (1.9c) | In Verkoopadvies toont `FaseToggle` een badge + knop "Naar In verkoop" | Sonnet |
| `dod:screens` (1.9b) | Eén commando dat een draaiende server gebruikt of zelf `next dev` start (en weer stopt). Faalt op VestaAI-groen, foutstaat, `pageerror`, niet-2xx en — toegevoegd na de eerste run — **horizontale overloop**, omdat de huisstijlcheck een 596 px brede startpagina op 390 px "schoon" noemde. Login gedeeld in `scripts/lib/dodSessie.mjs`; `controleer-huisstijl.mjs` faalt nu ook bij groen (gaf eerder alleen een melding). Aangetoond: opzettelijke `throw` in `/account` → exit 1 in alle vier stappen | Opus |
| Beeldmerk (1.10) | Bestaande VestaAI-tegel (groen, witte V) uit `LandingPageClient`/`PublicNav`, geen nieuw ontwerp. `twitter-image` hergebruikt `opengraph-image` | Sonnet + Opus |
| Positionering in metadata (1.10) | Titel "VestaAI — Platform voor makelaars"; omschrijving: waardering, marktinzicht en concurrentieanalyse op eigen transactiedata, contentsuite, in de huisstijl van het kantoor | Sonnet |
| Bugs gevonden bij de controle | (1) `middleware.ts` stuurde `/opengraph-image` en `/twitter-image` naar `/login` → toegevoegd aan de publieke routes; (2) OG-beeld crashte in Satori (div met meerdere kinderen zonder flex); (3) `StartBanner` `aspect-ratio: 16/5` + `min-height: 180` dwong 576 px minimale breedte af → `height: clamp(180px, 30vw, 376px)` | Opus |
| Productiedata | Gecontroleerd (alleen lezen): 0 objecten, 0 transacties, 1 kantoor. Migratie 2.1 raakt dus geen echte data | Opus |
| Push/merge-werkwijze | Tijdens een sessie alleen lokaal committen; bij "rond af" in één keer pushen, mergen en live zetten zonder opnieuw te vragen (geen productiedata die verloren kan gaan). Toestemmingsregels voor `git push origin feat/*` en `gh pr …` in `.claude/settings.local.json` | Quinn |
| 2.1 schema v2 | Migratie `transacties_pijplijn` toegepast na back-up (`backups/2026-09-17T08-44-16-408Z/`): tabel `imports` (RLS, alleen lezen per kantoor), pijplijnkolommen op `transacties` incl. `adres_sleutel not null` en generated `prijs_m2`, unieke sleutel op `(kantoor_id, adres_sleutel, verkoopdatum)`, drie composiet-indexen (losse `kantoor_id`- en `verkoopdatum`-index gedropt: gedekt), `objecten.fase` → `verkoopadvies`, `pitch_uitslag` gedropt, view herschapen met alle nieuwe kolommen. `import_id … on delete set null` (import verwijderen mag geen transacties wissen). Typegroep/subtype zonder check-constraint (taxonomie leeft in `lib/transactieNormalisatie.ts`). `anon` ingetrokken op `imports` en de view. `scripts/controleer-schema.mjs` nieuw en groen | Sonnet + Opus |
| 2.4 foutlogging | `lib/fouten.ts` `meldFout()` (één JSON-regel, geheimen/e-mail recursief weggefilterd, geeft digest of korte referentie terug); 17 call sites in 14 API-routes, 5 nieuwe try/catch rond externe calls (Claude, react-pdf, Resend, verrijking); ook stille `.catch(() => null)`-fallbacks loggen nu (gedrag gelijk). `app/global-error.tsx` nieuw; alle drie foutschermen tonen "Er is iets misgegaan" (de DoD-scripts zoeken op die tekst) + digest | Sonnet |
| 2.3 demo-fixture | Kantoor "Demo Makelaardij" (`instellingen_json.demo = true`, neutrale leisteen-huisstijl), 7.996 transacties 2019 t/m nu (2 sleutelbotsingen uit de generator), 1.103 eigen verkopen, 167 uitgesloten, 15 dossiers (5 per fase, 4 met content), account `demo@vestaai.nl` (wachtwoord in `.env.local` `DEMO_PASSWORD`). `eigen_verkoop` = rijen waar het demo-kantoor zelf verkoper is. Geschreven na back-up `backups/2026-09-17T09-16-09-773Z/`. `tsx` als devDependency (script importeert TS uit `lib/`) | Sonnet + Opus |
| Signup-trigger | `handle_new_user` (erfenis van zelf-aanmelden) maakt bij elke nieuwe auth-user een eigen proefkantoor + admin-makelaar. `plaatsInKantoor` in de admin ruimt dat op; het seed-script deed dat niet → zwerfkantoor "Vestaai" ontstaan en weer opgeruimd, script gerepareerd. Trigger zelf hoort weg (gesloten platform) → roadmap § 9 database-hardening | Opus |
| DoD-account | `DOD_EMAIL` standaard `demo@vestaai.nl`: schermen worden met data gecontroleerd. Direct resultaat: horizontale overloop op `/marktanalyse/concurrentie` (grid zonder `minmax(0, 1fr)`) gevonden en gefixt | Opus |
| **Bug: 1.000-rijen-plafond** | Alle huidige verkenners halen transacties met één query op; PostgREST levert maximaal 1.000 rijen, dus marktanalyse, concurrentie, transacties en kaart rekenen op een willekeurige deelverzameling (marktanalyse toont "1000 transacties" bij 7.996). Wordt opgelost in 2.2 (RPC's + range-lussen); tot dan zijn de cijfers in de verkenners niet betrouwbaar | Opus |
| **Productie-incident** | Quinn mergede PR #17 terwijl mijn commits van vandaag niet gepusht waren (push geblokkeerd): `main` = code van fase 1.1-1.8, database al op schema v2 → `/dashboard` crashte op `pitch_uitslag`. Opgelost met PR #19 (push + merge), gecontroleerd op www.vestaai.nl met beide accounts, geen runtime-errors. Les in CLAUDE.md: brekende migraties alleen samen met push + merge | Opus |
| 2.2 query-laag | `lib/transactiesQuery.ts` is de enige plek die `transacties`/de view/transactie-RPC's aanspreekt (guard-test), altijd met de sessie-client zodat RLS geldt. RPC's `marktanalyse_reeks`, `_samenvatting`, `concurrentie_marktaandeel`, `_segmenten`, `transacties_zoeken`, `prijsindex_kwartaal`, `referenties_in_straal` (invoker, stable, `uitgesloten_reden is null`): 75-200 ms op de fixture, vergelijkingstests tegen de pure functies groen (`SUPABASE_TEST=1`). **Tussenfase:** verkenners krijgen alle rijen via `haalTransactiesVoorVerkenner` (range-lus, ~1,2-1,6 s) en houden hun UI tot fase 6. Straal-test met 0,5 % randmarge (PostGIS-ellipsoïde vs. haversine-bol). Transactietabel pagineert per 50 (rendering van 7.800 rijen brak de screenshot en was traag) | Sonnet + Opus |
| Fixture-datums | Generator maakte 33 verkopen na vandaag (dag gekozen binnen het kwartaal); nu vaste peildatum `2026-09-17` als bovengrens, test toegevoegd, fixture opnieuw geseed met `--reset` na back-up | Opus |
| 2.5 kerncijfers | Zes tegels zoals het prototype: Verkocht laatste 12 mnd (+ delta t.o.v. de 12 ervoor) · Gem. looptijd (vs. markt) · Marktaandeel eerste werkgebiedplaats · Prijs t.o.v. vraagprijs · In verkoop · Lopende verkoopadviezen; elk met n en "data t/m". "Markt" = eerste werkgebiedplaats, laatste 12 mnd (één RPC-call). Plaatsnaam-normalisatie (`'s-Gravenhage` ↔ Den Haag, diakrieten) in `lib/kerncijfers.ts`. Demo: 159 verkocht (+10,4 %), 57 dgn (markt 58), marktaandeel Wassenaar 17 % (62/364), −1 % t.o.v. vraagprijs. Test ving een dubbeltelling (vorige-12-maanden-venster zonder bovengrens) | Sonnet |
| 3.1/3.3 dossier los van content | Migratie `object_content_status` (additief): `content_status` (geen/bezig/klaar/fout), `content_gegenereerd_op`, `content_bezig_sinds`. `outputs_json` blijft `not null`; nieuw dossier krijgt `LEEG_CONTENT_OUTPUT` (nullable maken had null-checks in pdf/export/tabs gekost). Lock-claim atomair in één `update … where`. Auto-generatie bij In verkoop vanuit de client (fire-and-forget fetch), niet vanuit de server action — de aparte request houdt zijn eigen functieduur. `LoadingProgress` (nep-pijplijn van 2 min) weg; rate-limit-map en 7-daagse cache weg. `object/new` nooit meer achter `CONTENT_VERGRENDELD`. Getest als demo-gebruiker op een productiebuild: aanmaken 1,2 s, 400 zonder Verhaal, 409 bij dubbele start, generatie 189 s → `klaar`, lege staat en contentweergave visueel gecontroleerd; testdossiers daarna verwijderd | Sonnet + Opus |
| 3.2 intake | `woningtype_groep` + `woningtype_sub` i.p.v. de oude 6-waarden-enum; oude `input_json` wordt bij het parsen gemapt (geen datamigratie). `usps`/`doelgroep` optioneel; wizardstap 5 en 6 "kan later". `prijsverwachting_verkoper` via `setValueAs` (leeg veld gaf `NaN`) | Sonnet |
| 3.4 dossierheader | `components/DossierHeader.tsx` vervangt `FaseToggle`: adres + kenmerken, fasestepper (alleen naastgelegen stappen klikbaar; terugzetten met bevestiging), "X dagen in fase" via nieuwe kolom `objecten.fase_sinds` (additieve migratie). Generatie-trigger bij In verkoop verhuisd, niet gedupliceerd. `VerkoopadviesPaneel`/`InAanbouw` weg tot fase 11 | Sonnet |
| Fixes na review 3.x | (1) Backfill `content_status` telde lege demo-dossiers (structuur met lege strings, niet `{}`) als `klaar` → gecorrigeerd op `funda_tekst`, migratiebestand aangepast, seed-script zet de status nu zelf. (2) `woningtypeLabel()` normaliseert zelf oude `input_json` (de dossierpagina geeft ruwe JSON door; kenmerkenregel begon met "·") | Opus |
| Werkwijze-les agents | Typecheck groen ≠ build groen: `next build` draait ook ESLint (ongebruikte variabelen in een test braken de build). Agents die geen build mogen draaien (parallel werk) laten de orchestrator altijd `npm run build` doen vóór commit | Opus |
| Mac wakker (ingetrokken 18 sep) | Kort een SessionStart-hook gehad die `caffeinate` startte; op verzoek van Quinn weer volledig verwijderd (hook, script, geheugen) — hij zet het liever zelf handmatig aan voor een bepaalde duur | Quinn |
| Migratiehistorie | De migraties van 16 sep (transacties, object_fase, …) staan niet in `supabase_migrations` — via de SQL-editor gedraaid. Echte staat daarom uit `information_schema` gehaald; `controleer-schema.mjs` bewaakt voortaan de verwachte kolommen | Opus |

---

### 17 sep 2026 (sessie Opus/Sonnet) — item 0.1: prototypes bijgetrokken naar het referentiebeeld

Orchestrator Fable → Opus (Fable-bestedingslimiet halverwege), bouwers vier
Sonnet-agents (één per bestand). Tussen de bestanden gedeelde wijzigingen deed
de orchestrator zelf, zodat de agents elkaar niet in de weg zaten.

| Onderwerp | Besluit | Door |
|---|---|---|
| Topbar kit | `K.topbar({ actief })` plat met zes pillen, geen subnav; alle zes call-sites mee aangepast. De dossier-tabs in `waardebepaling.html` gebruiken de `.subnav`-stijl nog, dus die CSS blijft staan | Opus |
| Overlays | Blur weg uit de gedeelde `.sluier` in `kit.css` (gold voor alle prototypes, dus centraal i.p.v. een lokale override in marktanalyse) | Opus |
| Transacties | Kit-tegelrij (hero "transacties in selectie" + vier tegels met n, delta t.o.v. vorige periode en 8-kwartalen-sparkline), tabel in `.kaart` met kaartkop en segmented sortering, notificatie-stip op "Exporteer CSV". De rode `tellerbadge`-pil is weg: rood vlak, niet toegestaan (README regel 2b); het aantal staat nu in de hero. Hero-delta neutraal (meer transacties is niet gunstig of ongunstig) | Sonnet, 1 correctieronde |
| Verkoopkaart | Losse `.inbeeld`-strook → kit-tegelrij; kaart en lijst elk in een kaart met kaartkop; leeg-overlay zonder blur. Geen "vorige periode" (tijdlijn is een bereik), dus bijschrift "n = … · in de selectie" i.p.v. een delta | Sonnet, 1 correctieronde |
| Marktanalyse | Stond al op de norm; alleen een 3 px accentstreepje op de titel van het kwartaalbericht zodra het klaar is | Sonnet |
| Startpagina | Snelkoppelingen, winratio-tegel (→ "Prijs t.o.v. vraagprijs", n = 112) en pitch-uitslag weg; "Pitch gewonnen" → "Verkoopadvies verstuurd"; "Lopende acquisities" → "Lopende verkoopadviezen"; "Content volgt na gunning" → "Content volgt vanaf In verkoop" (gunning is ook pitch-taal). Interne sleutel `acquisitie` blijft, zoals in de app tot 2.1 | Sonnet + Opus |
| Waardebepaling | Fasestap "Acquisitie" → "Verkoopadvies" | Opus |
| Ontwerpreview | Screenshots op 1280 px (Playwright, `file://`), beoordeeld tegen concurrentie/startpagina/waardebepaling: **alle zes AKKOORD**, geen console-fouten | Opus |
| Kit-leemtes | Naar roadmap § 9: gedeelde sparkline-helper, `.btn:disabled`, mobiele topbar | Opus |
| Artifacts | Herpubliceren geblokkeerd door de auto-mode-classifier (upload naar claude.ai). Niet omzeild; staat als actie bij Quinn (roadmap § 8, punt 12). Links hieronder tonen dus nog de versie van vóór 0.1 | — |

**Werkwijze-les:** een hervatte subagent (SendMessage) draait op het model van
de orchestrator op dat moment, niet op Sonnet. Voor correctierondes daarom een
nieuwe agent starten met `model: sonnet` en een zelfstandige opdracht.

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
| Geen pitch-concept | De opdracht is zo goed als binnen zodra het verkoopadvies op papier staat; er zijn geen gewonnen of verloren pitches. Winratio, `PitchScorebord`, pitch-uitslag en alle "pitch"-teksten verdwijnen (item 1.9c; kolom vervalt in 2.1). Fase "Acquisitie" heet voortaan **"Verkoopadvies"** (Quinn, 17 sep, avond): label overal direct (1.9c), interne waarde `acquisitie` → `verkoopadvies` in schema v2 (2.1) met bijwerking van bestaande rijen | Quinn |
| Navigatie plat | Topbar zonder dropdowns: Overzicht · Woningdossier (knop naar `/woningen`) · Marktanalyse · Transacties · Concurrentie · Verkoopkaart. Quinn noemde "alle 3 onderdelen uit marktinzichten"; de verkoopkaart is de vierde en is als losse pil meegenomen (aanname, terugdraaien = één pil weg). "Woning toevoegen" verhuist naar de kop van `/woningen`; snelkoppelingen op de startpagina vervallen | Quinn |
| Feedback Quinn op de prototypes | De drie nieuwste (`concurrentie`, `startpagina`, `waardebepaling`) zijn het referentiebeeld voor álle schermen; `transacties.html` wijkt af (kale tabelpagina) en `marktanalyse`/`verkoopkaart` gaan ook naar dat beeld; overal 2-3 kleine rode accentdetails terug (Quinn miste ze). Vastgelegd als README § 1 referentiebeeld + regel 2b; bijwerking = roadmap mini-item 0.1 (Sonnet, eerste sessie) | Quinn |

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

- 23 sep 2026 — bugfix: profielmenu in de topbar viel weg achter de pagina
  door `overflow: hidden` op de topbar-rij; direct live (PR #26).
- 19 sep 2026 — item **6.0**: Radix-primitives (`Sheet`, `Popover`, `Slider`,
  `Tooltip`, `SelectMenu`, `Tabs`) + TanStack Table, gethemed via `tokens.ts`
  en `var(--merk*)`, zónder shadcn-classlaag; drawer van 4.4 overgezet op
  `Sheet`; `e2e/auth.setup.ts` gerepareerd (magic-link redirect naar productie
  → alle ingelogde e2e-tests sloegen stil over). Daarnaast het welkomstblok op
  de startpagina herbouwd naar het prototype (verloop, geen foto) en de
  hydratiebug op `/dashboard` verholpen die het profielmenu onbruikbaar maakte.
- 18 sep 2026 — fase **4** afgerond (4.7 waardebepaling-pdf, één pagina, ~1 s)
  en fases 2.2 t/m 4 live gezet (PR #20): transactiesQuery, dossierkern en
  waardering v2. Backtest 6,1 % mediane fout, 76 % binnen de band.
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
