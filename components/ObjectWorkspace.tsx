'use client'

import { useState } from 'react'
import { InAanbouw } from '@/components/InAanbouw'
import { TabBar } from '@/components/ui'
import { CONTENT_SLOT_TEKST } from '@/lib/features'

/**
 * Woningdossier — de kern van het product (zie CLAUDE.md § Hoofdstructuur).
 * Alle modules hieronder renderen op basis van dit ene geselecteerde adres:
 *
 * - Module A "Content en media" — vergrendeld, zie lib/features.ts.
 * - Module B "Waardering" — reken- en datamodule, in aanbouw.
 *
 * De oude content-onderdelen (ResultTabs, VirtualStaging, DocumentenAssistent,
 * FotoBibliotheek, EmailPdfButton, RealworksExportButton, PrijswijzigingModal,
 * NotitieVeld) staan geparkeerd in components/ en worden hier bewust niet meer
 * gemount. Ze komen terug zodra de contentsuite weer opengaat.
 */

type SectionId = 'waardering' | 'content'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'waardering', label: 'Waardering' },
  { id: 'content', label: 'Content en media 🔒' },
]

export function ObjectWorkspace({ address }: { address: string }) {
  const [active, setActive] = useState<SectionId>('waardering')

  return (
    <div>
      <TabBar
        tabs={SECTIONS}
        active={active}
        onChange={(id) => setActive(id as SectionId)}
        style={{ margin: '24px 0 26px' }}
      />

      <div style={{ display: active === 'waardering' ? 'block' : 'none' }}>
        <InAanbouw
          eyebrow="Module B — in aanbouw"
          titel={`Waardering van ${address}`}
          uitleg="Een reken- en datamodule: modulaire variabelen die u zelf toevoegt, in- of uitschakelt, plus een AI-extractor die bijzonderheden vertaalt naar Unique Selling Points."
          punten={[
            'Modulaire variabelen als losse blokken: kamers, WOZ, oppervlakte, kavelgrootte, energielabel, staat van onderhoud',
            'AI USP-extractor: typ een bijzonderheid in ("heeft een mooie garage", "nieuw dakkapel") — de AI vertaalt dit naar USP\'s die de waardering en marketing beïnvloeden',
            'Waarde met bandbreedte, onderbouwd met vergelijkbare verkochte woningen',
            'Eén klik naar een waarderingsrapport als PDF, in de huisstijl van uw kantoor',
          ]}
        />
      </div>

      <div style={{ display: active === 'content' ? 'block' : 'none' }}>
        <InAanbouw
          slot
          eyebrow="Module A — tijdelijk gesloten"
          titel={CONTENT_SLOT_TEKST.titel}
          uitleg={CONTENT_SLOT_TEKST.uitleg}
          punten={[
            'Brochure en Funda-tekst',
            'Social media-teksten (bv. Instagram-captions)',
            'Verkoopadvies voor de verkopende partij',
            'Buurtrapport — omgevingsdata en demografie van de wijk',
            'i4housing Map — kaart met kantoor-vlaggetjes op historische verkopen binnen 500 m van dit adres',
            'Virtual staging en documentenassistent',
          ]}
        />
      </div>
    </div>
  )
}
