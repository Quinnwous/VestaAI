# Plan-wachtlus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De "wachten op abonnement"-lus waterdicht maken: klant krijgt een activeringsmail bij plan-toewijzing, Quinn krijgt een melding bij nieuwe registraties, `/admin` toont maandverbruik, en geen enkel codepad geeft nog per ongeluk automatische toegang — daarna alles live bewezen.

**Architecture:** Alle wijzigingen volgen bestaande patronen: mails via `lib/email.ts` (Resend, `baseTemplate`), toegangslogica als pure functies in `lib/plans.ts`, service-role-schrijfacties achter `isPlatformAdmin`. De registratiemelding hangt aan het eerste dashboard-bezoek (server component) met een atomische claim op de nieuwe kolom `kantoren.admin_notified_at`. Spec: `docs/superpowers/specs/2026-07-02-plan-wachtlus-design.md`.

**Tech Stack:** Next.js 14 (App Router) · Supabase (hosted, project `uvpcjpejocjmlxxyhqyz`) · Resend · Vitest · Playwright (alleen voor live verificatie)

## Global Constraints

- TypeScript strict mode — geen `any`.
- Copyregels: nooit "90 seconden"/specifieke generatietijden, geen "Founding Member"-taal.
- `.env.local` nooit committen. Env-varnamen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.
- Deploy = PR + merge door Quinn (harness blokkeert push naar `main` en self-merge). Vercel deployt `main` automatisch. Branch: `feat/plan-wachtlus` (bestaat al, spec-commit staat erop).
- Kwaliteitspoort per taak: `npm run typecheck` en `npm run test` groen vóór elke commit.
- Werkmap: `/Users/quinnberkouwer/Documents/AI/Claude Code/VestaAI` (alle paden hieronder relatief hieraan).
- Plan-limieten (bron `lib/plans.ts`): Starter 5 · Pro 15 · Kantoor 100 · trial/gratis = 100.
- Let op: `docs/roadmap.md` heeft al niet-gecommitte wijzigingen van eerder vandaag — bewaren, niet weggooien (zie Task 8).
- Taken 9–11 kunnen pas ná Quinns merge van de PR (natuurlijke pauze na Task 8).

## File Structure

| Bestand | Actie | Verantwoordelijkheid |
|---|---|---|
| `supabase/migrations/20260702_admin_notified_at.sql` | nieuw | Kolom + backfill voor éénmalige registratiemelding |
| `lib/plans.ts` | wijzigen | + pure transitieregel `moetActiveringsmailSturen` |
| `lib/plans.test.ts` | nieuw | Unit tests transitieregel |
| `lib/email.ts` | wijzigen | + `sendAccountGeactiveerdEmail`, + `sendNieuweKlantMelding`, − `sendWelcomeEmail`, trial-copy-fix |
| `lib/ensureMakelaar.ts` | wijzigen | Vangnet maakt aan in wachtstand (geen auto-trial, geen welkomstmail) |
| `lib/notifyNieuweKlant.ts` | nieuw | Atomische claim + melding aan platform-admin |
| `app/dashboard/page.tsx` | wijzigen | Haakpunt registratiemelding (eerste bezoek) |
| `app/admin/actions.ts` | wijzigen | Activeringsmail bij toegangs-transitie |
| `app/admin/page.tsx` | wijzigen | Maandverbruik per kantoor berekenen |
| `app/admin/AdminBeheer.tsx` | wijzigen | Kolom "Deze mnd" (verbruik / limiet) |
| `app/auth/confirm/route.ts` | verwijderen | Dood codepad dat 14 dagen trial uitdeelde |
| `middleware.ts` | wijzigen | `/auth/confirm` uit `PUBLIC_PREFIX` |
| `docs/roadmap.md` | wijzigen | Achterhaald testaccounts-item weg |

---

### Task 1: DB-migratie `admin_notified_at`

**Files:**
- Create: `supabase/migrations/20260702_admin_notified_at.sql`

**Interfaces:**
- Produces: kolom `public.kantoren.admin_notified_at timestamptz` (null = nog niet gemeld), alle bestaande rijen gebackfilld.

De migratie is puur additief: de live productiecode kent de kolom niet en heeft er geen last van. Direct toepassen is dus veilig, ook vóór de code-deploy.

- [ ] **Step 1: Schrijf het migratiebestand**

```sql
-- Eénmalige melding aan de platform-admin per kantoor ("nieuwe klant wacht op
-- activering"). Null = nog niet gemeld. Backfill: bestaande kantoren zijn al
-- bekend bij de admin en mogen nooit alsnog een melding veroorzaken.
alter table public.kantoren add column if not exists admin_notified_at timestamptz;

update public.kantoren set admin_notified_at = now() where admin_notified_at is null;
```

- [ ] **Step 2: Pas de migratie toe op productie**

Gebruik de Supabase MCP-tool `apply_migration` met `project_id: uvpcjpejocjmlxxyhqyz`, `name: admin_notified_at` en bovenstaande SQL als query.

- [ ] **Step 3: Verifieer kolom + backfill**

Via MCP `execute_sql` (zelfde project):

```sql
select count(*) as totaal,
       count(*) filter (where admin_notified_at is null) as nog_null
from public.kantoren;
```

Expected: `nog_null = 0` (en `totaal` = huidig aantal kantoren, ≥ 1).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702_admin_notified_at.sql
git commit -m "feat: kolom admin_notified_at voor eenmalige registratiemelding

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Transitieregel `moetActiveringsmailSturen` (TDD)

**Files:**
- Modify: `lib/plans.ts` (append onderaan)
- Test: `lib/plans.test.ts` (nieuw)

**Interfaces:**
- Consumes: `heeftToegang(plan: string | null, trialEndsAt: string | null): boolean` (bestaat al in `lib/plans.ts`).
- Produces: `type ToegangsStand = { plan: string | null; trialEndsAt: string | null }` en `moetActiveringsmailSturen(oud: ToegangsStand, nieuw: ToegangsStand): boolean` — gebruikt door Task 6.

- [ ] **Step 1: Schrijf de falende tests**

Maak `lib/plans.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { moetActiveringsmailSturen } from './plans'

const straks = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const verlopen = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

describe('moetActiveringsmailSturen', () => {
  it('mailt bij wachtstand → plan', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: null },
      { plan: 'pro', trialEndsAt: null },
    )).toBe(true)
  })

  it('mailt bij verlopen trial → plan', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: verlopen() },
      { plan: 'starter', trialEndsAt: verlopen() },
    )).toBe(true)
  })

  it('mailt bij wachtstand → gratis toegang (trial in de toekomst)', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: null },
      { plan: null, trialEndsAt: straks() },
    )).toBe(true)
  })

  it('mailt niet bij planwissel (had al toegang)', () => {
    expect(moetActiveringsmailSturen(
      { plan: 'pro', trialEndsAt: null },
      { plan: 'kantoor', trialEndsAt: null },
    )).toBe(false)
  })

  it('mailt niet bij lopende trial → plan (had al toegang)', () => {
    expect(moetActiveringsmailSturen(
      { plan: null, trialEndsAt: straks() },
      { plan: 'pro', trialEndsAt: straks() },
    )).toBe(false)
  })

  it('mailt niet bij intrekking (toegang → wachtstand)', () => {
    expect(moetActiveringsmailSturen(
      { plan: 'pro', trialEndsAt: null },
      { plan: null, trialEndsAt: null },
    )).toBe(false)
  })
})
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `npm run test -- lib/plans.test.ts`
Expected: FAIL — `moetActiveringsmailSturen` bestaat niet (import-fout).

- [ ] **Step 3: Implementeer de functie**

Append onderaan `lib/plans.ts`:

```ts
export type ToegangsStand = { plan: string | null; trialEndsAt: string | null }

