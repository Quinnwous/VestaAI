import { describe, expect, it } from 'vitest'
import { voegInstellingenSamen } from './instellingenSamenvoegen'

describe('voegInstellingenSamen', () => {
  it('laat velden buiten het formulier (demo) staan', () => {
    const uit = voegInstellingenSamen(
      { demo: true, werkgebied: { plaatsen: ['Oud'] } },
      { werkgebied: { plaatsen: ['Wassenaar'] } },
    )
    expect(uit).toEqual({ demo: true, werkgebied: { plaatsen: ['Wassenaar'] } })
  })

  it('verwijdert een formulierveld dat leeg is gelaten', () => {
    const uit = voegInstellingenSamen(
      { kantoor_aliassen: ['i4 Housing B.V.'], demo: true },
      { kantoor_aliassen: undefined },
    )
    expect(uit).toEqual({ demo: true })
  })

  it('werkt zonder bestaande instellingen', () => {
    expect(voegInstellingenSamen(null, { kantoor_aliassen: ['i4housing'] })).toEqual({ kantoor_aliassen: ['i4housing'] })
  })
})
