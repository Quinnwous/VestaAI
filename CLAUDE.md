# VestaAI

Multi-featureplatform voor makelaars, gebouwd in eerste instantie specifiek voor i4housing. De woning is de kern: per adres bouwt de makelaar een dossier met content (Funda-tekst, brochures, virtual staging), een onderbouwde waarde met vergelijkbare verkopen en "wat-als"-scenario's (energielabel, extra kamer, garage), en — los van één woning — Marktinzichten (marktanalyse + concurrentieanalyse). Na inloggen draagt de hele omgeving — en straks het waarderingsrapport — het logo en de kleuren van het kantoor. Toegang is puur admin-beheerd (geen abonnementen). Strategie & doelen: `docs/goals.md` (leidend document — bij twijfel over product of prioriteiten: dit raadplegen).

> **Koerswijziging 15 september 2026.** VestaAI was een AI-contentplatform (Funda-teksten, brochures, virtual staging) en wordt daarnaast een waarderingsplatform — niet in plaats van. Dezelfde dag zijn ook alle prijzen/abonnementen/Stripe uit de code gehaald (niet bevroren — verwijderd) en is de navigatie herzien naar een micro/macro-hoofdstructuur. De contentsuite werd kort vergrendeld (`lib/features.ts` → `CONTENT_VERGRENDELD`) en is diezelfde week weer ontgrendeld — Quinn bouwt nog actief door en wil overal bij kunnen. De vlag blijft bestaan als schakelaar voor later.

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

Micro/macro-knip — volledige spec en bouwvolgorde in `docs/roadmap.md` § Hoofdstructuur:

