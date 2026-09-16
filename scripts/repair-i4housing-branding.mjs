/**
 * Zet de huisstijl van i4housing goed in de database: kleuren, lettertype, vormtaal,
 * logo, favicon en de achtergrondfoto's. Draait standaard als dry-run — pas met
 * `--write` schrijft hij echt.
 *
 *   node --env-file=.env.local scripts/repair-i4housing-branding.mjs
 *   node --env-file=.env.local scripts/repair-i4housing-branding.mjs --write
 *
 * Merkwaarden komen uit i4housing's eigen theme-CSS (i4housing.nl), niet uit een schatting.
 */
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SCHRIJVEN = process.argv.includes('--write')
const KANTOOR_EMAIL = 'quinn.berkouwer@icloud.com'
const BUCKET = 'kantoor-assets'

const MERK = {
  primaire_kleur: '#0080C8',
  accent_kleur: '#C61E45',
  lettertype: 'nunito',
  vorm: 'strak',
  telefoon: '070-5117571',
  email: 'info@i4housing.nl',
}

/**
 * Hun eigen schrijfsjabloon, letterlijk afgeleid van drie woningpagina's op i4housing.nl.
 * Voedt de contentgeneratie zodat een nieuwe woningtekst er direct uitziet als de hunne.
 */
const STIJLPROFIEL = `Vaste opbouw van elke woningtekst:
1. Openingslabel op een eigen regel in hoofdletters: "4SALE!" bij verkoop of "4RENT!" bij verhuur, gevolgd door één samenvattende introzin over type woning, sfeer en locatie.
2. Tussenkopjes in hoofdletters, elk op een eigen regel, in deze volgorde: WOONCOMFORT, BUITENLEVEN, LOCATIE, GOED OM TE WETEN. De keuken krijgt binnen WOONCOMFORT een eigen alinea.
3. Onder GOED OM TE WETEN staan korte bulletpoints die beginnen met "- " (bouwjaar, oppervlakte, energielabel, oplevering, bijzonderheden).
4. Afsluiting woordelijk: "Enthousiast over deze woning? Neem contact op met ons kantoor. Wij plannen graag een afspraak met je in."

Toon: informeel (je/jouw, nooit u), warm en sfeervol, beschrijvend met langere zinnen. Terugkerende woordkeus: heerlijk, royale, sfeervol, fijne plek, stijlvol, verrassend ruime, warm thuisgevoel. Geen stapeling van superlatieven en geen uitroeptekens behalve in het 4SALE!/4RENT!-label. Lengte van de Nederlandse tekst: 450-500 woorden.`

const VOORBEELD_URLS = [
  'https://www.i4housing.nl/woning/wassenaar-jonkerlaan-51/',
  'https://www.i4housing.nl/woning/s-gravenhage-frankenstraat-34/',
  'https://www.i4housing.nl/woning/wassenaar-van-polanenpark-183/',
]

const FOTOS = {
  achtergrond_url: 'https://www.i4housing.nl/wp-content/uploads/2026/06/i4h-mei-23-scaled.jpg',
  achtergrond_secundair_url: 'https://www.i4housing.nl/wp-content/uploads/2026/01/i4h-dec-02-scaled-e1767955960733.jpg',
}

