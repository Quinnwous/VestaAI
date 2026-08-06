import { afterEach, describe, expect, it, vi } from 'vitest'
import { cbsRegioCode, fetchVerrijking, verrijkingNaarPrompt } from './verrijking'

// De verrijkingslaag mag nooit een gemeentecijfer als buurtfeit presenteren — CBS
// onderdrukt cijfers voor kleine gebieden, dus per indicator zakken we naar het
// eerstvolgende niveau. Deze tests bewaken dat gedrag én de labeling ervan.

const PDOK_HIT = {
  response: {
    docs: [{
      centroide_ll: 'POINT(4.883 52.375)',
      buurtcode: 'BU0363AC02',
      buurtnaam: 'Leliegracht e.o.',
      wijkcode: 'WK0363AC',
      wijknaam: 'Grachtengordel-West',
      gemeentecode: '0363',
      gemeentenaam: 'Amsterdam',
      adresseerbaarobject_id: '0363010000000001',
    }],
  },
}

/** Alleen de velden die de code uitleest; de rest laat CBS ook echt weg bij $select. */
function cbsRij(code: string, velden: Record<string, number | string | null>) {
  return {
    WijkenEnBuurten: code.padEnd(10, ' '),
    Gemeentenaam_1: 'Amsterdam                               ',
    AantalInwoners_5: 1000,
    k_65JaarOfOuder_12: null,
    HuishoudensTotaal_29: null,
    HuishoudensMetKinderen_32: null,
    GemiddeldeHuishoudensgrootte_33: null,
    Bevolkingsdichtheid_34: null,
    GemiddeldeWOZWaardeVanWoningen_39: null,
    PercentageEengezinswoning_40: null,
    Koopwoningen_47: null,
    BouwjaarAfgelopenTienJaar_52: null,
    BasisonderwijsVmboMbo1_67: null,
    HavoVwoMbo24_68: null,
    HboWo_69: null,
    GemiddeldInkomenPerInwoner_78: null,
    ...velden,
  }
}

/** Routeert per host, zodat alleen CBS per test verschilt en de rest stil faalt. */
function mockFetch(cbsRijen: unknown[] | null) {
  return vi.fn(async (url: string | URL) => {
    const href = typeof url === 'string' ? url : url.toString()
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

    if (href.includes('api.pdok.nl')) return ok(PDOK_HIT)
    if (href.includes('opendata.cbs.nl')) {
      if (cbsRijen === null) return new Response('kapot', { status: 500 })
      return ok({ value: cbsRijen })
    }
    // WOZ en Overpass horen stilzwijgend te falen zonder de rest te blokkeren.
    return new Response('nee', { status: 503 })
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('cbsRegioCode', () => {
  it('vult codes rechts aan tot 10 tekens, want anders matcht CBS het filter niet', () => {
    expect(cbsRegioCode('GM0363')).toBe('GM0363    ')
    expect(cbsRegioCode('WK0363AC')).toBe('WK0363AC  ')
    expect(cbsRegioCode('BU0363AC02')).toBe('BU0363AC02')
  })
})

describe('CBS-cascade', () => {
  it('gebruikt het buurtcijfer waar CBS het publiceert', async () => {
    vi.stubGlobal('fetch', mockFetch([
      cbsRij('BU0363AC02', { GemiddeldeWOZWaardeVanWoningen_39: 900, Koopwoningen_47: 40 }),
      cbsRij('WK0363AC', { GemiddeldeWOZWaardeVanWoningen_39: 892 }),
      cbsRij('GM0363', { GemiddeldeWOZWaardeVanWoningen_39: 498 }),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378 }),
    ]))

    const v = await fetchVerrijking('Prinsengracht 263 Amsterdam')

    expect(v.cbs?.woz_gem).toEqual({ waarde: 900_000, niveau: 'buurt' })
    expect(v.cbs?.buurtnaam).toBe('Leliegracht e.o.')
    expect(v.cbs?.nl.woz_gem).toBe(378_000)
  })

  it('zakt per indicator afzonderlijk naar wijk of gemeente als CBS de buurt onderdrukt', async () => {
    vi.stubGlobal('fetch', mockFetch([
      // Buurt heeft wél WOZ, géén inkomen — precies het echte CBS-gedrag.
      cbsRij('BU0363AC02', { GemiddeldeWOZWaardeVanWoningen_39: 900, GemiddeldInkomenPerInwoner_78: null }),
      cbsRij('WK0363AC', { GemiddeldInkomenPerInwoner_78: 65.8 }),
      cbsRij('GM0363', { GemiddeldInkomenPerInwoner_78: 41.0, Koopwoningen_47: 30 }),
      cbsRij('NL00', { GemiddeldInkomenPerInwoner_78: 34.9, GemiddeldeWOZWaardeVanWoningen_39: 378 }),
    ]))

    const v = await fetchVerrijking('Prinsengracht 263 Amsterdam')

    expect(v.cbs?.woz_gem?.niveau).toBe('buurt')
    expect(v.cbs?.inkomen).toEqual({ waarde: 65_800, niveau: 'wijk' })
    expect(v.cbs?.pct_koop).toEqual({ waarde: 30, niveau: 'gemeente' })
  })

  it('laat een indicator weg in plaats van een cijfer te verzinnen', async () => {
    vi.stubGlobal('fetch', mockFetch([
      cbsRij('BU0363AC02', { GemiddeldeWOZWaardeVanWoningen_39: 900 }),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378 }),
    ]))

    const v = await fetchVerrijking('Prinsengracht 263 Amsterdam')

    expect(v.cbs?.pct_eengezins).toBeNull()
    expect(v.cbs?.huishoudensgrootte).toBeNull()
  })

  it('berekent opleidingsniveau als aandeel binnen één gebiedsniveau', async () => {
    vi.stubGlobal('fetch', mockFetch([
      cbsRij('BU0363AC02', { BasisonderwijsVmboMbo1_67: 200, HavoVwoMbo24_68: 300, HboWo_69: 500 }),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378 }),
    ]))

    const v = await fetchVerrijking('Prinsengracht 263 Amsterdam')

    expect(v.cbs?.pct_hoog_opgeleid).toEqual({ waarde: 50, niveau: 'buurt' })
  })

  it('levert geen buurtdata als CBS onbereikbaar is, in plaats van verouderde cijfers', async () => {
    vi.stubGlobal('fetch', mockFetch(null))

    const v = await fetchVerrijking('Prinsengracht 263 Amsterdam')

    expect(v.cbs).toBeNull()
    expect(v.gemeente).toBe('Amsterdam')  // de rest van de verrijking blijft werken
  })
})

