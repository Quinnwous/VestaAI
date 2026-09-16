import { describe, it, expect } from 'vitest'
import { selecteerReferenties, berekenWaardebepaling, kenmerkEffect, berekenWaardering, type Subject } from './waardering'
import type { TransactieRow } from './supabase'

function maakRij(overrides: Partial<TransactieRow>): TransactieRow {
  return {
    id: crypto.randomUUID(),
    kantoor_id: 'k1',
    adres: 'Hoofdstraat 1',
    postcode: null,
    plaats: null,
    wijk: null,
    buurt: null,
    verkoopprijs: 500000,
    vraagprijs: 500000,
    verkoopdatum: '2026-02-15',
    looptijd_dagen: 30,
    woningtype: 'Tussenwoning',
    woonoppervlak_m2: 100,
    perceel_m2: null,
    inhoud_m3: null,
    bouwjaar: 2000,
    energielabel: null,
    kamers: null,
    garage: null,
    tuin: null,
    buitenruimte: null,
    eigen_verkoop: true,
    verkopend_kantoor: null,
    created_at: '2026-02-16T00:00:00Z',
    ...overrides,
  }
}

const SUBJECT: Subject = { woningtype: 'Tussenwoning', oppervlak_m2: 100, bouwjaar: 2000 }

describe('selecteerReferenties', () => {
  it('geeft de beste match de hoogste gelijkenis', () => {
    const identiek = maakRij({ woningtype: 'Tussenwoning', woonoppervlak_m2: 100, bouwjaar: 2000 })
    const afwijkend = maakRij({ woningtype: 'Villa', woonoppervlak_m2: 300, bouwjaar: 1900 })
    const result = selecteerReferenties(SUBJECT, [afwijkend, identiek])
    expect(result[0].id).toBe(identiek.id)
    expect(result[0].gelijkenis).toBeGreaterThan(result[1]?.gelijkenis ?? 0)
  })

  it('negeert transacties zonder verkoopprijs of oppervlak', () => {
    const zonderPrijs = maakRij({ verkoopprijs: null })
    const zonderOppervlak = maakRij({ woonoppervlak_m2: null })
    expect(selecteerReferenties(SUBJECT, [zonderPrijs, zonderOppervlak])).toHaveLength(0)
  })

  it('respecteert de limiet', () => {
    const rijen = Array.from({ length: 20 }, () => maakRij({}))
    expect(selecteerReferenties(SUBJECT, rijen, 5)).toHaveLength(5)
  })
})

describe('berekenWaardebepaling', () => {
  it('berekent de mediane m²-prijs en een bandbreedte eromheen', () => {
    const refs = selecteerReferenties(SUBJECT, [
      maakRij({ verkoopprijs: 400000, woonoppervlak_m2: 100 }),
      maakRij({ verkoopprijs: 500000, woonoppervlak_m2: 100 }),
      maakRij({ verkoopprijs: 600000, woonoppervlak_m2: 100 }),
    ])
    const w = berekenWaardebepaling(SUBJECT, refs)
    expect(w.aantalReferenties).toBe(3)
    expect(w.m2PrijsMediaan).toBe(5000)
    expect(w.midden).toBe(500000)
    expect(w.laag).toBeLessThan(w.midden!)
    expect(w.hoog).toBeGreaterThan(w.midden!)
  })

  it('geeft een bredere marge bij weinig referenties dan bij veel', () => {
    const weinigRefs = selecteerReferenties(SUBJECT, [maakRij({ verkoopprijs: 500000, woonoppervlak_m2: 100 })])
    const veelRefs = selecteerReferenties(SUBJECT, Array.from({ length: 10 }, () => maakRij({ verkoopprijs: 500000, woonoppervlak_m2: 100 })))
    const weinig = berekenWaardebepaling(SUBJECT, weinigRefs)
    const veel = berekenWaardebepaling(SUBJECT, veelRefs)
    const margeWeinig = (weinig.hoog! - weinig.laag!) / weinig.midden!
    const margeVeel = (veel.hoog! - veel.laag!) / veel.midden!
    expect(margeWeinig).toBeGreaterThan(margeVeel)
  })

  it('markeert weinigData zonder referenties, geen crash', () => {
    const w = berekenWaardebepaling(SUBJECT, [])
    expect(w.weinigData).toBe(true)
    expect(w.midden).toBeNull()
  })
})

describe('kenmerkEffect', () => {
  it('geeft null bij te kleine groepen (geen schijnzekerheid)', () => {
    const refs = selecteerReferenties(SUBJECT, [
      maakRij({ garage: true, verkoopprijs: 550000, woonoppervlak_m2: 100 }),
      maakRij({ garage: false, verkoopprijs: 500000, woonoppervlak_m2: 100 }),
    ])
    expect(kenmerkEffect(refs, 'garage')).toBeNull()
  })

  it('berekent het verschil zodra beide groepen groot genoeg zijn', () => {
    const metGarage = Array.from({ length: 3 }, () => maakRij({ garage: true, verkoopprijs: 550000, woonoppervlak_m2: 100 }))
    const zonderGarage = Array.from({ length: 3 }, () => maakRij({ garage: false, verkoopprijs: 500000, woonoppervlak_m2: 100 }))
    const refs = selecteerReferenties(SUBJECT, [...metGarage, ...zonderGarage])
    const effect = kenmerkEffect(refs, 'garage')
    expect(effect).not.toBeNull()
    expect(effect!.verschilPct).toBeCloseTo(10, 0)
    expect(effect!.aantalMet).toBe(3)
    expect(effect!.aantalZonder).toBe(3)
  })
})

describe('berekenWaardering', () => {
  const dataset = [
    ...Array.from({ length: 3 }, () => maakRij({ garage: true, verkoopprijs: 550000, woonoppervlak_m2: 100 })),
    ...Array.from({ length: 3 }, () => maakRij({ garage: false, verkoopprijs: 500000, woonoppervlak_m2: 100 })),
  ]

  it('past het garage-effect alleen toe als het blok aan staat én het subject een garage heeft', () => {
    const zonderBlok = berekenWaardering(SUBJECT, { heeftGarage: true, heeftTuin: false }, dataset, { garage: false, tuin: false })
    const metBlok = berekenWaardering(SUBJECT, { heeftGarage: true, heeftTuin: false }, dataset, { garage: true, tuin: false })
    expect(metBlok.midden).toBeGreaterThan(zonderBlok.midden!)
  })

  it('past niets toe als het subject de eigenschap zelf niet heeft, ook niet met het blok aan', () => {
    const metBlokGeenGarage = berekenWaardering(SUBJECT, { heeftGarage: false, heeftTuin: false }, dataset, { garage: true, tuin: false })
    const zonderBlok = berekenWaardering(SUBJECT, { heeftGarage: false, heeftTuin: false }, dataset, { garage: false, tuin: false })
    expect(metBlokGeenGarage.midden).toBe(zonderBlok.midden)
  })

  it('crasht niet zonder referenties', () => {
    const w = berekenWaardering(SUBJECT, { heeftGarage: true, heeftTuin: true }, [], { garage: true, tuin: true })
    expect(w.midden).toBeNull()
  })
})
