/**
 * Lighthouse op ingelogde pagina's — herhaalbare voor/na-meting voor
 * performance-rondes (les 29 sep 2026: de mobiele score schommelt op deze
 * machine 20 punten tussen runs, dus altijd meerdere runs en de mediaan).
 *
 * Logt in via dezelfde sessiecookie als de DoD-scripts (scripts/lib/dodSessie.mjs,
 * standaard het demo-kantoor) en geeft die als Cookie-header aan Lighthouse mee.
 * Alleen lezend.
 *
 * Gebruik:
 *   node --env-file=.env.local scripts/meet-lighthouse.mjs --label=voor
 *   node --env-file=.env.local scripts/meet-lighthouse.mjs --basis=http://localhost:3000 --runs=5
 *   node --env-file=.env.local scripts/meet-lighthouse.mjs --routes=/dashboard,/marktanalyse --desktop
 *
 * Standaard: productie (https://www.vestaai.nl — de kale domeinnaam stuurt door), 3 runs, mobiel, routes dashboard ·
 * marktanalyse · concurrentie · woningen · dossier (eerste dossier met
 * waardering van het DoD-kantoor). Met --label schrijft het de ruwe mediaan
 * naar docs/data/lighthouse-<label>.json.
 *
 * Vereist: .env.local met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY,
 * en een Chromium — standaard die van Playwright, anders CHROME_PATH.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { sessieCookie, serviceClient, DOD_EMAIL } from './lib/dodSessie.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)
const BASIS = String(args.basis ?? 'https://www.vestaai.nl').replace(/\/$/, '')
const RUNS = Number(args.runs ?? 3)
const DESKTOP = !!args.desktop

async function chromePad() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  const mappen = existsSync(cache) ? (await readdir(cache)).filter((m) => /^chromium-\d+$/.test(m)).sort().reverse() : []
  for (const m of mappen) {
    const pad = join(cache, m, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
    if (existsSync(pad)) return pad
  }
  throw new Error('Geen Chromium gevonden — zet CHROME_PATH of draai `npx playwright install chromium`')
}

async function standaardRoutes() {
  const routes = ['/dashboard', '/marktanalyse', '/marktanalyse/concurrentie', '/woningen']
  const { data: makelaar } = await serviceClient().from('makelaars').select('kantoor_id').eq('email', DOD_EMAIL).maybeSingle()
  if (makelaar) {
    const { data: obj } = await serviceClient().from('objecten').select('id')
      .eq('kantoor_id', makelaar.kantoor_id).not('waardering_json', 'is', null)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (obj) routes.push(`/object/${obj.id}`)
  }
  return routes
}

function draaiLighthouse(url, headerBestand, chrome) {
  const lhArgs = [
    '-y', 'lighthouse@12.8.2', url,
    '--only-categories=performance',
    '--output=json', '--output-path=stdout', '--quiet',
    `--extra-headers=${headerBestand}`,
    '--chrome-flags=--headless=new --no-sandbox',
    ...(DESKTOP ? ['--preset=desktop'] : []),
  ]
  return new Promise((resolve, reject) => {
    const p = spawn('npx', lhArgs, { env: { ...process.env, CHROME_PATH: chrome } })
    let uit = ''
    let fout = ''
    p.stdout.on('data', (d) => { uit += d })
    p.stderr.on('data', (d) => { fout += d })
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`lighthouse faalde (${code}): ${fout.slice(-400)}`))
      try { resolve(JSON.parse(uit)) } catch (e) { reject(e) }
    })
  })
}

function samenvatting(lhr) {
  const a = lhr.audits
  const lcpEl = a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node
  const bootup = (a['bootup-time']?.details?.items ?? [])
    .slice(0, 4).map((i) => ({ url: String(i.url).replace(/^https?:\/\/[^/]+/, '').slice(0, 70), ms: Math.round(i.total) }))
  return {
    score: Math.round((lhr.categories.performance.score ?? 0) * 100),
    fcp: Math.round(a['first-contentful-paint'].numericValue),
    lcp: Math.round(a['largest-contentful-paint'].numericValue),
    tbt: Math.round(a['total-blocking-time'].numericValue),
    cls: Number(a['cumulative-layout-shift'].numericValue.toFixed(3)),
    si: Math.round(a['speed-index'].numericValue),
    jsKb: Math.round((a['resource-summary']?.details?.items?.find((i) => i.resourceType === 'script')?.transferSize ?? 0) / 1024),
    lcpElement: lcpEl ? `${lcpEl.nodeLabel ?? ''} (${lcpEl.selector ?? ''})`.slice(0, 120) : null,
    bootup,
  }
}

const mediaan = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

async function main() {
  const chrome = await chromePad()
  const cookie = await sessieCookie()
  const routes = args.routes ? String(args.routes).split(',') : await standaardRoutes()
  const map = await mkdtemp(join(tmpdir(), 'lh-'))
  const headerBestand = join(map, 'headers.json')
  // Het sessietoken staat alleen in een tijdelijk bestand (0600) en gaat na afloop weg.
  await writeFile(headerBestand, JSON.stringify({ Cookie: `${cookie.name}=${cookie.value}` }), { mode: 0o600 })

  const resultaat = {}
  try {
    for (const route of routes) {
      const runs = []
      for (let i = 0; i < RUNS; i++) {
        const lhr = await draaiLighthouse(BASIS + route, headerBestand, chrome)
        if (new URL(lhr.finalDisplayedUrl ?? lhr.finalUrl).pathname.startsWith('/login')) {
          throw new Error(`${route} stuurde door naar /login — sessiecookie niet geaccepteerd`)
        }
        runs.push(samenvatting(lhr))
      }
      const med = (k) => mediaan(runs.map((r) => r[k]))
      resultaat[route] = {
        score: med('score'), scores: runs.map((r) => r.score),
        fcp: med('fcp'), lcp: med('lcp'), tbt: med('tbt'), si: med('si'), cls: med('cls'), jsKb: med('jsKb'),
        lcpElement: runs[runs.length - 1].lcpElement,
        bootup: runs[runs.length - 1].bootup,
      }
      const r = resultaat[route]
      console.log(`${route.padEnd(34)} score ${String(r.score).padStart(3)} (${r.scores.join('/')})  FCP ${r.fcp}  LCP ${r.lcp}  TBT ${r.tbt}  CLS ${r.cls}  JS ${r.jsKb} kB`)
      console.log(`${''.padEnd(34)} LCP-element: ${r.lcpElement ?? '—'}`)
    }
  } finally {
    await rm(map, { recursive: true, force: true })
  }

  if (args.label) {
    const pad = `docs/data/lighthouse-${args.label}.json`
    await writeFile(pad, JSON.stringify({
      datum: new Date().toISOString(), basis: BASIS, preset: DESKTOP ? 'desktop' : 'mobiel', runs: RUNS, routes: resultaat,
    }, null, 2) + '\n')
    console.log(`\n→ ${pad}`)
  }
}

main().catch((e) => { console.error(e.message); process.exit(1) })
