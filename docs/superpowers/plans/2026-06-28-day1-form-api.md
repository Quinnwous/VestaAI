# VestaAI Day 1 — Formulier + Claude API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8-velden formulier → POST naar `/api/generate` → Claude genereert JSON → 6-tab resultatenweergave, geen auth.

**Architecture:** Client Component formulier stuurt form data via POST naar een Next.js API route. De API route valideert input via Zod, belt de Claude API via `lib/claude.ts`, valideert output via Zod, en geeft JSON terug. De client toont een geanimeerde progress checklist tijdens het wachten en daarna 6 tabs met de gegenereerde content.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Tailwind CSS · Zod · react-hook-form + @hookform/resolvers · @anthropic-ai/sdk · Vitest (unit tests op lib + API route)

## Global Constraints

- TypeScript strict mode — geen `any`
- Server Components als default; `'use client'` alleen waar interactiviteit nodig
- Claude API-calls altijd via `lib/claude.ts`, nooit direct in een component
- Model: `claude-sonnet-4-6`
- API route timeout: `export const maxDuration = 120`
- Geen PDF-export, geen auth, geen Supabase in dit plan
- `.env.local` nooit committen; `.env.example` bevat de vereiste variabelen

---

## File Map

| Bestand | Actie | Verantwoordelijkheid |
|---|---|---|
| `lib/claude.ts` | Create | Zod-schemas, system prompt, `generateContent()` |
| `lib/claude.test.ts` | Create | Unit tests voor schemas + `generateContent()` |
| `app/api/generate/route.ts` | Create | POST handler, I/O-validatie, error responses |
| `app/api/generate/route.test.ts` | Create | Unit tests voor route |
| `components/PropertyForm.tsx` | Create | 8-velden formulier (Client Component) |
| `components/LoadingProgress.tsx` | Create | Geanimeerde checklist (Client Component) |
| `components/ResultTabs.tsx` | Create | 6-tab resultatenweergave (Client Component) |
| `components/TabContent.tsx` | Create | Content + kopieerknop per tab |
| `app/object/new/page.tsx` | Create | Pagina: wires form → loading → results |
| `app/page.tsx` | Modify | Redirect naar `/object/new` |
| `vitest.config.ts` | Create | Vitest configuratie |
| `package.json` | Modify | Dependencies toevoegen |

---

## Task 1: Dependencies installeren + Vitest configureren

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `vitest` test runner beschikbaar via `npm run test`

- [ ] **Stap 1: Installeer runtime dependencies**

```bash
cd "/Users/quinnberkouwer/Documents/AI/Claude Code/VestaAI"
npm install @anthropic-ai/sdk zod react-hook-form @hookform/resolvers
```

Verwacht: geen errors, packages verschijnen in `node_modules/`.

- [ ] **Stap 2: Installeer dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Stap 3: Maak `vitest.config.ts` aan**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Stap 4: Voeg test script toe aan `package.json`**

Vervang de `"scripts"` sectie:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Stap 5: Verifieer setup**

```bash
npm run test
```

Verwacht: "No test files found" (geen error, test runner werkt).

- [ ] **Stap 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add dependencies and vitest setup"
```

---

## Task 2: `lib/claude.ts` — Zod schemas + Claude wrapper

**Files:**
- Create: `lib/claude.ts`
- Create: `lib/claude.test.ts`

**Interfaces:**
- Produces:
  - `PropertyInputSchema` — Zod schema voor form input
  - `ContentOutputSchema` — Zod schema voor Claude output
  - `PropertyInput` — TypeScript type
  - `ContentOutput` — TypeScript type
  - `generateContent(input: PropertyInput): Promise<ContentOutput>` — belt Claude

- [ ] **Stap 1: Schrijf de falende schematesst**

Maak `lib/claude.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PropertyInputSchema, ContentOutputSchema } from './claude'

const validInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype: 'Appartement' as const,
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1920,
  energielabel: 'C' as const,
  vraagprijs: 450000,
  usps: 'Prachtig uitzicht, gerenoveerde keuken',
  doelgroep: 'Jonge gezinnen',
}

