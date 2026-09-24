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
  vorigePeriodeFilter,
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

    const supabase = createServerSupabaseClient()
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
    // Zelfde werk-around als de marktanalyse-explorer (`app/(app)/marktanalyse/actions.ts`)
    // voor de "vorige periode"-bug in de RPC — zie de uitleg bij `vorigePeriodeFilter`.
    const vorigeFilter = vorigePeriodeFilter(rpcFilter)

    const [samenvattingHuidig, samenvattingVorigRuw, eigenVerkopen] = await Promise.all([
      marktanalyseSamenvatting(supabase, rpcFilter),
      vorigeFilter ? marktanalyseSamenvatting(supabase, vorigeFilter) : Promise.resolve(null),
      haalEigenVerkopen<TransactieRow>(supabase, EIGEN_VERKOOP_KOLOMMEN),
    ])
    const samenvatting = {
      huidig: samenvattingHuidig.huidig,
      vorig: samenvattingVorigRuw ? samenvattingVorigRuw.huidig : samenvattingHuidig.vorig,
    }

    if (samenvatting.huidig.n === 0) {
      return NextResponse.json({ error: 'Geen transacties in de huidige selectie — pas de filters aan.' }, { status: 400 })
    }

    // Eigen aandeel: zelfde eigen-filter als de explorer (`filterEigenRijen`), voor
    // de vorige periode de datums van `vorigeFilter` overnemen (rest van het filter
    // — plaats/type/prijs/etc. — verandert niet tussen de twee periodes).
    const eigenFilterHuidig = filterStateNaarEigenFilter(body.filter, { datumTot: dataTot.laatsteVerkoopdatum })
    const nEigenHuidig = filterEigenRijen(eigenVerkopen, eigenFilterHuidig).length
    const nEigenVorig = vorigeFilter
      ? filterEigenRijen(eigenVerkopen, { ...eigenFilterHuidig, datumVan: vorigeFilter.datum_van, datumTot: vorigeFilter.datum_tot }).length
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
