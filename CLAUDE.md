# VestaAI

SaaS voor Nederlandse en Belgische makelaars. Makelaar vult 8 velden in → Claude genereert in 90 seconden een complete content-suite. Strategie & doelen: `docs/goals.md` (leidend document — bij twijfel over product of prioriteiten: dit raadplegen).

## Product

**Input (8 velden):**
adres · woningtype + kamers · m² · bouwjaar · energielabel · vraagprijs · USP's (vrij tekstveld) · doelgroep

**Output (10 JSON-sleutels, 7 content-types):**
1. `funda_tekst` — 600–800 woorden, Funda-regelset ingebakken
2. `brochure_kort` — ~200 woorden
3. `brochure_lang` — 500+ woorden
4. `instagram_emotioneel` / `instagram_informatief` / `instagram_actie` — 3 losse varianten
5. `linkedin_kantoor` / `linkedin_makelaar` — 2 varianten
6. `koper_email`
7. `buurtomschrijving`

**UI-flow:** formulier → loading (90s) → 6 tabbladen → kopieer of exporteer PDF.

## Stack

| Laag | Tech |
|------|------|
| Frontend + API routes | Next.js 14 (App Router) |
| Database + Auth + Storage | Supabase |
| AI engine | Claude API — `claude-sonnet-4-6` |
| Payments | Stripe (magic links + subscriptions) |
| PDF export | react-pdf |
| Transactionele e-mail | Resend |
| Styling | Tailwind CSS |
| Validatie | Zod |
| Deploy | Vercel |

## Datamodel (Supabase)

```sql
kantoren:  id, name, plan, logo_url, huisstijl_json, stripe_id, trial_ends_at
makelaars: id, kantoor_id, name, email, role
objecten:  id, kantoor_id, makelaar_id, address, input_json, outputs_json, created_at, status
```

## Prijzen

| Plan | Prijs | Limieten |
|------|-------|----------|
| Starter | €99/mo (€990/jr) | 40 objecten/mo · 1 user |
| Pro | €199/mo (€1.990/jr) | onbeperkt · 5 users · huisstijlgeheugen |
| Kantoor | €599/mo (€5.990/jr) | onbeperkt users/kantoren · white-label · API |

14 dagen gratis proefperiode → automatische facturering via Stripe.

## Mappenstructuur

```
VestaAI/
├── app/
│   ├── object/new/        # 8-velden formulier + state machine
│   ├── api/generate/      # POST: Claude API call → JSON
│   └── page.tsx           # redirect → /object/new
├── components/
│   ├── PropertyForm.tsx   # formulier (react-hook-form + zod)
│   ├── LoadingProgress.tsx
│   ├── ResultTabs.tsx     # 6-tab weergave
│   └── TabContent.tsx     # content + kopieerknop
├── lib/
│   ├── schemas.ts         # Zod-schemas + TypeScript types (client-safe)
│   ├── claude.ts          # Claude API wrapper, system prompt, retry
│   ├── supabase.ts        # (Week 2)
│   └── stripe.ts          # (Week 2)
├── docs/
│   ├── roadmap.md         # ← to-do + statusoverzicht (✅ = klaar)
│   └── fase2/             # API-referenties voor toekomstige databronnen
│       ├── bag-data.md
│       ├── buurtanalyse-cbs.md
│       ├── historisch-waarde.md
│       ├── marktdynamiek.md
│       ├── overpass-voorzieningen.md
│       └── woz-vergelijking.md
│   └── goals.md           # strategie & doelen (leidend)
```

## To-do-conventie

`docs/roadmap.md` is het enige stappenplan én statusoverzicht. Zet `✅` voor voltooide items — nooit verwijderen. Zo zie je altijd de volledige toestand van het product en wat er nog openstaat.

## Conventies

- TypeScript strict mode — geen `any`.
- Server Components als default; `'use client'` alleen waar interactiviteit nodig.
- API-calls naar Claude altijd via `lib/claude.ts`, nooit direct in een component.
- Zod-schemas en TypeScript-types in `lib/schemas.ts` — importeer die in client components (niet `lib/claude.ts`, want die bundelt de Anthropic SDK).
- `.env.local` nooit committen; zie `.env.example` voor vereiste variabelen.
- Kosten Claude API: ~€0,08 per content-set (Sonnet 4.6).

## Commands

- `npm run dev` — start lokale server
- `npm run test` — unit tests (Vitest)
- `npm run typecheck` — TypeScript check
- `npm run build` — productie-build
