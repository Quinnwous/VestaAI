'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentOutput } from '@/lib/schemas'
import { EXTRA_TYPES, type ExtraType } from '@/lib/contentExtra'
import { Popover, Skeleton } from '@/components/ui'
import { TabContent } from './TabContent'
import { HerschrijfKnop } from './HerschrijfKnop'

// Kern-tabs (item 8.3, roadmap § 3.4 Outputset v2) — altijd zichtbaar, komen
// uit de kern-call die bij "Genereer content" altijd draait.
type KernTab = 'funda' | 'brochure' | 'instagram' | 'linkedin' | 'sneak' | 'email' | 'buurt'
// Extra-tabs — verschijnen pas zodra er content is, een generatie loopt, of
// een generatie is mislukt (zie tabHeeftInhoudOfActiviteit hieronder).
type ExtraTab = 'openhuis' | 'followup' | 'video' | 'kopersvragen' | 'energieadvies'
type Tab = KernTab | ExtraTab

const KERN_TABS: { id: KernTab; label: string }[] = [
  { id: 'funda', label: 'Funda' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'sneak', label: 'WhatsApp' },
  { id: 'email', label: 'E-mail' },
  { id: 'buurt', label: 'Buurt' },
]

/**
 * "Meer…"-menu (item 8.3): elk item genereert één extra contentveld op
 * knopdruk via `POST /api/object/[id]/extra?type=`. `tabId` is de tab die na
 * generatie (of tijdens laden/bij een fout) getoond wordt — followup_positief
 * en followup_negatief delen dezelfde tab (met de bestaande toggle).
 */
const EXTRA_MENU: { type: ExtraType; label: string; tabId: ExtraTab }[] = [
  { type: 'open_huis', label: 'Open huis-aankondiging', tabId: 'openhuis' },
  { type: 'followup_positief', label: 'Follow-up — geïnteresseerd', tabId: 'followup' },
  { type: 'followup_negatief', label: 'Follow-up — niet geïnteresseerd', tabId: 'followup' },
  { type: 'video_script', label: 'Video script', tabId: 'video' },
  { type: 'kopersvragen_faq', label: 'Kopersvragen FAQ', tabId: 'kopersvragen' },
  { type: 'energie_advies', label: 'Energieadvies', tabId: 'energieadvies' },
]

const EXTRA_TAB_LABEL: Record<ExtraTab, string> = {
  openhuis: 'Open huis',
  followup: 'Follow-up',
  video: 'Video script',
  kopersvragen: 'Kopersvragen',
  energieadvies: 'Energieadvies',
}

const VALID_TABS = new Set<Tab>([...KERN_TABS.map(t => t.id), 'openhuis', 'followup', 'video', 'kopersvragen', 'energieadvies'])

function tabFromHash(): Tab {
  if (typeof window === 'undefined') return 'funda'
  const hash = window.location.hash.slice(1) as Tab
  return VALID_TABS.has(hash) ? hash : 'funda'
}

/**
 * Backcompat (item 8.3): dossiers van vóór de outputset-v2 hebben deze velden
 * nog onder hun oude naam of opgesplitst over meerdere varianten
 * (`brochure_kort`/`brochure_lang`, drie Instagram-varianten,
 * `bezichtiging_followup_*`). `ContentOutputSchema` houdt die optioneel zodat
 * ze geldig blijven parsen; hier tonen we het nieuwe veld als dat gevuld is,
 * anders het best passende oude veld — zodat al gegenereerde content na deze
 * wijziging zichtbaar blijft in plaats van "leeg" te lijken.
 */
function metLegacyFallback(data: ContentOutput): ContentOutput {
  return {
    ...data,
    brochure_tekst: data.brochure_tekst || data.brochure_lang || data.brochure_kort || '',
    instagram: data.instagram || data.instagram_emotioneel || data.instagram_informatief || data.instagram_actie || '',
    followup_positief: data.followup_positief || data.bezichtiging_followup_positief || '',
    followup_negatief: data.followup_negatief || data.bezichtiging_followup_negatief || '',
  }
}

interface ResultTabsProps {
  data: ContentOutput
  /** Engelse tegenhanger (F8, besluit 16 sep 2026: elke tekst standaard NL+EN). Toggle verschijnt alleen als dit gevuld is. */
  dataEn?: ContentOutput | null
  objectId?: string | null
  taal?: 'nl' | 'en'
  onReset?: () => void
  onResetHref?: string
}

