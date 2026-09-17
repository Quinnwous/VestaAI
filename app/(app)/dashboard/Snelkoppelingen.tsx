import Link from 'next/link'
import { colors, radius, shadow } from '@/components/ui/tokens'

type Snelkoppeling = { label: string; href: string; emoji: string; primair?: boolean }

const SNELKOPPELINGEN: Snelkoppeling[] = [
  { label: 'Woning toevoegen', href: '/object/new', emoji: '🏠', primair: true },
  { label: 'Marktanalyse', href: '/marktanalyse', emoji: '📈' },
  { label: 'Transactie opzoeken', href: '/marktanalyse/transacties', emoji: '🔍' },
  { label: 'Verkoopkaart', href: '/marktanalyse/kaart', emoji: '🗺️' },
]

/**
 * Snelkoppelingen op de startpagina (masterplan fase 1.6) — vervangt het
 * oude "Aan de slag / Dit kan het platform"-blok (FeatureKaarten.tsx,
 * verwijderd fase 1.5): geen wegwijzer meer voor nieuwe gebruikers, maar een
 * directe ingang voor dagelijks gebruik.
 */
export function Snelkoppelingen() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
      {SNELKOPPELINGEN.map(s => (
        <Link
          key={s.href}
          href={s.href}
          className="vui-card-lift"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 18px',
            borderRadius: radius.cardLg,
            textDecoration: 'none',
            background: s.primair ? 'var(--merk)' : colors.surface,
            border: s.primair ? 'none' : `1px solid ${colors.border}`,
            boxShadow: s.primair ? shadow.btn : shadow.card,
          }}
        >
          <span style={{ fontSize: 22 }}>{s.emoji}</span>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: s.primair ? 'var(--merk-op)' : colors.text }}>
            {s.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
