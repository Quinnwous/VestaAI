'use client'

/**
 * StraalLaag — cirkel rond een middelpunt (bv. een woningadres) als
 * GeoJSON-vlak/rand-laag op een `<BasisKaart>`, straal in meters
 * (`lib/kaart.ts` `cirkelPolygoon`). Voor item 7.3 (StraalKaartPaneel) en
 * de referentiekaart in de waardering.
 *
 * Gebruik: als kind van <BasisKaart>, bv.
 *   <StraalLaag center={[lng, lat]} straalM={500} />
 */
import { useEffect, useRef } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useKaartInstance } from './KaartContext'
import { cirkelPolygoon, type Coord } from '@/lib/kaart'

const BRON_ID = 'straal-laag-bron'
const VLAK_LAAG_ID = 'straal-laag-vlak'
const RAND_LAAG_ID = 'straal-laag-rand'

/** Native MapLibre-paint kent geen var(...) — hier eenmalig de --merk-waarde uitlezen. */
function leesMerkKleur(naam: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const waarde = getComputedStyle(document.documentElement).getPropertyValue(naam).trim()
  return waarde || fallback
}

export function StraalLaag({ center, straalM }: { center: Coord; straalM: number }) {
  const map = useKaartInstance()
  const toegevoegdRef = useRef(false)

  useEffect(() => {
    if (!map) return
    const kleur = leesMerkKleur('--merk', '#0080C8')
    const polygoon = cirkelPolygoon(center, straalM)

    const bron = map.getSource(BRON_ID) as GeoJSONSource | undefined
    if (bron) {
      bron.setData(polygoon)
    } else {
      map.addSource(BRON_ID, { type: 'geojson', data: polygoon })
      map.addLayer({ id: VLAK_LAAG_ID, type: 'fill', source: BRON_ID, paint: { 'fill-color': kleur, 'fill-opacity': 0.1 } })
      map.addLayer({ id: RAND_LAAG_ID, type: 'line', source: BRON_ID, paint: { 'line-color': kleur, 'line-width': 1.5 } })
      toegevoegdRef.current = true
    }

    return () => {
      if (!toegevoegdRef.current) return
      if (map.getLayer(RAND_LAAG_ID)) map.removeLayer(RAND_LAAG_ID)
      if (map.getLayer(VLAK_LAAG_ID)) map.removeLayer(VLAK_LAAG_ID)
      if (map.getSource(BRON_ID)) map.removeSource(BRON_ID)
      toegevoegdRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center[0], center[1], straalM])

  return null
}
