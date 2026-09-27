/**
 * E2e — item 12.2 spec 7: RLS-test via REST met twee kantoren. Geen browser
 * nodig — rechtstreeks tegen PostgREST met de anon-key + een sessie-JWT, om
 * te bewijzen dat de kantoor-scheiding op databaseniveau zit (RLS +
 * `security_invoker`) en niet toevallig alleen in de UI-laag.
 *
 * Context (CLAUDE.md § Transactiedataset): dit verving in fase 0 een eerdere,
 * bewust foute inrichting die bij verificatie een live cross-tenant datalek
 * bleek (migratie `20260916213323_rls_kantoor_isolatie_transacties.sql`).
 * Deze test is de permanente regressietest voor precies dat lek — op
 * `transacties` én `objecten`, in beide richtingen (demo → i4housing en
 * andersom), zowel met een expliciet cross-kantoor filter (moet 0 rijen
 * geven) als ongefilterd (moet uitsluitend het eigen kantoor_id teruggeven).
 *
 * Puur lezend via de REST-API — geen browser, geen schrijfacties.
 */
import { test, expect } from '@playwright/test'
import {
  heeftE2eOmgeving,
  signInMetWachtwoord,
  sessieVoorEmail,
  supabaseUrl,
  kantoorIdVoorSlug,
  type LichteSessie,
} from './lib/session'

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function restRijen(tabel: string, filter: string, sessie: LichteSessie) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/${tabel}?select=id,kantoor_id&${filter}`, {
    headers: { apikey: ANON_KEY!, Authorization: `Bearer ${sessie.access_token}` },
  })
  if (!res.ok) throw new Error(`REST ${tabel}?${filter} gaf ${res.status}: ${await res.text()}`)
  return (await res.json()) as { id: string; kantoor_id: string }[]
}

test.describe('RLS-isolatie tussen kantoren (transacties + objecten)', () => {
  test.skip(!heeftE2eOmgeving() || !process.env.DEMO_PASSWORD, 'Supabase-env of DEMO_PASSWORD ontbreekt')

  let demoKantoorId: string
  let i4KantoorId: string
  let sessieDemo: LichteSessie
  let sessieI4: LichteSessie

  test.beforeAll(async () => {
    ;[demoKantoorId, i4KantoorId] = await Promise.all([
      kantoorIdVoorSlug('demo'),
      kantoorIdVoorSlug('i4housing'),
    ])
    ;[sessieDemo, sessieI4] = await Promise.all([
      signInMetWachtwoord('demo@vestaai.nl', process.env.DEMO_PASSWORD!),
      sessieVoorEmail('quinn.berkouwer@icloud.com'),
    ])
  })

  for (const tabel of ['transacties', 'objecten'] as const) {
    test(`${tabel}: demo-sessie ziet 0 rijen van i4housing (expliciet filter)`, async () => {
      const rijen = await restRijen(tabel, `kantoor_id=eq.${i4KantoorId}&limit=5`, sessieDemo)
      expect(rijen).toHaveLength(0)
    })

    test(`${tabel}: i4housing-sessie ziet 0 rijen van demo (expliciet filter)`, async () => {
      const rijen = await restRijen(tabel, `kantoor_id=eq.${demoKantoorId}&limit=5`, sessieI4)
      expect(rijen).toHaveLength(0)
    })

    test(`${tabel}: demo-sessie ziet ongefilterd uitsluitend eigen kantoor_id`, async () => {
      const rijen = await restRijen(tabel, 'limit=20', sessieDemo)
      for (const rij of rijen) {
        expect(rij.kantoor_id, `${tabel} rij ${rij.id} hoort bij een ander kantoor`).toBe(demoKantoorId)
      }
    })
  }
})
