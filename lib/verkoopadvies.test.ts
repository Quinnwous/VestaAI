import { describe, it, expect } from 'vitest'
import {
  bouwVerkoopadviesInput,
  verkoopadviesGereedheid,
  verkoopadviesMarktcontextFilter,
  type VerkoopadviesRuweInvoer,
  type VerkoopadviesGereedheidItem,
  type VerkoopadviesGereedheidStatus,
} from './verkoopadvies'
import type { PropertyInput, KantoorInstellingen } from './schemas'
import type { WaarderingUitkomst } from './waardering'
import type { MarktanalyseSamenvatting, MarktanalyseSamenvattingRij } from './transactiesQuery'

// ─────────────────────────────────────────────────────────────────────────
// Fixtures — een volledig, geldig dossier + waardering + kantoor + markt,
// per test overschreven met net genoeg om één scenario te raken.
// ─────────────────────────────────────────────────────────────────────────

function dossierFixture(overrides: Partial<PropertyInput> = {}): PropertyInput {
  return {
    adres: 'Kerkstraat 12, 2242 AB, Wassenaar',
    woningtype_groep: 'rijwoning',
    kamers: 5,
    oppervlak_m2: 120,
    bouwjaar: 1965,
    energielabel: 'C',
    prijsverwachting_verkoper: 725000,
    courtagevoorstel_percentage: 1.5,
    woz_waarde: 690000,
    woz_peiljaar: 2025,
    ...overrides,
  }
}

function waarderingUitkomstFixture(overrides: Partial<WaarderingUitkomst> = {}): WaarderingUitkomst {
  return {
    versie: 2,
    peildatum: '2026-09-29',
    waarde: 725000,
    laag: 690000,
    hoog: 760000,
    n: 12,
    weinigData: false,
    straal_m: 750,
    maanden: 12,
    methode: 'straal',
    index_basis: 'eigen',
    index_tm: '2026-Q3',
    referenties: [],
    effecten: { garage: null, tuin: null, energielabel: null, bouwperiode: null },
    grootte: null,
    correcties: {
      garage: { aan: true, toegepast: false, toelichting: 'geen data' },
      tuin: { aan: true, toegepast: false, toelichting: 'geen data' },
      energielabel: { aan: true, toegepast: false, toelichting: 'geen data' },
      bouwperiode: { aan: true, toegepast: false, toelichting: 'geen data' },
      grootte: { aan: true, toegepast: false, toelichting: 'geen data' },
    },
    woz: null,
    waarschuwingen: [],
    ...overrides,
  }
}

const kantoorInstellingenFixture: KantoorInstellingen = {
  courtage: { percentage: 1.25, btw: 'exclusief' },
  profiel: { opgericht: '1998', kenmerken: 'NVM-makelaar, gespecialiseerd in Wassenaar' },
  werkgebied: { plaatsen: ['Wassenaar', 'Den Haag'] },
}

function marktcontextFixture(n: number): MarktanalyseSamenvatting {
  const rij: MarktanalyseSamenvattingRij = {
    van: '2024-09-01', tot: '2026-09-01', n, mediaanPrijs: 710000, mediaanM2: 5800, mediaanLooptijd: 32, pctTovVraag: 2.1,
  }
  return { huidig: rij, vorig: { ...rij, n: Math.max(0, n - 2) } }
}

function ruweInvoerFixture(overrides: Partial<VerkoopadviesRuweInvoer> = {}): VerkoopadviesRuweInvoer {
  return {
    inputJson: dossierFixture(),
    waarderingJson: { versie: 2, uitkomst: waarderingUitkomstFixture(), correctie: null, handmatig: { uitgesloten: [], toegevoegd: [] } },
    kantoor: {
      name: 'i4 Housing',
      logo_url: null,
      huisstijl_json: { primaire_kleur: '#0080C8', telefoon: '070-1234567', email: 'info@i4housing.nl', website: 'i4housing.nl' },
    },
    kantoorInstellingen: kantoorInstellingenFixture,
    marktcontext: marktcontextFixture(12),
    makelaar: { naam: 'Jan Makelaar', email: 'jan@i4housing.nl' },
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// bouwVerkoopadviesInput
// ─────────────────────────────────────────────────────────────────────────

describe('bouwVerkoopadviesInput', () => {
  it('bouwt het volledige contract uit ruwe, opgehaalde rijen', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture())

    expect(input.dossier.adres).toBe('Kerkstraat 12, 2242 AB, Wassenaar')
    expect(input.waardering.uitkomst?.n).toBe(12)
    expect(input.waardering.uitkomst?.waarde).toBe(725000)
    expect(input.kantoor.naam).toBe('i4 Housing')
    expect(input.kantoor.telefoon).toBe('070-1234567')
    expect(input.kantoor.email).toBe('info@i4housing.nl')
    expect(input.kantoor.website?.label).toBe('i4housing.nl')
    expect(input.kantoor.courtage).toEqual({ percentage: 1.5, btw: 'exclusief', bron: 'dossier' })
    expect(input.kantoor.profiel?.opgericht).toBe('1998')
    expect(input.kantoor.werkgebied?.plaatsen).toEqual(['Wassenaar', 'Den Haag'])
    expect(input.marktcontext?.huidig.n).toBe(12)
    expect(input.makelaar).toEqual({ naam: 'Jan Makelaar', email: 'jan@i4housing.nl' })
  })

  it('waardering herberekent niets — geeft de opgeslagen uitkomst 1-op-1 door', () => {
    const afwijkendeUitkomst = waarderingUitkomstFixture({ waarde: 999999, n: 4, weinigData: true })
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({
      waarderingJson: { versie: 2, uitkomst: afwijkendeUitkomst, correctie: null, handmatig: { uitgesloten: [], toegevoegd: [] } },
    }))
    expect(input.waardering.uitkomst).toEqual(afwijkendeUitkomst)
  })

  it('valt terug op de kantoorstandaard voor courtage als het dossier geen voorstel heeft', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({
      inputJson: dossierFixture({ courtagevoorstel_percentage: undefined }),
    }))
    expect(input.kantoor.courtage).toEqual({ percentage: 1.25, btw: 'exclusief', bron: 'kantoor' })
  })

  it('dossier zonder waardering: migreert naar een lege opslag (uitkomst null)', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({ waarderingJson: null }))
    expect(input.waardering.uitkomst).toBeNull()
  })

  it('kantoor zonder instellingen: courtage/profiel/werkgebied vallen leeg terug', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({
      inputJson: dossierFixture({ courtagevoorstel_percentage: undefined }),
      kantoorInstellingen: null,
    }))
    expect(input.kantoor.courtage).toEqual({ percentage: null, btw: 'exclusief', bron: null })
    expect(input.kantoor.profiel).toBeNull()
    expect(input.kantoor.werkgebied).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// verkoopadviesMarktcontextFilter
