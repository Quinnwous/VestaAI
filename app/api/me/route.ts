import { NextResponse } from 'next/server'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

// Lichtgewicht auth-status voor client-componenten (bv. PublicNav), zodat marketingpagina's
// statisch blijven en niet de hele Supabase-client hoeven te bundelen.
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ingelogd: false })
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ ingelogd: !!user })
}
