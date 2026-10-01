# VestaAI

White-label platform voor één makelaarskantoor — **i4 Housing** (Wassenaar, NVM).
Per woning één dossier (Verkoopadvies → In verkoop → Verkocht) met waardebepaling,
buurtdata en een contentsuite in NL + EN, plus vier verkenners op de eigen
transactiedata. Achter de login volledig in de huisstijl van het kantoor. Toegang
puur via de platform-admin: geen prijzen, abonnementen of Stripe (weg sinds
15 sep 2026). Next.js 16 + Supabase (PostGIS) + Claude API + Vercel.

> **Copyregel:** geen "Founding Member"-taal gebruiken.

## 🚦 Begin hier

- **Lees eerst `docs/roadmap.md` § 📍 Stand van zaken** — de roadmap bevat alléén
  open werk. `/sessie-start` aan het begin, `/sessie-afronden` aan het eind.
- **Waar staat wat** (wegwijzer: `docs/README.md`):
  `docs/productoverzicht.md` = wat er staat, per onderdeel ·
  `docs/architectuur.md` = hoe het gebouwd is, **bindend** (datalagen, waardering,
  content, kaart, AI, datamodel, auth en e-mail) · `docs/werkwijze.md` = DoD,
  agents, vangrails, git · `docs/besluiten.md` = logboek (nieuwste bovenaan) ·
  `docs/strategie/doelen.md` = kompas bij twijfel over product of prioriteiten ·
  `scripts/README.md` = alle scripts.
- **Een item is af** → uit de roadmap halen (niet afvinken), beschrijven in het
  productoverzicht, regel in het besluitenlogboek. Nieuwe ideeën → roadmap
  § Backlog, nooit het lopende item in.

## Werkafspraken met Quinn (bindend)

- **Definition of Done** (volledig: `docs/werkwijze.md` § 4):
  `npm run typecheck && npm run lint && npm run test && npm run build` groen
  (lint = 0) · huisstijl-hook schoon · `npm run dod:screens` groen (incl. axe,
  linkcheck, toetsenbordronde) en `screenshots/` beoordeeld tegen
  `docs/ontwerp/principes.md` · lege/laad/foutstaat · `transacties` uitsluitend
  via `lib/transactiesQuery.ts` · elke nieuwe tabel met RLS per kantoor · docs
  bijgewerkt.
- **Vangrails productiedatabase:** er is één database (productie), zonder
  herstelpunten. Back-up (`scripts/backup-data.mjs`) vóór elke risicovolle stap
  (migratie, import, bulk-update, opruimen); scripts dry-run als standaard;
  migraties via `apply_migration`, en alleen na expliciet akkoord van Quinn als
  ze echte data raken.
- ⚠️ **Eén database, twee codeversies** (les 17 sep): productie draait altijd de
  code van `main`. Een migratie die iets **weghaalt of hernoemt** breekt de live
  site zolang `main` oude code heeft (zo crashte `/dashboard` op
  `pitch_uitslag`). Brekende migraties pas samen met de merge van de code die
  erbij hoort, of eerst additief. Additieve migraties mogen tussendoor.
- **Werkwijze:** Sonnet plant én bouwt vanuit de item-spec (mini-plan ≤ 10
  regels in de chat; plan mode alleen bij items gemarkeerd *(ontwerpkeuze)*).
  Productkeuzes zelf maken en in `docs/besluiten.md` noteren; alleen blokkeren
  bij iets onomkeerbaars.
- **Parallel met agents** (volledig protocol: `docs/werkwijze.md` § 3): de
  hoofdsessie regisseert, Sonnet-subagents bouwen elk één roadmap-item in een
  eigen worktree (`isolation: worktree`, dev-poort 31xx, node_modules als
  symlink), gekozen op nul bestandsoverlap. Agents schrijven migraties maar passen
  ze niet toe, raken `docs/roadmap.md`/`docs/besluiten.md` niet aan en committen
  **na elke deelstap**. Opdracht als **bestand in de scratchpad** met een prompt
  van één regel ("Lees de opdracht in <absoluut pad> en voer die uit") — een
  lange prompt laat de classifier time-outen. Worktrees vertakken van
  `origin/main` (niet van de featurebranch). In een worktree faalt
  `npm run build` (Turbopack weigert de node_modules-symlink) → agents bouwen
  met `ANALYZE=true npm run build`; de echte build, `dod:screens` en
  `maplibreWorker.guard.test.ts` draait de hoofdsessie na de merge.
