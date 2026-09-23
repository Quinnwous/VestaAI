'use client'

/**
 * Werkelijke MapLibre-mount (interne implementatie van `BasisKaart.tsx`,
 * die dit zonder SSR laadt — MapLibre raakt canvas/`window` aan). Zet de
 * pastel PDOK-stijl neer (lib/kaart.ts) en geeft de kaartinstantie door aan
 * children (`VerkopenLaag`/`StraalLaag`/`HoverKaart`) via `KaartContext`.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { pdokPastelStijl, type Coord } from '@/lib/kaart'
import { KaartContext } from './KaartContext'

export function BasisKaartMap({
  center = [4.4025, 52.1443],
  zoom = 13,
  bounds,
  hoogte = 480,
  scrollZoom = true,
  children,
}: {
  /** [lng, lat] — alleen gebruikt als er geen `bounds` is. */
  center?: Coord
  zoom?: number
  /** [[minLng,minLat],[maxLng,maxLat]] — wint van `center`/`zoom` bij het eerste laden. */
  bounds?: [Coord, Coord] | null
  hoogte?: number | string
  scrollZoom?: boolean
  children?: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: pdokPastelStijl(),
      center: center as [number, number],
      zoom,
      attributionControl: false,
      scrollZoom,
    })
    map.addControl(new maplibregl.AttributionControl({ compact: true }))
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      if (bounds) map.fitBounds(bounds as [[number, number], [number, number]], { padding: 40, duration: 0 })
      setMapInstance(map)
    })

    return () => {
      map.remove()
      setMapInstance(null)
    }
    // center/zoom/bounds worden bewust alleen bij het opzetten van de kaart
    // gebruikt — een latere prop-wijziging (bv. een ander filter) verplaatst
    // de kaart niet opnieuw. Lagen reageren zelf op hun eigen databewegingen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        height: hoogte,
        borderRadius: 'var(--merk-radius-card-lg, 18px)',
        overflow: 'hidden',
        border: '1px solid #E6E9EC',
        position: 'relative',
      }}
    >
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      <KaartContext.Provider value={mapInstance}>{mapInstance ? children : null}</KaartContext.Provider>
    </div>
  )
}
