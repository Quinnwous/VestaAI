/**
 * Kantoorbranding ophalen op basis van een URL-slug, vóór er een sessie
 * bestaat (`/login/[slug]`, item 9.1). Gebruikt de RPC `kantoor_branding_publiek`
 * (`security definer`, zie supabase/migrations/20260923_kantoren_slug.sql) die
 * uitsluitend acht publieke merkvelden teruggeeft — nooit kantoor-id, e-mail,
 * instellingen_json of de content-trainingsvelden uit huisstijl_json
 * (voorbeelden/stijlprofiel/geleerde_regels/brochure_stijl).
 *
 * Graceful in twee situaties die allebei op `null` uitkomen zonder te
 * crashen: een onbekende/foutieve slug, én de kolom/RPC die nog niet bestaat
 * omdat de migratie nog niet is toegepast (de hoofdsessie doet dat apart,
 * zie roadmap 9.1) — de aanroeper valt dan terug op de generieke /login.
 */
import { createServerSupabaseClient, isSupabaseConfigured } from './supabase'
import { bouwBranding, type Branding } from './branding'
import { normaliseerSlug, isGeldigeSlug } from './slug'

type KantoorBrandingRpcRow = {
  naam: string | null
  logo_url: string | null
  primaire_kleur: string | null
  accent_kleur: string | null
  lettertype: string | null
  vorm: string | null
  favicon_url: string | null
  achtergrond_url: string | null
  achtergrond_secundair_url: string | null
}

export async function haalKantoorBrandingOpVoorSlug(ruweSlug: string): Promise<Branding | null> {
  const slug = normaliseerSlug(ruweSlug)
  if (!isGeldigeSlug(slug) || !isSupabaseConfigured()) return null

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.rpc('kantoor_branding_publiek', { p_slug: slug })
    if (error) return null

    const row = (Array.isArray(data) ? data[0] : data) as KantoorBrandingRpcRow | undefined
    if (!row?.naam) return null

    return bouwBranding({
      name: row.naam,
      logo_url: row.logo_url,
      huisstijl_json: {
        primaire_kleur: row.primaire_kleur,
        accent_kleur: row.accent_kleur,
        lettertype: row.lettertype,
        vorm: row.vorm,
        favicon_url: row.favicon_url,
        achtergrond_url: row.achtergrond_url,
        achtergrond_secundair_url: row.achtergrond_secundair_url,
      },
    })
  } catch {
    // Kolom/RPC bestaat nog niet (migratie nog niet toegepast) of een andere
    // onverwachte fout — nooit de inlogpagina laten crashen op branding.
    return null
  }
}
