'use client'

import { useEffect, useRef, useState } from 'react'
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

  const draaiPreview = async (kantoor: string, tekst: string) => {
    setResultaat(null)
    setBezig(true)
    const p = await previewTransactieImport(kantoor, tekst)
    setPreview(p)
    setBezig(false)
  }

  const kiesBestand = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0]
    if (!bestand) return
    setBestandsnaam(bestand.name)
    setPreview(null)
    const tekst = await bestand.text()
    setCsvTekst(tekst)
    await draaiPreview(kantoorId, tekst)
  }

  // Kwaliteitsregels (met name eigen_verkoop) hangen af van het gekozen kantoor —
  // wissel je van kantoor terwijl er al een bestand geladen is, dan moet de preview
  // opnieuw tegen dát kantoor draaien voordat je "Bevestigen" kunt vertrouwen.
  useEffect(() => {
    if (csvTekst) draaiPreview(kantoorId, csvTekst)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kantoorId])

  const bevestig = async () => {
    if (!kantoorId || !csvTekst) return
    setBezig(true)
    const res = await bevestigTransactieImport(kantoorId, csvTekst, bestandsnaam)
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
          Staat er geen eigen_verkoop-kolom in, dan bepalen de kantoor-aliassen van het gekozen kantoor dit veld.
        </p>
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={kiesBestand} className="text-sm" />
        {bestandsnaam && <p className="text-xs text-gray-500 mt-1">{bestandsnaam}</p>}
      </div>

      {bezig && <p className="text-sm text-gray-500 animate-pulse">Bezig…</p>}

      {preview && !preview.ok && (
        <p className="text-sm text-red-600">{preview.error}</p>
      )}

      {preview && preview.ok && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <p className="text-gray-900">
              <strong>{preview.aantalGeldig}</strong> geldige rij{preview.aantalGeldig === 1 ? '' : 'en'}
            </p>
            <p className="text-gray-900">
              <strong>{preview.rapport.aantalEigenVerkopen}</strong> eigen verko{preview.rapport.aantalEigenVerkopen === 1 ? 'op' : 'pen'}
            </p>
            <p className="text-gray-900">
              <strong>{preview.rapport.pctMetCoordinaat}%</strong> met coördinaat
            </p>
            <p className="text-gray-900">
              <strong>{preview.rapport.totaalGeimporteerd}</strong> rij{preview.rapport.totaalGeimporteerd === 1 ? '' : 'en'} totaal na ontdubbelen
            </p>
          </div>

          {preview.rapport.perUitsluitreden.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-800 mb-1">Uitgesloten (blijven bestaan, tellen niet mee in waardering/marktanalyse):</p>
              <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
                {preview.rapport.perUitsluitreden.map(r => (
                  <li key={r.reden}>{r.label}: {r.aantal}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.rapport.overgeslagen.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700 mb-1">
                {preview.rapport.overgeslagen.length} rij{preview.rapport.overgeslagen.length === 1 ? '' : 'en'} niet geïmporteerd:
              </p>
              <ul className="text-xs text-red-600 list-disc pl-4 space-y-0.5">
                {preview.rapport.overgeslagen.slice(0, 20).map((o, i) => <li key={i}>Regel {o.regel}: {o.reden}</li>)}
                {preview.rapport.overgeslagen.length > 20 && <li className="text-red-400">…en {preview.rapport.overgeslagen.length - 20} meer</li>}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500">Herkende kolommen: {preview.gevondenKolommen.join(', ') || '—'}</p>

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
            {bezig ? 'Bezig…' : `Importeer ${preview.rapport.totaalGeimporteerd} rijen →`}
          </button>
        </div>
      )}

      {resultaat && (
        <p className={`text-sm ${resultaat.ok ? 'text-green-700' : 'text-red-600'}`}>{resultaat.bericht}</p>
      )}
    </div>
  )
}
