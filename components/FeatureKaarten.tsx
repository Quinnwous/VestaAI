import Link from 'next/link'

type Kaart = {
  titel: string
  desc: string
  href: string
  emoji: string
}

export function FeatureKaarten({ newestObjectId }: { newestObjectId: string | null }) {
  // Per-woning-tools openen in de werkruimte van de meest recente woning;
  // heeft de gebruiker nog geen woning, dan start hij er een.
  const werkruimte = newestObjectId ? `/object/${newestObjectId}` : '/object/new'

  const kaarten: Kaart[] = [
    { titel: 'Content genereren', desc: 'Funda-tekst, brochures, social & koper-e-mail uit 8 velden.', href: '/object/new', emoji: '✍️' },
    { titel: "Foto's & virtual staging", desc: 'Verbeter woningfoto’s of meubileer een lege kamer met AI.', href: werkruimte, emoji: '🏡' },
    { titel: 'Documenten-assistent', desc: 'Upload VvE-notulen of aktes en stel er vragen over.', href: werkruimte, emoji: '📄' },
    { titel: 'Object-chatbot', desc: 'Beantwoord vragen van geïnteresseerden automatisch.', href: '/chatbot', emoji: '💬' },
    { titel: 'Content-kalender', desc: 'Plan je social posts vooruit en houd overzicht.', href: '/kalender', emoji: '🗓️' },
    { titel: 'Huisstijl', desc: 'Leg jullie schrijftoon vast — content klinkt als je kantoor.', href: '/huisstijl', emoji: '🎨' },
  ]

  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0E1A13', marginBottom: 4 }}>Dit kan VestaAI</h2>
      <p style={{ fontSize: 13, color: '#9AA6A0', marginBottom: 16 }}>Alle tools op een rij — klik om aan de slag te gaan.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))', gap: 12 }}>
        {kaarten.map(k => (
          <Link
            key={k.titel}
            href={k.href}
            style={{
              display: 'block', textDecoration: 'none',
              borderRadius: 16, background: '#fff', border: '1px solid #E9EFEB',
              padding: '18px 18px 16px', boxShadow: '0 2px 12px rgba(14,26,19,.04)',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 10 }}>{k.emoji}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0E1A13', marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {k.titel}
              <span style={{ color: '#1A6B45', fontWeight: 700 }}>→</span>
            </div>
            <p style={{ fontSize: 12.5, color: '#5A6B61', lineHeight: 1.5, margin: 0 }}>{k.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
