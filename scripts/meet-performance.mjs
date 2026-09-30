/**
 * Server-side querytimings op echte (demo-)data — item 12.3, docs/roadmap.md
 * § Fase 12: "RPC-/querytimings op de echte (demo-)data ... gelogd in
 * docs/metingen/performance.md". Meet dezelfde `lib/transactiesQuery.ts`-functies
 * en RPC's die dashboard/marktanalyse/transacties/concurrentie/dossier ook
 * zelf aanroepen — geen losse SQL, dus geen risico dat het meetscript iets
 * anders meet dan de app.
 *
 * Toegang (zelfde patroon als scripts/backtest-waardering.mjs): logt in als
 * het demo-account (demo@vestaai.nl) via de anon-key — RLS beperkt elke
 * query vanzelf tot dat kantoor, precies zoals een ingelogde makelaar het
 * ervaart. Geen service-role, geen schrijfacties.
 *
 * Gebruik:
 *   npx tsx --env-file=.env.local scripts/meet-performance.mjs
 *   npx tsx --env-file=.env.local scripts/meet-performance.mjs --object=<id>  (dossier-timing op een specifiek object)
 *   npx tsx --env-file=.env.local scripts/meet-performance.mjs --json        (ruwe JSON i.p.v. de tabel)
 *
 * Vereist in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DEMO_PASSWORD.
 */
import { createClient } from '@supabase/supabase-js'
import {
  haalEigenVerkopen,
  haalTransactiesVoorVerkenner,
  dataTotEnMet,
  marktanalyseSamenvatting,
  plaatsenWijken,
  concurrentieMarktaandeel,
  concurrentieSegmenten,
  concurrentieRanglijst,
  concurrentieWijVsMarkt,
  MET_COORDINATEN_KOLOMMEN,
} from '../lib/transactiesQuery.ts'
import { haalRecentBekekenOp } from '../lib/gebruik.ts'

const DEMO_EMAIL = 'demo@vestaai.nl'
const HERHALINGEN = 5 // per meting — eerste run is vaak koud (connectie/plan-cache), we rapporteren mediaan

function vereisEnv(namen) {
  const ontbreekt = namen.filter((k) => !process.env[k])
  if (ontbreekt.length) {
    throw new Error(`${ontbreekt.join(', ')} ontbreekt — draai met: npx tsx --env-file=.env.local scripts/meet-performance.mjs`)
  }
}

async function sessieClient() {
  vereisEnv(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DEMO_PASSWORD'])
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email: DEMO_EMAIL, password: process.env.DEMO_PASSWORD })
  if (error) throw new Error(`inloggen als ${DEMO_EMAIL} mislukt: ${error.message}`)
  return client
}

