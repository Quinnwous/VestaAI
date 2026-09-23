import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { LOGIN_SLUG_COOKIE, loginPadUitCookieWaarde } from '@/lib/loginSlugCookie'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()

  // Item 9.1: terug naar de kantoorspecifieke inlogpagina als die ooit
  // gebruikt is (cookie vesta_login_slug, gezet door components/InlogFormulier.tsx
  // bij een geslaagde login) — anders het bestaande gedrag (landingspagina).
  const bestemming = loginPadUitCookieWaarde(request.cookies.get(LOGIN_SLUG_COOKIE)?.value, '/')

  // Bewust een relatieve Location: de browser lost die op tegen het adres waar de
  // gebruiker zit. Een absolute URL ging hier twee keer mis — NEXT_PUBLIC_APP_URL en
  // `req.url` wijzen op Vercel allebei naar de interne deploy-URL, en die is
  // SSO-beveiligd, dus je kwam na uitloggen op een Vercel-inlogscherm terecht.
  // 303 hoort bij een POST die naar een GET-pagina doorstuurt.
  return new NextResponse(null, { status: 303, headers: { Location: bestemming } })
}