- **"Ga door"-afspraak** (27 sep): stopt de sessie of een agent op de
  gebruikslimiet en zegt Quinn daarna "ga door", dan hervat Claude zonder te
  vragen élke onderbroken agent via SendMessage (zelfde agent, zelfde worktree)
  en maakt de ronde af — nooit een nieuwe agent voor half werk. Uitzondering:
  stopte een agent vóór zijn eerste wijziging, dan is zijn worktree al
  opgeruimd; start hem dan opnieuw met dezelfde opdracht.
- **Doorlopende rondes** (27 sep): is een ronde afgerond en live, dan start
  Claude meteen de volgende ronde uit de roadmap (nul bestandsoverlap, met
  agents) — niet wachten op Quinn. Alleen stoppen bij iets onomkeerbaars
  (migratie op echte data, data verwijderen, betaalde API-rondes) of als er geen
  bouwbaar item meer is zonder input van Quinn; dat dan in één bericht melden.
- **Push/merge/live automatisch aan het einde van elke ronde** (17 en 26 sep,
  geldt tot Quinn anders zegt): tijdens een ronde alleen lokaal committen. Is de
  ronde klaar, dan doet Claude zelf, zonder opnieuw toestemming te vragen, alle
  stappen van `/sessie-afronden`: DoD, docs, commit, featurebranch (`feat/…`)
  pushen, PR naar `main` maken en mergen, en controleren dat de Vercel-deploy
  READY is zonder runtime-errors. Migraties die echte data raken blijven
  akkoord-plichtig.

## 🎨 Bouwregel huisstijl (verplicht voor élke nieuwe UI)

Alles achter de login wordt meteen in de huisstijl van het kantoor gebouwd — niet
achteraf omgezet. Kleur via `var(--merk*)` (nooit een hardgecodeerde hex of een
Tailwind-kleurclass, want de `blue`-schaal rendert groen); tekst in de merkkleur
via `var(--merk-tekst)` (haalt 5 : 1 op wit), nooit `var(--merk)`; vorm en
lettertype via `var(--merk-radius-*)`/`var(--merk-font-*)`; tekst informeel
("je/jouw") zonder de naam VestaAI; "woning" in plaats van "object". Volledige
checklist: `.claude/skills/kantoorhuisstijl/SKILL.md`. Een hook waarschuwt bij
overtredingen. Bewust VestaAI-groen blijven: landing, `/login`, `/contact`,
`/admin`, `LandingPageClient`, `PublicNav` en `components/ui/tokens.ts`.

## Hoofdstructuur

Volledige beschrijving per onderdeel: `docs/productoverzicht.md`. Mappen: `app/`
(routes; `(app)/` = ingelogd, `admin/`, `api/`) · `components/` (`ui/`, `kaart/`,
`grafieken/`, `presentatie/`) · `lib/` (pure logica en datatoegang) · `hooks/` ·
`scripts/` · `e2e/` · `supabase/migrations/` · `docs/`.

- **Woningdossier** (`app/(app)/object/[id]/`, `components/ObjectWorkspace.tsx`):
  één dossier per adres, fases `verkoopadvies` → `in_verkoop` → `verkocht`
  (fasestepper in `components/DossierHeader.tsx`). Intake:
  `components/PropertyForm.tsx` (zesstappenwizard). Tabs: Waardering · Buurt &
  data · Content en media (vanaf In verkoop). Aanmaken gaat zonder Claude
  (~1 s); content komt apart via `POST /api/generate` met een lock per dossier
  (`lib/contentGeneratie.ts`, architectuur § 2). NL + EN duurt ± 102 s op
  Vercel (gemeten 1 okt, limiet 300 s; `scripts/meet-contentgeneratie.mjs`).
- **Waardebepaling** (`lib/waardering.ts`, `components/WaardebepalingPaneel.tsx`):
  vergelijkbare verkopen op `transacties`, geen regressie; pdf
  (`/api/pdf/waardebepaling`) en presentatiemodus lezen de opgeslagen
  `waardering_json` en rekenen **niets** opnieuw uit. Methode: architectuur § 3.
- **Verkoopadvies:** datalaag klaar (`lib/verkoopadvies.ts`), document wacht op
  Quinns voorbeeld.
- **Marktinzichten** (`app/(app)/marktanalyse/`): marktanalyse, transacties
  opzoeken, concurrentie, verkoopkaart — interactieve verkenners, geen statische
  dashboards.
