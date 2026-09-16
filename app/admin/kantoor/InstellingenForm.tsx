'use client'

import { useState } from 'react'
import type { KantoorInstellingen } from '@/lib/schemas'
import { slaKantoorInstellingenOp, slaKantoorNaamOpAlsAdmin } from '../actions'

/**
 * Courtage, kantoorprofiel en werkgebied — zakelijke instellingen die het
 * verkoopadvies straks voeden (besluit 16 sep 2026, zie CLAUDE.md). Los van de
 * visuele huisstijl in HuisstijlForm.tsx.
 */
export function InstellingenForm({ kantoorId, naam, instellingen }: {
  kantoorId: string
  naam: string
  instellingen: KantoorInstellingen | null
}) {
  const [kantoorNaam, setKantoorNaam] = useState(naam)
  const [percentage, setPercentage] = useState(instellingen?.courtage?.percentage?.toString() ?? '')
  const [opstartkosten, setOpstartkosten] = useState(instellingen?.courtage?.opstartkosten?.toString() ?? '')
  const [dienstverlening, setDienstverlening] = useState(instellingen?.courtage?.dienstverlening ?? '')
  const [opgericht, setOpgericht] = useState(instellingen?.profiel?.opgericht ?? '')
  const [lidmaatschappen, setLidmaatschappen] = useState(instellingen?.profiel?.lidmaatschappen ?? '')
  const [kenmerken, setKenmerken] = useState(instellingen?.profiel?.kenmerken ?? '')
  const [plaatsen, setPlaatsen] = useState((instellingen?.werkgebied?.plaatsen ?? []).join(', '))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const opslaan = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')

    const naamResult = kantoorNaam.trim() !== naam ? await slaKantoorNaamOpAlsAdmin(kantoorId, kantoorNaam) : { ok: true }

    const data: KantoorInstellingen = {
      courtage: {
        percentage: percentage ? Number(percentage) : undefined,
        opstartkosten: opstartkosten ? Number(opstartkosten) : undefined,
        dienstverlening: dienstverlening.trim() || undefined,
      },
      profiel: {
        opgericht: opgericht.trim() || undefined,
        lidmaatschappen: lidmaatschappen.trim() || undefined,
        kenmerken: kenmerken.trim() || undefined,
      },
      werkgebied: {
        plaatsen: plaatsen.split(',').map(p => p.trim()).filter(Boolean),
      },
    }
    const result = await slaKantoorInstellingenOp(kantoorId, data)
    setStatus(naamResult.ok && result.ok ? 'saved' : 'error')
    if (naamResult.ok && result.ok) setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <form onSubmit={opslaan} className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kantoornaam</label>
        <input value={kantoorNaam} onChange={e => setKantoorNaam(e.target.value)} maxLength={100} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Courtage</h3>
        <p className="text-xs text-gray-500 mb-3">Standaardtarief — staat voorgevuld in elk nieuw verkoopadvies, per advies aan te passen.</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Percentage</label>
            <input type="number" step="0.01" min={0} max={10} value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="1.25" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Opstartkosten (€)</label>
            <input type="number" min={0} value={opstartkosten} onChange={e => setOpstartkosten(e.target.value)} placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="block text-xs text-gray-500 mb-1">Wat zit er bij de dienstverlening</label>
        <textarea value={dienstverlening} onChange={e => setDienstverlening(e.target.value)} rows={3} maxLength={2000} placeholder="Bijv: fotografie, brochure, Funda-plaatsing, begeleiding bezichtigingen" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none" />
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Kantoorprofiel</h3>
        <p className="text-xs text-gray-500 mb-3">Voedt de &ldquo;over ons&rdquo;-sectie van het verkoopadvies.</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Opgericht</label>
            <input value={opgericht} onChange={e => setOpgericht(e.target.value)} placeholder="2013" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lidmaatschappen</label>
            <input value={lidmaatschappen} onChange={e => setLidmaatschappen(e.target.value)} placeholder="NVM" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="block text-xs text-gray-500 mb-1">Kenmerken</label>
        <textarea value={kenmerken} onChange={e => setKenmerken(e.target.value)} rows={3} maxLength={2000} placeholder="Bijv: 9,5 op Funda, 163 transacties per jaar, expat-specialisatie" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none" />
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Werkgebied</h3>
        <p className="text-xs text-gray-500 mb-3">Stuurt de standaardfilters van marktinzichten, kaart en referentieselectie. Komma-gescheiden.</p>
        <input value={plaatsen} onChange={e => setPlaatsen(e.target.value)} placeholder="Wassenaar, Den Haag, Leidschendam, Voorschoten, Leiden" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <button type="submit" disabled={status === 'saving'} className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {status === 'saving' ? 'Opslaan…' : status === 'saved' ? 'Opgeslagen!' : 'Instellingen opslaan'}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">Opslaan mislukt. Probeer het opnieuw.</p>}
    </form>
  )
}
