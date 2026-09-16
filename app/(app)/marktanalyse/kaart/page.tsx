import { InAanbouw } from '@/components/InAanbouw'

export const metadata = { title: 'Verkoopkaart' }

/**
 * Verkoopkaart — volledig scherm, los van één woning (zie CLAUDE.md §
 * Hoofdstructuur). Toont alleen de eigen verkopen van het kantoor als
 * vlaggetje (besluit 16 sep 2026 — niet alle regiotransacties, dat verwatert
 * het verkoopargument "wij hebben hier al verkocht"). Dezelfde
 * `Verkoopkaart`-component levert straks ook de straal-uitsnede in het
 * woningdossier. Wacht op coördinaten in de Realworks-import.
 */
export default function VerkoopkaartPage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <InAanbouw
        eyebrow="Verkoopkaart"
        titel="Waar hebben we al verkocht?"
        uitleg="Een interactieve kaart met de eigen verkopen van je kantoor als vlaggetje — filterbaar terwijl je kijkt."
        punten={[
          'Alleen de eigen verkopen van je kantoor krijgen een vlaggetje',
          'Klikken op een vlaggetje toont adres, verkoopprijs, datum, m² en energielabel',
          'Filteren op periode, prijsklasse, woningtype en oppervlak — vlaggetjes verschijnen en verdwijnen live',
          'Vanuit een woningdossier is een straal-uitsnede rond het adres vast te leggen voor het verkoopadvies',
        ]}
      />
    </div>
  )
}
