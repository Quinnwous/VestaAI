'use client'

import { useEffect, useState } from 'react'

/**
 * Banner bovenaan de startpagina (masterplan fase 1.6, zie docs/roadmap.md):
 * een grote teamfoto met een begroeting erover, zodat het na inloggen meteen
 * voelt als "ons platform" i.p.v. direct in een werklijst te vallen.
 *
 * Gebruikt `branding.bannerUrl` met terugval op `branding.achtergrondUrl`
 * (hetzelfde sfeerbeeld als op /kantoor). Zonder foto valt de banner terug op
 * een merkverloop, nooit op een gebroken-afbeelding-icoon (patroon uit
 * KantoorBanner.tsx).
 *
 * `focusY` stuurt de verticale uitsnede. Dat is geen franje: de banner is breed
 * en laag, dus van een staande foto is maar ~25 % van de hoogte in beeld. Zonder
 * instelling toont `cover` het midden — bij een teamfoto dus de tafel in plaats
 * van de gezichten.
 */
export function StartBanner({
  url,
  naam,
  kantoornaam,
  focusY = 50,
}: {
  url: string | null
  naam: string | null
  kantoornaam: string
  focusY?: number
}) {
  const [kapot, setKapot] = useState(false)
  const [zichtbaar, setZichtbaar] = useState(false)
  const toonFoto = url && !kapot

  useEffect(() => {
    // Zachte fade-in i.p.v. een harde pop-in; direct op reduced-motion doelwit.
    const verminderdeBeweging = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (verminderdeBeweging) { setZichtbaar(true); return }
    const t = setTimeout(() => setZichtbaar(true), 20)
    return () => clearTimeout(t)
  }, [])

  const begroeting = gebruikBegroeting()
  const datum = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--merk-radius-card-lg, 18px)',
        overflow: 'hidden',
        marginBottom: 32,
        // Geen aspect-ratio + min-height: die combinatie dwingt een minimale breedte af
        // (180 × 16/5 = 576 px) en gaf horizontale scroll op mobiel.
        height: 'clamp(180px, 30vw, 376px)',
        background: toonFoto
          ? undefined
          : 'linear-gradient(135deg, var(--merk) 0%, var(--merk-diep) 100%)',
        boxShadow: 'var(--merk-shadow-card)',
        opacity: zichtbaar ? 1 : 0,
        transition: 'opacity .4s ease-out',
      }}
    >
      {toonFoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Het team van ${kantoornaam}`}
          onError={() => setKapot(true)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            // `cover` schaalt op de breedte, dus de foto is zo ver uitgezoomd als
            // hij kan zonder balken; alleen de hoogte wordt bijgesneden. `focusY`
            // bepaalt wáár in die hoogte de uitsnede valt — boven én onder eraf.
            objectFit: 'cover',
            objectPosition: `center ${focusY}%`,
          }}
        />
      )}
      {toonFoto && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(0deg, rgba(14,20,17,.62) 0%, rgba(14,20,17,.08) 55%, rgba(14,20,17,0) 100%)',
          }}
        />
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 26px' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 650, color: 'rgba(255,255,255,.82)', textTransform: 'capitalize' }}>
          {datum}
        </p>
        <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-.01em' }}>
          {begroeting}{naam ? `, ${naam.split(' ')[0]}` : ''}
        </h1>
      </div>
    </div>
  )
}

/** Begroeting op tijdstip, Europe/Amsterdam (via de lokale kloktijd van de gebruiker). */
function gebruikBegroeting(): string {
  const uur = new Date().getHours()
  if (uur < 6) return 'Goedenacht'
  if (uur < 12) return 'Goedemorgen'
  if (uur < 18) return 'Goedemiddag'
  return 'Goedenavond'
}
