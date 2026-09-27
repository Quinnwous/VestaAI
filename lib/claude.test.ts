import { describe, it, expect, vi } from 'vitest'
import { PropertyInputSchema, ContentOutputSchema } from './claude'
import type Anthropic from '@anthropic-ai/sdk'
import type { HuisstijlConfig } from './schemas'
import { bouwFeitenblad } from './kwartaalbericht'
import { CONTENT } from './aiModellen'

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
  it('accepts a valid kern-only output (item 8.3, outputset v2)', () => {
    const output = {
      funda_tekst: 'tekst',
      koper_email: 'mail',
      buurtomschrijving: 'buurt',
      linkedin_kantoor: 'knt',
    }
    expect(() => ContentOutputSchema.parse(output)).not.toThrow()
  })

  it('vult ontbrekende kern-/extra-velden aan met een lege string (defaults)', () => {
    const output = ContentOutputSchema.parse({
      funda_tekst: 'tekst',
      koper_email: 'mail',
      buurtomschrijving: 'buurt',
      linkedin_kantoor: 'knt',
    })
    expect(output.brochure_tekst).toBe('')
    expect(output.instagram).toBe('')
    expect(output.sneak_preview).toBe('')
    expect(output.open_huis).toBe('')
    expect(output.followup_positief).toBe('')
    expect(output.followup_negatief).toBe('')
    expect(output.video_script).toBe('')
    expect(output.energie_advies).toBe('')
    expect(output.kopersvragen_faq).toBe('')
  })

  it('rejects output missing a required key', () => {
    expect(() =>
      ContentOutputSchema.parse({ funda_tekst: 'tekst' })
    ).toThrow()
  })

  it('parseert een oud dossier (vóór item 8.3) zonder te gooien — backcompat', () => {
    // Vorm van outputs_json zoals die vóór de outputset-v2 werd opgeslagen:
    // brochure_kort/lang, drie Instagram-varianten, linkedin_makelaar,
    // bezichtiging_followup_*, marktanalyse — geen van de nieuwe kernvelden.
    const oudDossier = {
      funda_tekst: 'Oude funda-tekst.',
      brochure_kort: 'Kort.',
      brochure_lang: 'Lang.',
      instagram_emotioneel: 'Emotioneel.',
      instagram_informatief: 'Informatief.',
      instagram_actie: 'Actie.',
      linkedin_kantoor: 'Kantoor.',
      linkedin_makelaar: 'Makelaar.',
      koper_email: 'Mail.',
      buurtomschrijving: 'Buurt.',
      open_huis: '',
      bezichtiging_followup_positief: 'Follow-up.',
      bezichtiging_followup_negatief: '',
      video_script: '',
      energie_advies: '',
      kopersvragen_faq: '',
      marktanalyse: 'Markt.',
    }
    const geparsed = ContentOutputSchema.parse(oudDossier)
    // Nieuwe kernvelden ontbraken in het oude dossier → default leeg.
    expect(geparsed.brochure_tekst).toBe('')
    expect(geparsed.instagram).toBe('')
    expect(geparsed.sneak_preview).toBe('')
    // Vervallen sleutels blijven wel toegankelijk op het geparste object (voor
    // backcompat-weergave, zie ResultTabs.tsx metLegacyFallback).
    expect(geparsed.brochure_lang).toBe('Lang.')
    expect(geparsed.instagram_emotioneel).toBe('Emotioneel.')
    expect(geparsed.bezichtiging_followup_positief).toBe('Follow-up.')
    expect(geparsed.marktanalyse).toBe('Markt.')
  })
})

