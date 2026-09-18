/**
 * Controleert of de live database het schema heeft dat de code verwacht
 * (item 2.1, docs/roadmap.md § Fase 2 — vangrail tegen een "vergeten
 * migratie" zoals bij de 16-sep-batch, zie supabase/schema-baseline.sql).
 * Alleen-lezend: elke check is een `select(<expliciete kolomlijst>).limit(0)`
 * — PostgREST geeft een fout bij een onbekende kolom of tabel, dus dit
 * ontdekt een afwijking zonder zelf iets in de database te wijzigen.
 *
 *   node --env-file=.env.local scripts/controleer-schema.mjs
 *
 * Twee soorten checks:
 * 1. EXPECTED_COLUMNS — kolommen die moeten bestaan (transacties, de view
 *    transacties_met_coordinaten, imports, objecten).
 * 2. VERVALLEN_KOLOMMEN — kolommen die NIET meer selecteerbaar mogen zijn
 *    (objecten.pitch_uitslag, vervallen in migratie
 *    20260917_transacties_pijplijn.sql, item 2.1).
 *
 * Exit 1 bij een afwijking, met een duidelijke melding per tabel. Bij een
 * volgende schema-migratie: EXPECTED_COLUMNS/VERVALLEN_KOLOMMEN hieronder
 * bijwerken — dat is de enige plek die hoeft te veranderen.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY ontbreken.')
  console.error('   Draai dit script met: node --env-file=.env.local scripts/controleer-schema.mjs')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const BASIS_TRANSACTIE_KOLOMMEN = [
  'id', 'kantoor_id', 'adres', 'postcode', 'plaats', 'wijk', 'buurt', 'geo',
  'verkoopprijs', 'vraagprijs', 'verkoopdatum', 'looptijd_dagen', 'woningtype',
  'woonoppervlak_m2', 'perceel_m2', 'inhoud_m3', 'bouwjaar', 'energielabel',
  'kamers', 'garage', 'tuin', 'buitenruimte', 'eigen_verkoop', 'verkopend_kantoor',
  'created_at',
]

// Nieuwe pijplijn-kolommen op transacties, item 2.1 (§ 3.1 van docs/roadmap.md,
// migratie supabase/migrations/20260917_transacties_pijplijn.sql).
const PIJPLIJN_KOLOMMEN = [
  'bron', 'import_id', 'adres_sleutel', 'huisnummer', 'toevoeging',
  'woningtype_groep', 'woningtype_sub', 'geocode_status', 'uitgesloten_reden',
  'aankopend_kantoor', 'verkopend_kantoor_norm', 'prijs_m2',
]

const EXPECTED_COLUMNS = {
  transacties: [...BASIS_TRANSACTIE_KOLOMMEN, ...PIJPLIJN_KOLOMMEN],
  // view — dezelfde kolommen plus de berekende lat/lng (zie CLAUDE.md § Datamodel:
  // altijd deze view gebruiken voor coördinaten, nooit de EWKB-hex uit transacties.geo).
  transacties_met_coordinaten: [...BASIS_TRANSACTIE_KOLOMMEN, 'lat', 'lng', ...PIJPLIJN_KOLOMMEN],
  imports: [
    'id', 'kantoor_id', 'bron', 'bestandsnaam', 'aantal_rijen', 'aantal_nieuw',
    'aantal_bijgewerkt', 'aantal_uitgesloten', 'kwaliteitsrapport_json',
    'snapshot_json', 'status', 'gestart_op', 'klaar_op', 'teruggedraaid_op',
  ],
  objecten: [
    'id', 'kantoor_id', 'makelaar_id', 'address', 'input_json', 'outputs_json',
    'outputs_json_en', 'status', 'created_at', 'notitie', 'lat', 'lng', 'fase',
    'waardering_json', 'usps_structuur',
    // item 3.1, migratie 20260917_object_content_status.sql
    'content_status', 'content_gegenereerd_op', 'content_bezig_sinds',
    // item 3.4, migratie 20260917_object_fase_sinds.sql
    'fase_sinds',
  ],
}

// Kolommen die sinds item 2.1 NIET meer mogen bestaan — omgekeerde check
// (we verwáchten hier juist een fout).
const VERVALLEN_KOLOMMEN = {
  objecten: ['pitch_uitslag'],
}

let afwijkingen = 0

async function controleerAanwezig(tabel, kolommen) {
  const { error } = await supabase.from(tabel).select(kolommen.join(',')).limit(0)
  if (error) {
    afwijkingen++
    console.error(`❌ ${tabel}: ${error.message}`)
    return
  }
  console.log(`✅ ${tabel}: alle ${kolommen.length} verwachte kolommen aanwezig`)
}

async function controleerVervallen(tabel, kolommen) {
  for (const kolom of kolommen) {
    const { error } = await supabase.from(tabel).select(kolom).limit(0)
    if (!error) {
      afwijkingen++
      console.error(`❌ ${tabel}.${kolom}: nog steeds selecteerbaar — hoort verwijderd te zijn (item 2.1)`)
    } else {
      console.log(`✅ ${tabel}.${kolom}: niet meer selecteerbaar (correct)`)
    }
  }
}

for (const [tabel, kolommen] of Object.entries(EXPECTED_COLUMNS)) {
  await controleerAanwezig(tabel, kolommen)
}

for (const [tabel, kolommen] of Object.entries(VERVALLEN_KOLOMMEN)) {
  await controleerVervallen(tabel, kolommen)
}

if (afwijkingen > 0) {
  console.error(`\n${afwijkingen} afwijking(en) — het live schema komt niet overeen met supabase/schema-baseline.sql.`)
  process.exit(1)
}

console.log('\n✅ Schema komt overeen met de verwachte staat.')
