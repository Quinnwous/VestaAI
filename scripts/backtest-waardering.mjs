/**
 * Backtest van de waarderingskern v2 (item 4.8, docs/roadmap.md § 3.3 + § 5
 * Fase 4): meet hoe goed `berekenWaarderingV2()` de werkelijke verkoopprijs
 * voorspelt op de demo-fixture, per typegroep en per verbredingstrede — de
 * echte "hoe betrouwbaar is de band"-check voor de taxateur van i4 Housing.
 * Draait later opnieuw op echte data (item 5.5), ongewijzigd.
 *
 * Meetlogica: `lib/backtest.ts` — dezelfde pure module als de synthetische
 * vitest-vangrail `lib/waardering.backtest.test.ts`, zodat test en script
 * precies dezelfde definitie van "goed" gebruiken.
 *
 * Voor elke steekproefwoning: peildatum = de dag vóór haar eigen
 * verkoopdatum, de woning zelf uitgesloten, referenties en regionale set
 * (index, kenmerk-effecten) uitsluitend uit transacties van vóór die
 * peildatum. De verbredingsladder (straal/maanden) en de haversine-afstand
 * zelf lopen al in `kiesReferenties()` (lib/waardering.ts) over de
 * meegegeven kandidatenlijst — dit script hoeft dus niet zelf per straal te
 * filteren of N losse RPC's te doen: de hele (gedateerde) dataset gaat er in
 * één keer in, precies zoals de vitest-backtest het doet.
 *
 * Toegang tot `transacties` (§ 3.1 — bindend: alléén via de sessie-gebonden
 * client zodat RLS de kantoorscheiding regelt):
 * - Standaard (geen --kantoor): logt in als het demo-account
 *   (`demo@vestaai.nl`, wachtwoord `DEMO_PASSWORD`) via de anon-key en haalt
 *   de dataset op met `haalTransactiesVoorVerkenner()` uit
 *   `lib/transactiesQuery.ts` — RLS beperkt die query vanzelf tot het
 *   kantoor van dat account (Demo Makelaardij).
 * - `--kantoor=<id>`: er is geen ingelogde sessie voor een willekeurig
 *   kantoor, dus dit pad gebruikt de SERVICE-client (bypassed RLS) met een
 *   HARDE `.eq('kantoor_id', <id>)`-filter in de query zelf
 *   (`haalDatasetMetKantoorFilter()` hieronder) — de enige plek in dit
 *   script waar de service-role-key transacties leest, en nooit zonder dat
 *   filter. `scripts/` is uitgezonderd van de transactiesQuery-guard-test
 *   (zie het bestandscommentaar in lib/transactiesQuery.ts).
 *
 * Alleen lezend — geen enkele schrijfactie op de database.
 *
 * Gebruik:
 *   npx tsx --env-file=.env.local scripts/backtest-waardering.mjs
 *   npx tsx --env-file=.env.local scripts/backtest-waardering.mjs --n=200 --seed=7
 *   npx tsx --env-file=.env.local scripts/backtest-waardering.mjs --kantoor=a231a80e-326b-4dcd-966e-faaeebddfa9a
 *
 * Vereist in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * DEMO_PASSWORD (standaardpad); SUPABASE_SERVICE_ROLE_KEY extra bij --kantoor.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MET_COORDINATEN_KOLOMMEN, haalTransactiesVoorVerkenner } from '../lib/transactiesQuery.ts'
import { meetEen, perTrede, perTypegroep, vatSamen } from '../lib/backtest.ts'
import { mulberry32 } from '../lib/waardering.synthetisch.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const DEMO_EMAIL = 'demo@vestaai.nl'
const RECENT_MAANDEN = 24
const DEMO_LAT_MEDIAAN_FOUT_PCT = 7
const DEMO_LAT_BINNEN_BAND_PCT = 75
const SYNTHETISCH_REFERENTIE = { mediaanFoutPct: 5.2, binnenBandPct: 78 }

// ── CLI-argumenten ─────────────────────────────────────────────────────────
function argWaarde(naam, standaard) {
  const vlag = process.argv.find(a => a.startsWith(`--${naam}=`))
  return vlag ? vlag.slice(naam.length + 3) : standaard
}
const KANTOOR_ID = argWaarde('kantoor', null)
const N = Number(argWaarde('n', '400'))
const SEED = Number(argWaarde('seed', '42'))
const COMMANDO = `npx tsx --env-file=.env.local scripts/backtest-waardering.mjs${KANTOOR_ID ? ` --kantoor=${KANTOOR_ID}` : ''}${N !== 400 ? ` --n=${N}` : ''}${SEED !== 42 ? ` --seed=${SEED}` : ''}`

function log(...a) {
  // eslint-disable-next-line no-console
  console.log(...a)
}

function vereisEnv(namen) {
  const ontbreekt = namen.filter(k => !process.env[k])
  if (ontbreekt.length) {
    throw new Error(`${ontbreekt.join(', ')} ontbreekt — draai met: npx tsx --env-file=.env.local scripts/backtest-waardering.mjs`)
  }
}

/** Sessie-client, ingelogd als het demo-account — RLS regelt de kantoorscheiding. */
async function sessieClient() {
  vereisEnv(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DEMO_PASSWORD'])
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email: DEMO_EMAIL, password: process.env.DEMO_PASSWORD })
  if (error) throw new Error(`inloggen als ${DEMO_EMAIL} mislukt: ${error.message}`)
  return client
}

