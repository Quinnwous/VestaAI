import { notFound } from 'next/navigation'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { ObjectChat } from '@/components/ObjectChat'
import type { Kantoor } from '@/lib/supabase'

// Onvindbare, niet-geïndexeerde publieke pagina — alleen bereikbaar via de gedeelde link.
export const metadata = { robots: { index: false, follow: false } }

export default async function PubliekeChatPagina({ params }: { params: { objectId: string } }) {
  const serviceClient = createServiceSupabaseClient()
  const { data: object } = await serviceClient
    .from('objecten')
    .select('id, address, chat_publiek, chat_foto_url, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', params.objectId)
    .single()

  if (!object) notFound()

  const kantoor = object.kantoren as unknown as Pick<Kantoor, 'name' | 'logo_url' | 'huisstijl_json'> | null
  const kleur = kantoor?.huisstijl_json?.primaire_kleur ?? '#1A6B45'
  const naam = kantoor?.name ?? 'VestaAI'

  // Chat uitgezet door de makelaar → nette melding i.p.v. het chatvenster.
  if (object.chat_publiek === false) {
    return (
      <main style={{ minHeight: '100vh', background: '#F6F8F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0E1A13', marginBottom: 6 }}>Chat niet beschikbaar</p>
          <p style={{ fontSize: 14, color: '#5A6B61', lineHeight: 1.6 }}>De chatbot voor deze woning is momenteel niet actief. Neem gerust rechtstreeks contact op met {naam}.</p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F6F8F7', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Kop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {kantoor?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kantoor.logo_url} alt={naam} style={{ height: 30, maxWidth: 160, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontWeight: 800, fontSize: 18, color: '#0E1A13' }}>{naam}</span>
          )}
        </div>

        {/* Chatvenster */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #E9EFEB', borderRadius: 20, boxShadow: '0 8px 30px -12px rgba(14,26,19,.12)', overflow: 'hidden' }}>
          {object.chat_foto_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={object.chat_foto_url} alt={object.address} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
          )}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #E9EFEB', background: kleur }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', fontWeight: 600, letterSpacing: '.02em', marginBottom: 2 }}>Vragen over deze woning?</p>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{object.address}</h1>
          </div>
          <div style={{ flex: 1, minHeight: 420, display: 'flex', flexDirection: 'column', padding: '4px 18px 16px' }}>
            <ObjectChat objectId={object.id} adres={object.address} kleur={kleur} />
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: '#9AA6A0', textAlign: 'center', marginTop: 14 }}>
          Antwoorden zijn AI-gegenereerd op basis van de woninggegevens. Voor een bezichtiging of bod neemt {naam} contact met u op.
        </p>
      </div>
    </main>
  )
}