function mediaan(getallen) {
  const s = [...getallen].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Voert `fn` HERHALINGEN keer uit, rapporteert min/mediaan/max in ms + een resultaat-samenvatting. */
async function meet(label, fn) {
  const tijden = []
  let laatsteResultaat
  let fout = null
  for (let i = 0; i < HERHALINGEN; i++) {
    const start = performance.now()
    try {
      laatsteResultaat = await fn()
    } catch (e) {
      fout = e instanceof Error ? e.message : String(e)
      break
    }
    tijden.push(performance.now() - start)
  }
  const rij = {
    label,
    fout,
    minMs: tijden.length ? Math.round(Math.min(...tijden)) : null,
    mediaanMs: tijden.length ? Math.round(mediaan(tijden)) : null,
    maxMs: tijden.length ? Math.round(Math.max(...tijden)) : null,
    n: samenvatN(laatsteResultaat),
  }
  return rij
}

/** Best-effort "hoeveel rijen kwamen terug" voor de tabel — puur informatief. */
function samenvatN(resultaat) {
  if (Array.isArray(resultaat)) return resultaat.length
  if (resultaat && typeof resultaat === 'object') {
    if ('huidig' in resultaat) return resultaat.huidig?.n ?? null
    if ('data' in resultaat) return Array.isArray(resultaat.data) ? resultaat.data.length : null
  }
  return null
}

const EIGEN_VERKOOP_KOLOMMEN_DASHBOARD = ['verkoopprijs', 'vraagprijs', 'looptijd_dagen', 'verkoopdatum', 'plaats']
const EIGEN_VERKOOP_KOLOMMEN_MARKTANALYSE = [
  'id', 'plaats', 'wijk', 'verkoopprijs', 'vraagprijs', 'verkoopdatum', 'looptijd_dagen',
  'woonoppervlak_m2', 'perceel_m2', 'bouwjaar', 'energielabel', 'kamers', 'garage', 'tuin',
  'woningtype_groep', 'woningtype_sub', 'prijs_m2',
]
// Zelfde kolomset als TransactiesZoeken/VerkoopkaartExplorerV2 e.d. gebruiken
// via haalTransactiesVoorVerkenner (§ 3.1 patroon 1, tussenfase — zie
// lib/transactiesQuery.ts bestandscommentaar).
const VERKENNER_KOLOMMEN = [
  'id', 'adres', 'postcode', 'plaats', 'wijk', 'buurt', 'verkoopprijs', 'vraagprijs',
  'verkoopdatum', 'looptijd_dagen', 'woningtype_groep', 'woningtype_sub', 'woonoppervlak_m2',
  'perceel_m2', 'bouwjaar', 'energielabel', 'kamers', 'garage', 'tuin', 'eigen_verkoop',
  'verkopend_kantoor',
]

async function main() {
  const objectArg = process.argv.find((a) => a.startsWith('--object='))?.split('=')[1]
  const alsJson = process.argv.includes('--json')

  const client = await sessieClient()
  const { data: makelaar, error: makelaarFout } = await client
    .from('makelaars')
    .select('id, kantoor_id')
    .eq('email', DEMO_EMAIL)
    .single()
  if (makelaarFout) throw new Error(`makelaar ophalen mislukt: ${makelaarFout.message}`)

  const resultaten = []

  // ── Dashboard ──────────────────────────────────────────────────────────
  resultaten.push({
    route: 'dashboard',
    ...(await meet('dataTotEnMet()', () => dataTotEnMet(client))),
  })
  resultaten.push({
    route: 'dashboard',
    ...(await meet('haalEigenVerkopen() [kerncijfers]', () =>
      haalEigenVerkopen(client, EIGEN_VERKOOP_KOLOMMEN_DASHBOARD),
    )),
  })
  resultaten.push({
    route: 'dashboard',
    ...(await meet('haalRecentBekekenOp()', () => haalRecentBekekenOp(client, makelaar.id, 20))),
  })

  // ── Marktanalyse ───────────────────────────────────────────────────────
  resultaten.push({
    route: 'marktanalyse',
    ...(await meet('haalEigenVerkopen() [wij-lijn]', () =>
      haalEigenVerkopen(client, EIGEN_VERKOOP_KOLOMMEN_MARKTANALYSE),
    )),
  })
  resultaten.push({
    route: 'marktanalyse',
    ...(await meet('RPC marktanalyse_samenvatting', () => marktanalyseSamenvatting(client))),
  })
  resultaten.push({
    route: 'marktanalyse',
    ...(await meet('RPC transacties_plaatsen_wijken', () => plaatsenWijken(client))),
  })

  // ── Transacties opzoeken ───────────────────────────────────────────────
  resultaten.push({
    route: 'transacties',
    ...(await meet('haalTransactiesVoorVerkenner() [volledige set]', () =>
      haalTransactiesVoorVerkenner(client, VERKENNER_KOLOMMEN),
    )),
  })

  // ── Concurrentie ───────────────────────────────────────────────────────
  resultaten.push({
    route: 'concurrentie',
    ...(await meet('RPC concurrentie_marktaandeel (v1)', () => concurrentieMarktaandeel(client))),
  })
  resultaten.push({
    route: 'concurrentie',
    ...(await meet('RPC concurrentie_segmenten (v1)', () => concurrentieSegmenten(client))),
  })
  resultaten.push({
    route: 'concurrentie',
    ...(await meet('RPC concurrentie_ranglijst (v2)', () => concurrentieRanglijst(client))),
  })
  resultaten.push({
    route: 'concurrentie',
    ...(await meet('RPC concurrentie_wij_vs_markt (v2)', () => concurrentieWijVsMarkt(client))),
  })

  // ── Dossier ────────────────────────────────────────────────────────────
  let objectId = objectArg
  if (!objectId) {
    const { data } = await client
      .from('objecten')
      .select('id')
      .eq('kantoor_id', makelaar.kantoor_id)
      .limit(1)
      .maybeSingle()
    objectId = data?.id
  }
  if (objectId) {
    resultaten.push({
      route: 'dossier',
      ...(await meet(`objecten select-by-id (ongecachet, zoals getCachedObject zonder cache)`, () =>
        client
          .from('objecten')
          .select(
            'id, kantoor_id, address, status, fase, fase_sinds, input_json, outputs_json, outputs_json_en, created_at, notitie, lat, lng, waardering_json, usps_structuur, content_status, content_gegenereerd_op, content_bezig_sinds',
          )
          .eq('id', objectId)
          .single(),
      )),
    })
    resultaten.push({
      route: 'dossier',
      ...(await meet('haalEigenVerkopen() metCoordinaten [referentiekaart]', () =>
        haalEigenVerkopen(client, MET_COORDINATEN_KOLOMMEN, { metCoordinaten: true }),
      )),
    })
  } else {
    resultaten.push({ route: 'dossier', label: '(geen object gevonden in demo-kantoor)', fout: 'skip', minMs: null, mediaanMs: null, maxMs: null, n: null })
  }

  if (alsJson) {
    console.log(JSON.stringify(resultaten, null, 2))
    return
  }

  console.log(`\nQuerytimings — demo-kantoor (${makelaar.kantoor_id}), ${HERHALINGEN} herhalingen per meting, mediaan gerapporteerd.\n`)
  console.table(
    resultaten.map((r) => ({
      route: r.route,
      functie: r.label,
      'mediaan (ms)': r.mediaanMs,
      'min (ms)': r.minMs,
      'max (ms)': r.maxMs,
      n: r.n,
      fout: r.fout ?? '',
    })),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
