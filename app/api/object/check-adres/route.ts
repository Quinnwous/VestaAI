import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Controleert of een adres al bestaat voor het kantoor van de ingelogde makelaar
export async function GET(req: NextRequest) {
  const adres = req.nextUrl.searchParams.get('adres')
  if (!adres || adres.length < 5) {
    return NextResponse.json({ bestaat: false })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ bestaat: false })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ bestaat: false })

  const { data } = await supabase
    .from('objecten')
    .select('id, created_at')
    .eq('kantoor_id', makelaar.kantoor_id)
    .ilike('address', `%${adres}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return NextResponse.json({ bestaat: false })
  return NextResponse.json({ bestaat: true, object_id: data.id, created_at: data.created_at })
}