const log = (...a) => console.log(...a)
const kop = (t) => log(`\n── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function zoekKantoor() {
  const { data: makelaar, error } = await supabase
    .from('makelaars')
    .select('id, email, kantoor_id, role')
    .eq('email', KANTOOR_EMAIL)
    .maybeSingle()
  if (error) throw new Error(`makelaars-lookup mislukt: ${error.message}`)
  if (!makelaar) {
    const { data: alle } = await supabase.from('makelaars').select('email, kantoor_id, role')
    log('⚠️  Geen makelaar met', KANTOOR_EMAIL, '— gevonden accounts:', alle)
    throw new Error('kantoor niet te bepalen')
  }

  const { data: kantoor, error: kFout } = await supabase
    .from('kantoren')
    .select('id, name, logo_url, huisstijl_json')
    .eq('id', makelaar.kantoor_id)
    .single()
  if (kFout) throw new Error(`kantoren-lookup mislukt: ${kFout.message}`)
  return { makelaar, kantoor }
}

async function zorgVoorBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`listBuckets mislukt: ${error.message}`)
  const bestaand = buckets.find((b) => b.name === BUCKET)
  if (bestaand) {
    log(`bucket "${BUCKET}" bestaat al (public: ${bestaand.public})`)
    if (!bestaand.public) {
      if (!SCHRIJVEN) return log('  → zou op publiek gezet worden')
      const { error: uFout } = await supabase.storage.updateBucket(BUCKET, { public: true })
      if (uFout) throw new Error(`bucket publiek maken mislukt: ${uFout.message}`)
      log('  → op publiek gezet')
    }
    return
  }
  if (!SCHRIJVEN) return log(`bucket "${BUCKET}" ONTBREEKT → zou publiek aangemaakt worden`)
  const { error: cFout } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (cFout) throw new Error(`createBucket mislukt: ${cFout.message}`)
  log(`bucket "${BUCKET}" aangemaakt (publiek)`)
}

async function upload(kantoorId, bestandsnaam, bytes, contentType) {
  const pad = `${kantoorId}/${bestandsnaam}`
  if (!SCHRIJVEN) {
    log(`  zou uploaden: ${pad} (${Math.round(bytes.length / 1024)} kB, ${contentType})`)
    return null
  }
  const { error } = await supabase.storage.from(BUCKET).upload(pad, bytes, { contentType, upsert: true })
  if (error) throw new Error(`upload ${pad} mislukt: ${error.message}`)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pad)
  log(`  geüpload: ${pad} → ${data.publicUrl}`)
  return data.publicUrl
}

async function haalFoto(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  const origineel = Buffer.from(await res.arrayBuffer())
  // Webformaat: de bronbestanden zijn 0,5–3,5 MB en worden als watermerk op lage dekking
  // getoond — 900px breed in webp is ruim voldoende en scheelt laadtijd op elke pagina.
  const compact = await sharp(origineel).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  log(`  ${url.split('/').pop()}: ${Math.round(origineel.length / 1024)} kB → ${Math.round(compact.length / 1024)} kB webp`)
  return compact
}

/** Haalt de woningomschrijving van een listingpagina op, in hun eigen sjabloon. */
async function haalWoningtekst(url) {
  const html = await (await fetch(url)).text()
  const schoon = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const treffer = schoon.match(/4(SALE|RENT)!?[\s\S]{200,6000}?Enthousiast over deze woning[^<]*/i)
  if (!treffer) throw new Error('sjabloon niet herkend')
  return treffer[0]
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&euro;/g, '€').replace(/&#8217;/g, "'")
    .split('\n').map((r) => r.trim()).filter(Boolean).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 2000)
    // Het schema staat 2000 tekens toe; afkappen midden in een zin geeft een
    // rommelig stijlvoorbeeld, dus terug tot de laatste afgeronde zin.
    .replace(/[^.!?]*$/, '')
    .trim()
}

async function main() {
  kop('1. Huidige situatie')
  const { makelaar, kantoor } = await zoekKantoor()
  log('makelaar :', makelaar.email, `(rol ${makelaar.role})`)
  log('kantoor  :', kantoor.name, `(${kantoor.id})`)
  log('logo_url :', kantoor.logo_url ?? '(leeg)')
  if (kantoor.logo_url) {
    try {
      const res = await fetch(kantoor.logo_url, { method: 'HEAD' })
      log('           → HTTP', res.status, res.ok ? '(bereikbaar)' : '⚠️ KAPOT — dit is de "?" in de topbar')
    } catch (e) {
      log('           → ⚠️ onbereikbaar:', e.message)
    }
  }
  log('huisstijl_json:', JSON.stringify(kantoor.huisstijl_json, null, 2))

  kop('2. Storage-bucket')
  await zorgVoorBucket()

  kop('3. Assets')
  const assetsMap = path.join(process.cwd(), 'public', 'kantoren', 'i4housing')
  const logoBytes = await readFile(path.join(assetsMap, 'logo.png'))
  const faviconBytes = await readFile(path.join(assetsMap, 'favicon.png'))
  const logoUrl = await upload(kantoor.id, 'logo.png', logoBytes, 'image/png')
  const faviconUrl = await upload(kantoor.id, 'favicon.png', faviconBytes, 'image/png')

  const fotoUrls = {}
  for (const [veld, bron] of Object.entries(FOTOS)) {
    try {
      const bytes = await haalFoto(bron)
      fotoUrls[veld] = await upload(kantoor.id, `${veld.replace(/_url$/, '')}.webp`, bytes, 'image/webp')
    } catch (e) {
      log(`  ⚠️ ${veld} overgeslagen: ${e.message}`)
    }
  }

  kop('4. Schrijfstijl')
  const huidig = kantoor.huisstijl_json ?? {}
  // Alleen seeden als het kantoor nog geen eigen voorbeelden heeft — nooit
  // handmatig ingevoerde stijlvoorbeelden overschrijven.
  let schrijfstijl = {}
  if (Array.isArray(huidig.voorbeelden) && huidig.voorbeelden.filter(Boolean).length) {
    log(`kantoor heeft al ${huidig.voorbeelden.filter(Boolean).length} eigen voorbeeld(en) — overslaan`)
  } else {
    const voorbeelden = []
    for (const url of VOORBEELD_URLS) {
      try {
        const tekst = await haalWoningtekst(url)
        voorbeelden.push(tekst)
        log(`  ${url.split('/').filter(Boolean).pop()}: ${tekst.split(/\s+/).length} woorden`)
      } catch (e) {
        log(`  ⚠️ ${url} overgeslagen: ${e.message}`)
      }
    }
    if (voorbeelden.length) {
      schrijfstijl = {
        schrijftoon: 'informeel',
        slogan: huidig.slogan || 'i4YOU! Jouw makelaar in Wassenaar en omgeving',
        voorbeelden,
        stijlprofiel: STIJLPROFIEL,
      }
      log(`  → ${voorbeelden.length} eigen woningteksten + hun 4SALE-sjabloon als stijlprofiel`)
    }
  }

  kop('5. Wegschrijven')
  const nieuweHuisstijl = {
    ...huidig,
    ...MERK,
    ...schrijfstijl,
    ...(faviconUrl ? { favicon_url: faviconUrl } : {}),
    ...Object.fromEntries(Object.entries(fotoUrls).filter(([, v]) => v)),
  }
  if (!SCHRIJVEN) {
    log('DRY-RUN — zou schrijven:')
    log(JSON.stringify({ logo_url: logoUrl ?? '(na upload)', huisstijl_json: nieuweHuisstijl }, null, 2))
    log('\nDraai opnieuw met --write om dit door te voeren.')
    return
  }

  const { error } = await supabase
    .from('kantoren')
    .update({ logo_url: logoUrl, huisstijl_json: nieuweHuisstijl })
    .eq('id', kantoor.id)
  if (error) throw new Error(`update mislukt: ${error.message}`)

  kop('6. Controle achteraf')
  const { data: na } = await supabase
    .from('kantoren')
    .select('name, logo_url, huisstijl_json')
    .eq('id', kantoor.id)
    .single()
  log(JSON.stringify(na, null, 2))
  const res = await fetch(na.logo_url, { method: 'HEAD' })
  log('\nlogo bereikbaar:', res.status, res.ok ? '✅' : '❌')
}

main().catch((e) => {
  console.error('\n❌', e.message)
  process.exit(1)
})
