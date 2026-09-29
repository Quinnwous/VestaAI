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
// Alléén het type, geen runtime-import: anders trekt deze laag maplibre-gl
// (~280 kB gzip) het hoofdbundel van elke pagina in die deze laag ergens
// importeert, óók als <BasisKaart> zelf al dynamic (ssr:false) is — de
// dynamic-import-grens beschermt alleen de module die hij zelf wrapt, niet
// de children die er los naast worden geïmporteerd (les 12.3, performance).
import type * as maplibregl from 'maplibre-gl'
// Zelfde reden voor react-dom/server: renderToStaticMarkup + react-dom-server
// trekken ~59 kB gzip in de hoofdbundel mee als ze statisch geïmporteerd
// worden — ook hier alleen runtime via await import() in het effect.
import type { renderToStaticMarkup as RenderToStaticMarkup } from 'react-dom/server'
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
    let actief = true

    Promise.all([import('maplibre-gl'), import('react-dom/server')]).then(([{ Marker }, serverModule]) => {
      if (!actief || !map) return
      const renderToStaticMarkup: typeof RenderToStaticMarkup = serverModule.renderToStaticMarkup

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

        nieuweMarkers.push(new Marker({ element: el, anchor: 'bottom' }).setLngLat([w.lng, w.lat]).addTo(map))
      }

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = nieuweMarkers
    })

    return () => {
      actief = false
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [map, woningen, geselecteerdId, onHover, onSelect])

  return null
}
