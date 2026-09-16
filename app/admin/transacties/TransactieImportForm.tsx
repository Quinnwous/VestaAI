'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { previewTransactieImport, bevestigTransactieImport, type ImportPreview } from './actions'

type KantoorOptie = { id: string; name: string }

export function TransactieImportForm({ kantoren }: { kantoren: KantoorOptie[] }) {
  const router = useRouter()
  const [kantoorId, setKantoorId] = useState(kantoren[0]?.id ?? '')
  const [csvTekst, setCsvTekst] = useState('')
  const [bestandsnaam, setBestandsnaam] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [bezig, setBezig] = useState(false)
  const [resultaat, setResultaat] = useState<{ ok: boolean; bericht: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const kiesBestand = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return
    setBestandsnaam(bestand.name)
    setResultaat(null)
    setPreview(null)
    const tekst = await bestand.text()
    setCsvTekst(tekst)
    setBezig(true)
    const p = await previewTransactieImport(tekst)
    setPreview(p)
    setBezig(false)
  }

  const bevestig = async () => {
    if (!kantoorId || !csvTekst) return
    setBezig(true)
    const res = await bevestigTransactieImport(kantoorId, csvTekst)
    setBezig(false)
    if (res.ok) {
      setResultaat({ ok: true, bericht: `${res.aantal} transacties geïmporteerd/bijgewerkt.` })
      setPreview(null)
      setCsvTekst('')
      setBestandsnaam('')
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } else {
      setResultaat({ ok: false, bericht: res.error })
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kantoor</label>
        <select
          value={kantoorId}
          onChange={e => setKantoorId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          {kantoren.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CSV-bestand</label>
        <p className="text-xs text-gray-500 mb-2">
          Komma- of puntkomma-gescheiden, eerste rij = kolomnamen. Kolommen worden automatisch herkend
          (adres, postcode, plaats, lat/lng, verkoopprijs, verkoopdatum, woningtype, oppervlak, bouwjaar,
          energielabel, kamers, garage, tuin, eigen_verkoop, verkopend_kantoor) — onbekende kolommen worden genegeerd.
        </p>
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={kiesBestand} className="text-sm" />
        {bestandsnaam && <p className="text-xs text-gray-500 mt-1">{bestandsnaam}</p>}
      </div>

      {bezig && <p className="text-sm text-gray-500 animate-pulse">Bezig…</p>}

      {preview && !preview.ok && (
        <p className="text-sm text-red-600">{preview.error}</p>
      )}

      {preview && preview.ok && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
          <p className="text-sm text-gray-900">
            <strong>{preview.aantalGeldig}</strong> geldige rij{preview.aantalGeldig === 1 ? '' : 'en'}
            {preview.aantalOvergeslagen > 0 && <span className="text-amber-700"> · {preview.aantalOvergeslagen} overgeslagen</span>}
          </p>
          <p className="text-xs text-gray-500">Herkende kolommen: {preview.gevondenKolommen.join(', ') || '—'}</p>
          {preview.overgeslagen.length > 0 && (
            <ul className="text-xs text-amber-700 list-disc pl-4">
              {preview.overgeslagen.map((o, i) => <li key={i}>Regel {o.regel}: {o.reden}</li>)}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="text-xs w-full mt-2">
              <thead><tr className="text-left text-gray-500"><th className="pr-3">Adres</th><th className="pr-3">Prijs</th><th className="pr-3">Datum</th><th>Eigen</th></tr></thead>
              <tbody>
                {preview.voorbeeld.map((r, i) => (
                  <tr key={i} className="text-gray-700">
                    <td className="pr-3 py-0.5">{r.adres}</td>
                    <td className="pr-3 py-0.5">{r.verkoopprijs ?? '—'}</td>
                    <td className="pr-3 py-0.5">{r.verkoopdatum ?? '—'}</td>
                    <td className="py-0.5">{r.eigen_verkoop ? 'ja' : 'nee'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={bevestig}
            disabled={bezig || !kantoorId}
            className="mt-2 text-sm rounded-lg bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {bezig ? 'Bezig…' : `Importeer ${preview.aantalGeldig} rijen →`}
          </button>
        </div>
      )}

      {resultaat && (
        <p className={`text-sm ${resultaat.ok ? 'text-green-700' : 'text-red-600'}`}>{resultaat.bericht}</p>
      )}
    </div>
  )
}
