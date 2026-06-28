import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { generateContent, PropertyInputSchema } from '@/lib/claude'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PropertyInputSchema.parse(body)
    const output = await generateContent(input)
    return NextResponse.json(output)
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
