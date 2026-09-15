'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Gesloten platform (sinds 15 sep 2026): geen self-serve "Aanmelden" meer.
// Nieuwe accounts zet de platform-admin klaar bij een kantoor (/admin); bestaande
// teamleden worden ván daaruit binnen hun eigen kantoor uitgenodigd (zie
// app/(app)/settings/actions.ts → nodigTeamlidUit, die loopt via /auth/verify).
type Mode = 'login' | 'forgot'
type Status = 'idle' | 'loading' | 'success' | 'error'

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

const btnPrimary: React.CSSProperties = {
  width: '100%',
  borderRadius: 11,
  background: '#1A6B45',
  padding: '13px 0',
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(26,107,69,.22)',
  transition: 'opacity .15s',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (searchParams.get('mode') === 'forgot') setMode('forgot')
  }, [searchParams])

  const supabase = supabaseConfigured
    ? createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    : null

  const resetForm = (newMode: Mode) => {
    setMode(newMode)
    setStatus('idle')
    setErrorMsg('')
    setPassword('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg(
        error.message === 'Invalid login credentials'
          ? 'E-mailadres of wachtwoord klopt niet.'
          : error.message,
      )
      setStatus('error')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      console.error('[forgot] resetPasswordForEmail error:', JSON.stringify(error))
      const msg = error.message && error.message !== '{}'
        ? error.message
        : 'Te veel pogingen. Wacht een paar minuten en probeer opnieuw.'
      setErrorMsg(msg)
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FBFCFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,107,69,.28)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-.04em' }}>V</span>
            </span>
            <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: '#0E1A13' }}>
              Vesta<span style={{ color: '#1A6B45' }}>AI</span>
            </span>
          </Link>
          <p style={{ marginTop: 12, fontSize: 14, color: '#5A6B61' }}>
            Woningwaardering voor makelaars.
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E4EAE6', padding: '36px 32px', boxShadow: '0 4px 24px rgba(14,26,19,.06)' }}>

          {/* Dev mode */}
          {!supabaseConfigured ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Auth niet geconfigureerd</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 20 }}>
                Stel <code>NEXT_PUBLIC_SUPABASE_URL</code> en <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in.
              </p>
              <Link href="/object/new" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none', padding: '11px 22px' }}>
                Verder in dev-modus →
              </Link>
            </div>

          ) : mode === 'forgot' && status === 'success' ? (
            /* Na wachtwoord-reset aanvraag */
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 10 }}>E-mail verstuurd</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', lineHeight: 1.6 }}>
                Check uw inbox voor een link om uw wachtwoord opnieuw in te stellen.
              </p>
              <button
                onClick={() => resetForm('login')}
                style={{ marginTop: 24, fontSize: 14, color: '#1A6B45', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Terug naar inloggen
              </button>
            </div>

          ) : (
            <>
              {/* Inloggen */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 6 }}>E-mailadres</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                      placeholder="uw@emailadres.nl"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#1A6B45')}
                      onBlur={e => (e.target.style.borderColor = '#DCE5DF')}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: '#0E1A13' }}>Wachtwoord</label>
                      <button
                        type="button"
                        onClick={() => resetForm('forgot')}
                        style={{ fontSize: 13, color: '#1A6B45', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Vergeten?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
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
                    disabled={status === 'loading'}
                    style={{ ...btnPrimary, opacity: status === 'loading' ? .55 : 1, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}
                  >
                    {status === 'loading' ? 'Bezig...' : 'Inloggen →'}
                  </button>
                  <p style={{ fontSize: 12.5, color: '#9AA6A0', textAlign: 'center', margin: 0 }}>
                    Nog geen toegang? <Link href="/contact" style={{ color: '#1A6B45', fontWeight: 600 }}>Neem contact op</Link>.
                  </p>
                </form>
              )}

              {/* Wachtwoord vergeten */}
              {mode === 'forgot' && (
                <>
                  <button
                    onClick={() => resetForm('login')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#5A6B61', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}
                  >
                    ← Terug
                  </button>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Wachtwoord vergeten</h2>
                  <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 24, lineHeight: 1.5 }}>
                    Vul uw e-mailadres in. U ontvangt een link om een nieuw wachtwoord in te stellen.
                  </p>
                  <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 6 }}>E-mailadres</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                        placeholder="uw@emailadres.nl"
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
                      disabled={status === 'loading'}
                      style={{ ...btnPrimary, opacity: status === 'loading' ? .55 : 1, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}
                    >
                      {status === 'loading' ? 'Bezig...' : 'Reset-link versturen →'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