export function ResultTabs({ data, dataEn, objectId, taal = 'nl', onReset, onResetHref }: ResultTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>(() => tabFromHash())
  const [followupVariant, setFollowupVariant] = useState<'positief' | 'negatief'>('positief')
  const [localData, setLocalData] = useState<ContentOutput>(() => metLegacyFallback(data))
  // Weergavetaal is los van bewerken: bewerken/herschrijven werkt altijd op de
  // Nederlandse brondata (localData) — Engels is hier alleen ter inzage/kopiëren.
  const [weergaveTaal, setWeergaveTaal] = useState<'nl' | 'en'>(taal)
  // Extra's (item 8.3): per type bijhouden of een generatie loopt of mislukte.
  const [genererend, setGenererend] = useState<Partial<Record<ExtraType, boolean>>>({})
  const [extraFout, setExtraFout] = useState<Partial<Record<ExtraType, string>>>({})
  const [menuOpen, setMenuOpen] = useState(false)

  const isEn = weergaveTaal === 'en'
  const weergaveData = isEn && dataEn ? metLegacyFallback(dataEn) : localData

  const updateField = (sleutel: keyof ContentOutput, nieuweTekst: string) => {
    setLocalData(prev => ({ ...prev, [sleutel]: nieuweTekst }))
  }

  // Bewerken/herschrijven werkt alleen op de Nederlandse brondata — bij het
  // bekijken van de Engelse tegenhanger (F8) zijn deze bewust uitgeschakeld,
  // anders zou een Engelse bewerking per ongeluk het NL-veld overschrijven.
  const saveField = (sleutel: keyof ContentOutput) => (objectId && !isEn)
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

  // Genereert één extra contentveld op knopdruk (item 8.3) en schakelt meteen
  // naar de bijbehorende tab, zodat de makelaar de laadstaat/foutstaat ziet
  // in plaats van dat er in de achtergrond iets gebeurt.
  const genereerExtra = async (type: ExtraType, tabId: ExtraTab) => {
    if (!objectId) return
    setMenuOpen(false)
    handleTabChange(tabId)
    setExtraFout(prev => ({ ...prev, [type]: '' }))
    setGenererend(prev => ({ ...prev, [type]: true }))
    try {
      const res = await fetch(`/api/object/${objectId}/extra?type=${type}`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as { error?: string })
        setExtraFout(prev => ({ ...prev, [type]: json.error ?? 'Genereren mislukt. Probeer het opnieuw.' }))
        return
      }
      const { tekst } = await res.json() as { tekst: string }
      updateField(type, tekst)
    } catch {
      setExtraFout(prev => ({ ...prev, [type]: 'Verbindingsfout — probeer opnieuw.' }))
    } finally {
      setGenererend(prev => ({ ...prev, [type]: false }))
    }
  }

  /** Of een extra-tab een tab-knop verdient: content aanwezig, een generatie loopt, of de laatste poging mislukte. */
  const extraTabActief = (tabId: ExtraTab): boolean =>
    EXTRA_MENU.filter(item => item.tabId === tabId).some(
      item => !!weergaveData[item.type] || !!genererend[item.type] || !!extraFout[item.type],
    )

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [emailingPdf, setEmailingPdf] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  const handleCopyAll = async () => {
    const secties: [string, string][] = [
      [isEn ? '=== MAIN DESCRIPTION ===' : '=== FUNDA-TEKST ===', weergaveData.funda_tekst],
      [isEn ? '=== BROCHURE ===' : '=== BROCHURETEKST ===', weergaveData.brochure_tekst],
      [isEn ? '=== INSTAGRAM ===' : '=== INSTAGRAM ===', weergaveData.instagram],
      [isEn ? '=== LINKEDIN — AGENCY ===' : '=== LINKEDIN — KANTOOR ===', weergaveData.linkedin_kantoor],
      ['=== WHATSAPP (SNEAK PREVIEW) ===', weergaveData.sneak_preview],
      [isEn ? '=== BUYER EMAIL ===' : '=== E-MAIL AAN KOPER ===', weergaveData.koper_email],
      [isEn ? '=== NEIGHBOURHOOD ===' : '=== BUURTOMSCHRIJVING ===', weergaveData.buurtomschrijving],
    ]
    if (weergaveData.open_huis) secties.push([isEn ? '=== OPEN HOUSE ===' : '=== OPEN HUIS ===', weergaveData.open_huis])
    if (weergaveData.followup_positief) secties.push([isEn ? '=== FOLLOW-UP (INTERESTED) ===' : '=== FOLLOW-UP (GEÏNTERESSEERD) ===', weergaveData.followup_positief])
    if (weergaveData.followup_negatief) secties.push([isEn ? '=== FOLLOW-UP (NOT INTERESTED) ===' : '=== FOLLOW-UP (NIET GEÏNTERESSEERD) ===', weergaveData.followup_negatief])
    if (weergaveData.video_script) secties.push([isEn ? '=== VIDEO SCRIPT ===' : '=== VIDEO SCRIPT ===', weergaveData.video_script])
    if (weergaveData.energie_advies) secties.push([isEn ? '=== ENERGY ADVICE ===' : '=== ENERGIEADVIES ===', weergaveData.energie_advies])
    if (weergaveData.kopersvragen_faq) secties.push([isEn ? '=== BUYER FAQ ===' : '=== KOPERSVRAGEN FAQ ===', weergaveData.kopersvragen_faq])

    const alles = secties.filter(([, inhoud]) => !!inhoud).map(([titel, inhoud]) => `${titel}\n${inhoud}`).join('\n\n')
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

  const visibleTabs: { id: Tab; label: string }[] = [
    ...KERN_TABS,
    ...(['openhuis', 'followup', 'video', 'kopersvragen', 'energieadvies'] as ExtraTab[])
      .filter(extraTabActief)
      .map(id => ({ id, label: EXTRA_TAB_LABEL[id] })),
  ]

  const rewrite = (sleutel: keyof ContentOutput) =>
    (objectId && !isEn) ? (
      <HerschrijfKnop
        objectId={objectId}
        sleutel={sleutel}
        onNieuweTekst={t => updateField(sleutel, t)}
      />
    ) : null

  /** Skeleton + foutstaat (met retry) voor een extra-veld — zelfde patroon voor elke extra-tab. */
  const extraPaneel = (type: ExtraType, tabId: ExtraTab, content: string, opts?: { wordCount?: boolean }) => {
    if (genererend[type]) {
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          <Skeleton height={18} width="30%" />
          <Skeleton height={130} rounded={14} />
        </div>
      )
    }
    if (extraFout[type]) {
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ fontSize: 13.5, color: '#B91C1C' }}>{extraFout[type]}</p>
          <button
            type="button"
            onClick={() => genereerExtra(type, tabId)}
            style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, color: 'var(--merk)', background: 'var(--merk-zacht)', border: '1px solid var(--merk-rand)', borderRadius: 'var(--merk-radius-sm, 8px)', padding: '6px 12px', cursor: 'pointer' }}
          >
            Opnieuw proberen
          </button>
        </div>
      )
    }
    return (
      <>
        <TabContent content={content} wordCount={opts?.wordCount} onSave={saveField(type)} />
        {rewrite(type)}
      </>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEn ? 'Generated content' : 'Gegenereerde content'}
          </h2>
          {dataEn && (
            <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #E1E5E9' }}>
              {(['nl', 'en'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWeergaveTaal(t)}
                  style={{ padding: '5px 10px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: weergaveTaal === t ? 'var(--merk)' : '#fff', color: weergaveTaal === t ? '#fff' : '#5C6470' }}
                >
                  {t === 'nl' ? '🇳🇱 NL' : '🇬🇧 EN'}
                </button>
              ))}
            </div>
          )}
          {isEn && (
            <span style={{ fontSize: 11.5, color: '#98A0A6' }}>
              Alleen ter inzage — bewerken kan op de NL-versie
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {objectId && (
            <Popover
              open={menuOpen}
              onOpenChange={setMenuOpen}
              titel="Meer content genereren"
              breedte={300}
              uitlijning="end"
              trigger={
                <button
                  type="button"
                  disabled={isEn}
                  title={isEn ? "Extra's zijn alleen in het Nederlands" : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: isEn ? '#C2C8CD' : 'var(--merk)', border: '1px solid #E1E5E9', borderRadius: 'var(--merk-radius-md, 10px)', padding: '7px 12px', background: '#fff', cursor: isEn ? 'not-allowed' : 'pointer' }}
                >
                  Meer…
                  <svg width="10" height="10" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 4.5 6 8l3.5-3.5" />
                  </svg>
                </button>
              }
            >
              <div style={{ display: 'grid', gap: 4 }}>
                {EXTRA_MENU.map(item => {
                  const heeftInhoud = !!weergaveData[item.type]
                  const bezig = !!genererend[item.type]
                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={bezig}
                      onClick={() => (heeftInhoud ? (setMenuOpen(false), handleTabChange(item.tabId)) : genereerExtra(item.type, item.tabId))}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13.5, textAlign: 'left', color: '#2C3238', background: 'none', border: 'none', borderRadius: 8, padding: '8px 8px', cursor: bezig ? 'not-allowed' : 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--merk-zacht)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      <span>{item.label}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: bezig ? '#98A0A6' : heeftInhoud ? 'var(--merk)' : '#98A0A6' }}>
                        {bezig ? 'Bezig…' : heeftInhoud ? '✓ Bekijk' : 'Genereren'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Popover>
          )}
          <button
            onClick={handleCopyAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5C6470', border: '1px solid #E1E5E9', borderRadius: 'var(--merk-radius-md, 10px)', padding: '7px 12px', background: '#fff', cursor: 'pointer' }}
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
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5C6470', border: '1px solid #E1E5E9', borderRadius: 'var(--merk-radius-md, 10px)', padding: '7px 12px', background: '#fff', cursor: downloadingPdf ? 'not-allowed' : 'pointer', opacity: downloadingPdf ? .5 : 1 }}
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
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5C6470', border: '1px solid #E1E5E9', borderRadius: 'var(--merk-radius-md, 10px)', padding: '7px 12px', background: '#fff', cursor: emailingPdf || emailSent ? 'not-allowed' : 'pointer', opacity: emailingPdf || emailSent ? .6 : 1 }}
                title={isEn ? 'Send PDF to your email address' : 'Verstuur PDF naar je e-mailadres'}
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
            style={{ fontSize: 14, color: '#98A0A6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {onResetHref
              ? (isEn ? '← Back to overview' : '← Terug naar overzicht')
              : (isEn ? 'New property' : 'Nieuwe woning')}
          </button>
        </div>
      </div>

      {/* Tab navigatie */}
      <div role="tablist" aria-label="Content-types" style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E6E9EC', marginBottom: 24, overflowX: 'auto' }}>
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            style={{ padding: '9px 16px', fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: 'nowrap', cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--merk)' : '2px solid transparent', color: activeTab === tab.id ? 'var(--merk)' : '#98A0A6', transition: 'all .15s', marginBottom: -1 }}
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
          <TabContent content={weergaveData.funda_tekst} wordCount wordLimit={800} onSave={saveField('funda_tekst')} />
          {rewrite('funda_tekst')}
        </div>

        <div role="tabpanel" id="panel-brochure" aria-labelledby="tab-brochure" hidden={activeTab !== 'brochure'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Suitable for both a printed and a digital brochure' : 'Geschikt voor zowel een gedrukte als digitale brochure'}
          </p>
          <TabContent content={weergaveData.brochure_tekst} wordCount onSave={saveField('brochure_tekst')} />
          {rewrite('brochure_tekst')}
        </div>

        <div role="tabpanel" id="panel-instagram" aria-labelledby="tab-instagram" hidden={activeTab !== 'instagram'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Instagram limit: 2,200 characters' : 'Instagram-limiet: 2.200 tekens'}
          </p>
          <TabContent content={weergaveData.instagram} charLimit={2200} onSave={saveField('instagram')} />
          {rewrite('instagram')}
        </div>

        <div role="tabpanel" id="panel-linkedin" aria-labelledby="tab-linkedin" hidden={activeTab !== 'linkedin'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'LinkedIn limit: 3,000 characters' : 'LinkedIn-limiet: 3.000 tekens'}
          </p>
          <TabContent content={weergaveData.linkedin_kantoor} charLimit={3000} onSave={saveField('linkedin_kantoor')} />
          {rewrite('linkedin_kantoor')}
        </div>

        <div role="tabpanel" id="panel-sneak" aria-labelledby="tab-sneak" hidden={activeTab !== 'sneak'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn
              ? 'Short WhatsApp message — Dutch only, max 600 characters'
              : 'Kort WhatsApp-bericht, max 600 tekens'}
          </p>
          <TabContent content={weergaveData.sneak_preview} charLimit={600} onSave={saveField('sneak_preview')} />
          {rewrite('sneak_preview')}
        </div>

        <div role="tabpanel" id="panel-email" aria-labelledby="tab-email" hidden={activeTab !== 'email'} className="space-y-3">
          <TabContent content={weergaveData.koper_email} onSave={saveField('koper_email')} />
          {rewrite('koper_email')}
        </div>

        <div role="tabpanel" id="panel-buurt" aria-labelledby="tab-buurt" hidden={activeTab !== 'buurt'} className="space-y-3">
          <TabContent content={weergaveData.buurtomschrijving} onSave={saveField('buurtomschrijving')} />
          {rewrite('buurtomschrijving')}
        </div>

        <div role="tabpanel" id="panel-openhuis" aria-labelledby="tab-openhuis" hidden={activeTab !== 'openhuis'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Open house announcement for Instagram/social' : 'Open huis-aankondiging voor Instagram/social'}
          </p>
          {extraPaneel('open_huis', 'openhuis', weergaveData.open_huis)}
        </div>

        <div role="tabpanel" id="panel-followup" aria-labelledby="tab-followup" hidden={activeTab !== 'followup'} className="space-y-4">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['positief', 'negatief'] as const).map(v => (
              <button
                key={v}
                onClick={() => setFollowupVariant(v)}
                style={{ padding: '5px 12px', fontSize: 13, borderRadius: 'var(--merk-radius-card-xl, 20px)', border: '1px solid', cursor: 'pointer', background: followupVariant === v ? 'var(--merk)' : '#fff', color: followupVariant === v ? 'var(--merk-op)' : '#5C6470', borderColor: followupVariant === v ? 'var(--merk)' : '#E1E5E9' }}
              >
                {v === 'positief'
                  ? (isEn ? 'Interested buyer' : 'Geïnteresseerde koper')
                  : (isEn ? 'Not interested' : 'Niet geïnteresseerd')}
              </button>
            ))}
          </div>
          {followupVariant === 'positief'
            ? extraPaneel('followup_positief', 'followup', weergaveData.followup_positief)
            : extraPaneel('followup_negatief', 'followup', weergaveData.followup_negatief)}
        </div>

        <div role="tabpanel" id="panel-video" aria-labelledby="tab-video" hidden={activeTab !== 'video'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Voice-over script for property video (±60 seconds)' : 'Voice-over script voor woningvideo (±60 seconden)'}
          </p>
          {extraPaneel('video_script', 'video', weergaveData.video_script, { wordCount: true })}
        </div>

        <div role="tabpanel" id="panel-kopersvragen" aria-labelledby="tab-kopersvragen" hidden={activeTab !== 'kopersvragen'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Frequently asked questions from buyers — ready to share or export as PDF' : 'Veelgestelde vragen van kopers — klaar om te delen of als PDF te exporteren'}
          </p>
          {extraPaneel('kopersvragen_faq', 'kopersvragen', weergaveData.kopersvragen_faq, { wordCount: true })}
        </div>

        <div role="tabpanel" id="panel-energieadvies" aria-labelledby="tab-energieadvies" hidden={activeTab !== 'energieadvies'} className="space-y-3">
          <p className="text-xs text-gray-400">
            {isEn ? 'Energy advice and subsidy overview based on the energy label' : 'Energieadvies en subsidieoverzicht op basis van het energielabel'}
          </p>
          {extraPaneel('energie_advies', 'energieadvies', weergaveData.energie_advies, { wordCount: true })}
        </div>
      </div>
    </div>
  )
}

// EXTRA_TYPES wordt hier niet direct gebruikt maar geïmporteerd zodat een
// wijziging in de lijst van extra-types in lib/contentExtra.ts een duidelijke
// build-fout geeft als EXTRA_MENU hierboven niet is bijgewerkt.
void (EXTRA_TYPES satisfies readonly ExtraType[])