/**
 * Activeringsmail alléén bij de overgang géén toegang → wél toegang.
 * Een planwissel (Pro → Kantoor) of een intrekking blijft stil.
 */
export function moetActiveringsmailSturen(oud: ToegangsStand, nieuw: ToegangsStand): boolean {
  return !heeftToegang(oud.plan, oud.trialEndsAt) && heeftToegang(nieuw.plan, nieuw.trialEndsAt)
}
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `npm run test -- lib/plans.test.ts`
Expected: PASS (6 tests). Daarna: `npm run typecheck` → geen fouten.

- [ ] **Step 5: Commit**

```bash
git add lib/plans.ts lib/plans.test.ts
git commit -m "feat: transitieregel voor activeringsmail (geen toegang -> toegang)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Nieuwe mailfuncties + trial-copy-fix

**Files:**
- Modify: `lib/email.ts`

**Interfaces:**
- Consumes: bestaande helpers `getResend()`, `FROM`, `APP_URL`, `baseTemplate(content)`, `btn(href, label)` in hetzelfde bestand.
- Produces: `sendAccountGeactiveerdEmail(email: string, name: string, planLabel: string): Promise<void>` (Task 6) en `sendNieuweKlantMelding(to: string[], klantNaam: string, klantEmail: string, kantoorNaam: string): Promise<void>` (Task 5).

`sendWelcomeEmail` blijft in deze taak nog staan (heeft nog call sites); verwijdering gebeurt in Task 4 samen met de call sites, zodat elke commit compileert.

- [ ] **Step 1: Voeg een escape-helper en de twee mailfuncties toe**

Append onderaan `lib/email.ts`:

```ts
/** Klantdata (naam/e-mail) komt uit registratie-invoer → escapen vóór HTML-interpolatie. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendAccountGeactiveerdEmail(email: string, name: string, planLabel: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'VestaAI — je account is geactiveerd',
    html: baseTemplate(`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">✓ Je account is geactiveerd</p>
      </div>
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Welkom, ${esc(name)}!</h2>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        Je VestaAI-account is geactiveerd met <strong>${esc(planLabel)}</strong>.
        Je kunt nu direct aan de slag: vul 8 velden in en ontvang je complete content-suite.
      </p>
      ${btn(`${APP_URL}/dashboard`, 'Ga naar je dashboard')}
      <p style="margin:28px 0 0;font-size:13px;color:#6b7280;">
        Vragen? Reageer gewoon op deze mail — ik help je graag.
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">— Quinn, VestaAI</p>
    `),
  })
}

export async function sendNieuweKlantMelding(
  to: string[],
  klantNaam: string,
  klantEmail: string,
  kantoorNaam: string,
) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'VestaAI — nieuwe klant wacht op activering',
    html: baseTemplate(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">Nieuwe klant wacht op activering</h2>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
        Er heeft zich een nieuwe klant aangemeld die nog geen abonnement heeft:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">Naam</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;">${esc(klantNaam)}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;">E-mail</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;">${esc(klantEmail)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;">Kantoor</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;">${esc(kantoorNaam)}</td>
        </tr>
      </table>
      ${btn(`${APP_URL}/admin`, 'Wijs een plan toe')}
    `),
  })
}
```

- [ ] **Step 2: Fix de verouderde limieten in de trial-waarschuwingsmail**

In `sendTrialWarningEmail` (zelfde bestand, rond regel 115 en 121):

Vervang:
```html
<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">40 objecten/maand · 1 gebruiker</p>
```
door:
```html
<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">5 objecten/maand · 1 gebruiker</p>
```

Vervang:
```html
<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Onbeperkt · 5 gebruikers · Huisstijl</p>
```
door:
```html
<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">15 objecten/maand · 5 gebruikers · Huisstijl</p>
```

- [ ] **Step 3: Kwaliteitspoort**

Run: `npm run typecheck && npm run test`
Expected: beide groen (nieuwe functies worden nog nergens gebruikt — dat is oké, Tasks 5/6 nemen ze af).

- [ ] **Step 4: Commit**

```bash
git add lib/email.ts
git commit -m "feat: activeringsmail + nieuwe-klant-melding; trial-mail limieten gelijkgetrokken

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Vangnet in wachtstand + dood trial-codepad weg

**Files:**
- Modify: `lib/ensureMakelaar.ts` (volledige vervanging, zie Step 1)
- Delete: `app/auth/confirm/route.ts`
- Modify: `middleware.ts:6`
- Modify: `lib/email.ts` (verwijder `sendWelcomeEmail`)

**Interfaces:**
- Consumes: niets nieuws.
- Produces: `ensureMakelaar(user: User): Promise<boolean>` behoudt exact dezelfde signature (aanroeper `app/dashboard/page.tsx:48` hoeft niet te wijzigen).

Context: de DB-trigger `handle_new_user()` maakt kantoren aan met `plan null / trial null` (wachtstand). Twee codepaden ondermijnden dat: het vangnet `ensureMakelaar` (365 dagen trial + verouderde "14-daagse proefperiode"-welkomstmail) en de legacy route `/auth/confirm` (14 dagen trial). Die route wordt door geen enkele mailtemplate meer gelinkt (templates wijzen naar `/auth/verify`; referral-links wijzen naar `/login?ref=`) — de enige verwijzing is de middleware-allowlist. Na deze taak heeft `sendWelcomeEmail` nul call sites en gaat dus ook weg.

- [ ] **Step 1: Vervang `lib/ensureMakelaar.ts` volledig door:**

```ts
import type { User } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'

/**
 * Zorgt dat de ingelogde gebruiker een makelaar-record (en kantoor) heeft.
 * Vangnet voor het geval de DB-trigger handle_new_user() niet liep. Maakt
 * bewust aan in de wachtstand (plan én trial null) — identiek aan de trigger:
 * toegang komt er pas als de platform-admin een plan of gratis periode toewijst.
 *
 * @returns true als er (nu) een makelaar-record bestaat.
 */
