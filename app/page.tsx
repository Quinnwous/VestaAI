import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { APP_URL } from '@/lib/appUrl'
import { LandingPageClient } from '@/components/LandingPageClient'

export const metadata: Metadata = {
  title: 'VestaAI — Platform voor makelaars',
  description:
    'Het platform voor Nederlandse makelaars, in de huisstijl van uw kantoor: woningwaardering, marktinzicht en concurrentieanalyse op uw eigen transactiedata, en een contentsuite voor Funda-teksten, brochures en social media.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'VestaAI — Platform voor makelaars',
    description: 'Woningwaardering, marktinzicht en een contentsuite — in de huisstijl van uw kantoor.',
  },
  twitter: {
    title: 'VestaAI — Platform voor makelaars',
    description: 'Woningwaardering, marktinzicht en een contentsuite — in de huisstijl van uw kantoor.',
  },
}

// Organization + WebSite structured data — alleen velden die echt in de codebase staan
// (geen verzonnen adres, telefoonnummer of reviews).
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'VestaAI',
      url: APP_URL,
      logo: `${APP_URL}/icon.png`,
    },
    {
      '@type': 'WebSite',
      name: 'VestaAI',
      url: APP_URL,
    },
  ],
}

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect(isPlatformAdmin(user.email) ? '/admin' : '/dashboard')
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingPageClient />
    </>
  )
}
