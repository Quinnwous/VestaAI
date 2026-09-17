import { createServerClient } from '@supabase/ssr'
import { createClient as createBaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { HuisstijlConfig, KantoorInstellingen, ObjectFase } from './schemas'

export type { HuisstijlConfig, KantoorInstellingen, ObjectFase }

export type Kantoor = {
  id: string
  name: string
  logo_url: string | null
  huisstijl_json: HuisstijlConfig | null
  instellingen_json?: KantoorInstellingen | null
}

// `role` is een historisch veld uit de tijd van kantoor-admin/makelaar-onderscheid.
// Sinds 16 sep 2026 is er één rol per kantoor (iedereen ziet en kan hetzelfde) —
// de kolom blijft bestaan maar stuurt geen rechten meer binnen het kantoor zelf.
// Platform-admin (Quinn) is een los concept, zie lib/admin.ts.
export type Makelaar = {
  id: string
  kantoor_id: string
  name: string
  email: string
  role: 'admin' | 'makelaar'
  created_at?: string
  first_generated_at?: string | null
}

// Transactiedataset (F4, zie CLAUDE.md § Hoofdstructuur) — referentiebasis
// voor waardering en marktanalyse; alleen `eigen_verkoop` rijen krijgen een
// vlaggetje op de verkoopkaart (besluit 16 sep 2026).
export type TransactieRow = {
  id: string
  kantoor_id: string
  adres: string
  postcode: string | null
  plaats: string | null
  wijk: string | null
  buurt: string | null
  verkoopprijs: number | null
  vraagprijs: number | null
  verkoopdatum: string | null
  looptijd_dagen: number | null
  woningtype: string | null
  woonoppervlak_m2: number | null
  perceel_m2: number | null
  inhoud_m3: number | null
  bouwjaar: number | null
  energielabel: string | null
  kamers: number | null
  garage: boolean | null
  tuin: boolean | null
  buitenruimte: string | null
  eigen_verkoop: boolean
  verkopend_kantoor: string | null
  created_at: string
}

/** Zie SQL-view `transacties_met_coordinaten` — lat/lng als floats i.p.v. EWKB-hex. */
export type TransactieMetCoordinaten = TransactieRow & {
  lat: number | null
  lng: number | null
}

export type ObjectRow = {
  id: string
  kantoor_id: string
  makelaar_id: string
  address: string
  input_json: Record<string, unknown>
  outputs_json: Record<string, unknown>
  created_at: string
  status: 'draft' | 'published' | 'onder_bod' | 'verkocht'
  fase: ObjectFase
  lat: number | null
  lng: number | null
}

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export function createServiceSupabaseClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export function isSupabaseConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}
