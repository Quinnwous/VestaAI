import { ViewTransition } from 'react'
import type { ReactNode } from 'react'

/**
 * Paginaovergang voor de ingelogde omgeving: bij navigeren vervaagt de oude
 * inhoud snel en komt de nieuwe rustig iets omhoog (CSS:
 * `::view-transition-*(.vui-pagina)` in globals.css). De topbar staat stil als
 * anker. Een browser zonder View Transitions wisselt gewoon direct.
 *
 * Hoort in een page (of in `AppPagina`), niet in een layout: een layout blijft
 * staan bij navigeren, dus enter/exit vuren daar nooit.
 */
export function PaginaOvergang({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="vui-pagina" exit="vui-pagina" default="none">
      {children}
    </ViewTransition>
  )
}
