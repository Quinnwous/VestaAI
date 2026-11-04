/**
 * Laadstaat buiten de ingelogde omgeving (landing, login, admin): een rustige
 * pulserende stip in VestaAI-groen in plaats van een draaiende spinner.
 */
export default function Loading() {
  return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div aria-busy="true" aria-label="Laden" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#5C6470', fontSize: 14 }}>
        <span aria-hidden className="vui-fase-puls" style={{ width: 9, height: 9, margin: 0 }} />
        Laden…
      </div>
    </main>
  )
}
