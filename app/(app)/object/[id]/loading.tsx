import { AppPagina, Skeleton } from '@/components/ui'

/**
 * Laadstaat van het woningdossier in de vorm van de echte pagina
 * (components/DossierHeader.tsx + ObjectWorkspace): kop-kaart met foto,
 * adres, kenmerken en fasestepper links en drie tegels rechts, de tabbalk,
 * en de waarderingstab (hero + referentietabel). Geen layoutsprong zodra het
 * dossier er is; skeletons, geen spinner.
 */
export default function ObjectDetailLoading() {
  return (
    <AppPagina overgang={false}>
      <div aria-busy="true" aria-label="Dossier wordt geladen">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', background: '#fff', border: '1px solid #E6E9EC', borderRadius: 'var(--merk-radius-card-lg, 18px)', padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 18, flex: '1 1 380px', minWidth: 0 }}>
            <Skeleton width={104} height={96} rounded={14} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton width={70} height={11} style={{ marginBottom: 10 }} />
              <Skeleton width="70%" height={28} style={{ marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <Skeleton width={110} height={25} rounded={999} />
                <Skeleton width={90} height={25} rounded={999} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Skeleton width={100} height={28} rounded={999} />
                <Skeleton width={90} height={28} rounded={999} />
                <Skeleton width={80} height={28} rounded={999} />
              </div>
            </div>
          </div>
          <div style={{ flex: '0 1 500px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignContent: 'start' }}>
            <Skeleton height={92} rounded={16} />
            <Skeleton height={92} rounded={16} />
            <Skeleton height={92} rounded={16} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, borderBottom: '1px solid #E6E9EC', margin: '24px 0 26px', paddingBottom: 12 }}>
          <Skeleton width={90} height={16} />
          <Skeleton width={110} height={16} />
          <Skeleton width={130} height={16} />
        </div>

        <div className="vui-marktanalyse-grafieken">
          <Skeleton height={200} rounded={18} />
          <Skeleton height={200} rounded={18} />
        </div>
        <div style={{ marginTop: 12, background: '#fff', border: '1px solid #E6E9EC', borderRadius: 'var(--merk-radius-card-lg, 18px)', padding: 18 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', opacity: 1 - i * 0.1 }}>
              <Skeleton width={`${30 + (i % 3) * 8}%`} height={12} />
              <Skeleton width={80} height={12} />
            </div>
          ))}
        </div>
      </div>
    </AppPagina>
  )
}
