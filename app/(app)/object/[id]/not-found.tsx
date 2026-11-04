import Link from 'next/link'
import { HuisIllustratie } from '@/components/ui/HuisIllustratie'
import { SerifTitle } from '@/components/ui/PageHeader'

/**
 * Dossier niet gevonden (of van een ander kantoor) — binnen de
 * kantooromgeving, dus in de merkkleuren; zelfde beeldtaal als de
 * algemene 404 (app/not-found.tsx).
 */
export default function ObjectNotFound() {
  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="vui-binnen" style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <HuisIllustratie breedte={170} pin={false} />
        </div>
        <SerifTitle as="h1" size={30} accent="niet gevonden" style={{ marginBottom: 10 }}>Woning</SerifTitle>
        <p style={{ fontSize: 14.5, color: '#5C6470', lineHeight: 1.6, margin: '0 0 24px' }}>
          Dit dossier bestaat niet (meer), of het hoort bij een ander kantoor.
        </p>
        <Link
          href="/woningen"
          className="vui-btn vui-btn-primary vui-knop-glans"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 'var(--merk-radius-md, 12px)', background: 'var(--merk)', color: 'var(--merk-op)', padding: '12px 22px', fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}
        >
          ← Naar je woningen
        </Link>
      </div>
    </main>
  )
}