export async function ensureMakelaar(user: User): Promise<boolean> {
  // Platform-admins zijn geen klant en krijgen dus geen kantoor/makelaar-record.
  if (isPlatformAdmin(user.email)) return false

  const service = createServiceSupabaseClient()

  const { data: bestaand } = await service
    .from('makelaars')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (bestaand) return true

  const emailNaam = user.email?.split('@')[0] ?? 'Makelaar'
  const naam = emailNaam.charAt(0).toUpperCase() + emailNaam.slice(1)
  const uitgenodigdVoorKantoorId = user.user_metadata?.kantoor_id as string | undefined

  // Uitgenodigd bij een bestaand kantoor → als teamlid toevoegen.
  if (uitgenodigdVoorKantoorId) {
    const { error } = await service.from('makelaars').insert({
      id: user.id,
      kantoor_id: uitgenodigdVoorKantoorId,
      name: naam,
      email: user.email!,
      role: 'makelaar',
    })
    return !error
  }

  // Nieuw kantoor in de wachtstand aanmaken.
  const kantoorNaam = user.email?.split('@')[1]?.split('.')[0] ?? 'Kantoor'

  const { data: nieuwKantoor, error: kantoorError } = await service
    .from('kantoren')
    .insert({
      name: kantoorNaam.charAt(0).toUpperCase() + kantoorNaam.slice(1),
    })
    .select('id')
    .single()

  if (kantoorError || !nieuwKantoor) return false

  const { error: makelaarError } = await service.from('makelaars').insert({
    id: user.id,
    kantoor_id: nieuwKantoor.id,
    name: naam,
    email: user.email!,
    role: 'admin',
  })

  return !makelaarError
}
```

- [ ] **Step 2: Verwijder de legacy confirm-route en de middleware-entry**

```bash
git rm app/auth/confirm/route.ts
```

In `middleware.ts` regel 6, vervang:
```ts
const PUBLIC_PREFIX = ['/auth/confirm', '/auth/verify', '/auth/reset-password', '/api/webhooks']
```
door:
```ts
const PUBLIC_PREFIX = ['/auth/verify', '/auth/reset-password', '/api/webhooks']
```

- [ ] **Step 3: Verwijder `sendWelcomeEmail` uit `lib/email.ts`**

Controleer eerst dat er geen call sites meer zijn:

Run: `grep -rn "sendWelcomeEmail" app/ lib/ components/ --include="*.ts" --include="*.tsx"`
Expected: alleen de definitie in `lib/email.ts` (de twee call sites zijn in Step 1 en 2 verdwenen).

Verwijder daarna de volledige functie `sendWelcomeEmail` (regels 63–90 in de huidige versie: van `export async function sendWelcomeEmail` t/m de bijbehorende sluitende `}`).

- [ ] **Step 4: Kwaliteitspoort**

Run: `npm run typecheck && npm run test`
Expected: beide groen.

- [ ] **Step 5: Commit**

```bash
git add -A lib/ensureMakelaar.ts app/auth/confirm middleware.ts lib/email.ts
git commit -m "fix: geen enkel codepad geeft nog automatische toegang

- vangnet ensureMakelaar maakt aan in wachtstand (was: 365d trial + welkomstmail)
- legacy /auth/confirm verwijderd (deelde 14d trial uit; nergens meer gelinkt)
- sendWelcomeEmail weg (verouderde proefperiode-copy, geen call sites meer)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Registratiemelding bij eerste dashboard-bezoek

**Files:**
- Create: `lib/notifyNieuweKlant.ts`
- Modify: `app/dashboard/page.tsx` (regels 39, 66–69)

**Interfaces:**
- Consumes: `sendNieuweKlantMelding(to, klantNaam, klantEmail, kantoorNaam)` (Task 3), `PLATFORM_ADMIN_EMAILS: string[]` (bestaat in `lib/admin.ts`), `heeftToegang` (bestaat in `lib/plans.ts`), kolom `admin_notified_at` (Task 1).
- Produces: `meldNieuweKlantBijAdmin(kantoorId: string): Promise<void>`.

Waarom hier: de DB-trigger maakt records al bij signup aan, dus het vangnet-pad draait vrijwel nooit. Het dashboard is de gegarandeerde eerste ingelogde bestemming (de verify-pagina stuurt er automatisch heen) en laadt het kantoor toch al — één extra veld in de select volstaat. De melding wordt bewust ge-`await`: op Vercel serverless kan een losgelaten promise na de response worden afgebroken. Fouten zijn niet-fataal (try/catch in de helper).

- [ ] **Step 1: Maak `lib/notifyNieuweKlant.ts`**

```ts
import { createServiceSupabaseClient } from '@/lib/supabase'
import { PLATFORM_ADMIN_EMAILS } from '@/lib/admin'
import { heeftToegang } from '@/lib/plans'
import { sendNieuweKlantMelding } from '@/lib/email'

/**
 * Meldt een nieuwe klant éénmalig bij de platform-admin. De vlag wordt
 * atomisch geclaimd (update ... where admin_notified_at is null), dus ook bij
 * gelijktijdige bezoeken gaat er nooit meer dan één mail uit. Kantoren die al
 * toegang hebben (vooraf geactiveerd) worden stil geclaimd, zonder mail.
 * Fouten zijn bewust niet-fataal: het dashboard mag hier nooit op stuklopen.
 */
export async function meldNieuweKlantBijAdmin(kantoorId: string): Promise<void> {
  try {
    const service = createServiceSupabaseClient()

    const { data: geclaimd } = await service
      .from('kantoren')
      .update({ admin_notified_at: new Date().toISOString() })
      .eq('id', kantoorId)
      .is('admin_notified_at', null)
      .select('name, plan, trial_ends_at')
      .maybeSingle()

    if (!geclaimd) return // al gemeld (of race verloren)
    if (heeftToegang(geclaimd.plan, geclaimd.trial_ends_at)) return // vooraf geactiveerd

    const { data: lid } = await service
      .from('makelaars')
      .select('name, email')
      .eq('kantoor_id', kantoorId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    await sendNieuweKlantMelding(
      PLATFORM_ADMIN_EMAILS,
      lid?.name ?? 'Onbekend',
      lid?.email ?? 'onbekend',
      geclaimd.name,
    )
  } catch {
    // best-effort: melding mag het dashboard nooit blokkeren
  }
}
```

- [ ] **Step 2: Haak in op `app/dashboard/page.tsx`**

Voeg de import toe bij de bestaande imports (na regel 5):

```ts
import { meldNieuweKlantBijAdmin } from '@/lib/notifyNieuweKlant'
```

Breid in `selectMakelaar` (regel 39) de geneste kantoren-select uit. Vervang:
```ts
      .select('kantoor_id, first_generated_at, kantoren(plan, huisstijl_json, trial_ends_at)')
```
door:
```ts
      .select('kantoor_id, first_generated_at, kantoren(plan, huisstijl_json, trial_ends_at, admin_notified_at)')
```

Breid de cast op regel 66 uit. Vervang:
```ts
  const kantoor = makelaar.kantoren as unknown as { plan: string | null; huisstijl_json: Record<string, unknown> | null; trial_ends_at: string | null } | null
```
door:
```ts
  const kantoor = makelaar.kantoren as unknown as { plan: string | null; huisstijl_json: Record<string, unknown> | null; trial_ends_at: string | null; admin_notified_at: string | null } | null
```

Voeg direct daarna (vóór het `if (!heeftToegang(...))`-blok op regel 69) toe:

```ts
  // Eénmalige melding aan de platform-admin dat deze klant bestaat (atomisch
  // geclaimd; kantoren mét toegang worden stil geclaimd, zonder mail).
  if (kantoor && kantoor.admin_notified_at === null) {
    await meldNieuweKlantBijAdmin(makelaar.kantoor_id)
  }
```

- [ ] **Step 3: Kwaliteitspoort**

Run: `npm run typecheck && npm run test`
Expected: beide groen.

- [ ] **Step 4: Commit**

