'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const code = searchParams.get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setLinkExpired(true)
          return
        }
        setSessionReady(true)
        window.history.replaceState({}, '', '/auth/reset-password')
      })
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else if (!window.location.hash.includes('access_token')) {
        setLinkExpired(true)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionReady) return
    if (password !== passwordConfirm) {
      setErrorMsg('Wachtwoorden komen niet overeen.')
      setStatus('error')
      return
    }
    if (password.length < 8) {
      setErrorMsg('Wachtwoord moet minimaal 8 tekens zijn.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('success')
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
          {status === 'success' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 10 }}>Wachtwoord opgeslagen</h2>
              <p style={{ fontSize: 14, color: '#5A6B61' }}>U wordt doorgestuurd naar uw dashboard…</p>
            </div>
          ) : linkExpired ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Link verlopen</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 24 }}>Deze resetlink is verlopen of al gebruikt. Vraag een nieuwe aan.</p>
              <Link href="/login?mode=forgot" style={{ display: 'inline-block', borderRadius: 11, background: '#1A6B45', padding: '13px 24px', fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}>
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
                {status === 'error' && (
                  <p style={{ fontSize: 14, color: '#DC2626', margin: 0 }}>{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading' || !sessionReady}
                  style={{ borderRadius: 11, background: '#1A6B45', padding: '13px 0', fontSize: 15, fontWeight: 700, color: '#fff', border: 'none', cursor: (status === 'loading' || !sessionReady) ? 'not-allowed' : 'pointer', opacity: (status === 'loading' || !sessionReady) ? .55 : 1, boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}
                >
                  {status === 'loading' ? 'Bezig...' : 'Wachtwoord opslaan →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