// ─────────────────────────────────────────────────────────────────────────

describe('verkoopadviesMarktcontextFilter', () => {
  it('leidt plaats (laatste kommadeel) en de subtypes van de typegroep af', () => {
    const filter = verkoopadviesMarktcontextFilter(dossierFixture())
    expect(filter?.plaatsen).toContain('Wassenaar')
    expect(filter?.typen.length).toBeGreaterThan(0)
  })

  it('normaliseert de plaatsnaam en geeft schrijfwijze-varianten mee ("s-Gravenhage → Den Haag)', () => {
    const filter = verkoopadviesMarktcontextFilter(dossierFixture({ adres: 'Wagenstraat 1, 2512 AA, \'S GRAVENHAGE' }))
    expect(filter?.plaatsen).toContain('Den Haag')
  })

  it('geeft null als het adres geen komma bevat (geen plaats af te leiden)', () => {
    const filter = verkoopadviesMarktcontextFilter(dossierFixture({ adres: 'Onbekend adres zonder komma' }))
    expect(filter).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// verkoopadviesGereedheid
// ─────────────────────────────────────────────────────────────────────────

function statusVan(items: VerkoopadviesGereedheidItem[], onderdeel: string): VerkoopadviesGereedheidStatus {
  const item = items.find(i => i.onderdeel === onderdeel)
  if (!item) throw new Error(`onderdeel niet gevonden: ${onderdeel}`)
  return item.status
}

describe('verkoopadviesGereedheid', () => {
  it('volledig dossier: alle onderdelen ok', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture())
    const items = verkoopadviesGereedheid(input)

    expect(items).toHaveLength(7)
    for (const item of items) {
      expect(item.status, `${item.onderdeel}: ${item.uitleg}`).toBe('ok')
      expect(item.uitleg.length).toBeGreaterThan(0)
    }
  })

  it('dossier zonder waardering: waardering ontbreekt', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({ waarderingJson: null }))
    const items = verkoopadviesGereedheid(input)
    expect(statusVan(items, 'waardering')).toBe('ontbreekt')
  })

  it('waardering met weinig referenties: zwak', () => {
    const zwakkeUitkomst = waarderingUitkomstFixture({ n: 4, weinigData: true })
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({
      waarderingJson: { versie: 2, uitkomst: zwakkeUitkomst, correctie: null, handmatig: { uitgesloten: [], toegevoegd: [] } },
    }))
    const items = verkoopadviesGereedheid(input)
    expect(statusVan(items, 'waardering')).toBe('zwak')
  })

  it('kantoor zonder instellingen: courtage/kantoorprofiel/werkgebied ontbreken', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({
      inputJson: dossierFixture({ courtagevoorstel_percentage: undefined }),
      kantoorInstellingen: null,
    }))
    const items = verkoopadviesGereedheid(input)
    expect(statusVan(items, 'courtage')).toBe('ontbreekt')
    expect(statusVan(items, 'kantoorprofiel')).toBe('ontbreekt')
    expect(statusVan(items, 'werkgebied')).toBe('ontbreekt')
    // een dossiervoorstel voor courtage blijft wél gelden, ook zonder kantoorinstellingen
    const inputMetVoorstel = bouwVerkoopadviesInput(ruweInvoerFixture({ kantoorInstellingen: null }))
    expect(statusVan(verkoopadviesGereedheid(inputMetVoorstel), 'courtage')).toBe('ok')
  })

  it('marktcontext met n = 3: zwak', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({ marktcontext: marktcontextFixture(3) }))
    const items = verkoopadviesGereedheid(input)
    expect(statusVan(items, 'marktcontext')).toBe('zwak')
  })

  it('geen marktcontext beschikbaar: ontbreekt', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({ marktcontext: null }))
    const items = verkoopadviesGereedheid(input)
    expect(statusVan(items, 'marktcontext')).toBe('ontbreekt')
  })

  it('geen prijsverwachting verkoper en geen WOZ: beide ontbreken', () => {
    const input = bouwVerkoopadviesInput(ruweInvoerFixture({
      inputJson: dossierFixture({ prijsverwachting_verkoper: undefined, woz_waarde: undefined, woz_peiljaar: undefined }),
    }))
    const items = verkoopadviesGereedheid(input)
    expect(statusVan(items, 'prijsverwachting_verkoper')).toBe('ontbreekt')
    expect(statusVan(items, 'woz')).toBe('ontbreekt')
  })
})
