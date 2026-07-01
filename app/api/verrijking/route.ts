import { NextRequest, NextResponse } from 'next/server'
import { fetchVerrijking } from '@/lib/verrijking'

export async function GET(req: NextRequest) {
  const adres = req.nextUrl.searchParams.get('adres')
  if (!adres) {
    return NextResponse.json({ error: 'Adres verplicht' }, { status: 400 })
  }

  const oppervlakParam = req.nextUrl.searchParams.get('oppervlak')
  const oppervlak = oppervlakParam ? Number(oppervlakParam) : undefined

  const data = await fetchVerrijking(adres, oppervlak && !isNaN(oppervlak) ? oppervlak : undefined)
  return NextResponse.json(data)
}
