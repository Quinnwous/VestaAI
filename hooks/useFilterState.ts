'use client'

/**
 * `useFilterState(schema, defaults)` — Zod-getypte querystring voor élke
 * interactieve verkenner (item 6.1, docs/roadmap.md § 3.7 — bindend). Poort
 * van `docs/ontwerp/kit.js` `leesHash()`/`schrijfHash()`, maar op
 * `useSearchParams`/`router.replace` i.p.v. een hash, zodat de filterstand
 * een gewone, deelbare URL is (`?plaatsen=wassenaar&periode=24&...`).
 *
 * Gebruik:
 *   const FilterSchema = z.object({ periode: z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(0)]), plaatsen: z.array(z.string()), prijs: z.tuple([z.number(), z.number()]), ... })
 *   const DEFAULTS: MarktanalyseFilterState = { periode: 24, plaatsen: ['wassenaar'], prijs: [0, 5_000_000], ... }
 *   const [filter, setFilter] = useFilterState(FilterSchema, DEFAULTS)
 *   setFilter({ periode: 12 }) // merget, schrijft alleen wat van de standaard afwijkt naar de URL
 *
 * Serialisatie is op het runtime-type van elke standaardwaarde gebaseerd
 * (geen Zod-introspectie nodig, wat breekbaar is bij `.optional()`/`.default()`-
 * wrappers): een 2-tallig getallen-array = bereik (`-`-gescheiden, zoals een
 * prijs- of oppervlakteschuiver), een ander array = multi-select
 * (`,`-gescheiden), boolean = alleen aanwezig als hij van de standaard afwijkt
 * (`1`), getal/string = directe waarde. Na het parsen valideert `schema.parse()`
 * het resultaat; een ongeldige/verouderde URL valt terug op de standaardwaarde
 * per veld (nooit een crash op een handmatig aangepaste of oude link).
 */

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { z } from 'zod'

function isGetallenBereik(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'number')
}

function arraysGelijk(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/** Zet een volledige filterstaat om naar `URLSearchParams`, met alleen de velden die van `defaults` afwijken. */
export function serialiseerFilterState<T extends Record<string, unknown>>(state: T, defaults: T): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of Object.keys(defaults)) {
    const waarde = state[key]
    const standaard = defaults[key]
    if (waarde == null) continue
    if (isGetallenBereik(waarde)) {
      if (isGetallenBereik(standaard) && arraysGelijk(waarde, standaard)) continue
      params.set(key, `${waarde[0]}-${waarde[1]}`)
      continue
    }
    if (Array.isArray(waarde)) {
      if (Array.isArray(standaard) && arraysGelijk(waarde, standaard)) continue
      if (waarde.length === 0) continue
      params.set(key, waarde.join(','))
      continue
    }
    if (typeof waarde === 'boolean') {
      if (waarde === standaard) continue
      if (waarde) params.set(key, '1')
      continue
    }
    if (waarde === standaard) continue
    params.set(key, String(waarde))
  }
  return params
}

/** Leest `URLSearchParams` terug naar een filterstaat, gevalideerd door `schema`. Ontbrekende/ongeldige velden vallen terug op `defaults`. */
export function parseerFilterState<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  defaults: T,
  params: URLSearchParams,
): T {
  const ruw: Record<string, unknown> = { ...defaults }
  for (const key of Object.keys(defaults)) {
    if (!params.has(key)) continue
    const tekst = params.get(key) ?? ''
    const standaard = defaults[key]
    if (isGetallenBereik(standaard)) {
      const delen = tekst.split('-').map(Number)
      if (delen.length === 2 && delen.every(n => Number.isFinite(n))) ruw[key] = delen as [number, number]
      continue
    }
    if (Array.isArray(standaard)) {
      ruw[key] = tekst.split(',').filter(Boolean)
      continue
    }
    if (typeof standaard === 'boolean') {
      ruw[key] = tekst === '1'
      continue
    }
    if (typeof standaard === 'number') {
      const n = Number(tekst)
      if (Number.isFinite(n)) ruw[key] = n
      continue
    }
    ruw[key] = tekst
  }
  const geparsed = schema.safeParse(ruw)
  return geparsed.success ? geparsed.data : defaults
}

/**
 * React-hook: leest de huidige staat uit `useSearchParams()` en geeft een
 * setter die de URL bijwerkt via `router.replace` (geen historyentry per
 * filterklik, `scroll: false`). Client-only — verkenners zijn client
 * components (interactieve filters), zie components/MarktanalyseExplorer.tsx.
 */
export function useFilterState<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  defaults: T,
): [T, (deel: Partial<T>) => void, (volledig: T) => void] {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const staat = useMemo(() => parseerFilterState(schema, defaults, params), [schema, defaults, params])

  const schrijf = useCallback(
    (volledig: T) => {
      const nieuw = serialiseerFilterState(volledig, defaults)
      const query = nieuw.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [defaults, pathname, router],
  )

  const zetDeel = useCallback((deel: Partial<T>) => schrijf({ ...staat, ...deel }), [schrijf, staat])

  return [staat, zetDeel, schrijf]
}