describe('verrijkingNaarPrompt', () => {
  it('zet het gebiedsniveau bij elk cijfer en waarschuwt tegen gebruik als buurtfeit', async () => {
    vi.stubGlobal('fetch', mockFetch([
      cbsRij('BU0363AC02', { GemiddeldeWOZWaardeVanWoningen_39: 900 }),
      cbsRij('GM0363', { GemiddeldInkomenPerInwoner_78: 41.0 }),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378, GemiddeldInkomenPerInwoner_78: 34.9 }),
    ]))

    const prompt = verrijkingNaarPrompt(await fetchVerrijking('Prinsengracht 263 Amsterdam'))

    expect(prompt).toContain('gemiddelde WOZ €900.000 (buurtcijfer)')
    expect(prompt).toContain('gemiddeld inkomen €41.000/inwoner (gemeentecijfer)')
    expect(prompt).toContain('mag je niet als buurtfeit presenteren')
    expect(prompt).toContain('Landelijk gemiddelde ter vergelijking')
  })

  it('vergelijkt niet met zichzelf: puur landelijke cijfers scoren geen buurtprofiel', async () => {
    // Alleen een gemeenterij zonder cijfers → alles valt terug op NL00.
    vi.stubGlobal('fetch', mockFetch([
      cbsRij('GM0363', {}),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378, GemiddeldInkomenPerInwoner_78: 34.9 }),
    ]))

    const v = await fetchVerrijking('Prinsengracht 263 Amsterdam')

    expect(v.cbs?.woz_gem?.niveau).toBe('nederland')
    expect(v.cbs?.buurtprofiel).toBe('Gemiddeld')
  })
})

describe('marktprofiel-fallback', () => {
  /** Zelfde mock, maar met een gemeente die niet in GEMEENTE_TYPE_MAP staat. */
  function mockVoorGemeente(gemeentenaam: string, cbsRijen: unknown[]) {
    const pdok = structuredClone(PDOK_HIT)
    pdok.response.docs[0].gemeentenaam = gemeentenaam
    const basis = mockFetch(cbsRijen)
    return vi.fn(async (url: string | URL) => {
      const href = typeof url === 'string' ? url : url.toString()
      if (href.includes('api.pdok.nl')) return new Response(JSON.stringify(pdok), { status: 200 })
      return basis(url)
    })
  }

  it('classificeert een dure gemeente buiten de lijst als premium in plaats van landelijk', async () => {
    // Oegstgeest: WOZ €566k op een landelijk gemiddelde van €378k (CBS 2024).
    vi.stubGlobal('fetch', mockVoorGemeente('Oegstgeest', [
      cbsRij('GM0363', { GemiddeldeWOZWaardeVanWoningen_39: 566, Bevolkingsdichtheid_34: 3557 }),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378 }),
    ]))

    const v = await fetchVerrijking('Dorpsstraat 1 Oegstgeest')

    expect(v.markt?.gemeente_type).toBe('premium')
    expect(v.markt?.herkomst).toBe('afgeleid')
  })

  it('classificeert de gemeente op het gemeentecijfer, niet op een dure buurt erbinnen', async () => {
    // Grachtenpand van €900k in een gemeente die op €300k zit: het markttype hoort
    // de gemeente te volgen, anders krijgt elke dure buurt premium-verkoopadvies.
    vi.stubGlobal('fetch', mockVoorGemeente('Beekdaelen', [
      cbsRij('BU0363AC02', { GemiddeldeWOZWaardeVanWoningen_39: 900 }),
      cbsRij('GM0363', { GemiddeldeWOZWaardeVanWoningen_39: 300, Bevolkingsdichtheid_34: 400 }),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378 }),
    ]))

    const v = await fetchVerrijking('Dorpsstraat 1 Beekdaelen')

    expect(v.cbs?.woz_gem).toEqual({ waarde: 900_000, niveau: 'buurt' })
    expect(v.markt?.gemeente_type).toBe('landelijk')
  })

  it('houdt de expliciete gemeentelijst leidend boven de afgeleide classificatie', async () => {
    vi.stubGlobal('fetch', mockFetch([
      cbsRij('GM0363', { GemiddeldeWOZWaardeVanWoningen_39: 498, Bevolkingsdichtheid_34: 4950 }),
      cbsRij('NL00', { GemiddeldeWOZWaardeVanWoningen_39: 378 }),
    ]))

    const v = await fetchVerrijking('Prinsengracht 263 Amsterdam')

    expect(v.markt?.gemeente_type).toBe('randstadcentrum')
    expect(v.markt?.herkomst).toBe('lijst')
  })
})
