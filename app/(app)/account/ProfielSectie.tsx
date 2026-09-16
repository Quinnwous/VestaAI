'use client'

import { useState } from 'react'
import { slaProfielNaamOp } from './actions'
import { Card, Label, Input, Button } from '@/components/ui'
import { colors } from '@/components/ui/tokens'

/** Naam en e-mail — de naam is te wijzigen, e-mail is read-only (zie /admin voor accountbeheer). */
export function ProfielSectie({ naam: initieleNaam, email }: { naam: string; email: string }) {
  const [naam, setNaam] = useState(initieleNaam)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const gewijzigd = naam.trim() !== initieleNaam.trim()

  const opslaan = async () => {
    setStatus('saving')
    const result = await slaProfielNaamOp(naam)
    setStatus(result.ok ? 'saved' : 'error')
    if (result.ok) setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <Card style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <div>
        <Label htmlFor="naam">Naam</Label>
        <Input id="naam" value={naam} onChange={e => setNaam(e.target.value)} maxLength={100} />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={email} disabled />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          variant="primary"
          size="sm"
          onClick={opslaan}
          disabled={!gewijzigd || status === 'saving'}
        >
          {status === 'saving' ? 'Opslaan…' : 'Opslaan'}
        </Button>
        {status === 'saved' && <span style={{ fontSize: 13, color: colors.primary }}>✓ Opgeslagen</span>}
        {status === 'error' && <span style={{ fontSize: 13, color: '#B42318' }}>Opslaan mislukt</span>}
      </div>
    </Card>
  )
}
