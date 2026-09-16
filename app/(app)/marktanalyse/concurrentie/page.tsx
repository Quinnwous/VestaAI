import { InAanbouw } from '@/components/InAanbouw'

export const metadata = { title: 'Concurrentieanalyse' }

/**
 * Concurrentieanalyse — eigen kantoor vs. concurrenten in de regio (zie
 * CLAUDE.md § Hoofdstructuur). Draait idealiter op dezelfde Realworks-export
 * als de waardering áls die ook het verkopende kantoor bevat (besluit 16 sep
 * 2026 — nog te bevestigen); zo niet, dan op een latere Brainbay-import. Geen
 * slotje meer op dit scherm — het wachten op data geldt evengoed voor
 * Marktanalyse en is geen aparte vergrendeling.
 */
export default function ConcurrentieAnalysePage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <InAanbouw
        eyebrow="Concurrentieanalyse"
        titel="Hoe presteren we ten opzichte van de regio?"
        uitleg="Interactieve dashboards die de verkoopresultaten en het marktaandeel van het eigen kantoor afzetten tegen concurrenten in de regio."
        punten={[
          'Marktaandeel in de regio, per periode',
          'Wie wint welk segment — per prijsklasse, woningtype en wijk',
          'Presteren wij beter: eigen doorlooptijd en vraagprijs-verschil tegen het regiogemiddelde',
          'Concurrent-profielen: aantal transacties, segment en gemiddelde prijs per kantoor',
        ]}
      />
    </div>
  )
}