- **Transactiedataset** (tabel `transacties`): i4housing's eigen Brainbay- en
  Realworks-data, **strikt per kantoor afgeschermd via RLS** (een ingelogde
  makelaar ziet nooit transacties van een ander kantoor). Import alleen door de
  platform-admin (concierge: script of `/admin/transacties`). `eigen_verkoop`
  bepaalt de pins op de verkoopkaart; `verkopend_kantoor` voedt de
  concurrentieanalyse. Elke query via de sessie-gebonden client
  (`createServerSupabaseClient()`), nooit alleen een handmatig
  `kantoor_id`-filter als bescherming.
- **Eén rol per kantoor** (16 sep): iedereen in een kantoor ziet en kan hetzelfde;
  RLS is kantoorbreed. `makelaars.role` stuurt geen rechten meer. Platform-admin
  (Quinn) is een los concept: `lib/admin.ts`.
- **Huisstijl** (`lib/branding.ts`): bouwt uit `kantoren.huisstijl_json` een palet
  en zet dat als `--merk*` in `app/(app)/layout.tsx` (ook als `:root`-regel voor
  Radix-portals). Huisstijl en kantoorinstellingen (courtage, profiel,
  werkgebied, aliassen) zijn platform-admin-beheerd via `/admin/kantoor/[id]`;
  het kantoor ziet alleen een read-only `/kantoor`.
- **Kantoren en accounts:** i4 Housing = blauw `#0080C8` (op knoppen
  `#007BC0` voor AA-contrast), rood `#C61E45`, Nunito Sans (vrije tegenhanger van
  Proxima Nova), vorm `zacht`. Assets in Storage-bucket `kantoor-assets` onder de
  kantoor-id. Platform-admin: `quinn.berkouwer@gmail.com` (plus env
  `PLATFORM_ADMIN_EMAILS`); `quinn.berkouwer@icloud.com` is een gewone makelaar
  bij i4 (handig als `DOD_EMAIL`). Demo-kantoor: `demo@vestaai.nl`,
  `/login/demo`, ~8.000 synthetische transacties; i4 heeft er nog 0.

## Datamodel

Volledig overzicht (live gecontroleerd): `docs/architectuur.md` § 9. Kern:
`kantoren` · `makelaars` · `objecten` (dossier: `fase`, `status` =
Funda-publicatiestatus binnen In verkoop, `input_json`, `outputs_json(_en)`,
`waardering_json`, `verrijking_json`, `content_status`) · `transacties` · view
`transacties_met_coordinaten` (geeft `geo` als lat/lng — gebruik die voor
coördinaten) · `imports` · `object_fotos` · `object_documenten` ·
`stijl_bewerkingen` · `gebruik_events`. Nog niet toegepast:
`20260924190000_transacties_makelaar_id.sql` (wacht op een makelaarsveld in de
exports).

## Conventies

- TypeScript strict, geen `any`. Server Components als default; `'use client'`
  alleen waar interactiviteit nodig is.
- **Aanspreekvorm:** ingelogd informeel ("je/jouw"), publiek formeel ("u").
- **Geen productnaam in de kantooromgeving**: nergens "VestaAI" achter de login;
  schrijf neutraal of gebruik `branding.naam`. Paginatitels krijgen hun
  achtervoegsel van de route-group-layout. Enige uitzondering: het kleine
  "VestaAI × kantoorlogo"-lockup linksboven in `AppTopbar`, vast VestaAI-groen.
- **Grijstinten kleurloos houden:** geen groen-getinte grijzen (`#E9EFEB`,
  `#F1F7F3`, `#9AA6A0` …) achter de login; neutraal grijs of
  `var(--merk-zacht)`/`var(--merk-rand)`.
- **Semantische kleuren nooit aan `--merk-accent`** (rood bij i4 leest als fout).
  Een louter onderscheidende tweede datareeks mag wél accent.
- Merkkleuren altijd via `var(--merk)`/`--merk-hover`/`--merk-zacht`/
  `--merk-rand`/`--merk-accent`/`--merk-op`/`--merk-tekst`, nooit een hex.
- UI-basis in `components/ui/` (tokens + primitives; Newsreader-serifkoppen met
  cursief accentwoord, eyebrow-labels). `tokens.ts` is VestaAI's eigen groene
  basisstijl (landing, auth, admin). Hover/focus die inline-styles moeten
  overrulen: `.vui-*`-classes in `globals.css`. ⚠️ De Tailwind `blue`-schaal is
  geremapt naar groen — **niet verwijderen**, landing/auth/admin leunen erop.
- Een nieuwe content-route begint met de `CONTENT_VERGRENDELD`-check uit
  `lib/features.ts` (nu `false`).
