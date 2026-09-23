'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendFeedbackEmail } from '@/lib/email'

/**
 * Server action achter de feedbackknop (item 12.4, docs/roadmap.md § Fase
 * 12) in het avatarmenu (`components/FeedbackKnop.tsx`, gemount vanuit
 * `AppTopbar.tsx`). Niet co-locatie met één route — het avatarmenu leeft op
 * elke ingelogde pagina, dus deze actie hoort bij de (app)-route-group als
 * geheel, niet bij één specifieke pagina zoals object/[id]/actions.ts.
 *
 * Herleidt kantoornaam/makelaarsnaam/e-mail altijd zelf uit de sessie —
 * nooit vertrouwen op wat de client daarover meestuurt. Alleen `tekst` en
 * `pagina` (het pad, voor context in de mail) komen van de aanroeper.
 */

const FeedbackSchema = z.object({
  tekst: z.string().trim().min(10, 'Vertel iets meer (minimaal 10 tekens).').max(2000, 'Maximaal 2000 tekens.'),
  pagina: z.string().trim().max(300).optional().default(''),
})

// Best-effort rate limit, per warme serverless-instance (item 12.4 is bewust
// "klein" — geen aparte tabel voor iets dat schrapbaar mocht zijn). Reset bij
// een koude start, maar voorkomt binnen één instance dat een dubbelklik of
// een scriptje de platform-admin met mail bombardeert.
const LAATSTE_VERZONDEN = new Map<string, number>()
const RATE_LIMIT_MS = 60_000

export type FeedbackResultaat = { ok: true } | { ok: false; error: string }

export async function verstuurFeedback(input: { tekst: string; pagina: string }): Promise<FeedbackResultaat> {
  const parsed = FeedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer.' }
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const laatste = LAATSTE_VERZONDEN.get(user.id)
  if (laatste && Date.now() - laatste < RATE_LIMIT_MS) {
    return { ok: false, error: 'Je hebt net al feedback verstuurd — probeer het over een minuutje opnieuw.' }
  }

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('name, kantoren(name)')
    .eq('id', user.id)
    .single()
  if (!makelaar) return { ok: false, error: 'Geen rechten.' }

  const kantoor = makelaar.kantoren as unknown as { name: string } | { name: string }[] | null
  const kantoorNaam = (Array.isArray(kantoor) ? kantoor[0]?.name : kantoor?.name) ?? 'onbekend kantoor'

  // ⚠️ .env.local wijst naar productie (zie CLAUDE.md) — tijdens tests en de
  // handmatige browser-check mag dit nooit een echte mail versturen. Zet
  // FEEDBACK_SKIP_SEND=1 lokaal om alleen de UI-flow (bevestigingsstaat) te
  // controleren zonder Resend te raken.
  if (process.env.FEEDBACK_SKIP_SEND !== '1') {
    try {
      await sendFeedbackEmail({
        van: { naam: makelaar.name, email: user.email ?? 'onbekend e-mailadres' },
        kantoorNaam,
        pagina: parsed.data.pagina,
        tekst: parsed.data.tekst,
      })
    } catch (err) {
      console.error('[feedback] versturen mislukt:', err)
      return { ok: false, error: 'Versturen is niet gelukt. Probeer het later opnieuw.' }
    }
  }

  LAATSTE_VERZONDEN.set(user.id, Date.now())
  return { ok: true }
}
