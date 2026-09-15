import Link from 'next/link'
import { Eyebrow, SerifTitle } from '@/components/ui'
import { CONTENT_VERGRENDELD } from '@/lib/features'

type Kaart = {
  titel: string
  desc: string
  href: string
  emoji: string
  slot?: boolean
}

/**
 * Wegwijzer op het dashboard. Sinds de koerswijziging (sept 2026) staan hier
 * waardering en marktanalyse voorop; de contentsuite staat er vergrendeld bij
 * zodat zichtbaar blijft dat hij bestaat en terugkomt.
 */
export function FeatureKaarten({ newestObjectId }: { newestObjectId: string | null }) {
  // Per-woning-tools openen in het dossier van de meest recente woning.
  const werkruimte = newestObjectId ? `/object/${newestObjectId}` : null

  const kaarten: Kaart[] = [
    {
      titel: 'Waardering',
      desc: 'Onderbouwde woningwaarde met referenties en wat-als-scenario’s.',
      href: werkruimte ?? '/dashboard',
      emoji: '📊',
    },
    {
      titel: 'Marktanalyse',
      desc: 'Zoek vrij in verkochte woningen: type, wijk, periode.',
      href: '/marktanalyse',
      emoji: '📈',
    },
    {
      titel: 'Huisstijl',
      desc: 'Logo en kleuren van uw kantoor — die kleuren deze hele omgeving.',
      href: '/huisstijl',
      emoji: '🎨',
    },
    {
      titel: 'Content',
      desc: CONTENT_VERGRENDELD ? 'Woningteksten, staging en documenten. Tijdelijk gesloten.' : 'Woningteksten, virtual staging en documenten per woning.',
      href: CONTENT_VERGRENDELD ? '/dashboard' : (werkruimte ?? '/object/new'),
      emoji: CONTENT_VERGRENDELD ? '🔒' : '✍️',
      slot: CONTENT_VERGRENDELD,
    },
  ]

  return (
    <section style={{ marginTop: 44 }}>
      <Eyebrow>Aan de slag</Eyebrow>
      <SerifTitle as="h2" size={24} style={{ marginBottom: 4 }}>Dit kan VestaAI</SerifTitle>
      <p style={{ fontSize: 13.5, color: '#9AA6A0', margin: '0 0 18px' }}>Waardering en marktanalyse zijn in aanbouw — u ziet per onderdeel wat eraan komt.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))', gap: 12 }}>
        {kaarten.map(k => {
          const inhoud = (
            <>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: k.slot ? '#F4F7F5' : 'var(--merk-zacht)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>{k.emoji}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: k.slot ? '#9AA6A0' : '#0E1A13', marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {k.titel}
                {!k.slot && <span style={{ color: 'var(--merk)', fontWeight: 700 }}>→</span>}
              </div>
              <p style={{ fontSize: 12.5, color: '#5A6B61', lineHeight: 1.5, margin: 0 }}>{k.desc}</p>
            </>
          )
          const stijl: React.CSSProperties = {
            display: 'block', textDecoration: 'none',
            borderRadius: 16, background: '#fff', border: '1px solid #E9EFEB',
            padding: 18, boxShadow: '0 2px 12px rgba(14,26,19,.04)',
            transition: 'border-color .15s, box-shadow .15s, transform .15s',
          }
          return k.slot ? (
            <div key={k.titel} style={{ ...stijl, background: '#FBFCFB' }}>{inhoud}</div>
          ) : (
            <Link key={k.titel} href={k.href} className="vui-card-lift" style={stijl}>{inhoud}</Link>
          )
        })}
      </div>
    </section>
  )
}
