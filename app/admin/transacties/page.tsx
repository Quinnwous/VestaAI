import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { isPlatformAdmin } from '@/lib/admin'
import { TransactieImportForm } from './TransactieImportForm'

export const metadata = { title: 'Transacties importeren — VestaAI' }

/**
 * Importscherm voor de transactiedataset (F4, zie CLAUDE.md § Hoofdstructuur).
 * Concierge-model: Quinn importeert namens het kantoor, niet het kantoor zelf
 * (zie docs/goals.md § Bedieningsmodel). Herhaalbaar — een periodieke
 * herimport werkt als upsert, zie app/admin/transacties/actions.ts.
 */
export default async function AdminTransactiesPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user.email)) redirect('/dashboard')

  const service = createServiceSupabaseClient()
  const { data: kantoren } = await service.from('kantoren').select('id, name').order('name')

  const tellingen = new Map<string, { totaal: number; eigen: number }>()
  if (kantoren) {
    await Promise.all(kantoren.map(async k => {
      const [totaal, eigen] = await Promise.all([
        service.from('transacties').select('id', { count: 'exact', head: true }).eq('kantoor_id', k.id),
        service.from('transacties').select('id', { count: 'exact', head: true }).eq('kantoor_id', k.id).eq('eigen_verkoop', true),
      ])
      tellingen.set(k.id, { totaal: totaal.count ?? 0, eigen: eigen.count ?? 0 })
    }))
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600">← Admin</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-2 mb-1">Transacties importeren</h1>
      <p className="text-xs text-gray-400 mb-8">Voedt waardering, marktinzichten en de verkoopkaart. Alleen &ldquo;eigen verkoop&rdquo;-rijen krijgen een vlaggetje op de kaart.</p>

      <div className="mb-8 rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Kantoor</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Totaal transacties</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Waarvan eigen verkoop</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {(kantoren ?? []).map(k => (
              <tr key={k.id}>
                <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{k.name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{tellingen.get(k.id)?.totaal ?? 0}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{tellingen.get(k.id)?.eigen ?? 0}</td>
              </tr>
            ))}
            {(kantoren ?? []).length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">Nog geen kantoren</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <TransactieImportForm kantoren={(kantoren ?? []).map(k => ({ id: k.id, name: k.name }))} />
    </main>
  )
}
