import { notFound } from 'next/navigation'
import { createServiceSupabaseClient } from '@/lib/supabase'
import type { Metadata } from 'next'

interface WijkRow {
  slug: string
  naam: string
  stad: string
  seo_tekst: string
  actief: boolean
}

async function getWijk(slug: string): Promise<WijkRow | null> {
  const serviceClient = createServiceSupabaseClient()
  const { data } = await serviceClient
    .from('wijken')
    .select('slug, naam, stad, seo_tekst, actief')
    .eq('slug', slug)
    .eq('actief', true)
    .single()
  return data as WijkRow | null
}

export async function generateStaticParams() {
  try {
    const serviceClient = createServiceSupabaseClient()
    const { data } = await serviceClient
      .from('wijken')
      .select('slug')
      .eq('actief', true)
    return (data ?? []).map((r: { slug: string }) => ({ slug: r.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const wijk = await getWijk(params.slug)
  if (!wijk) return { title: 'Wijk niet gevonden — VestaAI' }
  return {
    title: `${wijk.naam}, ${wijk.stad} — huizen te koop | VestaAI`,
    description: wijk.seo_tekst.slice(0, 160),
  }
}

export default async function WijkPage({ params }: { params: { slug: string } }) {
  const wijk = await getWijk(params.slug)
  if (!wijk) notFound()

  // Alinea's opsplitsen op dubbele newlines
  const alineas = wijk.seo_tekst.split(/\n{2,}/).filter(Boolean)

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <nav className="text-xs text-gray-400 mb-6">
        <a href="/" className="hover:text-gray-600">VestaAI</a>
        {' '}›{' '}
        <a href="/wijken" className="hover:text-gray-600">Wijken</a>
        {' '}›{' '}
        <span>{wijk.naam}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {wijk.naam}, {wijk.stad}
      </h1>
      <p className="text-sm text-gray-500 mb-8">Huizen te koop in {wijk.naam}</p>

      <article className="prose prose-gray max-w-none">
        {alineas.map((alinea, i) => (
          <p key={i}>{alinea}</p>
        ))}
      </article>

      <div className="mt-12 rounded-2xl bg-blue-50 border border-blue-100 p-6">
        <p className="text-sm font-semibold text-blue-900 mb-1">
          Makelaar in {wijk.naam}?
        </p>
        <p className="text-sm text-blue-700 mb-4">
          Genereer in 90 seconden professionele content voor uw woningen in {wijk.naam} met VestaAI.
        </p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Probeer gratis — 14 dagen →
        </a>
      </div>
    </main>
  )
}
