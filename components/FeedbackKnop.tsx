'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { Sheet, Button, Textarea, Label, colors } from '@/components/ui'
import { verstuurFeedback } from '@/app/(app)/feedback-actions'

const MAX_TEKENS = 2000
const MIN_TEKENS = 10

export const FEEDBACK_TRIGGER_DESKTOP_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px',
  borderRadius: 'var(--merk-radius-md, 10px)', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#14181B',
}
export const FEEDBACK_TRIGGER_MOBIEL_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', fontSize: 14, fontWeight: 600,
  color: '#14181B', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
}

/**
 * Feedbacksheet (item 12.4, docs/roadmap.md § Fase 12): "klein: knop in het
 * avatarmenu → Resend-mail naar Quinn met pagina-URL + tekst."
 *
 * Gecontroleerd via `open`/`onOpenChange` en **precies één keer** gemount,
 * los van AppTopbar's dropdown/mobiele menu (zie de aanroep in
 * AppTopbar.tsx, na de `</header>`) — niet er middenin. Reden: de "Feedback
 * geven"-knop staat wél in dat dropdown-/mobiele menu, en dat menu sluit
 * zichzelf (`setProfielOpen(false)`/`setMobiel(false)`) zodra je erop klikt,
 * zodat het niet met een hoger z-index over de sheet blijft zweven. Stond
 * deze sheet zelf óók in dat menu, dan werd hij door diezelfde
 * toestandswijziging meteen weer ge-unmount — hij ging open en verdween in
 * dezelfde render, vóórdat Radix' portal ooit iets liet zien (gevonden
 * tijdens de browsercheck van dit item: de sheet opende nooit op 390 px).
 * Alleen `open` hoeft dus geleend te worden door AppTopbar; tekst/status
 * blijven intern.
 */
export function FeedbackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname()
  const [tekst, setTekst] = useState('')
  const [status, setStatus] = useState<'idle' | 'verzonden' | 'fout'>('idle')
  const [foutmelding, setFoutmelding] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sluit = (volgendeOpen: boolean) => {
    onOpenChange(volgendeOpen)
    if (!volgendeOpen) {
      // Kleine vertraging zodat de sluit-animatie niet halverwege al leeg oogt;
      // bij heropenen begint de sheet dan weer met een schone lei.
      setTimeout(() => {
        setStatus('idle')
        setFoutmelding(null)
        setTekst('')
      }, 200)
    }
  }

  const versturen = () => {
    startTransition(async () => {
      const result = await verstuurFeedback({ tekst, pagina: pathname })
      if (result.ok) {
        setStatus('verzonden')
      } else {
        setStatus('fout')
        setFoutmelding(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={sluit} titel="Feedback geven" omschrijving="Wat kan beter? We lezen alles.">
      {status === 'verzonden' ? (
        <div style={{ textAlign: 'center', padding: '32px 8px' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: '0 0 6px' }}>Verstuurd — bedankt!</p>
          <p style={{ fontSize: 13, color: colors.body, margin: 0 }}>We nemen je feedback mee.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Label htmlFor="feedback-tekst" hint={`${tekst.length}/${MAX_TEKENS}`}>
            Je feedback
          </Label>
          <Textarea
            id="feedback-tekst"
            value={tekst}
            onChange={e => setTekst(e.target.value.slice(0, MAX_TEKENS))}
            placeholder="Wat werkt niet lekker, of wat mis je?"
            rows={7}
            disabled={isPending}
            autoFocus
          />
          {status === 'fout' && foutmelding && (
            <p style={{ fontSize: 12.5, color: '#B91C1C', margin: 0 }}>{foutmelding}</p>
          )}
          <Button
            type="button"
            onClick={versturen}
            disabled={isPending || tekst.trim().length < MIN_TEKENS}
            full
          >
            {isPending ? 'Versturen…' : 'Versturen'}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
