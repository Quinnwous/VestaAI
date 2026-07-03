# VestaAI

SaaS voor Nederlandse en Belgische makelaars. Makelaar vult 8 velden in → Claude genereert een complete content-suite. Strategie & doelen: `docs/goals.md` (leidend document — bij twijfel over product of prioriteiten: dit raadplegen).

> **Copyregels:** Nooit "90 seconden" of specifieke generatietijden noemen in copy of UI. Tijdsbesparing mag benoemen, specifieke seconden niet. Geen "Founding Member"-taal gebruiken.

## Product

**Input (8 velden):**
adres · woningtype + kamers · m² · bouwjaar · energielabel · vraagprijs · USP's (vrij tekstveld) · doelgroep
Optioneel: open-huis-datum/-tijd · taal (`nl`/`en`)

**Output (17 JSON-sleutels, 12 tabbladen):**
- Vast: `funda_tekst` (600–800 woorden, Funda-regelset) · `brochure_kort`/`brochure_lang` · `instagram_emotioneel`/`_informatief`/`_actie` · `linkedin_kantoor`/`_makelaar` · `koper_email` · `buurtomschrijving`
- Optioneel: `open_huis` · `bezichtiging_followup_positief`/`_negatief` · `video_script` · `energie_advies` · `kopersvragen_faq` · `marktanalyse`
- Apart: prijswijziging-generator (`instagram_post`, `linkedin_post`, `email_geinteresseerden`)

**UI-flow:** formulier → loading → 12 tabbladen → kopieer, herschrijf, bewerk inline of exporteer/mail PDF.

**Overige features (live):** data-verrijking (WOZ, CBS-buurtdata, Overpass-voorzieningen, PDOK/BAG — `lib/verrijking.ts`, faalt stilzwijgend) · foto-verbetering met AI-analyse · virtual staging (Gemini, 6 stijlen × 6 ruimtes) · documenten-assistent (upload + chat, Anthropic Files) · object-chatbot als embed-widget (`app/widget/chatbot.js`) · content-kalender + posts inplannen (publiceren nog handmatig) · Realworks-export (XML) · wijkpagina's (SEO) · referral · NPS · onboarding-checklist · admin/klantenbeheer met plan-gating.

Concurrentiepositie en featurevergelijking met HousApp e.a.: `docs/concurrentieanalyse-housapp.md` (juli 2026).

## Stack

| Laag | Tech |
|------|------|
| Frontend + API routes | Next.js 14 (App Router) |
| Database + Auth + Storage | Supabase |
| AI engine | Claude API — `claude-sonnet-4-6` |
| Virtual staging | Gemini API — `gemini-2.0-flash-exp` (`GOOGLE_AI_API_KEY`) |
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

| Plan | Prijs | Limieten (technisch, `lib/plans.ts`) |
|------|-------|----------|
| Starter | €60/mo (€600/jr) | 5 objecten/mnd · 1 user |
| Pro | €150/mo (€1.500/jr) | 15 objecten/mnd · 5 users · huisstijlgeheugen |
| Kantoor | €500/mo (€5.000/jr) | 100 objecten/mnd (geadverteerd: onbeperkt) · white-label · API |

Plan-gating: geen plan én geen lopende trial = geen toegang. Gratis periodes kent de platform-admin toe; Stripe-facturering staat klaar maar is uitgesteld tot na de testfase. ⚠️ Abonnementsstructuur wordt herzien (zie roadmap: per-makelaar-prijs adverteren, objectlimieten heroverwegen).

## Mappenstructuur

```
VestaAI/
├── app/
│   ├── page.tsx               # landingspagina (LandingPageClient)
│   ├── (app)/                 # ingelogde route-group met vaste sidebar (AppShell)
│   │                          #   → dashboard · object/new · object/[id] (werkruimte-tabs)
│   │                          #   · kalender · huisstijl · chatbot · settings
│   ├── admin/                 # platform-admin (eigen layout) · wijken/ · auth/ · login/ · prijzen/
│   ├── widget/chatbot.js      # embed-widget voor externe makelaarssites
│   └── api/                   # generate, chat, chatbot, fotos, documenten, export,
│                              #   pdf, planning, verrijking, referral, nps, stats,
│                              #   stripe, webhooks, cron, bag, wijken, object, auth
├── components/                # ±25 componenten; kern: PropertyForm, ResultTabs, TabContent,
│                              #   FotoVerbetering, VirtualStaging, DocumentenAssistent,
│                              #   WoningdataPanel, PlanPostKnop, RealworksExportButton
├── lib/
│   ├── schemas.ts             # Zod-schemas + TypeScript types (client-safe)
│   ├── claude.ts              # Claude API wrapper, system prompt, retry
│   ├── verrijking.ts          # WOZ/CBS/Overpass/PDOK-verrijking
│   ├── plans.ts               # plan-gating + maandlimieten
│   └── supabase.ts · stripe.ts · email.ts · admin.ts · ensureMakelaar.ts
├── docs/
│   ├── goals.md               # strategie & doelen (leidend)
│   ├── roadmap.md             # open to-do's per fase (klaar = weg)
│   ├── kostenschatting.md
│   ├── concurrentieanalyse-housapp.md   # + .docx — analyse vs HousApp (juli 2026)
│   └── data-integraties/      # API-referenties voor toekomstige data-koppelingen
```

## To-do-conventie

`docs/roadmap.md` bevat alleen open items. Voltooide items worden verwijderd — geen ✅-archief. Zo blijft de roadmap een werklijst, geen logboek.

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
