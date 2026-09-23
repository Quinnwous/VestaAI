'use client'

/**
 * Zod-getypte querystring-filterstate voor elke interactieve verkenner
 * (docs/roadmap.md § 3.7). Vervangt het hash-gebaseerde `leesHash()`/
 * `schrijfHash()` uit `docs/ontwerp/kit.js` (zie de "NIET porten"-notitie in
 * elk prototype) door `next/navigation` `useSearchParams`/`router.replace`.
 *
 * Gebruik:
 *   const DEFAULTS: ConcurrentieFilterState = { plaatsen: [], typen: [], periode: 24, ... }
 *   const [filter, setFilter, reset] = useFilterState(ConcurrentieFilterSchema, DEFAULTS)
 *   setFilter({ periode: 12 })          // merget één of meer velden
 *   reset()                             // terug naar DEFAULTS
 *
 * Encodering (puur, los getest — zie useFilterState.test.ts):
 * - array leeg of gelijk aan default → weggelaten uit de URL
 * - array met waarden → kommagescheiden
 * - boolean/number/string gelijk aan default → weggelaten uit de URL
 * - ongeldige/onbekende waarden vallen terug op de default (schema.safeParse)
 *
 * Zo blijft de URL kort (alleen afwijkingen van de default zijn zichtbaar,
 * zoals `leesHash`/`schrijfHash` in het prototype ook deden) en is de state
 * altijd geldig volgens het Zod-schema.
 */
import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ZodTypeAny } from 'zod'

type Primitief = string | number | boolean
type FilterWaarde = Primitief | Primitief[] | undefined

/** Vergelijkt twee filterwaarden op inhoudelijke gelijkheid (arrays ongevoelig voor volgorde). */
function isGelijkAanDefault(waarde: unknown, defaultWaarde: unknown): boolean {
  if (Array.isArray(waarde) && Array.isArray(defaultWaarde)) {
    if (waarde.length !== defaultWaarde.length) return false
    const a = [...waarde].sort(), b = [...defaultWaarde].sort()
    return a.every((v, i) => v === b[i])
  }
  return waarde === defaultWaarde
}

/** Eén filterobject → URLSearchParams, alleen de velden die van de default afwijken. */
export function serialiseerFilterState<T extends Record<string, FilterWaarde>>(state: T, defaults: T): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of Object.keys(defaults)) {
    const waarde = state[key]
    const defaultWaarde = defaults[key]
    if (isGelijkAanDefault(waarde, defaultWaarde)) continue
    if (Array.isArray(waarde)) {
      if (waarde.length) params.set(key, waarde.join(','))
      continue
    }
    if (waarde === undefined) continue
    params.set(key, String(waarde))
  }
  return params
}

/** URLSearchParams → filterobject, getypeerd op de vorm van `defaults`; ongeldige waarden vallen terug op het schema. */
export function deserialiseerFilterState<T extends Record<string, FilterWaarde>>(
  params: URLSearchParams,
  schema: ZodTypeAny,
  defaults: T,
): T {
  const ruw: Record<string, FilterWaarde> = {}
  for (const key of Object.keys(defaults)) {
    const defaultWaarde = defaults[key]
    const raw = params.get(key)
    if (raw === null) {
      ruw[key] = defaultWaarde
      continue
    }
    if (Array.isArray(defaultWaarde)) {
      ruw[key] = raw.split(',').filter(Boolean)
    } else if (typeof defaultWaarde === 'boolean') {
      ruw[key] = raw === 'true'
    } else if (typeof defaultWaarde === 'number') {
      const n = Number(raw)
      ruw[key] = Number.isFinite(n) ? n : defaultWaarde
    } else {
      ruw[key] = raw
    }
  }
  const resultaat = schema.safeParse(ruw)
  return resultaat.success ? (resultaat.data as T) : defaults
}

/**
 * `[state, setFilter, reset]` — `setFilter` merget een gedeeltelijke update
 * (zoals `setState` bij `useState`) en schrijft de nieuwe stand meteen naar de
 * URL via `router.replace` (`scroll: false`, geen nieuwe history-entry).
 */
export function useFilterState<T extends Record<string, FilterWaarde>>(
  schema: ZodTypeAny,
  defaults: T,
): [T, (patch: Partial<T>) => void, () => void] {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const state = useMemo(
    () => deserialiseerFilterState(searchParams, schema, defaults),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString(), schema, defaults],
  )

  const schrijf = useCallback(
    (volgende: T) => {
      const params = serialiseerFilterState(volgende, defaults)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, defaults],
  )

  const setFilter = useCallback((patch: Partial<T>) => schrijf({ ...state, ...patch }), [state, schrijf])
  const reset = useCallback(() => schrijf(defaults), [schrijf, defaults])

  return [state, setFilter, reset]
}
