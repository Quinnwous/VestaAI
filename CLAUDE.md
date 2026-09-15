# VestaAI

Waarderingsplatform voor Nederlandse makelaars. De woning is de kern: per adres bouwt de makelaar een dossier met een onderbouwde waarde, vergelijkbare verkopen en "wat-als"-scenario's (energielabel, extra kamer, garage). Marktinzichten ernaast voor vrije vragen aan de data, los van één woning. Na inloggen draagt de hele omgeving — en straks het waarderingsrapport — het logo en de kleuren van het kantoor. Toegang is puur admin-beheerd (geen abonnementen). Strategie & doelen: `docs/goals.md` (leidend document — bij twijfel over product of prioriteiten: dit raadplegen).

> **Koerswijziging 15 september 2026.** VestaAI was een AI-contentplatform (Funda-teksten, brochures, virtual staging). Dat is niet weggegooid maar **vergrendeld** — zie `lib/features.ts` (`CONTENT_VERGRENDELD`). Dezelfde dag zijn ook alle prijzen/abonnementen/Stripe uit de code gehaald (niet bevroren — verwijderd) en is de navigatie herzien naar een micro/macro-hoofdstructuur. De rest van dit document beschrijft de nieuwe koers; content-specifieke code staat er nog maar is dicht.

> **Copyregel:** geen "Founding Member"-taal gebruiken.

## Hoofdstructuur

Micro/macro-knip — volledige spec en bouwvolgorde in `docs/roadmap.md` § Hoofdstructuur:

- **Woningdossier** (micro, `app/(app)/object/[id]/` + `components/ObjectWorkspace.tsx`) — alles hangt aan één geselecteerd adres.
  - **Module A — Content en media** (🔒 vergrendeld): brochure, Funda-tekst, social media-teksten, verkoopadvies, buurtrapport, en de nog te bouwen **i4housing Map** (kaart met 500m-radius rond het adres, kantoor-vlaggetjes op eigen historische transacties binnen die straal).
  - **Module B — Waardering** (in aanbouw): modulaire variabele-blokken (kamers, WOZ, oppervlakte, kavelgrootte, energielabel, staat van onderhoud — elk aan/uit-schakelbaar) + een AI USP-extractor (vrije tekst → gestructureerde Unique Selling Points) + referentietransacties + PDF-rapport in kantoorhuisstijl.
- **Marktinzichten** (macro, `app/(app)/marktanalyse/`) — los van één woning: Marktanalyse (macro-trends per type/wijk/periode) en Concurrentieanalyse (eigen kantoor vs. concurrenten in de regio, wacht op makelaarsnaam in de dataset).
- **Kantoorinstellingen** (`app/(app)/huisstijl/`, `app/(app)/settings/`) — huisstijl, logo, tone-of-voice.

**Databron voor waardering** (nog te bouwen — zie `docs/roadmap.md` § Nu): combinatie van Altum AI (adres → woningkenmerken, zoals in `Dealwijs/`) en een eigen, regelmatig te importeren dataset van verkochte woningen (transacties, heel Nederland, **inclusief coördinaten** voor de i4housing Map). ⚠️ Licentiestatus van de transactiedata (Kadaster/NVM-brainbay/Funda zijn licentieplichtig, scrapen mag niet) moet vaststaan vóór de import gebouwd wordt — zie `goals.md` § Risico's.

**Huisstijl na login** (`lib/branding.ts`) — bouwt uit `kantoren.huisstijl_json` (`primaire_kleur` + `accent_kleur`) een volledig kleurenpalet en zet dat als CSS-variabelen (`--merk*`) in `app/(app)/layout.tsx`. Componenten in de ingelogde omgeving gebruiken `var(--merk)` etc., nooit een hardgecodeerde merkkleur. Kantoor zonder eigen stijl valt terug op de VestaAI-kleur. Eerste pilotkantoor: **i4 Housing** (Wassenaar, NVM) — blauw `#0089D0` / rood `#C81E46`, logo en palet staan in `goals.md`. ⚠️ Kantoorrecord + Quinn's eigen inlog (`quinn.berkouwer@icloud.com`) staan nog niet in de database — geblokkeerd door een kapotte `NEXT_PUBLIC_SUPABASE_URL`, zie `docs/roadmap.md` bovenaan.

