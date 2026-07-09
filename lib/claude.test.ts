import { describe, it, expect, vi } from 'vitest'
import { PropertyInputSchema, ContentOutputSchema } from './claude'
import type Anthropic from '@anthropic-ai/sdk'

const validInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype: 'Appartement' as const,
  kamers: 3,
  oppervlak_m2: 85,
  bouwjaar: 1920,
  energielabel: 'C' as const,
  vraagprijs: 450000,
  usps: 'Prachtig uitzicht, gerenoveerde keuken',
  doelgroep: 'Jonge gezinnen',
}

describe('PropertyInputSchema', () => {
  it('accepts valid input', () => {
    expect(() => PropertyInputSchema.parse(validInput)).not.toThrow()
  })

  it('rejects invalid woningtype', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, woningtype: 'Iglo' })
    ).toThrow()
  })

  it('rejects bouwjaar < 1800', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, bouwjaar: 1700 })
    ).toThrow()
  })

  it('rejects bouwjaar > 2025', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, bouwjaar: 2100 })
    ).toThrow()
  })

  it('rejects adres shorter than 5 chars', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, adres: 'AB' })
    ).toThrow()
  })

  it('rejects usps longer than 500 chars', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, usps: 'x'.repeat(501) })
    ).toThrow()
  })
})

describe('ContentOutputSchema', () => {
  it('accepts valid output with all required keys', () => {
    const output = {
      funda_tekst: 'tekst',
      brochure_kort: 'kort',
      brochure_lang: 'lang',
      instagram_emotioneel: 'em',
      instagram_informatief: 'inf',
      instagram_actie: 'act',
      linkedin_kantoor: 'knt',
      linkedin_makelaar: 'mak',
      koper_email: 'mail',
      buurtomschrijving: 'buurt',
    }
    expect(() => ContentOutputSchema.parse(output)).not.toThrow()
  })

  it('rejects output missing a key', () => {
    expect(() =>
      ContentOutputSchema.parse({ funda_tekst: 'tekst' })
    ).toThrow()
  })
})

const validOutput = {
  funda_tekst: 'Prachtig appartement aan de Herengracht...',
  brochure_kort: 'Kort brochure tekst.',
  brochure_lang: 'Uitgebreide brochure tekst.',
  instagram_emotioneel: 'Wonen waar jij van droomt.',
  instagram_informatief: '85m², 3 kamers, energielabel C.',
  instagram_actie: 'Plan nu een bezichtiging!',
  linkedin_kantoor: 'Wij presenteren dit unieke object.',
  linkedin_makelaar: 'Trots dit object te mogen verkopen.',
  koper_email: 'Beste geïnteresseerde...',
  buurtomschrijving: 'De Jordaan is een levendige wijk.',
  open_huis: '',
  bezichtiging_followup_positief: '',
  bezichtiging_followup_negatief: '',
  video_script: '',
}

// generateContent streamt nu (client.messages.stream(...).finalMessage()) i.p.v. create().
// Mock: stream() geeft een object met finalMessage() terug dat het bericht resolvet.
function streamReturning(text: string) {
  return { finalMessage: () => Promise.resolve({ content: [{ type: 'text', text }] }) }
}

describe('generateContent', () => {
  it('parses valid Claude response', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Prachtig uitzicht', doelgroep: 'Jonge gezinnen',
      },
      mockClient,
    )
    expect(result.funda_tekst).toContain('Herengracht')
    expect(result.buurtomschrijving).toContain('Jordaan')
  })

  it('strips markdown code fences', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning('```json\n' + JSON.stringify(validOutput) + '\n```'))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
      },
      mockClient,
    )
    expect(result.funda_tekst).toBeDefined()
  })

  it('retries once on invalid JSON', async () => {
    const mockStream = vi.fn()
      .mockReturnValueOnce(streamReturning('dit is geen json'))
      .mockReturnValueOnce(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
      },
      mockClient,
    )
    expect(mockStream).toHaveBeenCalledTimes(2)
    expect(result.funda_tekst).toBeDefined()
  })

  it('throws after 2 failed attempts', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning('geen json'))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await expect(
      generateContent(
        {
          adres: 'Herengracht 1, Amsterdam', woningtype: 'Appartement', kamers: 3,
          oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
          vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
        },
        mockClient,
      ),
    ).rejects.toThrow('valide JSON')
  })
})
