import { describe, it, expect, vi } from 'vitest'
import { PropertyInputSchema, ContentOutputSchema } from './claude'
import type Anthropic from '@anthropic-ai/sdk'
import type { HuisstijlConfig } from './schemas'
import { bouwFeitenblad } from './kwartaalbericht'

const validInput = {
  adres: 'Herengracht 1, Amsterdam',
  woningtype_groep: 'appartement' as const,
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

  it('rejects invalid woningtype_groep', () => {
    expect(() =>
      PropertyInputSchema.parse({ ...validInput, woningtype_groep: 'Iglo' })
    ).toThrow()
  })

  it('migreert de oude woningtype-enum naar woningtype_groep/woningtype_sub', () => {
    const oud: Record<string, unknown> = { ...validInput, woningtype: 'Villa' }
    delete oud.woningtype_groep
    const geparsed = PropertyInputSchema.parse(oud)
    expect(geparsed.woningtype_groep).toBe('vrijstaand')
    expect(geparsed.woningtype_sub).toBe('Villa')
  })

  it('accepteert usps en doelgroep ontbrekend (verkoopadviesfase, item 3.2)', () => {
    const zonderVerhaal: Record<string, unknown> = { ...validInput }
    delete zonderVerhaal.usps
    delete zonderVerhaal.doelgroep
    expect(() => PropertyInputSchema.parse(zonderVerhaal)).not.toThrow()
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
        adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3,
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
        adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3,
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
        adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3,
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
          adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3,
          oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
          vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
        },
        mockClient,
      ),
    ).rejects.toThrow('valide JSON')
  })
})

describe('generateContent — content_keuzes (F8)', () => {
  it('houdt alleen de aangevinkte optionele velden, kernvelden blijven altijd staan', async () => {
    const volledigeOutput = {
      ...validOutput,
      bezichtiging_followup_positief: 'follow-up tekst',
      bezichtiging_followup_negatief: 'follow-up tekst 2',
      video_script: 'video tekst',
      energie_advies: 'energie tekst',
      kopersvragen_faq: 'faq tekst',
      marktanalyse: 'markt tekst',
    }
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(volledigeOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
        content_keuzes: ['video'],
      },
      mockClient,
    )

    expect(result.video_script).toBe('video tekst')
    expect(result.energie_advies).toBe('')
    expect(result.kopersvragen_faq).toBe('')
    expect(result.marktanalyse).toBe('')
    expect(result.bezichtiging_followup_positief).toBe('')
    // Kernvelden blijven altijd staan, ongeacht content_keuzes.
    expect(result.funda_tekst).toContain('Herengracht')
  })

  it('laat alles staan als content_keuzes ontbreekt (bestaande dossiers)', async () => {
    const volledigeOutput = { ...validOutput, video_script: 'video tekst' }
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(volledigeOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(
      {
        adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement', kamers: 3,
        oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C',
        vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
      },
      mockClient,
    )
    expect(result.video_script).toBe('video tekst')
  })
})

describe('generateContentBeideTalen', () => {
  const inputBasis = {
    adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement' as const, kamers: 3,
    oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C' as const,
    vraagprijs: 450000, usps: 'Prachtig uitzicht', doelgroep: 'Jonge gezinnen',
  }

  it('genereert nl en en parallel en levert beide', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContentBeideTalen } = await import('./claude')
    const result = await generateContentBeideTalen(inputBasis, undefined, undefined, undefined, mockClient)

    expect(result.nl.funda_tekst).toContain('Herengracht')
    expect(result.en).not.toBeNull()
    expect(mockStream).toHaveBeenCalledTimes(2)
  })

  it('geeft nl terug ook als de engelse generatie mislukt (best-effort)', async () => {
    let call = 0
    const mockStream = vi.fn().mockImplementation(() => {
      call++
      // Eerste call (nl) slaagt; alle volgende pogingen (en, incl. retry) falen.
      return call === 1 ? streamReturning(JSON.stringify(validOutput)) : streamReturning('geen json')
    })
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContentBeideTalen } = await import('./claude')
    const result = await generateContentBeideTalen(inputBasis, undefined, undefined, undefined, mockClient)

    expect(result.nl.funda_tekst).toContain('Herengracht')
    expect(result.en).toBeNull()
  })
})

