import Link from 'next/link'

type FooterLink = { href: string; label: string }

/**
 * Gedeelde footer voor de eenvoudige publieke pagina's (backlog-poets, 27 sep
 * 2026): `/contact`, `/voorwaarden`, `/over-ons`, `/privacy` en `/vertrouwen`
 * toonden allemaal een eigen, licht afwijkende copyrightregel — sommige nog
 * "© 2026 Vesta AI · De AI-assistent voor de makelaardij" (uit de tijd van
 * het AI-contentplatform, vóór de koerswijziging van 15 sep 2026), andere
 * kaal "© 2026 VestaAI" zonder tagline. De landing (`LandingPageClient.tsx`)
 * heeft al de bijgewerkte tekst en een toegankelijke kleur (#626C67 i.p.v.
 * #9AA6A0, dat te weinig contrast heeft); dit component trekt de vijf
 * eenvoudige pagina's daarmee gelijk. De landing zelf blijft zijn eigen,
 * uitgebreide meerkoloms-footer houden — dit component is er niet voor
 * bedoeld en wordt daar niet gebruikt.
 */
export function PublicFooter({ links }: { links: FooterLink[] }) {
  return (
    <footer style={{ borderTop: '1px solid #E4EAE6', background: '#fff' }}>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '32px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, color: '#626C67' }}>© 2026 Vesta&nbsp;AI · Woningwaardering en marktinzicht voor makelaars</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {links.map(({ href, label }) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: '#626C67', textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
