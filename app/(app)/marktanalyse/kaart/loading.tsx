import { Skeleton } from '@/components/ui'

/**
 * Laadstaat voor de verkoopkaart (item 7.2, DoD § 4: "skeletons, geen
 * spinners") — Next.js toont dit tijdens het server-side ophalen van
 * `haalEigenVerkopen`/`dataTotEnMet` in page.tsx. Vorm volgt
 * `VerkoopkaartExplorerV2`: kop, filterbalk, kerncijfer-tegels, werkblad.
 */
export default function VerkoopkaartLoading() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <Skeleton width={180} height={30} />
        <Skeleton width={280} height={30} rounded={999} />
      </div>
      <Skeleton height={92} rounded={18} style={{ marginBottom: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={150} rounded={18} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 364px', gap: 12 }}>
        <Skeleton height={620} rounded={18} />
        <Skeleton height={620} rounded={18} />
      </div>
    </div>
  )
}