```bash
git add lib/notifyNieuweKlant.ts app/dashboard/page.tsx
git commit -m "feat: eenmalige melding aan platform-admin bij nieuwe klant

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Activeringsmail bij plan-toewijzing

**Files:**
- Modify: `app/admin/actions.ts`

**Interfaces:**
- Consumes: `moetActiveringsmailSturen`, `PLAN_LABELS` (`lib/plans.ts`), `sendAccountGeactiveerdEmail` (Task 3).
- Produces: geen nieuwe exports; `setPlan` en `grantGratisToegang` behouden hun signatures.

- [ ] **Step 1: Herschrijf `app/admin/actions.ts` volledig naar:**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { moetActiveringsmailSturen, PLAN_LABELS } from '@/lib/plans'
import { sendAccountGeactiveerdEmail } from '@/lib/email'

type Result = { ok: true } | { ok: false; error: string }

async function vereisPlatformAdmin(): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isPlatformAdmin(user?.email)
}

type Plan = 'starter' | 'pro' | 'kantoor' | null

/**
 * Mailt de kantoor-admin dat het account actief is. Een mailfout mag een
 * toewijzing nooit laten falen — daarom try/catch en geen foutpropagatie.
 */
async function stuurActiveringsmail(
  service: ReturnType<typeof createServiceSupabaseClient>,
  kantoorId: string,
  planLabel: string,
): Promise<void> {
  try {
    const { data: leden } = await service
      .from('makelaars')
      .select('name, email, role')
      .eq('kantoor_id', kantoorId)
    const ontvanger = leden?.find(l => l.role === 'admin') ?? leden?.[0]
    if (ontvanger) await sendAccountGeactiveerdEmail(ontvanger.email, ontvanger.name, planLabel)
  } catch {
    // best-effort
  }
}

export async function setPlan(kantoorId: string, plan: Plan): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()

  const { data: voor } = await service
    .from('kantoren')
    .select('plan, trial_ends_at')
    .eq('id', kantoorId)
    .single()

  const { error } = await service.from('kantoren').update({ plan }).eq('id', kantoorId)
  if (error) return { ok: false, error: error.message }

  if (voor && plan && moetActiveringsmailSturen(
    { plan: voor.plan, trialEndsAt: voor.trial_ends_at },
    { plan, trialEndsAt: voor.trial_ends_at },
  )) {
    await stuurActiveringsmail(service, kantoorId, PLAN_LABELS[plan])
  }

  revalidatePath('/admin')
  return { ok: true }
}

/** Geeft een kantoor gratis toegang: geen plan (dus ruime limiet) + lange gratis periode. */
export async function grantGratisToegang(kantoorId: string, dagen = 3650): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()

  const { data: voor } = await service
    .from('kantoren')
    .select('plan, trial_ends_at')
    .eq('id', kantoorId)
    .single()

  const trialEndsAt = new Date(Date.now() + dagen * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await service
    .from('kantoren')
    .update({ plan: null, trial_ends_at: trialEndsAt })
    .eq('id', kantoorId)
  if (error) return { ok: false, error: error.message }

  if (voor && moetActiveringsmailSturen(
    { plan: voor.plan, trialEndsAt: voor.trial_ends_at },
    { plan: null, trialEndsAt },
  )) {
    await stuurActiveringsmail(service, kantoorId, 'gratis toegang')
  }

  revalidatePath('/admin')
  return { ok: true }
}

/** Activeert/deactiveert een kantoor door alle gebruikers te (de)bannen. Omkeerbaar. */
export async function setActief(kantoorId: string, actief: boolean): Promise<Result> {
  if (!(await vereisPlatformAdmin())) return { ok: false, error: 'Geen rechten' }
  const service = createServiceSupabaseClient()
  const { data: leden, error: ledenError } = await service
    .from('makelaars')
    .select('id')
    .eq('kantoor_id', kantoorId)
  if (ledenError) return { ok: false, error: ledenError.message }

  const banDuration = actief ? 'none' : '876000h' // ~100 jaar = effectief geblokkeerd
  for (const lid of leden ?? []) {
    const { error } = await service.auth.admin.updateUserById(lid.id, { ban_duration: banDuration })
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/admin')
  return { ok: true }
}
```

Let op: `setActief` is ongewijzigd (heractiveren stuurt bewust géén mail); `stuurActiveringsmail` is niet ge-`export` (in een `'use server'`-bestand moeten alle exports server actions zijn).

- [ ] **Step 2: Kwaliteitspoort**

Run: `npm run typecheck && npm run test`
Expected: beide groen.

- [ ] **Step 3: Commit**

```bash
git add app/admin/actions.ts
git commit -m "feat: activeringsmail naar klant bij toegangs-transitie in /admin

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Kolom maandverbruik op /admin

**Files:**
- Modify: `app/admin/page.tsx` (regels 83, 101–122)
- Modify: `app/admin/AdminBeheer.tsx`

**Interfaces:**
- Consumes: `maandLimietVoor(plan)`, `heeftToegang(plan, trialEndsAt)` uit `lib/plans.ts` (client-safe, geen SDK-import).
- Produces: `KantoorRow` krijgt extra veld `objectenDezeMaand: number`.

- [ ] **Step 1: Bereken maandverbruik in `app/admin/page.tsx`**

Vervang regel 83:
```ts
    serviceClient.from('objecten').select('id, kantoor_id'),
```
door:
```ts
    serviceClient.from('objecten').select('id, kantoor_id, created_at'),
```

Vervang het telblok (regels 101–104):
```ts
  const objectenPerKantoor = new Map<string, number>()
  for (const o of (alleObjectenRes.data ?? []) as { id: string; kantoor_id: string }[]) {
    objectenPerKantoor.set(o.kantoor_id, (objectenPerKantoor.get(o.kantoor_id) ?? 0) + 1)
  }
```
door:
```ts
  const objectenPerKantoor = new Map<string, number>()
  const objectenDezeMaandPerKantoor = new Map<string, number>()
  for (const o of (alleObjectenRes.data ?? []) as { id: string; kantoor_id: string; created_at: string }[]) {
    objectenPerKantoor.set(o.kantoor_id, (objectenPerKantoor.get(o.kantoor_id) ?? 0) + 1)
    if (new Date(o.created_at) >= eersteDagMaand) {
      objectenDezeMaandPerKantoor.set(o.kantoor_id, (objectenDezeMaandPerKantoor.get(o.kantoor_id) ?? 0) + 1)
    }
  }
```

Voeg in de `beheerRows`-map (regels 106–122) het veld toe — na de regel `aantalObjecten: objectenPerKantoor.get(k.id) ?? 0,`:
```ts
      objectenDezeMaand: objectenDezeMaandPerKantoor.get(k.id) ?? 0,
```

- [ ] **Step 2: Toon de kolom in `app/admin/AdminBeheer.tsx`**

Voeg de import toe boven het component (na regel 5):
```ts
import { heeftToegang, maandLimietVoor } from '@/lib/plans'
```

Voeg in het `KantoorRow`-type (na `aantalObjecten: number`) toe:
```ts
  objectenDezeMaand: number
```

Voeg in de `<thead>` een kolomkop toe, direct ná `<th ...>Obj.</th>`:
```tsx
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Deze mnd</th>
```

Voeg in de rij-rendering een cel toe, direct ná de cel met `{row.aantalObjecten}`:
```tsx
                <td className="px-4 py-2.5 text-xs text-gray-700">
                  {heeftToegang(row.plan, row.trialEndsAt)
                    ? `${row.objectenDezeMaand} / ${maandLimietVoor(row.plan)}`
                    : '—'}
                </td>
