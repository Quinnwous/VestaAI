import type { MetadataRoute } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vestaai.nl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statisch: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${APP_URL}/prijzen`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]

  try {
    const serviceClient = createServiceSupabaseClient()
    const { data: wijken } = await serviceClient
      .from('wijken')
      .select('slug, bijgewerkt_op')
      .eq('actief', true)

    const wijkUrls: MetadataRoute.Sitemap = (wijken ?? []).map((w: { slug: string; bijgewerkt_op: string }) => ({
      url: `${APP_URL}/wijken/${w.slug}`,
      lastModified: new Date(w.bijgewerkt_op),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    return [...statisch, ...wijkUrls]
  } catch {
    return statisch
  }
}
