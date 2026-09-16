import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()

  // Bewust een relatieve Location: de browser lost die op tegen het adres waar de
  // gebruiker zit. Een absolute URL ging hier twee keer mis — NEXT_PUBLIC_APP_URL en
  // `req.url` wijzen op Vercel allebei naar de interne deploy-URL, en die is
  // SSO-beveiligd, dus je kwam na uitloggen op een Vercel-inlogscherm terecht.
  // 303 hoort bij een POST die naar een GET-pagina doorstuurt.
  return new NextResponse(null, { status: 303, headers: { Location: '/' } })
}
