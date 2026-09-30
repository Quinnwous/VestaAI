'use client'

/**
 * ReferentiesLaag — subject-marker (`SubjectPin`) + genummerde referentie-
 * pins (`ReferentiePin`) op een `<BasisKaart>`, voor de referentiekaart in
 * de waardering (item 7.3, docs/roadmap.md § 3.5). Bewust generiek
 * (lat/lng/nummer/uitgesloten, geen `WaarderingReferentie`-import): de
 * aanroeper buiten `components/kaart/` (`WaarderingKaart.tsx`) kent de eigen
 * data (adres, prijs, datum, …) en rendert de hover-inhoud zelf op basis van
 * het teruggegeven `id` — deze laag meldt alleen ruimtelijke hover-info
 * terug, geen clustering (referentielijsten zijn klein, anders dan
 * `VerkopenLaag`).
 *
 * Gebruik: als kind van <BasisKaart>, zie components/WaarderingKaart.tsx.
 */
import { useEffect, useRef } from 'react'
// Alléén het type, geen runtime-import — zie WoningenKaartLaag.tsx (les
// 12.3, performance).
import type * as maplibregl from 'maplibre-gl'
// Zelfde reden voor react-dom/server (~59 kB gzip) — alleen runtime via
// await import() in het effect.
import type { renderToStaticMarkup as RenderToStaticMarkup } from 'react-dom/server'
import { useKaartInstance } from './KaartContext'
import { SubjectPin } from './SubjectPin'
import { ReferentiePin } from './ReferentiePin'

export type ReferentiePunt = {
  id: string
  lat: number
  lng: number
  volgnummer: number
  uitgesloten: boolean
}

export type ReferentieHoverInfo = {
  id: string
  /** Pixelpositie binnen de kaartcontainer (map.project), voor een tooltip. */
  x: number
  y: number
}

export function ReferentiesLaag({
  subject,
  referenties,
  onHover,
}: {
  subject: { lat: number; lng: number; label: string }
  referenties: ReferentiePunt[]
  onHover?: (info: ReferentieHoverInfo | null) => void
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

      const subjectEl = document.createElement('div')
      subjectEl.innerHTML = renderToStaticMarkup(<SubjectPin />)
      subjectEl.setAttribute('role', 'img')
      subjectEl.setAttribute('aria-label', `Dit adres: ${subject.label}`)
      nieuweMarkers.push(
        new Marker({ element: subjectEl, anchor: 'bottom' })
          .setLngLat([subject.lng, subject.lat])
          .addTo(map),
      )

      for (const r of referenties) {
        const el = document.createElement('div')
        el.innerHTML = renderToStaticMarkup(<ReferentiePin nummer={r.volgnummer} uitgesloten={r.uitgesloten} />)
        el.setAttribute('role', 'img')
        el.setAttribute('aria-label', `Referentie ${r.volgnummer}${r.uitgesloten ? ' (uitgesloten)' : ''}`)
        el.addEventListener('mouseenter', () => {
          const punt = map.project([r.lng, r.lat])
          onHover?.({ id: r.id, x: punt.x, y: punt.y })
        })
        el.addEventListener('mouseleave', () => onHover?.(null))
        nieuweMarkers.push(
          new Marker({ element: el, anchor: 'bottom' })
            .setLngLat([r.lng, r.lat])
            .addTo(map),
        )
      }

      markersRef.current = nieuweMarkers
    })

    return () => {
      actief = false
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, subject.lat, subject.lng, subject.label, referenties])

  return null
}
