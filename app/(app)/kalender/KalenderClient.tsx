'use client'

import { useState, useMemo } from 'react'

type PlanItem = {
  id: string
  object_id: string | null
  platform: 'instagram' | 'linkedin' | 'email' | 'overig'
  content: string
  gepland_op: string
  status: 'gepland' | 'gepubliceerd' | 'geannuleerd'
  notitie: string | null
}

// Onderscheidende platform-kleuren (arbitraire hex zodat LinkedIn écht blauw
// blijft — de Tailwind `blue`-scale is projectbreed geremapt naar groen).
const PLATFORM_KLEUREN: Record<PlanItem['platform'], string> = {
  instagram: 'bg-[#F7E7EE] text-[#B25578] border-[#EBD0DC]',
  linkedin: 'bg-[#E8EEF6] text-[#4A6FA5] border-[#D5E0EE]',
  email: 'bg-[#FDF0D9] text-[#B4700C] border-[#F6E0B8]',
  overig: 'bg-[#EEF1EF] text-[#5A6B61] border-[#E2E8E4]',
}

const PLATFORM_ICOON: Record<PlanItem['platform'], string> = {
  instagram: 'IG',
  linkedin: 'LI',
  email: '✉',
  overig: '·',
}

const MAANDEN = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function getDagenInMaand(jaar: number, maand: number): Date[] {
  const eerste = new Date(jaar, maand, 1)
  const laatste = new Date(jaar, maand + 1, 0)
  const dagen: Date[] = []
  // Pad met lege cellen voor eerste dag van maand (Ma=0, Di=1, …)
  const eersteWeekdag = (eerste.getDay() + 6) % 7
  for (let i = 0; i < eersteWeekdag; i++) dagen.push(new Date(0)) // placeholder
  for (let d = 1; d <= laatste.getDate(); d++) dagen.push(new Date(jaar, maand, d))
  return dagen
}

interface Props {
  initialPlanning: PlanItem[]
}

