'use client'

import { useState, useRef, useEffect } from 'react'

interface TabContentProps {
  label?: string
  content: string
  wordCount?: boolean
  wordLimit?: number
  charLimit?: number
  onSave?: (nieuweTekst: string) => void
}

export function TabContent({ label, content, wordCount, wordLimit, charLimit, onSave }: TabContentProps) {
  const [copied, setCopied] = useState(false)
  const [bewerkModus, setBewerkModus] = useState(false)
  const [bewerkTekst, setBewerkTekst] = useState(content)
  const [opslaan, setOpslaan] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setBewerkTekst(content)
  }, [content])

  useEffect(() => {
    if (bewerkModus && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [bewerkModus])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!onSave) return
    setOpslaan(true)
    await onSave(bewerkTekst)
    setOpslaan(false)
    setBewerkModus(false)
  }

  const handleCancel = () => {
    setBewerkTekst(content)
    setBewerkModus(false)
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBewerkTekst(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const weergaveTekst = bewerkModus ? bewerkTekst : content
  const words = weergaveTekst.trim().split(/\s+/).length
  const chars = weergaveTekst.length
  const overLimit = charLimit ? chars > charLimit : false
  const nearLimit = charLimit ? chars > charLimit * 0.9 : false

  const btnBase: React.CSSProperties = { fontSize: 12, padding: '5px 10px', borderRadius: 'var(--merk-radius-sm, 8px)', border: '1px solid #E1E5E9', background: '#fff', cursor: 'pointer', color: '#5C6470', transition: 'all .15s' }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        {label && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#98A0A6', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {wordCount && wordLimit && (
            <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: words > wordLimit ? '#DC2626' : words > wordLimit * 0.9 ? '#D97706' : '#98A0A6', fontWeight: words > wordLimit ? 700 : 400 }}>
              {words}/{wordLimit} woorden{words > wordLimit ? ' — te lang!' : ''}
            </span>
          )}
          {wordCount && !wordLimit && (
            <span style={{ fontSize: 12, color: '#98A0A6' }}>{words} woorden</span>
          )}
          {charLimit && (
            <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: overLimit ? '#DC2626' : nearLimit ? '#D97706' : '#98A0A6' }}>
              {chars.toLocaleString('nl-NL')}/{charLimit.toLocaleString('nl-NL')} tekens{overLimit ? ' — te lang!' : ''}
            </span>
          )}

          {bewerkModus ? (
            <>
              <button onClick={handleCancel} style={btnBase}>Annuleer</button>
              <button
                onClick={handleSave}
                disabled={opslaan}
                style={{ ...btnBase, background: 'var(--merk)', color: '#fff', border: '1px solid var(--merk)', opacity: opslaan ? .6 : 1 }}
              >
                {opslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCopy} style={{ ...btnBase, color: copied ? 'var(--merk)' : '#5C6470' }}>
                {copied ? '✓ Gekopieerd' : 'Kopieer'}
              </button>
              {onSave && (
                <button
                  onClick={() => setBewerkModus(true)}
                  style={btnBase}
                  title="Tekst handmatig bewerken"
                >
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Bewerk
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {bewerkModus ? (
        <textarea
          ref={textareaRef}
          value={bewerkTekst}
          onChange={handleTextareaInput}
          style={{ width: '100%', borderRadius: 'var(--merk-radius-card, 16px)', border: `1px solid ${overLimit ? '#FCA5A5' : 'var(--merk)'}`, background: '#fff', padding: '22px 24px', fontSize: 14.5, color: '#14181B', lineHeight: 1.72, outline: 'none', resize: 'none', minHeight: 200, boxSizing: 'border-box' }}
        />
      ) : (
        <div style={{ borderRadius: 'var(--merk-radius-card, 16px)', border: `1px solid ${overLimit ? '#FCA5A5' : '#E6E9EC'}`, background: '#fff', padding: '22px 24px', fontSize: 14.5, color: '#2C3238', whiteSpace: 'pre-wrap', lineHeight: 1.72, boxShadow: '0 2px 12px rgba(20,24,27,.04)' }}>
          {content}
        </div>
      )}
    </div>
  )
}
