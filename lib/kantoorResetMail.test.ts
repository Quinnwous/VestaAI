import { describe, it, expect } from 'vitest'
import { bouwKantoorResetMail } from './kantoorResetMail'

const basisInput = {
  naam: 'i4 Housing',
  logoUrl: 'https://storage.example/i4housing/logo.png',
  kleur: '#0080C8',
  opKleur: '#FFFFFF',
  // Bewust géén vestaai.nl-domein hier: deze test controleert de zichtbare
  // tekst van het sjabloon, niet het (technische, onvermijdelijk
  // vestaai.nl-gehoste) reset-linkdomein zelf.
  resetUrl: 'https://app.voorbeeldkantoor.nl/auth/reset-password?token_hash=abc&type=recovery&next=i4housing',
}

describe('bouwKantoorResetMail', () => {
  it('bevat de kantoornaam, de merkkleur en de reset-link', () => {
    const mail = bouwKantoorResetMail(basisInput)
    expect(mail.html).toContain('i4 Housing')
    expect(mail.html).toContain('#0080C8')
    // De href zelf staat HTML-geëscaped (& → &amp;) — de tekstversie niet.
    expect(mail.html).toContain(basisInput.resetUrl.replace(/&/g, '&amp;'))
    expect(mail.text).toContain(basisInput.resetUrl)
    expect(mail.subject).toContain('i4 Housing')
  })

  it('toont het logo als <img> wanneer logoUrl gezet is', () => {
    const mail = bouwKantoorResetMail(basisInput)
    expect(mail.html).toContain(`<img src="${basisInput.logoUrl}"`)
  })

  it('valt terug op een tekstwordmerk zonder logo, geen kapotte <img>', () => {
    const mail = bouwKantoorResetMail({ ...basisInput, logoUrl: null })
    expect(mail.html).not.toContain('<img')
    expect(mail.html).toContain('i4 Housing')
  })

  it('noemt nergens "VestaAI" — de kantoormail is van het kantoor, niet van het platform', () => {
    const mail = bouwKantoorResetMail(basisInput)
    expect(mail.html.toLowerCase()).not.toContain('vestaai')
    expect(mail.text.toLowerCase()).not.toContain('vestaai')
  })

  it('gebruikt "je/jouw" (informeel), niet "u/uw" — kantoorlogin is informeel', () => {
    const mail = bouwKantoorResetMail(basisInput)
    expect(mail.text).toContain('Je hebt')
    expect(mail.text).not.toMatch(/\bu\b|\buw\b/i)
  })

  it('escaped een kwaadaardige kantoornaam (geen HTML-injectie)', () => {
    const mail = bouwKantoorResetMail({ ...basisInput, naam: '<script>alert(1)</script>' })
    expect(mail.html).not.toContain('<script>alert(1)</script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('valt terug op "je kantoor" bij een lege naam', () => {
    const mail = bouwKantoorResetMail({ ...basisInput, naam: '   ' })
    expect(mail.subject).toContain('je kantoor')
  })

  it('gebruikt de meegegeven contrastkleur voor de knoptekst', () => {
    const donker = bouwKantoorResetMail({ ...basisInput, kleur: '#F5D300', opKleur: '#0E1A13' })
    expect(donker.html).toContain('color:#0E1A13')
  })
})
