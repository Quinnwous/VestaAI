import { describe, expect, it } from 'vitest'
import { soortGeminiFout } from './geminiFout'

const URL_DEEL = 'Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'

function fetchFout(status: number, tekst: string) {
  return Object.assign(new Error(`[GoogleGenerativeAI Error]: ${URL_DEEL}: [${status} ${tekst}`), { status })
}

describe('soortGeminiFout', () => {
  it('ziet een geweigerd project (403) niet langer aan voor drukte — "rate" in generateContent telt niet', () => {
    const fout = fetchFout(403, 'Forbidden] Your project has been denied access. Please contact support.')
    expect(soortGeminiFout(fout)).toBe('geweigerd')
  })

  it('herkent een echte limiet aan de status of aan RESOURCE_EXHAUSTED', () => {
    expect(soortGeminiFout(fetchFout(429, 'Too Many Requests] Resource has been exhausted'))).toBe('limiet')
    expect(soortGeminiFout(new Error(`${URL_DEEL}: RESOURCE_EXHAUSTED`))).toBe('limiet')
    expect(soortGeminiFout(new Error('You exceeded your current quota'))).toBe('limiet')
  })

  it('herkent een ongeldige sleutel', () => {
    expect(soortGeminiFout(fetchFout(400, 'Bad Request] API key not valid. Please pass a valid API key.'))).toBe('geweigerd')
  })

  it('valt terug op overig, ook zonder status of Error-object', () => {
    expect(soortGeminiFout(fetchFout(500, 'Internal Server Error] Internal error'))).toBe('overig')
    expect(soortGeminiFout('onbekend')).toBe('overig')
    expect(soortGeminiFout(null)).toBe('overig')
  })
})
