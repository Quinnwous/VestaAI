import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicNav } from '@/components/PublicNav'

export const metadata: Metadata = {
  title: 'Contact — VestaAI',
  description:
    'Neem contact op met VestaAI. Plan een demo, stel een vraag of meld u aan voor de gratis proefperiode.',
}

const NR = { fontFamily: 'var(--font-newsreader), Georgia, serif' }

export default function ContactPage() {
  return (
    <div style={{ background: '#FBFCFB', color: '#0E1A13', minHeight: '100vh' }}>
      <PublicNav active="/contact" />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '80px 28px 120px' }}>
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 16 }}>Contact</div>
          <h1 style={{ ...NR, fontWeight: 500, fontSize: 'clamp(36px,5vw,54px)', lineHeight: 1.08, letterSpacing: '-.02em', color: '#0E1A13', margin: '0 0 20px' }}>
            Laten we kennismaken.
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: '#445249', margin: 0, maxWidth: 560 }}>
            Wilt u een demo plannen, heeft u een vraag over uw abonnement of wilt u samenwerken? Stuur een e-mail — we reageren binnen één werkdag.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16, marginBottom: 56 }}>
          {[
            {
              label: 'Demo aanvragen',
              desc: 'Bekijk Vesta AI live op uw eigen kantoor. We passen de demo aan op uw objecten en huisstijl.',
              href: 'mailto:quinn.berkouwer@gmail.com?subject=VestaAI%20demo%20aanvragen',
              cta: 'Plan een demo →',
            },
            {
              label: 'Vraag over een abonnement',
              desc: 'Twijfelt u over het juiste plan of heeft u een maatwerkvraag voor een groot kantoor?',
              href: 'mailto:quinn.berkouwer@gmail.com?subject=VestaAI%20vraag%20abonnement',
              cta: 'Stuur een e-mail →',
            },
            {
              label: 'Technische ondersteuning',
              desc: 'Loopt iets niet zoals verwacht? Beschrijf de situatie en we helpen u zo snel mogelijk verder.',
              href: 'mailto:quinn.berkouwer@gmail.com?subject=VestaAI%20support',
              cta: 'Stuur een e-mail →',
            },
          ].map(({ label, desc, href, cta }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #E9EFEB', borderRadius: 18, padding: '28px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', margin: '0 0 6px' }}>{label}</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#5A6B61', margin: 0, maxWidth: 440 }}>{desc}</p>
              </div>
              <a href={href} style={{ fontSize: 15, fontWeight: 700, color: '#1A6B45', background: '#EAF5EE', padding: '11px 20px', borderRadius: 11, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {cta}
              </a>
            </div>
          ))}
        </div>

        <div style={{ background: '#F1F7F3', border: '1px solid #D5E8DD', borderRadius: 18, padding: '28px 30px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2A8A5C', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Direct bereikbaar</div>
          <a href="mailto:quinn.berkouwer@gmail.com" style={{ fontSize: 20, fontWeight: 700, color: '#1A6B45', textDecoration: 'none' }}>
            quinn.berkouwer@gmail.com
          </a>
          <p style={{ fontSize: 14, color: '#5A6B61', marginTop: 8, marginBottom: 0 }}>Reactietijd: binnen één werkdag</p>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid #E4EAE6', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#9AA6A0' }}>© 2026 Vesta&nbsp;AI · De AI-assistent voor de makelaardij</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ href: '/', label: 'Home' }, { href: '/prijzen', label: 'Prijzen' }, { href: '/privacy', label: 'Privacy' }, { href: '/voorwaarden', label: 'Voorwaarden' }].map(({ href, label }) => (
              <Link key={label} href={href} style={{ fontSize: 13, color: '#9AA6A0', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
