import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { LandingHero } from '@/components/LandingHero'

export const metadata: Metadata = {
  title: 'VestaAI — Woningwaardering voor makelaars',
  description:
    'Waardering en marktanalyse op basis van echte transactiedata, in de huisstijl van uw eigen kantoor. Gesloten platform voor Nederlandse makelaars.',
  openGraph: {
    title: 'VestaAI — Woningwaardering voor makelaars',
    description: 'Waardering en marktanalyse op basis van echte transactiedata, in de huisstijl van uw eigen kantoor.',
  },
  twitter: {
    title: 'VestaAI — Woningwaardering voor makelaars',
    description: 'Waardering en marktanalyse op basis van echte transactiedata, in de huisstijl van uw eigen kantoor.',
  },
}

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect(isPlatformAdmin(user.email) ? '/admin' : '/dashboard')
  }

  return <LandingHero />
}
