import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase'
import { sendNieuweLeadMelding, sendNieuweKantoorLeadMelding } from '@/lib/email'

const LeadSchema = z
  .object({
    kantoor_id: z.string().uuid().optional(),
    object_id: z.string().uuid().optional(),
    naam: z.string().max(100).optional(),
    email: z.string().email().max(200),
    telefoon: z.string().max(40).optional(),
    bericht: z.string().max(1000).optional(),
  })
  // Widget levert kantoor_id; de object-chatpagina levert object_id (kantoor wordt dan server-side afgeleid).
  .refine(d => d.kantoor_id || d.object_id, { message: 'kantoor_id of object_id vereist' })

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const parsed = LeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { object_id, naam, email, telefoon, bericht } = parsed.data

  const serviceClient = createServiceSupabaseClient()

  // Bij een object-lead is object_id de bron van waarheid; kantoor_id nooit van de client vertrouwen.
  let kantoorId = parsed.data.kantoor_id ?? null
  let object: { id: string; address: string; makelaar_id: string; kantoor_id: string } | null = null
  if (object_id) {
    const { data } = await serviceClient
      .from('objecten')
      .select('id, address, makelaar_id, kantoor_id')
      .eq('id', object_id)
      .single()
    if (!data) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
    object = data
    kantoorId = data.kantoor_id
  }

  if (!kantoorId) return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })

  const { error } = await serviceClient.from('chatbot_leads').insert({
    kantoor_id: kantoorId,
    object_id: object_id ?? null,
    naam: naam ?? null,
    email,
    telefoon: telefoon ?? null,
    bericht: bericht ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // E-mailnotificatie (best-effort — mag de lead-opslag nooit blokkeren).
  try {
    if (object) {
      // Object-lead → de makelaar van het object.
      const { data: makelaar } = await serviceClient
        .from('makelaars')
        .select('email')
        .eq('id', object.makelaar_id)
        .single()
      if (makelaar?.email) {
        await sendNieuweLeadMelding(makelaar.email, {
          objectAdres: object.address,
          objectId: object.id,
          leadNaam: naam,
          leadEmail: email,
          leadTelefoon: telefoon,
          leadBericht: bericht,
        })
      }
    } else {
      // Kantoorbrede (widget-)lead → de admins van het kantoor.
      const [{ data: kantoor }, { data: admins }] = await Promise.all([
        serviceClient.from('kantoren').select('name').eq('id', kantoorId).single(),
        serviceClient.from('makelaars').select('email').eq('kantoor_id', kantoorId).eq('role', 'admin'),
      ])
      const ontvangers = (admins ?? []).map(a => a.email).filter((e): e is string => !!e)
      if (ontvangers.length > 0) {
        await sendNieuweKantoorLeadMelding(ontvangers, {
          kantoorNaam: kantoor?.name ?? 'je kantoor',
          leadNaam: naam,
          leadEmail: email,
          leadTelefoon: telefoon,
          leadBericht: bericht,
        })
      }
    }
  } catch {
    // Notificatie mislukt — lead is bewaard, zichtbaar in de werkruimte / bij Chatbot.
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
