import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicNav } from '@/components/PublicNav'

export const metadata: Metadata = {
  title: 'Vertrouwen & beveiliging — VestaAI',
  description:
    'Jouw klant- en objectgegevens zijn veilig en blijven van jou: opslag in de EU, geen verkoop van data, en geen training van AI-modellen op jouw gegevens.',
}

const PIJLERS: { titel: string; tekst: string; icoon: string }[] = [
  {
    icoon: '🇪🇺',
    titel: 'Data blijft in de EU',
    tekst: 'Je account-, object- en huisstijlgegevens staan in een beveiligde Europese database (Supabase, regio Frankfurt) — onder de AVG, niet buiten Europa.',
  },
  {
    icoon: '🔒',
    titel: 'Geen verkoop van je data',
    tekst: 'We verkopen of delen je gegevens nooit met derden voor marketing of andere doeleinden. Je data wordt uitsluitend gebruikt om de dienst voor jou te leveren.',
  },
  {
    icoon: '🧠',
    titel: 'Geen AI-training op jouw data',
    tekst: 'De teksten en woninggegevens die je invoert worden niet gebruikt om AI-modellen te trainen. Ze gaan per opdracht naar Claude (Anthropic) en worden daar niet permanent bewaard of hergebruikt.',
  },
  {
    icoon: '🛡️',
    titel: 'Versleuteld, per kantoor afgeschermd',
    tekst: 'Alle verbindingen via HTTPS (TLS), data in rust versleuteld (AES-256). Row Level Security zorgt dat elk kantoor uitsluitend bij zijn eigen gegevens kan.',
  },
  {
    icoon: '💳',
    titel: 'Betalingen via Stripe',
    tekst: 'Facturatie loopt via Stripe (PCI-DSS Level 1). We slaan zelf geen betaal- of creditcardgegevens op.',
  },
  {
    icoon: '📄',
    titel: 'Verwerkersovereenkomst',
    tekst: 'Werk je voor een kantoor of franchise dat een verwerkersovereenkomst (AVG) vereist? Die stellen we op aanvraag beschikbaar.',
  },
]

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E9EFEB',
  borderRadius: 18,
  padding: '24px',
  boxShadow: '0 2px 16px rgba(14,26,19,.04)',
}

export default function VertrouwenPage() {
  return (
    <div style={{ background: '#FBFCFB', minHeight: '100vh' }}>
      <PublicNav active="/vertrouwen" />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '64px 28px 96px' }}>
        {/* Hero */}
        <div style={{ maxWidth: 640 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#1A6B45', marginBottom: 12 }}>
            Vertrouwen &amp; beveiliging
          </p>
          <h1 style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-.02em', color: '#0E1A13', marginBottom: 16 }}>
            Jouw gegevens zijn veilig — en blijven van jou.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#5A6B61' }}>
            Makelaars werken met vertrouwelijke klant- en woninggegevens. Daarom is VestaAI opgebouwd rond
            een paar simpele beloftes: je data staat in Europa, wordt nooit verkocht, en traint geen AI-modellen.
          </p>
        </div>

        {/* Pijlers */}
        <div
          style={{
            marginTop: 48,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}
        >
          {PIJLERS.map(p => (
            <div key={p.titel} style={card}>
              <div style={{ fontSize: 26, marginBottom: 12 }} aria-hidden>{p.icoon}</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13', marginBottom: 6 }}>{p.titel}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#5A6B61' }}>{p.tekst}</p>
            </div>
          ))}
        </div>

        {/* Rechten + contact */}
        <div style={{ ...card, marginTop: 40, padding: '28px 30px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0E1A13', marginBottom: 10 }}>Jouw AVG-rechten</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#5A6B61', marginBottom: 12 }}>
            Je hebt recht op inzage, correctie, verwijdering en overdracht van je persoonsgegevens. Na opzegging
            verwijderen we je gegevens binnen 90 dagen (factuurgegevens bewaren we 7 jaar conform de fiscale bewaarplicht).
            Een verzoek of een verwerkersovereenkomst regel je via{' '}
            <a href="mailto:quinn.berkouwer@gmail.com" style={{ color: '#1A6B45', fontWeight: 600 }}>quinn.berkouwer@gmail.com</a>.
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#5A6B61' }}>
            De volledige juridische details staan in onze{' '}
            <Link href="/privacy" style={{ color: '#1A6B45', fontWeight: 600 }}>privacyverklaring</Link>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E4EAE6', padding: '28px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#9AA6A0' }}>
          <span>© 2026 VestaAI</span>
          <div style={{ display: 'flex', gap: 22 }}>
            <Link href="/" style={{ color: '#9AA6A0', textDecoration: 'none' }}>Home</Link>
            <Link href="/prijzen" style={{ color: '#9AA6A0', textDecoration: 'none' }}>Prijzen</Link>
            <Link href="/privacy" style={{ color: '#9AA6A0', textDecoration: 'none' }}>Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
