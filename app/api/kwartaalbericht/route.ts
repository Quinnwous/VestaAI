import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { HuisstijlSchema } from '@/lib/schemas'
import { meldFout } from '@/lib/fouten'
import {
  marktanalyseSamenvatting,
  dataTotEnMet,
  haalEigenVerkopen,
} from '@/lib/transactiesQuery'
import {
  MarktanalyseFilterSchema,
  filterStateNaarTransactieFilter,
  filterStateNaarEigenFilter,
  filterEigenRijen,
} from '@/lib/marktanalyse'
import { bouwFeitenblad, bouwContextLabel } from '@/lib/kwartaalbericht'
import { schrijfKwartaalbericht } from '@/lib/claude'
import type { TransactieRow } from '@/lib/supabase'

/**
 * Kwartaalbericht (item 6.4, docs/roadmap.md § 5 Fase 6): schrijft een AI-
 * kwartaalbericht op basis van de huidige marktanalyse-selectie. Auth +
 * kantoor via de sessie-gebonden Supabase-client (RLS regelt de
 * kantoorscheiding); alle transactiedata komt uitsluitend via
 * `lib/transactiesQuery.ts` (§ 3.1, guard-test).
 *
 * Body: `{ filter: MarktanalyseFilterState, taal?: 'nl' | 'en' }` — dezelfde
 * `MarktanalyseFilterSchema` als de explorer, zodat de knop simpelweg de
 * actieve `useFilterState`-waarde meestuurt. De route herleidt zelf "data
 * t/m", de RPC-filters en het eigen aandeel server-side (nooit clientcijfers
 * vertrouwen voor iets dat straks als "feit" aan Claude wordt voorgelegd).
 */

/** Kolommen voor het eigen aandeel — zelfde set als `filterEigenRijen` nodig heeft (zie `app/(app)/marktanalyse/page.tsx`). */
const EIGEN_VERKOOP_KOLOMMEN = [
  'id', 'plaats', 'wijk', 'verkoopprijs', 'vraagprijs', 'verkoopdatum', 'looptijd_dagen',
  'woonoppervlak_m2', 'perceel_m2', 'bouwjaar', 'energielabel', 'kamers', 'garage', 'tuin',
  'woningtype_groep', 'woningtype_sub', 'prijs_m2',
] as const

const VerzoekSchema = z.object({
  filter: MarktanalyseFilterSchema,
  taal: z.enum(['nl', 'en']).default('nl'),
})

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database niet geconfigureerd' }, { status: 503 })
    }

    const body = VerzoekSchema.parse(await req.json())

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { data: makelaarRow } = await supabase
      .from('makelaars')
      .select('kantoor_id, kantoren(name, huisstijl_json)')
      .eq('id', user.id)
      .single()
    if (!makelaarRow) return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

    const kantoor = makelaarRow.kantoren as unknown as { name: string; huisstijl_json: Record<string, unknown> | null } | null
    const huisstijlGeparsed = HuisstijlSchema.safeParse(kantoor?.huisstijl_json ?? {})
    const huisstijl = huisstijlGeparsed.success ? huisstijlGeparsed.data : undefined

    const dataTot = await dataTotEnMet(supabase)
    const rpcFilter = filterStateNaarTransactieFilter(body.filter, { datumTot: dataTot.laatsteVerkoopdatum })

    // De RPC-bug die `vorig.n` op 0 hield zodra `rpcFilter` een datum_van/datum_tot
    // had, is gefixt en toegepast (`20260924_fix_marktanalyse_samenvatting_vorige_periode.sql`,
    // geverifieerd tegen productie 27 sep 2026) — één aanroep levert nu zowel
    // `.huidig` als een kloppende `.vorig` op (incl. `.van`/`.tot` voor het eigen
    // aandeel hieronder).
    const [samenvatting, eigenVerkopen] = await Promise.all([
      marktanalyseSamenvatting(supabase, rpcFilter),
      haalEigenVerkopen<TransactieRow>(supabase, EIGEN_VERKOOP_KOLOMMEN),
    ])

    if (samenvatting.huidig.n === 0) {
      return NextResponse.json({ error: 'Geen transacties in de huidige selectie — pas de filters aan.' }, { status: 400 })
    }

    // Eigen aandeel: zelfde eigen-filter als de explorer (`filterEigenRijen`), voor
    // de vorige periode de datums uit `samenvatting.vorig` overnemen (rest van het
    // filter — plaats/type/prijs/etc. — verandert niet tussen de twee periodes).
    const eigenFilterHuidig = filterStateNaarEigenFilter(body.filter, { datumTot: dataTot.laatsteVerkoopdatum })
    const nEigenHuidig = filterEigenRijen(eigenVerkopen, eigenFilterHuidig).length
    const nEigenVorig = samenvatting.vorig.van && samenvatting.vorig.tot
      ? filterEigenRijen(eigenVerkopen, { ...eigenFilterHuidig, datumVan: samenvatting.vorig.van, datumTot: samenvatting.vorig.tot }).length
      : null

    const feitenblad = bouwFeitenblad({
      samenvatting,
      dataTotEnMet: dataTot.laatsteVerkoopdatum,
      contextLabel: bouwContextLabel(body.filter),
      periodeMaanden: body.filter.periode,
      eigenAandeel: { nEigenHuidig, nEigenVorig },
    })

    const { tekst } = await schrijfKwartaalbericht(feitenblad, { taal: body.taal, kantoorNaam: kantoor?.name, huisstijl })

    return NextResponse.json({
      tekst,
      taal: body.taal,
      periodeLabel: feitenblad.periodeLabel,
      contextLabel: feitenblad.contextLabel,
      dataTotEnMet: feitenblad.dataTotEnMet,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Ongeldige invoer', details: error.issues }, { status: 400 })
    }
    const ref = meldFout('kwartaalbericht', error)
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message, ref }, { status: 500 })
  }
}
