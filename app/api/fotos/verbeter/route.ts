import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export const maxDuration = 60

// Cloudflare Images API — vereist CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_IMAGES_TOKEN in .env.local
// Registreer op: https://dash.cloudflare.com → Images
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CF_IMAGES_TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN

export async function POST(req: NextRequest) {
  if (!CF_ACCOUNT_ID || !CF_IMAGES_TOKEN) {
    return NextResponse.json(
      { error: 'Foto-verbetering is nog niet geconfigureerd. Voeg CLOUDFLARE_ACCOUNT_ID en CLOUDFLARE_IMAGES_TOKEN toe aan .env.local.' },
      { status: 503 },
    )
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: makelaar } = await supabase
    .from('makelaars')
    .select('kantoor_id')
    .eq('id', user.id)
    .single()
  if (!makelaar) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  const formData = await req.formData()
  const foto = formData.get('foto') as File | null
  const objectId = formData.get('object_id') as string | null

  if (!foto) return NextResponse.json({ error: 'Geen foto aangeleverd' }, { status: 400 })

  const TOEGESTANE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  if (!TOEGESTANE_TYPES.includes(foto.type)) {
    return NextResponse.json({ error: 'Alleen JPG, PNG of WebP toegestaan' }, { status: 400 })
  }
  if (foto.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto mag maximaal 20 MB zijn' }, { status: 400 })
  }

  // Upload naar Cloudflare Images
  const cfForm = new FormData()
  cfForm.append('file', foto)

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_IMAGES_TOKEN}` },
      body: cfForm,
    },
  )

  if (!cfRes.ok) {
    const err = await cfRes.text()
    return NextResponse.json({ error: `Cloudflare fout: ${err}` }, { status: 502 })
  }

  const cfData = await cfRes.json()
  const imageId: string = cfData.result?.id
  // Cloudflare Images levert varianten: /cdn-cgi/imagedelivery/<hash>/<id>/public
  const variants: string[] = cfData.result?.variants ?? []
  const publiekUrl = variants[0] ?? null

  // Sla URL op in objecten.outputs_json.fotos (append)
  if (objectId && publiekUrl) {
    const serviceClient = createServiceSupabaseClient()
    const { data: obj } = await serviceClient
      .from('objecten')
      .select('outputs_json')
      .eq('id', objectId)
      .single()

    if (obj) {
      const fotos: string[] = (obj.outputs_json as Record<string, unknown>).fotos as string[] ?? []
      await serviceClient
        .from('objecten')
        .update({ outputs_json: { ...(obj.outputs_json as Record<string, unknown>), fotos: [...fotos, publiekUrl] } })
        .eq('id', objectId)
      revalidatePath(`/object/${objectId}`)
    }
  }

  return NextResponse.json({ image_id: imageId, url: publiekUrl })
}