```

Pas de lege-staat-rij aan: `colSpan={6}` → `colSpan={7}`.

- [ ] **Step 3: Kwaliteitspoort**

Run: `npm run typecheck && npm run test`
Expected: beide groen.

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.tsx app/admin/AdminBeheer.tsx
git commit -m "feat: maandverbruik vs. planlimiet per klant op /admin

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Roadmap opschonen, build-poort en PR

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Roadmap bijwerken (bestaande wijzigingen bewaren)**

Run eerst: `git diff docs/roadmap.md` — de working tree bevat al eerdere edits van vandaag (o.a. de ✅-samenvattingsregel). Die blijven staan.

Verwijder alléén dit achterhaalde bullet (de accounts zijn al verwijderd — geverifieerd in de productie-database op 2 juli):

```markdown
- **Test-accounts opruimen** — Supabase → Auth → Users: verwijder `quinn.berkouwer+klanttest / +klant2 / +klant3@gmail.com` (testrommel, geen kantoor-records).
```

Het item "Live end-to-end verifiëren (volgende sessie)" blijft staan — dat wordt pas na Task 10 verwijderd (follow-up, Task 11).

- [ ] **Step 2: Volledige kwaliteitspoort**

Run: `npm run typecheck && npm run test && npm run build`
Expected: alle drie groen. Faalt `build`, dan eerst fixen vóór de PR.

- [ ] **Step 3: Commit + push + PR aanmaken**

```bash
git add docs/roadmap.md
git commit -m "docs: achterhaald testaccounts-item van roadmap (accounts al verwijderd)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin feat/plan-wachtlus
gh pr create --title "Wachten-op-abonnement waterdicht: activeringsmail, registratiemelding, maandverbruik" --body "$(cat <<'EOF'
## Wat zit erin

- **Activeringsmail naar de klant** zodra een plan of gratis toegang wordt toegewezen in /admin (alleen bij de overgang géén toegang → wél toegang; planwissels blijven stil). Unit-getest.
- **Melding naar de platform-admin** bij het eerste dashboard-bezoek van een nieuwe klant zonder plan (atomische claim op nieuwe kolom `kantoren.admin_notified_at`; migratie incl. backfill is al toegepast).
- **Maandverbruik vs. planlimiet** per klant op /admin ("3 / 15").
- **Geen enkel codepad geeft nog automatische toegang:** vangnet `ensureMakelaar` maakt nu aan in de wachtstand (was 365 dagen trial + verouderde welkomstmail); legacy `/auth/confirm` verwijderd (deelde 14 dagen trial uit, wordt nergens meer gelinkt). NB: de referral-verwerking zat alléén in die dode route en werkte dus al niet meer via de huidige signup-flow — bewust niet herbouwd (beloning = trialverlenging, botst met het toewijs-model).
- Trial-waarschuwingsmail noemt nu de echte limieten (5 / 15 i.p.v. 40 / onbeperkt).

## Na de merge

Claude verifieert live: reset-flow (echte mail), registratie-flow (wegwerpaccount, wordt opgeruimd), melding-mail. Daarna Quinns eindtest: Pro toewijzen aan "iCloud test" → activeringsmail op iCloud → dashboard werkt.

Spec: docs/superpowers/specs/2026-07-02-plan-wachtlus-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR-URL wordt geprint.

- [ ] **Step 4: PAUZE — meld aan Quinn dat de PR klaarstaat om te mergen**

Taken 9–11 pas uitvoeren nadat de PR gemerged is (Vercel deployt `main` automatisch).

---

### Task 9: (na merge) Deploy bevestigen + reset-flow live bewijzen

**Files:**
- Create: `<scratchpad>/reset-e2e.mjs` (buiten de repo; scratchpad-pad staat in de sessie-omgeving)

**Interfaces:**
- Consumes: productie-URL `https://www.vestaai.nl`, `.env.local` (anon key), Gmail MCP-tools (`search_threads`, `get_thread`), Supabase MCP (`execute_sql`).

- [ ] **Step 1: Wacht op merge en bevestig de deploy**

Check merge-status: `gh pr view --json state,mergeCommit` → state `MERGED`.
Bevestig deploy met de verdwenen legacy route (die was publiek; na deploy vangt de middleware hem af):

Run: `curl -s -o /dev/null -w "%{redirect_url}\n" "https://www.vestaai.nl/auth/confirm?token_hash=x&type=signup"`
- Vóór deploy: redirect naar `/login?error=invalid_link` (route zelf antwoordt).
- Ná deploy: redirect naar de login-URL van de middleware zónder `error=invalid_link`.

Poll desnoods elke ~4 min tot dit klopt (Vercel-build duurt enkele minuten). Alternatief: Vercel MCP `list_deployments` → nieuwste production-deployment `READY` met de merge-sha.

- [ ] **Step 2: Vraag een echte resetmail aan**

Maak `reset-e2e.mjs` in de scratchpad:

```js
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const PROJECT = '/Users/quinnberkouwer/Documents/AI/Claude Code/VestaAI'
const env = Object.fromEntries(
  readFileSync(`${PROJECT}/.env.local`, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trimStart().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { error } = await anon.auth.resetPasswordForEmail('quinn.berkouwer@gmail.com')
console.log(error ? `FOUT: ${error.message}` : 'OK: resetmail aangevraagd')
```

Run: `cd "$PROJECT" && node <scratchpad>/reset-e2e.mjs` (project-cwd zodat `@supabase/supabase-js` uit `node_modules` resolvet).
Expected: `OK: resetmail aangevraagd`

- [ ] **Step 3: Lees de mail en controleer de link**

Gmail MCP `search_threads` met query `from:noreply@vestaai.nl newer_than:1h`, nieuwste thread → `get_thread`. Extraheer de link met patroon:
`https://vestaai.nl/auth/reset-password?token_hash=<...>&type=recovery`

Checks:
- Link bevat GÉÉN `/**` en GÉÉN ander pad-prefix.
- `curl -s -o /dev/null -L -w "%{http_code}"` op de link → `200` (via 308 naar www).

- [ ] **Step 4: Simuleer de "Ga verder"-klik**

Breid het script uit (of tweede script) met het token uit de mail:

```js
const { data, error: e2 } = await anon.auth.verifyOtp({ token_hash: TOKEN_UIT_MAIL, type: 'recovery' })
console.log(e2 ? `FOUT: ${e2.message}` : `OK: sessie voor ${data.user?.email}`)
// Bewust GEEN updateUser: wachtwoord blijft ongemoeid; dit bewijst exact wat de knop doet.
```

Expected: `OK: sessie voor quinn.berkouwer@gmail.com`. Dit verbruikt het token — Quinns eigen live klik gebeurt later met een nieuwe mail.

---

### Task 10: (na merge) Registratie-flow live bewijzen + opruimen

**Files:**
- Create: `<scratchpad>/signup-e2e.mjs`, `<scratchpad>/signup-browser.mjs`, `<scratchpad>/cleanup-e2e.mjs`

Testadres: `quinn.berkouwer+e2e@gmail.com` (plus-alias → zelfde inbox, leesbaar via Gmail MCP).

- [ ] **Step 1: Registreer via de echte flow**

`signup-e2e.mjs` (zelfde env-inlees-blok als Task 9 Step 2):