describe('PropertyInputSchema', () => {
  it('accepts valid input', () => {
    expect(() => PropertyInputSchema.parse(validInput)).not.toThrow()
  })

  it('rejects invalid woningtype', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, woningtype: 'Iglo' })
    ).toThrow()
  })

  it('rejects bouwjaar < 1800', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, bouwjaar: 1700 })
    ).toThrow()
  })

  it('rejects bouwjaar > 2025', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, bouwjaar: 2100 })
    ).toThrow()
  })

  it('rejects adres shorter than 5 chars', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, adres: 'AB' })
    ).toThrow()
  })

  it('rejects usps longer than 500 chars', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, usps: 'x'.repeat(501) })
    ).toThrow()
  })
})

describe('ContentOutputSchema', () => {
  it('accepts valid output with all 10 keys', () => {
    const output = {
      funda_tekst: 'tekst',
      brochure_kort: 'kort',
      brochure_lang: 'lang',
      instagram_emotioneel: 'em',
      instagram_informatief: 'inf',
      instagram_actie: 'act',
      linkedin_kantoor: 'knt',
      linkedin_makelaar: 'mak',
      koper_email: 'mail',
      buurtomschrijving: 'buurt',
    }
    expect(() => ContentOutputSchema.parse(output)).not.toThrow()
  })

  it('rejects output missing a key', () => {
    expect(() =>
      ContentOutputSchema.parse({ funda_tekst: 'tekst' })
    ).toThrow()
  })
})
```

- [ ] **Stap 2: Draai test — verwacht FAIL**

```bash
npm run test lib/claude.test.ts
```

Verwacht: "Cannot find module './claude'"

- [ ] **Stap 3: Schrijf `lib/claude.ts` (schemas)**

```ts
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// ── Schemas ──────────────────────────────────────────────────────────────────

