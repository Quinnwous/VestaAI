import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { InlogFormulier } from '@/components/InlogFormulier'
import { haalKantoorBrandingOpVoorSlug } from '@/lib/kantoorLoginBranding'

interface Props {
  params: { slug: string }
}

/**
 * Kantoorspecifieke inlogpagina (item 9.1, docs/roadmap.md fase 9): eigen
 * logo, kleuren, vormtaal, sfeerbeeld en tabbladtitel/favicon van het
 * kantoor — scène 1 van de demo ("Dit is óns platform").
 *
 * Onbekende/foutieve slug, of de migratie 20260923_kantoren_slug.sql nog niet
 * toegepast: `haalKantoorBrandingOpVoorSlug` geeft dan `null` terug en we
 * vallen terug op de generieke `/login` — nooit een kapotte pagina.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const branding = await haalKantoorBrandingOpVoorSlug(params.slug)
  if (!branding) return { title: 'Inloggen' }

  return {
    title: `Inloggen — ${branding.naam}`,
    description: `Log in op je omgeving bij ${branding.naam}.`,
    alternates: { canonical: `/login/${params.slug}` },
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  }
}

export default async function KantoorLoginPage({ params }: Props) {
  const branding = await haalKantoorBrandingOpVoorSlug(params.slug)
  if (!branding) redirect('/login')

  return <InlogFormulier branding={branding} slug={params.slug} />
}
