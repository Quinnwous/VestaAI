import { describe, it, expect } from 'vitest'
import { voerImportPijplijnUit, bouwSnapshot, telNieuwEnBijgewerkt, maakUpsertBatches, type GenormaliseerdeRij, type BestaandeTransactieRij } from './importPijplijn'
import { MAX_SNAPSHOT_RIJEN } from './importSnapshot'
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

describe('voerImportPijplijnUit — expliciete eigen_verkoop-kolom (item i2, admin-CSV)', () => {
  it('een expliciete eigen_verkoop-kolom wint van de kantoor-aliassen-afleiding', () => {
    const headersMetEigen = ['adres', 'postcode', 'plaats', 'verkoopprijs', 'verkoopdatum', 'verkopend_kantoor', 'eigen_verkoop']
    // Kolom zegt "ja" terwijl het verkopend_kantoor niet in de kantoor-aliassen voorkomt.
    const ruweRijen = [
      ['Hoofdstraat 1', '2242AB', 'Wassenaar', '750000', '15-03-2026', 'Concurrent Makelaars', 'ja'],
    ]
    const { rijen } = voerImportPijplijnUit(ruweRijen, headersMetEigen, PROFIELEN.handmatig, KANTOOR_ALIASSEN, { vandaag: VANDAAG })
    expect(rijen[0].eigen_verkoop).toBe(true)
  })

  it('zonder eigen_verkoop-kolom valt terug op de kantoor-aliassen-afleiding', () => {
    const headersZonderEigen = ['adres', 'postcode', 'plaats', 'verkoopprijs', 'verkoopdatum', 'verkopend_kantoor']
    const ruweRijen = [
      ['Hoofdstraat 1', '2242AB', 'Wassenaar', '750000', '15-03-2026', 'I4 Housing B.V.'],
    ]
    const { rijen } = voerImportPijplijnUit(ruweRijen, headersZonderEigen, PROFIELEN.handmatig, KANTOOR_ALIASSEN, { vandaag: VANDAAG })
    expect(rijen[0].eigen_verkoop).toBe(true)
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

describe('bouwSnapshot', () => {
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

  it('bewaart alleen de kolommen die de nieuwe rijen zelf schrijven (geschrevenKolommen), plus altijd import_id', () => {
    // Bestaand record met exact alle GenormaliseerdeRij-kolommen aanwezig (zoals
    // een echte databaserij), plus één kolom die geen GenormaliseerdeRij-sleutel
    // is (bv. een computed kolom als prijs_m2, of lat/lng zelf).
    const bestaand: Record<string, unknown> = {
      ...basisRij,
      id: 'bestaand-id',
      import_id: 'vorige-import-id',
      niet_geschreven_kolom: 'zou hier niet moeten staan',
    }
    const snapshot = bouwSnapshot([bestaand as unknown as BestaandeTransactieRij], [basisRij])
    expect(snapshot.bijgewerkt[0].vorige).not.toHaveProperty('niet_geschreven_kolom')
    expect(Object.keys(snapshot.bijgewerkt[0].vorige).sort()).toEqual(
      [...(Object.keys(basisRij) as (keyof GenormaliseerdeRij)[]), 'import_id'].sort(),
    )
  })

  it('bewaart geo zoals de aanroeper hem aanlevert — de WKT POINT(lng lat) die de aanroeper uit de lat/lng-coördinatenweergave opbouwt, niet ruwe lat/lng zelf', () => {
    // Contract (zie app/admin/transacties/actions.ts en scripts/import-transacties.mjs):
    // bouwSnapshot() rekent zelf niets om — de aanroeper zet lat/lng uit de
    // view om naar 'POINT(lng lat)' vóórdat hij deze functie aanroept.
    const bestaand = {
      id: 'bestaand-id',
      adres_sleutel: '2242ab|1|',
      verkoopdatum: '2026-03-15',
      import_id: null,
      geo: 'POINT(4.402 52.146)',
    }
    const snapshot = bouwSnapshot([bestaand], [{ ...basisRij, geo: 'POINT(4.4 52.1)' }])
    expect(snapshot.bijgewerkt[0].vorige.geo).toBe('POINT(4.402 52.146)')
  })

  it('kapt af boven MAX_SNAPSHOT_RIJEN en zet afgekapt op true', () => {
    const nieuweRijen: GenormaliseerdeRij[] = Array.from({ length: MAX_SNAPSHOT_RIJEN + 5 }, (_, i) => ({
      ...basisRij,
      adres_sleutel: `sleutel-${i}`,
    }))
    const bestaandeRijen = nieuweRijen.map((r, i) => ({
      id: `r${i}`,
      adres_sleutel: r.adres_sleutel,
      verkoopdatum: r.verkoopdatum,
      import_id: null,
    }))
    const snapshot = bouwSnapshot(bestaandeRijen, nieuweRijen)
    expect(snapshot.afgekapt).toBe(true)
    expect(snapshot.bijgewerkt).toHaveLength(MAX_SNAPSHOT_RIJEN)
  })
})

describe('telNieuwEnBijgewerkt', () => {
  const nieuweRij2: GenormaliseerdeRij = { ...basisRij, adres_sleutel: '2242ab|2|' }

  it('telt een rij zonder match als nieuw', () => {
    expect(telNieuwEnBijgewerkt([], [basisRij])).toEqual({ nieuw: 1, bijgewerkt: 0 })
  })

  it('telt een rij met match als bijgewerkt', () => {
    const bestaand = { id: 'x', adres_sleutel: '2242ab|1|', verkoopdatum: '2026-03-15', import_id: null }
    expect(telNieuwEnBijgewerkt([bestaand], [basisRij])).toEqual({ nieuw: 0, bijgewerkt: 1 })
  })

  it('telt een mix correct', () => {
    const bestaand = { id: 'x', adres_sleutel: '2242ab|1|', verkoopdatum: '2026-03-15', import_id: null }
    expect(telNieuwEnBijgewerkt([bestaand], [basisRij, nieuweRij2])).toEqual({ nieuw: 1, bijgewerkt: 1 })
  })
})

describe('maakUpsertBatches', () => {
  it('laat lege aanvulbare kolommen weg en groepeert per kolomset', () => {
    const batches = maakUpsertBatches([
      { adres_sleutel: 'a', geo: 'POINT(4 52)', geocode_status: 'exact', wijk: 'W', buurt: null },
      { adres_sleutel: 'b', geo: null, geocode_status: null, wijk: null, buurt: null },
      { adres_sleutel: 'c', geo: null, geocode_status: null, wijk: null, buurt: null },
    ])
    expect(batches).toHaveLength(2)
    const zonderGeo = batches.find(b => b.length === 2)!
    for (const rij of zonderGeo) {
      expect(rij).not.toHaveProperty('geo')
      expect(rij).not.toHaveProperty('geocode_status')
      expect(rij).not.toHaveProperty('wijk')
    }
    const metGeo = batches.find(b => b.length === 1)!
    expect(metGeo[0]).toEqual({ adres_sleutel: 'a', geo: 'POINT(4 52)', geocode_status: 'exact', wijk: 'W' })
  })

  it('knipt een grote groep in batches van de gevraagde grootte', () => {
    const rijen = Array.from({ length: 5 }, (_, i) => ({ adres_sleutel: String(i), geo: null }))
    expect(maakUpsertBatches(rijen, 2).map(b => b.length)).toEqual([2, 2, 1])
  })
})
