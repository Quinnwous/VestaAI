import Link from 'next/link'

/**
 * Paneel voor functies die nog gebouwd worden of tijdelijk gesloten zijn.
 * Eén vorm voor beide, zodat de app tijdens de koerswijziging eerlijk laat zien
 * wat er komt in plaats van lege schermen te tonen.
 */
export function InAanbouw({
  eyebrow,
  titel,
  uitleg,
  punten,
  slot = false,
  actie,
}: {
  eyebrow: string
  titel: string
  uitleg: string
  punten?: string[]
  slot?: boolean
  actie?: { href: string; label: string }
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${slot ? '#E9EFEB' : 'var(--merk-rand)'}`,
        background: slot ? '#FBFCFB' : 'var(--merk-zacht)',
        padding: '30px 32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        {slot && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA6A0" strokeWidth={2.2} aria-hidden>
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 018 0v3" strokeLinecap="round" />
          </svg>
        )}
        <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: slot ? '#9AA6A0' : 'var(--merk)' }}>
          {eyebrow}
        </span>
      </div>

      <h2 style={{ fontSize: 21, fontWeight: 700, color: '#0E1A13', margin: '0 0 8px', letterSpacing: '-.02em' }}>{titel}</h2>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5A6B61', margin: 0, maxWidth: 640 }}>{uitleg}</p>

      {punten && punten.length > 0 && (
        <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
          {punten.map(punt => (
            <li key={punt} style={{ display: 'flex', gap: 10, fontSize: 14, color: '#2A362D', lineHeight: 1.5 }}>
              <span style={{ color: slot ? '#C2CBC6' : 'var(--merk)', flexShrink: 0, fontWeight: 700 }}>→</span>
              {punt}
            </li>
          ))}
        </ul>
      )}

      {actie && (
        <Link
          href={actie.href}
          style={{
            display: 'inline-block', marginTop: 22, borderRadius: 10,
            background: 'var(--merk)', color: 'var(--merk-op)',
            padding: '10px 18px', fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}
        >
          {actie.label}
        </Link>
      )}
    </div>
  )
}
