'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentOutput } from '@/lib/schemas'
import { TabContent } from './TabContent'

type Tab = 'funda' | 'brochure' | 'instagram' | 'linkedin' | 'email' | 'buurt'

const TABS: { id: Tab; label: string }[] = [
  { id: 'funda', label: 'Funda' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'E-mail' },
  { id: 'buurt', label: 'Buurt' },
]

interface ResultTabsProps {
  data: ContentOutput
  objectId?: string | null
  // Één van de twee: callback (formulier-flow) of href (detail-pagina)
  onReset?: () => void
  onResetHref?: string
}

export function ResultTabs({ data, objectId, onReset, onResetHref }: ResultTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('funda')
  const [brochureVariant, setBrochureVariant] = useState<'kort' | 'lang'>('lang')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleReset = () => {
    if (onReset) onReset()
    else if (onResetHref) router.push(onResetHref)
  }

  const handlePdfDownload = async () => {
    if (!objectId) return
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/pdf/generate?object_id=${objectId}`)
      if (!res.ok) throw new Error('PDF genereren mislukt')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'vestaai.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Gegenereerde content</h2>
        <div className="flex items-center gap-3">
          {objectId && (
            <button
              onClick={handlePdfDownload}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloadingPdf ? 'Laden...' : 'Exporteer PDF'}
            </button>
          )}
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {onResetHref ? '← Terug naar overzicht' : 'Nieuw object'}
          </button>
        </div>
      </div>

      {/* Tab navigatie */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'funda' && (
          <TabContent content={data.funda_tekst} wordCount />
        )}

        {activeTab === 'brochure' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['lang', 'kort'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setBrochureVariant(v)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    brochureVariant === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {v === 'lang' ? 'Lang (500+ woorden)' : 'Kort (200 woorden)'}
                </button>
              ))}
            </div>
            <TabContent
              content={brochureVariant === 'lang' ? data.brochure_lang : data.brochure_kort}
              wordCount
            />
          </div>
        )}

        {activeTab === 'instagram' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TabContent label="Emotioneel" content={data.instagram_emotioneel} />
            <TabContent label="Informatief" content={data.instagram_informatief} />
            <TabContent label="Actie" content={data.instagram_actie} />
          </div>
        )}

        {activeTab === 'linkedin' && (
          <div className="space-y-4">
            <TabContent label="Kantoor-variant" content={data.linkedin_kantoor} />
            <TabContent label="Makelaar-variant" content={data.linkedin_makelaar} />
          </div>
        )}

        {activeTab === 'email' && (
          <TabContent content={data.koper_email} />
        )}

        {activeTab === 'buurt' && (
          <TabContent content={data.buurtomschrijving} />
        )}
      </div>
    </div>
  )
}
