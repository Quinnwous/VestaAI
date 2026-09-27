import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { APP_URL } from '@/lib/appUrl'
import { normaliseerSlug, isGeldigeSlug } from '@/lib/slug'
import { createServiceSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { bouwBranding, bruikbaarLogo } from '@/lib/branding'
import { sendKantoorResetEmail } from '@/lib/email'
import { magResetPoging, bouwRateLimitSleutel } from '@/lib/resetRateLimit'
import { escapeIlike, wachtTot } from '@/lib/kantoorReset'

/**
 * Wachtwoord-reset vanaf de kantoorlogin (`/login/<slug>`, item 9.2,
 * docs/roadmap.md § Fase 9). Vervangt op de kantoorlogin de generieke
 * `supabase.auth.resetPasswordForEmail()` (die blijft ongewijzigd op de
 * generieke `/login`, zonder slug) omdat die geen kantoorstijl kan meesturen
 * — een reset-mail móet via een server-actie met de service-role gaan om
 * `auth.admin.generateLink()` te kunnen gebruiken én de mail zelf via Resend
 * met logo/kleuren te versturen.
 *
 * Veiligheid (geen account-enumeratie):
 * - Dit endpoint antwoordt ALTIJD `{ ok: true }` — of het e-mailadres nu wel
 *   of niet bestaat, en of het nu wel of niet bij het kantoor van deze slug
 *   hoort. Een aanvaller kan zo niet aftasten welke e-mailadressen geldig zijn.
 * - Een mail wordt alléén verstuurd als er een makelaar met dit e-mailadres
 *   bij dít kantoor (slug) hoort — anders gebeurt er stilzwijgend niets.
 * - Eenvoudige in-memory rate-limit per ip+e-mail (`lib/resetRateLimit.ts`).
 * - `redirectTo` is nooit client-invoer: hij wordt hier zelf opgebouwd uit
 *   `APP_URL` (de eigen, canonieke origin — nooit een Vercel-deploy-URL, zie
 *   `lib/appUrl.ts`) plus een `next`-parameter die enkel de al-gevalideerde
 *   slug bevat, zodat er nooit naar een externe site kan worden gewezen.
 */

const RequestSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(320),
})

/** Altijd hetzelfde antwoord — succes of niet, bestaand account of niet. */
function generiekAntwoord() {
  return NextResponse.json({ ok: true })
}


export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return generiekAntwoord()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  const slug = normaliseerSlug(parsed.data.slug)
  const email = parsed.data.email
  if (!isGeldigeSlug(slug)) {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  const start = Date.now()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'onbekend'
  if (!magResetPoging(bouwRateLimitSleutel(ip, email))) {
    // Geen enumeratie-risico: dit zegt niets over of het account bestaat,
    // alleen dat er te snel achter elkaar is aangevraagd.
    await wachtTot(start)
    return generiekAntwoord()
  }

  try {
    const service = createServiceSupabaseClient()

    const { data: kantoor } = await service
      .from('kantoren')
      .select('id, name, logo_url, huisstijl_json')
      .eq('slug', slug)
      .maybeSingle()

    if (kantoor) {
      const { data: makelaar } = await service
        .from('makelaars')
        .select('id, email')
        .eq('kantoor_id', kantoor.id)
        .ilike('email', escapeIlike(email))
        .maybeSingle()

      // Exact (hoofdletterongevoelig) hetzelfde adres, en de link gaat naar
      // het opgeslagen adres — nooit naar wat de aanvrager intypte.
      if (makelaar?.email && makelaar.email.toLowerCase() === email.toLowerCase()) {
        const redirectTo = `${APP_URL}/auth/reset-password?next=${encodeURIComponent(slug)}`
        const { data: link, error: linkError } = await service.auth.admin.generateLink({
          type: 'recovery',
          email: makelaar.email,
          options: { redirectTo },
        })

        if (linkError) {
          console.error('[kantoor-reset] generateLink mislukt:', linkError.message)
        } else if (link?.properties?.action_link) {
          const branding = bouwBranding(kantoor)
          const logoUrl = await bruikbaarLogo(branding.logoUrl)
          await sendKantoorResetEmail(makelaar.email, {
            naam: branding.naam,
            logoUrl,
            kleur: branding.primair,
            opKleur: branding.opPrimair,
            resetUrl: link.properties.action_link,
          })
        }
      }
    }
  } catch (err) {
    // Nooit de vorm van het antwoord laten afhangen van een interne fout —
    // dat zou zelf weer een enumeratie-signaal zijn.
    console.error('[kantoor-reset] onverwachte fout:', err instanceof Error ? err.message : err)
  }

  await wachtTot(start)
  return generiekAntwoord()
}
