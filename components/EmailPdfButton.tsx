'use client'

import { useState } from 'react'

interface Props {
  objectId: string
  userEmail?: string
}

export function EmailPdfButton({ objectId, userEmail }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(userEmail ?? '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSend() {
    if (!email) return
    setStatus('sending')
    try {
      const res = await fetch(`/api/object/${objectId}/email-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Verzenden mislukt')
        setStatus('error')
      } else {
        setStatus('done')
        setTimeout(() => { setOpen(false); setStatus('idle') }, 2500)
      }
    } catch {
      setErrorMsg('Netwerkfout')
      setStatus('error')
    }
  }

  const btnBase: React.CSSProperties = {
    borderRadius: 10,
    border: '1px solid #E4EAE6',
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'border-color .15s',
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setStatus('idle') }}
        style={{ ...btnBase, background: open ? '#F1F7F3' : '#fff', borderColor: open ? '#1A6B45' : '#E4EAE6', color: '#0E1A13' }}
        title="PDF per e-mail versturen"
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        PDF mailen
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 30, background: '#fff', border: '1px solid #E4EAE6', borderRadius: 14, boxShadow: '0 12px 32px rgba(14,26,19,.12)', padding: 16, minWidth: 280 }}>
          {status === 'done' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1A6B45', fontSize: 13, fontWeight: 600 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              PDF verstuurd naar {email}
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#5A6B61', marginBottom: 8 }}>Stuur PDF-brochure naar:</p>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setStatus('idle') }}
                placeholder="naam@kantoor.nl"
                style={{ width: '100%', borderRadius: 9, border: '1px solid #DCE5DF', padding: '9px 12px', fontSize: 13, color: '#0E1A13', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              />
              {status === 'error' && (
                <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 6 }}>{errorMsg}</p>
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={!email || status === 'sending'}
                style={{ width: '100%', borderRadius: 9, background: '#1A6B45', color: '#fff', border: 'none', padding: '9px', fontSize: 13, fontWeight: 700, cursor: status === 'sending' ? 'wait' : 'pointer', opacity: (!email || status === 'sending') ? .6 : 1 }}
              >
                {status === 'sending' ? 'Verzenden…' : 'Verstuur PDF →'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
