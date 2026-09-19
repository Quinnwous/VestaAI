import { colors } from '@/components/ui/tokens'

/**
 * Welkomstblok bovenaan de startpagina (masterplan fase 1.6, ontwerp uit
 * `docs/ontwerp/startpagina.html` § .kantoorbanner — dat prototype is de spec,
 * zie roadmap § 3.8).
 *
 * Geen foto meer (besluit Quinn 19 sep 2026): de aangeleverde teamfoto was
 * 399 px breed en werd op desktop ~3x opgeschaald, dus zichtbaar zacht. In
 * plaats daarvan het ontwerp uit het prototype — merkverloop met een fijn
 * raster en een diagonale glans. Dat is een bewust beeld, geen terugval, en
 * het blijft scherp op elk scherm. Levert een kantoor later wél een scherpe
 * foto aan (≥ 1600 px breed), dan zet `banner_url` in de huisstijl hem terug;
 * de uitsnede regel je met `banner_focus_y`.
 *
 * Bewust een **server component**: `new Date()` hier in de browser gaf een
 * andere begroeting dan op de UTC-server en dus een hydratiemismatch, die de
 * hele pagina half-levend achterliet — inclusief het profielmenu in de topbar.
 * Datum en begroeting komen nu kant-en-klaar uit `lib/begroeting.ts`.
 */
export function StartBanner({
  url,
  focusY = 50,
  naam,
  kantoornaam,
  datum,
  begroeting,
  context,
}: {
  /** Optionele kantoorfoto; leeg = het merkverloop uit het prototype. */
  url: string | null
  focusY?: number
  naam: string | null
  kantoornaam: string
  datum: string
  begroeting: string
  context: string
}) {
  const voornaam = naam?.trim().split(/\s+/)[0] ?? null

  return (
    <div
      className="vui-startbanner"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--merk-radius-card-xl, 20px)',
        marginBottom: 24,
        minHeight: 'clamp(196px, 26vw, 252px)',
        display: 'flex',
        alignItems: 'flex-end',
        boxShadow: 'var(--merk-shadow-card)',
        // Het verloop staat altijd onder de foto: laadt die niet, dan zie je
        // het merkverloop in plaats van een gat of een gebroken-beeld-icoon.
        background: 'linear-gradient(135deg, var(--merk) 0%, var(--merk-diep) 100%)',
      }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Het team van ${kantoornaam}`}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: `center ${focusY}%`,
          }}
        />
      )}

      {/* Fijn raster + diagonale glans (prototype .kantoorbanner::before/::after).
          Puur decoratief, dus weg voor schermlezers. */}
      <div aria-hidden className="vui-startbanner-raster" />
      <div aria-hidden className="vui-startbanner-glans" />

      {/* Leesbaarheid van de tekst, ook op een lichte foto. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          background: url
            ? 'linear-gradient(0deg, rgba(14,20,17,.66) 0%, rgba(14,20,17,.10) 58%, rgba(14,20,17,0) 100%)'
            : 'linear-gradient(0deg, rgba(14,20,17,.28) 0%, rgba(14,20,17,0) 62%)',
        }}
      />

      <div style={{ position: 'relative', padding: 'clamp(20px, 3vw, 30px) clamp(20px, 3vw, 32px)', maxWidth: 640 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.82)' }}>
          {datum}
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 800, letterSpacing: '-.02em', color: '#fff', lineHeight: 1.08 }}>
          {begroeting}{voornaam ? `, ${voornaam}` : ''}
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.86)' }}>
          {context}
        </p>
      </div>

      {/* Kantoornaam als klein merkdetail rechtsonder — vervangt het
          "teamfoto uit huisstijl"-label dat in het prototype een annotatie was. */}
      <span
        className="vui-startbanner-merk"
        style={{
          position: 'absolute', right: 16, bottom: 16,
          fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.82)',
          background: 'rgba(255,255,255,.14)',
          padding: '5px 11px', borderRadius: 'var(--merk-radius-pill, 9999px)',
          border: `1px solid ${colors.border}22`,
        }}
      >
        {kantoornaam}
      </span>
    </div>
  )
}
