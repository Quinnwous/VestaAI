'use client'

import { useSyncExternalStore } from 'react'

function geenAbonnement() {
  return () => {}
}

/**
 * `true` zodra de component client-side gemount is, anders `false` — voor
 * waarden die per omgeving verschillen (tijd, `navigator`, `matchMedia`, …)
 * en daarom nooit tijdens de eerste render gelezen mogen worden (hydratie-
 * mismatch, zie CLAUDE.md "Nooit `new Date()` … in een client component").
 *
 * Via `useSyncExternalStore` i.p.v. het klassieke `useState(false)` +
 * `useEffect(() => setState(true), [])`: dat laatste roept `setState`
 * synchroon aan in een effect-body (react-hooks/set-state-in-effect), terwijl
 * dit precies het patroon is waarvoor `useSyncExternalStore` bedoeld is — de
 * server-snapshot (`false`) en de client-snapshot (`true`) verschillen
 * bewust, en React regelt de overgang zelf zonder een expliciete setState-
 * aanroep in een mount-effect.
 */
export function useHeeftGemount(): boolean {
  return useSyncExternalStore(geenAbonnement, () => true, () => false)
}