/**
 * Service-client + HARDE kantoor_id-filter, voor een expliciet opgegeven
 * kantoor waarvoor geen sessie bestaat. Bypasst RLS — nooit gebruiken zonder
 * de `.eq('kantoor_id', kantoorId)` hieronder.
 */
async function haalDatasetMetKantoorFilter(kantoorId) {
  vereisEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const BLOK = 1000
  const alles = []
  let van = 0
  for (;;) {
    const tot = van + BLOK - 1
    const { data, error } = await client
      .from('transacties_met_coordinaten')
      .select(MET_COORDINATEN_KOLOMMEN.join(','))
      .eq('kantoor_id', kantoorId) // ⚠️ harde filter — service-client bypasst RLS, dit is de enige bescherming
      .is('uitgesloten_reden', null)
      .order('id', { ascending: true })
      .range(van, tot)
    if (error) throw new Error(`transacties ophalen (kantoor ${kantoorId}) mislukt: ${error.message}`)
    const rijen = data ?? []
    alles.push(...rijen)
    if (rijen.length < BLOK) break
    van += BLOK
  }
  return alles
}

// ── Datumhelpers (lokaal, geen afhankelijkheid van lib/prijsindex.ts nodig) ─
function dagVoor(datumIso) {
  const d = new Date(`${datumIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
function maandenTerug(datumIso, maanden) {
  const d = new Date(`${datumIso}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - maanden)
  return d.toISOString().slice(0, 10)
}

