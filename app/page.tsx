import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { LandingPageClient } from '@/components/LandingPageClient'

export const metadata: Metadata = {
  title: 'VestaAI — Dé complete AI-toolkit voor makelaars',
  description:
    "Alles voor uw online woningpresentatie in één Nederlands platform: teksten, foto's, virtual staging, documenten, planning en een chatbot. Afgestemd op Funda-richtlijnen en NVM-stijlregels.",
  openGraph: {
    title: 'VestaAI — Dé complete AI-toolkit voor makelaars',
    description:
      "Alles voor uw online woningpresentatie in één Nederlands platform. Afgestemd op Funda-richtlijnen en NVM-stijlregels.",
  },
  twitter: {
    title: 'VestaAI — Dé complete AI-toolkit voor makelaars',
    description:
      "Alles voor uw online woningpresentatie in één Nederlands platform. Afgestemd op Funda-richtlijnen en NVM-stijlregels.",
  },
}

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  }

  return <LandingPageClient />
}
