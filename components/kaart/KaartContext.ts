'use client'

/**
 * Interne wiring, niet publiek geëxporteerd via `index.ts`: geeft de
 * MapLibre-instantie van `<BasisKaart>` door aan laag-componenten
 * (`VerkopenLaag`, `StraalLaag`) die er als children in gerenderd worden.
 * Buiten `components/kaart/` niet gebruiken.
 */
import { createContext, useContext } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'

export const KaartContext = createContext<MapLibreMap | null>(null)

export function useKaartInstance(): MapLibreMap | null {
  return useContext(KaartContext)
}
