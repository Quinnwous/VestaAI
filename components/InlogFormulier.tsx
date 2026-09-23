'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Branding } from '@/lib/branding'
import { brandingCssVars } from '@/lib/branding'
import { bouwLoginSlugCookie } from '@/lib/loginSlugCookie'

/**
 * Gedeelde inlogcomponent (item 9.1) — vervangt de vroeger gedupliceerde
 * `/login`-pagina. Twee smaken via één prop:
 *
 * - `branding` leeg (`null`): de generieke, vaste VestaAI-groene `/login` —
 *   pixel-identiek aan vóór dit item. Kleur/vorm-variabelen die deze
 *   component gebruikt (`var(--merk*, <fallback>)`) resolven dan naar hun
 *   letterlijke fallback, want er is geen kantoor-wrapper die ze overschrijft
 *   én `app/globals.css` zet exact diezelfde VestaAI-waarden als `:root`-vangnet.
 * - `branding` gevuld: `/login/[slug]`, de kantoorspecifieke inlogpagina —
 *   `brandingCssVars(branding)` op de wrapper zet kleur, vorm en lettertype
 *   van het kantoor, dezelfde CSS-variabelen als de ingelogde omgeving.
 *
 * Wachtwoord-reset zit in dezelfde component (geen aparte pagina) — zo blijft
 * er precies één plek met inlog-/reset-logica, in plaats van een kopie per
 * kantoor.
 */

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type Mode = 'login' | 'forgot'
type Status = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  /** `null` = generieke VestaAI-login. Gevuld = kantoorhuisstijl (/login/[slug]). */
  branding: Branding | null
  /** Alleen relevant als `branding` gevuld is — de slug uit de URL. */
  slug?: string
}

export function InlogFormulier({ branding, slug }: Props) {
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

  /**
   * Onthoudt de kantoor-slug voor na het uitloggen (item 9.1). Kwam je via
   * `/login/<slug>` binnen, dan weten we 'm al. Kwam je via de generieke
   * `/login`, dan vragen we 'm na — als het eigen kantoor er een heeft, komt
   * je vólgende uitlog-actie alsnog op je eigen inlogpagina uit. Blokkeert
   * de redirect niet: dit is puur comfort, geen kritiek pad.
   */
  const onthoudSlugNaLogin = () => {
    if (slug) {
      document.cookie = bouwLoginSlugCookie(slug)
      return
    }
    fetch('/api/mijn-kantoor-slug')
      .then(res => (res.ok ? res.json() : null))
      .then((data: { slug?: string | null } | null) => {
        if (data?.slug) document.cookie = bouwLoginSlugCookie(data.slug)
      })
      .catch(() => {})
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
      onthoudSlugNaLogin()
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

  const naam = branding?.naam ?? 'VestaAI'
  const logoUrl = branding?.logoUrl ?? null
  const achtergrondUrl = branding?.achtergrondUrl ?? null
  const tagline = branding ? `Log in op je omgeving.` : 'Woningwaardering voor makelaars.'

  // Kleuren/vorm lopen altijd via var(--merk*, <letterlijke VestaAI-fallback>):
  // zonder branding-wrapper (generieke /login) resolven ze naar exact de oude
  // hardgecodeerde waarden; mét wrapper (kantoorlogin) naar de kantoorstijl.
  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--merk-radius-md, 11px)',
    border: '1px solid #DCE5DF',
    padding: '11px 14px',
    fontSize: 15,
    color: '#0E1A13',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--merk-radius-md, 11px)',
    background: 'var(--merk, #1A6B45)',
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--merk-op, #fff)',
    border: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--merk-shadow-btn, 0 4px 12px rgba(26,107,69,.22))',
    transition: 'opacity .15s',
    fontFamily: 'inherit',
  }

  const focusAan = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--merk, #1A6B45)' }
  const focusUit = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#DCE5DF' }

  return (
    <div
      style={{
        ...(branding ? brandingCssVars(branding) : {}),
        minHeight: '100vh',
        background: '#FBFCFB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: branding ? 'var(--merk-font-body, inherit)' : undefined,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {branding ? (
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={naam}
                  style={{ maxHeight: 48, maxWidth: 220, objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: '#0E1A13' }}>{naam}</span>
              )}
            </div>
          ) : (
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,107,69,.28)' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-.04em' }}>V</span>
              </span>
              <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: '#0E1A13' }}>
                Vesta<span style={{ color: '#1A6B45' }}>AI</span>
              </span>
            </Link>
          )}
          <p style={{ marginTop: 12, fontSize: 14, color: '#5A6B61' }}>
            {tagline}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 'var(--merk-radius-card-lg, 20px)', border: '1px solid #E4EAE6', overflow: 'hidden', boxShadow: 'var(--merk-shadow-card, 0 4px 24px rgba(14,26,19,.06))' }}>

          {/* Sfeerbeeld van het kantoor — alleen op de kantoorlogin, alleen als gezet. */}
          {branding && achtergrondUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={achtergrondUrl}
              alt=""
              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}

          <div style={{ padding: '36px 32px' }}>

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
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--merk-zacht, #EAF5EE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--merk, #1A6B45)">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', marginBottom: 10 }}>E-mail verstuurd</h2>
              <p style={{ fontSize: 14, color: '#5A6B61', lineHeight: 1.6 }}>
                Check uw inbox voor een link om uw wachtwoord opnieuw in te stellen.
              </p>
              <button
                onClick={() => resetForm('login')}
                style={{ marginTop: 24, fontSize: 14, color: 'var(--merk, #1A6B45)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
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
                      onFocus={focusAan}
                      onBlur={focusUit}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: '#0E1A13' }}>Wachtwoord</label>
                      <button
                        type="button"
                        onClick={() => resetForm('forgot')}
                        style={{ fontSize: 13, color: 'var(--merk, #1A6B45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
                      onFocus={focusAan}
                      onBlur={focusUit}
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
                    Nog geen toegang? <Link href="/contact" style={{ color: 'var(--merk, #1A6B45)', fontWeight: 600 }}>Neem contact op</Link>.
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
                        onFocus={focusAan}
                        onBlur={focusUit}
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
    </div>
  )
}
