// Guard (item 7.1): de MapLibre-worker wordt zelf gehost in public/maplibre-gl/
// (nodig onder onze strikte CSP, zie docs/besluiten.md 23-24 sep 2026). Dat is
// een statische kopie uit node_modules/maplibre-gl/dist/ — bij een versiebump
// van maplibre-gl moet hij mee, anders draaien hoofdthread en worker op
// verschillende versies. Deze test faalt dan met de kopieeropdracht erbij.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const BESTANDEN = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

describe('zelf-gehoste MapLibre-worker', () => {
  it.each(BESTANDEN)('public/maplibre-gl/%s is gelijk aan de geïnstalleerde versie', (bestand) => {
    const kopie = readFileSync(path.resolve('public/maplibre-gl', bestand))
    const bron = readFileSync(path.resolve('node_modules/maplibre-gl/dist', bestand))
    expect(
      kopie.equals(bron),
      `Verouderd — draai: cp node_modules/maplibre-gl/dist/${bestand} public/maplibre-gl/`,
    ).toBe(true)
  })
})