**Landingspagina** (`components/LandingHero.tsx`) — gesloten platform: geen prijzen, geen zelf-aanmelden, alleen inloggen. Nieuwe kantoren worden handmatig klaargezet via `/admin`.

**Vergrendelde contentsuite** (`lib/features.ts`) — Module A (zie boven). Zichtbaar in de Content-dropdown met een slotje, maar dicht op zowel UI- (`ObjectWorkspace`, `object/new`) als API-niveau (elke content-route begint met `if (CONTENT_VERGRENDELD) return contentVergrendeldAntwoord()`). Geldt voor iedereen, ook i4 Housing. Onderliggende data-verrijking (WOZ, CBS, Overpass, PDOK/BAG — `lib/verrijking.ts`) en `lib/claude.ts` blijven intact voor als het slot er weer af gaat.

**Toegang** (`app/admin/`) — puur admin-beheerd, geen plan of proefperiode. De platform-admin (`lib/admin.ts`, vaste lijst + `PLATFORM_ADMIN_EMAILS`) maakt via `/admin` een kantoor aan (`createKantoor`) en koppelt daar accounts aan met een zelfgekozen wachtwoord (`addMakelaarAccount`, beide in `app/admin/actions.ts`). Intrekken van toegang gaat via `setActief` (bant/ontbant alle auth-users van een kantoor). Teamleden binnen een kantoor uitnodigen (zonder platform-admin te zijn) loopt via de bestaande `nodigTeamlidUit` (`app/(app)/settings/actions.ts`, magic link via `/auth/verify`). Zelf-aanmelden via `/login` bestaat niet meer.

## Stack

| Laag | Tech |
|------|------|
| Frontend + API routes | Next.js 14 (App Router) |
| Database + Auth + Storage | Supabase |
| AI engine (contentsuite, vergrendeld; ook de toekomstige AI USP-extractor) | Claude API — `claude-sonnet-4-6` |
| Virtual staging (vergrendeld) | Gemini API — `gemini-2.0-flash-exp` (`GOOGLE_AI_API_KEY`) |
| Woningkenmerken (waardering) | Altum AI — patroon staat al in `Dealwijs/` |
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
│   ├── page.tsx               # landingspagina (LandingHero) — alleen inloggen, geen prijzen
│   ├── login/page.tsx         # alleen inloggen + wachtwoord-reset, geen "Aanmelden" meer
│   ├── (app)/                 # ingelogde route-group met topbar (AppTopbar) + kantoorbranding
│   │                          #   → dashboard (woningdossier-lijst) · object/new (op slot) ·
│   │                          #     object/[id] (Module A🔒 + Module B) · marktanalyse
│   │                          #     (Marktinzichten) · huisstijl · settings
│   ├── admin/                 # platform-admin: kantoor/account-beheer, (de)activeren
│   └── api/                   # generate/fotos/documenten/pdf/export (allemaal 🔒 vergrendeld),
│                              #   verrijking, nps, stats, wijken, object, auth, me
├── components/
│   ├── AppTopbar.tsx           # topbar: Woningdossier · Marktinzichten · Content🔒 · Kantoorinstellingen
│   ├── LandingHero.tsx         # gesloten landingspagina
│   ├── InAanbouw.tsx           # herbruikbaar paneel voor "in aanbouw" én "vergrendeld"
│   ├── ObjectWorkspace.tsx     # woningdossier: Module A (content🔒) + Module B (waardering)
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
│   ├── Concurrentieanalyse-HousApp.docx  # analyse vs HousApp (juli 2026, contentplatform-context)
│   └── data-integraties/       # API-referenties (CBS-buurtdata etc.)
```

## To-do-conventie

`docs/roadmap.md` bevat alleen open items. Voltooide items worden verwijderd — geen ✅-archief. Zo blijft de roadmap een werklijst, geen logboek.

## Conventies

- TypeScript strict mode — geen `any`.
- Server Components als default; `'use client'` alleen waar interactiviteit nodig.
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
