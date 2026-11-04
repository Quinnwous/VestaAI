import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { bouwBranding } from '@/lib/branding'
import type { ReactNode } from 'react'
import { AppPagina, Card, Eyebrow, SerifTitle, colors, radius } from '@/components/ui'
import { StatistiekenPaneel } from './StatistiekenPaneel'
import { KantoorBanner } from './KantoorBanner'
import type { Kantoor, Makelaar } from '@/lib/supabase'
import { effectieveCourtage, courtageLabel } from '@/lib/courtage'

export const metadata = { title: 'Kantoor' }

/**
 * Read-only kantoorpagina (besluit 16 sep 2026, zie CLAUDE.md § Hoofdstructuur):
 * huisstijl, courtage, kantoorprofiel en team zijn platform-admin-beheerd
 * (VestaAI stelt ze per kantoor in via /admin) — hier alleen ter inzage.
 *
 * Fase 1.7-1.8 (masterplan 16-17 sep 2026): "Jouw profiel" en "Uitloggen"
 * zijn hier weg — profiel staat nu op /account, uitloggen in het
 * profielmenu rechtsboven (zie components/AppTopbar.tsx). Deze pagina is
 * bereikbaar via datzelfde profielmenu.
 */
export default async function KantoorPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('id, name, email, kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) redirect('/login')

  const { data: kantoor } = await supabase
    .from('kantoren')
    .select('id, name, logo_url, huisstijl_json, instellingen_json')
    .eq('id', (makelaar as Makelaar).kantoor_id)
    .single()

  const { data: teamleden } = await supabase
    .from('makelaars')
    .select('id, name, email')
    .eq('kantoor_id', (makelaar as Makelaar).kantoor_id)
    .order('name', { ascending: true })

  const huisstijl = (kantoor as Kantoor | null)?.huisstijl_json ?? null
  const instellingen = (kantoor as Kantoor | null)?.instellingen_json ?? null
  const branding = bouwBranding(kantoor as Kantoor | null)

  return (
    <AppPagina>
      {branding.achtergrondUrl && <KantoorBanner url={branding.achtergrondUrl} naam={branding.naam} />}

      <Eyebrow>Beheer</Eyebrow>
      <SerifTitle style={{ marginBottom: 8 }}>
        <span style={{ fontStyle: 'italic', color: 'var(--merk-tekst)' }}>Kantoor</span>
      </SerifTitle>
      <p style={{ fontSize: 14, color: '#5C6470', margin: '0 0 32px', maxWidth: 560 }}>
        Huisstijl, courtage en kantoorprofiel stelt je platformbeheerder voor je in — hieronder zie je waarop je omgeving draait.
      </p>

      <div className="vui-kantoor-raster vui-gestaffeld">
        <KantoorKaart titel="Kantoor" ondertitel="profiel en afspraken">
          <Veld label="Naam">{kantoor?.name ?? '—'}</Veld>
          {instellingen?.profiel?.kenmerken && (
            <Veld label="Over dit kantoor"><span style={{ whiteSpace: 'pre-wrap' }}>{instellingen.profiel.kenmerken}</span></Veld>
          )}
          {instellingen?.werkgebied?.plaatsen && instellingen.werkgebied.plaatsen.length > 0 && (
            <Veld label="Werkgebied">
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {instellingen.werkgebied.plaatsen.map(pl => (
                  <span key={pl} style={{ padding: '3px 10px', borderRadius: radius.pill, background: 'var(--merk-zacht)', color: 'var(--merk-tekst)', fontSize: 12.5, fontWeight: 700 }}>{pl}</span>
                ))}
              </span>
            </Veld>
          )}
          {instellingen?.courtage && (
            <Veld label="Courtage (standaard, aanpasbaar per verkoopadvies)">
              {courtageLabel(effectieveCourtage(null, instellingen))}
              {instellingen.courtage.opstartkosten ? ` + €${instellingen.courtage.opstartkosten} opstartkosten` : ''}
            </Veld>
          )}
          {!instellingen && (
            <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>Courtage, kantoorprofiel en werkgebied zijn nog niet ingesteld — neem contact op met je platformbeheerder.</p>
          )}
        </KantoorKaart>

        <KantoorKaart titel="Huisstijl" ondertitel="zo ziet je omgeving eruit">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Kleurstaal kleur="var(--merk)" label="Primair" hex={huisstijl?.primaire_kleur} />
            <Kleurstaal kleur="var(--merk-accent)" label="Accent" hex={huisstijl?.accent_kleur} />
            <Kleurstaal kleur="var(--merk-zacht)" label="Zacht" rand />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Veld label="Lettertype">{huisstijl?.lettertype ?? 'jakarta'}</Veld>
            <Veld label="Vormtaal">{huisstijl?.vorm ?? 'zacht'}</Veld>
            {huisstijl?.telefoon && <Veld label="Telefoon">{huisstijl.telefoon}</Veld>}
            {huisstijl?.email && <Veld label="E-mail">{huisstijl.email}</Veld>}
          </div>
          {/* Mini-voorbeeld: knop, pil en kop in de eigen vormtaal. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 14, borderRadius: radius.md, background: colors.surfaceAlt }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: radius.md, background: 'var(--merk)', color: 'var(--merk-op)', fontSize: 13, fontWeight: 700 }}>Knop</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', borderRadius: radius.pill, background: 'var(--merk-zacht)', color: 'var(--merk-tekst)', fontSize: 12.5, fontWeight: 700, boxShadow: '0 0 0 1px var(--merk-rand) inset' }}>In verkoop</span>
            <SerifTitle as="h3" size={20} accent="voorbeeld">Kop</SerifTitle>
          </div>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>Wil je iets aanpassen aan je huisstijl? Neem contact op met je platformbeheerder.</p>
        </KantoorKaart>

        <KantoorKaart titel={`Team (${teamleden?.length ?? 0})`} ondertitel="iedereen ziet en kan hetzelfde">
          <div style={{ display: 'grid', gap: 2, margin: '0 -8px' }}>
            {(teamleden ?? []).map(lid => (
              <div key={lid.id} className="vui-teamrij" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', borderRadius: radius.md }}>
                <span aria-hidden style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--merk-zacht)', color: 'var(--merk-tekst)', fontWeight: 800, fontSize: 13.5 }}>
                  {(lid.name ?? lid.email ?? '?').trim().slice(0, 1).toUpperCase()}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: colors.text }}>{lid.name}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lid.email}</span>
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>Een nieuwe collega toevoegen? Neem contact op met je platformbeheerder.</p>
        </KantoorKaart>

        <KantoorKaart titel="Statistieken" ondertitel="gebruik van je omgeving">
          <StatistiekenPaneel />
        </KantoorKaart>
      </div>
    </AppPagina>
  )
}

function KantoorKaart({ titel, ondertitel, children }: { titel: string; ondertitel: string; children: ReactNode }) {
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${colors.border}` }}>
        <h2 style={{ fontSize: 15.5, fontWeight: 800, color: colors.text, margin: 0, letterSpacing: '-.01em' }}>{titel}</h2>
        <p style={{ fontSize: 12.5, color: colors.muted, margin: '2px 0 0' }}>{ondertitel}</p>
      </div>
      <div style={{ padding: '18px 22px 22px', display: 'grid', gap: 16 }}>{children}</div>
    </Card>
  )
}

function Veld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: colors.muted, margin: '0 0 3px' }}>{label}</p>
      <div style={{ fontSize: 14, color: colors.bodyStrong, lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

function Kleurstaal({ kleur, label, hex, rand = false }: { kleur: string; label: string; hex?: string | null; rand?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span aria-hidden style={{ width: 40, height: 40, borderRadius: radius.md, background: kleur, boxShadow: rand ? '0 0 0 1px var(--merk-rand) inset' : '0 6px 14px -8px rgba(20,24,27,.4)' }} />
      <span>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: colors.text }}>{label}</span>
        {hex && <span style={{ display: 'block', fontSize: 11.5, color: colors.muted, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{hex}</span>}
      </span>
    </div>
  )
}
