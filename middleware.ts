import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Altijd publiek toegankelijk, geen auth-check nodig.
// Marketing- en juridische pagina's, Stripe-retourpagina's, SEO-wijkpagina's,
// de deelbare publieke objectchat, en API's die zelf hun toegang regelen
// (/api/chat + /api/chat/lead voor de embed-widget, /api/me voor PublicNav,
// /api/chatbot/* voor de publieke chatbot, /api/webhooks voor Stripe).
const PUBLIC_EXACT = new Set([
  '/', '/prijzen', '/over-ons', '/contact', '/vertrouwen',
  '/privacy', '/voorwaarden', '/betaling-gelukt', '/betaling-mislukt',
])
const PUBLIC_PREFIX = [
  '/auth/verify', '/auth/reset-password', '/api/webhooks',
  '/wijken', '/chat/', '/api/chat', '/api/chatbot', '/api/me',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Volledig publieke routes en statische assets overslaan
  if (
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIX.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Zonder Supabase (bijv. alleen API-key testen): auth overslaan
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // /login: ingelogden doorsturen naar dashboard, niet-ingelogden doorlaten
  if (pathname === '/login') {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.next()
  }

  // Overige beveiligde routes: niet ingelogd → naar login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
