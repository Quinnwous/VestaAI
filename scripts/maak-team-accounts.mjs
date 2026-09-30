/**
 * Maakt de team-accounts van een kantoor in één keer aan, uit de tabel
 * "## Makelaars (aanmaken)" in een teamlijst (standaard docs/i4housing/i4housing-team.md).
 *
 * Besluit Quinn (29 sep 2026): **geen welkomstmail** (anders dan
 * `addMakelaarAccount` in app/admin/actions.ts, die direct mailt), een
 * startwachtwoord, en daarna resetten ze zelf via de kantoorlogin
 * (/login/<slug> → wachtwoord vergeten, reset-mail in kantoorstijl, item 9.2).
 *
 * Wachtwoorden: standaard per persoon een eigen, willekeurig startwachtwoord;
 * met --gedeeld één gezamenlijk (ook willekeurig, of zelf opgegeven met
 * --wachtwoord=…). Ze worden alléén weggeschreven naar
 * backups/team-wachtwoorden-<datum>.txt (backups/ staat in .gitignore) — nooit
 * naar de terminal of git.
 *
 * Standaard dry-run (toont wat er zou gebeuren). Bestaande e-mailadressen
 * worden overgeslagen, dus opnieuw draaien is veilig.
 *
 * Gebruik:
 *   node --env-file=.env.local scripts/maak-team-accounts.mjs --kantoor=<id> --genereer-lijst   (alleen de wachtwoordlijst maken)
 *   node --env-file=.env.local scripts/maak-team-accounts.mjs --kantoor=<id> [--bestand=docs/i4housing/i4housing-team.md] [--gedeeld] [--wachtwoord=…] [--write]
 * Bestaat backups/team-startwachtwoorden-<teamlijst>.tsv, dan gebruikt --write díe wachtwoorden.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { serviceClient } from './lib/dodSessie.mjs'

const arg = (naam) => process.argv.find(a => a.startsWith(`--${naam}=`))?.split('=').slice(1).join('=')
const vlag = (naam) => process.argv.includes(`--${naam}`)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const KANTOOR_ID = arg('kantoor')
const BESTAND = path.resolve(ROOT, arg('bestand') ?? 'docs/i4housing/i4housing-team.md')
const SCHRIJVEN = vlag('write')
const GEDEELD = vlag('gedeeld') || !!arg('wachtwoord')
const GENEREER_LIJST = vlag('genereer-lijst')
const LIJST = path.join(ROOT, 'backups', `team-startwachtwoorden-${path.basename(BESTAND, '.md')}.tsv`)

/** Leest een eerder gemaakte lijst (naam, e-mail, wachtwoord per regel) → Map e-mail → wachtwoord. */
function leesLijst() {
  if (!fs.existsSync(LIJST)) return new Map()
  const m = new Map()
  for (const regel of fs.readFileSync(LIJST, 'utf-8').split('\n')) {
    if (!regel || regel.startsWith('#')) continue
    const [, email, wachtwoord] = regel.split('\t')
    if (email && wachtwoord) m.set(email.toLowerCase(), wachtwoord)
  }
  return m
}

if (!KANTOOR_ID) {
  console.error('❌ --kantoor=<id> is verplicht')
  process.exit(1)
}

/**
 * Startwachtwoord: voornaam + twee willekeurige blokken ("Chita-k7Qm-4xRt").
 * Herkenbaar voor de persoon (besluit Quinn: "gebaseerd op de naam"), maar
 * het willekeurige deel (8 tekens, ~46 bits) maakt het niet te raden voor een
 * collega die het patroon kent. Geen verwarrende tekens (0/O, 1/l/I).
 */
function maakWachtwoord(naam = '') {
  const tekens = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(8)
  const s = Array.from(bytes, b => tekens[b % tekens.length]).join('')
  const voornaam = (naam.split(' ')[0] || 'Start').normalize('NFD').replace(/[^A-Za-z]/g, '')
  return `${voornaam}-${s.slice(0, 4)}-${s.slice(4, 8)}`
}