// Outputset v2 (item 8.3): kern-only fixture — funda_tekst, brochure_tekst,
// instagram, linkedin_kantoor, sneak_preview, koper_email, buurtomschrijving.
const validOutput = {
  funda_tekst: 'Prachtig appartement aan de Herengracht...',
  brochure_tekst: 'Uitgebreide brochuretekst.',
  instagram: 'Wonen waar jij van droomt. #Herengracht',
  linkedin_kantoor: 'Wij presenteren dit unieke object.',
  sneak_preview: 'Nieuw: Herengracht 1. Stuur ons een bericht!',
  koper_email: 'Beste geïnteresseerde...',
  buurtomschrijving: 'De Jordaan is een levendige wijk.',
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

// Vorm van het stukje request dat generateContent naar client.messages.stream stuurt.
type GevangenAanroep = { system: { type: string; text: string }[] }

describe('generateContent — kern-only prompt (item 8.3, outputset v2)', () => {
  const inputBasis = {
    adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement' as const, kamers: 3,
    oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C' as const,
    vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
  }

  it('vraagt in het NL-systeemprompt alleen de zeven kernsleutels, geen extra-velden', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent(inputBasis, undefined, mockClient)

    const call = mockStream.mock.calls[0][0] as GevangenAanroep
    const systeemtekst = call.system.map(b => b.text).join('\n')
    for (const kern of ['funda_tekst', 'brochure_tekst', 'instagram', 'linkedin_kantoor', 'sneak_preview', 'koper_email', 'buurtomschrijving']) {
      expect(systeemtekst).toContain(kern)
    }
    // De extra-velden (nu losse calls via genereerExtraContent) horen niet meer
    // in de kern-prompt.
    for (const extra of ['open_huis', 'followup_positief', 'followup_negatief', 'video_script', 'kopersvragen_faq', 'energie_advies']) {
      expect(systeemtekst).not.toContain(extra)
    }
  })

  it('vraagt in het EN-systeemprompt geen sneak_preview (NL-only veld)', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify({ ...validOutput, sneak_preview: undefined })))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent({ ...inputBasis, taal: 'en' }, undefined, mockClient)

    const call = mockStream.mock.calls[0][0] as GevangenAanroep
    const systeemtekst = call.system.map(b => b.text).join('\n')
    expect(systeemtekst).not.toContain('"sneak_preview"')
    expect(result.sneak_preview).toBe('')
  })

  it('gebruikt KERN_MAX_TOKENS, een fractie van de oude 16000 voor de volledige 17-veldensuite', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(validOutput)))
    const mockClient = { messages: { stream: mockStream } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent(inputBasis, undefined, mockClient)

    const call = mockStream.mock.calls[0][0] as unknown as { max_tokens: number }
    expect(call.max_tokens).toBeLessThan(16000)
    expect(call.max_tokens).toBeGreaterThanOrEqual(3000)
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

describe('generateContent — tekstsjabloon-validatie en -herkansing (item 8.2)', () => {
  const sjabloon: HuisstijlConfig['tekstsjabloon'] = {
    opening_label: '4SALE!',
    secties: [
      { kop: 'WOONCOMFORT', instructie: 'Beschrijf de indeling en de keuken.' },
      { kop: 'BUITENLEVEN', instructie: 'Beschrijf tuin en buitenruimte.' },
      { kop: 'LOCATIE', instructie: 'Beschrijf de buurt.' },
      { kop: 'GOED OM TE WETEN', instructie: 'Korte bulletpoints die beginnen met "- ".' },
    ],
    slotzin: 'Enthousiast over deze woning? Neem contact op met ons kantoor. Wij plannen graag een afspraak met je in.',
    doel_woorden: 480,
  }
  const huisstijlMetSjabloon: HuisstijlConfig = {
    schrijftoon: 'informeel',
    slogan: '',
    primaire_kleur: '#0080C8',
    voorbeelden: [],
    tekstsjabloon: sjabloon,
  }

  const inputBasis = {
    adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement' as const, kamers: 3,
    oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C' as const,
    vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
  }

  const CONFORME_FUNDA_TEKST = `4SALE!\nEen heerlijke woning.\n\nWOONCOMFORT\nRuime living.\n\nBUITENLEVEN\nZonnige tuin.\n\nLOCATIE\nVlakbij het centrum.\n\nGOED OM TE WETEN\n- Bouwjaar 1920\n\nEnthousiast over deze woning? Neem contact op met ons kantoor. Wij plannen graag een afspraak met je in.`
  const AFWIJKENDE_FUNDA_TEKST = 'Een heerlijke woning zonder enig sjabloon.'

  // Sinds item 8.3 gebruikt de gerichte herkansing client.messages.create()
  // (platte tekst, geen JSON) i.p.v. nog een keer client.messages.stream()
  // met de hele kern-suite — vandaar dat elke test hieronder ook een
  // create()-mock meegeeft.
  function createReturning(text: string) {
    return Promise.resolve({ content: [{ type: 'text', text }] })
  }

  it('accepteert direct als funda_tekst het sjabloon al volgt — geen herkansing nodig', async () => {
    const output = { ...validOutput, funda_tekst: CONFORME_FUNDA_TEKST }
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify(output)))
    const mockCreate = vi.fn()
    const mockClient = { messages: { stream: mockStream, create: mockCreate } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(inputBasis, huisstijlMetSjabloon, mockClient)

    expect(mockStream).toHaveBeenCalledTimes(1)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(result.funda_tekst).toBe(CONFORME_FUNDA_TEKST)
  })

  it('herkanst gericht — alleen funda_tekst via een kleine create()-call — als het sjabloon niet gevolgd wordt', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify({ ...validOutput, funda_tekst: AFWIJKENDE_FUNDA_TEKST })))
    const mockCreate = vi.fn().mockReturnValue(createReturning(CONFORME_FUNDA_TEKST))
    const mockClient = { messages: { stream: mockStream, create: mockCreate } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(inputBasis, huisstijlMetSjabloon, mockClient)

    // De kern-call draait maar één keer — niet meer de hele suite opnieuw.
    expect(mockStream).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(result.funda_tekst).toBe(CONFORME_FUNDA_TEKST)
    // De rest van de kern-output komt gewoon van de eerste (kern-)call.
    expect(result.koper_email).toBe(validOutput.koper_email)

    const herkansingsAanroep = mockCreate.mock.calls[0][0] as { model: string; max_tokens: number; messages: { content: string }[] }
    expect(herkansingsAanroep.model).toBe(CONTENT)
    // Klein t.o.v. de kern-call (zie KERN_MAX_TOKENS) — 1 veld, niet 7.
    expect(herkansingsAanroep.max_tokens).toBeLessThan(6000)
    expect(herkansingsAanroep.messages[0].content).toContain('sjabloon')
  })

  it('behoudt de oorspronkelijke funda_tekst met een waarschuwing als de gerichte herkansing niets teruggeeft', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify({ ...validOutput, funda_tekst: AFWIJKENDE_FUNDA_TEKST })))
    const mockCreate = vi.fn().mockReturnValue(createReturning(''))
    const mockClient = { messages: { stream: mockStream, create: mockCreate } } as unknown as Anthropic
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { generateContent } = await import('./claude')
    const result = await generateContent(inputBasis, huisstijlMetSjabloon, mockClient)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(result.funda_tekst).toBe(AFWIJKENDE_FUNDA_TEKST)
    expect(warnSpy.mock.calls.some(c => String(c[0]).includes('[tekstsjabloon]'))).toBe(true)
    warnSpy.mockRestore()
  })

  it('behoudt de oorspronkelijke funda_tekst met een waarschuwing als de gerichte herkansing zelf mislukt (netwerkfout)', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify({ ...validOutput, funda_tekst: AFWIJKENDE_FUNDA_TEKST })))
    const mockCreate = vi.fn().mockRejectedValue(new Error('netwerkfout'))
    const mockClient = { messages: { stream: mockStream, create: mockCreate } } as unknown as Anthropic
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { generateContent } = await import('./claude')
    const result = await generateContent(inputBasis, huisstijlMetSjabloon, mockClient)

    expect(result.funda_tekst).toBe(AFWIJKENDE_FUNDA_TEKST)
    expect(warnSpy.mock.calls.some(c => String(c[0]).includes('[tekstsjabloon]'))).toBe(true)
    warnSpy.mockRestore()
  })

  it('herkanst niet als de kern-call het tijdsbudget al opmaakte (Vercel-limiet)', async () => {
    const { generateContent, SJABLOON_HERKANSING_BUDGET_MS } = await import('./claude')
    const echteNow = Date.now
    let t = 1_000_000
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => t)
    const mockStream = vi.fn().mockImplementation(() => {
      t += SJABLOON_HERKANSING_BUDGET_MS + 1
      return streamReturning(JSON.stringify({ ...validOutput, funda_tekst: AFWIJKENDE_FUNDA_TEKST }))
    })
    const mockCreate = vi.fn()
    const mockClient = { messages: { stream: mockStream, create: mockCreate } } as unknown as Anthropic
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await generateContent(inputBasis, huisstijlMetSjabloon, mockClient)

    expect(mockCreate).not.toHaveBeenCalled()
    expect(result.funda_tekst).toBe(AFWIJKENDE_FUNDA_TEKST)
    expect(warnSpy.mock.calls[0][0]).toContain('[tekstsjabloon]')
    warnSpy.mockRestore()
    nowSpy.mockRestore()
    expect(Date.now).toBe(echteNow)
  })

  it('slaat de validatie over zonder geconfigureerd sjabloon (bestaand gedrag ongewijzigd)', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify({ ...validOutput, funda_tekst: AFWIJKENDE_FUNDA_TEKST })))
    const mockCreate = vi.fn()
    const mockClient = { messages: { stream: mockStream, create: mockCreate } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    const result = await generateContent(inputBasis, undefined, mockClient)

    expect(mockStream).toHaveBeenCalledTimes(1)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(result.funda_tekst).toBe(AFWIJKENDE_FUNDA_TEKST)
  })

  it('voegt een derde, cachebaar systeemblok toe met de sjabloonstructuur (kern-call)', async () => {
    const mockStream = vi.fn().mockReturnValue(streamReturning(JSON.stringify({ ...validOutput, funda_tekst: CONFORME_FUNDA_TEKST })))
    const mockClient = { messages: { stream: mockStream, create: vi.fn() } } as unknown as Anthropic

    const { generateContent } = await import('./claude')
    await generateContent({ ...inputBasis, taal: 'nl' }, huisstijlMetSjabloon, mockClient)

    const call = mockStream.mock.calls[0][0] as unknown as GevangenSysteemAanroep
    expect(call.system).toHaveLength(3)
    expect(call.system[2].cache_control).toEqual({ type: 'ephemeral' })
    expect(call.system[2].text).toContain('WOONCOMFORT')
  })
})