```js
const wachtwoord = `E2e-${Math.random().toString(36).slice(2, 12)}!`
console.log(`WACHTWOORD: ${wachtwoord}`) // nodig voor de browser-login in Step 3
const { data, error } = await anon.auth.signUp({
  email: 'quinn.berkouwer+e2e@gmail.com',
  password: wachtwoord,
})
console.log(error ? `FOUT: ${error.message}` : `OK: user ${data.user?.id}, sessie=${data.session ? 'JA (fout!)' : 'nee (bevestiging vereist, correct)'}`)
```

Expected: user-id geprint, sessie `nee`.

- [ ] **Step 2: Bevestig via de mail (zoals de klant)**

Gmail MCP: zoek `to:quinn.berkouwer+e2e@gmail.com newer_than:1h`, extraheer `https://vestaai.nl/auth/verify?token_hash=<...>&type=signup`. Controleer: geen `/**`. Simuleer de "Ga verder"-klik:

```js
const { data, error } = await anon.auth.verifyOtp({ token_hash: TOKEN, type: 'signup' })
console.log(error ? `FOUT: ${error.message}` : `OK: bevestigd, sessie=${!!data.session}`)
```

Expected: bevestigd, sessie `true`.

DB-check via Supabase MCP `execute_sql`:

```sql
select k.plan, k.trial_ends_at, k.admin_notified_at
from public.makelaars m join public.kantoren k on k.id = m.kantoor_id
where m.email = 'quinn.berkouwer+e2e@gmail.com';
```

Expected: `plan null`, `trial_ends_at null`, `admin_notified_at null` (nog geen dashboard-bezoek).

- [ ] **Step 3: Bezoek het dashboard als de klant (echte browser)**

`signup-browser.mjs` (Playwright zit al in het project; draai met project-cwd):

```js
// Project heeft het e2e-script `playwright test`; als het losse 'playwright'-
// pakket ontbreekt, importeer dan uit '@playwright/test' (exporteert ook chromium).
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('https://www.vestaai.nl/login')
// Generieke selectors; check bij afwijking de velden in app/login/page.tsx.
await page.locator('input[type="email"]').fill('quinn.berkouwer+e2e@gmail.com')
await page.locator('input[type="password"]').fill('WACHTWOORD_UIT_STEP_1')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/dashboard', { timeout: 20000 })
const body = await page.textContent('body')
console.log(body?.includes('nog niet geactiveerd') ? 'OK: wachtscherm zichtbaar' : `FOUT: wachtscherm ontbreekt`)
await browser.close()
```

Expected: `OK: wachtscherm zichtbaar`.

- [ ] **Step 4: Controleer claim + melding-mail**

DB (zelfde query als Step 2): `admin_notified_at` is nu GEVULD.
Gmail MCP: zoek `subject:(nieuwe klant wacht op activering) newer_than:1h` → mail aan `quinn.berkouwer@gmail.com` met naam/e-mail/kantoor van het testaccount en knop naar `/admin`.
Herlaad-check (idempotentie): draai Step 3 nogmaals → GEEN tweede melding-mail in Gmail.

- [ ] **Step 5: Ruim het testaccount volledig op**

`cleanup-e2e.mjs` (service-role):

```js
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: m } = await service.from('makelaars').select('id, kantoor_id').eq('email', 'quinn.berkouwer+e2e@gmail.com').single()
if (!m) { console.log('al weg'); process.exit(0) }
await service.from('makelaars').delete().eq('id', m.id)
await service.from('kantoren').delete().eq('id', m.kantoor_id)
const { error } = await service.auth.admin.deleteUser(m.id)
console.log(error ? `FOUT: ${error.message}` : 'OK: testaccount volledig verwijderd')
```

Verifieer via `execute_sql`:

```sql
select (select count(*) from auth.users where email = 'quinn.berkouwer+e2e@gmail.com') as users,
       (select count(*) from public.makelaars where email = 'quinn.berkouwer+e2e@gmail.com') as makelaars,
       (select count(*) from public.kantoren where name = 'Gmail' and id not in (select kantoor_id from public.makelaars)) as wees_kantoren;
```

Expected: `0, 0, 0`.

---

### Task 11: (na verificatie) Afronding

**Files:**
- Modify: `docs/roadmap.md` (nieuwe branch `chore/verificatie-afronding`)
- Modify: memory `auth-onboarding-architecture` (buiten de repo, `~/.claude/.../memory/`)

- [ ] **Step 1: Roadmap-follow-up-PR**

```bash
git checkout main && git pull && git checkout -b chore/verificatie-afronding
```

Verwijder in `docs/roadmap.md` het item "**Live end-to-end verifiëren (volgende sessie)**" (is dan gedaan). Commit + push + kleine PR (zelfde stijl als Task 8; Quinn merget).

- [ ] **Step 2: Memory bijwerken**

Werk `auth_onboarding_architecture.md` bij (bestaand memory-bestand): activeringsmail + registratiemelding + `admin_notified_at`-kolom + maandverbruik-kolom + vangnet-in-wachtstand + `/auth/confirm` verwijderd + www-redirect-observatie. Verwijder verwijzingen die niet meer kloppen (bijv. `/auth/confirm` in de middleware-lijst). Datum in de description bijwerken.

- [ ] **Step 3: Eindrapport + eindtest-instructie aan Quinn**

Rapporteer alle bewijzen (per stap: wat gedraaid, wat de output was) en geef Quinn zijn eindtest:
1. Log in met je Gmail op `www.vestaai.nl` → je komt op `/admin`.
2. Wijs bij "iCloud test" het plan **Pro** toe → binnen ~1 minuut valt "je account is geactiveerd" op je iCloud-adres.
3. Log in met je iCloud-account → dashboard is ontgrendeld; op `/admin` staat "0 / 15" bij Deze mnd.
4. Doorloop de wachtwoord-reset één keer zelf met een verse mail ("Wachtwoord vergeten" op de loginpagina).

---

## ADDENDUM v2 (2026-07-03) — proefperiode-model

Quinn draaide het toegangsmodel om (zie spec-addendum v2). Tasks 1–2 waren al uitgevoerd
en blijven geldig. Onderstaande delta's overschrijven de taakteksten hierboven; nieuwe
Tasks 7b/7c/12 komen erbij. Nummering verificatietaken blijft (9/10/11→13).

### Δ Task 3 (mails)
- `sendWelcomeEmail` **blijft bestaan** (copy klopt weer onder het proefmodel). Pas alleen
  de eerste zin aan naar: `Je 14-daagse proefperiode is actief — goed voor 5 objecten. Maak nu je eerste object aan en zie wat je AI-assistent voor je schrijft.`
- `sendNieuweKlantMelding`: onderwerp wordt `VestaAI — nieuwe klant gestart met proefperiode`,
  kop `Nieuwe klant gestart met proefperiode`, intro `Er heeft zich een nieuwe klant aangemeld; de 14-daagse proefperiode loopt:`
  knoplabel blijft `Wijs een plan toe` (kan ook tijdens de proef).
- Trial-copy-fix (5/15) ongewijzigd uitvoeren.

### Δ Task 4 (vangnet + trigger + legacy route)
- `ensureMakelaar`: nieuw kantoor krijgt **`trial_ends_at = now() + PROEF_DAGEN`** (niet null).
  Gebruik `PROEF_DAGEN` uit `lib/plans.ts` (Task 7b). Geen welkomstmail-aanroep hier (de
  claim-hook van Task 5 verstuurt hem). Insert wordt:

```ts
  const trialEndsAt = new Date(Date.now() + PROEF_DAGEN * 24 * 60 * 60 * 1000).toISOString()
  const { data: nieuwKantoor, error: kantoorError } = await service
    .from('kantoren')
    .insert({
      name: kantoorNaam.charAt(0).toUpperCase() + kantoorNaam.slice(1),
      trial_ends_at: trialEndsAt,
    })
    .select('id')
    .single()
```

- `/auth/confirm` verwijderen + middleware-edit + `sendWelcomeEmail`-import daar weg: zoals
  gepland (de route gaf een eigen, ongecontroleerde 14d-trial en is scanner-onveilig).
  `sendWelcomeEmail` zelf NIET uit `lib/email.ts` verwijderen.
- **Extra stap: migratie `supabase/migrations/20260703_trial_model.sql`** (én toepassen via
  MCP `apply_migration`, name `trial_model`):

```sql
-- Proefperiode-model: elke nieuwe gebruiker start met 14 dagen proef (5 objecten
-- totaal, afgedwongen in de app). 'gratis' wordt een echt planniveau (5/maand,
-- geen einddatum), toegewezen door de platform-admin.
alter table public.kantoren drop constraint if exists kantoren_plan_check;
alter table public.kantoren add constraint kantoren_plan_check
  check (plan = any (array['starter'::text, 'pro'::text, 'kantoor'::text, 'gratis'::text]));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_kantoor_id uuid;
begin
  if exists (select 1 from public.makelaars where id = new.id) then
    return new;
  end if;
  insert into public.kantoren (name, trial_ends_at)   -- proef: 14 dagen, plan blijft null
    values (coalesce(nullif(initcap(split_part(split_part(new.email,'@',2),'.',1)),''),'Kantoor'),
            now() + interval '14 days')
    returning id into v_kantoor_id;
  insert into public.makelaars (id, kantoor_id, name, email, role)
    values (new.id, v_kantoor_id,
            coalesce(nullif(initcap(split_part(new.email,'@',1)),''),'Makelaar'),
            new.email, 'admin');
  return new;
exception when others then
  return new; -- signup nooit blokkeren
end $function$;
```

  Verifieer daarna via `execute_sql`: `select pg_get_functiondef('public.handle_new_user'::regproc);`
  bevat `interval '14 days'`, en de constraint-def bevat `'gratis'`.

### Δ Task 5 (welkomst + melding bij eerste dashboard-bezoek)
- Bestand heet `lib/nieuweKlant.ts`, functie **`verwerkNieuweKlant(kantoorId)`**. Bij een
  gewonnen claim gaan er nu TWEE mails uit: welkomstmail naar de klant én melding naar de
  platform-admins. Geen `heeftToegang`-skip meer (nieuwe klanten hebben immers altijd een
  lopende proef). Volledige inhoud:

```ts
import { createServiceSupabaseClient } from '@/lib/supabase'
import { PLATFORM_ADMIN_EMAILS } from '@/lib/admin'
import { sendNieuweKlantMelding, sendWelcomeEmail } from '@/lib/email'

/**
 * Verwerkt een nieuwe klant éénmalig bij het eerste dashboard-bezoek: welkomst-
 * mail naar de klant + melding naar de platform-admin. De vlag wordt atomisch
 * geclaimd (update ... where admin_notified_at is null), dus ook bij gelijk-
 * tijdige bezoeken gaat er nooit meer dan één set mails uit. Fouten zijn bewust
 * niet-fataal: het dashboard mag hier nooit op stuklopen.
 */
export async function verwerkNieuweKlant(kantoorId: string): Promise<void> {
  try {
    const service = createServiceSupabaseClient()

    const { data: geclaimd } = await service
      .from('kantoren')
      .update({ admin_notified_at: new Date().toISOString() })
      .eq('id', kantoorId)
      .is('admin_notified_at', null)
      .select('name')
      .maybeSingle()

    if (!geclaimd) return // al verwerkt (of race verloren)

    const { data: lid } = await service
      .from('makelaars')
      .select('name, email')
      .eq('kantoor_id', kantoorId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    await Promise.all([
      lid ? sendWelcomeEmail(lid.email, lid.name) : Promise.resolve(),
      sendNieuweKlantMelding(
        PLATFORM_ADMIN_EMAILS,
        lid?.name ?? 'Onbekend',
        lid?.email ?? 'onbekend',
        geclaimd.name,
      ),
    ])
  } catch {
    // best-effort: mag het dashboard nooit blokkeren
  }
}
```

- Dashboard-hook: identiek aan het plan maar met `verwerkNieuweKlant` als naam/import.

### Δ Task 6 (admin-actions)
- `grantGratisToegang(kantoorId)` wijzigt van gedrag: zet **`plan = 'gratis'`,
  `trial_ends_at = null`** (parameter `dagen` vervalt). Transitiecheck met
  `moetActiveringsmailSturen({voor}, { plan: 'gratis', trialEndsAt: null })`, maillabel
  `PLAN_LABELS.gratis`. `setPlan` accepteert ook `'gratis'` via het `Plan`-type uit Task 7b
  (`type Plan = 'starter' | 'pro' | 'kantoor' | 'gratis' | null` lokaal in actions).
- `setPlan(id, null)` betekent: terug naar proef-/verlopen-status (laat `trial_ends_at`
  ongemoeid). Geen mail (transitieregel dekt dat al).

### Δ Task 7 (/admin UI)
- `PLAN_OPTIES` wordt: `[{ value: 'geen', label: 'Proef / geen' }, { value: 'gratis', label: 'Gratis (5/mnd)' }, { value: 'starter', label: 'Starter' }, { value: 'pro', label: 'Pro' }, { value: 'kantoor', label: 'Kantoor' }]`;
  de `onChange`-mapping: `'geen'` → `setPlan(row.id, null)`, anders `setPlan(row.id, v as ...)`.
  De losse knop "Gratis toegang" vervalt (de dropdown dekt het); `grantGratisToegang`-import
  vervalt in `AdminBeheer.tsx` — let op: de server action blijft bestaan voor de spec maar
  wordt door de UI niet meer gebruikt; verwijder hem dan óók uit `app/admin/actions.ts` (dode
  code) en laat de dropdown alles doen via `setPlan`.
- `statusLabel`: `plan === 'gratis'` → `{ label: 'Gratis', klasse: 'bg-green-100 text-green-700' }`;
  lopende trial → `Proef (Xd)` (amber); de oude `dagen > 90 → 'Gratis'`-hack vervalt.
- Kolom "Deze mnd": betaald plan of gratis → `x / maandLimietVoor(plan)`; lopende proef
  (plan null + trial actief) → `x / 5 (totaal)` waarbij x = `aantalObjecten` (totaal, niet
  maand); verlopen → `—`.
- `KantoorRow['plan']`-type: `'starter' | 'pro' | 'kantoor' | 'gratis' | null`.

### NIEUW Task 7b: toegangsmodel v2 in code

**Files:** Modify: `lib/plans.ts`, `lib/supabase.ts`, `app/api/generate/route.ts`,
`app/dashboard/page.tsx` (verlopen-scherm), `components/Betaalmuur.tsx`, `app/settings/tabs/AccountTab.tsx`

