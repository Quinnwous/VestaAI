/**
 * Pure parse-/vergelijklogica voor scripts/check-env.mjs (item "env-check").
 *
 * `.env.example` is de enige bron van waarheid voor welke sleutels verplicht
 * of optioneel zijn: groepen staan erin als `# == <naam> ==`-kopcommentaar,
 * gevolgd door `SLEUTEL=`-regels tot de volgende kop. Geen tweede,
 * hardgecodeerde lijst hier — wijzig je een groep, dan hoeft alleen
 * `.env.example` bij.
 */

/**
 * @param {string} tekst inhoud van .env.example
 * @returns {Record<string, string[]>} groepsnaam (zoals in de kop, bv. "verplicht") → sleutels
 */
export function parseEnvExampleGroepen(tekst) {
  const groepen = {}
  let huidige = null
  for (const regel of tekst.split('\n')) {
    const kopMatch = regel.match(/^#\s*==\s*(.+?)\s*==\s*$/)
    if (kopMatch) {
      huidige = kopMatch[1].trim()
      if (!groepen[huidige]) groepen[huidige] = []
      continue
    }
    if (!huidige) continue
    const sleutelMatch = regel.match(/^([A-Z0-9_]+)=/)
    if (sleutelMatch) groepen[huidige].push(sleutelMatch[1])
  }
  return groepen
}

/**
 * Kleine, bewust beperkte .env-parser (geen dependency) voor .env.local.
 * Ondersteunt `SLEUTEL=waarde`, optionele quotes, `#`-commentaarregels en
 * lege regels. Geen multi-line waarden of `export`-prefix — die komen in dit
 * project niet voor.
 * @param {string} tekst
 * @returns {Record<string, string>}
 */
export function parseDotEnv(tekst) {
  const resultaat = {}
  for (const regel of tekst.split('\n')) {
    const schoon = regel.trim()
    if (!schoon || schoon.startsWith('#')) continue
    const match = schoon.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    let [, sleutel, waarde] = match
    waarde = waarde.trim()
    if (
      (waarde.startsWith('"') && waarde.endsWith('"')) ||
      (waarde.startsWith("'") && waarde.endsWith("'"))
    ) {
      waarde = waarde.slice(1, -1)
    }
    resultaat[sleutel] = waarde
  }
  return resultaat
}

/**
 * Vergelijkt welke sleutels uit de "verplicht"- en "optioneel"-groep
 * ontbreken of leeg zijn in `env`. Groepen buiten die twee (bv. "alleen
 * scripts/DoD/e2e") tellen hier bewust niet mee — die zijn niet nodig om de
 * app zelf te draaien.
 * @param {{ groepen: Record<string, string[]>, env: Record<string, string | undefined> }} input
 */
export function controleerEnv({ groepen, env }) {
  const ontbreektIn = (sleutels) =>
    (sleutels ?? []).filter((sleutel) => !env[sleutel] || env[sleutel].trim() === '')

  return {
    ontbrekendVerplicht: ontbreektIn(groepen['verplicht']),
    ontbrekendOptioneel: ontbreektIn(groepen['optioneel']),
  }
}
