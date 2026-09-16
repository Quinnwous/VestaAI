'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Branding } from '@/lib/branding'

/**
 * Topbar van de ingelogde omgeving.
 *
 * Fasemodel (vastgelegd 16 sep 2026, zie CLAUDE.md): Woningdossier is de kern
 * — één dossier per adres doorloopt de fases Acquisitie → In verkoop →
 * Verkocht (zie ObjectWorkspace). Content is geen los hoofdmenu meer: het is
 * een fase van een woning, geen bestemming. Marktinzichten staat ernaast
 * omdat het regionaal is, los van één woning. Verhuur is zichtbaar maar op
 * slot ("Binnenkort") — bewust nog niet gebouwd. Kantoorinstellingen is geen
 * hoofdmenu meer; die pagina hangt nu achter het gebruikersmenu rechtsboven.
 *
 * Alle merkkleuren komen uit CSS-variabelen (`--merk*`) die de (app)-layout zet,
 * zodat elk kantoor zijn eigen omgeving ziet.
 */

type Item = { href: string; label: string; hint?: string; slot?: boolean; binnenkort?: boolean }
type Menu = { id: string; label: string; slot?: boolean; items: Item[] }

const MENUS: Menu[] = [
  {
    id: 'woningdossier',
    label: 'Woningdossier',
    items: [
      { href: '/dashboard', label: 'Alle woningen', hint: 'Het volledige woningdossier van je kantoor' },
      { href: '/object/new', label: 'Woning toevoegen', hint: 'Start een nieuw dossier — begint in de acquisitiefase' },
    ],
  },
  {
    id: 'marktinzichten',
    label: 'Marktinzichten',
    items: [
      { href: '/marktanalyse', label: 'Marktanalyse', hint: 'Interactief: prijsontwikkeling, m²-prijs en doorlooptijd per type, wijk en periode' },
      { href: '/marktanalyse/transacties', label: 'Transacties opzoeken', hint: 'Zoek en filter individuele verkopen — bruikbaar als referentie in een waardebepaling' },
      { href: '/marktanalyse/concurrentie', label: 'Concurrentieanalyse', hint: 'Marktaandeel en prestaties vs. concurrenten in de regio' },
      { href: '/marktanalyse/kaart', label: 'Verkoopkaart', hint: 'Eigen verkopen op de kaart, met live filters' },
    ],
  },
  {
    id: 'verhuur',
    label: 'Verhuur',
    slot: true,
    items: [],
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
  const menus = MENUS
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
            {menus.map(menu => {
              // Een menu zonder items (Verhuur) is volledig op slot — geen dropdown,
              // gewoon een label met slotje dat niets doet.
              if (menu.items.length === 0) {
                return (
                  <span
                    key={menu.id}
                    aria-disabled
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', fontSize: 14.5, fontWeight: 550, color: '#98A0A6',
                      cursor: 'not-allowed',
                    }}
                    title="Binnenkort"
                  >
                    {menu.label}
                    <Slotje size={11} />
                  </span>
                )
              }
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
                      color: actief ? 'var(--merk)' : '#41494F',
                      background: actief ? 'var(--merk-zacht)' : uit ? '#F5F6F8' : 'transparent',
                      transition: 'background .15s, color .15s',
                    }}
                  >
                    {menu.label}
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
            <Link href="/kantoor" style={{ fontSize: 13.5, fontWeight: 600, color: pathname.startsWith('/kantoor') ? 'var(--merk)' : '#5C6470', textDecoration: 'none' }}>
              Kantoor
            </Link>
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
            {menus.map(menu => (
              <div key={menu.id} style={{ marginBottom: 12 }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#98A0A6', margin: '0 0 4px' }}>
                  {menu.label} {menu.slot && menu.items.length === 0 && <Slotje size={11} />}
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
            <Link href="/kantoor" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#14181B', padding: '6px 0', textDecoration: 'none' }}>
              Kantoor
            </Link>
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