- [ ] Step 1: `lib/plans.ts` — voeg toe/wijzig (en laat bestaande exports staan):

```ts
export type Plan = 'starter' | 'pro' | 'kantoor' | 'gratis'

export const PLAN_MAANDLIMIET: Record<Plan, number> = {
  starter: 5,
  pro: 15,
  kantoor: 100,
  gratis: 5,
}

export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  kantoor: 'Kantoor',
  gratis: 'Gratis',
}

/** Proefperiode voor elk nieuw account. */
export const PROEF_DAGEN = 14
/** Maximum aantal objecten gedurende de hele proef (totaal, geen maandgrens). */
export const PROEF_LIMIET = 5
```

  En `maandLimietVoor`: het vangnet voor onbekend/null wordt `PROEF_LIMIET` (was
  `PLAN_MAANDLIMIET.kantoor`) — proef-accounts hebben geen maandlimiet-pad meer nodig,
  maar als iets het toch aanroept is 5 het veilige antwoord.

- [ ] Step 2: `lib/supabase.ts` — `Kantoor['plan']`-type: `'starter' | 'pro' | 'kantoor' | 'gratis' | null`.

- [ ] Step 3: `app/api/generate/route.ts` — vervang de 402-copy en de limiettelling:
  - "nog niet geactiveerd"-melding wordt: `Je proefperiode is afgelopen. Kies een abonnement om verder te gaan.`
  - Limiet-branch: bij `plan === null` (lopende proef, want heeftToegang was al true) tel
    objecten van het kantoor **zonder datumfilter** en vergelijk met `PROEF_LIMIET`; melding:
    `Proeflimiet bereikt: tijdens de proefperiode kun je ${PROEF_LIMIET} objecten aanmaken. Kies een abonnement om verder te gaan.`
    Bij een gezet plan: bestaande maandtelling met `maandLimietVoor(plan)` (dekt ook 'gratis').

- [ ] Step 4: verlopen-schermen:
  - `app/dashboard/page.tsx` (regels 76–83): kop `Je proefperiode is afgelopen`, tekst
    `Kies een abonnement om verder te gaan met VestaAI — of neem contact op als je vragen hebt.`,
    primaire knop `Kies een abonnement` → `/settings`, secundair de bestaande mailto + uitloggen.
  - `components/Betaalmuur.tsx`: zelfde copy-swap (hard: kop + tekst + knop naar `/settings`
    met dezelfde stijl; soft-banner: `Je proefperiode is afgelopen — kies een abonnement om nieuwe objecten te genereren.`).
- [ ] Step 5: `app/settings/tabs/AccountTab.tsx` — waar de checkout-knoppen voor
  starter/pro staan (regels ±202–229): voeg op beide plekken een Kantoor-knop toe naar
  `/api/stripe/checkout?plan=kantoor` in dezelfde stijl als de bestaande knoppen.
- [ ] Step 6: `npm run typecheck && npm run test` groen → commit
  `feat: proefperiode-model (14 dagen / 5 objecten) + gratis-plan + verlopen-schermen`.

### NIEUW Task 7c: uitloggen naar homepage

**Files:** Modify: `app/api/auth/logout/route.ts:8`

- [ ] `return NextResponse.redirect(new URL('/login', base))` → `new URL('/', base)`.
- [ ] `npm run typecheck` groen → commit `feat: uitloggen stuurt naar homepage`.

### Δ Task 8 (PR)
PR-tekst aanvullen met het proefperiode-model en de Stripe-activatie (Task 12). Verder gelijk.

### Δ Task 10 (registratie-verificatie)
Verwachtingen onder het nieuwe model:
- Na verify: kantoor heeft `plan null`, `trial_ends_at ≈ now()+14d`, `admin_notified_at null`.
- Browser-login → dashboard is DIRECT bruikbaar (geen wachtscherm); assert dat de tekst
  `Je proefperiode is afgelopen` NIET voorkomt en het dashboard-element wel.
- Daarna: `admin_notified_at` gevuld; welkomstmail op `+e2e`-adres ("proefperiode is actief");
  melding-mail ("nieuwe klant gestart met proefperiode") bij Quinn. Cleanup ongewijzigd.

### NIEUW Task 12: (na merge) Stripe live zetten

**Files:** geen repo-wijzigingen (extern: Stripe API + Vercel dashboard-instructie voor Quinn)

- [ ] Step 1: check key-modus zonder de key te printen:
  `grep -o '^STRIPE_SECRET_KEY=sk_[a-z]*' .env.local` → `sk_test` of `sk_live`. Rapporteer.
- [ ] Step 2: maak via de Stripe API (Node-script in scratchpad, key uit `.env.local`)
  drie producten + maandprijzen aan als ze nog niet bestaan (idempotent: eerst
  `prices.list`/`products.search` op naam):
  VestaAI Starter €60/mnd · VestaAI Pro €150/mnd · VestaAI Kantoor €500/mnd (EUR, recurring
  month, namen exact als `PLAN_NAMES` in `lib/stripe.ts`). Print de drie price IDs.
- [ ] Step 3: maak een webhook-endpoint aan: url `https://www.vestaai.nl/api/webhooks/stripe`,
  events `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`. Print het endpoint-secret (whsec_…) — alleen in het
  bericht aan Quinn, nergens in een gecommit bestand.
- [ ] Step 4: geef Quinn de exacte Vercel-env-instructie (Production):
  `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_KANTOOR`, `STRIPE_WEBHOOK_SECRET`
  (+ check dat `STRIPE_SECRET_KEY` daar al staat; zo nee, ook aanleveren als actiepunt) →
  daarna redeploy. Zet dezelfde price IDs ook in `.env.local` (niet committen).
- [ ] Step 5: smoke test na Quinns env-actie: ingelogd als testklant
  `GET /api/stripe/checkout?plan=pro` → 3xx naar `checkout.stripe.com`. GEEN echte betaling
  doorvoeren; de webhook-verwerking is codematig al aanwezig en wordt met een echte betaling
  van Quinn zelf gevalideerd zodra hij dat wil.

### Hernummering
Task 11 (afronding) wordt ná Task 12 uitgevoerd en heet verder Task 13; inhoud gelijk plus:
Stripe-status en het proefperiode-model meenemen in roadmap/memory-update.

---

## Self-review (uitgevoerd bij het schrijven)

- **Spec-dekking:** A→Task 4 · B→Tasks 2/3/6 · C→Tasks 1/3/5 · D→Tasks 3/7 · E→Task 8 · F→Tasks 9/10/11. Succescriterium 2 ("géén codepad automatische toegang") vereiste één afwijking van de spec-scope: `/auth/confirm` wordt verwijderd i.p.v. bewaard, omdat die route 14 dagen trial uitdeelt (spec-aanname "inert" bleek onjuist). Gemeld in de PR-tekst.
- **Geen placeholders:** alle stappen bevatten volledige code/commando's; de enige runtime-onbekenden (login-selectors, token uit mail) zijn expliciet gemarkeerd met waar ze vandaan komen.
- **Typeconsistentie:** `moetActiveringsmailSturen(oud, nieuw)` met `ToegangsStand` overal gelijk; `sendNieuweKlantMelding(to: string[], klantNaam, klantEmail, kantoorNaam)` in Task 3 = aanroep in Task 5; `KantoorRow.objectenDezeMaand` in Task 7 in zowel page als component.
