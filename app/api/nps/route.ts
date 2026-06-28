import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { score, feedback } = await req.json()
    if (typeof score !== 'number' || score < 0 || score > 10) {
      return NextResponse.json({ error: 'Ongeldige score' }, { status: 400 })
    }

    if (isSupabaseConfigured()) {
      const serviceClient = createServiceSupabaseClient()
      await serviceClient.from('nps_responses').insert({ score, feedback: feedback || null })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
