import { createServerClient } from '@supabase/ssr'
import { createClient as createBaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { HuisstijlConfig } from './schemas'

export type { HuisstijlConfig }

export type Kantoor = {
  id: string
  name: string
  plan: 'solo' | 'kantoor' | 'franchise' | null
  logo_url: string | null
  huisstijl_json: HuisstijlConfig | null
  stripe_id: string | null
  trial_ends_at: string | null
}

export type Makelaar = {
  id: string
  kantoor_id: string
  name: string
  email: string
  role: 'admin' | 'makelaar'
}

export type ObjectRow = {
  id: string
  kantoor_id: string
  makelaar_id: string
  address: string
  input_json: Record<string, unknown>
  outputs_json: Record<string, unknown>
  created_at: string
  status: 'draft' | 'published'
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