describe('genereerExtraContent (item 8.3, outputset v2)', () => {
  const inputBasis = {
    adres: 'Herengracht 1, Amsterdam', woningtype_groep: 'appartement' as const, kamers: 3,
    oppervlak_m2: 85, bouwjaar: 1920, energielabel: 'C' as const,
    vraagprijs: 450000, usps: 'Test', doelgroep: 'Starters',
  }

  it('roept messages.create aan met CONTENT als model en geeft de platte tekst terug', async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'De open huis-tekst.' }] })
    const mockClient = { messages: { create } } as unknown as Anthropic

    const { genereerExtraContent } = await import('./claude')
    const tekst = await genereerExtraContent('open_huis', inputBasis, undefined, mockClient)

    expect(tekst).toBe('De open huis-tekst.')
    expect(create).toHaveBeenCalledTimes(1)
    const aanroep = create.mock.calls[0][0] as { model: string; max_tokens: number; messages: { content: string }[] }
    expect(aanroep.model).toBe(CONTENT)
    expect(aanroep.messages[0].content).toContain(inputBasis.adres)
  })

  it('gebruikt per extra-type een eigen, klein max_tokens (elk los veld, niet de hele suite)', async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'tekst' }] })
    const mockClient = { messages: { create } } as unknown as Anthropic

    const { genereerExtraContent } = await import('./claude')
    await genereerExtraContent('kopersvragen_faq', inputBasis, undefined, mockClient)
    await genereerExtraContent('open_huis', inputBasis, undefined, mockClient)

    const faqTokens = (create.mock.calls[0][0] as { max_tokens: number }).max_tokens
    const openHuisTokens = (create.mock.calls[1][0] as { max_tokens: number }).max_tokens
    // kopersvragen_faq (8-10 Q&A) heeft meer ruimte nodig dan een korte open huis-tekst.
    expect(faqTokens).toBeGreaterThan(openHuisTokens)
    expect(openHuisTokens).toBeLessThan(1000)
  })

  it('geeft de schrijftoon van het kantoor door in de prompt als huisstijl is geconfigureerd', async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'tekst' }] })
    const mockClient = { messages: { create } } as unknown as Anthropic
    const huisstijl: HuisstijlConfig = {
      schrijftoon: 'enthousiast', slogan: '', primaire_kleur: '#0080C8', voorbeelden: [],
    }

    const { genereerExtraContent } = await import('./claude')
    await genereerExtraContent('video_script', inputBasis, huisstijl, mockClient)

    const aanroep = create.mock.calls[0][0] as { messages: { content: string }[] }
    expect(aanroep.messages[0].content).toContain('Enthousiast en uitnodigend')
  })

  it('geeft bijgevoegde documenten mee via de Files API-beta en zet de documenteninstructie in de prompt (energie_advies)', async () => {
    const betaCreate = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'Energieadvies-tekst.' }] })
    const mockClient = { messages: { create: vi.fn() }, beta: { messages: { create: betaCreate } } } as unknown as Anthropic

    const { genereerExtraContent } = await import('./claude')
    const tekst = await genereerExtraContent('energie_advies', inputBasis, undefined, mockClient, ['file-abc', 'file-def'])

    expect(tekst).toBe('Energieadvies-tekst.')
    expect(betaCreate).toHaveBeenCalledTimes(1)
    const aanroep = betaCreate.mock.calls[0][0] as {
      model: string
      betas: string[]
      messages: { content: { type: string; source?: { file_id: string }; text?: string }[] }[]
    }
    expect(aanroep.model).toBe(CONTENT)
    expect(aanroep.betas).toContain('files-api-2025-04-14')
    const blokken = aanroep.messages[0].content
    // Documentblokken vóór de tekst, één per file-id.
    expect(blokken[0]).toEqual({ type: 'document', source: { type: 'file', file_id: 'file-abc' } })
    expect(blokken[1]).toEqual({ type: 'document', source: { type: 'file', file_id: 'file-def' } })
    const tekstBlok = blokken[blokken.length - 1]
    expect(tekstBlok.type).toBe('text')
    // De documenteninstructie ("gebruik de feitelijke gegevens…") zit in de prompttekst.
    expect(tekstBlok.text).toContain('documenten bijgevoegd')
    expect(tekstBlok.text).toContain('verzin niets')
    expect(tekstBlok.text).toContain(inputBasis.adres)
  })

  it('geeft bijgevoegde documenten mee via de Files API-beta en zet de documenteninstructie in de prompt (kopersvragen_faq)', async () => {
    const betaCreate = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'V: ...\nA: ...' }] })
    const mockClient = { messages: { create: vi.fn() }, beta: { messages: { create: betaCreate } } } as unknown as Anthropic

    const { genereerExtraContent } = await import('./claude')
    await genereerExtraContent('kopersvragen_faq', inputBasis, undefined, mockClient, ['file-xyz'])

    expect(betaCreate).toHaveBeenCalledTimes(1)
    const aanroep = betaCreate.mock.calls[0][0] as { messages: { content: { type: string; text?: string }[] }[] }
    const tekstBlok = aanroep.messages[0].content.find(b => b.type === 'text')
    expect(tekstBlok?.text).toContain('documenten bijgevoegd')
  })

  it('gaat via het gewone create-pad (geen Files API) als er geen documenten zijn', async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'tekst' }] })
    const betaCreate = vi.fn()
    const mockClient = { messages: { create }, beta: { messages: { create: betaCreate } } } as unknown as Anthropic

    const { genereerExtraContent } = await import('./claude')
    await genereerExtraContent('open_huis', inputBasis, undefined, mockClient, [])

    expect(create).toHaveBeenCalledTimes(1)
    expect(betaCreate).not.toHaveBeenCalled()
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
