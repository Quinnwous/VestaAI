import { InAanbouw } from '@/components/InAanbouw'
import { Eyebrow, SerifTitle } from '@/components/ui'

export const metadata = { title: 'Marktinzichten' }

/**
 * Marktinzichten (macro) — het spiegelbeeld van het Woningdossier (micro):
 * dashboards die onafhankelijk zijn van één specifieke woning. Twee
 * onderdelen: Marktanalyse (macro-trends) en Concurrentieanalyse (eigen
 * kantoor vs. concurrenten). Draait straks op de geïmporteerde
 * transactiedataset (verkochte woningen, heel Nederland).
 */
export default function MarktinzichtenPage() {
  return (
    <main style={{ maxWidth: 'var(--app-breedte)', margin: '0 auto', padding: '44px 40px 80px' }}>
      <Eyebrow>Marktinzichten</Eyebrow>
      <SerifTitle size={34} accent="de markt" style={{ marginBottom: 10 }}>Zoeken in</SerifTitle>
      <p style={{ fontSize: 15, color: '#5C6470', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
        Straks stel je hier vrije vragen aan de transactiedata — zonder eerst een woning te hoeven aanmaken.
      </p>

      <div style={{ display: 'grid', gap: 16 }}>
        <InAanbouw
          eyebrow="Marktanalyse"
          titel="Wat deed de markt?"
          uitleg="Datagrafieken over macro-trends: prijsontwikkeling, vraag naar bepaalde woningtypes, doorlooptijd — per type, wijk en periode."
          punten={[
            'Bijvoorbeeld: alle twee-onder-een-kapwoningen in Wassenaar, afgelopen twaalf maanden',
            'Vraag naar hoekwoningen vs. tussenwoningen en andere woningtype-vergelijkingen',
            'Gemiddelde m²-prijs en de spreiding daarvan, niet alleen het gemiddelde',
            'Verschil tussen vraagprijs en verkoopprijs, en hoe lang woningen te koop stonden',
          ]}
        />
        <InAanbouw
          eyebrow="Marktanalyse"
          titel="Referentietransacties opzoeken"
          uitleg="Dezelfde dataset die de waardering onderbouwt, maar dan vrij doorzoekbaar — handig ter voorbereiding op een waardebepaling."
          punten={[
            'Zoeken op adres, postcode, straal of wijk',
            'Filteren op kenmerken: type, oppervlak, bouwjaar, energielabel',
            'Geselecteerde transacties meenemen als referentie in een waardering',
          ]}
        />
        <InAanbouw
          slot
          eyebrow="Concurrentieanalyse — wacht op data"
          titel="Verkoopresultaten en marktaandeel vs. concurrenten"
          uitleg="Dashboards die de verkoopresultaten van je eigen kantoor afzetten tegenover concurrenten in de regio. Kan pas als de verkopende makelaar in de dataset zit — die bron levert Quinn later aan."
          punten={[
            'Marktaandeel per makelaarskantoor in de regio',
            'Wie verkoopt welk segment, tegen welke gemiddelde prijs en doorlooptijd',
          ]}
        />
      </div>
    </main>
  )
}
