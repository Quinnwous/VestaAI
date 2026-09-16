import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  // Terug naar de homepage op het domein waar de gebruiker zit. Niet via
  // NEXT_PUBLIC_APP_URL: die wijst op Vercel naar de deploy-URL, waardoor je na
  // uitloggen op een vesta-xxx.vercel.app-adres belandde in plaats van vestaai.nl.
  return NextResponse.redirect(new URL('/', req.url))
}