/** Leest de markdown-tabel onder "## Makelaars (aanmaken)": | Naam | Functie | E-mail |. */
function leesTeam(bestand) {
  const tekst = fs.readFileSync(bestand, 'utf-8')
  const start = tekst.indexOf('## Makelaars (aanmaken)')
  if (start === -1) throw new Error(`Geen sectie "## Makelaars (aanmaken)" in ${bestand}`)
  const rest = tekst.slice(start).split('\n').slice(1)
  const rijen = []
  for (const regel of rest) {
    if (regel.startsWith('## ')) break
    if (!regel.startsWith('|') || regel.includes('---') || /\|\s*Naam\s*\|/.test(regel)) continue
    const cellen = regel.split('|').slice(1, -1).map(c => c.trim())
    const [naam, functie, email] = cellen
    if (!naam || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Onleesbare rij: ${regel}`)
    rijen.push({ naam: naam.replace(/[⚠️*]/g, '').trim(), functie, email: email.toLowerCase() })
  }
  return rijen
}

async function main() {
  const service = serviceClient()
  const { data: kantoor, error: kErr } = await service.from('kantoren').select('id, name').eq('id', KANTOOR_ID).single()
  if (kErr || !kantoor) throw new Error(`Kantoor ${KANTOOR_ID} niet gevonden`)

  const team = leesTeam(BESTAND)
  const { data: bestaande } = await service.from('makelaars').select('email')
  const bestaandeEmails = new Set((bestaande ?? []).map(m => (m.email ?? '').toLowerCase()))

  if (GENEREER_LIJST) {
    if (fs.existsSync(LIJST)) throw new Error(`${path.relative(ROOT, LIJST)} bestaat al — niet overschreven (verwijder hem zelf als je nieuwe wachtwoorden wilt)`)
    fs.mkdirSync(path.dirname(LIJST), { recursive: true })
    const regels = team.map(p => `${p.naam}\t${p.email}\t${maakWachtwoord(p.naam)}`)
    fs.writeFileSync(LIJST, `# ${kantoor.name} — startwachtwoorden (gemaakt ${new Date().toISOString().slice(0, 10)}); nog NIET aangemaakt. Zelf resetten via de kantoorlogin.\n${regels.join('\n')}\n`, { mode: 0o600 })
    console.log(`🔐 Lijst met ${team.length} startwachtwoorden → ${path.relative(ROOT, LIJST)} (buiten git). Er is niets aangemaakt.`)
    return
  }
  const lijst = leesLijst()
  if (lijst.size) console.log(`🔐 Startwachtwoorden uit ${path.relative(ROOT, LIJST)}`)

  const gedeeldWachtwoord = GEDEELD ? (arg('wachtwoord') ?? maakWachtwoord()) : null
  if (gedeeldWachtwoord && gedeeldWachtwoord.length < 12) throw new Error('Gedeeld wachtwoord: minimaal 12 tekens')

  console.log(`👥 ${team.length} personen voor "${kantoor.name}" — ${SCHRIJVEN ? 'WRITE' : 'dry-run'}, ${GEDEELD ? 'één gedeeld startwachtwoord' : 'eigen startwachtwoord per persoon'}, geen welkomstmail\n`)

  const aangemaakt = []
  for (const p of team) {
    if (bestaandeEmails.has(p.email)) {
      console.log(`  ⏭  ${p.naam.padEnd(22)} ${p.email} — bestaat al, overgeslagen`)
      continue
    }
    if (!SCHRIJVEN) {
      console.log(`  ➕ ${p.naam.padEnd(22)} ${p.email} — zou aangemaakt worden (${p.functie})`)
      continue
    }
    const wachtwoord = gedeeldWachtwoord ?? lijst.get(p.email) ?? maakWachtwoord(p.naam)
    const { data: gemaakt, error } = await service.auth.admin.createUser({
      email: p.email,
      password: wachtwoord,
      email_confirm: true,
      user_metadata: { kantoor_id: KANTOOR_ID, role: 'makelaar' },
    })
    if (error || !gemaakt.user) {
      console.error(`  ❌ ${p.naam}: ${error?.message ?? 'aanmaken mislukt'}`)
      continue
    }
    // Zelfde koppeling als plaatsInKantoor() in app/admin/actions.ts (sinds de
    // hardening-migratie maakt geen trigger meer een makelaars-rij aan).
    const { error: mErr } = await service.from('makelaars').upsert({
      id: gemaakt.user.id, kantoor_id: KANTOOR_ID, name: p.naam, email: p.email, role: 'makelaar',
    })
    if (mErr) {
      console.error(`  ❌ ${p.naam}: account gemaakt maar niet aan het kantoor gekoppeld — ${mErr.message}`)
      continue
    }
    aangemaakt.push({ ...p, wachtwoord })
    console.log(`  ✅ ${p.naam.padEnd(22)} ${p.email}`)
  }

  if (SCHRIJVEN && aangemaakt.length) {
    const dir = path.join(ROOT, 'backups')
    fs.mkdirSync(dir, { recursive: true })
    const uit = path.join(dir, `team-wachtwoorden-${new Date().toISOString().slice(0, 10)}.txt`)
    const regels = aangemaakt.map(p => `${p.naam}\t${p.email}\t${p.wachtwoord}`)
    fs.appendFileSync(uit, `# ${kantoor.name} — startwachtwoorden (${new Date().toISOString()}); zelf resetten via de kantoorlogin\n${regels.join('\n')}\n`, { mode: 0o600 })
    console.log(`\n🔐 Startwachtwoorden → ${path.relative(ROOT, uit)} (buiten git, alleen voor jou)`)
  }
  if (!SCHRIJVEN) console.log('\n🧪 Dry-run — niets aangemaakt. Voeg --write toe om ze echt aan te maken.')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
