'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Branding } from '@/lib/branding'
import { FeedbackKnop } from '@/components/FeedbackKnop'

/**
 * Topbar van de ingelogde omgeving.
 *
 * Fasemodel (vastgelegd 16 sep 2026, zie CLAUDE.md): Woningdossier is de kern
 * — één dossier per adres doorloopt de fases Verkoopadvies → In verkoop →
 * Verkocht (zie ObjectWorkspace). Content is geen los hoofdmenu meer: het is
 * een fase van een woning, geen bestemming. Marktinzichten staat ernaast
 * omdat het regionaal is, los van één woning.
 *
 * Platte pil-navigatie (item 1.9c, besluit Quinn 17 sep 2026, avond): geen
 * dropdowns meer — de prototypes (`docs/ontwerp/kit.js` `topbar()`) zijn de
 * spec. Zes pillen zonder submenu: Overzicht · Woningdossier · Marktanalyse ·
 * Transacties · Concurrentie · Verkoopkaart. De sub-navigatie binnen
 * Marktinzichten (was `MarktinzichtenNav.tsx`) is vervallen — die vier
 * schermen hebben nu elk hun eigen pil.
 *
 * Herbouwd fase 1.3 (masterplan 16-17 sep 2026, zie docs/roadmap.md):
 * Verhuur is volledig uit de app gehaald (was "Binnenkort" — bewust nog niet
 * gebouwd, nu bewust "voorlopig niet doen", zie roadmap § Bewust níet doen).
 * Kantoor staat niet meer los in de balk maar uitsluitend in het
 * profielmenu (rechtsboven), samen met "Mijn account" en "Uitloggen" — de
 * blauwe contactbalk erboven (telefoon/e-mail) is ook weg, zie
 * app/(app)/layout.tsx. Sinds item 12.4 (docs/roadmap.md § Fase 12) zit
 * daar ook "Feedback geven" (components/FeedbackKnop.tsx) tussen.
 *
 * Alle merkkleuren komen uit CSS-variabelen (`--merk*`) die de (app)-layout zet,
 * zodat elk kantoor zijn eigen omgeving ziet.
 */

type NavItem = { id: string; href: string; label: string; actief: (pathname: string) => boolean }

const NAV_ITEMS: NavItem[] = [
  { id: 'overzicht', href: '/dashboard', label: 'Overzicht', actief: p => p === '/dashboard' },
  { id: 'woningdossier', href: '/woningen', label: 'Woningdossier', actief: p => p.startsWith('/woningen') || p.startsWith('/object') },
  // Exacte match: /marktanalyse mag niet actief zijn op zijn eigen subroutes
  // (die hebben elk hun eigen pil hierna).
  { id: 'marktanalyse', href: '/marktanalyse', label: 'Marktanalyse', actief: p => p === '/marktanalyse' },
  { id: 'transacties', href: '/marktanalyse/transacties', label: 'Transacties', actief: p => p.startsWith('/marktanalyse/transacties') },
  { id: 'concurrentie', href: '/marktanalyse/concurrentie', label: 'Concurrentie', actief: p => p.startsWith('/marktanalyse/concurrentie') },
  { id: 'kaart', href: '/marktanalyse/kaart', label: 'Verkoopkaart', actief: p => p.startsWith('/marktanalyse/kaart') },
]

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
  const pathname = usePathname()
  const [profielOpen, setProfielOpen] = useState(false)
  const [mobiel, setMobiel] = useState(false)
  const [logoKapot, setLogoKapot] = useState(false)
  const balkRef = useRef<HTMLDivElement>(null)

  // Buiten de balk klikken of Escape sluit het profielmenu.
  useEffect(() => {
    if (!profielOpen) return
    const klik = (e: MouseEvent) => {
      if (balkRef.current && !balkRef.current.contains(e.target as Node)) {
        setProfielOpen(false)
      }
    }
    const toets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfielOpen(false)
    }
    document.addEventListener('mousedown', klik)
    document.addEventListener('keydown', toets)
    return () => {
      document.removeEventListener('mousedown', klik)
      document.removeEventListener('keydown', toets)
    }
  }, [profielOpen])

  // Navigeren sluit alles.
  useEffect(() => { setProfielOpen(false); setMobiel(false) }, [pathname])

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
      <FeedbackKnop onBeforeOpen={() => setProfielOpen(false)} />
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          role="menuitem"
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
        .vui-navpil:hover { color: var(--merk); }
        .topbar-menus, .topbar-rechts { display: flex; align-items: center; }
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
        <div style={{ maxWidth: 'var(--app-breedte)', margin: '0 auto', height: 66, padding: '0 var(--app-marge)', display: 'flex', alignItems: 'center', gap: 22 }}>
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

          <nav className="topbar-menus" aria-label="Hoofdmenu" style={{ gap: 2, background: '#F5F6F8', padding: 3, borderRadius: 'var(--merk-radius-pill, 9999px)', flexShrink: 1, minWidth: 0, overflowX: 'auto' }}>
            {NAV_ITEMS.map(item => {
              const actief = item.actief(pathname)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="vui-navpil"
                  aria-current={actief ? 'page' : undefined}
                  style={{
                    display: 'inline-block', whiteSpace: 'nowrap',
                    padding: '8px 14px', borderRadius: 'var(--merk-radius-pill, 9999px)',
                    fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                    color: actief ? 'var(--merk)' : '#41494F',
                    background: actief ? '#fff' : 'transparent',
                    boxShadow: actief ? '0 1px 3px rgba(20,24,27,.12)' : 'none',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="topbar-rechts" style={{ marginLeft: 'auto', flexShrink: 0 }}>
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
            <div style={{ marginBottom: 12 }}>
              {NAV_ITEMS.map(item => {
                const actief = item.actief(pathname)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={actief ? 'page' : undefined}
                    style={{ display: 'block', fontSize: 14, fontWeight: actief ? 700 : 600, color: actief ? 'var(--merk)' : '#14181B', padding: '7px 0', textDecoration: 'none' }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid #EBEEF1', marginTop: 8, paddingTop: 8 }}>
              {gebruiker.naam && <p style={{ fontSize: 13, fontWeight: 700, color: '#14181B', margin: '0 0 2px' }}>{gebruiker.naam}</p>}
              {gebruiker.email && <p style={{ fontSize: 12, color: '#98A0A6', margin: '0 0 8px' }}>{gebruiker.email}</p>}
              <Link href="/account" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#14181B', padding: '6px 0', textDecoration: 'none' }}>
                Mijn account
              </Link>
              <Link href="/kantoor" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#14181B', padding: '6px 0', textDecoration: 'none' }}>
                Kantoor
              </Link>
              <FeedbackKnop variant="mobiel" onBeforeOpen={() => setMobiel(false)} />
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
