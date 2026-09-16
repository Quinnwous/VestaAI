import { AppPagina, Eyebrow, SerifTitle } from '@/components/ui'
import { MarktinzichtenNav } from './MarktinzichtenNav'

/**
 * Gedeeld omhulsel voor de vier Marktinzichten-schermen (macro, los van één
 * woning — zie CLAUDE.md § Hoofdstructuur). Elke subpagina zet zijn eigen
 * <title> via metadata; dit layout-segment levert alleen de kop en de
 * sub-navigatie.
 */
export default function MarktinzichtenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPagina>
      <Eyebrow>Marktinzichten</Eyebrow>
      <SerifTitle size={34} accent="de markt" style={{ marginBottom: 22 }}>Zoeken in</SerifTitle>
      <MarktinzichtenNav />
      {children}
    </AppPagina>
  )
}
