import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'

export const maxDuration = 60

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

  const { document_id, vraag } = await req.json()
  if (!document_id || !vraag) {
    return NextResponse.json({ error: 'document_id en vraag zijn verplicht' }, { status: 400 })
  }

  const serviceClient = createServiceSupabaseClient()
  const { data: doc } = await serviceClient
    .from('object_documenten')
    .select('bestandsnaam, storage_pad, mime_type, anthropic_file_id')
    .eq('id', document_id)
    .eq('kantoor_id', makelaar.kantoor_id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 })

  const client = new Anthropic()
  let antwoord: string

  if (doc.anthropic_file_id) {
    // Gebruik de Anthropic Files API file_id via beta endpoint
    const rawMessage = await (client.beta.messages.create as Function)({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `Je bent een juridisch assistent gespecialiseerd in Nederlands vastgoedrecht. Je analyseert documenten en beantwoordt vragen van makelaars. Geef heldere, feitelijke antwoorden. Geef bij twijfel altijd aan dat een notaris of jurist geraadpleegd moet worden.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'file', file_id: doc.anthropic_file_id },
            title: doc.bestandsnaam,
          },
          { type: 'text', text: vraag },
        ],
      }],
      betas: ['files-api-2025-04-14'],
    })
    antwoord = rawMessage.content?.[0]?.type === 'text' ? rawMessage.content[0].text : ''
  } else {
    // Fallback: document ophalen uit Storage en als base64 meesturen
    const { data: fileData, error: storageError } = await serviceClient.storage
      .from('kantoor-assets')
      .download(doc.storage_pad)

    if (storageError || !fileData) {
      return NextResponse.json({ error: 'Document niet bereikbaar' }, { status: 500 })
    }

    const buffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `Je bent een juridisch assistent gespecialiseerd in Nederlands vastgoedrecht. Analyseer het document en beantwoord de vraag van de makelaar. Geef heldere, feitelijke antwoorden. Vermeld bij juridische onzekerheid altijd dat een notaris geraadpleegd moet worden.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: (doc.mime_type === 'application/pdf' ? 'application/pdf' : 'text/plain') as 'application/pdf' | 'text/plain',
              data: base64,
            },
          } as unknown as Anthropic.DocumentBlockParam,
          { type: 'text', text: `Document: ${doc.bestandsnaam}\n\n${vraag}` },
        ],
      }],
    })
    antwoord = message.content[0].type === 'text' ? message.content[0].text : ''
  }

  return NextResponse.json({ antwoord })
}
