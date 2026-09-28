'use client'

import { useMemo } from 'react'
import { BasisKaart, ReferentiesLaag, type ReferentiePunt } from '@/components/kaart'
import { presentatieKaartBounds } from '@/lib/presentatie'
import { radius } from '@/components/ui/tokens'

/**
 * Kaartstap van de presentatiemodus (`WaardePresentatie.tsx`, stap 3): het
 * subject + de genummerde top-6-referenties op één `<BasisKaart>`, dezelfde
 * bouwstenen als `components/WaarderingKaart.tsx` maar zonder de laag-
 * schakelaar, hover-tooltip of "eigen verkopen"-laag — die horen bij de
 * werkomgeving, niet bij het podium. `direct` staat aan: dit is de hoofd-
 * inhoud van de actieve stap, dus geen skelet-wachttijd op de
 * IntersectionObserver (CLAUDE.md § "Kaarten laden lazy").
 */
export function PresentatieKaartStap({
  subject,
  adres,
  referenties,
  hoogte = 480,
}: {
  subject: { lat: number; lng: number }
  adres: string
  referenties: { id: string; lat: number; lng: number }[]
  hoogte?: number
}) {
  const punten: ReferentiePunt[] = useMemo(
    () => referenties.map((r, i) => ({ id: r.id, lat: r.lat, lng: r.lng, volgnummer: i + 1, uitgesloten: false })),
    [referenties],
  )
  const bounds = useMemo(() => presentatieKaartBounds(subject, referenties), [subject, referenties])

  return (
    <div style={{ borderRadius: radius.cardLg, overflow: 'hidden', boxShadow: '0 24px 64px -24px rgba(20,24,27,.28)' }}>
      <BasisKaart bounds={bounds} hoogte={hoogte} scrollZoom={false} direct>
        <ReferentiesLaag subject={{ lat: subject.lat, lng: subject.lng, label: adres }} referenties={punten} />
      </BasisKaart>
    </div>
  )
}
