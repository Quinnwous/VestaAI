'use client'

/**
 * BuurtgrenzenLaag — schakelbare CBS-buurtgrenzen (PDOK, gratis, geen
 * sleutel) op een `<BasisKaart>`: dunne neutrale lijnen + buurtnaam-labels
 * vanaf een zinnige zoom (`lib/buurtgrenzen.ts` `BUURT_LABEL_MINZOOM`), met
 * een lichte hover-highlight per buurt. Haalt bij elke `moveend` alleen het
 * zichtbare kaartgebied op via de eigen proxy-route
 * `/api/kaart/buurtgrenzen` (bbox — nooit heel Nederland in één call, en die
 * route negeert de 250+ CBS-statistiekkolommen die we hier niet nodig
 * hebben).
 *
 * Standaard uit: de aanroeper rendert deze laag alleen als de schakelaar in
 * de filterkop aan staat (zie `VerkoopkaartExplorerV2.tsx`) — geen eigen
 * on/off-state hier. Robuust: een te grote bbox (ver uitgezoomd) of een
 * mislukte fetch breekt de rest van de kaart niet, en meldt zijn status terug
 * via `onStatus` zodat de schakelaar een nette melding kan tonen. Elke fout
 * wordt gelogd (`[buurtgrenzen] …`), nooit stilzwijgend tot "leeg" opgevouwen
 * — zelfde regel als `lib/verrijking.ts`.
 *
 * Gebruik: als kind van <BasisKaart>, bv.
 *   <BuurtgrenzenLaag onStatus={setBuurtgrenzenStatus} />
 */
import { useEffect, useRef } from 'react'
// Alléén het type, geen runtime-import (zie VerkopenLaag.tsx voor de reden,
// les 12.3): voorkomt dat maplibre-gl in élke pagina belandt die deze laag
// importeert.
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl'
import { useKaartInstance } from './KaartContext'
import { BUURT_LABEL_MINZOOM, bboxTeGroot, type Bbox, type BuurtenGeoJSON } from '@/lib/buurtgrenzen'

const BRON_ID = 'buurtgrenzen-bron'
const HOVER_VULLING_LAAG_ID = 'buurtgrenzen-hover-vulling'
const RAND_LAAG_ID = 'buurtgrenzen-rand'
const LABEL_LAAG_ID = 'buurtgrenzen-label'

export type BuurtgrenzenStatus = 'laden' | 'ok' | 'leeg' | 'mislukt' | 'te_ver_uitgezoomd'

const LEGE_FC: BuurtenGeoJSON = { type: 'FeatureCollection', features: [] }

export function BuurtgrenzenLaag({ onStatus }: { onStatus?: (status: BuurtgrenzenStatus) => void }) {
  const map = useKaartInstance()
  const toegevoegdRef = useRef(false)
  const hoverIdRef = useRef<string | number | null>(null)
  const laatsteBboxRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!map) return

    if (!map.getSource(BRON_ID)) {
      map.addSource(BRON_ID, { type: 'geojson', data: LEGE_FC, promoteId: 'buurtcode' })
      // Volgorde bepaalt de stapeling: hover-vlak onderaan, rand erboven (crisp lijn), label bovenaan.
      map.addLayer({
        id: HOVER_VULLING_LAAG_ID,
        type: 'fill',
        source: BRON_ID,
        paint: {
          'fill-color': '#8A93A0',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.1, 0],
        },
      })
      map.addLayer({
        id: RAND_LAAG_ID,
        type: 'line',
        source: BRON_ID,
        paint: {
          'line-color': '#8A93A0',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 1],
          'line-opacity': 0.85,
        },
      })
      map.addLayer({
        id: LABEL_LAAG_ID,
        type: 'symbol',
        source: BRON_ID,
        minzoom: BUURT_LABEL_MINZOOM,
        layout: {
          'text-field': ['get', 'buurtnaam'],
          'text-font': ['Liberation Sans Regular'],
          'text-size': 11,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#5C6470',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 1.2,
        },
      })
      toegevoegdRef.current = true
    }

    async function haalOp(bbox: Bbox) {
      const sleutel = bbox.map((n) => n.toFixed(4)).join(',')
      if (sleutel === laatsteBboxRef.current) return
      laatsteBboxRef.current = sleutel

      const bron = map!.getSource(BRON_ID) as GeoJSONSource | undefined

      if (bboxTeGroot(bbox)) {
        onStatus?.('te_ver_uitgezoomd')
        bron?.setData(LEGE_FC)
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      onStatus?.('laden')

      try {
        const res = await fetch(`/api/kaart/buurtgrenzen?bbox=${bbox.join(',')}`, { signal: controller.signal })
        const json: { status?: BuurtgrenzenStatus; data?: BuurtenGeoJSON } | null = await res.json().catch(() => null)
        const status = json?.status

        if (!res.ok || !status) {
          console.error(`[buurtgrenzen] laag kon niet laden (HTTP ${res.status})`)
          onStatus?.('mislukt')
          return
        }

        bron?.setData(status === 'ok' && json?.data ? json.data : LEGE_FC)
        onStatus?.(status)
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('[buurtgrenzen] fetch mislukt', err)
        onStatus?.('mislukt')
      }
    }

    function opMove() {
      const b = map!.getBounds()
      void haalOp([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }

    function opMouseMove(e: MapMouseEvent & { features?: GeoJSON.Feature[] }) {
      const feature = e.features?.[0]
      const featureId = feature?.id
      if (featureId == null || hoverIdRef.current === featureId) return
      if (hoverIdRef.current != null) {
        map!.setFeatureState({ source: BRON_ID, id: hoverIdRef.current }, { hover: false })
      }
      hoverIdRef.current = featureId
      map!.setFeatureState({ source: BRON_ID, id: featureId }, { hover: true })
    }

    function opMouseLeave() {
      if (hoverIdRef.current != null) {
        map!.setFeatureState({ source: BRON_ID, id: hoverIdRef.current }, { hover: false })
        hoverIdRef.current = null
      }
    }

    map.on('moveend', opMove)
    map.on('mousemove', HOVER_VULLING_LAAG_ID, opMouseMove)
    map.on('mouseleave', HOVER_VULLING_LAAG_ID, opMouseLeave)
    opMove()

    return () => {
      map.off('moveend', opMove)
      map.off('mousemove', HOVER_VULLING_LAAG_ID, opMouseMove)
      map.off('mouseleave', HOVER_VULLING_LAAG_ID, opMouseLeave)
      abortRef.current?.abort()
      laatsteBboxRef.current = null
      if (toegevoegdRef.current) {
        if (map.getLayer(LABEL_LAAG_ID)) map.removeLayer(LABEL_LAAG_ID)
        if (map.getLayer(RAND_LAAG_ID)) map.removeLayer(RAND_LAAG_ID)
        if (map.getLayer(HOVER_VULLING_LAAG_ID)) map.removeLayer(HOVER_VULLING_LAAG_ID)
        if (map.getSource(BRON_ID)) map.removeSource(BRON_ID)
        toegevoegdRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, onStatus])

  return null
}