/** Deterministische Fisher-Yates-shuffle op een vaste sortering (id), zodat dezelfde seed altijd dezelfde steekproef geeft. */
function seedSteekproef(rijen, n, seed) {
  const rnd = mulberry32(seed)
  const a = [...rijen].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

// ── Rapportage ───────────────────────────────────────────────────────────
function tabel(rijen) {
  const kop = ['', 'n', 'mediaan fout', 'P80 fout', 'P90 fout', 'binnen band', 'gem. bandbreedte', 'gem. n', 'zonder uitkomst', 'met waarschuwing']
  const lijnen = rijen.map(r => [
    r.label,
    String(r.subjecten),
    r.mediaanFoutPct == null ? '—' : `${r.mediaanFoutPct} %`,
    r.p80FoutPct == null ? '—' : `${r.p80FoutPct} %`,
    r.p90FoutPct == null ? '—' : `${r.p90FoutPct} %`,
    r.binnenBandPct == null ? '—' : `${r.binnenBandPct} %`,
    r.gemBandbreedtePct == null ? '—' : `${r.gemBandbreedtePct} %`,
    r.gemN == null ? '—' : String(r.gemN),
    `${r.zonderUitkomstPct} %`,
    r.metWaarschuwingPct == null ? '—' : `${r.metWaarschuwingPct} %`,
  ])
  return { kop, lijnen }
}

function printTabel(titel, rijen) {
  const { kop, lijnen } = tabel(rijen)
  log(`\n${titel}`)
  log(kop.join(' | '))
  for (const l of lijnen) log(l.join(' | '))
}

function markdownTabel(rijen) {
  const { kop, lijnen } = tabel(rijen)
  const out = [`| ${kop.join(' | ')} |`, `|${kop.map(() => '---').join('|')}|`]
  for (const l of lijnen) out.push(`| ${l.join(' | ')} |`)
  return out.join('\n')
}

function interpretatie(totaal, mediaanHaalt, bandHaalt, perGroep, trede) {
  const regels = []
  regels.push(
    `Een mediane fout van ${totaal.mediaanFoutPct} % betekent: bij de helft van de steekproefwoningen zat de puntwaarde van de waardering binnen ${totaal.mediaanFoutPct} % van de werkelijke verkoopprijs (bij de andere helft verder weg — P80/P90 laten zien hoever de staart reikt).`,
  )
  regels.push(
    `${totaal.binnenBandPct} % binnen de band betekent: bij ${totaal.binnenBandPct} van de 100 woningen viel de échte verkoopprijs tussen de getoonde laag- en hoogwaarde — dat is het percentage waarop de band zijn belofte waarmaakt.`,
  )
  if (!mediaanHaalt) {
    regels.push(
      `⚠️ De mediane fout (${totaal.mediaanFoutPct} %) haalt de demo-lat van ≤ ${DEMO_LAT_MEDIAAN_FOUT_PCT} % niet. Dat wijst op de puntwaarde zelf (referentieselectie, correcties of prijsindex), niet op de band — een bredere band lost dit niet op.`,
    )
  }
  if (!bandHaalt) {
    regels.push(
      `⚠️ ${totaal.binnenBandPct} % binnen de band haalt de demo-lat van ≥ ${DEMO_LAT_BINNEN_BAND_PCT} % niet: de band is op dit deel van de dataset te smal. Concreet voorstel (niet doorgevoerd in \`lib/waardering.ts\` — besluit voor de orchestrator): verruim \`BAND_PERCENTIELEN\` van [0.10, 0.90] naar bijvoorbeeld [0.05, 0.95], of verhoog \`BAND_MINIMUM\` (met name \`standaard\`/\`onder6\`) zodat de ondergrens bij een n ≥ 6 niet op ± 5 % blijft steken. Test na een aanpassing eerst opnieuw tegen dit script vóórdat de band in de UI verandert.`,
    )
  }
  if (mediaanHaalt && bandHaalt) {
    regels.push('Beide demo-lat-doelen zijn gehaald op deze dataset — geen aanpassing aan de bandregels nodig.')
  }

  // Nuance: de demo-lat geldt op totaalniveau (roadmap § 3.3), maar een
  // typegroep of trede die er zelf net onder zit is voor de taxateur
  // relevanter dan het totaalcijfer alleen.
  const zwakkeGroepen = perGroep.filter(g => g.subjecten >= 20 && ((g.mediaanFoutPct ?? 0) > DEMO_LAT_MEDIAAN_FOUT_PCT || (g.binnenBandPct ?? 100) < DEMO_LAT_BINNEN_BAND_PCT))
  if (zwakkeGroepen.length) {
    regels.push(
      `Ondanks een gehaald totaalcijfer zit(ten) ${zwakkeGroepen.map(g => `**${g.label}** (${g.mediaanFoutPct} % fout, ${g.binnenBandPct} % binnen band, n=${g.subjecten})`).join(', ')} zelf onder de demo-lat — daar is de band voor die taxateur minder betrouwbaar dan het totaal doet vermoeden.`,
    )
  }
  const kleineTredes = trede.filter(t => t.subjecten < 20)
  if (kleineTredes.length) {
    regels.push(
      `De verbredingstredes met weinig woningen (${kleineTredes.map(t => `${t.label}: n=${t.subjecten}`).join(', ')}) geven geen betrouwbaar beeld op zichzelf — dat zijn de gevallen waarin de straal al moest verbreden omdat er lokaal te weinig vergelijkbare verkopen waren, en de cijfers daar zwaaien het hardst mee (zie bv. het percentage "met waarschuwing").`,
    )
  }
  return regels.map(r => `- ${r}`).join('\n')
}

// ── Hoofdprogramma ─────────────────────────────────────────────────────────
async function main() {
  log(`Backtest waardering v2 — ${KANTOOR_ID ? `kantoor ${KANTOOR_ID} (service-client, hard gefilterd)` : `demo-account ${DEMO_EMAIL} (sessie-client, RLS)`}, n=${N}, seed=${SEED}`)

  const dataset = KANTOOR_ID
    ? await haalDatasetMetKantoorFilter(KANTOOR_ID)
    : await haalTransactiesVoorVerkenner(await sessieClient(), MET_COORDINATEN_KOLOMMEN, { metCoordinaten: true })

  if (dataset.length === 0) throw new Error('geen transacties gevonden — kantoor leeg of filter te streng')
  log(`dataset: ${dataset.length} niet-uitgesloten transacties`)

  const maxDatum = dataset.reduce((m, r) => (r.verkoopdatum && r.verkoopdatum > m ? r.verkoopdatum : m), '0000-00-00')
  const grensDatum = maandenTerug(maxDatum, RECENT_MAANDEN)
  const kandidatenVoorSteekproef = dataset.filter(
    r =>
      r.verkoopprijs != null &&
      r.woonoppervlak_m2 != null &&
      r.bouwjaar != null &&
      r.woningtype_groep != null &&
      r.verkoopdatum != null &&
      r.verkoopdatum >= grensDatum &&
      r.verkoopdatum <= maxDatum &&
      r.lat != null &&
      r.lng != null,
  )
  log(`recent (${RECENT_MAANDEN} mnd, t/m ${maxDatum}), met coördinaten: ${kandidatenVoorSteekproef.length}`)
  const n = Math.min(N, kandidatenVoorSteekproef.length)
  if (n < N) log(`let op: minder dan ${N} geschikte woningen (${n}), steekproef verkleind`)
  const subjecten = seedSteekproef(kandidatenVoorSteekproef, n, SEED)

  const metingen = []
  const zonderWaarde = []
  const lekken = []

  for (const s of subjecten) {
    const peildatum = dagVoor(s.verkoopdatum)
    const verleden = dataset.filter(t => t.id !== s.id && t.verkoopdatum && t.verkoopdatum < peildatum)
    const subject = {
      id: s.id,
      woningtype_groep: s.woningtype_groep,
      oppervlak_m2: s.woonoppervlak_m2,
      bouwjaar: s.bouwjaar,
      lat: s.lat,
      lng: s.lng,
      plaats: s.plaats,
      garage: s.garage,
      tuin: s.tuin,
      energielabel: s.energielabel,
      verkoopprijs: s.verkoopprijs,
      verkoopdatum: s.verkoopdatum,
    }
    const { meting, lekken: subjectLekken } = meetEen(subject, verleden, { peildatum, regionaal: verleden })
    lekken.push(...subjectLekken)
    if (meting === null) {
      zonderWaarde.push({ id: s.id, groep: s.woningtype_groep })
      continue
    }
    metingen.push(meting)
  }

  if (lekken.length > 0) {
    throw new Error(`peildatum-lek: ${lekken.length} referentie(s) op of ná de peildatum, bv. ${lekken[0]} — dit hoort nooit voor te komen`)
  }

  const totaal = vatSamen('totaal', metingen, zonderWaarde)
  const perGroep = perTypegroep(metingen, zonderWaarde)
  const trede = perTrede(metingen)

  printTabel('Totaal', [totaal])
  printTabel('Per typegroep', perGroep)
  printTabel('Per verbredingstrede', trede)

  const mediaanHaalt = totaal.mediaanFoutPct != null && totaal.mediaanFoutPct <= DEMO_LAT_MEDIAAN_FOUT_PCT
  const bandHaalt = totaal.binnenBandPct != null && totaal.binnenBandPct >= DEMO_LAT_BINNEN_BAND_PCT
  log(`\ndemo-lat: mediaan fout ≤ ${DEMO_LAT_MEDIAAN_FOUT_PCT} % → ${mediaanHaalt ? 'gehaald' : 'NIET gehaald'} (${totaal.mediaanFoutPct} %)`)
  log(`demo-lat: ≥ ${DEMO_LAT_BINNEN_BAND_PCT} % binnen band → ${bandHaalt ? 'gehaald' : 'NIET gehaald'} (${totaal.binnenBandPct} %)`)

  const vandaag = new Date().toISOString().slice(0, 10)
  const md = `# Backtest waardering v2

> Item 4.8 (\`docs/roadmap.md\` § 3.3 + § 5 Fase 4). Elke steekproefwoning wordt gewaardeerd met peildatum = de dag vóór haar eigen verkoopdatum, uitsluitend met transacties van daarvóór — precies zoals de synthetische vitest-vangrail (\`lib/waardering.backtest.test.ts\`), maar dan op ${KANTOOR_ID ? 'een specifiek kantoor' : 'de demo-fixture'}. Meetlogica gedeeld met de test via \`lib/backtest.ts\`. Dit rapport wordt bij elke run overschreven; in item 5.5 draait hetzelfde script opnieuw op echte i4housing-data.

- **Datum:** ${vandaag}
- **Dataset:** ${KANTOOR_ID ? `kantoor \`${KANTOOR_ID}\`` : `demo-account \`${DEMO_EMAIL}\` (kantoor Demo Makelaardij, RLS)`} — ${dataset.length} niet-uitgesloten transacties, waarvan ${kandidatenVoorSteekproef.length} recent (${RECENT_MAANDEN} maanden t/m ${maxDatum}) met coördinaten
- **N (steekproef):** ${n}${n < N ? ` (gevraagd: ${N})` : ''}
- **Seed:** ${SEED}
- **Commando:** \`${COMMANDO}\`

## Totaal

${markdownTabel([totaal])}

## Per typegroep

${markdownTabel(perGroep)}

## Per verbredingstrede

${markdownTabel(trede)}

## Interpretatie (makelaarstaal)

${interpretatie(totaal, mediaanHaalt, bandHaalt, perGroep, trede)}

## Vergelijking met de demo-lat en de synthetische backtest

| | Mediaan fout | Binnen band |
|---|---|---|
| Demo-lat (roadmap § 3.3) | ≤ ${DEMO_LAT_MEDIAAN_FOUT_PCT} % | ≥ ${DEMO_LAT_BINNEN_BAND_PCT} % |
| Synthetisch (17 sep 2026, 400 woningen, \`lib/waardering.backtest.test.ts\`) | ${SYNTHETISCH_REFERENTIE.mediaanFoutPct} % | ${SYNTHETISCH_REFERENTIE.binnenBandPct} % |
| **Dit rapport (${KANTOOR_ID ? 'kantoor ' + KANTOOR_ID : 'demo-fixture'})** | **${totaal.mediaanFoutPct} %** | **${totaal.binnenBandPct} %** |

${mediaanHaalt && bandHaalt ? 'Beide demo-lat-doelen zijn gehaald.' : 'Niet elk doel is gehaald — zie de interpretatie hierboven voor het concrete voorstel. `lib/waardering.ts` is door dit script niet gewijzigd; een aanpassing aan de bandregels is een besluit voor de orchestrator.'}
`

  const uitpad = path.join(PROJECT_ROOT, 'docs', 'waardering-backtest.md')
  fs.writeFileSync(uitpad, md)
  log(`\nrapport geschreven: ${path.relative(PROJECT_ROOT, uitpad)}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
