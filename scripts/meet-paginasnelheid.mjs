/**
 * Paginasnelheid op productie, zoals een ingelogde makelaar hem ervaart:
 * vraagt de echte pagina's op (https://www.vestaai.nl) met een sessiecookie
 * van het demo-account en meet per pagina de tijd tot de eerste byte (TTFB,
 * = serverwerk incl. databasevragen) en tot de volledige HTML. Leest uit de
 * header `x-vercel-id` in welke regio de functie draaide.
 *
 * Gemaakt om de verhuizing van de serverfuncties naar Frankfurt (fra1, naast
 * de database in eu-central-1) vóór en na te meten. Alleen lezend.
 *
 * Gebruik:
 *   node --env-file=.env.local scripts/meet-paginasnelheid.mjs [--label=voor] [--basis=https://www.vestaai.nl] [--n=8]
 * Resultaat: tabel in de terminal + JSON in docs/metingen/paginasnelheid-<label>.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sessieCookie, serviceClient, DOD_EMAIL } from './lib/dodSessie.mjs'

const arg = (naam, standaard) => process.argv.find(a => a.startsWith(`--${naam}=`))?.split('=')[1] ?? standaard
const BASIS = arg('basis', 'https://www.vestaai.nl')
const LABEL = arg('label', new Date().toISOString().slice(0, 16).replace(':', ''))
const N = Number(arg('n', '8'))

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function mediaan(xs) { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
function p75(xs) { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))] }

async function meetEen(url, cookieHeader) {
  const t0 = performance.now()
  const res = await fetch(url, { headers: { cookie: cookieHeader }, redirect: 'manual' })
  const ttfb = performance.now() - t0
  await res.arrayBuffer()
  const totaal = performance.now() - t0
  const vercelId = res.headers.get('x-vercel-id') ?? ''
  // "fra1::iad1::…" → rand fra1, functie iad1; "fra1::…" → statisch/cache aan de rand
  const delen = vercelId.split('::')
  const regio = delen.length >= 3 ? delen[1] : 'rand/cache'
  return { status: res.status, ttfb, totaal, regio }
}

async function main() {
  const cookie = await sessieCookie(DOD_EMAIL)
  const cookieHeader = `${cookie.name}=${cookie.value}`

  // Een dossier van het demo-kantoor mét waardering (zwaarste dossierpagina).
  const service = serviceClient()
  const { data: m } = await service.from('makelaars').select('kantoor_id').eq('email', DOD_EMAIL).single()
  const { data: obj } = await service.from('objecten').select('id').eq('kantoor_id', m.kantoor_id).not('waardering_json', 'is', null).limit(1).single()

  const paginas = [
    ['/dashboard', 'Overzicht'],
    ['/woningen', 'Woningen'],
    [`/object/${obj.id}`, 'Dossier'],
    ['/marktanalyse', 'Marktanalyse'],
    ['/marktanalyse/transacties', 'Transacties'],
    ['/marktanalyse/concurrentie', 'Concurrentie'],
    ['/api/zoeken?q=dam', 'Zoeken (API)'],
  ]

  const resultaten = []
  for (const [pad, naam] of paginas) {
    const metingen = []
    // eerste verzoek = opwarmen (koude start), telt niet mee
    await meetEen(BASIS + pad, cookieHeader)
    for (let i = 0; i < N; i++) metingen.push(await meetEen(BASIS + pad, cookieHeader))
    const status = metingen[0].status
    const regio = mediaanRegio(metingen.map(x => x.regio))
    const r = {
      pagina: naam, pad, status, regio,
      ttfbMediaan: Math.round(mediaan(metingen.map(x => x.ttfb))),
      ttfbP75: Math.round(p75(metingen.map(x => x.ttfb))),
      totaalMediaan: Math.round(mediaan(metingen.map(x => x.totaal))),
    }
    resultaten.push(r)
    console.log(`${naam.padEnd(14)} ${String(status).padEnd(4)} regio ${regio.padEnd(11)} TTFB mediaan ${String(r.ttfbMediaan).padStart(5)} ms · p75 ${String(r.ttfbP75).padStart(5)} ms · volledig ${String(r.totaalMediaan).padStart(5)} ms`)
  }

  const uitDir = path.resolve(__dirname, '..', 'docs', 'metingen')
  fs.mkdirSync(uitDir, { recursive: true })
  const uit = path.join(uitDir, `paginasnelheid-${LABEL}.json`)
  fs.writeFileSync(uit, JSON.stringify({ label: LABEL, basis: BASIS, n: N, gemetenOp: new Date().toISOString(), resultaten }, null, 2) + '\n')
  console.log(`\n→ ${path.relative(process.cwd(), uit)}`)
}

function mediaanRegio(regios) {
  const telling = new Map()
  for (const r of regios) telling.set(r, (telling.get(r) ?? 0) + 1)
  return [...telling.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