- **Woningdossier** (micro, `app/(app)/object/[id]/` + `components/ObjectWorkspace.tsx`) — alles hangt aan één geselecteerd adres, met **één gedeelde intake** (besluit 15 sep, zie `docs/roadmap.md` § Hoofdstructuur): adres, kenmerken (kamers, oppervlakte, kavelgrootte, bouwjaar, energielabel, staat van onderhoud, WOZ), doelgroep en vrije-tekst bijzonderheden (→ AI USP-extractor), plus automatische verrijking (Kadaster/BAG/CBS/Overpass, `lib/verrijking.ts`). Die ene intake voedt beide modules — geen apart invoermoment per module:
  - **Module A — Content en media** (ontgrendeld): woningteksten (Funda/brochure/social/e-mail/buurt), virtual staging, documentenassistent, PDF/Realworks-export, prijswijziging — zie `components/ObjectWorkspace.tsx`. Plus de nog te bouwen **i4housing Map** (kaart met 500m-radius rond het adres, kantoor-vlaggetjes op eigen historische transacties binnen die straal).
  - **Module B — Waardering** (in aanbouw): toont de ingevulde kenmerken als modulaire, aan/uit-schakelbare blokken (voor "wat-als"-scenario's — welk kenmerk telt mee in de berekening) + referentietransacties + PDF-rapport in kantoorhuisstijl. Geen eigen los invoerformulier — leest uit dezelfde intake als Module A.
- **Marktinzichten** (macro, `app/(app)/marktanalyse/`) — los van één woning, drie dropdown-items: Marktanalyse (macro-trends per type/wijk/periode), Transacties opzoeken (losse zoekfunctie op adres/wijk/periode over de transactiedataset) en Concurrentieanalyse (eigen kantoor vs. concurrenten in de regio, databron Brainbay).
- **Kantoorinstellingen** (`app/(app)/huisstijl/`, `app/(app)/settings/`) — huisstijl, logo, tone-of-voice.

**Databron voor waardering** (nog te bouwen — zie `docs/roadmap.md` § Nu): i4housing's eigen Realworks-verkoopdata (regelmatig te importeren) als referentiedataset, **inclusief coördinaten** voor de i4housing Map. Bewuste keuze (15 sep 2026): geen externe/landelijke dataset (Altum AI, Kadaster) — dat scheelt een licentie-afhankelijkheid, maar betekent wel een kleinere referentiedataset dan een landelijke bron; zie `goals.md` § Risico's.

**Databron voor concurrentieanalyse:** Brainbay (NVM) — apart van de Realworks-import, zie `docs/roadmap.md` § "Admin-databeheer & maatwerk".

**Huisstijl na login** (`lib/branding.ts`) — bouwt uit `kantoren.huisstijl_json` een volledig palet en zet dat als CSS-variabelen (`--merk*`) in `app/(app)/layout.tsx`: kleuren (`primaire_kleur`, `accent_kleur`), lettertype (`jakarta` · `gantari` · `nunito`), vormtaal (`zacht` · `strak`), favicon, contactgegevens (`telefoon`, `email` → merkbalk bovenaan) en sfeerbeeld (`achtergrond_url`, `achtergrond_secundair_url` → licht watermerk in de zijmarges vanaf 1600px). Componenten in de ingelogde omgeving gebruiken `var(--merk)` etc., nooit een hardgecodeerde merkkleur. Kantoor zonder eigen stijl valt terug op de VestaAI-kleur; zonder sfeerbeeld blijft de achtergrond effen.

Eerste pilotkantoor: **i4 Housing** (Wassenaar, NVM). Geverifieerd uit hun eigen theme-CSS op i4housing.nl: blauw `#0080C8`, rood `#C61E45`, lettertype Proxima Nova (betaald → we voeren Nunito Sans als vrije tegenhanger), knoppen zonder afronding (`vorm: 'strak'`). Quinn logt in als `quinn.berkouwer@icloud.com` (rol admin). Logo/favicon/sfeerbeelden staan in Storage-bucket `kantoor-assets` onder de kantoor-id; `scripts/repair-i4housing-branding.mjs` zet het geheel opnieuw goed (standaard dry-run, `--write` om te schrijven) en `scripts/controleer-huisstijl.mjs` logt in met Playwright en meldt élke plek waar nog VestaAI-groen doorkomt.

⚠️ **Nooit een absoluut pad als `logo_url`** — dat was de oorzaak van het "?"-logo: `/kantoren/i4housing/logo.png` bestond alleen lokaal en niet in de deploy. Assets horen in Storage, met een volledige URL.

**Landingspagina** (`components/LandingPageClient.tsx`) — het oorspronkelijke, uitgebreide marketingontwerp (live demo-kaart, contentvoorbeelden, virtual-staging-vergelijking, Anthropic/Claude-strip, Kadaster/BAG-sectie) plus twee nieuwe secties voor Woningwaardering en Marktinzichten. Geen prijzen, geen zelf-aanmelden — CTA's wijzen naar `/contact` (toegang aanvragen) of `/login`. Nieuwe kantoren worden handmatig klaargezet via `/admin`.

**Content-vlag** (`lib/features.ts`, `CONTENT_VERGRENDELD`) — momenteel `false` (ontgrendeld): alle content-functies werken zowel op UI- (`ObjectWorkspace`, `object/new`) als API-niveau. Zet 'm op `true` om in één keer weer op slot te gaan — de API-routes beginnen dan met `if (CONTENT_VERGRENDELD) return contentVergrendeldAntwoord()` en de UI toont het `InAanbouw`-slotpaneel. Onderliggende data-verrijking (WOZ, CBS, Overpass, PDOK/BAG — `lib/verrijking.ts`) en `lib/claude.ts` zijn hoe dan ook altijd actief.

**Toegang** (`app/admin/`) — puur admin-beheerd, geen plan of proefperiode. De platform-admin (`lib/admin.ts`, vaste lijst + `PLATFORM_ADMIN_EMAILS`) maakt via `/admin` een kantoor aan (`createKantoor`) en koppelt daar accounts aan met een zelfgekozen wachtwoord (`addMakelaarAccount`, beide in `app/admin/actions.ts`). Intrekken van toegang gaat via `setActief` (bant/ontbant alle auth-users van een kantoor). Teamleden binnen een kantoor uitnodigen (zonder platform-admin te zijn) loopt via de bestaande `nodigTeamlidUit` (`app/(app)/settings/actions.ts`, magic link via `/auth/verify`). Zelf-aanmelden via `/login` bestaat niet meer.

## Stack

| Laag | Tech |
|------|------|
| Frontend + API routes | Next.js 14 (App Router) |
| Database + Auth + Storage | Supabase |
| AI engine (contentsuite; ook de toekomstige AI USP-extractor) | Claude API — `claude-sonnet-4-6` |
| Virtual staging | Gemini API — `gemini-2.0-flash-exp` (`GOOGLE_AI_API_KEY`) |
| Woningkenmerken (waardering) | i4housing's eigen Realworks-verkoopdata |
| Kaart (i4housing Map, nog te bouwen) | Nog te kiezen — Leaflet/Mapbox |
| PDF export | react-pdf |
| Transactionele e-mail | Resend |
| Styling | Tailwind CSS |
| Validatie | Zod |
| Deploy | Vercel |

Geen betalingsverwerker meer — Stripe is volledig verwijderd (zie "Prijzen" hieronder).

## Datamodel (Supabase)

```sql
kantoren:  id, name, logo_url, huisstijl_json
makelaars: id, kantoor_id, name, email, role
objecten:  id, kantoor_id, makelaar_id, address, input_json, outputs_json, created_at, status
```

`huisstijl_json.primaire_kleur` + `.accent_kleur` voeden `lib/branding.ts`. De transactiedataset voor waardering heeft nog geen tabel — komt met de importpijplijn (roadmap 🔴), inclusief coördinaten voor de i4housing Map.

`kantoren.plan`/`trial_ends_at`/`stripe_id` staan nog als ongebruikte kolommen in de database (geen migratie gedaan, zie roadmap 🟢) — de TypeScript-types (`lib/supabase.ts`) lezen ze niet meer.

## Prijzen

**Volledig verwijderd op 15 sep 2026** (niet bevroren — weg): geen abonnementen, geen `lib/plans.ts`, geen Stripe (checkout/customer-portal/webhooks-routes, de `stripe`-npm-dependency, en de trial-waarschuwings-cron zijn allemaal verwijderd). Toegang is puur admin-beheerd, zie "Toegang" hierboven. Nieuwe prijslogica komt pas als daar opnieuw over besloten wordt — zie `docs/goals.md` § Prijzen.

## Mappenstructuur

```
VestaAI/
├── app/
│   ├── page.tsx               # landingspagina (LandingPageClient) — gesloten platform, geen prijzen
│   ├── login/page.tsx         # alleen inloggen + wachtwoord-reset, geen "Aanmelden" meer
│   ├── (app)/                 # ingelogde route-group met topbar (AppTopbar) + kantoorbranding
│   │                          #   → dashboard (woningdossier-lijst) · object/new ·
│   │                          #     object/[id] (Module A + Module B) · marktanalyse
│   │                          #     (Marktinzichten) · huisstijl · settings
│   ├── admin/                 # platform-admin: kantoor/account-beheer, (de)activeren
│   └── api/                   # generate/fotos/documenten/pdf/export (content-vlag, nu ontgrendeld),
│                              #   verrijking, nps, stats, wijken, object, auth, me
├── components/
│   ├── AppTopbar.tsx           # topbar: Woningdossier · Marktinzichten · Content · Kantoorinstellingen
│   ├── LandingPageClient.tsx   # uitgebreide marketing-landingspagina (live demo, voorbeelden, Anthropic-strip)
│   ├── InAanbouw.tsx           # herbruikbaar paneel voor "in aanbouw" (Waardering, Marktinzichten)
│   ├── ObjectWorkspace.tsx     # woningdossier: Module A (content, gated) + Module B (waardering)
│   └── ui/                     # design-system: tokens.ts + primitives (PageHeader/SerifTitle,
│                              #   Eyebrow, Card, Button, Field, Switch, TabBar, Modal, Badge)
├── lib/
│   ├── branding.ts             # kantoorpalet uit huisstijl_json → CSS-variabelen
│   ├── features.ts             # CONTENT_VERGRENDELD-vlag + contentVergrendeldAntwoord()
│   ├── admin.ts                 # platform-admin-lijst (isPlatformAdmin)
│   ├── schemas.ts               # Zod-schemas + TypeScript types (client-safe)
│   ├── claude.ts                # Claude API wrapper (contentsuite, vergrendeld)
│   ├── verrijking.ts            # WOZ/CBS/Overpass/PDOK-verrijking
│   ├── ensureMakelaar.ts        # vangnet: koppelt uitgenodigd account aan zijn kantoor
│   └── supabase.ts · email.ts
├── docs/
│   ├── goals.md                # strategie & doelen (leidend, koerswijziging 15 sep)
│   ├── roadmap.md              # open to-do's per fase (klaar = weg) — incl. hoofdstructuur-spec
│   ├── kostenschatting.md      # interne API-/infrakosten — geen omzet/marge meer (prijzen weg)
│   ├── i4housing-onderzoek.md  # klantonderzoek i4housing
│   └── data-integraties/       # API-referenties (CBS-buurtdata etc.)
```

## To-do-conventie

`docs/roadmap.md` bevat alleen open items. Voltooide items worden verwijderd — geen ✅-archief. Zo blijft de roadmap een werklijst, geen logboek.

## Conventies

- TypeScript strict mode — geen `any`.
- Server Components als default; `'use client'` alleen waar interactiviteit nodig.
- **Aanspreekvorm:** de ingelogde omgeving schrijft informeel ("je/jouw"), de publieke pagina's (landing, `/login`, `/contact`) formeel ("u"). Eén globale keuze, geen instelling per kantoor — dat zou een vertaallaag over elke string vragen.
- **Geen productnaam in de kantooromgeving:** achter de login staat nergens "VestaAI" in zichtbare tekst; schrijf neutraal ("we", "het platform") of gebruik de kantoornaam uit `branding.naam`. De paginatitels krijgen hun achtervoegsel van de route-group-layout, dus pagina-`metadata` bevat alleen de paginanaam.
- **Grijstinten kleurloos houden:** geen groen-getinte grijzen (`#E9EFEB`, `#F1F7F3`, `#9AA6A0` …) in de ingelogde omgeving — die vloeken bij een blauw of rood kantoor. Neutraal grijs of `var(--merk-zacht)`/`var(--merk-rand)` gebruiken; de palette staat in `components/ui/tokens.ts`.
- **Semantische kleuren nooit aan `--merk-accent` hangen:** een afgevinkte stap of succesmelding in de accentkleur wordt rood bij i4 Housing en leest dan als fout. Gebruik `var(--merk)` of neutraal grijs.
- Merkkleuren in de ingelogde omgeving altijd via `var(--merk)`/`var(--merk-hover)`/`var(--merk-zacht)`/`var(--merk-rand)`/`var(--merk-accent)`/`var(--merk-op)` (gezet door `lib/branding.ts` in `app/(app)/layout.tsx`) — **nooit** een hardgecodeerde hexkleur voor iets dat merkgebonden is. Dat is wat white-label per kantoor laat werken.
- Een nieuwe content-route (of het heropenen van een bestaande) begint met de `CONTENT_VERGRENDELD`-check uit `lib/features.ts` totdat Quinn expliciet besluit het slot eraf te halen.
- Nieuwe accounts of kantoren **nooit** via een self-serve flow — alleen via `/admin` (`createKantoor`/`addMakelaarAccount`) of, binnen een bestaand kantoor, via `nodigTeamlidUit`. Toegang is sinds 15 sep expliciet geen self-signup-product.
- API-calls naar Claude altijd via `lib/claude.ts`, nooit direct in een component.
- Zod-schemas en TypeScript-types in `lib/schemas.ts` — importeer die in client components (niet `lib/claude.ts`, want die bundelt de Anthropic SDK).
- `.env.local` nooit committen; er is geen `.env.example` (ontbreekt — zie roadmap als dit opvalt).
- **UI/design-system** (Claude Design-redesign, juli 2026): herbruikbare primitives + tokens in `components/ui/` (kleuren/typografie in `tokens.ts`; Tailwind `forest`-scale + `font-serif`). Signatuur: Newsreader serif-koppen met cursief accentwoord + eyebrow-labels (`PageHeader`/`SerifTitle`/`Eyebrow`). `tokens.ts` blijft VestaAI's eigen groene basisstijl (landing, auth, admin) — de merkkleuren van een ingelogd kantoor lopen via `--merk*`, niet via `tokens.ts`. Hover/focus die inline-styles moeten overrulen: `.vui-*`-classes in `globals.css` (met `!important`). ⚠️ De Tailwind `blue`-scale is projectbreed geremapt naar groen (`tailwind.config.ts`) — **niet verwijderen**; landing/auth/admin leunen erop. Let op: dit is de reden waarom merkkleuren via CSS-variabelen lopen in plaats van Tailwind-classes — een kantoor met een blauw logo (zoals i4 Housing) zou anders tegen de groene remap aanlopen.

## Commands

- `npm run dev` — start lokale server
- `npm run test` — unit tests (Vitest)
- `npm run typecheck` — TypeScript check
- `npm run build` — productie-build
