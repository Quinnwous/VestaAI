import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type * as ReactPDF from '@react-pdf/renderer'
import { PdfTemplate } from '@/components/PdfTemplate'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase'
import type { ContentOutput } from '@/lib/schemas'
import type { Kantoor } from '@/lib/supabase'
import React from 'react'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const objectId = searchParams.get('object_id')

  if (!objectId) {
    return NextResponse.json({ error: 'object_id vereist' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { data: object } = await supabase
    .from('objecten')
    .select('address, outputs_json, kantoor_id, kantoren(name, logo_url, huisstijl_json)')
    .eq('id', objectId)
    .single()

  if (!object) {
    return NextResponse.json({ error: 'Object niet gevonden' }, { status: 404 })
  }

  const kantoorData = object.kantoren as unknown as Pick<Kantoor, 'name' | 'logo_url' | 'huisstijl_json'> | null

  // Bewaarde foto's uit de bibliotheek (service-client, expliciet object + kantoor gescoped).
  const serviceClient = createServiceSupabaseClient()
  const { data: fotoRows } = await serviceClient
    .from('object_fotos')
    .select('url')
    .eq('object_id', objectId)
    .eq('kantoor_id', object.kantoor_id)
    .order('created_at', { ascending: true })
    .limit(6)
  const fotos = (fotoRows ?? []).map(f => f.url as string)

  const pdf = await renderToBuffer(React.createElement(PdfTemplate, {
    address: object.address,
    output: object.outputs_json as ContentOutput,
    kantoor: kantoorData ?? { name: 'VestaAI', logo_url: null, huisstijl_json: null },
    fotos,
  }) as React.ReactElement<ReactPDF.DocumentProps>)

  const bestandsnaam = `${object.address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-vestaai.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
    },
  })
}