- Accounts, kantoren en teamleden **nooit** via een self-serve flow — alleen via
  `/admin` (`createKantoor`/`addMakelaarAccount`).
- Claude-calls alleen via `lib/claude.ts`; modelstrings alleen in
  `lib/aiModellen.ts`. Zod-schema's en types in `lib/schemas.ts` — client
  components importeren daaruit, nooit uit `lib/claude.ts` (bundelt de SDK).
- Rekenlogica als pure functies in `lib/*.ts` met een `*.test.ts` ernaast.
- Statistische claims altijd met het aantal referenties (n) en "data t/m"; bij
  te weinig data een expliciete waarschuwing, geen schijnzeker getal.
- Lees `outputs_json` in de UI altijd via `metLegacyFallback()`
  (`ResultTabs.tsx`); lees het woningtype altijd via `woningtypeLabel()`.
- `.env.local` nooit committen. `.env.example` is de lijst van alle sleutels
  (bron voor `npm run env:check`); nieuwe `process.env`-sleutel → ook daar.

## ⚠️ Valkuilen (lessen die we al eens betaalden)

**Next.js en React**
- **Hydratie** (19 sep): nooit `new Date()` of iets anders dat per omgeving
  verschilt in een client component (Vercel draait in UTC, de makelaar in
  Europe/Amsterdam). Een hydratiemismatch laat de héle pagina half-levend achter
  — het profielmenu reageerde nergens meer op. Reken tijd/datum/willekeur
  server-side uit (`lib/begroeting.ts`) en geef het als prop door. Bij "knop
  doet niets" eerst hydratie verdenken: `page.on('pageerror')` in Playwright
  wijst het aan, meestal in een ándere component. Laat nooit een element op
  `opacity: 0` staan tot een `useEffect` het toont — gebruik een CSS-animatie.
- Een Next-routebestand (`route.ts`) mag alleen route-exports hebben
  (`GET`/`POST`/`maxDuration`/…). Een geëxporteerde hulpfunctie laat `next build`
  falen terwijl typecheck en tests groen zijn. Hulpfuncties in `lib/`.
- **Mobiele performance = JavaScript in de eerste lading** (30 sep): `recharts`
  alleen in `components/grafieken/` via `next/dynamic` (skelet van dezelfde
  hoogte); nooit `react-dom/server` statisch in client-code (`await import()`);
  dossier-tabs mounten pas bij het eerste bezoek (tests die een verborgen tab
  nodig hebben: eerst klikken); een nieuw font krijgt `preload: false` tenzij
  élke pagina het gebruikt; externe scripts `lazyOnload`. Meten:
  `scripts/meet-lighthouse.mjs`; bundel: `ANALYZE=true npm run build`.
- **Een dynamic import beschermt de kinderen niet** (27 sep): importeert een
  laag zelf `maplibre-gl`, dan zit die alsnog in de hoofdbundel. Alleen het type
  statisch importeren, de runtime via `await import()` in het effect.
- `overflow: hidden` op een container clipt ook een `position: absolute`-kind
  (het profielmenu "viel weg"). Zet overflow op het kleinste element dat het
  nodig heeft.
- Een Sheet/Dialog die je vanuit een menu opent, mount je búiten dat menu (lift
  de open-state naar de ouder, zie `components/FeedbackKnop.tsx`).
- **Radix-portals staan búiten de merk-variabelen** — daarom schrijft de layout
  `--merk*` óók als `:root`-regel (`brandingRootCss()`). Groen in een
  drawer/dropdown → eerst die regel controleren.
- `var(--merk, #1A6B45)`-fallbacks maken een kapotte kantoor-lookup onzichtbaar.
  Onverwacht groen achter de login → eerst de kantoor-query controleren.

**Kaart**
- **Kaarten laden lazy** (`BasisKaart` mount binnen 200 px van de viewport);
  staat een kaart boven de vouw, geef dan `direct` mee.
- Eigen overlays nooit rechtsboven óp een MapLibre-kaart (daar zitten de
  zoomknoppen) — bedieningselementen in de kaartkop.
- Een standaardkeuze die eenmalig in een `useEffect` wordt gezet, wacht op de
  écht geladen data (gate op de fetch-resultaten, niet op een placeholder).

**Data en Supabase**
- **Upsert met lege velden wist data** (28 sep): supabase-js vult een ontbrekende
  sleutel in een batch aan met null. Aanvulbare velden (`geo`,
  `geocode_status`, `wijk`, `buurt`) via `maakUpsertBatches()`
  (`lib/importPijplijn.ts`). `instellingen_json` altijd samenvoegen
  (`voegInstellingenSamen()`), nooit vervangen — dat wiste `demo: true`.
