import { AppPagina, Eyebrow } from '@/components/ui'

/**
 * Gedeeld omhulsel voor de vier Marktinzichten-schermen (macro, los van één
 * woning — zie CLAUDE.md § Hoofdstructuur). Elke subpagina zet zijn eigen
 * <title> via metadata; dit layout-segment levert alleen het eyebrow-label.
 * De sub-navigatie is vervallen (item 1.9c, besluit Quinn 17 sep 2026): de
 * topbar zelf heeft nu een platte pil per Marktinzichten-scherm.
 *
 * De gedeelde kop "Zoeken in de markt" is weg (26 sep 2026): alle vier de
 * verkenners hebben een eigen <h1>, zoals de prototypes in docs/ontwerp/
 * (eyebrow "Marktinzichten" + schermtitel) — anders stond er kop-op-kop.
 */
export default function MarktinzichtenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPagina>
      <Eyebrow>Marktinzichten</Eyebrow>
      {children}
    </AppPagina>
  )
}
