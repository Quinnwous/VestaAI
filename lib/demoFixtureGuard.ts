/**
 * Pure vangrail-functies voor scripts/seed-demo-kantoor.mjs (item 2.3, zie
 * docs/roadmap.md § 4 "Vangrails productiedatabase"). Los van Supabase/React
 * zodat ze zonder database-verbinding getest kunnen worden — zie
 * scripts/seed-demo-kantoor.test.ts.
 *
 * Twee taken:
 * 1. `beoordeelDemoKantoor()` — weigert het script als er al een kantoor met
 *    de gevraagde naam bestaat zónder `instellingen_json.demo === true`, zodat
 *    een naamsbotsing met een echt kantoor (bv. per ongeluk "Demo Makelaardij"
 *    hernoemd voor een klant) het script nooit laat schrijven.
 * 2. `bouwResetFilter()` — het enige punt waar het `--reset`-delete-filter
 *    gebouwd wordt, met een expliciet al-geverifieerd kantoor-id als enige
 *    invoer — nooit een naam, env-var of "huidig actief kantoor" uit bredere
 *    state, zodat een reset nooit per ongeluk een ander kantoor_id raakt.
 */

export type DemoKantoorRij = {
  id: string
  name: string
  instellingen_json: { demo?: boolean } | null
}

export type BeoordelingResultaat =
  | { ok: true; actie: 'aanmaken'; kantoorId: null }
  | { ok: true; actie: 'hergebruiken'; kantoorId: string }
  | { ok: false; reden: string }

/**
 * Bepaalt of het seed-script veilig verder mag met een kantoor genaamd `naam`.
 * - Geen bestaand kantoor met die naam → aanmaken toegestaan.
 * - Bestaand kantoor met `instellingen_json.demo === true` → hergebruiken
 *   (idempotent herdraaien van het script).
 * - Bestaand kantoor met die naam maar zónder `demo === true` → geweigerd.
 */
export function beoordeelDemoKantoor(bestaand: DemoKantoorRij | null, naam: string): BeoordelingResultaat {
  if (!bestaand) return { ok: true, actie: 'aanmaken', kantoorId: null }
  if (bestaand.instellingen_json?.demo === true) return { ok: true, actie: 'hergebruiken', kantoorId: bestaand.id }
  return {
    ok: false,
    reden: `Kantoor "${naam}" bestaat al (id ${bestaand.id}) zonder instellingen_json.demo === true — geweigerd, om nooit per ongeluk een echt kantoor te raken.`,
  }
}

/**
 * Bouwt het exacte delete-filter voor `--reset`. Neemt bewust uitsluitend een
 * al door `beoordeelDemoKantoor()` geverifieerd kantoor-id aan (geen naam,
 * geen "eerste kantoor met demo=true" query hier) — dit is de enige plek in
 * het script die een delete-filter samenstelt, zodat er geen tweede pad is
 * waar per ongeluk het verkeerde kantoor_id in terecht kan komen.
 */
export function bouwResetFilter(geverifieerdDemoKantoorId: string): { kantoor_id: string } {
  if (!geverifieerdDemoKantoorId || typeof geverifieerdDemoKantoorId !== 'string') {
    throw new Error('bouwResetFilter vereist een geverifieerd, niet-leeg demo-kantoor-id')
  }
  return { kantoor_id: geverifieerdDemoKantoorId }
}