export const PropertyInputSchema = z.object({
  adres: z.string().min(5),
  woningtype: z.enum([
    'Appartement', 'Tussenwoning', 'Hoekwoning',
    'Vrijstaand', 'Villa', 'Penthouse',
  ]),
  kamers: z.number().int().min(1).max(20),
  oppervlak_m2: z.number().int().min(1).max(9999),
  bouwjaar: z.number().int().min(1800).max(2025),
  energielabel: z.enum(['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
  vraagprijs: z.number().int().min(1),
  usps: z.string().min(1).max(500),
  doelgroep: z.string().min(1),
})

export type PropertyInput = z.infer<typeof PropertyInputSchema>

export const ContentOutputSchema = z.object({
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
})

export type ContentOutput = z.infer<typeof ContentOutputSchema>

// ── Claude API ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Je bent een Nederlandse vastgoedcopywriter gespecialiseerd in Funda-advertenties.

Funda-regels:
- Max 800 woorden hoofdtekst
- Geen superlatieven zonder bewijs
- Geen discriminerende buurtomschrijvingen
- Unieke openingszin verplicht

Output: geldig JSON-object met precies deze sleutels:
{ "funda_tekst", "brochure_kort", "brochure_lang", "instagram_emotioneel",
  "instagram_informatief", "instagram_actie", "linkedin_kantoor",
  "linkedin_makelaar", "koper_email", "buurtomschrijving" }

Geen tekst buiten het JSON-object.`

function buildUserMessage(input: PropertyInput): string {
  return `Woning: ${input.adres}
Type: ${input.woningtype}, ${input.kamers} kamers
Oppervlak: ${input.oppervlak_m2} m²
Bouwjaar: ${input.bouwjaar}
Energielabel: ${input.energielabel}
Vraagprijs: €${input.vraagprijs.toLocaleString('nl-NL')}
USP's: ${input.usps}
Doelgroep: ${input.doelgroep}

Genereer alle content als JSON.`
}

function parseClaudeResponse(text: string): ContentOutput {
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return ContentOutputSchema.parse(JSON.parse(cleaned))
}

export async function generateContent(
  input: PropertyInput,
  client: Anthropic = new Anthropic(),
): Promise<ContentOutput> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const extra = attempt > 0
      ? '\n\nBelangrijk: geef ALLEEN het JSON-object terug, geen tekst ervoor of erna.'
      : ''

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(input) + extra }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    try {
      return parseClaudeResponse(text)
    } catch {
      if (attempt === 1) throw new Error('Claude gaf geen valide JSON na 2 pogingen')
    }
  }
  throw new Error('Onverwachte fout')
}
```

- [ ] **Stap 4: Draai schematesst — verwacht PASS**

```bash
npm run test lib/claude.test.ts
```

Verwacht: alle 8 tests groen.

- [ ] **Stap 5: Schrijf test voor `generateContent` — voeg toe aan `lib/claude.test.ts`**

```ts
import { vi, describe, it, expect } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'

const validOutput = {
  funda_tekst: 'Prachtig appartement aan de Herengracht...',
  brochure_kort: 'Kort brochure tekst.',
  brochure_lang: 'Uitgebreide brochure tekst.',
  instagram_emotioneel: 'Wonen waar jij van droomt.',
  instagram_informatief: '85m², 3 kamers, energielabel C.',
  instagram_actie: 'Plan nu een bezichtiging!',
  linkedin_kantoor: 'Wij presenteren dit unieke object.',
  linkedin_makelaar: 'Trots dit object te mogen verkopen.',
  koper_email: 'Beste geïnteresseerde...',
  buurtomschrijving: 'De Jordaan is een levendige wijk.',
}

describe('generateContent', () => {
  it('parses valid Claude response', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validOutput) }],
    })
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Prachtig uitzicht', doelgroep: 'Jonge gezinnen',
      },
      mockClient,
    )
    expect(result.funda_tekst).toContain('Herengracht')
    expect(result.buurtomschrijving).toContain('Jordaan')
  })

  it('strips markdown code fences', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(validOutput) + '\n```' }],
    })
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
      },
      mockClient,
    )
    expect(result.funda_tekst).toBeDefined()
  })

  it('retries once on invalid JSON', async () => {
    const mockCreate = vi.fn()
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'dit is geen json' }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(validOutput) }] })
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
      },
      mockClient,
    )
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(result.funda_tekst).toBeDefined()
  })

  it('throws after 2 failed attempts', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'geen json' }],
    })
    const mockClient = { messages: { create: mockCreate } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await expect(
      generateContent(
        {
          adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
          oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
          vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
        },
        mockClient,
      ),
    ).rejects.toThrow('valide JSON')
  })
})
```

- [ ] **Stap 6: Draai alle tests — verwacht PASS**

```bash
npm run test lib/claude.test.ts
```

Verwacht: alle 12 tests groen.

- [ ] **Stap 7: TypeScript check**

```bash
npm run typecheck
```

Verwacht: geen errors.

- [ ] **Stap 8: Commit**

```bash
git add lib/claude.ts lib/claude.test.ts
git commit -m "feat: add Claude API wrapper with Zod schemas"
```

---

## Task 3: API Route `/api/generate`

**Files:**
- Create: `app/api/generate/route.ts`
- Create: `app/api/generate/route.test.ts`

**Interfaces:**
- Consumes: `generateContent(input: PropertyInput): Promise<ContentOutput>` uit `lib/claude.ts`
- Consumes: `PropertyInputSchema` uit `lib/claude.ts`
- Produces: `POST /api/generate` → `200 ContentOutput` | `400 { error, details }` | `500 { error }`

- [ ] **Stap 1: Schrijf de falende routetest**

Maak `app/api/generate/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/claude', () => ({
  PropertyInputSchema: {
    parse: vi.fn(),
  },
  generateContent: vi.fn(),
}))

import { POST } from './route'
import * as claudeModule from '@/lib/claude'
import { ZodError } from 'zod'

const validInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype: 'Appartement',
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1920,
  energielabel: 'C',
  vraagprijs: 450000,
  usps: 'Prachtig uitzicht',
  doelgroep: 'Jonge gezinnen',
}

