import { describe, it, expect } from 'vitest'
import { ontdubbel } from './ontdubbelen'

type Rij = {
  adres_sleutel: string
  verkoopdatum: string | null
  bron: string
  verkoopprijs: number | null
  woonoppervlak_m2: number | null
  energielabel: string | null
}

function rij(overrides: Partial<Rij>): Rij {
  return {
    adres_sleutel: '2242ab|12|',
    verkoopdatum: '2026-03-01',
    bron: 'realworks',
    verkoopprijs: 450_000,
    woonoppervlak_m2: 120,
    energielabel: null,
    ...overrides,
  }
}

describe('ontdubbel', () => {
  it('laat unieke rijen van verschillende bronnen ongemoeid', () => {
    const rijen = [
      rij({ adres_sleutel: 'a', bron: 'realworks' }),
      rij({ adres_sleutel: 'b', bron: 'brainbay' }),
    ]
    const { rijen: uitkomst, samengevoegd } = ontdubbel(rijen)
    expect(uitkomst).toHaveLength(2)
    expect(samengevoegd).toBe(0)
  })

  it('voegt Realworks en Brainbay samen bij dezelfde sleutel + exact dezelfde datum', () => {
    const realworks = rij({ bron: 'realworks', verkoopprijs: 450_000, energielabel: null })
    const brainbay = rij({ bron: 'brainbay', verkoopprijs: 449_000, energielabel: 'A' })
    const { rijen: uitkomst, samengevoegd, voorbeelden } = ontdubbel([realworks, brainbay])

    expect(samengevoegd).toBe(1)
    expect(uitkomst).toHaveLength(1)
    // Realworks wint bij een conflict (verkoopprijs staat in beide).
    expect(uitkomst[0].verkoopprijs).toBe(450_000)
    // Ontbrekend Realworks-veld wordt aangevuld uit Brainbay.
    expect(uitkomst[0].energielabel).toBe('A')
    expect(voorbeelden).toHaveLength(1)
    expect(voorbeelden[0].aangevuldeVelden).toContain('energielabel')
  })

  it('voegt samen bij een datumverschil binnen 90 dagen', () => {
    const realworks = rij({ bron: 'realworks', verkoopdatum: '2026-03-01' })
    const brainbay = rij({ bron: 'brainbay', verkoopdatum: '2026-01-15' }) // 45 dagen eerder
    const { rijen: uitkomst, samengevoegd } = ontdubbel([realworks, brainbay])
    expect(samengevoegd).toBe(1)
    expect(uitkomst).toHaveLength(1)
  })

  it('voegt NIET samen bij een datumverschil groter dan 90 dagen', () => {
    const realworks = rij({ bron: 'realworks', verkoopdatum: '2026-03-01' })
    const brainbay = rij({ bron: 'brainbay', verkoopdatum: '2025-11-01' }) // > 90 dagen eerder
    const { rijen: uitkomst, samengevoegd } = ontdubbel([realworks, brainbay])
    expect(samengevoegd).toBe(0)
    expect(uitkomst).toHaveLength(2)
  })

  it('koppelt aan de dichtstbijzijnde Brainbay-datum als er meerdere kandidaten zijn', () => {
    const realworks = rij({ bron: 'realworks', verkoopdatum: '2026-03-01' })
    const ver = rij({ bron: 'brainbay', verkoopdatum: '2026-01-15', energielabel: 'C' }) // 45 dagen
    const dichtbij = rij({ bron: 'brainbay', verkoopdatum: '2026-02-25', energielabel: 'B' }) // 4 dagen
    const { rijen: uitkomst, samengevoegd } = ontdubbel([realworks, ver, dichtbij])
    expect(samengevoegd).toBe(1)
    // De niet-gekozen Brainbay-rij (ver) blijft als aparte rij bestaan.
    expect(uitkomst).toHaveLength(2)
    const gemerged = uitkomst.find(r => r.bron === 'realworks')!
    expect(gemerged.energielabel).toBe('B')
  })

  it('dedupliceert binnen één bron op exacte sleutel+datum: laatste wint', () => {
    const eerste = rij({ bron: 'brainbay', verkoopprijs: 400_000 })
    const laatste = rij({ bron: 'brainbay', verkoopprijs: 410_000 })
    const { rijen: uitkomst } = ontdubbel([eerste, laatste])
    expect(uitkomst).toHaveLength(1)
    expect(uitkomst[0].verkoopprijs).toBe(410_000)
  })

  it('laat rijen zonder verkoopdatum met rust (geen dedupsleutel mogelijk)', () => {
    const a = rij({ bron: 'brainbay', verkoopdatum: null })
    const b = rij({ bron: 'brainbay', verkoopdatum: null })
    const { rijen: uitkomst } = ontdubbel([a, b])
    expect(uitkomst).toHaveLength(2)
  })

  it('laat andere bronnen (handmatig/fixture) ongemoeid door de cross-bron-koppeling', () => {
    const handmatig = rij({ bron: 'handmatig' })
    const realworks = rij({ bron: 'realworks' })
    const { rijen: uitkomst, samengevoegd } = ontdubbel([handmatig, realworks])
    expect(samengevoegd).toBe(0)
    expect(uitkomst).toHaveLength(2)
  })
})
