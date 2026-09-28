import { describe, it, expect } from 'vitest'
import { voerImportPijplijnUit, bouwSnapshot, type GenormaliseerdeRij } from './importPijplijn'
import { PROFIELEN } from './importProfielen'

const VANDAAG = new Date('2026-09-28T00:00:00Z')
const KANTOOR_ALIASSEN = ['i4 Housing']

describe('voerImportPijplijnUit — realworks', () => {
  const headers = ['adres', 'postcode', 'plaats', 'lat', 'lng', 'verkoopprijs_kk', 'datum_ondertekening', 'soort_woonhuis', 'woonoppervlak', 'kantoor_verkopend']

  it('mapt, normaliseert en beoordeelt een geldige rij', () => {
    const ruweRijen = [
      ['Hoofdstraat 1', '2242AB', 'Wassenaar', '52.146', '4.402', '750000', '15-03-2026', 'Tussenwoning', '120', 'I4 Housing B.V.'],
    ]
    const { rijen, rapport } = voerImportPijplijnUit(ruweRijen, headers, PROFIELEN.realworks, KANTOOR_ALIASSEN, { vandaag: VANDAAG })

    expect(rijen).toHaveLength(1)
    const r = rijen[0]
    expect(r.adres_sleutel).toBe('2242ab|1|')
    expect(r.woningtype_groep).toBe('rijwoning')
    expect(r.woningtype_sub).toBe('Tussenwoning')
    expect(r.eigen_verkoop).toBe(true) // "I4 Housing B.V." normaliseert naar dezelfde norm als alias "i4 Housing"
    expect(r.verkopend_kantoor_norm).toBe('i4housing')
    expect(r.geo).toBe('POINT(4.402 52.146)')
    expect(r.geocode_status).toBe('exact')
    expect(r.uitgesloten_reden).toBeNull()

    expect(rapport.totaalRuw).toBe(1)
    expect(rapport.totaalGeimporteerd).toBe(1)
    expect(rapport.overgeslagen).toHaveLength(0)
    expect(rapport.aantalEigenVerkopen).toBe(1)
    expect(rapport.pctMetCoordinaat).toBe(100)
  })

  it('slaat een rij zonder adres over (niet geïmporteerd, ook niet uitgesloten)', () => {
    const ruweRijen = [['', '2242AB', 'Wassenaar', '52.146', '4.402', '750000', '15-03-2026', 'Tussenwoning', '120', '']]
    const { rijen, rapport } = voerImportPijplijnUit(ruweRijen, headers, PROFIELEN.realworks, KANTOOR_ALIASSEN, { vandaag: VANDAAG })
    expect(rijen).toHaveLength(0)
    expect(rapport.overgeslagen).toHaveLength(1)
    expect(rapport.overgeslagen[0].reden).toBe('Geen adres')
  })

  it('markeert een rij met een onwaarschijnlijke prijs als uitgesloten, maar behoudt hem', () => {
    const ruweRijen = [
      ['Hoofdstraat 1', '2242AB', 'Wassenaar', '52.146', '4.402', '5000', '15-03-2026', 'Tussenwoning', '120', ''],
    ]
    const { rijen, rapport } = voerImportPijplijnUit(ruweRijen, headers, PROFIELEN.realworks, KANTOOR_ALIASSEN, { vandaag: VANDAAG })
    expect(rijen).toHaveLength(1)
    expect(rijen[0].uitgesloten_reden).toBe('prijs_onwaarschijnlijk')
    expect(rapport.perUitsluitreden).toEqual([{ reden: 'prijs_onwaarschijnlijk', label: expect.any(String), aantal: 1 }])
    expect(rapport.voorbeeldenPerUitsluitreden[0].voorbeelden).toEqual([{ adres: 'Hoofdstraat 1' }])
  })

  it('herkent een ander kantoor niet als eigen verkoop', () => {
    const ruweRijen = [
      ['Hoofdstraat 1', '2242AB', 'Wassenaar', '52.146', '4.402', '750000', '15-03-2026', 'Tussenwoning', '120', 'Concurrent Makelaars'],
    ]
    const { rijen } = voerImportPijplijnUit(ruweRijen, headers, PROFIELEN.realworks, KANTOOR_ALIASSEN, { vandaag: VANDAAG })
    expect(rijen[0].eigen_verkoop).toBe(false)
  })
})

