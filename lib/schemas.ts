import { z } from 'zod'

export const HuisstijlSchema = z.object({
  schrijftoon: z.enum(['formeel', 'informeel', 'enthousiast']),
  slogan: z.string().max(100),
  primaire_kleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  voorbeelden: z.array(z.string().max(2000)).max(3),
})

export type HuisstijlConfig = z.infer<typeof HuisstijlSchema>

export const PropertyInputSchema = z.object({
  adres: z.string().min(5),
  woningtype: z.enum([
    'Appartement', 'Tussenwoning', 'Hoekwoning',
    'Vrijstaand', 'Villa', 'Penthouse',
  ]),
  kamers: z.number().int().min(1).max(20),
  oppervlak_m2: z.number().int().min(1).max(9999),
  bouwjaar: z.number().int().min(1800).max(2035),
  energielabel: z.enum(['A++++', 'A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
  vraagprijs: z.number().int().min(1),
  usps: z.string().min(1).max(500),
  doelgroep: z.string().min(1),
  // Optioneel: open huis
  open_huis_datum: z.string().max(50).optional(),
  open_huis_tijd: z.string().max(20).optional(),
  // Optioneel: taal (default NL — optioneel zodat bestaande records compatible blijven)
  taal: z.enum(['nl', 'en']).optional(),
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
  // Optionele secties — standaard lege string als Claude ze weglaat
  open_huis: z.string().default(''),
  bezichtiging_followup_positief: z.string().default(''),
  bezichtiging_followup_negatief: z.string().default(''),
  video_script: z.string().default(''),
  energie_advies: z.string().default(''),
  kopersvragen_faq: z.string().default(''),
  marktanalyse: z.string().default(''),
})

export type ContentOutput = z.infer<typeof ContentOutputSchema>

// Schema voor prijswijziging-content (apart van de hoofd-output)
export const PrijswijzigingOutputSchema = z.object({
  instagram_post: z.string(),
  linkedin_post: z.string(),
  email_geinteresseerden: z.string(),
})

export type PrijswijzigingOutput = z.infer<typeof PrijswijzigingOutputSchema>
