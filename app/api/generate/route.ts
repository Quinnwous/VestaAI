import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { generateContent } from '@/lib/claude'
import { PropertyInputSchema } from '@/lib/schemas'
import { createServerSupabaseClient, createServiceSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { fetchVerrijking, verrijkingNaarPrompt } from '@/lib/verrijking'
import type { HuisstijlConfig } from '@/lib/schemas'

export const maxDuration = 180

// In-memory rate limit: 1 generate per 90 seconden per user
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 90_000

// Periodiek stale entries verwijderen (ouder dan 2× RATE_LIMIT_MS)
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_MS * 2
  rateLimitMap.forEach((ts, userId) => {
    if (ts < cutoff) rateLimitMap.delete(userId)
  })
}, 60_000)

function checkRateLimit(userId: string): boolean {
  const last = rateLimitMap.get(userId) ?? 0
  const now = Date.now()
  if (now - last < RATE_LIMIT_MS) return false
  rateLimitMap.set(userId, now)
  return true
}

function releaseRateLimit(userId: string) {
  rateLimitMap.delete(userId)
}

export async function POST(req: NextRequest) {
  let rateLimitedUserId: string | null = null

  try {
    const body = await req.json()
    const input = PropertyInputSchema.parse(body)

    let huisstijl: HuisstijlConfig | undefined
    let objectId: string | null = null

    if (isSupabaseConfigured()) {
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
      }

      if (!checkRateLimit(user.id)) {
        return NextResponse.json(
          { error: 'Nog bezig met vorige generatie. Wacht even en probeer opnieuw.' },
          { status: 429 },
        )
      }
      rateLimitedUserId = user.id

      const { data: makelaar } = await supabase
        .from('makelaars')
        .select('id, kantoor_id, kantoren(huisstijl_json, plan, trial_ends_at)')
        .eq('id', user.id)
        .single()

      if (makelaar) {
        const kantoorData = makelaar.kantoren as unknown as {
          huisstijl_json: HuisstijlConfig | null
          plan: string | null
          trial_ends_at: string | null
        } | null

        if (kantoorData?.huisstijl_json) {
          huisstijl = kantoorData.huisstijl_json
        }

        // Cache-check: zelfde invoer recent gegenereerd voor dit kantoor?
        const zeveDagenGeleden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const inputVergelijk = JSON.stringify(input)
        const { data: recenteObjecten } = await supabase
          .from('objecten')
          .select('id, outputs_json, input_json')
          .eq('kantoor_id', makelaar.kantoor_id)
          .gte('created_at', zeveDagenGeleden)
          .order('created_at', { ascending: false })
          .limit(50)
        const cachedTreffer = recenteObjecten?.find(r => JSON.stringify(r.input_json) === inputVergelijk)
        if (cachedTreffer?.outputs_json) {
          releaseRateLimit(user.id)
          return NextResponse.json({
            output: cachedTreffer.outputs_json,
            object_id: cachedTreffer.id,
            cached: true,
          })
        }

        // Limieten controleren
        const plan = kantoorData?.plan

        if (!plan) {
          // Controleer of de proefperiode is verlopen
          const trialEndsAt = kantoorData?.trial_ends_at ? new Date(kantoorData.trial_ends_at) : null
          if (trialEndsAt && trialEndsAt < new Date()) {
            return NextResponse.json(
              { error: 'Uw proefperiode is verlopen. Kies een abonnement om door te gaan.' },
              { status: 402 },
            )
          }

          // Proefperiode: max 15 objecten totaal
          const { count } = await supabase
            .from('objecten')
            .select('id', { count: 'exact', head: true })
            .eq('kantoor_id', makelaar.kantoor_id)
          const BETA_LIMIET = 15
          if ((count ?? 0) >= BETA_LIMIET) {
            return NextResponse.json(
              { error: `Limiet bereikt: u kunt maximaal ${BETA_LIMIET} objecten genereren tijdens de proefperiode. Kies een abonnement om door te gaan.` },
              { status: 402 },
            )
          }
        } else if (plan === 'starter') {
          // Starter: max 40 objecten per kalendermaand
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)
          const { count } = await supabase
            .from('objecten')
            .select('id', { count: 'exact', head: true })
            .eq('kantoor_id', makelaar.kantoor_id)
            .gte('created_at', startOfMonth.toISOString())
          const STARTER_LIMIET = 5
          if ((count ?? 0) >= STARTER_LIMIET) {
            return NextResponse.json(
              { error: `Maandlimiet bereikt: het Starter-plan staat ${STARTER_LIMIET} objecten per maand toe. Upgrade naar Pro voor onbeperkte toegang.` },
              { status: 402 },
            )
          }
        }
        // Pro en Kantoor: geen limiet

        const verrijking = await fetchVerrijking(input.adres, input.oppervlak_m2).catch(() => null)
        const verrijkingTekst = verrijking ? verrijkingNaarPrompt(verrijking) : undefined

        const output = await generateContent(input, huisstijl, undefined, verrijkingTekst)

        const serviceClient = createServiceSupabaseClient()
        const { data: savedObject } = await serviceClient
          .from('objecten')
          .insert({
            kantoor_id: makelaar.kantoor_id,
            makelaar_id: makelaar.id,
            address: input.adres,
            input_json: input,
            outputs_json: output,
          })
          .select('id')
          .single()

        objectId = savedObject?.id ?? null

        // Onboarding-meting: sla eerste generatie-tijdstip op (niet-blokkerend)
        const { data: makelaarDetails } = await supabase
          .from('makelaars')
          .select('first_generated_at')
          .eq('id', makelaar.id)
          .single()
        if (!makelaarDetails?.first_generated_at) {
          void serviceClient
            .from('makelaars')
            .update({ first_generated_at: new Date().toISOString() })
            .eq('id', makelaar.id)
        }

        return NextResponse.json({ output, object_id: objectId })
      }
    }

    // Fallback: geen Supabase of geen makelaar-record
    const verrijkingFallback = await fetchVerrijking(input.adres, input.oppervlak_m2).catch(() => null)
    const verrijkingTekstFallback = verrijkingFallback ? verrijkingNaarPrompt(verrijkingFallback) : undefined
    const output = await generateContent(input, huisstijl, undefined, verrijkingTekstFallback)
    return NextResponse.json({ output, object_id: null })

  } catch (error) {
    if (rateLimitedUserId) releaseRateLimit(rateLimitedUserId)
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
