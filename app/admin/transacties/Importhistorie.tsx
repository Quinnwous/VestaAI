'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { datumTijd } from '@/lib/opmaak'
import type { ImportRapport } from '@/lib/importPijplijn'
import { terugdraaienImport } from './actions'
import type { ImportHistorieRij, ImportStatus } from './importHistorieData'

const STATUS_LABEL: Record<ImportStatus, string> = {
  bezig: 'Bezig',
  klaar: 'Klaar',
  mislukt: 'Mislukt',
  teruggedraaid: 'Teruggedraaid',
}

const STATUS_KLASSE: Record<ImportStatus, string> = {
  bezig: 'bg-amber-50 text-amber-700 border-amber-200',
  klaar: 'bg-green-50 text-green-700 border-green-200',
  mislukt: 'bg-red-50 text-red-700 border-red-200',
  teruggedraaid: 'bg-gray-100 text-gray-500 border-gray-200',
}

const BRON_LABEL: Record<string, string> = {
  brainbay: 'Brainbay',
  realworks: 'Realworks',
  handmatig: 'Handmatig',
  fixture: 'Fixture',
}

/**
 * Importhistorie-sectie op `/admin/transacties` (item 5.4): de laatste 25
 * imports, met per import het kwaliteitsrapport (uitklapbaar) en, alleen bij
 * de meest recente niet-teruggedraaide import per kantoor, een knop om hem
 * terug te draaien — met een bevestigingsstap die eerst toont wat er gebeurt.
 */
export function Importhistorie({ imports }: { imports: ImportHistorieRij[] }) {
  if (imports.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
        Nog geen imports
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 bg-white">
      {imports.map(imp => <ImportRij key={imp.id} imp={imp} />)}
    </div>
  )
}

