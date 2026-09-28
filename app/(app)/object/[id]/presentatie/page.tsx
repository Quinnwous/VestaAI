import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import { haalTransactieCoordinaten } from '@/lib/transactiesQuery'
import { migreerWaarderingJson } from '@/lib/waardering'
import { bouwBranding, bruikbaarLogo } from '@/lib/branding'
import { top6Referenties } from '@/lib/presentatie'
import { PropertyInputSchema, type PropertyInput } from '@/lib/schemas'
import { AppPagina, EmptyState, Button } from '@/components/ui'
import { WaardePresentatie } from '@/components/presentatie/WaardePresentatie'

export const metadata = {
  title: 'Presentatie',
}

/**
 * Presentatiemodus ("keukentafel", docs/roadmap.md § Stand van zaken —
 * "Volgende ronde" item 1): de makelaar laat de waardebepaling rustig en
 * groot zien aan de verkoper. Zelfde toegangscontrole en dataophaal-patroon
 * als `app/(app)/object/[id]/page.tsx`: sessie → makelaar → kantoor_id-check
 * → `notFound()`. Leest **uitsluitend** de al opgeslagen `waardering_json`
 * (`migreerWaarderingJson`, zelfde helper als `app/api/pdf/waardebepaling/
 * route.ts`) — er wordt hier niets herberekend, dus dit scherm kan nooit een
 * ander bedrag tonen dan de pdf of het waarderingspaneel.
 */
export default async function PresentatiePagina({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('id', user.id).single()

  // Service-client voor de volle dossierlookup (kantoornaam/logo/huisstijl via
  // de relatie), maar de kantoor_id-vergelijking hieronder is de échte poort —
  // zelfde patroon als de dossierpagina en de pdf-route.
  const service = createServiceSupabaseClient()
  const { data: object } = await service
    .from('objecten')
    .select('id, kantoor_id, address, lat, lng, input_json, waardering_json, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', params.id)
    .single()

  if (!object || !makelaar || object.kantoor_id !== makelaar.kantoor_id) notFound()

  const kantoorData = object.kantoren as unknown as { name: string; logo_url: string | null; huisstijl_json: Record<string, unknown> | null } | null
  const branding = bouwBranding(kantoorData)

  const opslag = migreerWaarderingJson(object.waardering_json)

  if (!opslag.uitkomst) {
    return (
      <AppPagina>
        <EmptyState
          titel="Nog geen waardebepaling"
          beschrijving="Er is voor dit dossier nog geen waarde berekend. Maak eerst een waardebepaling in het dossier — daarna kun je 'm hier presenteren."
          actie={
            <Link href={`/object/${object.id}`} style={{ textDecoration: 'none' }}>
              <Button variant="primary">Naar het dossier</Button>
            </Link>
          }
        />
      </AppPagina>
    )
  }

  const parsedInvoer = PropertyInputSchema.safeParse(object.input_json)
  const invoer = parsedInvoer.success ? parsedInvoer.data : (object.input_json as PropertyInput)

  const eersteFoto = await (async () => {
    try {
      const r = await service
        .from('object_fotos')
        .select('url')
        .eq('object_id', object.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      return r.data?.url ?? null
    } catch {
      return null
    }
  })()

  const top6 = top6Referenties(opslag.uitkomst.referenties)
  // transacties gaan altijd via de sessie-gebonden client (RLS regelt de
  // kantoorscheiding) — zelfde patroon als bouwKaartVoorPdf() in de pdf-route.
  const coordsById = await haalTransactieCoordinaten(supabase, top6.map((r) => r.id))
  const referentiesMetCoords = top6
    .map((r) => {
      const c = coordsById.get(r.id)
      return c ? { ...r, lat: c.lat, lng: c.lng } : null
    })
    .filter((r): r is (typeof top6)[number] & { lat: number; lng: number } => r !== null)

  const logoUrl = await bruikbaarLogo(branding.logoUrl)

  return (
    <WaardePresentatie
      objectId={object.id}
      address={object.address}
      invoer={invoer}
      fotoUrl={eersteFoto}
      uitkomst={opslag.uitkomst}
      correctie={opslag.correctie}
      subject={object.lat != null && object.lng != null ? { lat: object.lat, lng: object.lng } : null}
      referenties={referentiesMetCoords}
      kantoor={{ naam: branding.naam, logoUrl, kleur: branding.primair, telefoon: branding.telefoon, email: branding.email }}
    />
  )
}
