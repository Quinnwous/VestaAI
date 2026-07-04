'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/prijzen', label: 'Prijzen' },
  { href: '/over-ons', label: 'Over ons' },
  { href: '/contact', label: 'Contact' },
]

export function PublicNav({ active }: { active?: string }) {
  const [open, setOpen] = useState(false)
  const [ingelogd, setIngelogd] = useState(false)

  // Lichtgewicht auth-check via /api/me zodat deze marketingpagina's statisch blijven
  // (geen Supabase-client in de bundel). Ingelogd → "Naar dashboard" i.p.v. "Inloggen".
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then((d: { ingelogd?: boolean }) => setIngelogd(!!d.ingelogd))
      .catch(() => {})
  }, [])

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(251,252,251,.9)', backdropFilter: 'saturate(150%) blur(14px)', borderBottom: '1px solid #E4EAE6' }}>
      <style>{`
        .pnav-links { display: flex; align-items: center; gap: 30px; }
        .pnav-login { display: block; }
        .pnav-ham  { display: none; }
        @media (max-width: 680px) {
          .pnav-links { display: none !important; }
          .pnav-login { display: none !important; }
          .pnav-ham  { display: block !important; }
        }
      `}</style>
      <nav style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(26,107,69,.28)', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 19, letterSpacing: '-.04em' }}>V</span>
          </span>
          <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-.02em', color: '#0E1A13' }}>
            Vesta<span style={{ color: '#1A6B45' }}>AI</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Desktop links */}
          <div className="pnav-links">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} style={{ fontSize: 15, fontWeight: active === href ? 600 : 500, color: active === href ? '#1A6B45' : '#5A6B61', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>

          {ingelogd ? (
            /* Ingelogd: rechtstreeks naar het dashboard */
            <Link href="/dashboard" style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: '10px 18px', borderRadius: 11, textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}>
              Naar dashboard
            </Link>
          ) : (
            <>
              {/* Desktop: Inloggen */}
              <Link href="/login" className="pnav-login" style={{ fontSize: 15, fontWeight: 600, color: '#0E1A13', textDecoration: 'none' }}>
                Inloggen
              </Link>

              {/* Desktop: CTA */}
              <Link href="/prijzen" style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', background: '#1A6B45', padding: '10px 18px', borderRadius: 11, textDecoration: 'none', boxShadow: '0 4px 12px rgba(26,107,69,.22)' }}>
                Gratis starten
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <div className="pnav-ham" style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(v => !v)}
              aria-label="Menu"
              style={{ cursor: 'pointer', width: 42, height: 42, border: '1px solid #DCE5E0', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 2, background: '#0E1A13', borderRadius: 2 }} />)}
              </span>
            </button>
            {open && (
              <div style={{ position: 'absolute', right: 0, top: 52, background: '#fff', border: '1px solid #E4EAE6', borderRadius: 14, boxShadow: '0 18px 40px -20px rgba(14,26,19,.3)', padding: 10, width: 210, display: 'flex', flexDirection: 'column', gap: 2, zIndex: 60 }}>
                {[...NAV_LINKS, ingelogd ? { href: '/dashboard', label: 'Naar dashboard' } : { href: '/login', label: 'Inloggen' }].map(({ href, label }) => (
                  <Link key={href + label} href={href} onClick={() => setOpen(false)} style={{ padding: '11px 12px', borderRadius: 9, fontSize: 15, fontWeight: 600, color: '#0E1A13', textDecoration: 'none', display: 'block' }}>
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
