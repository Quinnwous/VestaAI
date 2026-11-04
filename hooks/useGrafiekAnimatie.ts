'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function abonneer(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/**
 * Animatie-instellingen voor recharts in de taal van het bewegingssysteem
 * (docs/ontwerp/principes.md § Beweging): ~700 ms ease-out i.p.v. de
 * standaard 1,5 s, en helemaal uit onder `prefers-reduced-motion`. Op de
 * server (en bij de eerste client-render) staat animatie uit, zodat er geen
 * hydratieverschil kan ontstaan.
 */
export function useGrafiekAnimatie() {
  const verminderd = useSyncExternalStore(
    abonneer,
    () => window.matchMedia(QUERY).matches,
    () => true,
  )
  return {
    isAnimationActive: !verminderd,
    animationDuration: 700,
    animationEasing: 'ease-out' as const,
  }
}
