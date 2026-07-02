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
