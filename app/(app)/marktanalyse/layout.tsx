import { AppPagina, Eyebrow, SerifTitle } from '@/components/ui'

/**
 * Gedeeld omhulsel voor de vier Marktinzichten-schermen (macro, los van één
 * woning — zie CLAUDE.md § Hoofdstructuur). Elke subpagina zet zijn eigen
 * <title> via metadata; dit layout-segment levert alleen de kop. De
 * sub-navigatie is vervallen (item 1.9c, besluit Quinn 17 sep 2026): de
 * topbar zelf heeft nu een platte pil per Marktinzichten-scherm.
 */
export default function MarktinzichtenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPagina>
      <Eyebrow>Marktinzichten</Eyebrow>
      <SerifTitle size={34} accent="de markt" style={{ marginBottom: 22 }}>Zoeken in</SerifTitle>
      {children}
    </AppPagina>
  )
}
