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
> `scripts/screenshots.mjs` beoordeeld tegen `docs/ontwerpprincipes.md` · lege/laad/foutstaat
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
> begin, `/sessie-afronden` bij het einde van elke sessie. Productkeuzes zelf maken en in
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
  - **Verkoopadvies** (voorheen "Acquisitie"; hernoemd op besluit Quinn 17 sep 2026 — label overal "Verkoopadvies", interne waarde `acquisitie` blijft tot schema v2 in 2.1 hem hernoemt naar `verkoopadvies` incl. bestaande rijen) — alleen waardebepaling en verkoopadvies zichtbaar (er zijn nog geen foto's of een vaste vraagprijs). **Geen pitch-concept meer (besluit Quinn 17 sep 2026):** de opdracht is zo goed als binnen zodra het verkoopadvies op papier staat; er bestaan geen "gewonnen/verloren pitches", geen winratio, geen scorebord. `pitch_uitslag`, `FaseToggle`'s uitslag-schakelaar, `PitchScorebord.tsx` en de winratio in `lib/kerncijfers.ts`/`Kerncijfers.tsx` verdwijnen in roadmap-item 1.9c; de kolom vervalt in schema v2 (2.1). De makelaar zet het dossier zelf door naar In verkoop.
  - **In verkoop** — hetzelfde als Verkoopadvies, plus de volledige contentsuite (Funda/brochure/social/e-mail/buurt, virtual staging, documentenassistent, export) — zie `components/ObjectWorkspace.tsx`. ⚠️ Content wordt **nu nog synchroon** gegenereerd bij het aanmaken van het dossier (`/api/generate` doet intake → Claude NL+EN → insert, dus aanmaken duurt 1-2 minuten en kost tokens voor elke pitch, ook een verloren pitch). Roadmap v2 fase 3 koppelt dit los: `POST /api/object` maakt direct aan, content komt op knopdruk of bij de overgang naar In verkoop (`objecten.content_status`).
  - **Verkocht** — alles blijft bereikbaar, puur archief-gelabeld.
  - **Waardering (Module B)** — `lib/waardering.ts` + `components/WaardebepalingPaneel.tsx`: vergelijkbare-verkopen-methode (geen regressie — bij deze dataset-schaal te schijnzeker) op de tabel `transacties`, met modulaire aan/uit-blokken (garage/tuin) via vergelijkbare-paren, een bandbreedte die verbreedt bij weinig referenties, en een makelaar-correctie met verplichte motivatie (`waardering-actions.ts`, kolom `objecten.waardering_json`). Puur een onderbouwde indicatie voor het verkoopadvies — geen NWWI-taxatie.
  - **AI USP-extractor** — `lib/claude.ts` `extraheerUsps()` + `/api/object/[id]/usps`: vertaalt de vrije intaketekst naar gestructureerde USP's (`components/UspExtractorPaneel.tsx`, kolom `objecten.usps_structuur`).
  - **Verkoopadvies** — nog te bouwen (`docs/roadmap.md` fase 11, bewust geblokkeerd tot Quinns voorbeelddocument er is; het datacontract staat daar al). Alle onderliggende data (waardering, buurtkaart, kantoorprofiel, courtage) is al beschikbaar.
  - **Verkoopkaart, straal-uitsnede** (`components/StraalKaartPaneel.tsx`) — 250/500/1000 m rond het adres, alleen eigen verkopen.
- **Marktinzichten** (`app/(app)/marktanalyse/`, los van één woning) — vier interactieve explorers, geen statische dashboards:
  - **Marktanalyse** (`components/MarktanalyseExplorer.tsx` + `lib/marktanalyse.ts`) — filters op type/wijk/periode, segmentvergelijking, recharts-grafieken (prijs, m²-prijs, doorlooptijd).
  - **Transacties opzoeken** (`components/TransactiesZoeken.tsx`) — zoeken/filteren over de dataset; "meenemen als referentie" wacht op verdere waarderings-integratie.
  - **Concurrentieanalyse** (`components/ConcurrentieExplorer.tsx` + `lib/concurrentie.ts`) — marktaandeel, wie wint welk segment, presteren wij beter, concurrent-profielen. Draait op `transacties.verkopend_kantoor`; toont een eerlijke lege staat zolang dat veld niet gevuld is.
  - **Verkoopkaart** (`app/(app)/marktanalyse/kaart/`, `components/VerkoopkaartExplorer.tsx`) — alleen eigen verkopen als vlaggetje, met live filters.
- **Verhuur** — volledig uit de app gehaald (fase 1.3, masterplan 16-17 sep 2026, zie `docs/roadmap.md`). Stond eerder als "Binnenkort" in de topbar; nu bewust níet gebouwd, geen restant meer in de navigatie.
- **Kantoor** (`app/(app)/kantoor/`) — read-only pagina achter het profielmenu (avatar rechtsboven): huisstijl-preview, kantoorgegevens, team, statistieken. Bewerken kan alleen via `/admin/kantoor/[id]` (platform-admin). Eigen naam/wachtwoord staan sinds fase 1.7 op `/account`, niet meer hier.

**Eén rol per kantoor** (besluit 16 sep 2026): iedereen met een login binnen een kantoor ziet en kan hetzelfde — geen kantoor-admin meer. De kolom `makelaars.role` bestaat nog maar stuurt geen rechten meer binnen het kantoor. Platform-admin (Quinn, `lib/admin.ts`) is een los concept.

**Transactiedataset** (tabel `transacties`, zie "Datamodel") — i4housing's eigen Brainbay- en Realworks-verkoopdata. **Strikt per kantoor afgeschermd via RLS** (besluit masterplan 16-17 sep 2026, zie `docs/besluiten.md`): een ingelogde makelaar ziet alléén de transacties van zijn eigen kantoor, nooit die van een ander kantoor (ook niet het interne demo-/testkantoor). Dit verving een eerdere, bewust foute inrichting als "gedeelde referentiepool" die bij verificatie een live cross-tenant datalek bleek — zie de migratie `20260916213323_rls_kantoor_isolatie_transacties.sql` en `supabase/schema-baseline.sql` voor de volledige toedracht. Geïmporteerd door de platform-admin via `/admin/transacties` (CSV, kolomherkenning via aliassen in `lib/transactieImport.ts`, upsert op kantoor+adres+datum voor herhaalbare herimport) — het kantoor importeert zelf niets (concierge-model, zie `docs/goals.md` § Bedieningsmodel). De kolom `eigen_verkoop` bepaalt wat op de verkoopkaart een vlaggetje krijgt (alleen eigen verkopen); de rest van de dataset voedt waardering en marktanalyse. `verkopend_kantoor` (optioneel) voedt de concurrentieanalyse, zodra bevestigd dat de export dit veld bevat.

⚠️ **Elke query op `transacties` (en de view `transacties_met_coordinaten`) via de sessie-gebonden client** (`createServerSupabaseClient()`) krijgt automatisch alléén het eigen kantoor terug dankzij RLS — reken hier niet op een handmatig `.eq('kantoor_id', …)`-filter als enige bescherming, en voeg bij een nieuwe view op deze tabel altijd `with (security_invoker = true)` toe (anders draait de view als de aanmakende rol en omzeilt hij RLS alsnog).

**Huisstijl** (`lib/branding.ts`) — bouwt uit `kantoren.huisstijl_json` een volledig palet en zet dat als CSS-variabelen (`--merk*`) in `app/(app)/layout.tsx`: kleuren (`primaire_kleur`, `accent_kleur`), lettertype (`jakarta` · `gantari` · `nunito`), vormtaal (`zacht` · `strak`), favicon, contactgegevens en sfeerbeeld. Volledig **platform-admin-beheerd** sinds 16 sep 2026: bewerkbaar formulier in `app/admin/kantoor/HuisstijlForm.tsx` (bereikbaar via `/admin/kantoor/[id]`), het kantoor zelf ziet alleen een read-only preview op `/kantoor`. Componenten in de ingelogde omgeving gebruiken `var(--merk)` etc., nooit een hardgecodeerde merkkleur. **Kantoorinstellingen** (courtage, kantoorprofiel, werkgebied — `lib/schemas.ts` `KantoorInstellingenSchema`, kolom `kantoren.instellingen_json`) zijn eveneens platform-admin-beheerd via `app/admin/kantoor/InstellingenForm.tsx`.

**Stijl leren** (`stijl_bewerkingen`-tabel) — als een makelaar een gegenereerde tekst handmatig bijwerkt, kan het kantoor zelf de daaruit gedestilleerde schrijfregels goedkeuren via `components/StijlLerenPaneel.tsx`, gemount in het woningdossier zelf (niet in een instellingenscherm — dat is sinds 16 sep 2026 platform-admin-gebied).

Eerste pilotkantoor: **i4 Housing** (Wassenaar, NVM). Geverifieerd uit hun eigen theme-CSS op i4housing.nl: blauw `#0080C8`, rood `#C61E45`, lettertype Proxima Nova (betaald → we voeren Nunito Sans als vrije tegenhanger). Vorm: sinds 17 sep 2026 **`zacht`** (afgeronde, Apple-achtige stijl — besluit Quinn, zie `docs/besluiten.md`; was `strak`, wordt omgezet in roadmap-item 1.9). Ontwerpkit en prototypes: `docs/ontwerp/` (README = spec voor tokens, primitives, filtermodel, pin). Quinn logt in als `quinn.berkouwer@icloud.com` (platform-admin). Logo/favicon/sfeerbeelden staan in Storage-bucket `kantoor-assets` onder de kantoor-id; `scripts/repair-i4housing-branding.mjs` zet het geheel opnieuw goed (standaard dry-run, `--write` om te schrijven) en `scripts/controleer-huisstijl.mjs` logt in met Playwright en meldt élke plek waar nog VestaAI-groen doorkomt.

⚠️ **Nooit een absoluut pad als `logo_url`** — dat was de oorzaak van het "?"-logo: `/kantoren/i4housing/logo.png` bestond alleen lokaal en niet in de deploy. Assets horen in Storage, met een volledige URL.

⚠️ **`var(--merk,#1A6B45)`-fallbacks maken een kapotte kantoor-lookup onzichtbaar**: bij een mislukte database-query valt de hele omgeving stil terug op VestaAI-groen, zonder foutmelding. Zie je onverwacht groen in de ingelogde omgeving, controleer dan eerst of de kantoor-query wel data teruggeeft — het is zelden een CSS-bug.

**Landingspagina** (`components/LandingPageClient.tsx`) — het oorspronkelijke, uitgebreide marketingontwerp. Geen prijzen, geen zelf-aanmelden — CTA's wijzen naar `/contact` (toegang aanvragen) of `/login`. Nieuwe kantoren worden handmatig klaargezet via `/admin`.

**Content-vlag** (`lib/features.ts`, `CONTENT_VERGRENDELD`) — momenteel `false` (ontgrendeld). Zet 'm op `true` om de contentsuite in één keer weer op slot te zetten. Content genereert sinds 16 sep 2026 altijd **NL + EN parallel** (`generateContentBeideTalen` in `lib/claude.ts`, draait de bestaande generateContent-pipeline twee keer — Engels is best-effort en blokkeert NL niet bij falen); `ResultTabs.tsx` toont een NL/EN-toggle zodra Engelse content bestaat, bewerken/herschrijven blijft uitsluitend op NL werken. De makelaar vinkt in de intake (stap 5) aan welke *optionele* contentvormen (follow-up/video/energieadvies/kopersvragen/marktanalyse) hij wil — `toepassenContentKeuzes()` filtert Claude's volledige respons achteraf; kernteksten (Funda/brochure/social/e-mail/buurt) worden altijd gegenereerd.

**Toegang** (`app/admin/`) — puur admin-beheerd, geen plan of proefperiode. De platform-admin maakt via `/admin` een kantoor aan (`createKantoor`) en koppelt daar accounts aan met een zelfgekozen wachtwoord (`addMakelaarAccount`), ook voor extra teamleden bij een bestaand kantoor (via `/admin/kantoor/[id]`, `VoegTeamlidToe.tsx`/`TeamBeheer.tsx`). Intrekken van toegang gaat via `setActief` (bant/ontbant alle auth-users van een kantoor). Zelf-aanmelden en self-serve teamuitnodigingen bestaan niet meer (geen `/auth/verify`-flow meer).

## Stack

| Laag | Tech |
|------|------|
| Frontend + API routes | Next.js 14 (App Router) |
| Database + Auth + Storage | Supabase (+ PostGIS-extensie voor `transacties.geo`) |
| AI engine (contentsuite, AI USP-extractor) | Claude API — `claude-sonnet-4-6` |
| Virtual staging | Gemini API — `gemini-2.0-flash-exp` (`GOOGLE_AI_API_KEY`) |
| Transactiedataset (waardering, marktinzichten, kaart) | i4housing's eigen Realworks-verkoopdata + overige verkopen, CSV-import via `/admin/transacties` |
| Kaart | `leaflet` + `react-leaflet`, tiles van de gratis PDOK BRT-Achtergrondkaart |
| Grafieken | `recharts` |
| PDF export | react-pdf |
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

`objecten.fase` (`acquisitie` = label "Verkoopadvies" | `in_verkoop` | `verkocht`; waarde wordt `verkoopadvies` in 2.1) bepaalt welke modules zichtbaar zijn — zie `components/ObjectWorkspace.tsx`. `objecten.status` (`draft`/`published`/`onder_bod`/`verkocht`) is de Funda-publicatiestatus binnen de fase In verkoop, los van `fase` zelf. `transacties_met_coordinaten` is een view die `geo` als `lat`/`lng`-floats ontsluit (PostgREST geeft `geography` anders als EWKB-hex terug) — gebruik die view, niet de tabel zelf, voor alles dat coördinaten nodig heeft.

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
│   ├── (app)/                 # ingelogde route-group met topbar (AppTopbar) + kantoorbranding
│   │   ├── dashboard/          #   startpagina na inloggen (sinds fase 1.6, 16-17 sep 2026):
│   │   │                       #   StartBanner + Kerncijfers (+ recent bekeken; snelkoppelingen vervallen, 1.9c)
│   │   ├── woningen/            #   woningdossier-lijst, fase-filters, knop Woning toevoegen (1.9c; PitchScorebord vervalt
│   │   │                       #   van /dashboard hierheen in fase 1.6)
│   │   ├── object/new · [id]/  #   gedeelde intake (PropertyForm) · woningdossier (ObjectWorkspace,
│   │   │                       #   fase-afhankelijk: waardering/verkoopadvies altijd, content pas
│   │   │                       #   vanaf "In verkoop")
│   │   ├── marktanalyse/        #   4 interactieve explorers: marktanalyse · transacties ·
│   │   │                       #   concurrentie · kaart
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
│   ├── WaardebepalingPaneel.tsx / UspExtractorPaneel.tsx   # Module B
│   ├── Verkoopkaart.tsx / VerkoopkaartClient.tsx / VerkoopkaartExplorer.tsx / StraalKaartPaneel.tsx
│   ├── MarktanalyseExplorer.tsx / ConcurrentieExplorer.tsx / TransactiesZoeken.tsx
│   ├── StijlLerenPaneel.tsx    # "leren van bewerkingen", gemount in het woningdossier
│   ├── LandingPageClient.tsx   # uitgebreide marketing-landingspagina
│   ├── InAanbouw.tsx           # herbruikbaar paneel voor bewust vergrendelde functies
│   └── ui/                     # design-system: tokens.ts + primitives (o.a. AppPagina, StatTile,
│                               #   EmptyState, Skeleton — sinds fase 1.1)
├── lib/
│   ├── branding.ts             # kantoorpalet uit huisstijl_json → CSS-variabelen
│   ├── waardering.ts           # referentieselectie, bandbreedte, kenmerk-effecten (vergelijkbare-paren)
│   ├── marktanalyse.ts / concurrentie.ts   # aggregatielogica voor de explorers
│   ├── transactieImport.ts     # CSV-parser met kolomherkenning via aliassen
│   ├── geo.ts                  # haversine-afstand (straal-filter verkoopkaart)
│   ├── features.ts             # CONTENT_VERGRENDELD-vlag + contentVergrendeldAntwoord()
│   ├── admin.ts                # platform-admin-lijst (isPlatformAdmin)
│   ├── schemas.ts              # Zod-schemas + TypeScript types (client-safe)
│   ├── claude.ts                # Claude API wrapper (contentsuite NL+EN, USP-extractor)
│   ├── verrijking.ts            # WOZ/CBS/Overpass/PDOK-verrijking (incl. coördinaat)
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
- `npm run test` — unit tests (Vitest)
- `npm run typecheck` — TypeScript check
- `npm run build` — productie-build
