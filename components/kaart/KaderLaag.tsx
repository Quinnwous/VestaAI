'use client'

import { useEffect, useRef } from 'react'
import { useKaartInstance } from './KaartContext'

/**
 * KaderLaag — past het kaartkader aan als `bounds` verandert ná het opzetten
 * van de kaart (`BasisKaart` gebruikt `bounds` alleen bij de eerste render).
 * Voor het straalpaneel: de schuiver 100-1.000 m zoomt mee zodat de hele
 * cirkel in beeld blijft (item 7.3).
 */
export function KaderLaag({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useKaartInstance()
  const eerste = useRef(true)
  const sleutel = bounds.flat().join(',')

  useEffect(() => {
    if (!map) return
    // De eerste keer heeft BasisKaart het kader al gezet.
    if (eerste.current) {
      eerste.current = false
      return
    }
    map.fitBounds(bounds, { padding: 24, duration: 350 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sleutel])

  return null
}
