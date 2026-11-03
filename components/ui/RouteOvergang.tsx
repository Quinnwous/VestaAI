'use client'

import { ViewTransition } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Paginaovergang binnen een layout die blijft staan (bv. Marktinzichten): de
 * route is de key, dus elke subpagina "komt binnen" en "gaat weg" zoals een
 * gewone page met `PaginaOvergang`.
 */
export function RouteOvergang({ children }: { children: ReactNode }) {
  const pad = usePathname()
  return (
    <ViewTransition key={pad} enter="vui-pagina" exit="vui-pagina" default="none">
      <div>{children}</div>
    </ViewTransition>
  )
}
