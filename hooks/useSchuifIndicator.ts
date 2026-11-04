'use client'

import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Meet de positie van het actieve element (`[data-actief="true"]`, of een
 * eigen selector) binnen een balk, zodat een indicator ernaartoe kan
 * schuiven (TabBar, contentsuite-tabs). Meet opnieuw bij elke wissel en bij
 * elke maatverandering van de balk. Tot er gemeten is: `null` — de
 * aanroeper laat dan de eigen actieve stijl staan.
 */
export function useSchuifIndicator<T extends HTMLElement = HTMLDivElement>(
  sleutel: unknown,
  selector = '[data-actief="true"]',
) {
  const ref = useRef<T>(null)
  const [positie, setPositie] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const balk = ref.current
    if (!balk) return
    const meet = () => {
      const el = balk.querySelector<HTMLElement>(selector)
      if (!el) return setPositie(null)
      setPositie({ x: el.offsetLeft, w: el.offsetWidth })
    }
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(balk)
    return () => ro.disconnect()
  }, [sleutel, selector])

  return { ref, positie }
}
