import { describe, it, expect } from 'vitest'
import { metLegacyFallback } from './ResultTabs'
import type { ContentOutput } from '@/lib/schemas'

/**
 * Regressietest (item 8.3, gevonden tijdens handmatige DoD-check): `outputs_json`
 * komt uit de database als een simpele `as ContentOutput`-cast (zie
 * app/(app)/object/[id]/page.tsx) — nooit door `ContentOutputSchema.parse()`.
 * Een dossier van vóór de outputset-v2 mist de nieuwe kernvelden dus écht
 * (`undefined`, niet een lege string uit Zod's `.default('')`). Zonder
 * `metLegacyFallback`s eigen `safeParse` crashte `TabContent` op
 * `undefined.trim()` zodra zo'n dossier de Teksten-tab opende.
 */
describe('metLegacyFallback (item 8.3)', () => {
  it('vult écht ontbrekende nieuwe kernvelden aan met een lege string (geen undefined)', () => {
    // Ruwe outputs_json van vóór 8.3 — mist brochure_tekst/instagram/sneak_preview/
    // followup_positief/followup_negatief helemaal (geen key, geen undefined-waarde).
    const oudeRuweData = {
      funda_tekst: 'Oude funda-tekst.',
      brochure_kort: 'Kort.',
      brochure_lang: 'Lang.',
      instagram_emotioneel: 'Emotioneel.',
      linkedin_kantoor: 'Kantoor.',
      koper_email: 'Mail.',
      buurtomschrijving: 'Buurt.',
    } as unknown as ContentOutput

    const resultaat = metLegacyFallback(oudeRuweData)

    expect(resultaat.sneak_preview).toBe('')
    expect(resultaat.open_huis).toBe('')
    expect(resultaat.video_script).toBe('')
    expect(resultaat.energie_advies).toBe('')
    expect(resultaat.kopersvragen_faq).toBe('')
    // Geen van de velden mag undefined zijn — dat deed TabContent's
    // `content.trim()` eerder crashen.
    for (const veld of ['funda_tekst', 'brochure_tekst', 'instagram', 'linkedin_kantoor', 'sneak_preview', 'koper_email', 'buurtomschrijving', 'open_huis', 'followup_positief', 'followup_negatief', 'video_script', 'energie_advies', 'kopersvragen_faq'] as const) {
      expect(typeof resultaat[veld]).toBe('string')
    }
  })

  it('toont het beste oude veld als het nieuwe kernveld leeg is (brochure, instagram, follow-up)', () => {
    const oudeRuweData = {
      funda_tekst: 'Funda.',
      brochure_lang: 'De lange brochure.',
      brochure_kort: 'De korte brochure.',
      instagram_emotioneel: 'Emotionele Instagram-post.',
      instagram_informatief: 'Informatieve Instagram-post.',
      bezichtiging_followup_positief: 'Follow-up positief.',
      bezichtiging_followup_negatief: 'Follow-up negatief.',
      linkedin_kantoor: 'Kantoor.',
      koper_email: 'Mail.',
      buurtomschrijving: 'Buurt.',
    } as unknown as ContentOutput

    const resultaat = metLegacyFallback(oudeRuweData)

    // brochure_lang wint van brochure_kort (zelfde volgorde als de oude UI-voorkeur).
    expect(resultaat.brochure_tekst).toBe('De lange brochure.')
    expect(resultaat.instagram).toBe('Emotionele Instagram-post.')
    expect(resultaat.followup_positief).toBe('Follow-up positief.')
    expect(resultaat.followup_negatief).toBe('Follow-up negatief.')
  })

  it('geeft voorrang aan het nieuwe veld als een dossier (na 8.3) allebei heeft', () => {
    const gemengdeData = {
      funda_tekst: 'Funda.',
      brochure_tekst: 'Nieuwe brochuretekst.',
      brochure_lang: 'Oude brochuretekst (zou genegeerd moeten worden).',
      instagram: 'Nieuwe Instagram-tekst.',
      instagram_emotioneel: 'Oude Instagram-tekst (zou genegeerd moeten worden).',
      linkedin_kantoor: 'Kantoor.',
      koper_email: 'Mail.',
      buurtomschrijving: 'Buurt.',
    } as unknown as ContentOutput

    const resultaat = metLegacyFallback(gemengdeData)

    expect(resultaat.brochure_tekst).toBe('Nieuwe brochuretekst.')
    expect(resultaat.instagram).toBe('Nieuwe Instagram-tekst.')
  })

  it('laat een volledig outputset-v2-dossier ongewijzigd', () => {
    const nieuweData: ContentOutput = {
      funda_tekst: 'Funda.',
      brochure_tekst: 'Brochure.',
      instagram: 'Insta.',
      linkedin_kantoor: 'LinkedIn.',
      sneak_preview: 'WhatsApp-tekst.',
      koper_email: 'Mail.',
      buurtomschrijving: 'Buurt.',
      open_huis: 'Open huis.',
      followup_positief: 'Positief.',
      followup_negatief: 'Negatief.',
      video_script: 'Video.',
      energie_advies: 'Energie.',
      kopersvragen_faq: 'FAQ.',
    }

    expect(metLegacyFallback(nieuweData)).toEqual(nieuweData)
  })
})
