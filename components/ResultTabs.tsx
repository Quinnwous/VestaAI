'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentOutput } from '@/lib/schemas'
import { TabContent } from './TabContent'
import { PlanPostKnop } from './PlanPostKnop'
import { HerschrijfKnop } from './HerschrijfKnop'

type Tab = 'funda' | 'brochure' | 'instagram' | 'linkedin' | 'email' | 'buurt' | 'openhuis' | 'followup' | 'video' | 'energieadvies' | 'kopersvragen' | 'marktanalyse'

const TABS: { id: Tab; label: string; optioneel?: boolean }[] = [
  { id: 'funda', label: 'Funda' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'E-mail' },
  { id: 'buurt', label: 'Buurt' },
  { id: 'openhuis', label: 'Open huis', optioneel: true },
  { id: 'followup', label: 'Follow-up', optioneel: true },
  { id: 'video', label: 'Video script', optioneel: true },
  { id: 'energieadvies', label: 'Energieadvies', optioneel: true },
  { id: 'kopersvragen', label: 'Kopersvragen', optioneel: true },
  { id: 'marktanalyse', label: 'Marktanalyse', optioneel: true },
]

const VALID_TABS = new Set<Tab>(TABS.map(t => t.id))

function tabFromHash(): Tab {
  if (typeof window === 'undefined') return 'funda'
  const hash = window.location.hash.slice(1) as Tab
  return VALID_TABS.has(hash) ? hash : 'funda'
}

interface ResultTabsProps {
  data: ContentOutput
  objectId?: string | null
  taal?: 'nl' | 'en'
  onReset?: () => void
  onResetHref?: string
}

