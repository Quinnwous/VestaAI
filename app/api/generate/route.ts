import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { generateContent } from '@/lib/claude'
import { PropertyInputSchema } from '@/lib/schemas'
import { createServerSupabaseClient, createServiceSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { fetchVerrijking, verrijkingNaarPrompt } from '@/lib/verrijking'
import type { HuisstijlConfig } from '@/lib/schemas'
import { CONTENT_VERGRENDELD, contentVergrendeldAntwoord } from '@/lib/features'

export const maxDuration = 300

// In-memory "in-flight"-lock per user: voorkomt dat een tweede generatie start terwijl
// de eerste nog loopt (een suite duurt minuten → dubbele generatie = dubbele kosten).
// De lock wordt in `finally` vrijgegeven; het venster moet daarom minstens de max
// generatieduur (maxDuration) dekken zodat een gelijktijdig verzoek geblokkeerd blijft.
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 300_000

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
  // Contentsuite is vergrendeld (koerswijziging sept 2026) — zie lib/features.ts.
  if (CONTENT_VERGRENDELD) return contentVergrendeldAntwoord()

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
        .select('id, kantoor_id, kantoren(huisstijl_json)')
        .eq('id', user.id)
        .single()

      if (makelaar) {
        const kantoorData = makelaar.kantoren as unknown as {
          huisstijl_json: HuisstijlConfig | null
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

        // Toegang is puur admin-beheerd (geen plan-/proeflimiet meer, zie CLAUDE.md):
        // wie een makelaar-record heeft, mag genereren.

        const tVerrijkStart = Date.now()
        const verrijking = await fetchVerrijking(input.adres, input.oppervlak_m2).catch(() => null)
        const verrijkingTekst = verrijking ? verrijkingNaarPrompt(verrijking) : undefined
        const verrijkMs = Date.now() - tVerrijkStart

        const tGenStart = Date.now()
        const output = await generateContent(input, huisstijl, undefined, verrijkingTekst)
        console.log(`[generate] verrijking ${verrijkMs}ms · generatie ${Date.now() - tGenStart}ms · kantoor ${makelaar.kantoor_id}`)

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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Ongeldige invoer', details: error.issues },
        { status: 400 },
      )
    }
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    // In-flight-lock altijd vrijgeven (succes én fout). De inline-releases hierboven
    // (cache-hit, geen toegang, limiet) zijn nu overbodig maar onschadelijk.
    if (rateLimitedUserId) releaseRateLimit(rateLimitedUserId)
  }
}
