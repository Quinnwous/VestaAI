import { AppPagina, Skeleton } from '@/components/ui'

/**
 * Algemene laadstaat voor de ingelogde omgeving (pagina's zonder eigen
 * loading.tsx): skeletons in de vorm van een paginakop, een tegelrij en twee
 * kaarten — nooit een spinner (docs/ontwerp/principes.md § Data-weergave).
 * Geen PaginaOvergang: de echte pagina neemt de binnenkomst over.
 */
export default function AppLoading() {
  return (
    <AppPagina overgang={false}>
      <div aria-busy="true" aria-label="Pagina wordt geladen">
        <Skeleton width={110} height={12} style={{ marginBottom: 12 }} />
        <Skeleton width={280} height={34} style={{ marginBottom: 28 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={118} rounded={16} />
          ))}
        </div>
        <div className="vui-marktanalyse-grafieken">
          <Skeleton height={280} rounded={18} />
          <Skeleton height={280} rounded={18} />
        </div>
      </div>
    </AppPagina>
  )
}
