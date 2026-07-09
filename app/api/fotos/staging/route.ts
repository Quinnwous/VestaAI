import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase'

export const maxDuration = 120

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

type StijlType = 'modern' | 'scandinavisch' | 'industrieel' | 'klassiek' | 'bohemian' | 'minimalistisch'
type RuimteType = 'woonkamer' | 'slaapkamer' | 'eetkamer' | 'keuken' | 'badkamer' | 'werkkamer'

const STIJL_OMSCHRIJVING: Record<StijlType, string> = {
  modern: 'modern and contemporary with clean lines, neutral tones, and statement furniture pieces',
  scandinavisch: 'Scandinavian with light woods, white walls, cozy textiles, and minimalist Nordic design',
  industrieel: 'industrial with exposed brick accents, metal fixtures, dark tones, and urban loft aesthetics',
  klassiek: 'classic and elegant with traditional furniture, warm wood tones, and timeless décor',
  bohemian: 'bohemian with eclectic patterns, warm earthy colors, plants, and layered textiles',
  minimalistisch: 'minimalist with very clean lines, monochrome palette, hidden storage, and maximum space',
}

const RUIMTE_OMSCHRIJVING: Record<RuimteType, string> = {
  woonkamer: 'living room with sofa, coffee table, rug, side table, floor lamp, and art on the walls',
  slaapkamer: 'bedroom with bed with headboard, nightstands, wardrobe, and soft lighting',
  eetkamer: 'dining room with dining table, chairs, pendant light, and sideboard',
  keuken: 'kitchen with organized countertops, bar stools at island if present, and decorative items',
  badkamer: 'bathroom with towels, bath accessories, plants, and organized vanity',
  werkkamer: 'home office with desk, ergonomic chair, bookshelf, and focused lighting',
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'Virtual staging vereist GOOGLE_AI_API_KEY in de Vercel-omgevingsvariabelen.' },
      { status: 503 },
    )
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const formData = await req.formData()
  const foto = formData.get('foto') as File | null
  const stijl = (formData.get('stijl') as StijlType) ?? 'modern'
  const ruimte = (formData.get('ruimte') as RuimteType) ?? 'woonkamer'

  if (!foto) return NextResponse.json({ error: 'Geen foto aangeleverd' }, { status: 400 })

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type)) {
    return NextResponse.json({ error: 'Alleen JPG, PNG of WebP toegestaan' }, { status: 400 })
  }
  if (foto.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto mag maximaal 20 MB zijn' }, { status: 400 })
  }

  const buffer = Buffer.from(await foto.arrayBuffer())
  const base64 = buffer.toString('base64')

  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY)
  // gemini-2.5-flash-image ("Nano Banana"): het huidige GA-model voor beeldbewerking —
  // fotorealistisch meubels toevoegen met behoud van de architectuur. Vervangt het
  // verouderde experimentele gemini-2.0-flash-exp.
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })

  const prompt = `You are a professional virtual staging designer for Dutch real estate. Furnish this ${RUIMTE_OMSCHRIJVING[ruimte]} in a ${STIJL_OMSCHRIJVING[stijl]} style.

STRICT — preserve the property exactly:
- Keep the EXACT same architecture: walls, windows, doors, floor, ceiling, radiators and built-in features must be unchanged.
- Keep the same camera angle, perspective, lens and natural lighting as the original photo.
- Do NOT move, remove or repaint any structural element; do NOT change the view through the windows.

ADD only furniture and decor:
- Appropriate, correctly-scaled furniture and décor for a ${ruimte.replace('_', ' ')}, in a ${STIJL_OMSCHRIJVING[stijl]} style.
- Photorealistic materials, shadows and reflections consistent with the room's existing light.
- Aspirational but livable — Dutch buyers want a realistic home, not a showroom.

Output a single high-resolution, photorealistic interior photo of the staged room.`

  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: foto.type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        // @ts-expect-error — responseModalities wordt door gemini-2.5-flash-image ondersteund maar staat nog niet in de type-defs
        responseModalities: ['IMAGE', 'TEXT'],
      },
    })

    const response = result.response
    const parts = response.candidates?.[0]?.content?.parts ?? []

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return NextResponse.json({
          image_base64: part.inlineData.data,
          mime_type: part.inlineData.mimeType,
          stijl,
          ruimte,
        })
      }
    }

    return NextResponse.json({ error: 'Geen afbeelding ontvangen van Gemini — probeer opnieuw' }, { status: 502 })
  } catch (err) {
    console.error('Gemini staging fout:', err)
    // Rate limit (te veel aanvragen op de Gemini-tier) apart benoemen zodat de makelaar
    // een begrijpelijke melding krijgt i.p.v. een generieke fout.
    const msg = err instanceof Error ? err.message : ''
    if (/429|quota|rate/i.test(msg)) {
      return NextResponse.json(
        { error: 'De staging-dienst is even druk (limiet bereikt). Probeer het over een minuut opnieuw.' },
        { status: 429 },
      )
    }
    return NextResponse.json({ error: 'Staging mislukt — probeer opnieuw' }, { status: 502 })
  }
}
