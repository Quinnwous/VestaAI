import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ensureMakelaar } from '@/lib/ensureMakelaar'
import { verwerkNieuweKlant } from '@/lib/nieuweKlant'
import { isPlatformAdmin } from '@/lib/admin'

export type IngelogdeMakelaar = {
  userId: string
  kantoorId: string
  naam: string | null
  kantoor: { name: string; huisstijl_json: Record<string, unknown> | null } | null
}

/**
 * Gedeelde intake voor elke pagina die als eerste na inloggen bereikt kan
 * worden (`/dashboard` én `/woningen` wijzen er allebei op, zie masterplan
 * fase 1.6) — vóór fase 1.6 zat dit alleen in het toenmalige dashboard.
 * Regelt: auth-redirect, platform-admin-redirect, het self-heal-vangnet
 * (`ensureMakelaar`) en de eenmalige "nieuwe klant"-verwerking.
 *
 * @returns de makelaar-gegevens, of `null` als er (nog) geen leesbaar
 *   makelaar-record is — de aanroepende pagina toont dan de
 *   "account wordt klaargezet"-melding i.p.v. door te sturen naar /login
 *   (dat zou een oneindige redirect-loop geven).
 */
export async function haalIngelogdeMakelaarOp(): Promise<IngelogdeMakelaar | null> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Platform-admins gebruiken de app niet als klant → direct naar het beheer.
  if (isPlatformAdmin(user.email)) redirect('/admin')

  const selectMakelaar = () =>
    supabase
      .from('makelaars')
      .select('name, kantoor_id, kantoren(name, huisstijl_json, admin_notified_at)')
      .eq('id', user.id)
      .single()

  let { data: makelaar } = await selectMakelaar()

  if (!makelaar) {
    await ensureMakelaar(user)
    ;({ data: makelaar } = await selectMakelaar())
  }

  if (!makelaar) return null

  const kantoor = makelaar.kantoren as unknown as { name: string; huisstijl_json: Record<string, unknown> | null; admin_notified_at: string | null } | null

  // Eénmalige verwerking van een nieuwe klant (welkomstmail + melding aan de
  // platform-admin); atomisch geclaimd, dus nooit dubbel — ook niet als
  // /dashboard en /woningen dit allebei aanroepen.
  if (kantoor && kantoor.admin_notified_at === null) {
    await verwerkNieuweKlant(makelaar.kantoor_id)
  }

  return {
    userId: user.id,
    kantoorId: makelaar.kantoor_id,
    naam: makelaar.name,
    kantoor: kantoor ? { name: kantoor.name, huisstijl_json: kantoor.huisstijl_json } : null,
  }
}

/** Herbruikbare "account wordt klaargezet"-melding, zie haalIngelogdeMakelaarOp(). */
export function AccountWordtKlaargezet() {
  return (
    <main style={{ maxWidth: 520, margin: '80px auto', padding: '0 28px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#14181B', marginBottom: 10 }}>Account wordt klaargezet…</h1>
      <p style={{ fontSize: 14, color: '#5C6470', lineHeight: 1.6 }}>
        Je account is aangemaakt maar nog niet aan een kantoor gekoppeld. Herlaad de pagina.
        Blijft dit? Log uit en opnieuw in, of neem contact op via quinn.berkouwer@gmail.com.
      </p>
    </main>
  )
}
