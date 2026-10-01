import { describe, it, expect } from 'vitest'
import {
  berekenPaginas,
  storageBestandsPad,
  isStorageMap,
  telStorageTotalen,
  vindTabelMismatches,
  maakManifest,
} from './backupPijplijn.mjs'

describe('berekenPaginas', () => {
  it('geeft één pagina bij 0 rijen (nog steeds één bevestigende select)', () => {
    expect(berekenPaginas(0, 1000)).toEqual([{ from: 0, to: 999 }])
  })

  it('geeft één pagina als alles binnen de paginagrootte past', () => {
    expect(berekenPaginas(500, 1000)).toEqual([{ from: 0, to: 999 }])
  })

  it('splitst in meerdere pagina’s zodra het aantal de paginagrootte overschrijdt', () => {
    expect(berekenPaginas(2500, 1000)).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
      { from: 2000, to: 2999 },
    ])
  })

  it('geeft precies N/paginaGrootte pagina’s bij een exact veelvoud', () => {
    expect(berekenPaginas(2000, 1000)).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
    ])
  })

  it('weigert een ongeldige paginaGrootte', () => {
    expect(() => berekenPaginas(10, 0)).toThrow()
    expect(() => berekenPaginas(10, -5)).toThrow()
  })
})

describe('storageBestandsPad', () => {
  it('bouwt het pad onder storage/<bucket>/<objectPad>', () => {
    expect(storageBestandsPad('backups/2026-10-01', 'kantoor-assets', 'kantoor-1/logo.png')).toBe(
      'backups/2026-10-01/storage/kantoor-assets/kantoor-1/logo.png'
    )
  })

  it('weigert padtraversal in de bucketnaam', () => {
    expect(() => storageBestandsPad('backups/x', '..', 'logo.png')).toThrow(/padtraversal/)
  })

  it('weigert padtraversal in het objectpad', () => {
    expect(() => storageBestandsPad('backups/x', 'kantoor-assets', '../../etc/passwd')).toThrow(/padtraversal/)
  })

  it('weigert een lege bucket of objectPad', () => {
    expect(() => storageBestandsPad('backups/x', '', 'logo.png')).toThrow()
    expect(() => storageBestandsPad('backups/x', 'kantoor-assets', '')).toThrow()
  })
})

describe('isStorageMap', () => {
  it('herkent een map aan id === null', () => {
    expect(isStorageMap({ id: null, name: 'kantoor-1' })).toBe(true)
  })

  it('herkent een bestand aan een niet-lege id', () => {
    expect(isStorageMap({ id: 'abc-123', name: 'logo.png' })).toBe(false)
  })

  it('geeft false bij ontbrekend item', () => {
    expect(isStorageMap(null)).toBe(false)
    expect(isStorageMap(undefined)).toBe(false)
  })
})

describe('telStorageTotalen', () => {
  it('telt bestanden en bytes op over meerdere buckets', () => {
    expect(
      telStorageTotalen([
        { aantalBestanden: 3, totaalBytes: 1000 },
        { aantalBestanden: 2, totaalBytes: 500 },
      ])
    ).toEqual({ aantalBestanden: 5, totaalBytes: 1500 })
  })

  it('geeft nullen bij een lege lijst', () => {
    expect(telStorageTotalen([])).toEqual({ aantalBestanden: 0, totaalBytes: 0 })
  })
})

describe('vindTabelMismatches', () => {
  it('vindt geen afwijking als alle aantallen kloppen', () => {
    const resultaten = [
      { naam: 'kantoren', aantal: 1, verwacht: 1, overgeslagen: false },
      { naam: 'makelaars', aantal: 2, verwacht: 2, overgeslagen: false },
    ]
    expect(vindTabelMismatches(resultaten)).toEqual([])
  })

  it('vindt een tabel waarvan het weggeschreven aantal afwijkt', () => {
    const resultaten = [
      { naam: 'transacties', aantal: 999, verwacht: 1000, overgeslagen: false },
    ]
    expect(vindTabelMismatches(resultaten)).toHaveLength(1)
  })

  it('negeert bewust overgeslagen tabellen', () => {
    const resultaten = [{ naam: 'nieuwe_tabel', aantal: undefined, verwacht: undefined, overgeslagen: true }]
    expect(vindTabelMismatches(resultaten)).toEqual([])
  })
})

describe('maakManifest', () => {
  const basis = {
    tijdstip: '2026-10-01T12-00-00-000Z',
    tabellen: [
      { naam: 'kantoren', aantal: 1, verwacht: 1, overgeslagen: false },
      { naam: 'gebruik_events', aantal: 2416, verwacht: 2416, overgeslagen: false },
    ],
    storage: {
      overgeslagen: false,
      buckets: [{ naam: 'kantoor-assets', aantalBestanden: 5, totaalBytes: 201528 }],
    },
  }

  it('markeert het manifest als volledig als alle tabellen kloppen', () => {
    const manifest = maakManifest(basis)
    expect(manifest.volledig).toBe(true)
    expect(manifest.tabellen).toHaveLength(2)
    expect(manifest.storage.aantalBestanden).toBe(5)
    expect(manifest.storage.totaalBytes).toBe(201528)
  })

  it('markeert het manifest als onvolledig bij een mismatch', () => {
    const manifest = maakManifest({
      ...basis,
      tabellen: [{ naam: 'transacties', aantal: 10, verwacht: 11, overgeslagen: false }],
    })
    expect(manifest.volledig).toBe(false)
    expect(manifest.tabellen[0].klopt).toBe(false)
  })

  it('zet storage op overgeslagen zonder buckets te tellen', () => {
    const manifest = maakManifest({ ...basis, storage: { overgeslagen: true, buckets: [] } })
    expect(manifest.storage).toEqual({ overgeslagen: true, buckets: [] })
  })

  it('weigert zonder tijdstip of tabellen', () => {
    expect(() => maakManifest({ ...basis, tijdstip: '' })).toThrow()
    expect(() => maakManifest({ ...basis, tabellen: null })).toThrow()
  })
})
