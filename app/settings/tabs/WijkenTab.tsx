'use client'

import { useState, useEffect } from 'react'

interface Wijk {
  slug: string
  naam: string
  stad: string
  actief: boolean
  bijgewerkt_op: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function WijkenTab() {
  const [wijken, setWijken] = useState<Wijk[]>([])
  const [laden, setLaden] = useState(true)
  const [wijk, setWijk] = useState('')
  const [stad, setStad] = useState('')
  const [genereerStatus, setGenereerStatus] = useState<'idle' | 'bezig' | 'klaar' | 'fout'>('idle')
  const [fout, setFout] = useState('')

  const laadWijken = async () => {
    const res = await fetch('/api/wijken')
    if (res.ok) {
      const json = await res.json()
      setWijken(json.wijken ?? [])
    }
    setLaden(false)
  }

  useEffect(() => { laadWijken() }, [])

  const handleGenereer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wijk.trim() || !stad.trim()) return
    setGenereerStatus('bezig')
    setFout('')

    const res = await fetch('/api/wijken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wijk: wijk.trim(), stad: stad.trim(), slug: slugify(`${wijk}-${stad}`) }),
    })
    const json = await res.json()

    if (!res.ok) {
      setFout(json.error ?? 'Genereren mislukt')
      setGenereerStatus('fout')
      return
    }
    setGenereerStatus('klaar')
    setWijk('')
    setStad('')
    await laadWijken()
    setTimeout(() => setGenereerStatus('idle'), 3000)
  }

  const handleToggle = async (slug: string, actief: boolean) => {
    await fetch('/api/wijken', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, actief: !actief }),
    })
    setWijken(prev => prev.map(w => w.slug === slug ? { ...w, actief: !actief } : w))
  }

  const handleVerwijder = async (slug: string, naam: string) => {
    if (!confirm(`Weet u zeker dat u "${naam}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    await fetch('/api/wijken', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    setWijken(prev => prev.filter(w => w.slug !== slug))
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">SEO-pagina genereren</h2>
        <p className="text-xs text-gray-500 mb-4">
          Genereer een SEO-landingspagina per wijk. Actieve pagina&apos;s zijn bereikbaar op{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">vestaai.nl/wijken/[slug]</code>.
        </p>
        <form onSubmit={handleGenereer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Wijknaam</label>
              <input
                value={wijk}
                onChange={e => setWijk(e.target.value)}
                placeholder="De Pijp"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Stad</label>
              <input
                value={stad}
                onChange={e => setStad(e.target.value)}
                placeholder="Amsterdam"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {wijk && stad && (
            <p className="text-xs text-gray-400">
              URL: <code>/wijken/{slugify(`${wijk}-${stad}`)}</code>
            </p>
          )}
          <button
            type="submit"
            disabled={genereerStatus === 'bezig'}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {genereerStatus === 'bezig'
              ? 'Genereren... (±15 sec)'
              : genereerStatus === 'klaar'
              ? 'Aangemaakt!'
              : 'Genereer pagina'}
          </button>
          {fout && <p className="text-xs text-red-600">{fout}</p>}
        </form>
      </div>

      {/* Bestaande wijken */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Wijkpagina&apos;s ({wijken.length})
        </h2>
        {laden ? (
          <p className="text-xs text-gray-400">Laden...</p>
        ) : wijken.length === 0 ? (
          <p className="text-xs text-gray-400">Nog geen wijkpagina&apos;s aangemaakt.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {wijken.map(w => (
              <div key={w.slug} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">{w.naam}, {w.stad}</p>
                  <a
                    href={`/wijken/${w.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    /wijken/{w.slug} ↗
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(w.slug, w.actief)}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                      w.actief ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    aria-label={w.actief ? 'Deactiveren' : 'Activeren'}
                  >
                    <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                      w.actief ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <button
                    onClick={() => handleVerwijder(w.slug, `${w.naam}, ${w.stad}`)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    aria-label="Verwijder wijkpagina"
                    title="Verwijder"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
