import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  STAGING_LABEL_TEKST,
  berekenLabelAfmetingen,
  bouwLabelSvg,
  labelAlsVirtueleInrichting,
} from './stagingLabel'

describe('stagingLabel', () => {
  it('bouwLabelSvg plaatst de pil rechtsonder en bevat de labeltekst', () => {
    const breedte = 1024
    const hoogte = 768
    const svg = bouwLabelSvg(breedte, hoogte)
    expect(svg).toContain(STAGING_LABEL_TEKST)
    expect(svg).toContain('font-family="sans-serif"')

    const { x, y, badgeBreedte, badgeHoogte } = berekenLabelAfmetingen(breedte, hoogte)
    expect(x).toBeGreaterThan(breedte / 2) // in de rechterhelft
    expect(y).toBeGreaterThan(hoogte / 2) // in de onderste helft
    expect(x + badgeBreedte).toBeLessThan(breedte) // blijft binnen de foto
    expect(y + badgeHoogte).toBeLessThan(hoogte)
  })

  it('blijft leesbaar op de minimale breedte van 800 px', () => {
    const { fontSize, badgeHoogte } = berekenLabelAfmetingen(800, 600)
    expect(fontSize).toBeGreaterThanOrEqual(10)
    expect(badgeHoogte).toBeGreaterThanOrEqual(24)
  })

  it('schaalt mee met de beeldbreedte', () => {
    const klein = berekenLabelAfmetingen(800, 600)
    const groot = berekenLabelAfmetingen(2400, 1800)
    expect(groot.badgeHoogte).toBeGreaterThan(klein.badgeHoogte)
    expect(groot.fontSize).toBeGreaterThan(klein.fontSize)
  })

  it('labelAlsVirtueleInrichting levert een geldige jpeg met dezelfde afmetingen als de invoer', async () => {
    const invoer = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 200, b: 200 } },
    })
      .jpeg()
      .toBuffer()

    const uitvoer = await labelAlsVirtueleInrichting(invoer)
    const meta = await sharp(uitvoer).metadata()

    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(400)
    expect(meta.height).toBe(300)
  })

  it('de pixels in de labelhoek wijken echt af van de originele foto', async () => {
    const breedte = 400
    const hoogte = 300
    const invoer = await sharp({
      create: { width: breedte, height: hoogte, channels: 3, background: { r: 200, g: 200, b: 200 } },
    })
      .jpeg()
      .toBuffer()

    const uitvoer = await labelAlsVirtueleInrichting(invoer)
    const { x, y, badgeBreedte, badgeHoogte } = berekenLabelAfmetingen(breedte, hoogte)

    // Steekproefpunt ruim binnen de zwarte pil, weg van de tekst zelf —
    // zodat dit niet afhangt van hoe scherp een specifiek font rendert.
    const puntX = Math.round(x + badgeBreedte * 0.1)
    const puntY = Math.round(y + badgeHoogte / 2)

    const pixelVoor = await sharp(invoer)
      .extract({ left: puntX, top: puntY, width: 1, height: 1 })
      .raw()
      .toBuffer()
    const pixelNa = await sharp(uitvoer)
      .extract({ left: puntX, top: puntY, width: 1, height: 1 })
      .raw()
      .toBuffer()

    expect(Buffer.compare(pixelVoor, pixelNa)).not.toBe(0)
  })
})
