'use client'

/**
 * ⌘K-zoekpalet (roadmap § 9 backlog). Twee stukken:
 *  - `ZoekKnop` — klein knopje voor de topbar, altijd bereikbaar (ook op
 *    390 px, dus buiten `.topbar-menus`/`.topbar-rechts` die op mobiel
 *    verdwijnen — zie components/AppTopbar.tsx). Toont "⌘K"/"Ctrl K" pas ná
 *    mount (les 19 sep 2026, CLAUDE.md: het platform verschilt per client,
 *    dus dit hoort niet in de eerste server-render).
 *  - `ZoekPalet` — de dialoog zelf, gemount in AppTopbar naast FeedbackSheet
 *    (open/onOpenChange geleend van de ouder, zelfde reden als
 *    components/FeedbackKnop.tsx: nooit ín een menu dat zichzelf sluit).
 *
 * Sneltoets (⌘K/Ctrl+K) wordt in AppTopbar geregistreerd — die is overal in
 * de ingelogde omgeving gemount, dus dat is de enige plek die hem maar één
 * keer hoeft te registreren.
 *
 * Drie groepen resultaten:
 *  1. Woningen — `GET /api/zoeken?q=` (sessie-client, RLS, max. 8),
 *     gedebouncet (150 ms), her-rangschikt met `lib/zoeken.ts` `rangschikWoningen`.
 *  2. Pagina's — `lib/zoeken.ts` `zoekPaginas()`, synchroon, geen debounce nodig.
 *     Zonder zoekterm (net geopend): de ongefilterde `ZOEK_PAGINAS`-lijst als
 *     snelmenu, zodat het palet ook zonder typen meteen bruikbaar is.
 *  3. Transacties — geen eigen datarij, alleen een snelkoppeling naar
 *     "Transacties opzoeken" met de zoekterm al in de URL (`transactiesZoekHref`,
 *     leest terug via hooks/useFilterState.ts — geen wijziging aan
 *     components/TransactiesZoeken.tsx nodig).
 *
 * Toetsenbord: ArrowUp/ArrowDown lopen door alle groepen heen als één platte
 * lijst, Enter opent de actieve rij, Escape sluit (Radix' eigen gedrag).
 * ARIA-combobox/listbox naar het patroon van components/AddressAutocomplete.tsx.
 */

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { colors, radius, shadow } from '@/components/ui/tokens'
import { useHeeftGemount } from '@/hooks/useHeeftGemount'
import {
  ZOEK_PAGINAS, rangschikWoningen, zoekPaginas, faseLabel,
  toonTransactieSnelkoppeling, transactiesZoekHref,
  type ZoekWoning,
} from '@/lib/zoeken'
import type { ZoekApiResultaat } from '@/app/api/zoeken/route'

const DEBOUNCE_MS = 150

type PlatteRij = {
  groep: 'woningen' | 'paginas' | 'transacties'
  sleutel: string
  label: string
  badge?: string
  href: string
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function HuisIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--merk)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

function PaginaIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

function TransactieIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 17h4v-6H3v6ZM10 17h4V7h-4v10ZM17 17h4v-3h-4v3Z" />
    </svg>
  )
}

/** Klein zoekknopje voor de topbar — altijd zichtbaar, ook op 390 px. */
export function ZoekKnop({ onClick }: { onClick: () => void }) {
  // `navigator` verschilt per omgeving en mag dus nooit in de eerste render
  // gelezen worden (hydratiemismatch, zie CLAUDE.md) — `useHeeftGemount`
  // (useSyncExternalStore) levert `true` pas na mount, zonder een setState
  // in een mount-effect.
  const gemount = useHeeftGemount()
  const toetsLabel = gemount
    ? (/mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K')
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Zoeken"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        height: 34, padding: toetsLabel ? '0 10px 0 9px' : '0 8px',
        border: '1px solid #E1E5E9', borderRadius: 'var(--merk-radius-pill, 9999px)',
        background: '#fff', color: colors.body, cursor: 'pointer',
      }}
    >
      <SearchIcon size={15} />
      {toetsLabel && (
        <span className="zoekknop-toets" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.01em', color: colors.muted, whiteSpace: 'nowrap' }}>
          {toetsLabel}
        </span>
      )}
    </button>
  )
}

const optieStyle = (actief: boolean): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
  borderRadius: radius.md, cursor: 'pointer',
  background: actief ? colors.tint : 'transparent',
})

