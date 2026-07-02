'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

// Fasen van de reset-flow. Belangrijk: bij een token_hash/code in de URL
// verifiëren we NIET automatisch, maar pas nadat de gebruiker op de knop klikt.
// E-mailscanners (ook JS-uitvoerende corporate scanners) klikken niet, dus het
// eenmalige token blijft intact tot de échte gebruiker doorklikt.
type Phase = 'checking' | 'confirm' | 'verifying' | 'form' | 'saving' | 'expired' | 'success'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [phase, setPhase] = useState<Phase>('checking')
  const [errorMsg, setErrorMsg] = useState('')

  // Token uit de URL bewaren zodat we pas op klik verifiëren.
  const tokenRef = useRef<{ tokenHash: string | null; type: EmailOtpType; code: string | null }>({
    tokenHash: null,
    type: 'recovery',
    code: null,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = (searchParams.get('type') as EmailOtpType | null) ?? 'recovery'
    const code = searchParams.get('code')

    // Er zit een token/code in de link → wacht op klik van de gebruiker.
    if (tokenHash || code) {
      tokenRef.current = { tokenHash, type, code }
      // Token uit de adresbalk halen (netjes + voorkomt per ongeluk delen).
      window.history.replaceState({}, '', '/auth/reset-password')
      setPhase('confirm')
      return
    }

    // Geen token in de URL: misschien is er al een recovery-sessie (bv. implicit
    // flow die de sessie in de hash zette). Controleer dat voordat we opgeven.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setPhase('form')
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPhase('form')
      } else if (!window.location.hash.includes('access_token')) {
        setPhase('expired')
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Verifieer het token pas op expliciete klik van de gebruiker.
  const handleConfirm = async () => {
    const { tokenHash, type, code } = tokenRef.current
    setPhase('verifying')
    setErrorMsg('')

    const { error } = tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error('Geen geldig token gevonden.') }

    if (error) {
      setErrorMsg(error.message || 'Verificatie mislukt.')
      setPhase('expired')
    } else {
      setPhase('form')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phase !== 'form') return
    if (password !== passwordConfirm) {
      setErrorMsg('Wachtwoorden komen niet overeen.')
      return
    }
    if (password.length < 8) {
      setErrorMsg('Wachtwoord moet minimaal 8 tekens zijn.')
      return
    }
    setPhase('saving')
    setErrorMsg('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message)
      setPhase('form')
    } else {
      setPhase('success')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 11,
    border: '1px solid #DCE5DF',
    padding: '11px 14px',
    fontSize: 15,
    color: '#0E1A13',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const primaryBtn: React.CSSProperties = {
    display: 'inline-block',
    borderRadius: 11,
    background: '#1A6B45',
    padding: '13px 24px',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(26,107,69,.22)',
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

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E4EAE6', padding: '36px 32px', boxShadow: '0 4px 24px rgba(14,26,19,.06)' }}>
          {phase === 'success' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 10 }}>Wachtwoord opgeslagen</h2>
              <p style={{ fontSize: 14, color: '#5A6B61' }}>U wordt doorgestuurd naar uw dashboard…</p>
            </div>

          ) : phase === 'checking' || phase === 'verifying' ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: 15, color: '#5A6B61' }}>
                {phase === 'verifying' ? 'Link valideren…' : 'Even geduld…'}
              </p>
            </div>

          ) : phase === 'confirm' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Wachtwoord opnieuw instellen</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 24 }}>
                Klik op de knop om verder te gaan en een nieuw wachtwoord te kiezen.
              </p>
              <button type="button" onClick={handleConfirm} style={primaryBtn}>
                Ga verder →
              </button>
            </div>

          ) : phase === 'expired' ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Link verlopen</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: errorMsg ? 12 : 24 }}>
                Deze resetlink is verlopen of al gebruikt. Vraag een nieuwe aan.
              </p>
              {errorMsg && (
                <p style={{ fontSize: 12, color: '#9AA6A0', marginBottom: 24, fontFamily: 'monospace', background: '#F1F7F3', padding: '8px 12px', borderRadius: 8 }}>
                  {errorMsg}
                </p>
              )}
              <Link href="/login?mode=forgot" style={primaryBtn}>
                Nieuwe link aanvragen →
              </Link>
            </div>

          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Nieuw wachtwoord instellen</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 24 }}>Kies een nieuw wachtwoord van minimaal 8 tekens.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 6 }}>Nieuw wachtwoord</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="Minimaal 8 tekens"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#1A6B45')}
                    onBlur={e => (e.target.style.borderColor = '#DCE5DF')}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 6 }}>Bevestig wachtwoord</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#1A6B45')}
                    onBlur={e => (e.target.style.borderColor = '#DCE5DF')}
                  />
                </div>
                {errorMsg && (
                  <p style={{ fontSize: 14, color: '#DC2626', margin: 0 }}>{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={phase === 'saving'}
                  style={{ borderRadius: 11, background: '#1A6B45', padding: '13px 0', fontSize: 15, fontWeight: 700, color: '#fff', border: 'none', cursor: phase === 'saving' ? 'not-allowed' : 'pointer', opacity: phase === 'saving' ? .55 : 1, boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}
                >
                  {phase === 'saving' ? 'Bezig...' : 'Wachtwoord opslaan →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
