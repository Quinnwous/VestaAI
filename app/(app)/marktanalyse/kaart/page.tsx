import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { VerkoopkaartExplorer } from '@/components/VerkoopkaartExplorer'
import { haalEigenVerkopen, MET_COORDINATEN_KOLOMMEN } from '@/lib/transactiesQuery'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

export const metadata = { title: 'Verkoopkaart' }

/**
 * Verkoopkaart — volledig scherm, los van één woning (zie CLAUDE.md §
 * Hoofdstructuur). Toont alleen de eigen verkopen van het kantoor als
 * vlaggetje (besluit 16 sep 2026). Leeg totdat de transactiedataset is
 * geïmporteerd (zie /admin/transacties) — geen placeholder meer, gewoon een
 * kaart die zich vult zodra de data er is.
 */
export default async function VerkoopkaartPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()
  if (!makelaar) redirect('/login')

  const transacties = await haalEigenVerkopen<TransactieMetCoordinaten>(supabase, MET_COORDINATEN_KOLOMMEN, { metCoordinaten: true })

  return (
    <div>
      <p style={{ fontSize: 14, color: '#5C6470', margin: '0 0 20px', maxWidth: 620 }}>
        Eigen verkopen van je kantoor, met live filters op periode, type en prijs.
      </p>
      <VerkoopkaartExplorer transacties={transacties} />
    </div>
  )
}
