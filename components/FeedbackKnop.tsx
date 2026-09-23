'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { Sheet, Button, Textarea, Label, colors } from '@/components/ui'
import { verstuurFeedback } from '@/app/(app)/feedback-actions'

const MAX_TEKENS = 2000
const MIN_TEKENS = 10

const DESKTOP_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px',
  borderRadius: 'var(--merk-radius-md, 10px)', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#14181B',
}
const MOBIEL_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', fontSize: 14, fontWeight: 600,
  color: '#14181B', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
}

/**
 * Feedbackknop (item 12.4, docs/roadmap.md § Fase 12): "klein: knop in het
 * avatarmenu → Resend-mail naar Quinn met pagina-URL + tekst." Gemount
 * vanuit AppTopbar.tsx, zowel in het desktop-profielmenu als het mobiele
 * uitklapmenu — vandaar `variant`, die alleen de trigger-styling bepaalt
 * (dezelfde inline-stijl als de buurmenu-items in AppTopbar.tsx).
 *
 * `onBeforeOpen` sluit AppTopbar's eigen dropdown vóórdat de sheet opent: die
 * dropdown heeft een hoger z-index dan de Sheet-content (components/ui/Sheet.tsx),
 * dus zonder dit zou hij zichtbaar over de sheet blijven zweven.
 */
export function FeedbackKnop({
  variant = 'desktop',
  onBeforeOpen,
}: {
  variant?: 'desktop' | 'mobiel'
  onBeforeOpen?: () => void
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [tekst, setTekst] = useState('')
  const [status, setStatus] = useState<'idle' | 'verzonden' | 'fout'>('idle')
  const [foutmelding, setFoutmelding] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openSheet = () => {
    onBeforeOpen?.()
    setOpen(true)
  }

  const sluit = (volgendeOpen: boolean) => {
    setOpen(volgendeOpen)
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
    <>
      <button
        type="button"
        role="menuitem"
        className={variant === 'desktop' ? 'vui-menuitem' : undefined}
        onClick={openSheet}
        style={variant === 'desktop' ? DESKTOP_STYLE : MOBIEL_STYLE}
      >
        Feedback geven
      </button>

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
    </>
  )
}
