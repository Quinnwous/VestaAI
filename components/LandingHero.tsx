import Link from 'next/link'

/**
 * Landingspagina sinds de koerswijziging (sept 2026): VestaAI is een gesloten
 * platform. Eén scherm, één deur — inloggen. Bewust géén prijzen, géén
 * featurelijst en géén zelf-aanmelden: nieuwe kantoren worden handmatig
 * klaargezet via /admin, en de propositie ligt nog niet vast.
 */

const PIJLERS = [
  {
    titel: 'Waardering',
    tekst: 'Een onderbouwde woningwaarde op basis van echte transacties, met scenario’s waarmee u aan tafel kunt rekenen.',
  },
  {
    titel: 'Marktanalyse',
    tekst: 'Vrije vragen aan de markt: wat deed een woningtype, een wijk of een periode werkelijk?',
  },
  {
    titel: 'Uw eigen omgeving',
    tekst: 'Na het inloggen draagt het platform uw logo en uw kleuren — tot in het rapport dat u meeneemt.',
  },
]

export function LandingHero() {
  return (
    <main style={{ minHeight: '100vh', background: '#FBFCFB', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '26px 30px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: '#1A6B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(26,107,69,.26)' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 19, letterSpacing: '-.04em' }}>V</span>
          </span>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#0E1A13' }}>
            Vesta<span style={{ color: '#1A6B45' }}>AI</span>
          </span>
        </span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 30px 60px' }}>
        <div style={{ width: '100%', maxWidth: 760, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#2A8A5C', margin: '0 0 18px' }}>
            Voor Nederlandse makelaars
          </p>

          <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontSize: 'clamp(36px, 6vw, 58px)', lineHeight: 1.08, letterSpacing: '-.03em', color: '#0E1A13', margin: '0 0 20px', fontWeight: 500 }}>
            Weten wat een woning<br />
            <em style={{ color: '#1A6B45', fontStyle: 'italic' }}>werkelijk waard is</em>
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#5A6B61', margin: '0 auto 34px', maxWidth: 520 }}>
            Waardering en marktanalyse op basis van echte transactiedata — in de huisstijl van uw eigen kantoor.
          </p>

          <Link
            href="/login"
            style={{
              display: 'inline-block', borderRadius: 12, background: '#1A6B45', color: '#fff',
              padding: '14px 32px', fontSize: 15.5, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(26,107,69,.26)',
            }}
          >
            Inloggen
          </Link>

          <p style={{ fontSize: 13.5, color: '#9AA6A0', margin: '16px 0 0' }}>
            Nog geen toegang? <Link href="/contact" style={{ color: '#1A6B45', fontWeight: 600 }}>Neem contact op</Link>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginTop: 64, textAlign: 'left' }}>
            {PIJLERS.map(p => (
              <div key={p.titel} style={{ borderRadius: 16, border: '1px solid #E9EFEB', background: '#fff', padding: '20px 22px' }}>
                <h2 style={{ fontSize: 14.5, fontWeight: 700, color: '#0E1A13', margin: '0 0 6px' }}>{p.titel}</h2>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5A6B61', margin: 0 }}>{p.tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid #EEF2F0', padding: '20px 30px', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { href: '/over-ons', label: 'Over ons' },
          { href: '/vertrouwen', label: 'Vertrouwen' },
          { href: '/contact', label: 'Contact' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/voorwaarden', label: 'Voorwaarden' },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ fontSize: 13, color: '#9AA6A0', textDecoration: 'none' }}>{l.label}</Link>
        ))}
        <span style={{ fontSize: 13, color: '#C2CBC6' }}>© {new Date().getFullYear()} VestaAI</span>
      </footer>
    </main>
  )
}
