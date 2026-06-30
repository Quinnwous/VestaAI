import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicNav } from '@/components/PublicNav'

export const metadata: Metadata = {
  title: 'Over ons — VestaAI',
  description:
    'Vesta AI is gebouwd door en voor makelaars. Ons doel: de complete online woningpresentatie in één Nederlands platform.',
}

const NR = { fontFamily: 'var(--font-newsreader), Georgia, serif' }

export default function OverOnsPage() {
  return (
    <div style={{ background: '#FBFCFB', color: '#0E1A13', minHeight: '100vh' }}>
      <PublicNav active="/over-ons" />

      <main>
        {/* Hero */}
        <section style={{ maxWidth: 840, margin: '0 auto', padding: '80px 28px 72px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2A8A5C', marginBottom: 16 }}>Over ons</div>
          <h1 style={{ ...NR, fontWeight: 500, fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.08, letterSpacing: '-.02em', color: '#0E1A13', margin: '0 0 24px' }}>
            Gebouwd voor de Nederlandse makelaardij.
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.65, color: '#445249', maxWidth: 660, margin: 0 }}>
            Vesta AI is opgericht met één doel: makelaars bevrijden van tijdrovend schrijfwerk, zodat zij meer tijd hebben voor het werk dat er echt toe doet — mensen helpen hun thuis te vinden.
          </p>
        </section>

        {/* Missie */}
        <section style={{ background: '#F1F7F3', padding: '72px 28px' }}>
          <div style={{ maxWidth: 840, margin: '0 auto' }}>
            <h2 style={{ ...NR, fontWeight: 500, fontSize: 'clamp(28px,3.6vw,40px)', lineHeight: 1.12, color: '#0E1A13', margin: '0 0 20px' }}>
              Waarom Vesta AI?
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: '#445249', margin: '0 0 20px' }}>
              Een gemiddelde makelaar besteedt 45 minuten aan de teksten voor één woning. Funda-tekst, brochure, Instagram-posts, LinkedIn, koper-e-mail, buurtomschrijving — het wordt steeds meer. En het moet ook nog kloppen met de Funda-richtlijnen, de NVM-stijlregels en de huisstijl van het kantoor.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: '#445249', margin: 0 }}>
              Vesta AI doet dat in 90 seconden. Niet als een generieke vertaalde chatbot, maar als een platform dat de Nederlandse vastgoedmarkt door en door kent — van de BAG tot Funda, van NVM tot AVG. Uw huisstijl, uw toon, uw kwaliteit.
            </p>
          </div>
        </section>

        {/* Waarden */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 28px' }}>
          <h2 style={{ ...NR, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,40px)', lineHeight: 1.12, color: '#0E1A13', margin: '0 0 40px' }}>
            Waar wij voor staan
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { titel: 'Nederlands door en door', tekst: 'Geen vertaalde tool. Funda-richtlijnen, NVM-stijlregels en de cultuur van de Nederlandse huizenmarkt zitten in elk algoritme ingebakken.' },
              { titel: 'Uw stem, niet de onze', tekst: 'Vesta leert de schrijftoon, het logo en de stijl van uw kantoor. Elke tekst klinkt als u — niet als een robot.' },
              { titel: 'Privacy boven alles', tekst: "Objectdata wordt uitsluitend gebruikt voor uw eigen generaties. Versleuteld op Nederlandse servers, volledig AVG-proof. We verkopen nooit uw data." },
              { titel: 'Eén platform, niet tien tools', tekst: "Tekst, foto, staging, documenten, kalender en chatbot samengebracht in één werkplek. Minder logins, meer overzicht." },
            ].map(({ titel, tekst }) => (
              <div key={titel} style={{ background: '#fff', border: '1px solid #E9EFEB', borderRadius: 18, padding: '26px 28px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', margin: '0 0 10px' }}>{titel}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5A6B61', margin: 0 }}>{tekst}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 840, margin: '0 auto', padding: '0 28px 100px' }}>
          <div style={{ background: 'linear-gradient(135deg,#114230,#1A6B45)', borderRadius: 24, padding: '54px 48px', textAlign: 'center' }}>
            <h2 style={{ ...NR, fontWeight: 500, fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.1, color: '#fff', margin: '0 0 16px' }}>
              Klaar om te starten?
            </h2>
            <p style={{ fontSize: 17, color: '#C8D7CF', margin: '0 0 28px' }}>
              14 dagen gratis, geen creditcard, direct aan de slag.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" style={{ fontSize: 16, fontWeight: 700, color: '#114230', background: '#fff', padding: '14px 28px', borderRadius: 12, textDecoration: 'none' }}>
                Start gratis proefperiode →
              </Link>
              <Link href="/contact" style={{ fontSize: 16, fontWeight: 600, color: '#EAF5EE', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', padding: '14px 24px', borderRadius: 12, textDecoration: 'none' }}>
                Plan een demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #E4EAE6', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#9AA6A0' }}>© 2026 Vesta&nbsp;AI · De AI-assistent voor de makelaardij</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ href: '/', label: 'Home' }, { href: '/prijzen', label: 'Prijzen' }, { href: '/contact', label: 'Contact' }, { href: '/privacy', label: 'Privacy' }].map(({ href, label }) => (
              <Link key={label} href={href} style={{ fontSize: 13, color: '#9AA6A0', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
