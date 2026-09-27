import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicNav } from '@/components/PublicNav'
import { PublicFooter } from '@/components/PublicFooter'

export const metadata: Metadata = {
  title: 'Vertrouwen & beveiliging — VestaAI',
  description:
    'Uw klant- en objectgegevens zijn veilig en blijven van u: opslag in de EU, geen verkoop van data, en geen training van AI-modellen op uw gegevens.',
  alternates: {
    canonical: '/vertrouwen',
  },
}

const PIJLERS: { titel: string; tekst: string; icoon: string }[] = [
  {
    icoon: '🇪🇺',
    titel: 'Data blijft in de EU',
    tekst: 'Uw account-, object- en huisstijlgegevens staan in een beveiligde Europese database (Supabase, regio Frankfurt) — onder de AVG, niet buiten Europa.',
  },
  {
    icoon: '🔒',
    titel: 'Geen verkoop van uw data',
    tekst: 'We verkopen of delen uw gegevens nooit met derden voor marketing of andere doeleinden. Uw data wordt uitsluitend gebruikt om de dienst voor u te leveren.',
  },
  {
    icoon: '🧠',
    titel: 'Geen AI-training op uw data',
    tekst: 'De teksten en woninggegevens die u invoert worden niet gebruikt om AI-modellen te trainen. Ze gaan per opdracht naar Claude (Anthropic) of, voor virtual staging, naar Gemini (Google), en worden daar niet permanent bewaard of hergebruikt.',
  },
  {
    icoon: '🛡️',
    titel: 'Versleuteld, per kantoor afgeschermd',
    tekst: 'Alle verbindingen via HTTPS (TLS), data in rust versleuteld (AES-256). Row Level Security zorgt dat elk kantoor uitsluitend bij zijn eigen gegevens kan.',
  },
  {
    icoon: '📄',
    titel: 'Verwerkersovereenkomst',
    tekst: 'Werkt u voor een kantoor of franchise dat een verwerkersovereenkomst (AVG) vereist? Die stellen we op aanvraag beschikbaar.',
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
            Uw gegevens zijn veilig — en blijven van u.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: '#5A6B61' }}>
            Makelaars werken met vertrouwelijke klant- en woninggegevens. Daarom is VestaAI opgebouwd rond
            een paar simpele beloftes: uw data staat in Europa, wordt nooit verkocht, en traint geen AI-modellen.
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
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0E1A13', marginBottom: 10 }}>Uw AVG-rechten</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#5A6B61', marginBottom: 12 }}>
            U heeft recht op inzage, correctie, verwijdering en overdracht van uw persoonsgegevens. Trekt de
            platform-admin de toegang van uw kantoor in, dan verwijderen we uw gegevens binnen 90 dagen (tenzij
            een wettelijke bewaarplicht een langere termijn vereist).
            Een verzoek of een verwerkersovereenkomst regelt u via{' '}
            <a href="mailto:quinn.berkouwer@gmail.com" style={{ color: '#1A6B45', fontWeight: 600 }}>quinn.berkouwer@gmail.com</a>.
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#5A6B61' }}>
            De volledige juridische details staan in onze{' '}
            <Link href="/privacy" style={{ color: '#1A6B45', fontWeight: 600 }}>privacyverklaring</Link>.
          </p>
        </div>
      </main>

      <PublicFooter links={[{ href: '/', label: 'Home' }, { href: '/privacy', label: 'Privacy' }]} />
    </div>
  )
}
