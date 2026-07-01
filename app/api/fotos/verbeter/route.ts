import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export const maxDuration = 60

const client = new Anthropic()

interface FotoAnalyse {
  score_belichting: number       // 1–10
  score_kadrering: number        // 1–10
  score_kleur: number            // 1–10
  funda_geschikt: boolean
  samenvatting: string           // 2-3 zinnen over de foto
  aanbevelingen: string[]        // max 5 concrete tips
  correcties: {
    brightness: number           // 0.5–2.0, 1.0 = geen wijziging
    contrast: number             // 0.5–2.0
    saturation: number           // 0.5–2.0
    sharpness: number            // 0–3, 0 = geen sharpening
  }
}

async function analyseerFoto(imageBase64: string, mimeType: string): Promise<FotoAnalyse> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Je bent een expert in vastgoedfotografie en weet precies wat een goede Funda-foto maakt.
Analyseer de aangeleverde woningfoto en geef een JSON-antwoord. Geen tekst buiten het JSON-object.

Output exact dit formaat:
{
  "score_belichting": <1–10>,
  "score_kadrering": <1–10>,
  "score_kleur": <1–10>,
  "funda_geschikt": <true|false>,
  "samenvatting": "<2–3 zinnen over kwaliteit en geschiktheid voor Funda>",
  "aanbevelingen": ["<tip 1>", "<tip 2>"],
  "correcties": {
    "brightness": <0.5–2.0, 1.0 = ongewijzigd>,
    "contrast": <0.5–2.0, 1.0 = ongewijzigd>,
    "saturation": <0.5–2.0, 1.0 = ongewijzigd>,
    "sharpness": <0.0–3.0, 0 = geen sharpening>
  }
}

Regels voor correcties:
- brightness > 1.0 als foto te donker is; < 1.0 als overbelicht
- contrast verhogen bij vlakke foto's (bijv. 1.1–1.2)
- saturation licht verhogen voor warme kleuren (bijv. 1.05–1.15)
- sharpness 0.5–1.5 bij zachte foto's; 0 als al scherp`,
    messages: [{
      role: 'user',
      content: [{
        type: 'image',
        source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: imageBase64 },
      }, {
        type: 'text',
        text: 'Analyseer deze woningfoto voor gebruik op Funda. Geef alleen het JSON-object terug.',
      }],
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned) as FotoAnalyse
}

async function verbeterFoto(buffer: Buffer, analyse: FotoAnalyse): Promise<Buffer> {
  const { brightness, contrast, saturation, sharpness } = analyse.correcties

  let pipeline = sharp(buffer)
    .modulate({
      brightness: Math.max(0.5, Math.min(2.0, brightness)),
      saturation: Math.max(0.5, Math.min(2.0, saturation)),
    })
    .linear(
      Math.max(0.5, Math.min(2.0, contrast)),
      -(128 * (Math.max(0.5, Math.min(2.0, contrast)) - 1)),
    )

  if (sharpness > 0) {
    pipeline = pipeline.sharpen({ sigma: Math.max(0.3, Math.min(3.0, sharpness)) })
  }

  return pipeline.jpeg({ quality: 92, progressive: true }).toBuffer()
}

export async function POST(req: NextRequest) {
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

  const buffer = Buffer.from(await foto.arrayBuffer())
  const base64 = buffer.toString('base64')

  // Claude Vision analyse
  let analyse: FotoAnalyse
  try {
    analyse = await analyseerFoto(base64, foto.type)
  } catch {
    return NextResponse.json({ error: 'Analyse mislukt — probeer opnieuw' }, { status: 502 })
  }

  // Sharp auto-correcties toepassen
  let verbeterdBase64: string | null = null
  try {
    const verbeterdBuffer = await verbeterFoto(buffer, analyse)
    verbeterdBase64 = verbeterdBuffer.toString('base64')

    // Sla verbeterde URL op in object indien opgegeven
    if (objectId) {
      const serviceClient = createServiceSupabaseClient()
      const { data: obj } = await serviceClient
        .from('objecten')
        .select('outputs_json')
        .eq('id', objectId)
        .single()

      if (obj) {
        const outputs = (obj.outputs_json ?? {}) as Record<string, unknown>
        const bestaandeFotos: string[] = (outputs.fotos_analyse as string[]) ?? []
        await serviceClient
          .from('objecten')
          .update({ outputs_json: { ...outputs, fotos_analyse: [...bestaandeFotos, analyse.samenvatting] } })
          .eq('id', objectId)
      }
    }
  } catch {
    // Sharp fout is niet fataal — stuur analyse zonder verbeterde foto
  }

  return NextResponse.json({
    analyse,
    verbeterd_jpeg_base64: verbeterdBase64,
  })
}
