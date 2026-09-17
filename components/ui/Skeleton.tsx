import type { CSSProperties } from 'react'
import { colors, radius } from './tokens'

/**
 * Laadstaat als schetsvorm i.p.v. een spinner (docs/ontwerpprincipes.md §
 * Data: "skeletons, nooit spinners" voor database-aggregaties). De shimmer-
 * animatie zit in globals.css (`.vui-skeleton`) zodat hij niet per gebruik
 * opnieuw als inline <style> ingevoegd hoeft te worden.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = radius.sm,
  style,
}: {
  width?: number | string
  height?: number | string
  rounded?: number | string
  style?: CSSProperties
}) {
  return (
    <div
      className="vui-skeleton"
      style={{
        width,
        height,
        borderRadius: rounded,
        background: colors.borderSoft,
        ...style,
      }}
    />
  )
}

/** Rij van meerdere skeleton-tegels, bv. voor een StatTile-rij tijdens het laden. */
export function SkeletonRij({ aantal = 3, height = 90 }: { aantal?: number; height?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${aantal}, 1fr)`, gap: 12 }}>
      {Array.from({ length: aantal }).map((_, i) => (
        <Skeleton key={i} height={height} rounded={radius.cardLg} />
      ))}
    </div>
  )
}
