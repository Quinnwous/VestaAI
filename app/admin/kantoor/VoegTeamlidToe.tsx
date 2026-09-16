'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addMakelaarAccount } from '../actions'

function genereerWachtwoord(): string {
  const alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 14; i++) out += alfabet[Math.floor(Math.random() * alfabet.length)]
  return out
}

/**
 * Teamlid toevoegen aan één specifiek kantoor — geen rolkeuze meer sinds het
 * één-rol-per-kantoor-besluit (16 sep 2026, zie CLAUDE.md): iedereen met een
 * login ziet en kan hetzelfde.
 */
export function VoegTeamlidToe({ kantoorId }: { kantoorId: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [wachtwoord, setWachtwoord] = useState(genereerWachtwoord())
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [fout, setFout] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    const res = await addMakelaarAccount({ email, naam, wachtwoord, kantoorId, rol: 'makelaar' })
    if (res.ok) {
      setStatus('success')
      setEmail('')
      setNaam('')
      setWachtwoord(genereerWachtwoord())
      router.refresh()
    } else {
      setStatus('error')
      setFout(res.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 max-w-sm">
      <input type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="Naam" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mailadres" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <input type="text" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} required minLength={8} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
        <button type="button" onClick={() => setWachtwoord(genereerWachtwoord())} className="text-xs rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-50">Nieuw</button>
      </div>
      {status === 'error' && <p className="text-xs text-red-600">{fout}</p>}
      {status === 'success' && <p className="text-xs text-green-600">Account aangemaakt en gemaild.</p>}
      <button type="submit" disabled={status === 'saving'} className="text-sm rounded-lg bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50">
        Teamlid toevoegen
      </button>
    </form>
  )
}
