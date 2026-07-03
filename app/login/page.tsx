'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type Mode = 'login' | 'register' | 'forgot'
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
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [refCode, setRefCode] = useState<string | null>(null)

  useEffect(() => {
    const ref = searchParams.get('ref')
    const aanmelden = searchParams.get('aanmelden')
    const mode = searchParams.get('mode')
    if (ref) {
      setRefCode(ref.toUpperCase())
      setMode('register')
    } else if (aanmelden) {
      setMode('register')
    } else if (mode === 'forgot') {
      setMode('forgot')
    }
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
    setPasswordConfirm('')
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
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

    const confirmUrl = new URL(`${window.location.origin}/auth/verify`)
    if (refCode) confirmUrl.searchParams.set('ref', refCode)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmUrl.toString() },
    })

    if (error) {
      // Meest voorkomende oorzaak: Supabase kan de bevestigingsmail niet
      // versturen (bv. Resend-domein nog niet geverifieerd) → lege/`{}` of
      // "Error sending confirmation email". Toon dan een begrijpelijke melding.
      const raw = error.message ?? ''
      const isSendFailure = !raw || raw === '{}' || /sending|confirmation|smtp|email/i.test(raw)
      const msg = isSendFailure
        ? 'Er ging iets mis bij het versturen van de bevestigingsmail. Probeer het later opnieuw of neem contact op via quinn.berkouwer@gmail.com.'
        : raw
      setErrorMsg(msg)
      setStatus('error')
    } else {
      setStatus('success')
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
            De complete AI-toolkit voor makelaars.
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

          ) : mode === 'register' && status === 'success' ? (
            /* Na registratie: bevestigingsmail */
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 10 }}>Bevestig uw e-mailadres</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', lineHeight: 1.6 }}>
                We hebben een bevestigingslink gestuurd naar <strong style={{ color: '#0E1A13' }}>{email}</strong>. Klik op de link om uw account te activeren.
              </p>
              <button
                onClick={() => resetForm('login')}
                style={{ marginTop: 24, fontSize: 14, color: '#1A6B45', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Terug naar inloggen
              </button>
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
              {/* Tab-switcher (alleen login / aanmelden) */}
              {mode !== 'forgot' && (
                <div style={{ display: 'flex', background: '#F1F7F3', borderRadius: 12, padding: 4, marginBottom: 28 }}>
                  {(['login', 'register'] as Mode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => resetForm(m)}
                      style={{
                        flex: 1,
                        borderRadius: 9,
                        padding: '9px 0',
                        fontSize: 14,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: mode === m ? '#fff' : 'transparent',
                        color: mode === m ? '#0E1A13' : '#7A8C82',
                        boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                        transition: 'all .15s',
                      }}
                    >
                      {m === 'login' ? 'Inloggen' : 'Aanmelden'}
                    </button>
                  ))}
                </div>
              )}

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
                </form>
              )}

              {/* Aanmelden */}
              {mode === 'register' && (
                <>
                  {refCode ? (
                    <div style={{ background: '#EAF5EE', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#1A6B45', fontWeight: 600 }}>
                      Uitgenodigd via een doorverwijzing — u krijgt <strong>44 dagen</strong> gratis te proberen!
                    </div>
                  ) : (
                    <div style={{ background: '#EAF5EE', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#1A6B45', fontWeight: 600 }}>
                      30 dagen gratis proberen — geen creditcard nodig.
                    </div>
                  )}
                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 6 }}>Wachtwoord</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="Minimaal 8 tekens"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#1A6B45')}
                        onBlur={e => (e.target.style.borderColor = '#DCE5DF')}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 6 }}>Wachtwoord bevestigen</label>
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
                      disabled={status === 'loading'}
                      style={{ ...btnPrimary, opacity: status === 'loading' ? .55 : 1, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}
                    >
                      {status === 'loading' ? 'Bezig...' : 'Account aanmaken →'}
                    </button>
                    <p style={{ fontSize: 12, color: '#9AA6A0', textAlign: 'center', margin: 0 }}>
                      Door aan te melden gaat u akkoord met onze{' '}
                      <Link href="/privacy" style={{ color: '#1A6B45' }}>privacyverklaring</Link>.
                    </p>
                  </form>
                </>
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
