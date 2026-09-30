import sharp from 'sharp'

/**
 * Roadmap-item 14.3: een gestagede foto mag nooit voor een echte foto
 * doorgaan (EU AI Act art. 50 lid 4, van kracht sinds 2 aug 2026 — transparantie
 * bij gemanipuleerd beeld — en misleiding richting kopers onder de Reclamecode/
 * NVM-gedragsregels). Dit label wordt server-side in de foto gebakken, zodat
 * elke download altijd gelabeld is, ongeacht waar de foto daarna terechtkomt.
 */
export const STAGING_LABEL_TEKST = 'Virtueel ingericht'

export interface LabelAfmetingen {
  breedte: number
  hoogte: number
  badgeBreedte: number
  badgeHoogte: number
  fontSize: number
  x: number
  y: number
}

/**
 * Berekent afmetingen en positie van het label, schalend met de beeldbreedte
 * (klein maar leesbaar op zowel een lichte als een donkere foto, minimaal
 * leesbaar vanaf 800 px breed). Rechtsonder in de foto — pure functie, geen
 * I/O, dus los van sharp testbaar.
 */
export function berekenLabelAfmetingen(breedte: number, hoogte: number): LabelAfmetingen {
  const marge = Math.max(12, Math.round(breedte * 0.02))
  const badgeHoogte = Math.max(24, Math.round(breedte * 0.045))
  const fontSize = Math.round(badgeHoogte * 0.42)
  const paddingX = Math.round(badgeHoogte * 0.65)
  // Ruwe breedte-schatting voor bold sans-serif tekst (~0,6 em per teken) —
  // exact genoeg voor een pil die toch al ruimte overhoudt links/rechts van
  // de tekst; geen canvas-meting nodig voor een label van vaste tekst.
  const tekstBreedte = Math.round(STAGING_LABEL_TEKST.length * fontSize * 0.6)
  const badgeBreedte = Math.max(
    badgeHoogte * 2,
    Math.min(breedte - marge * 2, tekstBreedte + paddingX * 2),
  )

  return {
    breedte,
    hoogte,
    badgeBreedte,
    badgeHoogte,
    fontSize,
    x: breedte - badgeBreedte - marge,
    y: hoogte - badgeHoogte - marge,
  }
}

/**
 * Bouwt de SVG-overlay voor het label. Puur (geen I/O) en dus los van sharp
 * testbaar. Gebruikt bewust een generieke `sans-serif` font-family — een
 * specifiek systeemfont kan ontbreken op Vercel's Linux-runtime, "sans-serif"
 * valt altijd terug op een aanwezig font.
 */
export function bouwLabelSvg(breedte: number, hoogte: number): string {
  const { badgeBreedte, badgeHoogte, fontSize, x, y } = berekenLabelAfmetingen(breedte, hoogte)
  const tekstX = x + badgeBreedte / 2
  const tekstY = y + badgeHoogte / 2 + fontSize * 0.35

  return `<svg width="${breedte}" height="${hoogte}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x}" y="${y}" rx="${badgeHoogte / 2}" ry="${badgeHoogte / 2}"
      width="${badgeBreedte}" height="${badgeHoogte}" fill="black" fill-opacity="0.62" />
    <text x="${tekstX}" y="${tekstY}"
      font-family="sans-serif" font-size="${fontSize}" font-weight="700"
      fill="white" text-anchor="middle">${STAGING_LABEL_TEKST}</text>
  </svg>`
}

/**
 * Labelt een gestagede foto server-side met de "Virtueel ingericht"-pil
 * rechtsonder en levert een jpeg terug. ⚠️ CLAUDE.md-les: nooit `.extract()`
 * direct na `.composite()` in één keten — hier niet van toepassing, dit pad
 * gaat altijd via `.toBuffer()`.
 */
export async function labelAlsVirtueleInrichting(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer)
  const meta = await image.metadata()
  const breedte = meta.width ?? 1024
  const hoogte = meta.height ?? 768
  const svg = bouwLabelSvg(breedte, hoogte)

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer()
}
