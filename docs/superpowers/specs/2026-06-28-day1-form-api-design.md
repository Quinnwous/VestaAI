# VestaAI Day 1 — Formulier + Claude API

**Datum:** 2026-06-28  
**Scope:** 8-velden formulier → Claude API call → 6-tab resultatenweergave (geen auth)  
**Stack:** Next.js 14 App Router · Tailwind · Zod · Anthropic SDK (`claude-sonnet-4-6`)

---

## Architectuur

Client Component formulier roept `/api/generate` aan via POST. API route valideert input (Zod), bouwt prompt, belt Claude, valideert output (Zod), geeft JSON terug. Client toont geanimeerde checklist tijdens wachten, daarna 6-tab resultatenweergave.

```
PropertyForm (Client) → POST /api/generate → lib/claude.ts → Claude API
                     ← JSON (10 sleutels — instagram gesplitst in 3)
LoadingProgress (Client) — gesimuleerde checklist tijdens wachten
ResultTabs (Client) — toont resultaten na ontvangst
```

---

## Mappenstructuur

```
app/
  page.tsx                     → redirect naar /object/new
  object/new/page.tsx          → Server Component wrapper
  api/generate/route.ts        → POST handler + Zod I/O-validatie
components/
  PropertyForm.tsx             → 8-velden formulier, client component
  LoadingProgress.tsx          → geanimeerde checklist, client component
  ResultTabs.tsx               → 6-tab layout, client component
  TabContent.tsx               → content + kopieerknop per tab
lib/
  claude.ts                    → API wrapper, system prompt, Zod schemas
```

---

## Input (8 velden)

| Veld | Type | Validatie |
|---|---|---|
| adres | text | verplicht, min 5 tekens |
| woningtype | select | Appartement · Tussenwoning · Hoekwoning · Vrijstaand · Villa · Penthouse |
| kamers | number | 1–20 |
| oppervlak_m2 | number | 1–9999 |
| bouwjaar | number | 1800–2025 |
| energielabel | select | A++++ t/m G (11 opties) |
| vraagprijs | number | > 0, client-side formattering als € |
| usps | textarea | verplicht, max 500 tekens |
| doelgroep | select + optioneel vrij veld | Starters · Jonge gezinnen · Senioren · Investeerders · Anders (→ vrij veld) |

Zod-schema `PropertyInputSchema` in `lib/claude.ts` — zelfde schema gebruikt voor server-side validatie in de API route.

---

## API route `/api/generate`

- `export const maxDuration = 120` (Vercel max voor hobby/pro plan)
- Valideert body met `PropertyInputSchema.parse()`
- Bouwt user message als leesbare tekst (beter dan raw JSON voor Claude-output-kwaliteit)
- Roept `generateContent(input)` aan uit `lib/claude.ts`
- Vangt Zod-parse-fouten en Claude-fouten op → structured error response `{ error: string }`

---

## `lib/claude.ts`

### System prompt

```
Je bent een Nederlandse vastgoedcopywriter gespecialiseerd in Funda-advertenties.

Funda-regels:
- Max 800 woorden hoofdtekst
- Geen superlatieven zonder bewijs
- Geen discriminerende buurtomschrijvingen
- Unieke openingszin verplicht

Output: geldig JSON-object met precies deze sleutels:
{ "funda_tekst", "brochure_kort", "brochure_lang", "instagram_emotioneel",
  "instagram_informatief", "instagram_actie", "linkedin_kantoor",
  "linkedin_makelaar", "koper_email", "buurtomschrijving" }

Geen tekst buiten het JSON-object.
```

### Output Zod-schema `ContentOutputSchema`

10 string-sleutels (instagram gesplitst in 3 aparte sleutels voor eenvoudige weergave):
```ts
{
  funda_tekst: z.string(),
  brochure_kort: z.string(),
  brochure_lang: z.string(),
  instagram_emotioneel: z.string(),
  instagram_informatief: z.string(),
  instagram_actie: z.string(),
  linkedin_kantoor: z.string(),
  linkedin_makelaar: z.string(),
  koper_email: z.string(),
  buurtomschrijving: z.string(),
}
```

### Retry-logica

Max 1 retry als Zod-parse van output mislukt. Retry voegt expliciete instructie toe: "Geef alleen het JSON-object terug, niets anders."

---

## Loading state (`LoadingProgress.tsx`)

Geanimeerde checklist met 6 items, `setTimeout`-gebaseerd:

| Item | Vink aan na |
|---|---|
| Funda-tekst schrijven | 25s |
| Brochures opstellen | 40s |
| Instagram-varianten maken | 55s |
| LinkedIn-posts schrijven | 65s |
| Koper-e-mail personaliseren | 75s |
| Buurtomschrijving toevoegen | 85s |

Als API eerder terugkomt: direct doorgaan naar resultaten (timers geannuleerd via `clearTimeout`).

---

## Resultaten — 6 tabs

| Tab | Inhoud |
|---|---|
| Funda | `funda_tekst` + wordcount badge |
| Brochure | Toggle "Kort / Lang" — `brochure_kort` / `brochure_lang` |
| Instagram | 3 cards naast elkaar: emotioneel · informatief · actie |
| LinkedIn | Twee blokken: `linkedin_kantoor` + `linkedin_makelaar` |
| E-mail | `koper_email` |
| Buurt | `buurtomschrijving` |

Elke tab: **Kopieer**-knop (navigator.clipboard). Geen PDF-export in Day 1.

---

## Error handling

| Situatie | Gedrag |
|---|---|
| Validatiefout op input | Inline field errors, geen submit |
| API timeout (>120s) | Foutbanner + "Probeer opnieuw"-knop |
| Claude geeft geen valide JSON (na retry) | Foutbanner met instructie support te contacten |
| Netwerkfout | Zelfde als timeout |

---

## Buiten scope (Day 1)

- Authenticatie (Week 2)
- Stripe/betalingen (Week 2)
- PDF-export (Week 4)
- Objecthistorie opslaan in Supabase (Maand 2)
- Huisstijlgeheugen (Week 3)
- Phase 2 API-integraties (CBS, BAG, WOZ, etc.)
