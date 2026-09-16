/**
 * Scorebord voor de acquisitiefase (besluit 16 sep 2026, zie CLAUDE.md §
 * Hoofdstructuur): hoeveel pitches lopen er nog, hoeveel win je, waar verlies
 * je — stuurinformatie die geen enkele makelaarssoftware standaard geeft.
 * Verschijnt pas zodra er acquisitiedossiers zijn.
 */
export function PitchScorebord({ rows }: { rows: { pitch_uitslag: string | null }[] }) {
  if (rows.length === 0) return null

  const open = rows.filter(r => (r.pitch_uitslag ?? 'open') === 'open').length
  const gewonnen = rows.filter(r => r.pitch_uitslag === 'gewonnen').length
  const verloren = rows.filter(r => r.pitch_uitslag === 'verloren').length
  const beslist = gewonnen + verloren
  const winratio = beslist > 0 ? Math.round((gewonnen / beslist) * 100) : null

  const cijfers: { label: string; waarde: string | number }[] = [
    { label: 'Open pitches', waarde: open },
    { label: 'Gewonnen', waarde: gewonnen },
    { label: 'Verloren', waarde: verloren },
    { label: 'Winratio', waarde: winratio !== null ? `${winratio}%` : '—' },
  ]

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#98A0A6', margin: '0 0 10px' }}>
        Acquisitie
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, maxWidth: 560 }}>
        {cijfers.map(c => (
          <div key={c.label} style={{ borderRadius: 'var(--merk-radius-lg, 14px)', border: '1px solid #E6E9EC', background: '#fff', padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#14181B', margin: 0 }}>{c.waarde}</p>
            <p style={{ fontSize: 12, color: '#98A0A6', margin: '2px 0 0' }}>{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
