import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Item 12.4 (docs/roadmap.md § Fase 12): "Verstuur tijdens het testen GEEN
 * echte mail (mock de verzendfunctie in tests…)" — sendFeedbackEmail wordt
 * hier dus altijd gemockt, nooit écht aangeroepen via Resend.
 */

const authGetUser = vi.fn()
const makelaarSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: authGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: makelaarSingle,
    })),
  })),
}))

const sendFeedbackEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendFeedbackEmail: (...args: unknown[]) => sendFeedbackEmail(...args),
}))

import { verstuurFeedback } from './feedback-actions'

function stelGebruikerIn(userId: string, email = 'marc@i4housing.nl') {
  authGetUser.mockResolvedValue({ data: { user: { id: userId, email } } })
  makelaarSingle.mockResolvedValue({ data: { name: 'Marc', kantoren: { name: 'i4 Housing' } } })
}

describe('verstuurFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendFeedbackEmail.mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete process.env.FEEDBACK_SKIP_SEND
  })

  it('wijst te korte tekst af zonder de sessie of e-mail aan te roepen', async () => {
    const result = await verstuurFeedback({ tekst: 'te kort', pagina: '/dashboard' })
    expect(result.ok).toBe(false)
    expect(authGetUser).not.toHaveBeenCalled()
    expect(sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it('wijst te lange tekst af', async () => {
    const result = await verstuurFeedback({ tekst: 'x'.repeat(2001), pagina: '/dashboard' })
    expect(result.ok).toBe(false)
  })

  it('geeft een foutmelding als er geen ingelogde gebruiker is', async () => {
    authGetUser.mockResolvedValue({ data: { user: null } })
    const result = await verstuurFeedback({ tekst: 'Dit werkt niet lekker op mobiel.', pagina: '/dashboard' })
    expect(result.ok).toBe(false)
    expect(sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it('stuurt bij geldige invoer de mail met kantoor/makelaar/pagina uit de sessie, niet uit de invoer', async () => {
    stelGebruikerIn('user-1')
    const result = await verstuurFeedback({ tekst: 'Dit werkt niet lekker op mobiel.', pagina: '/marktanalyse' })
    expect(result.ok).toBe(true)
    expect(sendFeedbackEmail).toHaveBeenCalledWith({
      van: { naam: 'Marc', email: 'marc@i4housing.nl' },
      kantoorNaam: 'i4 Housing',
      pagina: '/marktanalyse',
      tekst: 'Dit werkt niet lekker op mobiel.',
    })
  })

  it('slaat het versturen over als FEEDBACK_SKIP_SEND=1 staat, maar meldt toch succes', async () => {
    process.env.FEEDBACK_SKIP_SEND = '1'
    stelGebruikerIn('user-2')
    const result = await verstuurFeedback({ tekst: 'Alleen de UI-flow testen, geen echte mail.', pagina: '/dashboard' })
    expect(result.ok).toBe(true)
    expect(sendFeedbackEmail).not.toHaveBeenCalled()
  })

  it('geeft een foutmelding terug als het versturen faalt, zonder te gooien', async () => {
    stelGebruikerIn('user-3')
    sendFeedbackEmail.mockRejectedValue(new Error('Resend is even down'))
    const result = await verstuurFeedback({ tekst: 'Dit werkt niet lekker op mobiel.', pagina: '/dashboard' })
    expect(result.ok).toBe(false)
  })

  it('houdt een makelaar tegen die binnen een minuut nogmaals verstuurt', async () => {
    stelGebruikerIn('user-4')
    const eerste = await verstuurFeedback({ tekst: 'Eerste keer feedback versturen hier.', pagina: '/dashboard' })
    expect(eerste.ok).toBe(true)

    const tweede = await verstuurFeedback({ tekst: 'Meteen nog een keer versturen.', pagina: '/dashboard' })
    expect(tweede.ok).toBe(false)
    expect(sendFeedbackEmail).toHaveBeenCalledTimes(1)
  })
})
