import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { LandingPageClient } from '@/components/LandingPageClient'

export const metadata: Metadata = {
  title: 'VestaAI — Dé AI-toolkit voor makelaars',
  description:
    'Woningteksten, virtual staging, woningwaardering en marktinzichten in één Nederlands platform. Aangedreven door Anthropic, gekoppeld aan Kadaster en BAG.',
  openGraph: {
    title: 'VestaAI — Dé AI-toolkit voor makelaars',
    description: 'Woningteksten, virtual staging, woningwaardering en marktinzichten in één Nederlands platform.',
  },
  twitter: {
    title: 'VestaAI — Dé AI-toolkit voor makelaars',
    description: 'Woningteksten, virtual staging, woningwaardering en marktinzichten in één Nederlands platform.',
  },
}

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect(isPlatformAdmin(user.email) ? '/admin' : '/dashboard')
  }

  return <LandingPageClient />
}
