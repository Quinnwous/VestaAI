/**
 * Maakt de team-accounts van een kantoor in één keer aan, uit de tabel
 * "## Makelaars (aanmaken)" in een teamlijst (standaard docs/i4housing-team.md).
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
 *   node --env-file=.env.local scripts/maak-team-accounts.mjs --kantoor=<id> [--bestand=docs/i4housing-team.md] [--gedeeld] [--wachtwoord=…] [--write]
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
const BESTAND = path.resolve(ROOT, arg('bestand') ?? 'docs/i4housing-team.md')
const SCHRIJVEN = vlag('write')
const GEDEELD = vlag('gedeeld') || !!arg('wachtwoord')

if (!KANTOOR_ID) {
  console.error('❌ --kantoor=<id> is verplicht')
  process.exit(1)
}

/** Leesbaar, sterk wachtwoord: 4 groepen van 4 tekens zonder verwarrende tekens (0/O, 1/l/I). */
function maakWachtwoord() {
  const tekens = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(16)
  const s = Array.from(bytes, b => tekens[b % tekens.length]).join('')
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`
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
    const wachtwoord = gedeeldWachtwoord ?? maakWachtwoord()
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
