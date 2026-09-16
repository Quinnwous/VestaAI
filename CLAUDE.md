# VestaAI

Multi-featureplatform voor makelaars, gebouwd in eerste instantie specifiek voor i4housing. De woning is de kern: één woningdossier per adres doorloopt drie fases (Acquisitie → In verkoop → Verkocht) — van waardebepaling en verkoopadvies tot de volledige contentsuite eenmaal de opdracht binnen is. Los daarvan: Marktinzichten, een interactieve verkenner van de eigen transactiedataset (marktanalyse, transacties opzoeken, concurrentieanalyse, verkoopkaart). Na inloggen draagt de hele omgeving het logo en de kleuren van het kantoor. Toegang is puur admin-beheerd (geen abonnementen), en er is één rol per kantoor. Strategie & doelen: `docs/goals.md` (leidend document — bij twijfel over product of prioriteiten: dit raadplegen).

> **Koerswijziging 15 september 2026.** VestaAI was een AI-contentplatform (Funda-teksten, brochures, virtual staging) en werd daarnaast een waarderingsplatform. Alle prijzen/abonnementen/Stripe zijn uit de code gehaald (niet bevroren — verwijderd).
>
> **Herstructurering 16 september 2026** (zie `docs/roadmap.md` voor het volledige besluitenlogboek): de micro/macro-navigatie is vervangen door een **fasemodel** — één woningdossier per adres met fases Acquisitie → In verkoop → Verkocht, in plaats van een los "Content"-hoofdmenu. Daarnaast: **één rol per kantoor** (geen kantoor-admin meer; huisstijl, courtage en team zijn platform-admin-beheerd via `/admin`), een echte **transactiedataset** (tabel `transacties`, CSV-import via `/admin/transacties`) die de waardering, marktinzichten en de verkoopkaart voedt, en content die standaard **NL + EN** tegelijk genereert.

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

Fasemodel (besluit 16 sep 2026) — volledig besluitenlogboek in `docs/roadmap.md`:

