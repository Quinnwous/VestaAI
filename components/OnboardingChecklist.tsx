import Link from 'next/link'

interface OnboardingChecklistProps {
  heeftObjecten: boolean
  heeftHuisstijl: boolean
  heeftDocumenten: boolean
  newestObjectId: string | null
}

const stappen = [
  { id: 'account', label: 'Account aangemaakt' },
  { id: 'object', label: 'Eerste woning gegenereerd' },
  { id: 'huisstijl', label: 'Huisstijl ingesteld' },
  { id: 'document', label: 'Document geüpload (VvE, akte of meetrapport)' },
]

export function OnboardingChecklist({ heeftObjecten, heeftHuisstijl, heeftDocumenten, newestObjectId }: OnboardingChecklistProps) {
  const status = {
    account: true,
    object: heeftObjecten,
    huisstijl: heeftHuisstijl,
    document: heeftDocumenten,
  }

  const klaar = Object.values(status).every(Boolean)
  if (klaar) return null

  const aantalKlaar = Object.values(status).filter(Boolean).length
  const voortgang = Math.round((aantalKlaar / stappen.length) * 100)

  // Per-woning-stappen openen de werkruimte van de laatste woning (of het formulier).
  const werkruimte = newestObjectId ? `/object/${newestObjectId}` : '/object/new'
  const acties: Record<string, { href: string; label: string }> = {
    object: { href: '/object/new', label: 'Nu aanmaken →' },
    huisstijl: { href: '/huisstijl', label: 'Instellen →' },
    document: { href: werkruimte, label: 'Uploaden →' },
  }

  return (
    <div style={{ marginBottom: 28, borderRadius: 'var(--merk-radius-card-lg,18px)', border: '1px solid var(--merk-rand,#D5E8DD)', background: 'var(--merk-zacht,#F1F7F3)', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--merk-diep,#0E3B27)' }}>Aan de slag — {aantalKlaar}/{stappen.length} stappen</p>
        <span style={{ fontSize: 12, color: 'var(--merk,#1A6B45)', fontWeight: 600 }}>{voortgang}%</span>
      </div>

      <div style={{ width: '100%', background: 'var(--merk-rand,#C7E6D5)', borderRadius: 'var(--merk-radius-pill, 9999px)', height: 5, marginBottom: 16 }}>
        <div
          style={{ background: 'var(--merk,#1A6B45)', height: 5, borderRadius: 'var(--merk-radius-pill, 9999px)', transition: 'width .5s', width: `${voortgang}%` }}
        />
      </div>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stappen.map(stap => {
          const gedaan = status[stap.id as keyof typeof status]
          const actie = acties[stap.id]
          return (
            <li key={stap.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: gedaan ? 'var(--merk,#1A6B45)' : '#fff', border: gedaan ? 'none' : '2px solid var(--merk-rand,#A8D4BB)' }}>
                {gedaan && (
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="var(--merk-op,#fff)">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {/* Afgevinkt is bewust neutraal grijs: de accentkleur van een kantoor kan rood
                  zijn, en dan leest een afgeronde stap als een foutmelding. */}
              <span style={{ fontSize: 14, fontWeight: gedaan ? 400 : 600, color: gedaan ? '#7C8A82' : 'var(--merk-diep,#0E3B27)', textDecoration: gedaan ? 'line-through' : 'none' }}>
                {stap.label}
              </span>
              {!gedaan && actie && (
                <Link href={actie.href} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--merk,#1A6B45)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                  {actie.label}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
