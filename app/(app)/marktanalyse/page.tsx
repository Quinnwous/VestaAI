import { InAanbouw } from '@/components/InAanbouw'

export const metadata = { title: 'Marktanalyse' }

/**
 * Marktanalyse — macro-trends, los van één woning (zie CLAUDE.md § Hoofdstructuur).
 * Wordt geen statisch dashboard maar een interactieve data-explorer (schuivers,
 * knoppen, live hertekenende grafieken — besluit 16 sep 2026): filter op type,
 * wijk en periode, met segmentvergelijking naast elkaar. Wacht op de
 * Realworks-transactie-import (zie docs/roadmap.md § Blokkades) — pas dan kan
 * de daadwerkelijke variabelen-inventarisatie en de explorer gebouwd worden.
 */
export default function MarktanalysePage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <InAanbouw
        eyebrow="Marktanalyse"
        titel="Wat deed de markt?"
        uitleg="Interactieve grafieken over macro-trends: prijsontwikkeling, m²-prijs met spreiding en doorlooptijd, met schuivers en filters om zelf te verkennen — geen statisch dashboard."
        punten={[
          'Filter op woningtype, wijk en periode — de grafieken tekenen live opnieuw',
          'Segmentvergelijking: twee selecties naast elkaar (bv. hoekwoning vs. tussenwoning, dit jaar vs. vorig jaar)',
          'Gemiddelde m²-prijs en de spreiding daarvan, niet alleen het gemiddelde',
          'Verschil tussen vraagprijs en verkoopprijs, en de doorlooptijd',
        ]}
      />
    </div>
  )
}
