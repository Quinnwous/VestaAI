import { InAanbouw } from '@/components/InAanbouw'

export const metadata = { title: 'Transacties opzoeken' }

/**
 * Transacties opzoeken — losse zoekfunctie over de transactiedataset, los van
 * de geaggregeerde grafieken in Marktanalyse (zie CLAUDE.md § Hoofdstructuur).
 * Wacht op de Realworks-import (docs/roadmap.md § Blokkades).
 */
export default function TransactiesPage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <InAanbouw
        eyebrow="Transacties opzoeken"
        titel="Zoek een verkochte woning terug"
        uitleg="Vrij zoeken en filteren over de eigen transactiedataset — geen trend, maar een los record terugvinden."
        punten={[
          'Zoeken op adres, postcode, wijk, straal of periode',
          'Filteren op type, oppervlak, bouwjaar, energielabel en prijsklasse',
          'Geselecteerde transacties direct meenemen als referentie in een lopende waardebepaling',
        ]}
      />
    </div>
  )
}