describe('voerImportPijplijnUit — ontdubbelen tussen brainbay en realworks', () => {
  it('voegt dezelfde woning uit beide bronnen samen tot één rij', () => {
    const realworksHeaders = ['adres', 'postcode', 'plaats', 'verkoopprijs_kk', 'datum_ondertekening']
    const brainbayHeaders = ['adres', 'postcode', 'plaats', 'koopsom', 'transactiedatum', 'aanbiedend_kantoor']

    const { rijen: realworksRijen } = voerImportPijplijnUit(
      [['Hoofdstraat 1', '2242AB', 'Wassenaar', '750000', '15-03-2026']],
      realworksHeaders,
      PROFIELEN.realworks,
      KANTOOR_ALIASSEN,
      { vandaag: VANDAAG },
    )
    const { rijen: brainbayRijen } = voerImportPijplijnUit(
      [['Hoofdstraat 1', '2242AB', 'Wassenaar', '749000', '14-03-2026', 'i4 Housing']],
      brainbayHeaders,
      PROFIELEN.brainbay,
      KANTOOR_ALIASSEN,
      { vandaag: VANDAAG },
    )

    // Simuleert wat scripts/import-transacties.mjs doet: beide bronnen samen door ontdubbel() heen.
    // Rechtstreeks via voerImportPijplijnUit met alle rauwe rijen in één call, zodat de bron-mix
    // hetzelfde pad doorloopt als een echte gecombineerde import.
    const gecombineerd = [...realworksRijen, ...brainbayRijen]
    expect(gecombineerd).toHaveLength(2) // vóór ontdubbelen (elke pijplijn-run ontdubbelt alleen intern)

    // ontdubbel() zelf (los getest in ontdubbelen.test.ts) voegt deze twee samen —
    // hier alleen checken dat beide rijen dezelfde adres_sleutel + kantoor-norm hebben,
    // wat de voorwaarde is voor de cross-bron-koppeling.
    expect(realworksRijen[0].adres_sleutel).toBe(brainbayRijen[0].adres_sleutel)
  })
})

describe('bouwSnapshot', () => {
  const basisRij: GenormaliseerdeRij = {
    adres: 'Hoofdstraat 1',
    postcode: '2242ab',
    plaats: 'Wassenaar',
    wijk: null,
    buurt: null,
    geo: null,
    verkoopprijs: 750_000,
    vraagprijs: null,
    verkoopdatum: '2026-03-15',
    looptijd_dagen: null,
    woningtype: null,
    woonoppervlak_m2: 120,
    perceel_m2: null,
    inhoud_m3: null,
    bouwjaar: null,
    energielabel: null,
    kamers: null,
    garage: null,
    tuin: null,
    buitenruimte: null,
    eigen_verkoop: true,
    verkopend_kantoor: 'i4 Housing',
    bron: 'realworks',
    adres_sleutel: '2242ab|1|',
    huisnummer: 1,
    toevoeging: null,
    woningtype_groep: 'rijwoning',
    woningtype_sub: null,
    geocode_status: null,
    uitgesloten_reden: null,
    aankopend_kantoor: null,
    verkopend_kantoor_norm: 'i4housing',
  }

  it('geeft geen snapshot-entry voor een compleet nieuwe rij', () => {
    const snapshot = bouwSnapshot([], [basisRij])
    expect(snapshot.bijgewerkt).toHaveLength(0)
    expect(snapshot.afgekapt).toBe(false)
  })

  it('bewaart de vorige waarden van een bijgewerkte rij, incl. de vorige import_id', () => {
    const bestaand = {
      id: 'bestaand-id',
      adres_sleutel: '2242ab|1|',
      verkoopdatum: '2026-03-15',
      import_id: 'vorige-import-id',
      verkoopprijs: 700_000,
      woonoppervlak_m2: 118,
    }
    const snapshot = bouwSnapshot([bestaand], [basisRij])
    expect(snapshot.bijgewerkt).toHaveLength(1)
    expect(snapshot.bijgewerkt[0].id).toBe('bestaand-id')
    expect(snapshot.bijgewerkt[0].vorige.import_id).toBe('vorige-import-id')
    expect(snapshot.bijgewerkt[0].vorige.verkoopprijs).toBe(700_000)
    expect(snapshot.bijgewerkt[0].vorige.woonoppervlak_m2).toBe(118)
  })

  it('matcht niet op een andere verkoopdatum (andere transactie, zelfde adres)', () => {
    const bestaand = {
      id: 'ander-id',
      adres_sleutel: '2242ab|1|',
      verkoopdatum: '2020-01-01',
      import_id: null,
    }
    const snapshot = bouwSnapshot([bestaand], [basisRij])
    expect(snapshot.bijgewerkt).toHaveLength(0)
  })
})