export function ResultTabs({ data, objectId, taal = 'nl', onReset, onResetHref }: ResultTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>(() => tabFromHash())
  const [brochureVariant, setBrochureVariant] = useState<'kort' | 'lang'>('lang')
  const [followupVariant, setFollowupVariant] = useState<'positief' | 'negatief'>('positief')
  const [localData, setLocalData] = useState<ContentOutput>(data)

  const isEn = taal === 'en'

  const updateField = (sleutel: keyof ContentOutput, nieuweTekst: string) => {
    setLocalData(prev => ({ ...prev, [sleutel]: nieuweTekst }))
  }

  const saveField = (sleutel: keyof ContentOutput) => objectId
    ? async (tekst: string) => {
        updateField(sleutel, tekst)
        await fetch(`/api/object/${objectId}/veld`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sleutel, tekst }),
        })
      }
    : undefined

  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [emailingPdf, setEmailingPdf] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  const handleCopyAll = async () => {
    const secties: [string, string][] = [
      [isEn ? '=== MAIN DESCRIPTION ===' : '=== FUNDA-TEKST ===', localData.funda_tekst],
      [isEn ? '=== BROCHURE (LONG) ===' : '=== BROCHURE (LANG) ===', localData.brochure_lang],
      [isEn ? '=== BROCHURE (SHORT) ===' : '=== BROCHURE (KORT) ===', localData.brochure_kort],
      [isEn ? '=== INSTAGRAM — EMOTIONAL ===' : '=== INSTAGRAM — EMOTIONEEL ===', localData.instagram_emotioneel],
      [isEn ? '=== INSTAGRAM — INFORMATIVE ===' : '=== INSTAGRAM — INFORMATIEF ===', localData.instagram_informatief],
      [isEn ? '=== INSTAGRAM — CALL TO ACTION ===' : '=== INSTAGRAM — ACTIE ===', localData.instagram_actie],
      [isEn ? '=== LINKEDIN — AGENCY ===' : '=== LINKEDIN — KANTOOR ===', localData.linkedin_kantoor],
      [isEn ? '=== LINKEDIN — AGENT ===' : '=== LINKEDIN — MAKELAAR ===', localData.linkedin_makelaar],
      [isEn ? '=== BUYER EMAIL ===' : '=== E-MAIL AAN KOPER ===', localData.koper_email],
      [isEn ? '=== NEIGHBOURHOOD ===' : '=== BUURTOMSCHRIJVING ===', localData.buurtomschrijving],
    ]
    if (localData.open_huis) secties.push([isEn ? '=== OPEN HOUSE ===' : '=== OPEN HUIS ===', localData.open_huis])
    if (localData.bezichtiging_followup_positief) secties.push([isEn ? '=== FOLLOW-UP (INTERESTED) ===' : '=== FOLLOW-UP (GEÏNTERESSEERD) ===', localData.bezichtiging_followup_positief])
    if (localData.bezichtiging_followup_negatief) secties.push([isEn ? '=== FOLLOW-UP (NOT INTERESTED) ===' : '=== FOLLOW-UP (NIET GEÏNTERESSEERD) ===', localData.bezichtiging_followup_negatief])
    if (localData.video_script) secties.push([isEn ? '=== VIDEO SCRIPT ===' : '=== VIDEO SCRIPT ===', localData.video_script])
    if (localData.energie_advies) secties.push([isEn ? '=== ENERGY ADVICE ===' : '=== ENERGIEADVIES ===', localData.energie_advies])
    if (localData.kopersvragen_faq) secties.push([isEn ? '=== BUYER FAQ ===' : '=== KOPERSVRAGEN FAQ ===', localData.kopersvragen_faq])
    if (localData.marktanalyse) secties.push([isEn ? '=== MARKET ANALYSIS ===' : '=== MARKTANALYSE ===', localData.marktanalyse])

    const alles = secties.map(([titel, inhoud]) => `${titel}\n${inhoud}`).join('\n\n')
    await navigator.clipboard.writeText(alles)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  const handleEmailPdf = async () => {
    if (!objectId) return
    setEmailingPdf(true)
    try {
      const res = await fetch(`/api/object/${objectId}/email-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setEmailSent(true)
        setTimeout(() => setEmailSent(false), 4000)
      }
    } finally {
      setEmailingPdf(false)
    }
  }

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

  // Alleen tabs tonen waarvan content aanwezig is
  const visibleTabs = TABS.filter(tab => {
    if (!tab.optioneel) return true
    if (tab.id === 'openhuis') return !!localData.open_huis
    if (tab.id === 'followup') return !!(localData.bezichtiging_followup_positief || localData.bezichtiging_followup_negatief)
    if (tab.id === 'video') return !!localData.video_script
    if (tab.id === 'energieadvies') return !!localData.energie_advies
    if (tab.id === 'kopersvragen') return !!localData.kopersvragen_faq
    if (tab.id === 'marktanalyse') return !!localData.marktanalyse
    return true
  })

  const rewrite = (sleutel: keyof ContentOutput) =>
    objectId ? (
      <HerschrijfKnop
        objectId={objectId}
        sleutel={sleutel}
        onNieuweTekst={t => updateField(sleutel, t)}
      />
    ) : null

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEn ? 'Generated content' : 'Gegenereerde content'}
          </h2>
          {isEn && (
            <span style={{ fontSize: 12, background: '#EAF5EE', color: '#1A6B45', border: '1px solid #C7E6D5', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
              🇬🇧 English
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5A6B61', border: '1px solid #E4EAE6', borderRadius: 10, padding: '7px 12px', background: '#fff', cursor: 'pointer' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copiedAll ? '✓ Gekopieerd' : (isEn ? 'Copy all' : 'Kopieer alles')}
          </button>

          {objectId && (
            <>
              <button
                onClick={handlePdfDownload}
                disabled={downloadingPdf}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5A6B61', border: '1px solid #E4EAE6', borderRadius: 10, padding: '7px 12px', background: '#fff', cursor: downloadingPdf ? 'not-allowed' : 'pointer', opacity: downloadingPdf ? .5 : 1 }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloadingPdf ? 'Laden...' : (isEn ? 'Export PDF' : 'Exporteer PDF')}
              </button>
              <button
                onClick={handleEmailPdf}
                disabled={emailingPdf || emailSent}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5A6B61', border: '1px solid #E4EAE6', borderRadius: 10, padding: '7px 12px', background: '#fff', cursor: emailingPdf || emailSent ? 'not-allowed' : 'pointer', opacity: emailingPdf || emailSent ? .6 : 1 }}
                title={isEn ? 'Send PDF to your email address' : 'Verstuur PDF naar uw e-mailadres'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {emailSent ? '✓ Verstuurd' : emailingPdf ? 'Versturen...' : (isEn ? 'Mail PDF' : 'Mail PDF')}
              </button>
            </>
          )}
          <button
            onClick={handleReset}
            style={{ fontSize: 14, color: '#9AA6A0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {onResetHref
              ? (isEn ? '← Back to overview' : '← Terug naar overzicht')
              : (isEn ? 'New property' : 'Nieuw object')}
          </button>
        </div>
      </div>

      {/* Tab navigatie */}
      <div role="tablist" aria-label="Content-types" style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E9EFEB', marginBottom: 24, overflowX: 'auto' }}>
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            style={{ padding: '9px 16px', fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: 'nowrap', cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #1A6B45' : '2px solid transparent', color: activeTab === tab.id ? '#1A6B45' : '#9AA6A0', transition: 'all .15s', marginBottom: -1 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        <div role="tabpanel" id="panel-funda" aria-labelledby="tab-funda" hidden={activeTab !== 'funda'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Funda limit: max 800 words' : 'Funda-limiet: max 800 woorden'}
          </p>
          <TabContent content={localData.funda_tekst} wordCount wordLimit={800} onSave={saveField('funda_tekst')} />
          {rewrite('funda_tekst')}
        </div>

        <div role="tabpanel" id="panel-brochure" aria-labelledby="tab-brochure" hidden={activeTab !== 'brochure'} className="space-y-4">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['lang', 'kort'] as const).map(v => (
              <button
                key={v}
                onClick={() => setBrochureVariant(v)}
                style={{ padding: '5px 12px', fontSize: 13, borderRadius: 20, border: '1px solid', cursor: 'pointer', background: brochureVariant === v ? '#1A6B45' : '#fff', color: brochureVariant === v ? '#fff' : '#5A6B61', borderColor: brochureVariant === v ? '#1A6B45' : '#E4EAE6' }}
              >
                {v === 'lang'
                  ? (isEn ? 'Long (500+ words)' : 'Lang (500+ woorden)')
                  : (isEn ? 'Short (200 words)' : 'Kort (200 woorden)')}
              </button>
            ))}
          </div>
          <TabContent
            content={brochureVariant === 'lang' ? localData.brochure_lang : localData.brochure_kort}
            wordCount
            onSave={saveField(brochureVariant === 'lang' ? 'brochure_lang' : 'brochure_kort')}
          />
          {rewrite(brochureVariant === 'lang' ? 'brochure_lang' : 'brochure_kort')}
        </div>

        <div role="tabpanel" id="panel-instagram" aria-labelledby="tab-instagram" hidden={activeTab !== 'instagram'}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              {isEn ? 'Instagram limit: 2,200 characters per post' : 'Instagram-limiet: 2.200 tekens per post'}
            </p>
            <PlanPostKnop content={localData.instagram_emotioneel} platform="instagram" objectId={objectId} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <TabContent label={isEn ? 'Emotional' : 'Emotioneel'} content={localData.instagram_emotioneel} charLimit={2200} onSave={saveField('instagram_emotioneel')} />
              {rewrite('instagram_emotioneel')}
            </div>
            <div className="space-y-2">
              <TabContent label={isEn ? 'Informative' : 'Informatief'} content={localData.instagram_informatief} charLimit={2200} onSave={saveField('instagram_informatief')} />
              {rewrite('instagram_informatief')}
            </div>
            <div className="space-y-2">
              <TabContent label={isEn ? 'Call to action' : 'Actie'} content={localData.instagram_actie} charLimit={2200} onSave={saveField('instagram_actie')} />
              {rewrite('instagram_actie')}
            </div>
          </div>
        </div>

        <div role="tabpanel" id="panel-linkedin" aria-labelledby="tab-linkedin" hidden={activeTab !== 'linkedin'}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              {isEn ? 'LinkedIn limit: 3,000 characters per post' : 'LinkedIn-limiet: 3.000 tekens per post'}
            </p>
            <PlanPostKnop content={localData.linkedin_kantoor} platform="linkedin" objectId={objectId} />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <TabContent label={isEn ? 'Agency variant' : 'Kantoor-variant'} content={localData.linkedin_kantoor} charLimit={3000} onSave={saveField('linkedin_kantoor')} />
              {rewrite('linkedin_kantoor')}
            </div>
            <div className="space-y-2">
              <TabContent label={isEn ? 'Agent variant' : 'Makelaar-variant'} content={localData.linkedin_makelaar} charLimit={3000} onSave={saveField('linkedin_makelaar')} />
              {rewrite('linkedin_makelaar')}
            </div>
          </div>
        </div>

        <div role="tabpanel" id="panel-email" aria-labelledby="tab-email" hidden={activeTab !== 'email'} className="space-y-3">
          <TabContent content={localData.koper_email} onSave={saveField('koper_email')} />
          {rewrite('koper_email')}
        </div>

        <div role="tabpanel" id="panel-buurt" aria-labelledby="tab-buurt" hidden={activeTab !== 'buurt'} className="space-y-3">
          <TabContent content={localData.buurtomschrijving} onSave={saveField('buurtomschrijving')} />
          {rewrite('buurtomschrijving')}
        </div>

        <div role="tabpanel" id="panel-openhuis" aria-labelledby="tab-openhuis" hidden={activeTab !== 'openhuis'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Open house announcement for Instagram/social' : 'Open huis-aankondiging voor Instagram/social'}
          </p>
          <TabContent content={localData.open_huis} charLimit={2200} onSave={saveField('open_huis')} />
          {rewrite('open_huis')}
        </div>

        <div role="tabpanel" id="panel-followup" aria-labelledby="tab-followup" hidden={activeTab !== 'followup'} className="space-y-4">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['positief', 'negatief'] as const).map(v => (
              <button
                key={v}
                onClick={() => setFollowupVariant(v)}
                style={{ padding: '5px 12px', fontSize: 13, borderRadius: 20, border: '1px solid', cursor: 'pointer', background: followupVariant === v ? '#1A6B45' : '#fff', color: followupVariant === v ? '#fff' : '#5A6B61', borderColor: followupVariant === v ? '#1A6B45' : '#E4EAE6' }}
              >
                {v === 'positief'
                  ? (isEn ? 'Interested buyer' : 'Geïnteresseerde koper')
                  : (isEn ? 'Not interested' : 'Niet geïnteresseerd')}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <TabContent
              content={followupVariant === 'positief'
                ? localData.bezichtiging_followup_positief
                : localData.bezichtiging_followup_negatief}
              onSave={saveField(followupVariant === 'positief' ? 'bezichtiging_followup_positief' : 'bezichtiging_followup_negatief')}
            />
            {rewrite(followupVariant === 'positief' ? 'bezichtiging_followup_positief' : 'bezichtiging_followup_negatief')}
          </div>
        </div>

        <div role="tabpanel" id="panel-video" aria-labelledby="tab-video" hidden={activeTab !== 'video'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Voice-over script for property video (±60 seconds)' : 'Voice-over script voor woningvideo (±60 seconden)'}
          </p>
          <TabContent content={localData.video_script} wordCount onSave={saveField('video_script')} />
          {rewrite('video_script')}
        </div>

        <div role="tabpanel" id="panel-energieadvies" aria-labelledby="tab-energieadvies" hidden={activeTab !== 'energieadvies'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Energy advice and subsidy overview based on the energy label' : 'Energieadvies en subsidieoverzicht op basis van het energielabel'}
          </p>
          <TabContent content={localData.energie_advies ?? ''} wordCount onSave={saveField('energie_advies')} />
          {rewrite('energie_advies')}
        </div>

        <div role="tabpanel" id="panel-kopersvragen" aria-labelledby="tab-kopersvragen" hidden={activeTab !== 'kopersvragen'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Frequently asked questions from buyers — ready to share or export as PDF' : 'Veelgestelde vragen van kopers — klaar om te delen of als PDF te exporteren'}
          </p>
          <TabContent content={localData.kopersvragen_faq ?? ''} wordCount onSave={saveField('kopersvragen_faq')} />
          {rewrite('kopersvragen_faq')}
        </div>

        <div role="tabpanel" id="panel-marktanalyse" aria-labelledby="tab-marktanalyse" hidden={activeTab !== 'marktanalyse'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Market analysis and sales strategy for this property' : 'Marktanalyse en verkoopstrategie voor dit object'}
          </p>
          <TabContent content={localData.marktanalyse ?? ''} wordCount onSave={saveField('marktanalyse')} />
          {rewrite('marktanalyse')}
        </div>
      </div>
    </div>
  )
}
