'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PLAN_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  starter: { label: 'Starter', bg: '#F1F7F3', color: '#2A8A5C' },
  pro:     { label: 'Pro',     bg: '#E3F0E8', color: '#1A6B45' },
  kantoor: { label: 'Kantoor', bg: '#D5E8DD', color: '#114230' },
}

type IconName = 'objecten' | 'kalender' | 'huisstijl' | 'chatbot' | 'instellingen'

function NavIcon({ name }: { name: IconName }) {
  const common = { width: 19, height: 19, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.6 as const }
  switch (name) {
    case 'objecten':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" /></svg>
    case 'kalender':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>
    case 'huisstijl':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v10l-7 4-7-4V7l7-4zM12 12l7-4M12 12v9M12 12L5 8" /></svg>
    case 'chatbot':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8 8 0 01-8 8H7l-4 3V12a8 8 0 018-8h2a8 8 0 018 8z" /></svg>
    case 'instellingen':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  }
}

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Objecten', icon: 'objecten' },
  { href: '/kalender', label: 'Kalender', icon: 'kalender' },
  { href: '/huisstijl', label: 'Huisstijl', icon: 'huisstijl' },
  { href: '/chatbot', label: 'Chatbot', icon: 'chatbot' },
  { href: '/settings', label: 'Instellingen', icon: 'instellingen' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || (pathname.startsWith('/object/') && !pathname.endsWith('/new'))
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export function AppShell({
  children,
  kantoorNaam,
  logoUrl,
  plan,
  userEmail,
}: {
  children: React.ReactNode
  kantoorNaam: string | null
  logoUrl: string | null
  plan: string | null
  userEmail: string | null
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const planInfo = plan ? PLAN_LABELS[plan] : null

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={kantoorNaam ?? 'VestaAI'} style={{ height: 28, maxWidth: 150, objectFit: 'contain' }} />
  ) : (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(26,107,69,.28)', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-.04em' }}>V</span>
      </span>
      <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em', color: '#0E1A13' }}>
        Vesta<span style={{ color: '#1A6B45' }}>AI</span>
      </span>
    </span>
  )

  const navList = (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {NAV.map(({ href, label, icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10,
              fontSize: 14.5, fontWeight: active ? 700 : 500,
              color: active ? '#1A6B45' : '#5A6B61',
              background: active ? '#EAF5EE' : 'transparent',
              textDecoration: 'none', transition: 'background .15s, color .15s',
            }}
          >
            <NavIcon name={icon} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const sidebarInner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '22px 16px' }}>
      <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none', padding: '0 6px', marginBottom: 22, display: 'block' }}>
        {logo}
      </Link>

      <Link
        href="/object/new"
        onClick={() => setMobileOpen(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 11, background: '#1A6B45', padding: '11px 16px',
          fontSize: 14.5, fontWeight: 700, color: '#fff', textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(26,107,69,.22)', marginBottom: 22,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span> Nieuw object
      </Link>

      {navList}

      <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid #EAF0EC' }}>
        {planInfo && (
          <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: planInfo.bg, color: planInfo.color, letterSpacing: '.02em', marginBottom: 12 }}>
            {planInfo.label}
          </span>
        )}
        {userEmail && (
          <p style={{ fontSize: 12.5, color: '#9AA6A0', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={userEmail}>
            {userEmail}
          </p>
        )}
        <form action="/api/auth/logout" method="POST">
          <button type="submit" style={{ fontSize: 13.5, fontWeight: 600, color: '#5A6B61', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Uitloggen
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      <style>{`
        .app-sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 244px; background: #FBFCFB; border-right: 1px solid #E9EFEB; z-index: 40; }
        .app-content { margin-left: 244px; min-height: 100vh; }
        .app-topbar { display: none; }
        .app-backdrop { display: none; }
        @media (max-width: 880px) {
          .app-sidebar { transform: translateX(-100%); transition: transform .22s ease; box-shadow: 0 20px 60px -20px rgba(14,26,19,.4); }
          .app-sidebar.open { transform: translateX(0); }
          .app-content { margin-left: 0; }
          .app-topbar { display: flex; }
          .app-backdrop.open { display: block; }
        }
      `}</style>

      {/* Mobile top bar */}
      <header className="app-topbar" style={{ position: 'sticky', top: 0, zIndex: 30, alignItems: 'center', justifyContent: 'space-between', height: 60, padding: '0 18px', background: 'rgba(251,252,251,.94)', backdropFilter: 'saturate(150%) blur(14px)', borderBottom: '1px solid #E9EFEB' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>{logo}</Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Menu openen"
          style={{ cursor: 'pointer', width: 42, height: 42, border: '1px solid #DCE5E0', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 2, background: '#0E1A13', borderRadius: 2 }} />)}
          </span>
        </button>
      </header>

      {/* Mobile backdrop */}
      <div
        className={`app-backdrop${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(14,26,19,.28)', zIndex: 39 }}
      />

      <aside className={`app-sidebar${mobileOpen ? ' open' : ''}`}>
        {sidebarInner}
      </aside>

      <div className="app-content">{children}</div>
    </div>
  )
}
