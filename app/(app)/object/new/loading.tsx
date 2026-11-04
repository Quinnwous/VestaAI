import { AppPagina, Skeleton } from '@/components/ui'

/**
 * Laadstaat van "Nieuwe woning": zelfde vorm als de echte pagina (kop, de
 * stapbalk van de zesstappenwizard, de velden van stap 1 en vanaf 1280 px
 * het "Deze woning"-zijpaneel), zodat er geen sprong is als het formulier
 * verschijnt. Skeletons, geen spinner (docs/ontwerp/principes.md § Data).
 */
export default function NewObjectLoading() {
  return (
    <AppPagina overgang={false}>
      <div aria-busy="true" aria-label="Formulier wordt geladen">
        <Skeleton width={110} height={12} style={{ marginBottom: 12 }} />
        <Skeleton width={300} height={34} style={{ marginBottom: 28 }} />
        <div className="intake-layout">
          <div style={{ display: 'grid', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, paddingBottom: 18, borderBottom: '1px solid #E6E9EC' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={22} rounded={8} />
              ))}
            </div>
            <div>
              <Skeleton width={90} height={12} style={{ marginBottom: 8 }} />
              <Skeleton height={46} rounded={12} />
            </div>
            <div className="form-grid-2">
              <div><Skeleton width={110} height={12} style={{ marginBottom: 8 }} /><Skeleton height={46} rounded={12} /></div>
              <div><Skeleton width={80} height={12} style={{ marginBottom: 8 }} /><Skeleton height={46} rounded={12} /></div>
            </div>
            <Skeleton height={52} rounded={12} />
          </div>
          <div className="intake-zijpaneel">
            <Skeleton height={260} rounded={14} />
          </div>
        </div>
      </div>
    </AppPagina>
  )
}
