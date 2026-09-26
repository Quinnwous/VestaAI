import { AppPagina } from '@/components/ui'
import { Skeleton } from '@/components/ui'

/**
 * Laadstaat voor `/woningen` v2 (item 10.1) — skeletons, geen spinner
 * (docs/ontwerpprincipes.md § Data-weergave), in de vorm van de filterbalk +
 * tabelweergave (de meest gekozen weergave) zodat er geen layoutsprong is
 * zodra de echte data binnenkomt.
 */
export default function WoningenLoading() {
  return (
    <AppPagina>
      <div style={{ marginBottom: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <Skeleton width={90} height={13} style={{ marginBottom: 10 }} />
          <Skeleton width={160} height={32} />
        </div>
        <Skeleton width={150} height={40} rounded={11} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Skeleton width={70} height={32} rounded={999} />
        <Skeleton width={110} height={32} rounded={999} />
        <Skeleton width={90} height={32} rounded={999} />
        <Skeleton width={80} height={32} rounded={999} />
      </div>

      <Skeleton width={360} height={38} rounded={11} style={{ marginBottom: 20 }} />

      <div style={{ borderRadius: 18, border: '1px solid #E6E9EC', background: '#fff', padding: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', opacity: 1 - i * 0.08 }}>
            <Skeleton width={`${220 + (i % 3) * 40}px`} height={14} />
            <Skeleton width={80} height={20} rounded={999} />
            <Skeleton width={70} height={12} />
          </div>
        ))}
      </div>
    </AppPagina>
  )
}
