import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { generateContent } from '@/lib/claude'
import { PropertyInputSchema } from '@/lib/schemas'
import { createServerSupabaseClient, createServiceSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { HuisstijlConfig } from '@/lib/schemas'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PropertyInputSchema.parse(body)

    let huisstijl: HuisstijlConfig | undefined
    let objectId: string | null = null

    if (isSupabaseConfigured()) {
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
      }

      const { data: makelaar } = await supabase
        .from('makelaars')
        .select('id, kantoor_id, kantoren(huisstijl_json)')
        .eq('id', user.id)
        .single()

      if (makelaar) {
        const kantoorData = makelaar.kantoren as unknown as { huisstijl_json: HuisstijlConfig | null } | null
        if (kantoorData?.huisstijl_json) {
          huisstijl = kantoorData.huisstijl_json
        }

        const output = await generateContent(input, huisstijl)

        const serviceClient = createServiceSupabaseClient()
        const { data: savedObject } = await serviceClient
          .from('objecten')
          .insert({
            kantoor_id: makelaar.kantoor_id,
            makelaar_id: makelaar.id,
            address: input.adres,
            input_json: input,
            outputs_json: output,
          })
          .select('id')
          .single()

        objectId = savedObject?.id ?? null

        return NextResponse.json({ output, object_id: objectId })
      }
    }

    // Fallback: geen Supabase of geen makelaar-record
    const output = await generateContent(input, huisstijl)
    return NextResponse.json({ output, object_id: null })

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Ongeldige invoer', details: error.issues },
        { status: 400 },
      )
    }
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
