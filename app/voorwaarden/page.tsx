import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicNav } from '@/components/PublicNav'

export const metadata: Metadata = {
  title: 'Algemene voorwaarden — VestaAI',
  description: 'De algemene voorwaarden van VestaAI voor het gebruik van het platform.',
  alternates: {
    canonical: '/voorwaarden',
  },
}

export default function VoorwaardenPage() {
  return (
    <div style={{ background: '#FBFCFB', color: '#0E1A13', minHeight: '100vh' }}>
      <PublicNav />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '72px 28px 100px' }}>
        <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1.1, color: '#0E1A13', margin: '0 0 8px' }}>
          Algemene voorwaarden
        </h1>
        <p style={{ fontSize: 14, color: '#9AA6A0', marginBottom: 48 }}>Versie 1.0 · Ingangsdatum: 1 januari 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {[
            {
              nr: '1', titel: 'Definities',
              tekst: `"VestaAI" verwijst naar het SaaS-platform en de bijbehorende diensten aangeboden door Quinn Berkouwer, gevestigd in Nederland. "Gebruiker" is elke natuurlijke of rechtspersoon die een account aanmaakt en het platform gebruikt. "Platform" is de software bereikbaar via vestaai.nl en de bijbehorende API's.`,
            },
            {
              nr: '2', titel: 'Gebruik van het platform',
              tekst: 'De Gebruiker krijgt een niet-exclusieve, niet-overdraagbare toegang tot het Platform, verleend door de platform-admin aan een specifiek kantoor. U bent zelf verantwoordelijk voor de juistheid van de ingevoerde woninggegevens en het eindresultaat dat wordt gepubliceerd. Gebruik van het Platform voor misleiding, oplichting of overtreding van Funda-richtlijnen is niet toegestaan.',
            },
            {
              nr: '3', titel: 'Toegang en beëindiging',
              tekst: 'Toegang tot het Platform wordt per kantoor beheerd door de platform-admin en kan op elk moment worden ingetrokken. Er is geen abonnementsstructuur of automatische facturering aan het Platform verbonden.',
            },
            {
              nr: '4', titel: 'Intellectueel eigendom',
              tekst: 'De door VestaAI gegenereerde teksten worden eigendom van de Gebruiker op het moment van generatie. VestaAI behoudt alle rechten op de software, algoritmen, interfaces en documentatie. U mag de door u gegenereerde content vrijelijk gebruiken voor professionele makelaarsdoeleinden.',
            },
            {
              nr: '5', titel: 'Beschikbaarheid en aansprakelijkheid',
              tekst: 'VestaAI streeft naar een beschikbaarheid van 99,5% per jaar. Bij gepland onderhoud wordt u minimaal 24 uur van tevoren geïnformeerd. VestaAI is niet aansprakelijk voor gevolgschade, gederfde inkomsten of indirecte schade. De aansprakelijkheid is beperkt conform de wettelijke grenzen die voor deze dienst gelden.',
            },
            {
              nr: '6', titel: 'Privacy en gegevensbescherming',
              tekst: 'De verwerking van persoonsgegevens is beschreven in de Privacyverklaring op vestaai.nl/privacy. VestaAI is de verwerkingsverantwoordelijke. Alle data wordt versleuteld opgeslagen op servers in de EU en is AVG-proof.',
            },
            {
              nr: '7', titel: 'Toepasselijk recht',
              tekst: 'Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement waar VestaAI is gevestigd.',
            },
            {
              nr: '8', titel: 'Wijzigingen',
              tekst: 'VestaAI behoudt het recht deze voorwaarden te wijzigen. Wijzigingen worden minimaal 14 dagen van tevoren per e-mail aangekondigd. Bij voortgezet gebruik na de ingangsdatum gaat u akkoord met de nieuwe voorwaarden.',
            },
            {
              nr: '9', titel: 'Contact',
              tekst: 'Voor vragen over deze voorwaarden kunt u contact opnemen via quinn.berkouwer@gmail.com.',
            },
          ].map(({ nr, titel, tekst }) => (
            <section key={nr}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E1A13', margin: '0 0 10px' }}>{nr}. {titel}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: '#5A6B61', margin: 0 }}>{tekst}</p>
            </section>
          ))}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid #E4EAE6', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#9AA6A0' }}>© 2026 Vesta&nbsp;AI · De AI-assistent voor de makelaardij</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ href: '/', label: 'Home' }, { href: '/privacy', label: 'Privacy' }, { href: '/contact', label: 'Contact' }].map(({ href, label }) => (
              <Link key={label} href={href} style={{ fontSize: 13, color: '#9AA6A0', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