- **Woningdossier** (`app/(app)/object/[id]/` + `components/ObjectWorkspace.tsx`) — één dossier per adres, met **één gedeelde intake** (`components/PropertyForm.tsx`, een zesstappen-wizard: adres, woning, staat & afwerking, ligging & buitenruimte, verhaal, commercieel). Elk nieuw dossier start in fase **Acquisitie**, en doorloopt:
  - **Acquisitie** — alleen waardebepaling en verkoopadvies zichtbaar (er zijn nog geen foto's of een vaste vraagprijs). Bevat een pitch-uitslag (open/gewonnen/verloren, `FaseToggle.tsx`) — "gewonnen" schuift het dossier door naar In verkoop. Het dashboard toont een scorebord (`PitchScorebord.tsx`) met winratio.
  - **In verkoop** — hetzelfde als Acquisitie, plus de volledige contentsuite (Funda/brochure/social/e-mail/buurt, virtual staging, documentenassistent, export) — zie `components/ObjectWorkspace.tsx`. Content wordt in de achtergrond al gegenereerd zodra het dossier wordt aangemaakt (`/api/generate`), maar blijft verborgen tot deze fase.
  - **Verkocht** — alles blijft bereikbaar, puur archief-gelabeld.
  - **Waardering (Module B)** — `lib/waardering.ts` + `components/WaardebepalingPaneel.tsx`: vergelijkbare-verkopen-methode (geen regressie — bij deze dataset-schaal te schijnzeker) op de tabel `transacties`, met modulaire aan/uit-blokken (garage/tuin) via vergelijkbare-paren, een bandbreedte die verbreedt bij weinig referenties, en een makelaar-correctie met verplichte motivatie (`waardering-actions.ts`, kolom `objecten.waardering_json`). Puur een onderbouwde indicatie voor het verkoopadvies — geen NWWI-taxatie.
  - **AI USP-extractor** — `lib/claude.ts` `extraheerUsps()` + `/api/object/[id]/usps`: vertaalt de vrije intaketekst naar gestructureerde USP's (`components/UspExtractorPaneel.tsx`, kolom `objecten.usps_structuur`).
  - **Verkoopadvies** — nog te bouwen (`docs/roadmap.md` § Blokkades: wacht op een voorbeelddocument van Quinn). Alle onderliggende data (waardering, buurtkaart, kantoorprofiel, courtage) is al beschikbaar.
  - **Verkoopkaart, straal-uitsnede** (`components/StraalKaartPaneel.tsx`) — 250/500/1000 m rond het adres, alleen eigen verkopen.
- **Marktinzichten** (`app/(app)/marktanalyse/`, los van één woning) — vier interactieve explorers, geen statische dashboards:
  - **Marktanalyse** (`components/MarktanalyseExplorer.tsx` + `lib/marktanalyse.ts`) — filters op type/wijk/periode, segmentvergelijking, recharts-grafieken (prijs, m²-prijs, doorlooptijd).
  - **Transacties opzoeken** (`components/TransactiesZoeken.tsx`) — zoeken/filteren over de dataset; "meenemen als referentie" wacht op verdere waarderings-integratie.
  - **Concurrentieanalyse** (`components/ConcurrentieExplorer.tsx` + `lib/concurrentie.ts`) — marktaandeel, wie wint welk segment, presteren wij beter, concurrent-profielen. Draait op `transacties.verkopend_kantoor`; toont een eerlijke lege staat zolang dat veld niet gevuld is.
  - **Verkoopkaart** (`app/(app)/marktanalyse/kaart/`, `components/VerkoopkaartExplorer.tsx`) — alleen eigen verkopen als vlaggetje, met live filters.
- **Verhuur** — zichtbaar in de topbar, bewust op slot ("Binnenkort"). Niet gebouwd.
- **Kantoor** (`app/(app)/kantoor/`) — read-only pagina achter het gebruikersmenu: huisstijl-preview, kantoorgegevens, team, statistieken. Bewerken kan alleen via `/admin/kantoor/[id]` (platform-admin).

**Eén rol per kantoor** (besluit 16 sep 2026): iedereen met een login binnen een kantoor ziet en kan hetzelfde — geen kantoor-admin meer. De kolom `makelaars.role` bestaat nog maar stuurt geen rechten meer binnen het kantoor. Platform-admin (Quinn, `lib/admin.ts`) is een los concept.

**Transactiedataset** (tabel `transacties`, zie "Datamodel") — i4housing's eigen Realworks-verkoopdata, aangevuld met verkopen van andere kantoren voor een grotere referentiebasis. Geïmporteerd door de platform-admin via `/admin/transacties` (CSV, kolomherkenning via aliassen in `lib/transactieImport.ts`, upsert op adres+datum voor herhaalbare herimport) — het kantoor importeert zelf niets (concierge-model, zie `docs/goals.md` § Bedieningsmodel). De kolom `eigen_verkoop` bepaalt wat op de verkoopkaart een vlaggetje krijgt (alleen eigen verkopen); de rest van de dataset voedt waardering en marktanalyse. `verkopend_kantoor` (optioneel) voedt de concurrentieanalyse zonder aparte Brainbay-import, zodra bevestigd dat de Realworks-export dit veld bevat.

**Huisstijl** (`lib/branding.ts`) — bouwt uit `kantoren.huisstijl_json` een volledig palet en zet dat als CSS-variabelen (`--merk*`) in `app/(app)/layout.tsx`: kleuren (`primaire_kleur`, `accent_kleur`), lettertype (`jakarta` · `gantari` · `nunito`), vormtaal (`zacht` · `strak`), favicon, contactgegevens en sfeerbeeld. Volledig **platform-admin-beheerd** sinds 16 sep 2026: bewerkbaar formulier in `app/admin/kantoor/HuisstijlForm.tsx` (bereikbaar via `/admin/kantoor/[id]`), het kantoor zelf ziet alleen een read-only preview op `/kantoor`. Componenten in de ingelogde omgeving gebruiken `var(--merk)` etc., nooit een hardgecodeerde merkkleur. **Kantoorinstellingen** (courtage, kantoorprofiel, werkgebied — `lib/schemas.ts` `KantoorInstellingenSchema`, kolom `kantoren.instellingen_json`) zijn eveneens platform-admin-beheerd via `app/admin/kantoor/InstellingenForm.tsx`.

**Stijl leren** (`stijl_bewerkingen`-tabel) — als een makelaar een gegenereerde tekst handmatig bijwerkt, kan het kantoor zelf de daaruit gedestilleerde schrijfregels goedkeuren via `components/StijlLerenPaneel.tsx`, gemount in het woningdossier zelf (niet in een instellingenscherm — dat is sinds 16 sep 2026 platform-admin-gebied).

Eerste pilotkantoor: **i4 Housing** (Wassenaar, NVM). Geverifieerd uit hun eigen theme-CSS op i4housing.nl: blauw `#0080C8`, rood `#C61E45`, lettertype Proxima Nova (betaald → we voeren Nunito Sans als vrije tegenhanger), knoppen zonder afronding (`vorm: 'strak'`). Quinn logt in als `quinn.berkouwer@icloud.com` (platform-admin). Logo/favicon/sfeerbeelden staan in Storage-bucket `kantoor-assets` onder de kantoor-id; `scripts/repair-i4housing-branding.mjs` zet het geheel opnieuw goed (standaard dry-run, `--write` om te schrijven) en `scripts/controleer-huisstijl.mjs` logt in met Playwright en meldt élke plek waar nog VestaAI-groen doorkomt.

⚠️ **Nooit een absoluut pad als `logo_url`** — dat was de oorzaak van het "?"-logo: `/kantoren/i4housing/logo.png` bestond alleen lokaal en niet in de deploy. Assets horen in Storage, met een volledige URL.

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

`objecten.fase` (`acquisitie` | `in_verkoop` | `verkocht`) bepaalt welke modules zichtbaar zijn — zie `components/ObjectWorkspace.tsx`. `objecten.status` (`draft`/`published`/`onder_bod`/`verkocht`) is de Funda-publicatiestatus binnen de fase In verkoop, los van `fase` zelf. `transacties_met_coordinaten` is een view die `geo` als `lat`/`lng`-floats ontsluit (PostgREST geeft `geography` anders als EWKB-hex terug) — gebruik die view, niet de tabel zelf, voor alles dat coördinaten nodig heeft.

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
│   │   ├── dashboard/          #   woningdossier-lijst, fase-filters, PitchScorebord
│   │   ├── object/new · [id]/  #   gedeelde intake (PropertyForm) · woningdossier (ObjectWorkspace,
│   │   │                       #   fase-afhankelijk: waardering/verkoopadvies altijd, content pas
│   │   │                       #   vanaf "In verkoop")
│   │   ├── marktanalyse/        #   4 interactieve explorers: marktanalyse · transacties ·
│   │   │                       #   concurrentie · kaart
│   │   └── kantoor/             #   read-only: huisstijl-preview, team, statistieken
│   ├── admin/                  # platform-admin: kantoor/account-beheer, per-kantoor huisstijl +
│   │   ├── kantoor/[id]/        #   instellingen + team (HuisstijlForm/InstellingenForm/TeamBeheer),
│   │   └── transacties/         #   transactie-CSV-import
│   └── api/                    # generate (NL+EN), fotos/documenten/pdf/export, verrijking,
│                                #   object/[id]/usps, stats, object, auth, me
├── components/
│   ├── AppTopbar.tsx           # topbar: Woningdossier · Marktinzichten · Verhuur (op slot)
│   ├── ObjectWorkspace.tsx     # woningdossier, fase-afhankelijke weergave
│   ├── WaardebepalingPaneel.tsx / UspExtractorPaneel.tsx   # Module B
│   ├── Verkoopkaart.tsx / VerkoopkaartClient.tsx / VerkoopkaartExplorer.tsx / StraalKaartPaneel.tsx
│   ├── MarktanalyseExplorer.tsx / ConcurrentieExplorer.tsx / TransactiesZoeken.tsx
│   ├── StijlLerenPaneel.tsx    # "leren van bewerkingen", gemount in het woningdossier
│   ├── LandingPageClient.tsx   # uitgebreide marketing-landingspagina
│   ├── InAanbouw.tsx           # herbruikbaar paneel voor bewust vergrendelde functies (Verhuur)
│   └── ui/                     # design-system: tokens.ts + primitives
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
│   ├── roadmap.md              # open to-do's per fase (klaar = weg) — incl. besluitenlogboek
│   ├── kostenschatting.md      # interne API-/infrakosten
│   ├── i4housing-onderzoek.md  # klantonderzoek i4housing
│   └── data-integraties/       # API-referenties (CBS-buurtdata etc.)
```

## To-do-conventie

`docs/roadmap.md` bevat alleen open items. Voltooide items worden verwijderd — geen ✅-archief. Zo blijft de roadmap een werklijst, geen logboek.

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
