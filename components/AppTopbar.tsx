'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Branding } from '@/lib/branding'
import { CONTENT_VERGRENDELD } from '@/lib/features'

/**
 * Topbar van de ingelogde omgeving.
 *
 * Micro/macro-knip (vastgelegd 15 sep 2026, zie CLAUDE.md): Woningdossier is
 * de kern — alle content- en waarderingsmodules renderen op basis van één
 * geselecteerd adres (zie ObjectWorkspace). Marktinzichten staat daarnaast
 * omdat het regionaal is, los van één woning. Content is vergrendeld maar
 * zichtbaar — zie lib/features.ts. Kantoorinstellingen is de derde,
 * losstaande sectie.
 *
 * Alle merkkleuren komen uit CSS-variabelen (`--merk*`) die de (app)-layout zet,
 * zodat elk kantoor zijn eigen omgeving ziet.
 */

type Item = { href: string; label: string; hint?: string; slot?: boolean; binnenkort?: boolean }
type Menu = { id: string; label: string; slot?: boolean; items: Item[] }

// Hoofdstructuur (vastgelegd 15 sep 2026, zie CLAUDE.md): een duidelijke knip
// tussen "micro" (Woningdossier — object-specifiek, alles hangt onder één
// geselecteerd adres) en "macro" (Marktinzichten — regionaal, los van één
// woning). Kantoorinstellingen is de derde, losstaande sectie.
const MENUS: Menu[] = [
  {
    id: 'woningdossier',
    label: 'Woningdossier',
    items: [
      { href: '/dashboard', label: 'Alle woningen', hint: 'Het volledige woningdossier van uw kantoor' },
      { href: '/dashboard?status=actief', label: 'In verkoop', hint: 'Woningen die nu lopen' },
      { href: '/object/new', label: 'Woning toevoegen', hint: 'Acht velden — start direct een nieuw dossier' },
    ],
  },
  {
    id: 'marktinzichten',
    label: 'Marktinzichten',
    items: [
      { href: '/marktanalyse', label: 'Marktanalyse', hint: 'Macro-trends: prijsontwikkeling per type, wijk en periode' },
      { href: '/marktanalyse', label: 'Concurrentieanalyse', hint: 'Verkoopresultaten en marktaandeel vs. concurrenten', binnenkort: true },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    slot: CONTENT_VERGRENDELD,
    items: [
      { href: '/object/new', label: 'Brochure & Funda-tekst', slot: CONTENT_VERGRENDELD },
      { href: '/object/new', label: 'Social media-teksten', slot: CONTENT_VERGRENDELD },
      { href: '/object/new', label: 'Verkoopadvies & buurtrapport', slot: CONTENT_VERGRENDELD },
      { href: '/object/new', label: 'Virtual staging', slot: CONTENT_VERGRENDELD },
      { href: '/object/new', label: 'Documentenassistent', slot: CONTENT_VERGRENDELD },
    ],
  },
  {
    id: 'kantoorinstellingen',
    label: 'Kantoorinstellingen',
    items: [
      { href: '/huisstijl', label: 'Huisstijl', hint: 'Logo, kleuren en tone-of-voice van uw kantoor' },
      { href: '/settings', label: 'Kantoor & team', hint: 'Gebruikers, account en statistieken' },
    ],
  },
]

function Slotje({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  )
}

function menuIsActief(pathname: string, menu: Menu): boolean {
  if (menu.id === 'woningdossier') return pathname === '/dashboard' || pathname.startsWith('/object')
  if (menu.id === 'marktinzichten') return pathname.startsWith('/marktanalyse')
  if (menu.id === 'kantoorinstellingen') return pathname.startsWith('/settings') || pathname.startsWith('/huisstijl')
  return false
}

export function AppTopbar({
  children,
  branding,
  userEmail,
}: {
  children: React.ReactNode
  branding: Branding
  userEmail: string | null
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState<string | null>(null)
  const [mobiel, setMobiel] = useState(false)
  const [logoKapot, setLogoKapot] = useState(false)
  const balkRef = useRef<HTMLDivElement>(null)

  // Buiten de balk klikken of Escape sluit het geopende menu.
  useEffect(() => {
    if (!open) return
    const klik = (e: MouseEvent) => {
      if (balkRef.current && !balkRef.current.contains(e.target as Node)) setOpen(null)
    }
    const toets = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('mousedown', klik)
    document.addEventListener('keydown', toets)
    return () => {
      document.removeEventListener('mousedown', klik)
      document.removeEventListener('keydown', toets)
    }
  }, [open])

  // Navigeren sluit alles.
  useEffect(() => { setOpen(null); setMobiel(false) }, [pathname])

  // Laadt het logo niet (verlopen URL, bucket weg), dan valt hij terug op de merkletter —
  // nooit het gebroken-afbeelding-icoon van de browser.
  const logo = branding.logoUrl && !logoKapot ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoUrl}
      alt={branding.naam}
      onError={() => setLogoKapot(true)}
      style={{ height: 34, maxWidth: 190, objectFit: 'contain' }}
    />
  ) : (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 30, height: 30, borderRadius: 'var(--merk-radius-sm, 9px)', background: 'var(--merk)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color: 'var(--merk-op)', fontWeight: 800, fontSize: 16, letterSpacing: '-.04em' }}>
          {branding.naam.slice(0, 1).toUpperCase()}
        </span>
      </span>
      <span style={{ fontWeight: 750, fontSize: 16, letterSpacing: '-.02em', color: '#14181B' }}>{branding.naam}</span>
    </span>
  )

  const menuItems = (menu: Menu) => (
    <div
      role="menu"
      style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 6, minWidth: 268,
        background: '#fff', border: '1px solid #E6E9EC', borderRadius: 'var(--merk-radius-lg, 14px)',
        boxShadow: '0 18px 44px -12px rgba(20,24,27,.22)', padding: 6, zIndex: 60,
      }}
    >
      {menu.items.map((item, i) => {
        const geblokkeerd = item.slot || item.binnenkort
        const inhoud = (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: geblokkeerd ? '#98A0A6' : '#14181B' }}>{item.label}</span>
              {item.slot && <span style={{ color: '#98A0A6', display: 'flex' }}><Slotje /></span>}
              {item.binnenkort && (
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--merk)', background: 'var(--merk-zacht)', borderRadius: 'var(--merk-radius-sm, 5px)', padding: '2px 6px' }}>
                  Binnenkort
                </span>
              )}
            </span>
            {item.hint && <span style={{ display: 'block', fontSize: 12, color: '#98A0A6', marginTop: 2 }}>{item.hint}</span>}
          </>
        )
        const stijl: React.CSSProperties = {
          display: 'block', padding: '9px 11px', borderRadius: 'var(--merk-radius-md, 10px)',
          textDecoration: 'none', textAlign: 'left', width: '100%',
          background: 'none', border: 'none',
          cursor: geblokkeerd ? 'not-allowed' : 'pointer',
        }
        return geblokkeerd ? (
          <div key={`${item.href}-${i}`} style={stijl} aria-disabled>{inhoud}</div>
        ) : (
          <Link key={`${item.href}-${i}`} href={item.href} role="menuitem" className="vui-menuitem" style={stijl}>
            {inhoud}
          </Link>
        )
      })}
      {menu.slot && (
        <p style={{ fontSize: 11.5, color: '#98A0A6', lineHeight: 1.5, padding: '8px 11px 4px', borderTop: '1px solid #F1F3F5', margin: '4px 0 0' }}>
          Tijdelijk gesloten — VestaAI richt zich nu op waardering en marktanalyse.
        </p>
      )}
    </div>
  )

  return (
    <div>
      <style>{`
        .vui-menuitem:hover { background: var(--merk-zacht); }
        .topbar-menus { display: flex; align-items: center; gap: 2px; }
        .topbar-rechts { display: flex; align-items: center; gap: 14px; }
        .topbar-mobiel-knop { display: none; }
        @media (max-width: 900px) {
          .topbar-menus, .topbar-rechts { display: none; }
          .topbar-mobiel-knop { display: flex; }
        }
      `}</style>

      <header
        ref={balkRef}
        style={{
          position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,.93)',
          backdropFilter: 'saturate(150%) blur(14px)', borderBottom: '1px solid #E6E9EC',
        }}
      >
        <div style={{ maxWidth: 'var(--app-breedte)', margin: '0 auto', height: 66, padding: '0 22px', display: 'flex', alignItems: 'center', gap: 26 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>{logo}</Link>

          <div className="topbar-menus">
            {MENUS.map(menu => {
              const actief = menuIsActief(pathname, menu)
              const uit = open === menu.id
              return (
                <div key={menu.id} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpen(uit ? null : menu.id)}
                    aria-expanded={uit}
                    aria-haspopup="menu"
                    className="vui-menuknop"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 'var(--merk-radius-sm, 9px)', border: 'none', cursor: 'pointer',
                      fontSize: 14.5, fontWeight: actief ? 700 : 550,
                      color: menu.slot ? '#98A0A6' : actief ? 'var(--merk)' : '#41494F',
                      background: actief ? 'var(--merk-zacht)' : uit ? '#F5F6F8' : 'transparent',
                      transition: 'background .15s, color .15s',
                    }}
                  >
                    {menu.label}
                    {menu.slot && <Slotje size={11} />}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} style={{ opacity: .5, transform: uit ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} aria-hidden>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {uit && menuItems(menu)}
                </div>
              )
            })}
          </div>

          <div className="topbar-rechts" style={{ marginLeft: 'auto' }}>
            {userEmail && (
              <span style={{ fontSize: 12.5, color: '#98A0A6', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={userEmail}>
                {userEmail}
              </span>
            )}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" style={{ fontSize: 13.5, fontWeight: 600, color: '#5C6470', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Uitloggen
              </button>
            </form>
          </div>

          <button
            className="topbar-mobiel-knop"
            onClick={() => setMobiel(v => !v)}
            aria-label="Menu openen"
            style={{ marginLeft: 'auto', cursor: 'pointer', width: 40, height: 40, border: '1px solid #DDE1E5', borderRadius: 'var(--merk-radius-md, 10px)', alignItems: 'center', justifyContent: 'center', background: '#fff' }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[0, 1, 2].map(i => <span key={i} style={{ width: 17, height: 2, background: '#14181B', borderRadius: 2 }} />)}
            </span>
          </button>
        </div>

        {mobiel && (
          <div style={{ borderTop: '1px solid #EBEEF1', padding: '10px 22px 16px', background: '#fff' }}>
            {MENUS.map(menu => (
              <div key={menu.id} style={{ marginBottom: 12 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#98A0A6', margin: '0 0 4px' }}>
                  {menu.label} {menu.slot && <Slotje size={11} />}
                </p>
                {menu.items.map((item, i) => (
                  item.slot || item.binnenkort ? (
                    <p key={i} style={{ fontSize: 14, color: '#98A0A6', padding: '6px 0', margin: 0 }}>{item.label}</p>
                  ) : (
                    <Link key={i} href={item.href} style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#14181B', padding: '6px 0', textDecoration: 'none' }}>
                      {item.label}
                    </Link>
                  )
                ))}
              </div>
            ))}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" style={{ fontSize: 14, fontWeight: 600, color: '#5C6470', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
                Uitloggen
              </button>
            </form>
          </div>
        )}
      </header>

      <div>{children}</div>
    </div>
  )
}
