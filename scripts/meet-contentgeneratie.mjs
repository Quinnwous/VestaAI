/**
 * Meet de echte duur van "Genereer content (NL + EN)" op een draaiende
 * omgeving (roadmap D2; demoscript "Checklist — dag ervoor", punt 4): de
 * functielimiet van 300 s bestaat alleen op Vercel, dus lokaal meten zegt
 * daar niets over. Roept `POST <url>/api/generate { objectId }` aan als het
 * demo-account en leest daarna de databaserij.
 *
 * Twee metingen naast elkaar:
 * - wandklok van de HTTP-aanroep (de route wacht tot de generatie klaar is;
 *   een 504 betekent dat Vercel de functie op 300 s afkapte);
 * - `content_bezig_sinds` → `content_gegenereerd_op` uit de database (de
 *   serverkant zelf, zonder netwerk).
 * De verdeling per taal staat in de Vercel-logs (`[contentduur]`-regel,
 * lib/claude.ts `generateContentBeideTalen`).
 *
 * Oordeel volgens D2: ≤ 240 s goed · 240-300 s krap · 504 of > 300 s = NL en
 * EN splitsen of een langere functieduur (Vercel Pro).
 *
 * ⚠️ Overschrijft bij succes de NL- én EN-content van het dossier (extra's
 * blijven staan). Draait daarom alleen op een dossier in een kantoor met
 * `instellingen_json.demo === true`, en standaard als dry-run.
 *
 *   node --env-file=.env.local scripts/meet-contentgeneratie.mjs --object <id>
 *   node --env-file=.env.local scripts/meet-contentgeneratie.mjs --object <id> --write
 *   … --url http://localhost:3000   (standaard https://www.vestaai.nl)
 *
 * Kost per --write één NL + EN-generatie (≈ €0,12, docs/strategie/kostenschatting.md).
 */
import http from 'node:http'
import https from 'node:https'
import { serviceClient, sessieCookie } from './lib/dodSessie.mjs'

const SCHRIJVEN = process.argv.includes('--write')
const OBJECT_ID = argWaarde('--object')
const BASIS = argWaarde('--url') ?? 'https://www.vestaai.nl'
const DEMO_EMAIL = 'demo@vestaai.nl'
const GOED_MS = 240_000
const LIMIET_MS = 300_000

const log = (...a) => console.log(...a)

function argWaarde(naam) {
  const i = process.argv.indexOf(naam)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const sec = (ms) => `${(ms / 1000).toFixed(1)} s`
const woorden = (tekst) => (typeof tekst === 'string' ? tekst.split(/\s+/).filter(Boolean).length : 0)

async function leesDossier(db) {
  const { data, error } = await db
    .from('objecten')
    .select('id, fase, content_status, content_bezig_sinds, content_gegenereerd_op, input_json, outputs_json, outputs_json_en, kantoren(name, instellingen_json)')
    .eq('id', OBJECT_ID)
    .single()
  if (error || !data) throw new Error(`Dossier ${OBJECT_ID} niet gevonden: ${error?.message}`)
  return data
}

function toonStaat(d) {
  log(`  adres:          ${d.input_json?.adres ?? '?'} (${d.kantoren?.name}, fase ${d.fase})`)
  log(`  content_status: ${d.content_status}`)
  log(`  NL funda_tekst: ${woorden(d.outputs_json?.funda_tekst)} woorden`)
  log(`  EN funda_tekst: ${d.outputs_json_en ? `${woorden(d.outputs_json_en.funda_tekst)} woorden` : 'geen'}`)
}

/**
 * POST via node:http(s) in plaats van fetch: de ingebouwde fetch (undici)
 * kapt na 300 s zelf af (headersTimeout) — precies rond de grens die we
 * willen meten.
 */
function post(url, body, cookie) {
  return new Promise((resolve) => {
    const doel = new URL(url)
    const lib = doel.protocol === 'https:' ? https : http
    const req = lib.request(doel, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${cookie.name}=${cookie.value}` },
    }, (res) => {
      let tekst = ''
      res.on('data', (c) => { tekst += c })
      res.on('end', () => resolve({ status: res.statusCode, tekst }))
    })
    req.on('error', (err) => resolve({ status: null, tekst: err.message }))
    req.end(JSON.stringify(body))
  })
}

async function main() {
  if (!OBJECT_ID) throw new Error('Geef het dossier mee: --object <id>')
  const db = serviceClient()

  const voor = await leesDossier(db)
  if (voor.kantoren?.instellingen_json?.demo !== true) {
    throw new Error(`Dossier hoort bij "${voor.kantoren?.name}", geen demo-kantoor — dit script overschrijft content en draait alleen in het demo-kantoor.`)
  }
  log(`\nDossier ${OBJECT_ID} — vooraf`)
  toonStaat(voor)

  if (!SCHRIJVEN) {
    log(`\nDry-run: zou POST ${BASIS}/api/generate doen als ${DEMO_EMAIL} en de NL- en EN-content`)
    log('overschrijven (≈ €0,12). Draai met --write om echt te meten.')
    return
  }
  if (voor.content_status === 'bezig') throw new Error('Er loopt al een generatie voor dit dossier — wacht die eerst af.')

  const cookie = await sessieCookie(DEMO_EMAIL)
  log(`\nPOST ${BASIS}/api/generate — start ${new Date().toLocaleTimeString('nl-NL')}`)
  const t0 = Date.now()
  const { status, tekst } = await post(`${BASIS}/api/generate`, { objectId: OBJECT_ID }, cookie)
  const wandklok = Date.now() - t0

  const na = await leesDossier(db)
  const serverMs = na.content_gegenereerd_op && na.content_bezig_sinds && new Date(na.content_gegenereerd_op).getTime() >= t0
    ? new Date(na.content_gegenereerd_op).getTime() - new Date(na.content_bezig_sinds).getTime()
    : null

  log('\nResultaat')
  log(`  HTTP:           ${status ?? 'geen antwoord'}${status === 200 ? '' : ` — ${tekst.slice(0, 300)}`}`)
  log(`  wandklok:       ${sec(wandklok)}`)
  log(`  server (db):    ${serverMs === null ? 'niet bijgewerkt' : sec(serverMs)}`)
  toonStaat(na)

  const gemeten = serverMs ?? wandklok
  const oordeel = status === 504 || gemeten > LIMIET_MS
    ? 'TE LANG — de functie liep tegen 300 s aan: NL en EN splitsen of Vercel Pro'
    : gemeten > GOED_MS
      ? 'KRAP — tussen 240 en 300 s: in de demo het terugvaldossier als hoofdplan'
      : 'GOED — ruim binnen de functielimiet'
  log(`\nOordeel (D2): ${oordeel}`)
  if (status === 200 && !na.outputs_json_en) {
    log('⚠️  EN ontbreekt terwijl de aanroep slaagde — zie de generate:en-fout in de Vercel-logs.')
  }
}

main().catch((err) => {
  console.error('Meting mislukt:', err.message)
  process.exit(1)
})