const validOutput = {
  funda_tekst: 'tekst', brochure_kort: 'kort', brochure_lang: 'lang',
  instagram_emotioneel: 'em', instagram_informatief: 'inf', instagram_actie: 'act',
  linkedin_kantoor: 'knt', linkedin_makelaar: 'mak', koper_email: 'mail',
  buurtomschrijving: 'buurt',
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with content on valid input', async () => {
    vi.mocked(claudeModule.PropertyInputSchema.parse).mockReturnValue(validInput)
    vi.mocked(claudeModule.generateContent).mockResolvedValue(validOutput)

    const req = makeRequest(validInput)
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.funda_tekst).toBe('tekst')
  })

  it('returns 400 on Zod validation error', async () => {
    const zodError = new ZodError([{
      code: 'invalid_type', expected: 'string', received: 'undefined',
      path: ['adres'], message: 'Required',
    }])
    vi.mocked(claudeModule.PropertyInputSchema.parse).mockImplementation(() => { throw zodError })

    const req = makeRequest({ invalid: true })
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Ongeldige invoer')
    expect(data.details).toBeDefined()
  })

  it('returns 500 when Claude fails', async () => {
    vi.mocked(claudeModule.PropertyInputSchema.parse).mockReturnValue(validInput)
    vi.mocked(claudeModule.generateContent).mockRejectedValue(new Error('API timeout'))

    const req = makeRequest(validInput)
    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('API timeout')
  })
})
```

- [ ] **Stap 2: Draai test — verwacht FAIL**

```bash
npm run test app/api/generate/route.test.ts
```

Verwacht: "Cannot find module './route'"

- [ ] **Stap 3: Schrijf `app/api/generate/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { generateContent, PropertyInputSchema } from '@/lib/claude'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PropertyInputSchema.parse(body)
    const output = await generateContent(input)
    return NextResponse.json(output)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Ongeldige invoer', details: error.issues },
        { status: 400 },
      )
    }
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Stap 4: Draai test — verwacht PASS**

```bash
npm run test app/api/generate/route.test.ts
```

Verwacht: alle 3 tests groen.

- [ ] **Stap 5: TypeScript check**

```bash
npm run typecheck
```

Verwacht: geen errors.

- [ ] **Stap 6: Commit**

```bash
git add app/api/generate/route.ts app/api/generate/route.test.ts
git commit -m "feat: add /api/generate route with validation"
```

---

## Task 4: `PropertyForm` component

**Files:**
- Create: `components/PropertyForm.tsx`

**Interfaces:**
- Consumes: `PropertyInputSchema`, `PropertyInput` uit `@/lib/claude`
- Produces: `<PropertyForm onSubmit={fn} disabled={bool} />`
  - `onSubmit: (data: PropertyInput) => void`
  - `disabled?: boolean` — blokkeert het formulier tijdens loading

- [ ] **Stap 1: Schrijf `components/PropertyForm.tsx`**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PropertyInputSchema, type PropertyInput } from '@/lib/claude'

