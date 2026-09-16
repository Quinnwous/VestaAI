import { describe, it, expect } from 'vitest'
import { bouwBranding, brandingCssVars, tekstOp, donkerder, lichter, VESTA_MERK } from './branding'

describe('bouwBranding', () => {
  it('valt terug op de VestaAI-stijl zonder kantoorgegevens', () => {
    const b = bouwBranding(null)
    expect(b.primair).toBe(VESTA_MERK.primair)
    expect(b.naam).toBe('VestaAI')
    expect(b.isEigenStijl).toBe(false)
  })

  it('neemt de kleuren van het kantoor over', () => {
    const b = bouwBranding({
      name: 'i4 Housing',
      logo_url: 'https://example.test/logo.png',
      huisstijl_json: { primaire_kleur: '#0089D0', accent_kleur: '#C81E46' },
    })
    expect(b.primair).toBe('#0089D0')
    expect(b.accent).toBe('#C81E46')
    expect(b.naam).toBe('i4 Housing')
    expect(b.isEigenStijl).toBe(true)
  })

  it('negeert een ongeldige kleurwaarde in plaats van een kapot palet te bouwen', () => {
    const b = bouwBranding({ name: 'Kantoor', huisstijl_json: { primaire_kleur: 'blauw' } })
    expect(b.primair).toBe(VESTA_MERK.primair)
  })

  it('leidt een accent af als het kantoor er geen heeft ingesteld', () => {
    const b = bouwBranding({ name: 'Kantoor', huisstijl_json: { primaire_kleur: '#0089D0' } })
    expect(b.accent).toMatch(/^#[0-9A-F]{6}$/i)
    expect(b.accent).not.toBe('#0089D0')
  })

  it('gebruikt een lege kantoornaam niet als merknaam', () => {
    expect(bouwBranding({ name: '   ' }).naam).toBe('VestaAI')
  })
})

describe('tekstOp', () => {
  it('kiest wit op een donkere merkkleur', () => {
    expect(tekstOp('#1A6B45')).toBe('#FFFFFF')
    expect(tekstOp('#0089D0')).toBe('#FFFFFF')
  })

  it('kiest donkere tekst op een lichte merkkleur', () => {
    // Zonder deze regel wordt een kantoor met een geel of lichtgrijs logo onleesbaar.
    expect(tekstOp('#FFD400')).toBe('#0E1A13')
    expect(tekstOp('#F4F4F4')).toBe('#0E1A13')
  })
})

describe('kleurbewerkingen', () => {
  it('maakt donkerder en lichter binnen het geldige bereik', () => {
    expect(donkerder('#0089D0', 0.18)).toMatch(/^#[0-9a-f]{6}$/)
    expect(lichter('#0089D0', 0.92)).toMatch(/^#[0-9a-f]{6}$/)
    expect(donkerder('#000000', 0.5)).toBe('#000000')
    expect(lichter('#FFFFFF', 0.5)).toBe('#ffffff')
  })
})

describe('kantoorbeeld en contactgegevens', () => {
  it('leest sfeerbeeld, telefoon en e-mail uit de huisstijl', () => {
    const b = bouwBranding({
      name: 'i4 Housing',
      huisstijl_json: {
        achtergrond_url: 'https://cdn/team.webp',
        achtergrond_secundair_url: 'https://cdn/pand.webp',
        telefoon: '070-5117571',
        email: 'info@i4housing.nl',
      },
    })
    expect(b.achtergrondUrl).toBe('https://cdn/team.webp')
    expect(b.achtergrondSecundairUrl).toBe('https://cdn/pand.webp')
    expect(b.telefoon).toBe('070-5117571')
    expect(b.email).toBe('info@i4housing.nl')
  })

  it('laat lege waarden null zijn, zodat de balk en het watermerk verdwijnen', () => {
    const b = bouwBranding({ name: 'Kantoor', huisstijl_json: { telefoon: '  ', achtergrond_url: '' } })
    expect(b.telefoon).toBeNull()
    expect(b.achtergrondUrl).toBeNull()
    expect(b.achtergrondSecundairUrl).toBeNull()
  })
})

describe('vormtaal in CSS-variabelen', () => {
  it('zet een strakke huisstijl om naar rechte hoeken zonder cursief of kapitalen', () => {
    const vars = brandingCssVars(bouwBranding({ name: 'i4 Housing', huisstijl_json: { vorm: 'strak', primaire_kleur: '#0080C8' } })) as Record<string, string>
    expect(vars['--merk-radius-md']).toBe('0px')
    expect(vars['--merk-radius-card']).toBe('2px')
    expect(vars['--merk-titel-stijl']).toBe('normal')
    expect(vars['--merk-titel-gewicht']).toBe('700')
    expect(vars['--merk-label-transform']).toBe('none')
  })

  it('houdt VestaAI zijn eigen zachte stijl met cursieve kop en kapitale labels', () => {
    const vars = brandingCssVars(bouwBranding(null)) as Record<string, string>
    expect(vars['--merk-titel-stijl']).toBe('italic')
    expect(vars['--merk-label-transform']).toBe('uppercase')
  })
})
