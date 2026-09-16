/**
 * Vult de schrijfstijl van i4 Housing aan met hun eigen materiaal: extra woningteksten,
 * een echte brochure (PDF → tekst via de Files API, zelfde pad als de app zelf) en de
 * vaste slottekst met kantoorgegevens. Draait standaard als dry-run.
 *
 *   node --env-file=.env.local scripts/seed-i4housing-content.mjs
 *   node --env-file=.env.local scripts/seed-i4housing-content.mjs --write
 */
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SCHRIJVEN = process.argv.includes('--write')
const KANTOOR_EMAIL = 'quinn.berkouwer@icloud.com'

const WONINGEN = [
  'https://www.i4housing.nl/woning/wassenaar-jonkerlaan-51/',
  'https://www.i4housing.nl/woning/s-gravenhage-frankenstraat-34/',
  'https://www.i4housing.nl/woning/wassenaar-van-polanenpark-183/',
  'https://www.i4housing.nl/woning/wassenaar-generaal-winkelmanlaan-50/',
  'https://www.i4housing.nl/woning/s-gravenhage-burgemeester-patijnlaan-430/',
  'https://www.i4housing.nl/woning/wassenaar-meijendelseweg-14/',
]

/** Vaste afsluiting onder elke brochure — kantoorgegevens zoals ze die zelf voeren. */
const SLOT_TEKST = `Enthousiast over deze woning? Neem contact op met ons kantoor. Wij plannen graag een afspraak met je in.

i4 Housing · NVM-makelaar
Molenplein 2, 2242 HV Wassenaar
070 - 511 75 71 · info@i4housing.nl · i4housing.nl`

const log = (...a) => console.log(...a)
const kop = (t) => log(`\n── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

/** Woningomschrijving in hun eigen 4SALE-sjabloon, afgekapt op een hele zin. */
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
    .slice(0, 2000).replace(/[^.!?]*$/, '').trim()
}

/** Eerste brochure-PDF die aan een woningpagina hangt. */
async function zoekBrochure(url) {
  const html = await (await fetch(url)).text()
  const pdf = html.match(/https?:\/\/[^"'\s]+\.pdf/i)
  if (!pdf) throw new Error('geen brochure gevonden')
  return pdf[0]
}

/** PDF → platte tekst via de Files API — hetzelfde pad als app/api/huisstijl/extract. */
async function brochureNaarTekst(pdfUrl) {
  const bytes = await (await fetch(pdfUrl)).arrayBuffer()
  const client = new Anthropic()
  const file = await client.beta.files.upload({
    file: new File([bytes], 'brochure.pdf', { type: 'application/pdf' }),
  })
  const antwoord = await client.beta.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system: 'Je extraheert platte tekst uit een document. Geef uitsluitend de lopende tekst terug — geen opmaak, geen koppen-markering, geen inleiding of commentaar.',
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'file', file_id: file.id } },
        { type: 'text', text: 'Geef de volledige lopende tekst uit deze woningbrochure terug als platte tekst.' },
      ],
    }],
    betas: ['files-api-2025-04-14'],
  })
  const tekst = antwoord.content?.[0]?.type === 'text' ? antwoord.content[0].text.trim() : ''
  if (!tekst) throw new Error('geen tekst uit de PDF')
  return tekst.slice(0, 2000).replace(/[^.!?]*$/, '').trim()
}

async function main() {
  kop('1. Kantoor')
  const { data: makelaar } = await supabase.from('makelaars').select('kantoor_id').eq('email', KANTOOR_EMAIL).single()
  const { data: kantoor } = await supabase.from('kantoren').select('id, name, huisstijl_json').eq('id', makelaar.kantoor_id).single()
  const huidig = kantoor.huisstijl_json ?? {}
  log(kantoor.name, '·', (huidig.voorbeelden ?? []).length, 'woningteksten,',
    (huidig.brochure_stijl?.voorbeelden ?? []).length, 'brochurevoorbeelden,',
    huidig.brochure_stijl?.slot_tekst ? 'slottekst aanwezig' : 'geen slottekst')

  kop('2. Woningteksten')
  const voorbeelden = []
  for (const url of WONINGEN) {
    if (voorbeelden.length >= 5) break
    try {
      const tekst = await haalWoningtekst(url)
      voorbeelden.push(tekst)
      log(`  ✓ ${url.split('/').filter(Boolean).pop()} — ${tekst.split(/\s+/).length} woorden`)
    } catch (e) {
      log(`  ⚠️ ${url.split('/').filter(Boolean).pop()}: ${e.message}`)
    }
  }

  kop('3. Brochure')
  let brochure = null
  for (const url of WONINGEN) {
    try {
      const pdf = await zoekBrochure(url)
      brochure = await brochureNaarTekst(pdf)
      log(`  ✓ ${pdf.split('/').pop()} — ${brochure.split(/\s+/).length} woorden tekst`)
      break
    } catch (e) {
      log(`  ⚠️ ${url.split('/').filter(Boolean).pop()}: ${e.message}`)
    }
  }

  kop('4. Wegschrijven')
  const nieuw = {
    ...huidig,
    voorbeelden,
    brochure_stijl: {
      ...(huidig.brochure_stijl ?? {}),
      voorbeelden: brochure ? [brochure] : (huidig.brochure_stijl?.voorbeelden ?? []),
      slot_tekst: SLOT_TEKST,
    },
  }

  if (!SCHRIJVEN) {
    log('DRY-RUN — zou schrijven:')
    log(`  voorbeelden: ${nieuw.voorbeelden.length}`)
    log(`  brochure_stijl.voorbeelden: ${nieuw.brochure_stijl.voorbeelden.length}`)
    log(`  slot_tekst:\n${SLOT_TEKST.split('\n').map((r) => '    ' + r).join('\n')}`)
    log('\nDraai opnieuw met --write om dit door te voeren.')
    return
  }

  const { error } = await supabase.from('kantoren').update({ huisstijl_json: nieuw }).eq('id', kantoor.id)
  if (error) throw new Error(error.message)

  const { data: na } = await supabase.from('kantoren').select('huisstijl_json').eq('id', kantoor.id).single()
  kop('5. Controle achteraf')
  log('woningteksten          :', na.huisstijl_json.voorbeelden.length)
  log('brochurevoorbeelden    :', na.huisstijl_json.brochure_stijl.voorbeelden.length)
  log('slottekst              :', na.huisstijl_json.brochure_stijl.slot_tekst ? '✅' : '❌')
  log('schrijftoon/slogan     :', na.huisstijl_json.schrijftoon, '·', na.huisstijl_json.slogan)
}

main().catch((e) => {
  console.error('\n❌', e.message)
  process.exit(1)
})