// Vorm van het stukje request dat generateContent naar client.messages.stream stuurt —
// alleen het veld dat deze tests nodig hebben (item 8.1, prompt caching).
type GevangenSysteemAanroep = {
  system: { type: string; text: string; cache_control?: { type: 'ephemeral' } }[]
}

describe('cache_control op het systeemprompt (prompt caching, item 8.1)', () => {
  // Realistische i4housing-achtige huisstijl: stijlprofiel + 3 voorbeeldteksten op hun
  // schemamaximum (elk 2000 tekens, zie HuisstijlSchema in lib/schemas.ts) — dit is de
  // vorm die een echt geconfigureerd kantoor (met voorbeeldteksten) oplevert.
  const huisstijl: HuisstijlConfig = {
    schrijftoon: 'enthousiast',
    slogan: 'Wonen met een glimlach',
    primaire_kleur: '#0080C8',
    accent_kleur: '#C61E45',
    voorbeelden: [
      'Prachtig gelegen woning met veel lichtinval. '.repeat(50).slice(0, 2000),
      'Ruime living met openslaande deuren naar de tuin. '.repeat(50).slice(0, 2000),
      'Sfeervolle keuken met alle gemakken. '.repeat(60).slice(0, 2000),
    ],
    stijlprofiel: 'Schrijf warm en persoonlijk, gebruik korte zinnen en vermijd jargon. '.repeat(60).slice(0, 4000),
    geleerde_regels: 'Gebruik altijd "wij" in plaats van "ik". '.repeat(20).slice(0, 1000),
  }

  const inputBasis = {
    adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement' as const, kamers: 3,
    oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C' as const,
    vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
  }

  it('plaatst een cache_control-breekpunt op zowel het huisstijlblok als het taalspecifieke blok', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent({ ...inputBasis, taal: 'nl' }, huisstijl, mockClient)

    const call = mockStream.mock.calls[0][0] as unknown as GevangenSysteemAanroep
    expect(Array.isArray(call.system)).toBe(true)
    expect(call.system).toHaveLength(2)
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(call.system[1].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('deelt een byte-identiek huisstijlblok tussen een NL- en een EN-aanroep voor hetzelfde kantoor', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent({ ...inputBasis, taal: 'nl' }, huisstijl, mockClient)
    await generateContent({ ...inputBasis, taal: 'en' }, huisstijl, mockClient)

    const [nlCall, enCall] = mockStream.mock.calls.map(c => c[0] as unknown as GevangenSysteemAanroep)
    expect(nlCall.system[0].text).toBe(enCall.system[0].text)
    // De taalspecifieke blokken (BASE_SYSTEM_PROMPT_NL/_EN) moeten juist wél verschillen —
    // dat is precies het deel dat ná het gedeelde cache-breekpunt hoort te staan.
    expect(nlCall.system[1].text).not.toBe(enCall.system[1].text)
  })

  it('het gedeelde huisstijlblok haalt naar schatting de minimale cachebare lengte voor claude-sonnet-4-6 (1024 tokens)', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent({ ...inputBasis, taal: 'nl' }, huisstijl, mockClient)

    const call = mockStream.mock.calls[0][0] as unknown as GevangenSysteemAanroep
    const gedeeldBlok = call.system[0].text
    // Ruwe, behoudende schatting (≥4 tekens/token — Nederlandse tekst zit doorgaans
    // dichter bij 3-3,5 tekens/token, dus dit onderschat het werkelijke aantal tokens).
    // Een live count_tokens-call (gratis endpoint) op precies dit blok mat 3373 tokens —
    // zie de kanttekening bij buildSystemPromptBlokken in lib/claude.ts en het eindrapport.
    expect(gedeeldBlok.length / 4).toBeGreaterThan(1024)
  })

  it('zonder geconfigureerde huisstijl is er precies één (taalspecifiek) systeemblok', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent({ ...inputBasis, taal: 'nl' }, undefined, mockClient)

    const call = mockStream.mock.calls[0][0] as unknown as GevangenSysteemAanroep
    expect(call.system).toHaveLength(1)
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('een bijgevoegd document komt als apart, ongecacht derde blok ná de twee cachebare blokken', async () => {
    const mockBetaStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = {
      messages: { stream: vi.fn() },
      beta: { messages: { stream: mockBetaStream } },
    } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent({ ...inputBasis, taal: 'nl' }, huisstijl, mockClient, undefined, ['file-123'])

    const call = mockBetaStream.mock.calls[0][0] as unknown as GevangenSysteemAanroep
    expect(call.system).toHaveLength(3)
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' }) // huisstijl
    expect(call.system[1].cache_control).toEqual({ type: 'ephemeral' }) // taalspecifiek
    expect(call.system[2].cache_control).toBeUndefined() // documenten-instructie, per-aanvraag
  })
})

describe('schrijfKwartaalbericht (item 6.4)', () => {
  const feitenblad = bouwFeitenblad({
    samenvatting: {
      huidig: { van: '2024-10-01', tot: '2026-09-20', n: 47, mediaanPrijs: 852_000, mediaanM2: 5_430, mediaanLooptijd: 34, pctTovVraag: 2.1 },
      vorig: { van: '2022-10-01', tot: '2024-09-30', n: 40, mediaanPrijs: 810_000, mediaanM2: 5_100, mediaanLooptijd: 38, pctTovVraag: 1.5 },
    },
    dataTotEnMet: '2026-09-20',
    contextLabel: 'Wassenaar · Vrijstaand · laatste 24 maanden',
    periodeMaanden: 24,
    eigenAandeel: { nEigenHuidig: 9, nEigenVorig: 7 },
  })

  function textResponse(tekst: string) {
    return { content: [{ type: 'text', text: tekst }] }
  }

  it('geeft de tekst terug zodra die de guardrail doorstaat (eerste poging)', async () => {
    const geldigeTekst = 'De mediaan verkoopprijs kwam uit op € 852.000, een stijging van 5,2%. Er werden 47 transacties geregistreerd, waarvan 9 door ons kantoor. De mediaan looptijd was 34 dagen.'
    const create = vi.fn().mockResolvedValue(textResponse(geldigeTekst))
    const mockClient = { messages: { create } } as unknown as Anthropic

    const { schrijfKwartaalbericht } = await import('./claude')
    const result = await schrijfKwartaalbericht(feitenblad, { taal: 'nl' }, mockClient)

    expect(result.tekst).toBe(geldigeTekst)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('probeert één keer opnieuw als de eerste poging een verzonnen getal bevat, en accepteert een geldige herkansing', async () => {
    const foutieveTekst = 'De mediaan verkoopprijs kwam uit op € 999.999 dit kwartaal.'
    const geldigeTekst = 'De mediaan verkoopprijs kwam uit op € 852.000 dit kwartaal.'
    const create = vi.fn()
      .mockResolvedValueOnce(textResponse(foutieveTekst))
      .mockResolvedValueOnce(textResponse(geldigeTekst))
    const mockClient = { messages: { create } } as unknown as Anthropic

    const { schrijfKwartaalbericht } = await import('./claude')
    const result = await schrijfKwartaalbericht(feitenblad, { taal: 'nl' }, mockClient)

    expect(result.tekst).toBe(geldigeTekst)
    expect(create).toHaveBeenCalledTimes(2)
    // De herkansing bevat een correctie-instructie met het verzonnen getal.
    const tweedeAanroep = create.mock.calls[1][0] as { system: string }
    expect(tweedeAanroep.system).toContain('999.999')
  })

  it('geeft een eerlijke foutmelding als ook de herkansing een verzonnen getal bevat', async () => {
    const foutieveTekst = 'De mediaan verkoopprijs kwam uit op € 999.999 dit kwartaal.'
    const create = vi.fn().mockResolvedValue(textResponse(foutieveTekst))
    const mockClient = { messages: { create } } as unknown as Anthropic

    const { schrijfKwartaalbericht } = await import('./claude')
    await expect(schrijfKwartaalbericht(feitenblad, { taal: 'nl' }, mockClient)).rejects.toThrow(/feitenblad/i)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('stuurt het feitenblad en de kantoornaam mee in de systeemprompt', async () => {
    const create = vi.fn().mockResolvedValue(textResponse('De mediaan verkoopprijs kwam uit op € 852.000.'))
    const mockClient = { messages: { create } } as unknown as Anthropic

    const { schrijfKwartaalbericht } = await import('./claude')
    await schrijfKwartaalbericht(feitenblad, { taal: 'nl', kantoorNaam: 'Makelaardij De Vries' }, mockClient)

    const aanroep = create.mock.calls[0][0] as { system: string }
    expect(aanroep.system).toContain('Makelaardij De Vries')
    expect(aanroep.system).toContain(feitenblad.tekst)
  })
})
