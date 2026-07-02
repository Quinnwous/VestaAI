'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

// Button-gated e-mailbevestiging (aanmelden). Net als de reset-pagina verifiëren
// we het token pas na een klik, zodat e-mailscanners (die geen knop indrukken)
// het eenmalige token niet opeten. Na succes: sessie staat → door naar dashboard,
// waar het makelaar-record via de self-heal wordt aangemaakt.
type Phase = 'checking' | 'confirm' | 'verifying' | 'done' | 'expired'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('checking')
  const [errorMsg, setErrorMsg] = useState('')
  const tokenRef = useRef<{ tokenHash: string | null; type: EmailOtpType }>({ tokenHash: null, type: 'signup' })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = (searchParams.get('type') as EmailOtpType | null) ?? 'signup'
    if (tokenHash) {
      tokenRef.current = { tokenHash, type }
      window.history.replaceState({}, '', '/auth/verify')
      setPhase('confirm')
    } else {
      setPhase('expired')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfirm = async () => {
    const { tokenHash, type } = tokenRef.current
    if (!tokenHash) { setPhase('expired'); return }
    setPhase('verifying')
    setErrorMsg('')
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      setErrorMsg(error.message || 'Verificatie mislukt.')
      setPhase('expired')
    } else {
      setPhase('done')
      setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1200)
    }
  }

  const primaryBtn: React.CSSProperties = {
    display: 'inline-block', borderRadius: 11, background: '#1A6B45', padding: '13px 24px',
    fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none', border: 'none',
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,107,69,.22)',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FBFCFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,107,69,.28)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-.04em' }}>V</span>
            </span>
            <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: '#0E1A13' }}>
              Vesta<span style={{ color: '#1A6B45' }}>AI</span>
            </span>
          </Link>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E4EAE6', padding: '36px 32px', boxShadow: '0 4px 24px rgba(14,26,19,.06)', textAlign: 'center' }}>
          {phase === 'checking' || phase === 'verifying' ? (
            <p style={{ fontSize: 15, color: '#5A6B61', padding: '12px 0' }}>
              {phase === 'verifying' ? 'Bevestigen…' : 'Even geduld…'}
            </p>

          ) : phase === 'done' ? (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 10 }}>E-mailadres bevestigd</h2>
              <p style={{ fontSize: 14, color: '#5A6B61' }}>U wordt doorgestuurd naar uw dashboard…</p>
            </>

          ) : phase === 'expired' ? (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Link verlopen</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: errorMsg ? 12 : 24 }}>
                Deze bevestigingslink is verlopen of al gebruikt.
              </p>
              {errorMsg && (
                <p style={{ fontSize: 12, color: '#9AA6A0', marginBottom: 24, fontFamily: 'monospace', background: '#F1F7F3', padding: '8px 12px', borderRadius: 8 }}>
                  {errorMsg}
                </p>
              )}
              <Link href="/login" style={primaryBtn}>Naar inloggen →</Link>
            </>

          ) : (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Bevestig je e-mailadres</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 24 }}>
                Klik op de knop om je account te activeren en verder te gaan.
              </p>
              <button type="button" onClick={handleConfirm} style={primaryBtn}>
                Ga verder →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