export function KalenderClient({ initialPlanning }: Props) {
  const nu = new Date()
  const [jaar, setJaar] = useState(nu.getFullYear())
  const [maand, setMaand] = useState(nu.getMonth())
  const [planning, setPlanning] = useState<PlanItem[]>(initialPlanning)
  const [geselecteerdeDag, setGeselecteerdeDag] = useState<Date | null>(null)
  const [nieuwFormulier, setNieuwFormulier] = useState(false)
  const [formulier, setFormulier] = useState({ platform: 'instagram' as PlanItem['platform'], content: '', notitie: '', tijd: '10:00' })
  const [opslaan, setOpslaan] = useState(false)
  const [markeerStatus, setMarkeerStatus] = useState<{ id: string; bezig: boolean } | null>(null)

  const dagen = useMemo(() => getDagenInMaand(jaar, maand), [jaar, maand])

  const planningPerDag = useMemo(() => {
    const map = new Map<string, PlanItem[]>()
    for (const item of planning) {
      const key = item.gepland_op.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [planning])

  const vorigeMapand = () => {
    if (maand === 0) { setJaar(y => y - 1); setMaand(11) }
    else setMaand(m => m - 1)
    setGeselecteerdeDag(null)
  }
  const volgendeMapand = () => {
    if (maand === 11) { setJaar(y => y + 1); setMaand(0) }
    else setMaand(m => m + 1)
    setGeselecteerdeDag(null)
  }

  const dagItems = geselecteerdeDag
    ? planningPerDag.get(geselecteerdeDag.toISOString().slice(0, 10)) ?? []
    : []

  const handleNieuw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!geselecteerdeDag) return
    setOpslaan(true)
    const datumTijd = new Date(geselecteerdeDag)
    const [u, m] = formulier.tijd.split(':').map(Number)
    datumTijd.setHours(u, m, 0, 0)

    const res = await fetch('/api/planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: formulier.platform,
        content: formulier.content,
        gepland_op: datumTijd.toISOString(),
        notitie: formulier.notitie || undefined,
      }),
    })

    if (res.ok) {
      const { id } = await res.json()
      const nieuw: PlanItem = {
        id,
        object_id: null,
        platform: formulier.platform,
        content: formulier.content,
        gepland_op: datumTijd.toISOString(),
        status: 'gepland',
        notitie: formulier.notitie || null,
      }
      setPlanning(prev => [...prev, nieuw].sort((a, b) => a.gepland_op.localeCompare(b.gepland_op)))
      setNieuwFormulier(false)
      setFormulier({ platform: 'instagram', content: '', notitie: '', tijd: '10:00' })
    }
    setOpslaan(false)
  }

  const handleMarkeerGepubliceerd = async (item: PlanItem) => {
    setMarkeerStatus({ id: item.id, bezig: true })
    const nieuwStatus: PlanItem['status'] = item.status === 'gepubliceerd' ? 'gepland' : 'gepubliceerd'
    const res = await fetch(`/api/planning/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nieuwStatus }),
    })
    if (res.ok) {
      setPlanning(prev => prev.map(p => p.id === item.id ? { ...p, status: nieuwStatus } : p))
    }
    setMarkeerStatus(null)
  }

  const handleVerwijder = async (id: string) => {
    await fetch(`/api/planning/${id}`, { method: 'DELETE' })
    setPlanning(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      {/* Legenda — rechtsboven, zoals in het ontwerp */}
      <div className="flex flex-wrap justify-end gap-1.5 mb-4 text-xs">
        {(['instagram', 'linkedin', 'email', 'overig'] as const).map(p => (
          <span key={p} className={`px-2.5 py-1 rounded-full border font-semibold ${PLATFORM_KLEUREN[p]}`}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </span>
        ))}
      </div>

      <div className="grid gap-5 items-start lg:grid-cols-[1fr,340px]">
        {/* Kalender grid */}
        <div className="rounded-[18px] border border-[#E9EFEB] bg-white shadow-sm overflow-hidden">
          {/* Maand-navigatie in de kaartkop */}
          <div className="flex items-center justify-between px-4 py-[15px] border-b border-[#F1F4F2]">
            <div className="flex items-center gap-2.5">
              <button onClick={vorigeMapand} aria-label="Vorige maand" className="w-[30px] h-[30px] rounded-lg border border-[#E4EAE6] bg-white text-[#5A6B61] text-base leading-none hover:border-[#C7E6D5] transition-colors">‹</button>
              <span className="text-base font-bold text-[#0E1A13] min-w-[130px] text-center">{MAANDEN[maand]} {jaar}</span>
              <button onClick={volgendeMapand} aria-label="Volgende maand" className="w-[30px] h-[30px] rounded-lg border border-[#E4EAE6] bg-white text-[#5A6B61] text-base leading-none hover:border-[#C7E6D5] transition-colors">›</button>
            </div>
            <button
              onClick={() => { setJaar(nu.getFullYear()); setMaand(nu.getMonth()) }}
              className="text-xs font-semibold text-[#1A6B45] bg-[#EAF5EE] rounded-lg px-3 py-1.5 hover:bg-[#D5E8DD] transition-colors"
            >
              Vandaag
            </button>
          </div>

          {/* Weekdag-headers */}
          <div className="grid grid-cols-7 bg-[#F8FAF8] border-b border-[#F1F4F2]">
            {DAGEN.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-[#9AA6A0] tracking-wide uppercase">{d}</div>
            ))}
          </div>

          {/* Dag-cellen */}
          <div className="grid grid-cols-7">
            {dagen.map((dag, i) => {
              if (dag.getTime() === 0) {
                return <div key={`leeg-${i}`} className="min-h-[76px] border-b border-r border-[#F1F4F2] bg-[#FBFCFB]/40" />
              }
              const key = dag.toISOString().slice(0, 10)
              const items = planningPerDag.get(key) ?? []
              const isVandaag = dag.toDateString() === nu.toDateString()
              const isGeselecteerd = geselecteerdeDag?.toDateString() === dag.toDateString()

              return (
                <div
                  key={key}
                  onClick={() => { setGeselecteerdeDag(dag); setNieuwFormulier(false) }}
                  className={`min-h-[76px] border-b border-r border-[#F1F4F2] p-1.5 cursor-pointer transition-colors ${
                    isGeselecteerd ? 'bg-[#F1F7F3] ring-2 ring-inset ring-[#A8D4BB]' : 'hover:bg-[#F8FAF8]'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 ${
                    isVandaag ? 'bg-[#1A6B45] text-white' : 'text-[#5A6B61]'
                  }`}>
                    {dag.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        className={`text-[11px] px-1 py-0.5 rounded border truncate ${PLATFORM_KLEUREN[item.platform]} ${
                          item.status === 'gepubliceerd' ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        {PLATFORM_ICOON[item.platform]} {item.content.slice(0, 20)}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-[11px] text-[#9AA6A0] pl-1">+{items.length - 3} meer</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Zijpaneel: geselecteerde dag — altijd zichtbaar */}
        <div className="rounded-[18px] border border-[#E9EFEB] bg-white shadow-sm p-5">
          {geselecteerdeDag ? (
          <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0E1A13] capitalize">
              {geselecteerdeDag.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {!nieuwFormulier && (
              <button
                onClick={() => setNieuwFormulier(true)}
                className="text-xs font-bold rounded-lg bg-[#EAF5EE] px-3 py-1.5 text-[#1A6B45] hover:bg-[#D5E8DD] transition-colors"
              >
                + Post
              </button>
            )}
          </div>

          {/* Items van deze dag */}
          {dagItems.length === 0 && !nieuwFormulier && (
            <p className="text-sm text-[#9AA6A0] text-center py-6">Nog niets gepland op deze dag.</p>
          )}

          <div className="space-y-3">
            {dagItems.map(item => (
              <div key={item.id} className={`rounded-lg border p-3 ${PLATFORM_KLEUREN[item.platform]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide">{item.platform}</span>
                      <span className="text-xs">
                        {new Date(item.gepland_op).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.status === 'gepubliceerd' && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Gepubliceerd</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3">{item.content}</p>
                    {item.notitie && <p className="text-xs text-gray-500 mt-1 italic">{item.notitie}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleMarkeerGepubliceerd(item)}
                      disabled={markeerStatus?.id === item.id}
                      title={item.status === 'gepubliceerd' ? 'Markeer als gepland' : 'Markeer als gepubliceerd'}
                      className="text-xs px-2 py-1 rounded border border-current hover:opacity-70 transition-opacity disabled:opacity-40"
                    >
                      {item.status === 'gepubliceerd' ? '↩' : '✓'}
                    </button>
                    <button
                      onClick={() => handleVerwijder(item.id)}
                      title="Verwijder"
                      className="text-xs px-2 py-1 rounded border border-current hover:opacity-70 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nieuw-formulier */}
          {nieuwFormulier && (
            <form onSubmit={handleNieuw} className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nieuwe post plannen</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Platform</label>
                  <select
                    value={formulier.platform}
                    onChange={e => setFormulier(f => ({ ...f, platform: e.target.value as PlanItem['platform'] }))}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="email">E-mail</option>
                    <option value="overig">Overig</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tijdstip</label>
                  <input
                    type="time"
                    value={formulier.tijd}
                    onChange={e => setFormulier(f => ({ ...f, tijd: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Content</label>
                <textarea
                  value={formulier.content}
                  onChange={e => setFormulier(f => ({ ...f, content: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Plak hier uw Instagram-caption, LinkedIn-post of e-mail..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notitie (optioneel)</label>
                <input
                  type="text"
                  value={formulier.notitie}
                  onChange={e => setFormulier(f => ({ ...f, notitie: e.target.value }))}
                  placeholder="Bijv. 'Wacht op foto van stylist'"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={opslaan}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {opslaan ? 'Opslaan...' : 'Plannen'}
                </button>
                <button
                  type="button"
                  onClick={() => setNieuwFormulier(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </form>
          )}
          </>
          ) : (
            <p className="text-sm text-[#9AA6A0] text-center leading-relaxed py-10 px-2.5">
              Selecteer een dag in de kalender om posts te bekijken of in te plannen.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