function ImportRij({ imp }: { imp: ImportHistorieRij }) {
  const router = useRouter()
  const [rapportOpen, setRapportOpen] = useState(false)
  const [bevestigenOpen, setBevestigenOpen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [resultaat, setResultaat] = useState<{ ok: boolean; bericht: string } | null>(null)

  const preview = imp.terugdraaiPreview
  const toontKnop = preview !== null && !resultaat
  const terugdraaibaar = preview?.ok === true

  const bevestig = async () => {
    setBezig(true)
    const res = await terugdraaienImport(imp.id)
    setBezig(false)
    setBevestigenOpen(false)
    if (res.ok) {
      setResultaat({ ok: true, bericht: `${res.hersteld} rij${res.hersteld === 1 ? '' : 'en'} hersteld, ${res.verwijderd} rij${res.verwijderd === 1 ? '' : 'en'} verwijderd.` })
      router.refresh()
    } else {
      setResultaat({ ok: false, bericht: res.error })
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{imp.kantoorNaam}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_KLASSE[imp.status]}`}>
              {STATUS_LABEL[imp.status]}
            </span>
            <span className="text-xs text-gray-400">{BRON_LABEL[imp.bron] ?? imp.bron}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {datumTijd(imp.gestartOp)}
            {imp.bestandsnaam && <> · {imp.bestandsnaam}</>}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600 shrink-0">
          <span>Nieuw: <strong className="text-gray-900">{imp.aantalNieuw ?? '—'}</strong></span>
          <span>Bijgewerkt: <strong className="text-gray-900">{imp.aantalBijgewerkt ?? '—'}</strong></span>
          <span>Uitgesloten: <strong className="text-gray-900">{imp.aantalUitgesloten ?? '—'}</strong></span>
          <span>Geocode: <strong className="text-gray-900">{imp.geocodePercentage != null ? `${imp.geocodePercentage}%` : '—'}</strong></span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setRapportOpen(o => !o)}
          className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2"
        >
          {rapportOpen ? 'Verberg kwaliteitsrapport' : 'Kwaliteitsrapport'}
        </button>

        {toontKnop && !bevestigenOpen && (
          <button
            type="button"
            onClick={() => setBevestigenOpen(true)}
            disabled={!terugdraaibaar}
            title={!terugdraaibaar && preview && !preview.ok ? preview.error : undefined}
            className="text-xs rounded-lg border border-gray-300 px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Laatste import terugdraaien
          </button>
        )}
        {toontKnop && !terugdraaibaar && preview && !preview.ok && (
          <span className="text-xs text-gray-400">{preview.error}</span>
        )}
      </div>

      {rapportOpen && (
        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <Kwaliteitsrapport rapport={imp.kwaliteitsrapport} />
        </div>
      )}

      {bevestigenOpen && terugdraaibaar && preview && preview.ok && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-sm text-amber-900">
            Dit herstelt <strong>{preview.hersteld}</strong> bijgewerkte rij{preview.hersteld === 1 ? '' : 'en'} naar hun
            vorige waarde en verwijdert <strong>{preview.verwijderd}</strong> nieuwe rij{preview.verwijderd === 1 ? '' : 'en'}.
            Dit kan niet ongedaan worden gemaakt.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={bevestig}
              disabled={bezig}
              className="text-xs rounded-lg bg-gray-900 text-white px-3 py-1.5 font-medium disabled:opacity-50"
            >
              {bezig ? 'Bezig…' : 'Bevestigen'}
            </button>
            <button
              type="button"
              onClick={() => setBevestigenOpen(false)}
              disabled={bezig}
              className="text-xs rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {resultaat && (
        <p className={`mt-2 text-xs ${resultaat.ok ? 'text-green-700' : 'text-red-600'}`}>{resultaat.bericht}</p>
      )}
    </div>
  )
}

/**
 * Toont het kwaliteitsrapport (`ImportRapport`, lib/importPijplijn.ts)
 * typeveilig — sinds item i2 (docs/archief/specs/i2-admin-csv-via-pijplijn.md) geen
 * `unknown`-gegok meer: `importHistorieData.ts` heeft het al door
 * `leesImportRapport()` gehaald, dus hier hoeft alleen "geen rapport"
 * (`null`) te worden afgevangen.
 */
function Kwaliteitsrapport({ rapport }: { rapport: ImportRapport | null }) {
  if (!rapport) {
    return <p className="text-xs text-gray-400">Geen rapport</p>
  }

  return (
    <div className="text-xs text-gray-600 space-y-2.5">
      <ul className="pl-0 space-y-0.5">
        <li>Rauwe rijen: <strong className="text-gray-900">{rapport.totaalRuw}</strong></li>
        <li>Na ontdubbelen: <strong className="text-gray-900">{rapport.totaalGeimporteerd}</strong> ({rapport.samengevoegd} samengevoegd)</li>
        <li>Met coördinaat: <strong className="text-gray-900">{rapport.pctMetCoordinaat}%</strong></li>
        <li>Eigen verkopen: <strong className="text-gray-900">{rapport.aantalEigenVerkopen}</strong></li>
      </ul>

      {rapport.perUitsluitreden.length > 0 && (
        <div>
          <p className="font-medium text-gray-700 mb-1">Uitgesloten (blijven bestaan)</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {rapport.perUitsluitreden.map(r => <li key={r.reden}>{r.label}: {r.aantal}</li>)}
          </ul>
        </div>
      )}

      {rapport.overgeslagen.length > 0 && (
        <div>
          <p className="font-medium text-gray-700 mb-1">Niet geïmporteerd ({rapport.overgeslagen.length})</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {rapport.overgeslagen.slice(0, 10).map((o, i) => <li key={i}>Regel {o.regel}: {o.reden}</li>)}
            {rapport.overgeslagen.length > 10 && <li className="text-gray-400">…en {rapport.overgeslagen.length - 10} meer</li>}
          </ul>
        </div>
      )}

      {rapport.perPlaats.length > 0 && (
        <div>
          <p className="font-medium text-gray-700 mb-1">Per plaats</p>
          <ul className="pl-4 space-y-0.5">
            {rapport.perPlaats.slice(0, 10).map(p => <li key={p.plaats}>{p.plaats}: {p.aantal}</li>)}
          </ul>
        </div>
      )}

      {rapport.perJaar.length > 0 && (
        <div>
          <p className="font-medium text-gray-700 mb-1">Per jaar</p>
          <ul className="pl-4 space-y-0.5">
            {rapport.perJaar.map(j => <li key={j.jaar}>{j.jaar}: {j.aantal}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