function GroepKop({ titel }: { titel: string }) {
  return (
    <div aria-hidden style={{ padding: '10px 12px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: colors.muted }}>
      {titel}
    </div>
  )
}

export function ZoekPalet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [woningen, setWoningen] = useState<ZoekWoning[]>([])
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(false)
  const [actief, setActief] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listboxId = useId()
  const optionId = (i: number) => `${listboxId}-optie-${i}`

  const heeftQuery = query.trim().length > 0

  // Woningen ophalen: gedebouncet, alleen vanaf MIN_ZOEKLENGTE (via
  // toonTransactieSnelkoppeling — zelfde grens als app/api/zoeken/route.ts),
  // dus geen nutteloze call op één teken.
  // `kanZoeken` is een pure functie van `query` (zelfde grens als hierboven):
  // gebruikt hieronder om nooit stale woningen/foutmeldingen te tonen zodra
  // de invoer te kort wordt, zonder dat daar een synchrone setState in het
  // effect voor nodig is (de interne `woningen`/`bezig`/`fout`-state hoeft
  // dan niet meteen gereset — ze zijn toch overal achter deze guard gelezen).
  const kanZoeken = toonTransactieSnelkoppeling(query)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!kanZoeken) return
    // Via requestAnimationFrame i.p.v. rechtstreeks: dat draait vóór de
    // eerstvolgende paint (onzichtbaar hetzelfde moment als synchroon), maar
    // telt niet als een synchrone setState in de effect-body.
    const bezigFrame = requestAnimationFrame(() => { setBezig(true); setFout(false) })
    const controller = new AbortController()
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/zoeken?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: ZoekApiResultaat = await res.json()
        setWoningen(Array.isArray(data.woningen) ? data.woningen : [])
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return
        setWoningen([])
        setFout(true)
      } finally {
        setBezig(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      cancelAnimationFrame(bezigFrame)
      if (timerRef.current) clearTimeout(timerRef.current)
      controller.abort()
    }
  }, [query, kanZoeken])

  // Reset bij sluiten — kleine vertraging zodat de sluitanimatie niet
  // halverwege al leeg oogt (zelfde patroon als components/FeedbackKnop.tsx).
  const sluit = (volgendeOpen: boolean) => {
    onOpenChange(volgendeOpen)
    if (!volgendeOpen) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        setQuery('')
        setWoningen([])
        setFout(false)
        setActief(0)
      }, 200)
    }
  }

  // Bug gevonden tijdens de Playwright-check: de ⌘K-sneltoets in AppTopbar
  // zet `open` rechtstreeks (setZoekOpen(v => !v)) en gaat dus niet via
  // `sluit()` hierboven — een sluit-timeout van een eerdere Escape/klik-buiten
  // bleef daardoor gewoon doorlopen. Snel Escape, meteen weer ⌘K en typen
  // gaf zo ~200 ms later een leeggeveegde zoekterm. Bewaak in plaats daarvan
  // de `open`-prop zelf: zodra het palet (hoe dan ook) weer opengaat, elke
  // hangende reset annuleren.
  useEffect(() => {
    if (open && resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
    return () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current) }
  }, [open])

  const woningenGerangschikt = useMemo(
    () => (kanZoeken ? rangschikWoningen(woningen, query) : []),
    [kanZoeken, woningen, query],
  )
  const paginaResultaten = useMemo(() => (heeftQuery ? zoekPaginas(query) : ZOEK_PAGINAS), [query, heeftQuery])
  const transactieSnelkoppeling = heeftQuery && toonTransactieSnelkoppeling(query)

  const rijen: PlatteRij[] = useMemo(() => {
    const lijst: PlatteRij[] = []
    if (heeftQuery) {
      for (const w of woningenGerangschikt) {
        lijst.push({ groep: 'woningen', sleutel: `w-${w.id}`, label: w.adres, href: `/object/${w.id}`, badge: faseLabel(w.fase) })
      }
    }
    for (const p of paginaResultaten) {
      lijst.push({ groep: 'paginas', sleutel: `p-${p.id}`, label: p.label, href: p.href })
    }
    if (transactieSnelkoppeling) {
      lijst.push({ groep: 'transacties', sleutel: 't-zoek', label: `“${query.trim()}” in Transacties opzoeken`, href: transactiesZoekHref(query) })
    }
    return lijst
  }, [heeftQuery, woningenGerangschikt, paginaResultaten, transactieSnelkoppeling, query])

  // Beide via "state aanpassen tijdens render" i.p.v. een effect (React-docs
  // "Adjusting some state when a prop changes"): reset `actief` naar 0 zodra
  // de zoekterm verandert, en klem 'm anders binnen de (gekrompen) rijenlijst
  // — zelfterminerend, dus geen oneindige render-lus.
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setActief(0)
  }
  if (actief > rijen.length - 1) {
    setActief(Math.max(0, rijen.length - 1))
  }

  const kies = (rij: PlatteRij) => {
    sluit(false)
    router.push(rij.href)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (rijen.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActief(i => Math.min(i + 1, rijen.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActief(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const rij = rijen[actief]
      if (rij) kies(rij)
    }
    // Escape: Radix Dialog sluit zelf (onEscapeKeyDown), niets extra's nodig hier.
  }

  const woningenRijen = rijen.filter(r => r.groep === 'woningen')
  const paginaRijen = rijen.filter(r => r.groep === 'paginas')
  const transactieRijen = rijen.filter(r => r.groep === 'transacties')
  const toonWoningenSkeleton = heeftQuery && kanZoeken && bezig && woningenRijen.length === 0
  // De transactiesnelkoppeling staat bij élke zoekterm van voldoende lengte
  // klaar (ook zonder directe treffer) — telt dus niet mee als "resultaat"
  // voor de lege staat, anders verschijnt "Geen resultaten voor…" nooit meer.
  const toonLegeStaat = heeftQuery && !bezig && woningenRijen.length === 0 && paginaRijen.length === 0

  let lopendeIndex = -1
  const volgendeIndex = () => { lopendeIndex += 1; return lopendeIndex }

  return (
    <Dialog.Root open={open} onOpenChange={sluit}>
      <Dialog.Portal>
        <Dialog.Overlay className="vui-sluier" style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,27,.42)', zIndex: 78 }} />
        <Dialog.Content
          className="vui-pop"
          onOpenAutoFocus={e => { e.preventDefault(); inputRef.current?.focus() }}
          style={{
            position: 'fixed', top: '10vh', left: 0, right: 0, margin: '0 auto', zIndex: 79,
            width: 'min(600px, 92vw)', maxHeight: '72vh',
            background: colors.surface, borderRadius: radius.cardXl, boxShadow: shadow.modal,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <Dialog.Title style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            Zoeken
          </Dialog.Title>
          <Dialog.Description style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            Zoek naar een woning, pagina of adres
          </Dialog.Description>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
            <span style={{ color: colors.muted, display: 'flex' }}><SearchIcon size={18} /></span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Zoek een woning, pagina of adres…"
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={rijen.length > 0}
              aria-controls={listboxId}
              aria-activedescendant={rijen.length > 0 ? optionId(actief) : undefined}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15.5, color: colors.text, background: 'transparent' }}
            />
          </div>

          <div id={listboxId} role="listbox" aria-label="Zoekresultaten" style={{ flex: 1, overflowY: 'auto', padding: '6px 6px 10px' }}>
            {woningenRijen.length > 0 && (
              <div role="group" aria-label="Woningen">
                <GroepKop titel="Woningen" />
                {woningenRijen.map(rij => {
                  const i = volgendeIndex()
                  return (
                    <div
                      key={rij.sleutel}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === actief}
                      onMouseEnter={() => setActief(i)}
                      onMouseDown={e => { e.preventDefault(); kies(rij) }}
                      style={optieStyle(i === actief)}
                    >
                      <HuisIcon />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rij.label}
                      </span>
                      <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: colors.body, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: radius.pill, padding: '2px 8px' }}>
                        {rij.badge}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {toonWoningenSkeleton && (
              <div role="group" aria-label="Woningen" aria-busy="true">
                <GroepKop titel="Woningen" />
                <div style={{ padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="vui-skeleton" style={{ height: 34, borderRadius: radius.md, background: colors.borderSoft }} />
                  <div className="vui-skeleton" style={{ height: 34, borderRadius: radius.md, background: colors.borderSoft }} />
                </div>
              </div>
            )}

            {heeftQuery && kanZoeken && fout && (
              <p style={{ margin: '2px 12px 8px', fontSize: 12.5, color: colors.body }}>
                Zoeken naar woningen lukt nu niet — pagina&apos;s blijven wel doorzoekbaar.
              </p>
            )}

            {paginaRijen.length > 0 && (
              <div role="group" aria-label="Pagina's">
                <GroepKop titel="Pagina's" />
                {paginaRijen.map(rij => {
                  const i = volgendeIndex()
                  return (
                    <div
                      key={rij.sleutel}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === actief}
                      onMouseEnter={() => setActief(i)}
                      onMouseDown={e => { e.preventDefault(); kies(rij) }}
                      style={optieStyle(i === actief)}
                    >
                      <PaginaIcon />
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{rij.label}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {transactieRijen.length > 0 && (
              <div role="group" aria-label="Transacties">
                <GroepKop titel="Transacties" />
                {transactieRijen.map(rij => {
                  const i = volgendeIndex()
                  return (
                    <div
                      key={rij.sleutel}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === actief}
                      onMouseEnter={() => setActief(i)}
                      onMouseDown={e => { e.preventDefault(); kies(rij) }}
                      style={optieStyle(i === actief)}
                    >
                      <TransactieIcon />
                      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{rij.label}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {toonLegeStaat && (
              <p style={{ margin: '18px 12px', fontSize: 13.5, color: colors.body, textAlign: 'center' }}>
                Geen resultaten voor “{query.trim()}”
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 16px', borderTop: `1px solid ${colors.border}`, background: colors.surfaceAlt, fontSize: 11.5, color: colors.muted, flexShrink: 0 }}>
            <span>↑↓ navigeren</span>
            <span>↵ openen</span>
            <span>esc sluiten</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