- Nieuwe policies altijd met `(select my_kantoor_id())`/`(select auth.uid())`,
  nooit kaal; nieuwe view op `transacties` altijd `with (security_invoker = true)`.
- Een `SECURITY DEFINER`-functie met `set search_path = public` vindt
  extensiefuncties niet (die staan in schema `extensions`): altijd gekwalificeerd
  aanroepen (`extensions.gen_random_bytes`) — dit brak op 3 juli alle registraties.
- Den Haag heet in BAG/PDOK/Brainbay "'s-Gravenhage" — vergelijk plaatsnamen
  nooit kaal (`canoniekePlaats()`).
- Verouderde "nog niet toegepast"-commentaren kosten dubbel werk: werk bij het
  toepassen van een migratie ook de commentaren bij; bij twijfel
  `pg_get_functiondef()` op productie.
- Nooit een pad als `logo_url` (`/kantoren/...` bestond alleen lokaal → "?"-logo).
  Assets in Storage, met een volledige URL.
- Serverfuncties draaien in Frankfurt (`vercel.json` `regions: ["fra1"]`), naast
  de database — anders gaat elke databasevraag twee keer over de oceaan.

**Externe bronnen**
- **BAG** (27 sep): vrije tekst via `q`, `pageSize` ≥ 10, alles via
  `lib/bag.ts`. De routes vouwden een 400 stil op tot "leeg".
- **Verrijking** (24 sep): gratis bronnen (Overpass) zijn onbetrouwbaar. Elke bron
  geeft `ok`/`leeg`/`mislukt`/`niet_gekoppeld`, een mislukte bron wordt gelogd
  (zonder adres), en een stille terugval op "leeg" mag nooit. WOZ per woning vult
  de makelaar zelf in (`lib/woz.ts`); de backend van het WOZ-waardeloket is geen
  toegestane API — niet omheen bouwen.

**AI en prompts** (1 okt)
- **Een model verzint wat de prompt afdwingt:** een harde lengte-eis of een
  verplichte alinea zonder gegevens leverde "geen verborgen gebreken bekend" op.
  De contentprompt krijgt de hele intake (`lib/contentKenmerken.ts` — een nieuw
  intakeveld hoort daar ook in) en de regel "feiten alleen hieruit".
- **Sonnet 5 denkt standaard:** zonder `thinking`-parameter eten denk-tokens
  `max_tokens` op en is blok 0 geen tekst. `denkenUit(model)` meegeven en het
  eerste tekstblok lezen, nooit blind `content[0]`.
- **Gemini:** de 2.5-generatie weigert nieuwe gebruikers; beeldmodellen werken
  alleen met billing. Foutsoort uit `status` (`lib/geminiFout.ts`), nooit een
  regex op de melding — de URL bevat "gene**rate**Content".

**Pdf, beeld en tooling**
- `@react-pdf/renderer`: de ingebouwde Helvetica is WinAnsi (`⚠` en emoji renderen
  niet); styles worden pas bij het renderen gevalideerd, dus een nieuw
  pdf-document krijgt een test die hem écht rendert; een logo-URL eerst door
  `bruikbaarLogo()`.
- `sharp`: nooit `.extract()` direct na `.composite()` in één keten (eerst naar
  een buffer).
- `xlsx` komt van cdn.sheetjs.com, niet van npm; in ESM
  `XLSX.read(fs.readFileSync(pad))`, nooit `XLSX.readFile()`.
- Vitest draait JSX via oxc (`vitest.config.ts`), los van `tsconfig.json`.

## Commands

- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`
- `npm run test` — Vitest (ook `.tsx`)
- `npm run env:check` — ontbrekende omgevingsvariabelen (print nooit waarden)
- `npm run e2e` — Playwright (`e2e/README.md`); content-tests alleen met
  `E2E_GENERATE=1` (kost API-geld)
- `npm run dod:screens` — visuele DoD op 390/1280/1920 px; start zelf `next dev`
  als er geen server op `DOD_PORT` (3000) draait; `DOD_EMAIL` kiest het kantoor
  (standaard demo, i4 via `quinn.berkouwer@icloud.com`). Logt in via een
  sessiecookie. Alleen lezend.
- `npm run demo:repetitie` — loopt de zes demoscènes af (demo-kantoor,
  1920×1080), screenshots naar `screenshots/repetitie/`. Alleen lezend.
- Overige scripts: `scripts/README.md`. ⚠️ `.env.local` wijst naar de
  productiedatabase.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
