import Link from 'next/link'

interface OnboardingChecklistProps {
  heeftObjecten: boolean
  heeftHuisstijl: boolean
}

const stappen = [
  { id: 'account', label: 'Account aangemaakt' },
  { id: 'object', label: 'Eerste object gegenereerd' },
  { id: 'huisstijl', label: 'Huisstijl ingesteld' },
]

export function OnboardingChecklist({ heeftObjecten, heeftHuisstijl }: OnboardingChecklistProps) {
  const status = {
    account: true,
    object: heeftObjecten,
    huisstijl: heeftHuisstijl,
  }

  const klaar = Object.values(status).every(Boolean)
  if (klaar) return null

  const aantalKlaar = Object.values(status).filter(Boolean).length
  const voortgang = Math.round((aantalKlaar / stappen.length) * 100)

  return (
    <div style={{ marginBottom: 28, borderRadius: 18, border: '1px solid #D5E8DD', background: '#F1F7F3', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0E3B27' }}>Aan de slag — {aantalKlaar}/{stappen.length} stappen</p>
        <span style={{ fontSize: 12, color: '#2A8A5C', fontWeight: 600 }}>{voortgang}%</span>
      </div>

      <div style={{ width: '100%', background: '#C7E6D5', borderRadius: 9999, height: 5, marginBottom: 16 }}>
        <div
          style={{ background: '#1A6B45', height: 5, borderRadius: 9999, transition: 'width .5s', width: `${voortgang}%` }}
        />
      </div>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stappen.map(stap => {
          const gedaan = status[stap.id as keyof typeof status]
          return (
            <li key={stap.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: gedaan ? '#1A6B45' : '#fff', border: gedaan ? 'none' : '2px solid #A8D4BB' }}>
                {gedaan && (
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span style={{ fontSize: 14, fontWeight: gedaan ? 400 : 600, color: gedaan ? '#2A8A5C' : '#0E3B27', textDecoration: gedaan ? 'line-through' : 'none' }}>
                {stap.label}
              </span>
              {!gedaan && stap.id === 'object' && (
                <Link href="/object/new" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#1A6B45', textDecoration: 'underline' }}>
                  Nu aanmaken →
                </Link>
              )}
              {!gedaan && stap.id === 'huisstijl' && (
                <Link href="/settings" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#1A6B45', textDecoration: 'underline' }}>
                  Instellen →
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
