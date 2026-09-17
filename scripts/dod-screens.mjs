/**
 * Definition of Done, visuele stap in één commando:
 *
 *   npm run dod:screens               # gebruikt een draaiende server op DOD_PORT (3000), of start er zelf een
 *   npm run dod:screens -- --port=3001
 *
 * 1. controleer-huisstijl.mjs op 390, 1280 en 1920 px (runtime-fouten + VestaAI-groen)
 * 2. screenshots.mjs (alle routes × drie breedtes → screenshots/, beoordelen tegen
 *    docs/ontwerpprincipes.md en, voor hero-schermen, skill `ontwerpreview`)
 *
 * Exit 1 zodra één van beide faalt. Vereist .env.local met NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY (en de gewone app-variabelen voor de dev-server).
 * ⚠️ .env.local wijst naar productie: deze scripts lezen alleen, ze schrijven niets.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { poortUitArgs, vereisEnv } from './lib/dodSessie.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const POORT = poortUitArgs(process.env.DOD_PORT || '3000')
const BASIS = `http://localhost:${POORT}`

async function bereikbaar() {
  try {
    const res = await fetch(`${BASIS}/login`, { redirect: 'manual', signal: AbortSignal.timeout(3000) })
    return res.status > 0
  } catch {
    return false
  }
}

function draai(script, args) {
  return new Promise((resolve) => {
    const kind = spawn(process.execPath, ['--env-file=.env.local', script, ...args], { cwd: ROOT, stdio: 'inherit' })
    kind.on('exit', (code) => resolve(code ?? 1))
  })
}

async function startServer() {
  console.log(`▶ Geen server op ${BASIS} — start next dev op poort ${POORT} …`)
  const server = spawn('npx', ['next', 'dev', '-p', POORT], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  server.stdout.on('data', () => {})
  server.stderr.on('data', (d) => process.stderr.write(d))
  const tot = Date.now() + 120_000
  while (Date.now() < tot) {
    if (await bereikbaar()) break
    await new Promise((r) => setTimeout(r, 1000))
  }
  if (!(await bereikbaar())) {
    process.kill(-server.pid)
    throw new Error(`dev-server op ${BASIS} kwam niet binnen 2 minuten op`)
  }
  // Eerste compile per route is traag; één keer de zwaarste routes voorverwarmen.
  for (const pad of ['/dashboard', '/woningen', '/marktanalyse', '/marktanalyse/kaart']) {
    await fetch(BASIS + pad, { redirect: 'manual' }).catch(() => {})
  }
  return server
}

async function main() {
  vereisEnv()
  const server = (await bereikbaar()) ? null : await startServer()
  let fouten = 0
  try {
    for (const breedte of [390, 1280, 1920]) {
      console.log(`\n═══ Huisstijl ${breedte} px ═══`)
      if ((await draai('scripts/controleer-huisstijl.mjs', [POORT, `--width=${breedte}`])) !== 0) fouten++
    }
    console.log('\n═══ Screenshots ═══')
    if ((await draai('scripts/screenshots.mjs', [POORT])) !== 0) fouten++
  } finally {
    if (server) process.kill(-server.pid)
  }
  if (fouten) {
    console.error(`\n❌ dod:screens: ${fouten} stap(pen) gefaald`)
    process.exit(1)
  }
  console.log('\n✅ dod:screens groen — beoordeel nu screenshots/ tegen docs/ontwerpprincipes.md')
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
