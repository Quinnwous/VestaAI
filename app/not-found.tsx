import Link from 'next/link'
import { HuisIllustratie } from '@/components/ui/HuisIllustratie'

/**
 * 404 — buiten de kantoor-wrapper, dus in VestaAI-groen (de :root-fallback in
 * globals.css). Het huis zonder pin: "dit adres bestaat niet".
 */
export default function NotFound() {
  return (
    <main style={{ minHeight: '78vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="vui-binnen" style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <HuisIllustratie breedte={190} pin={false} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--merk-tekst)', margin: '0 0 10px' }}>
          Fout 404
        </p>
        <h1 style={{ fontFamily: 'var(--font-newsreader), Georgia, serif', fontWeight: 500, fontSize: 34, lineHeight: 1.1, letterSpacing: '-.015em', color: '#14181B', margin: '0 0 10px' }}>
          Dit adres <span style={{ fontStyle: 'italic', color: 'var(--merk-tekst)' }}>bestaat niet</span>
        </h1>
        <p style={{ fontSize: 15, color: '#5C6470', lineHeight: 1.6, margin: '0 0 26px' }}>
          De pagina is verplaatst of verwijderd, of de link klopt niet helemaal.
        </p>
        <Link
          href="/dashboard"
          className="vui-btn vui-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 'var(--merk-radius-md, 12px)', background: 'var(--merk)', color: 'var(--merk-op)', padding: '12px 22px', fontSize: 14.5, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 20px -8px rgba(var(--merk-rgb), .55)' }}
        >
          ← Terug naar het overzicht
        </Link>
      </div>
    </main>
  )
}
