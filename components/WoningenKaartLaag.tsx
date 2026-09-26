'use client'

/**
 * WoningenKaartLaag — dossiers als mini-beeldmerk-pins (`Pin.tsx`) op een
 * `<BasisKaart>`, voor `/woningen` kaartweergave (item 10.1, docs/roadmap.md
 * § Fase 10). Zelfde opzet als `components/kaart/VerkopenLaag.tsx`, maar
 * buiten `components/kaart/` gebouwd: die map is eigendom van een andere
 * agent (7.1-7.3, verkoopkaart) en mag alleen gelezen/geïmporteerd worden.
 * Geen clustering — een portefeuille van deze schaal blijft ruim onder de
 * 200-punten-drempel uit docs/ontwerp/README.md § 6.
 *
 * Gebruik: als kind van <BasisKaart>, samen met <WoningenKaartHover>:
 *   <BasisKaart bounds={bounds}>
 *     <WoningenKaartLaag woningen={rijen} onHover={setHover} onSelect={id => router.push(`/object/${id}`)} />
 *     <WoningenKaartHover info={hover} />
 *   </BasisKaart>
 */
import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as maplibregl from 'maplibre-gl'
import { useKaartInstance } from '@/components/kaart/KaartContext'
import { Pin } from '@/components/kaart'
import type { ObjectFase } from '@/lib/schemas'

export type WoningKaartPunt = {
  id: string
  address: string
  fase: ObjectFase
  status: string
  lat: number
  lng: number
}

export type WoningHoverInfo = {
  woning: WoningKaartPunt
  x: number
  y: number
}

export function WoningenKaartLaag({
  woningen,
  geselecteerdId = null,
  onHover,
  onSelect,
}: {
  woningen: WoningKaartPunt[]
  geselecteerdId?: string | null
  onHover?: (info: WoningHoverInfo | null) => void
  onSelect?: (id: string) => void
}) {
  const map = useKaartInstance()
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!map) return

    const nieuweMarkers: maplibregl.Marker[] = []

    for (const w of woningen) {
      const basisVariant = w.id === geselecteerdId ? 'gekozen' : 'normaal'
      const el = document.createElement('div')
      el.innerHTML = renderToStaticMarkup(<Pin variant={basisVariant} />)
      el.style.cursor = 'pointer'
      el.setAttribute('aria-label', w.address)

      el.addEventListener('mouseenter', () => {
        el.innerHTML = renderToStaticMarkup(<Pin variant="hover" />)
        const punt = map.project([w.lng, w.lat])
        onHover?.({ woning: w, x: punt.x, y: punt.y })
      })
      el.addEventListener('mouseleave', () => {
        el.innerHTML = renderToStaticMarkup(<Pin variant={basisVariant} />)
        onHover?.(null)
      })
      el.addEventListener('click', () => onSelect?.(w.id))

      nieuweMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([w.lng, w.lat]).addTo(map))
    }

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = nieuweMarkers

    return () => {
      nieuweMarkers.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [map, woningen, geselecteerdId, onHover, onSelect])

  return null
}
