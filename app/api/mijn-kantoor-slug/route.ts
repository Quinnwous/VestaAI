import { NextResponse } from 'next/server'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

/**
 * Geeft de slug van het eigen kantoor terug voor de zojuist ingelogde
 * gebruiker (of `null`) — item 9.1. Gebruikt door `components/InlogFormulier.tsx`
 * direct ná een geslaagde login via de generieke `/login`, zodat
 * `vesta_login_slug` óók gezet wordt als iemand niet via zijn eigen
 * `/login/<slug>` binnenkwam: zo land je na de volgende keer uitloggen alsnog
 * op je eigen inlogpagina.
 *
 * Sessie-gebonden client (`createServerSupabaseClient`): RLS laat een
 * makelaar alléén zijn eigen kantoorgegevens zien, dus dit lekt nooit een
 * andere tenant. Geeft `{ slug: null }` terug — nooit een 500 — als er geen
 * sessie is, als het kantoor geen slug heeft, of als de kolom nog niet
 * bestaat (migratie 20260923_kantoren_slug.sql nog niet toegepast).
 */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ slug: null })

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ slug: null })

  const { data, error } = await supabase
    .from('makelaars')
    .select('kantoren(slug)')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ slug: null })

  const kantoor = data?.kantoren as unknown as { slug: string | null } | { slug: string | null }[] | null
  const slug = Array.isArray(kantoor) ? kantoor[0]?.slug : kantoor?.slug
  return NextResponse.json({ slug: slug ?? null })
}
