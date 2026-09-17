import type { CSSProperties, ReactNode } from 'react'

/**
 * Gedeelde paginabreedte voor de ingelogde omgeving — fluïde tot
 * `var(--app-breedte)` (1680px, zie globals.css), met een marge die met het
 * scherm meeschaalt (`var(--app-marge)`, 20-48px). Vervangt de losse
 * `<main style={{ maxWidth: 'var(--app-breedte)', padding: '0 22px' }}>`
 * die eerder op elke pagina apart stond — dashboard, woningen, object/[id],
 * marktanalyse, kantoor (stond op een eigen 980px) en object/new (900px)
 * gebruikten allemaal een net iets andere waarde. Zie docs/ontwerpprincipes.md
 * § Layout.
 */
export function AppPagina({
  children,
  paddingTop = 44,
  paddingBottom = 80,
  style,
}: {
  children: ReactNode
  /** Verticale ruimte boven de content. Zet op 0 in een layout die zelf al padding zet. */
  paddingTop?: number | string
  paddingBottom?: number | string
  style?: CSSProperties
}) {
  return (
    <main
      style={{
        maxWidth: 'var(--app-breedte)',
        margin: '0 auto',
        padding: `${typeof paddingTop === 'number' ? `${paddingTop}px` : paddingTop} var(--app-marge) ${typeof paddingBottom === 'number' ? `${paddingBottom}px` : paddingBottom}`,
        ...style,
      }}
    >
      {children}
    </main>
  )
}
