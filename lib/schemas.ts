import { z } from 'zod'

export const PropertyInputSchema = z.object({
  adres: z.string().min(5),
  woningtype: z.enum([
    'Appartement', 'Tussenwoning', 'Hoekwoning',
    'Vrijstaand', 'Villa', 'Penthouse',
  ]),
  kamers: z.number().int().min(1).max(20),
  oppervlak_m2: z.number().int().min(1).max(9999),
  bouwjaar: z.number().int().min(1800).max(2025),
  energielabel: z.enum(['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
  vraagprijs: z.number().int().min(1),
  usps: z.string().min(1).max(500),
  doelgroep: z.string().min(1),
})

export type PropertyInput = z.infer<typeof PropertyInputSchema>

export const ContentOutputSchema = z.object({
  funda_tekst: z.string(),
  brochure_kort: z.string(),
  brochure_lang: z.string(),
  instagram_emotioneel: z.string(),
  instagram_informatief: z.string(),
  instagram_actie: z.string(),
  linkedin_kantoor: z.string(),
  linkedin_makelaar: z.string(),
  koper_email: z.string(),
  buurtomschrijving: z.string(),
})

export type ContentOutput = z.infer<typeof ContentOutputSchema>