const WONINGSTYPES = ['Appartement', 'Tussenwoning', 'Hoekwoning', 'Vrijstaand', 'Villa', 'Penthouse'] as const
const ENERGIELABELS = ['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
const DOELGROEPEN = ['Starters', 'Jonge gezinnen', 'Senioren', 'Investeerders', 'Anders'] as const

interface PropertyFormProps {
  onSubmit: (data: PropertyInput) => void
  disabled?: boolean
}

export function PropertyForm({ onSubmit, disabled }: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PropertyInput>({
    resolver: zodResolver(PropertyInputSchema),
  })

  const doelgroepValue = watch('doelgroep')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Adres */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adres <span className="text-red-500">*</span>
        </label>
        <input
          {...register('adres')}
          disabled={disabled}
          placeholder="Herengracht 1, Amsterdam"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {errors.adres && <p className="mt-1 text-xs text-red-600">{errors.adres.message}</p>}
      </div>

      {/* Woningtype + Kamers */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Woningtype <span className="text-red-500">*</span>
          </label>
          <select
            {...register('woningtype')}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Kies type...</option>
            {WONINGSTYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.woningtype && <p className="mt-1 text-xs text-red-600">{errors.woningtype.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kamers <span className="text-red-500">*</span>
          </label>
          <input
            {...register('kamers', { valueAsNumber: true })}
            type="number"
            min={1}
            max={20}
            disabled={disabled}
            placeholder="3"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.kamers && <p className="mt-1 text-xs text-red-600">{errors.kamers.message}</p>}
        </div>
      </div>

      {/* Oppervlak + Bouwjaar */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Woonoppervlak (m²) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('oppervlak_m2', { valueAsNumber: true })}
            type="number"
            min={1}
            disabled={disabled}
            placeholder="85"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.oppervlak_m2 && <p className="mt-1 text-xs text-red-600">{errors.oppervlak_m2.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bouwjaar <span className="text-red-500">*</span>
          </label>
          <input
            {...register('bouwjaar', { valueAsNumber: true })}
            type="number"
            min={1800}
            max={2025}
            disabled={disabled}
            placeholder="1995"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.bouwjaar && <p className="mt-1 text-xs text-red-600">{errors.bouwjaar.message}</p>}
        </div>
      </div>

      {/* Energielabel + Vraagprijs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Energielabel <span className="text-red-500">*</span>
          </label>
          <select
            {...register('energielabel')}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Kies label...</option>
            {ENERGIELABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {errors.energielabel && <p className="mt-1 text-xs text-red-600">{errors.energielabel.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vraagprijs (€) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('vraagprijs', { valueAsNumber: true })}
            type="number"
            min={1}
            disabled={disabled}
            placeholder="450000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {errors.vraagprijs && <p className="mt-1 text-xs text-red-600">{errors.vraagprijs.message}</p>}
        </div>
      </div>

      {/* USP's */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          USP's <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('usps')}
          disabled={disabled}
          rows={3}
          placeholder="Bijv: gerenoveerde keuken, zonnig terras, vrij uitzicht, rustige straat, recent dak"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {errors.usps && <p className="mt-1 text-xs text-red-600">{errors.usps.message}</p>}
      </div>

      {/* Doelgroep */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Doelgroep <span className="text-red-500">*</span>
        </label>
        <select
          {...register('doelgroep')}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">Kies doelgroep...</option>
          {DOELGROEPEN.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {doelgroepValue === 'Anders' && (
          <input
            {...register('doelgroep')}
            disabled={disabled}
            placeholder="Beschrijf de doelgroep..."
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        )}
        {errors.doelgroep && <p className="mt-1 text-xs text-red-600">{errors.doelgroep.message}</p>}
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? 'Bezig met genereren...' : 'Genereer content →'}
      </button>
    </form>
  )
}
```

- [ ] **Stap 2: TypeScript check**

```bash
npm run typecheck
```

Verwacht: geen errors.

- [ ] **Stap 3: Commit**

```bash
git add components/PropertyForm.tsx
git commit -m "feat: add PropertyForm with 8-field validation"
```

---

## Task 5: `LoadingProgress` component

**Files:**
- Create: `components/LoadingProgress.tsx`

**Interfaces:**
- Produces: `<LoadingProgress />`
  - Geen props — zelfstandig component met interne timer

- [ ] **Stap 1: Schrijf `components/LoadingProgress.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'Funda-tekst schrijven', delay: 25000 },
  { label: 'Brochures opstellen', delay: 40000 },
  { label: 'Instagram-varianten maken', delay: 55000 },
  { label: 'LinkedIn-posts schrijven', delay: 65000 },
  { label: 'Koper-e-mail personaliseren', delay: 75000 },
  { label: 'Buurtomschrijving toevoegen', delay: 85000 },
]

export function LoadingProgress() {
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  useEffect(() => {
    const timers = STEPS.map((step, index) =>
      setTimeout(() => {
        setCompleted(prev => new Set([...prev, index]))
      }, step.delay),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Content wordt gegenereerd</h2>
        <p className="text-sm text-gray-500">Gemiddeld 60–90 seconden</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, index) => {
          const done = completed.has(index)
          const active = !done && (index === 0 || completed.has(index - 1))
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all ${
                done
                  ? 'bg-green-50 text-green-800'
                  : active
                  ? 'bg-blue-50 text-blue-800'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="text-base">
                {done ? '✅' : active ? '⏳' : '○'}
              </span>
              <span className={done ? 'line-through opacity-70' : ''}>{step.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: TypeScript check**

```bash
npm run typecheck
```

Verwacht: geen errors.

- [ ] **Stap 3: Commit**

```bash
git add components/LoadingProgress.tsx
git commit -m "feat: add LoadingProgress animated checklist"
```

---

## Task 6: `TabContent` + `ResultTabs` components

**Files:**
- Create: `components/TabContent.tsx`
- Create: `components/ResultTabs.tsx`

**Interfaces:**
- Consumes: `ContentOutput` uit `@/lib/claude`
- Produces: `<ResultTabs data={ContentOutput} />`

- [ ] **Stap 1: Schrijf `components/TabContent.tsx`**

```tsx
'use client'

import { useState } from 'react'

interface TabContentProps {
  label?: string
  content: string
  wordCount?: boolean
}

export function TabContent({ label, content, wordCount }: TabContentProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const words = content.trim().split(/\s+/).length

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        {label && <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>}
        <div className="flex items-center gap-3 ml-auto">
          {wordCount && (
            <span className="text-xs text-gray-400">{words} woorden</span>
          )}
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {copied ? '✓ Gekopieerd' : 'Kopieer'}
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Schrijf `components/ResultTabs.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { ContentOutput } from '@/lib/claude'
import { TabContent } from './TabContent'

type Tab = 'funda' | 'brochure' | 'instagram' | 'linkedin' | 'email' | 'buurt'

const TABS: { id: Tab; label: string }[] = [
  { id: 'funda', label: 'Funda' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'E-mail' },
  { id: 'buurt', label: 'Buurt' },
]

interface ResultTabsProps {
  data: ContentOutput
  onReset: () => void
}

export function ResultTabs({ data, onReset }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('funda')
  const [brochureVariant, setBrochureVariant] = useState<'kort' | 'lang'>('lang')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Gegenereerde content</h2>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Nieuw object
        </button>
      </div>

      {/* Tab navigatie */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'funda' && (
          <TabContent content={data.funda_tekst} wordCount />
        )}

        {activeTab === 'brochure' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['lang', 'kort'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setBrochureVariant(v)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    brochureVariant === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {v === 'lang' ? 'Lang (500+ woorden)' : 'Kort (200 woorden)'}
                </button>
              ))}
            </div>
            <TabContent
              content={brochureVariant === 'lang' ? data.brochure_lang : data.brochure_kort}
              wordCount
            />
          </div>
        )}

        {activeTab === 'instagram' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TabContent label="Emotioneel" content={data.instagram_emotioneel} />
            <TabContent label="Informatief" content={data.instagram_informatief} />
            <TabContent label="Actie" content={data.instagram_actie} />
          </div>
        )}

        {activeTab === 'linkedin' && (
          <div className="space-y-4">
            <TabContent label="Kantoor-variant" content={data.linkedin_kantoor} />
            <TabContent label="Makelaar-variant" content={data.linkedin_makelaar} />
          </div>
        )}

        {activeTab === 'email' && (
          <TabContent content={data.koper_email} />
        )}

        {activeTab === 'buurt' && (
          <TabContent content={data.buurtomschrijving} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Stap 3: TypeScript check**

```bash
npm run typecheck
```

Verwacht: geen errors.

- [ ] **Stap 4: Commit**

```bash
git add components/TabContent.tsx components/ResultTabs.tsx
git commit -m "feat: add ResultTabs and TabContent components"
```

---

## Task 7: Pagina `/object/new` — state machine + wiring

**Files:**
- Create: `app/object/new/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `<PropertyForm>`, `<LoadingProgress>`, `<ResultTabs>` uit `@/components/`
- Consumes: `PropertyInput`, `ContentOutput` uit `@/lib/claude`
- Produces: complete werkende pagina op `localhost:3000/object/new`

- [ ] **Stap 1: Maak de map aan**

```bash
mkdir -p "/Users/quinnberkouwer/Documents/AI/Claude Code/VestaAI/app/object/new"
```

- [ ] **Stap 2: Schrijf `app/object/new/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { PropertyInput, ContentOutput } from '@/lib/claude'
import { PropertyForm } from '@/components/PropertyForm'
import { LoadingProgress } from '@/components/LoadingProgress'
import { ResultTabs } from '@/components/ResultTabs'

type PageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: ContentOutput }
  | { status: 'error'; message: string }

export default function NewObjectPage() {
  const [state, setState] = useState<PageState>({ status: 'idle' })

  const handleSubmit = async (input: PropertyInput) => {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Genereren mislukt')
      setState({ status: 'success', data })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Onbekende fout',
      })
    }
  }

  const handleReset = () => setState({ status: 'idle' })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">VestaAI</h1>
          <p className="mt-2 text-gray-500">Professionele vastgoedcontent in 90 seconden.</p>
        </div>

        {/* State rendering */}
        {state.status === 'idle' && (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Object invoeren</h2>
            <PropertyForm onSubmit={handleSubmit} />
          </div>
        )}

        {state.status === 'loading' && (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <LoadingProgress />
          </div>
        )}

        {state.status === 'success' && (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
            <ResultTabs data={state.data} onReset={handleReset} />
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-red-600 mb-4">⚠️ {state.message}</p>
            <button
              onClick={handleReset}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Probeer opnieuw
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Stap 3: Update `app/page.tsx` — redirect naar `/object/new`**

Vervang de volledige inhoud van `app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/object/new')
}
```

- [ ] **Stap 4: TypeScript check**

```bash
npm run typecheck
```

Verwacht: geen errors.

- [ ] **Stap 5: Commit**

```bash
git add app/object/new/page.tsx app/page.tsx
git commit -m "feat: wire up object/new page with form/loading/results flow"
```

---

## Task 8: Smoke test + `.env.local` check

**Files:**
- geen nieuwe bestanden

**Interfaces:**
- Verifies: complete happy-path werkt op `localhost:3000`

- [ ] **Stap 1: Controleer `.env.local` aanwezig**

```bash
ls "/Users/quinnberkouwer/Documents/AI/Claude Code/VestaAI/.env.local"
```

Als het bestand niet bestaat: maak het aan op basis van `.env.example` en vul `ANTHROPIC_API_KEY` in.

- [ ] **Stap 2: Start dev server**

```bash
npm run dev
```

Verwacht: server draait op `http://localhost:3000`.

- [ ] **Stap 3: Open browser en test happy path**

1. Ga naar `http://localhost:3000` — verwacht: redirect naar `/object/new`
2. Vul alle 8 velden in met testdata:
   - Adres: `Keizersgracht 123, Amsterdam`
   - Type: `Appartement`, Kamers: `3`
   - m²: `90`, Bouwjaar: `1925`
   - Energielabel: `C`, Prijs: `550000`
   - USP's: `Gerenoveerde keuken, zonnig terras, vrij uitzicht`
   - Doelgroep: `Jonge gezinnen`
3. Klik "Genereer content →"
4. Verwacht: loading checklist verschijnt, items vinken af
5. Verwacht: na ~60–90s verschijnen 6 tabs met content
6. Test "Kopieer"-knop: plak in teksteditor — inhoud klopt
7. Test "Nieuw object": keert terug naar formulier

- [ ] **Stap 4: Test validatie**

1. Submit leeg formulier — verwacht: inline errors per veld
2. Voer bouwjaar `1700` in — verwacht: error op dat veld

- [ ] **Stap 5: Draai alle tests**

```bash
npm run test
```

Verwacht: alle tests groen.

- [ ] **Stap 6: Final typecheck**

```bash
npm run typecheck
```

Verwacht: geen errors.

- [ ] **Stap 7: Final commit**

```bash
git add -A
git commit -m "feat: VestaAI Day 1 complete — form, Claude API, 6-tab results"
```

---

## Spec Coverage Check

| Spec-requirement | Taak |
|---|---|
| 8 velden formulier | Task 4 |
| Zod-validatie input | Task 2 |
| Claude API call via `lib/claude.ts` | Task 2 |
| Zod-validatie output | Task 2 |
| Retry-logica bij ongeldige JSON | Task 2 |
| API route met maxDuration=120 | Task 3 |
| Error responses (400/500) | Task 3 |
| Geanimeerde loading checklist | Task 5 |
| 6 tabs (Funda/Brochure/Instagram/LinkedIn/Email/Buurt) | Task 6 |
| Brochure kort/lang toggle | Task 6 |
| Instagram 3 varianten naast elkaar | Task 6 |
| LinkedIn kantoor + makelaar | Task 6 |
| Kopieer-knop per tab | Task 6 |
| Wordcount op Funda-tab | Task 6 |
| State machine idle→loading→success→error | Task 7 |
| Redirect `/` → `/object/new` | Task 7 |
| "Nieuw object" reset | Task 7 |
| TypeScript strict, geen `any` | Elke taak |
| Tests voor lib + API route | Task 2, Task 3 |
