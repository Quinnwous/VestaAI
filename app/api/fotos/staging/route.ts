import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// REimagineHome API — vereist REIMAGINEHOME_API_KEY in .env.local
// Account aanmaken op: https://reimaginehome.ai/api
const REIMAGINE_KEY = process.env.REIMAGINEHOME_API_KEY
const REIMAGINE_BASE = 'https://api.reimaginehome.ai/v1'

type StijlType = 'modern' | 'scandinavian' | 'industrial' | 'classic' | 'bohemian'
type RuimteType = 'living_room' | 'bedroom' | 'dining_room' | 'kitchen' | 'bathroom' | 'office'

export async function POST(req: NextRequest) {
  if (!REIMAGINE_KEY) {
    return NextResponse.json(
      { error: 'Virtual staging is nog niet geconfigureerd. Voeg REIMAGINEHOME_API_KEY toe aan .env.local.' },
      { status: 503 },
    )
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const formData = await req.formData()
  const foto = formData.get('foto') as File | null
  const stijl = (formData.get('stijl') as StijlType) ?? 'modern'
  const ruimte = (formData.get('ruimte') as RuimteType) ?? 'living_room'

  if (!foto) return NextResponse.json({ error: 'Geen foto aangeleverd' }, { status: 400 })

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type)) {
    return NextResponse.json({ error: 'Alleen JPG, PNG of WebP toegestaan' }, { status: 400 })
  }

  const bytes = await foto.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  // REimagineHome staging-aanvraag
  const stagingRes = await fetch(`${REIMAGINE_BASE}/generate_staging_image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': REIMAGINE_KEY,
    },
    body: JSON.stringify({
      image: `data:${foto.type};base64,${base64}`,
      room_type: ruimte,
      design_style: stijl,
      num_images: 1,
      mask_type: 'ai_auto_mask',
    }),
  })

  if (!stagingRes.ok) {
    const err = await stagingRes.text()
    return NextResponse.json({ error: `REimagineHome fout: ${err}` }, { status: 502 })
  }

  const stagingData = await stagingRes.json()
  const jobId: string = stagingData.image_uuid

  // Poll voor resultaat (max 60 seconden)
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(`${REIMAGINE_BASE}/get_staging_image/${jobId}`, {
      headers: { 'x-api-key': REIMAGINE_KEY },
    })
    if (!statusRes.ok) continue
    const statusData = await statusRes.json()
    if (statusData.data?.status === 'completed' && statusData.data?.output_urls?.length > 0) {
      return NextResponse.json({ urls: statusData.data.output_urls })
    }
    if (statusData.data?.status === 'failed') {
      return NextResponse.json({ error: 'Staging mislukt' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Timeout: verwerking duurde te lang' }, { status: 504 })
}
