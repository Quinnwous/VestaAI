import { describe, it, expect } from 'vitest'
import { contentSuiteMail } from './email'

const basis = {
  kantoorNaam: 'i4 Housing',
  kleur: '#007BC0',
  ontvangerNaam: 'Sanne de Vries',
  adres: 'Kerkstraat 1, Wassenaar',
  dossierUrl: 'https://app.voorbeeld.nl/object/abc',
}

describe('contentSuiteMail', () => {
  it('draagt de kantoornaam en merkkleur, met link naar het dossier', () => {
    const mail = contentSuiteMail(basis)
    expect(mail.subject).toBe('Contentsuite: Kerkstraat 1, Wassenaar')
    expect(mail.html).toContain('i4 Housing')
    expect(mail.html).toContain('#007BC0')
    expect(mail.html).toContain('https://app.voorbeeld.nl/object/abc')
    expect(mail.text).toContain('https://app.voorbeeld.nl/object/abc')
  })

  it('spreekt de collega informeel aan bij de voornaam', () => {
    const mail = contentSuiteMail(basis)
    expect(mail.html).toContain('Hoi Sanne,')
    expect(mail.text).not.toMatch(/ u | uw /)
  })

  it('noemt de productnaam niet (de mail komt van het kantoor)', () => {
    const mail = contentSuiteMail(basis)
    expect(mail.html).not.toContain('VestaAI')
    expect(mail.text).not.toContain('VestaAI')
  })

  it('escapet het adres en valt terug op "Hoi," zonder naam', () => {
    const mail = contentSuiteMail({ ...basis, adres: 'Laan <1> & co', ontvangerNaam: null })
    expect(mail.html).toContain('Laan &lt;1&gt; &amp; co')
    expect(mail.html).toContain('Hoi,')
  })
})
