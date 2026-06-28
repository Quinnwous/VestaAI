# VestaAI

SaaS voor Nederlandse en Belgische makelaars. Makelaar vult 8 velden in → Claude genereert in 90 seconden een complete content-suite. Businessplan: `VestaAI.html` (leidend document — bij twijfel over product of prioriteiten: dit raadplegen).

## Product

**Input (8 velden):**
adres · woningtype + kamers · m² · bouwjaar · energielabel · vraagprijs · USP's (vrij tekstveld) · doelgroep

**Output (7 content-types):**
1. Funda-tekst (600–800 woorden, Funda-regelset ingebakken)
2. Brochure kort (200 woorden)
3. Brochure lang (500+ woorden)
4. Instagram (3 varianten: emotioneel / informatief / actie)
5. LinkedIn (kantoor-variant + individuele makelaar)
6. Koper-e-mail (toon past op prijs + doelgroep)
7. Buurtomschrijving

**UI-flow:** formulier → loading (90s) → 6 tabbladen met gegenereerde teksten → kopieer of exporteer PDF.

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
| Solo | €79/mo (€790/jr) | 30 objecten/mo · 1 user |
| Kantoor | €149/mo (€1.490/jr) | onbeperkt · 5 users · huisstijlgeheugen |
| Franchise | €499/mo | onbeperkt users/kantoren · white-label · API |

14 dagen gratis proefperiode → automatische facturering via Stripe.

## Buildvolgorde (MVP)

- **Day 1:** formulier (8 velden) → Claude API call → JSON → 6-tab weergave (geen auth)
- **Week 2:** Supabase auth (magic links) + Stripe
- **Week 3:** kantoorinstellingen (logo upload + huisstijlprofiel)
- **Week 4:** PDF-export met kantoorbranding (react-pdf)
- **Maand 2:** multi-user, objecthistorie, dashboard

## Mappenstructuur (Next.js App Router)

```
VestaAI/
├── app/
│   ├── (auth)/            # login / magic-link confirm
│   ├── dashboard/         # objectenoverzicht
│   ├── object/new/        # 8-velden formulier
│   └── api/
│       ├── generate/      # POST: Claude API call → JSON
│       └── webhooks/      # Stripe webhook handler
├── components/            # herbruikbare UI-componenten
├── lib/
│   ├── claude.ts          # Claude API wrapper + system prompt
│   ├── supabase.ts        # Supabase server/client helpers
│   └── stripe.ts          # Stripe helpers
├── archive/skills/        # Phase 2 referentie: CBS, WOZ, Overpass, BAG, …
└── VestaAI.html           # Businessplan (leidend)
```

## Claude system prompt (structuur)

```
Je bent een Nederlandse vastgoedcopywriter gespecialiseerd in Funda-advertenties.

Funda-regels:
- Max 800 woorden hoofdtekst
- Geen superlatieven zonder bewijs
- Geen discriminerende buurtomschrijvingen
- Unieke openingszin verplicht

Kantoorcontext (dynamisch per account):
- Huisstijl: {huisstijl_json}
- Voorbeeldteksten: {voorbeeld_array}

Output: JSON-object met exacte sleutels:
{ funda_tekst, brochure_kort, brochure_lang, instagram_3x, linkedin_post, koper_email, buurtomschrijving }
```

## Conventies

- TypeScript strict mode — geen `any`.
- Server components als default; client components alleen als interactiviteit vereist.
- API-calls naar Claude altijd via `lib/claude.ts` (nooit direct in een component).
- `.env.local` nooit committen; zie `.env.example` voor vereiste variabelen.
- Kosten Claude API: ~€0,08 per content-set (Sonnet 4.6). Ruim bijhouden bij prompting.

## Commands

- `npm run dev` — start lokale server
- `npm run typecheck` — TypeScript check
- `npm run build` — productie-build

## Phase 2 referentie

`archive/skills/` bevat 6 SKILL.md-bestanden met Dutch API-kennis voor toekomstige features:
- `buurtanalyse-cbs/` — CBS Statline (buurtstatistieken)
- `overpass-voorzieningen/` — OpenStreetMap POI-data
- `woz-vergelijking/` — WOZ waardehistorie
- `historisch-waarde/` — historische waardeontwikkeling
- `marktdynamiek/` — marktdynamiek per object
- `bag-data/` — BAG adres + bouwjaar + m²

Deze komen terug bij de "local market analysis per object"-feature (Phase 2, maand 4+).
