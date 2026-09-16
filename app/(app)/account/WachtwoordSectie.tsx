'use client'

import { useState } from 'react'
import { wijzigWachtwoord } from './actions'
import { Card, Label, Input, Button } from '@/components/ui'
import { colors } from '@/components/ui/tokens'

/** Wachtwoord wijzigen zonder de reset-mail — vereist het huidige wachtwoord. */
export function WachtwoordSectie() {
  const [huidig, setHuidig] = useState('')
  const [nieuw, setNieuw] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [foutmelding, setFoutmelding] = useState('')

  const wijzigen = async () => {
    setStatus('saving')
    const result = await wijzigWachtwoord({ huidigWachtwoord: huidig, nieuwWachtwoord: nieuw })
    if (result.ok) {
      setStatus('saved')
      setHuidig('')
      setNieuw('')
      setTimeout(() => setStatus('idle'), 2500)
    } else {
      setStatus('error')
      setFoutmelding(result.error)
    }
  }

  const klaarOmTeWijzigen = huidig.length > 0 && nieuw.length >= 10

  return (
    <Card style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <div>
        <Label htmlFor="huidig-wachtwoord">Huidig wachtwoord</Label>
        <Input
          id="huidig-wachtwoord"
          type="password"
          value={huidig}
          onChange={e => setHuidig(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div>
        <Label htmlFor="nieuw-wachtwoord" hint="Minimaal 10 tekens">Nieuw wachtwoord</Label>
        <Input
          id="nieuw-wachtwoord"
          type="password"
          value={nieuw}
          onChange={e => setNieuw(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          variant="primary"
          size="sm"
          onClick={wijzigen}
          disabled={!klaarOmTeWijzigen || status === 'saving'}
        >
          {status === 'saving' ? 'Wijzigen…' : 'Wachtwoord wijzigen'}
        </Button>
        {status === 'saved' && <span style={{ fontSize: 13, color: colors.primary }}>✓ Gewijzigd</span>}
        {status === 'error' && <span style={{ fontSize: 13, color: '#B42318' }}>{foutmelding}</span>}
      </div>
    </Card>
  )
}
