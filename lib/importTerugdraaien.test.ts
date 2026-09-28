import { describe, it, expect } from 'vitest'
import { planTerugdraai, bouwSnapshotUitBestaande, bouwSleutel, type ImportVoorTerugdraai } from './importTerugdraaien'
import { IMPORT_SNAPSHOT_VERSIE, MAX_SNAPSHOT_RIJEN, type ImportSnapshot } from './importSnapshot'

function maakImport(overrides: Partial<ImportVoorTerugdraai> = {}): ImportVoorTerugdraai {
  return { id: 'imp-1', kantoor_id: 'kantoor-1', status: 'klaar', ...overrides }
}

describe('planTerugdraai', () => {
  it('weigert een import die niet de laatste van het kantoor is', () => {
    const resultaat = planTerugdraai({
      imp: maakImport(),
      laatsteImportIdVanKantoor: 'imp-2',
      snapshot: { versie: IMPORT_SNAPSHOT_VERSIE, bijgewerkt: [], afgekapt: false },
      rijIdsMetImportId: [],
    })
    expect(resultaat.ok).toBe(false)
    if (!resultaat.ok) expect(resultaat.reden).toMatch(/laatste import/)
  })

  it('weigert een import die nog bezig is', () => {
    const resultaat = planTerugdraai({
      imp: maakImport({ status: 'bezig' }),
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot: { versie: IMPORT_SNAPSHOT_VERSIE, bijgewerkt: [], afgekapt: false },
      rijIdsMetImportId: [],
    })
    expect(resultaat.ok).toBe(false)
    if (!resultaat.ok) expect(resultaat.reden).toMatch(/status/)
  })

  it('weigert een import die al is teruggedraaid', () => {
    const resultaat = planTerugdraai({
      imp: maakImport({ status: 'teruggedraaid' }),
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot: { versie: IMPORT_SNAPSHOT_VERSIE, bijgewerkt: [], afgekapt: false },
      rijIdsMetImportId: [],
    })
    expect(resultaat.ok).toBe(false)
  })

  it('weigert zonder (geldige) snapshot', () => {
    const zonderSnapshot = planTerugdraai({
      imp: maakImport(),
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot: null,
      rijIdsMetImportId: [],
    })
    expect(zonderSnapshot.ok).toBe(false)
    if (!zonderSnapshot.ok) expect(zonderSnapshot.reden).toMatch(/snapshot/i)

    const ongeldigeSnapshot = planTerugdraai({
      imp: maakImport(),
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot: { versie: 999, bijgewerkt: [] },
      rijIdsMetImportId: [],
    })
    expect(ongeldigeSnapshot.ok).toBe(false)
  })

  it('weigert een afgekapte snapshot', () => {
    const resultaat = planTerugdraai({
      imp: maakImport(),
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot: { versie: IMPORT_SNAPSHOT_VERSIE, bijgewerkt: [{ id: 'r1', vorige: {} }], afgekapt: true },
      rijIdsMetImportId: ['r1'],
    })
    expect(resultaat.ok).toBe(false)
    if (!resultaat.ok) expect(resultaat.reden).toMatch(/afgekapt/)
  })

  it('scheidt bijgewerkte (herstel) rijen van nieuwe (verwijder) rijen', () => {
    const snapshot: ImportSnapshot = {
      versie: IMPORT_SNAPSHOT_VERSIE,
      bijgewerkt: [
        { id: 'r1', vorige: { verkoopprijs: 500000 } },
        { id: 'r2', vorige: { verkoopprijs: 600000 } },
      ],
      afgekapt: false,
    }
    const resultaat = planTerugdraai({
      imp: maakImport(),
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot,
      rijIdsMetImportId: ['r1', 'r2', 'r3', 'r4'], // r3/r4 zijn nieuw bijgekomen in deze import
    })
    expect(resultaat.ok).toBe(true)
    if (!resultaat.ok) return
    expect(resultaat.herstel).toEqual(snapshot.bijgewerkt)
    expect(resultaat.verwijder.sort()).toEqual(['r3', 'r4'])
  })

  it('levert een lege verwijderlijst als alle rijen bijgewerkt waren', () => {
    const snapshot: ImportSnapshot = {
      versie: IMPORT_SNAPSHOT_VERSIE,
      bijgewerkt: [{ id: 'r1', vorige: {} }],
      afgekapt: false,
    }
    const resultaat = planTerugdraai({
      imp: maakImport(),
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot,
      rijIdsMetImportId: ['r1'],
    })
    expect(resultaat.ok).toBe(true)
    if (resultaat.ok) expect(resultaat.verwijder).toEqual([])
  })
})

describe('bouwSleutel', () => {
  it('combineert adres_sleutel en verkoopdatum', () => {
    expect(bouwSleutel('2242ab-1', '2026-03-15')).toBe('2242ab-1|2026-03-15')
  })

  it('valt terug op een lege string zonder verkoopdatum', () => {
    expect(bouwSleutel('sleutel', null)).toBe('sleutel|')
  })
})

describe('bouwSnapshotUitBestaande', () => {
  it('neemt alleen bestaande rijen mee waarvan de sleutel in de nieuwe import voorkomt', () => {
    const bestaande = [
      { id: 'r1', adresSleutel: 'a', verkoopdatum: '2026-01-01', vorige: { verkoopprijs: 100 } },
      { id: 'r2', adresSleutel: 'b', verkoopdatum: '2026-01-02', vorige: { verkoopprijs: 200 } },
    ]
    const nieuweSleutels = new Set([bouwSleutel('a', '2026-01-01')])
    const snapshot = bouwSnapshotUitBestaande(bestaande, nieuweSleutels)

    expect(snapshot.versie).toBe(IMPORT_SNAPSHOT_VERSIE)
    expect(snapshot.afgekapt).toBe(false)
    expect(snapshot.bijgewerkt).toEqual([{ id: 'r1', vorige: { verkoopprijs: 100 } }])
  })

  it('levert een lege, niet-afgekapte snapshot zonder matches', () => {
    const snapshot = bouwSnapshotUitBestaande([], new Set(['iets']))
    expect(snapshot.bijgewerkt).toEqual([])
    expect(snapshot.afgekapt).toBe(false)
  })

  it('kapt af boven MAX_SNAPSHOT_RIJEN en zet afgekapt op true', () => {
    const bestaande = Array.from({ length: MAX_SNAPSHOT_RIJEN + 5 }, (_, i) => ({
      id: `r${i}`,
      adresSleutel: `a${i}`,
      verkoopdatum: '2026-01-01',
      vorige: {},
    }))
    const nieuweSleutels = new Set(bestaande.map(r => bouwSleutel(r.adresSleutel, r.verkoopdatum)))
    const snapshot = bouwSnapshotUitBestaande(bestaande, nieuweSleutels)

    expect(snapshot.afgekapt).toBe(true)
    expect(snapshot.bijgewerkt).toHaveLength(MAX_SNAPSHOT_RIJEN)
  })
})

describe('planTerugdraai — mislukte import', () => {
  it('staat terugdraaien van een mislukte import toe (half geschreven dataset herstellen)', () => {
    const resultaat = planTerugdraai({
      imp: { id: 'imp-1', kantoor_id: 'kantoor-1', status: 'mislukt' },
      laatsteImportIdVanKantoor: 'imp-1',
      snapshot: { versie: 1, bijgewerkt: [], afgekapt: false },
      rijIdsMetImportId: ['r1'],
    })
    expect(resultaat).toEqual({ ok: true, herstel: [], verwijder: ['r1'] })
  })
})
