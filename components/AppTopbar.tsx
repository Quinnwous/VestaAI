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
 * omdat het regionaal is, los van één woning.
 *
 * Herbouwd fase 1.3 (masterplan 16-17 sep 2026, zie docs/roadmap.md):
 * Verhuur is volledig uit de app gehaald (was "Binnenkort" — bewust nog niet
 * gebouwd, nu bewust "voorlopig niet doen", zie roadmap § Bewust níet doen).
 * Kantoor staat niet meer los in de balk maar uitsluitend in het
 * profielmenu (rechtsboven), samen met "Mijn account" en "Uitloggen" — de
 * blauwe contactbalk erboven (telefoon/e-mail) is ook weg, zie
 * app/(app)/layout.tsx.
 *
 * Alle merkkleuren komen uit CSS-variabelen (`--merk*`) die de (app)-layout zet,
 * zodat elk kantoor zijn eigen omgeving ziet.
 */

type Item = { href: string; label: string; hint?: string }
type Menu = { id: string; label: string; items: Item[] }

const MENUS: Menu[] = [
  {
    id: 'woningdossier',
    label: 'Woningdossier',
    items: [
      { href: '/woningen', label: 'Alle woningen', hint: 'Het volledige woningdossier van je kantoor' },
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
]

function menuIsActief(pathname: string, menu: Menu): boolean {
  if (menu.id === 'woningdossier') return pathname.startsWith('/woningen') || pathname.startsWith('/object')
  if (menu.id === 'marktinzichten') return pathname.startsWith('/marktanalyse')
  return false
}

/** Initiaal voor de avatarknop: eerste letter van de naam, anders van het e-mailadres. */
function initiaal(naam: string | null, email: string | null): string {
  const bron = naam?.trim() || email?.trim() || '?'
  return bron.slice(0, 1).toUpperCase()
}

export function AppTopbar({
  children,
  branding,
  gebruiker,
}: {
  children: React.ReactNode
  branding: Branding
  gebruiker: { naam: string | null; email: string | null }
}) {
  const menus = MENUS
  const pathname = usePathname()
  const [open, setOpen] = useState<string | null>(null)
  const [profielOpen, setProfielOpen] = useState(false)
  const [mobiel, setMobiel] = useState(false)
  const [logoKapot, setLogoKapot] = useState(false)
  const balkRef = useRef<HTMLDivElement>(null)

  // Buiten de balk klikken of Escape sluit elk geopend menu.
  useEffect(() => {
    if (!open && !profielOpen) return
    const klik = (e: MouseEvent) => {
      if (balkRef.current && !balkRef.current.contains(e.target as Node)) {
        setOpen(null)
        setProfielOpen(false)
      }
    }
    const toets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null)
        setProfielOpen(false)
      }
    }
    document.addEventListener('mousedown', klik)
    document.addEventListener('keydown', toets)
    return () => {
      document.removeEventListener('mousedown', klik)
      document.removeEventListener('keydown', toets)
    }
  }, [open, profielOpen])

  // Navigeren sluit alles.
  useEffect(() => { setOpen(null); setProfielOpen(false); setMobiel(false) }, [pathname])

  // Laadt het logo niet (verlopen URL, bucket weg), dan valt hij terug op de merkletter —
  // nooit het gebroken-afbeelding-icoon van de browser.
  const logo = branding.logoUrl && !logoKapot ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoUrl}
      alt={branding.naam}
      onError={() => setLogoKapot(true)}
      style={{ height: 38, maxWidth: 210, objectFit: 'contain' }}
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
      {menu.items.map((item, i) => (
        <Link
          key={`${item.href}-${i}`}
          href={item.href}
          role="menuitem"
          className="vui-menuitem"
          style={{
            display: 'block', padding: '9px 11px', borderRadius: 'var(--merk-radius-md, 10px)',
            textDecoration: 'none', textAlign: 'left', width: '100%',
            background: 'none', border: 'none',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#14181B' }}>{item.label}</span>
          {item.hint && <span style={{ display: 'block', fontSize: 12, color: '#98A0A6', marginTop: 2 }}>{item.hint}</span>}
        </Link>
      ))}
    </div>
  )

  const profielMenu = (
    <div
      role="menu"
      style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 6, minWidth: 220,
        background: '#fff', border: '1px solid #E6E9EC', borderRadius: 'var(--merk-radius-lg, 14px)',
        boxShadow: '0 18px 44px -12px rgba(20,24,27,.22)', padding: 6, zIndex: 60,
      }}
    >
      <div style={{ padding: '9px 11px 8px', borderBottom: '1px solid #EEF0F2', marginBottom: 4 }}>
        {gebruiker.naam && <p style={{ fontSize: 13.5, fontWeight: 700, color: '#14181B', margin: 0 }}>{gebruiker.naam}</p>}
        {gebruiker.email && (
          <p style={{ fontSize: 12, color: '#98A0A6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gebruiker.email}
          </p>
        )}
      </div>
      <Link
        href="/account"
        role="menuitem"
        className="vui-menuitem"
        style={{ display: 'block', padding: '9px 11px', borderRadius: 'var(--merk-radius-md, 10px)', textDecoration: 'none', fontSize: 14, fontWeight: 600, color: '#14181B' }}
      >
        Mijn account
      </Link>
      <Link
        href="/kantoor"
        role="menuitem"
        className="vui-menuitem"
        style={{ display: 'block', padding: '9px 11px', borderRadius: 'var(--merk-radius-md, 10px)', textDecoration: 'none', fontSize: 14, fontWeight: 600, color: '#14181B' }}
      >
        Kantoor
      </Link>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="vui-menuitem"
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 'var(--merk-radius-md, 10px)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5C6470' }}
        >
          Uitloggen
        </button>
      </form>
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
        <div style={{ maxWidth: 'var(--app-breedte)', margin: '0 auto', height: 66, padding: '0 var(--app-marge)', display: 'flex', alignItems: 'center', gap: 26 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Co-branding-lockup (besluit 16 sep 2026, vergroot fase 1.3): Quinn wil
                zichtbaar houden dat het platform van VestaAI is, ook al draagt de rest
                van de omgeving volledig de huisstijl van het kantoor. Vaste
                VestaAI-groen, niet var(--merk) — dit ís het VestaAI-merk, niet het
                kantoor-merk. */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }} title="VestaAI">
              <span style={{ width: 26, height: 26, borderRadius: 7, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 13.5, letterSpacing: '-.04em' }}>V</span>
              </span>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: '#98A0A6', whiteSpace: 'nowrap' }}>
                Vesta<span style={{ color: '#1A6B45' }}>AI</span>
              </span>
            </span>
            <span style={{ color: '#D3D8DC', fontSize: 14 }} aria-hidden>×</span>
            {logo}
          </Link>

          <div className="topbar-menus">
            {menus.map(menu => {
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
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfielOpen(v => !v)}
                aria-expanded={profielOpen}
                aria-haspopup="menu"
                aria-label="Accountmenu"
                style={{
                  width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'var(--merk)', color: 'var(--merk-op)', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: profielOpen ? '2px solid var(--merk-rand)' : 'none', outlineOffset: 2,
                }}
              >
                {initiaal(gebruiker.naam, gebruiker.email)}
              </button>
              {profielOpen && profielMenu}
            </div>
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
          <div style={{ borderTop: '1px solid #EBEEF1', padding: '10px var(--app-marge) 16px', background: '#fff' }}>
            {menus.map(menu => (
              <div key={menu.id} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#98A0A6', margin: '0 0 4px' }}>
                  {menu.label}
                </p>
                {menu.items.map((item, i) => (
                  <Link key={i} href={item.href} style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#14181B', padding: '6px 0', textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <div style={{ borderTop: '1px solid #EBEEF1', marginTop: 8, paddingTop: 8 }}>
              {gebruiker.naam && <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 2px' }}>{gebruiker.naam}</p>}
              {gebruiker.email && <p style={{ fontSize: 12, color: '#98A0A6', margin: '0 0 8px' }}>{gebruiker.email}</p>}
              <Link href="/account" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#14181B', padding: '6px 0', textDecoration: 'none' }}>
                Mijn account
              </Link>
              <Link href="/kantoor" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#14181B', padding: '6px 0', textDecoration: 'none' }}>
                Kantoor
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" style={{ fontSize: 14, fontWeight: 600, color: '#5C6470', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
                  Uitloggen
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      <div>{children}</div>
    </div>
  )
}
