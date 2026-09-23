import Link from 'next/link'
import { Card, EmptyState, colors, radius } from '@/components/ui'
import type { ObjectFase } from '@/lib/schemas'

/**
 * "Recent bekeken" op de startpagina (item 10.4, docs/roadmap.md § Fase 10):
 * de laatste dossiers die de ingelogde makelaar zelf opende. Poort van
 * docs/ontwerp/startpagina.html § "Recent bekeken" (`.kaart`/`.dossierrij`) —
 * hier zonder de "Deze week"-tijdlijn ernaast (die is schrapbaar, item 10.4,
 * en bewust niet gebouwd), dus één kaart op volle breedte i.p.v. het
 * tweekoloms-prototype.
 *
 * Puur weergave: adres, fase en de al server-side berekende "…geleden"-tekst
 * komen kant-en-klaar binnen (app/(app)/dashboard/page.tsx bouwt de lijst met
 * lib/gebruik.ts, dedupliceert op dossier en rekent de relatieve tijd uit met
 * de `nu` die de pagina toch al heeft — nooit new Date() hier, zie CLAUDE.md
 * ⚠️ "Nooit new Date() in een client component").
 */

// Zelfde label/kleurpaar als FASE_BADGE in app/(app)/woningen/WoningenClient.tsx —
// bewust lokaal gehouden (dat bestand doet dat ook), dit is te klein om te delen.
const FASE_BADGE: Record<ObjectFase, { label: string; color: string }> = {
  verkoopadvies: { label: 'Verkoopadvies', color: '#D97706' },
  in_verkoop: { label: 'In verkoop', color: 'var(--merk)' },
  verkocht: { label: 'Verkocht', color: '#5C6470' },
}

export type RecentBekekenItem = {
  objectId: string
  address: string
  fase: ObjectFase
  tijdGeleden: string
}

function FaseBadge({ fase }: { fase: ObjectFase }) {
  const cfg = FASE_BADGE[fase]
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
        borderRadius: radius.pill, border: `1px solid ${cfg.color}33`,
        padding: '2px 9px', fontSize: 11.5, fontWeight: 700, color: cfg.color, background: `${cfg.color}11`,
      }}
    >
      {cfg.label}
    </span>
  )
}

export function RecentBekeken({ items }: { items: RecentBekekenItem[] }) {
  return (
    <Card pad={0} style={{ marginBottom: 24, overflow: 'hidden' }}>
      <style>{`
        .vui-recentrij:hover { background: ${colors.surfaceAlt}; }
        .vui-recentrij:hover .vui-recentrij-chev { opacity: 1; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 20px 14px', borderBottom: items.length ? `1px solid ${colors.border}` : 'none' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: colors.text, margin: 0 }}>Recent bekeken</h2>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: '2px 0 0' }}>de dossiers die je het laatst opende</p>
        </div>
        {items.length > 0 && (
          <Link href="/woningen" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--merk)', textDecoration: 'none', flexShrink: 0 }}>
            Alles bekijken
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 20 }}>
          <EmptyState
            titel="Nog geen dossiers bekeken"
            beschrijving="Open een woningdossier en het verschijnt hier, zodat je snel terug kunt naar waar je gebleven was."
            actie={
              <Link href="/woningen" style={{ fontSize: 13, fontWeight: 600, color: 'var(--merk)', textDecoration: 'none' }}>
                Naar je woningen →
              </Link>
            }
          />
        </div>
      ) : (
        <div style={{ padding: '6px 10px 10px' }}>
          {items.map(item => (
            <Link
              key={item.objectId}
              href={`/object/${item.objectId}`}
              className="vui-recentrij"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px',
                borderRadius: radius.md, textDecoration: 'none', transition: 'background .15s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.bodyStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.address}
                </div>
              </div>
              <FaseBadge fase={item.fase} />
              <span style={{ flexShrink: 0, fontSize: 11.5, color: colors.muted, width: 104, textAlign: 'right' }}>
                {item.tijdGeleden}
              </span>
              <svg
                className="vui-recentrij-chev"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                style={{ width: 14, height: 14, color: colors.muted, opacity: 0, transition: 'opacity .15s', flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
