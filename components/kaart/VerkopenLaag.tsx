'use client'

/**
 * VerkopenLaag — eigen verkopen als mini-beeldmerk-pins (`Pin.tsx`) op een
 * `<BasisKaart>`. Clustert boven 200 zichtbare punten (docs/ontwerp/
 * README.md § 6) tot een blauwe cirkel met het aantal — via de pure
 * `clusterPunten`/`celGradenVoorZoom` uit lib/kaart.ts. Meldt hover/klik
 * terug via `onHover`/`onSelect` zodat een zijlijst of `HoverKaart` kan
 * meebewegen.
 *
 * Gebruik: als kind van <BasisKaart> — leest de kaartinstantie via context.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as maplibregl from 'maplibre-gl'
import { useKaartInstance } from './KaartContext'
import { Pin } from './Pin'
import { clusterPunten, celGradenVoorZoom, type ClusterPunt } from '@/lib/kaart'
import type { TransactieMetCoordinaten } from '@/lib/supabase'

const CLUSTER_DREMPEL = 200

export type VerkoopHoverInfo = {
  transactie: TransactieMetCoordinaten
  /** Pixelpositie binnen de kaartcontainer (map.project), voor HoverKaart. */
  x: number
  y: number
}

export function VerkopenLaag({
  transacties,
  geselecteerdId = null,
  onHover,
  onSelect,
}: {
  transacties: TransactieMetCoordinaten[]
  geselecteerdId?: string | null
  onHover?: (info: VerkoopHoverInfo | null) => void
  onSelect?: (id: string) => void
}) {
  const map = useKaartInstance()
  const [zoom, setZoom] = useState<number>(() => map?.getZoom() ?? 13)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!map) return
    const opZoom = () => setZoom(map.getZoom())
    opZoom()
    map.on('zoomend', opZoom)
    return () => {
      map.off('zoomend', opZoom)
    }
  }, [map])

  const punten = useMemo(
    () =>
      transacties.filter(
        (t): t is TransactieMetCoordinaten & { lat: number; lng: number } => t.lat !== null && t.lng !== null,
      ),
    [transacties],
  )

  useEffect(() => {
    if (!map) return

    const toonClusters = punten.length > CLUSTER_DREMPEL
    const nieuweMarkers: maplibregl.Marker[] = []

    if (toonClusters) {
      const invoer: ClusterPunt[] = punten.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }))
      const clusters = clusterPunten(invoer, celGradenVoorZoom(zoom))
      for (const cluster of clusters) {
        const el = document.createElement('div')
        el.innerHTML = renderToStaticMarkup(<Pin variant="cluster" aantal={cluster.aantal} />)
        el.style.cursor = 'pointer'
        nieuweMarkers.push(
          new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([cluster.lng, cluster.lat]).addTo(map),
        )
      }
      onHover?.(null)
    } else {
      for (const p of punten) {
        const basisVariant = p.id === geselecteerdId ? 'gekozen' : 'normaal'
        const el = document.createElement('div')
        el.innerHTML = renderToStaticMarkup(<Pin variant={basisVariant} />)
        el.style.cursor = 'pointer'
        el.setAttribute('aria-label', `${p.adres}, ${p.verkoopprijs ? `€${p.verkoopprijs.toLocaleString('nl-NL')}` : 'prijs onbekend'}`)

        el.addEventListener('mouseenter', () => {
          el.innerHTML = renderToStaticMarkup(<Pin variant="hover" />)
          const punt = map.project([p.lng, p.lat])
          onHover?.({ transactie: p, x: punt.x, y: punt.y })
        })
        el.addEventListener('mouseleave', () => {
          el.innerHTML = renderToStaticMarkup(<Pin variant={basisVariant} />)
          onHover?.(null)
        })
        el.addEventListener('click', () => onSelect?.(p.id))

        nieuweMarkers.push(
          new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map),
        )
      }
    }

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = nieuweMarkers

    return () => {
      nieuweMarkers.forEach((m) => m.remove())
      markersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, punten, zoom, geselecteerdId])

  return null
}
