'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const supabase = supabaseConfigured
    ? createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
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
          {!supabaseConfigured ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#D97706">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13', marginBottom: 8 }}>Auth nog niet geconfigureerd</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', marginBottom: 20, lineHeight: 1.6 }}>
                Vul <code style={{ background: '#F1F7F3', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>NEXT_PUBLIC_SUPABASE_URL</code> en{' '}
                <code style={{ background: '#F1F7F3', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
                in in <code style={{ background: '#F1F7F3', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>.env.local</code>.
              </p>
              <Link
                href="/object/new"
                style={{ display: 'inline-block', borderRadius: 11, background: '#1A6B45', padding: '11px 22px', fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}
              >
                Toch verder in dev-modus →
              </Link>
            </div>
          ) : status === 'sent' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#1A6B45">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 10 }}>Controleer uw inbox</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', lineHeight: 1.6 }}>
                Een inloglink is verstuurd naar <strong style={{ color: '#0E1A13' }}>{email}</strong>.
                Klik op de link in de e-mail om in te loggen.
              </p>
              <button
                onClick={() => setStatus('idle')}
                style={{ marginTop: 20, fontSize: 14, color: '#1A6B45', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Andere e-mail proberen
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E1A13', marginBottom: 24 }}>Inloggen</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0E1A13', marginBottom: 6 }}>
                    E-mailadres
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="naam@kantoor.nl"
                    style={{ width: '100%', borderRadius: 11, border: '1px solid #DCE5DF', padding: '11px 14px', fontSize: 15, color: '#0E1A13', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#1A6B45')}
                    onBlur={e => (e.target.style.borderColor = '#DCE5DF')}
                  />
                </div>

                {status === 'error' && (
                  <p style={{ fontSize: 14, color: '#DC2626' }}>{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  style={{ borderRadius: 11, background: '#1A6B45', padding: '13px 0', fontSize: 15, fontWeight: 700, color: '#fff', border: 'none', cursor: status === 'loading' || !email ? 'not-allowed' : 'pointer', opacity: status === 'loading' || !email ? .55 : 1, boxShadow: '0 4px 12px rgba(26,107,69,.22)', transition: 'opacity .15s' }}
                >
                  {status === 'loading' ? 'Bezig...' : 'Stuur inloglink →'}
                </button>
              </form>

              <p style={{ marginTop: 24, fontSize: 13, textAlign: 'center', color: '#9AA6A0' }}>
                Nog geen account?{' '}
                <Link href="/" style={{ color: '#1A6B45', textDecoration: 'underline' }}>
                  Bekijk VestaAI
                </Link>
                {' '}en start uw proefperiode.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
