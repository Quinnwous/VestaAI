import { describe, it, expect } from 'vitest'
import { parseEnvExampleGroepen, parseDotEnv, controleerEnv } from './envCheck.mjs'

const VOORBEELD = `# commentaar vooraf, geen groep
# == verplicht ==
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# == optioneel ==
GOOGLE_AI_API_KEY=
PLATFORM_ADMIN_EMAILS=

# == alleen scripts/DoD/e2e ==
DOD_PORT=
DEMO_PASSWORD=
`

describe('parseEnvExampleGroepen', () => {
  it('groepeert sleutels onder hun kopcommentaar', () => {
    const groepen = parseEnvExampleGroepen(VOORBEELD)
    expect(groepen['verplicht']).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ])
    expect(groepen['optioneel']).toEqual(['GOOGLE_AI_API_KEY', 'PLATFORM_ADMIN_EMAILS'])
    expect(groepen['alleen scripts/DoD/e2e']).toEqual(['DOD_PORT', 'DEMO_PASSWORD'])
  })

  it('negeert regels vóór de eerste kop', () => {
    const groepen = parseEnvExampleGroepen('SLEUTEL_ZONDER_GROEP=\n# == verplicht ==\nA=')
    expect(groepen['verplicht']).toEqual(['A'])
    expect(Object.values(groepen).flat()).not.toContain('SLEUTEL_ZONDER_GROEP')
  })
})

describe('parseDotEnv', () => {
  it('parst KEY=waarde-regels en negeert commentaar/lege regels', () => {
    const env = parseDotEnv('A=1\n# commentaar\n\nB=hallo wereld\n')
    expect(env).toEqual({ A: '1', B: 'hallo wereld' })
  })

  it('strippt omringende quotes', () => {
    const env = parseDotEnv('A="waarde"\nB=\'andere waarde\'')
    expect(env).toEqual({ A: 'waarde', B: 'andere waarde' })
  })
})

describe('controleerEnv', () => {
  const groepen = parseEnvExampleGroepen(VOORBEELD)

  it('meldt verplichte sleutels die ontbreken of leeg zijn', () => {
    const { ontbrekendVerplicht } = controleerEnv({
      groepen,
      env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
    })
    expect(ontbrekendVerplicht).toEqual(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])
  })

  it('meldt optionele sleutels apart van verplichte', () => {
    const { ontbrekendVerplicht, ontbrekendOptioneel } = controleerEnv({
      groepen,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'x',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x',
        SUPABASE_SERVICE_ROLE_KEY: 'x',
      },
    })
    expect(ontbrekendVerplicht).toEqual([])
    expect(ontbrekendOptioneel).toEqual(['GOOGLE_AI_API_KEY', 'PLATFORM_ADMIN_EMAILS'])
  })

  it('telt de "alleen scripts/DoD/e2e"-groep niet mee', () => {
    const { ontbrekendVerplicht, ontbrekendOptioneel } = controleerEnv({
      groepen,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'x',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x',
        SUPABASE_SERVICE_ROLE_KEY: 'x',
        GOOGLE_AI_API_KEY: 'x',
        PLATFORM_ADMIN_EMAILS: 'x',
      },
    })
    expect(ontbrekendVerplicht).toEqual([])
    expect(ontbrekendOptioneel).toEqual([])
  })
})
