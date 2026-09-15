'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createKantoor, addMakelaarAccount } from './actions'

type KantoorOptie = { id: string; name: string }

function genereerWachtwoord(): string {
  const alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 14; i++) out += alfabet[Math.floor(Math.random() * alfabet.length)]
  return out
}

export function AccountBeheer({ kantoren }: { kantoren: KantoorOptie[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [kantoorNaam, setKantoorNaam] = useState('')
  const [kantoorStatus, setKantoorStatus] = useState<'idle' | 'error'>('idle')
  const [kantoorFout, setKantoorFout] = useState('')

  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [wachtwoord, setWachtwoord] = useState(genereerWachtwoord())
  const [kantoorId, setKantoorId] = useState(kantoren[0]?.id ?? '')
  const [rol, setRol] = useState<'admin' | 'makelaar'>('admin')
  const [accountStatus, setAccountStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [accountFout, setAccountFout] = useState('')

  const handleKantoor = (e: React.FormEvent) => {
    e.preventDefault()
    setKantoorStatus('idle')
    startTransition(async () => {
      const res = await createKantoor(kantoorNaam)
      if (res.ok) {
        setKantoorNaam('')
        if (res.kantoorId) setKantoorId(res.kantoorId)
        router.refresh()
      } else {
        setKantoorStatus('error')
        setKantoorFout(res.error)
      }
    })
  }

  const handleAccount = (e: React.FormEvent) => {
    e.preventDefault()
    setAccountStatus('idle')
    if (!kantoorId) {
      setAccountStatus('error')
      setAccountFout('Maak eerst een kantoor aan')
      return
    }
    startTransition(async () => {
      const res = await addMakelaarAccount({ email, naam, wachtwoord, kantoorId, rol })
      if (res.ok) {
        setAccountStatus('success')
        setEmail('')
        setNaam('')
        setWachtwoord(genereerWachtwoord())
        router.refresh()
      } else {
        setAccountStatus('error')
        setAccountFout(res.error)
      }
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Nieuw kantoor */}
      <form onSubmit={handleKantoor} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Kantoor toevoegen</h3>
        <input
          value={kantoorNaam}
          onChange={e => setKantoorNaam(e.target.value)}
          placeholder="Bijv. i4 Housing"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {kantoorStatus === 'error' && <p className="text-xs text-red-600">{kantoorFout}</p>}
        <button
          type="submit"
          disabled={pending}
          className="text-sm rounded-lg bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          Kantoor aanmaken
        </button>
      </form>

      {/* Nieuw account */}
      <form onSubmit={handleAccount} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Account toevoegen aan kantoor</h3>
        <select
          value={kantoorId}
          onChange={e => setKantoorId(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          <option value="" disabled>Kies een kantoor…</option>
          {kantoren.map(k => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={naam}
          onChange={e => setNaam(e.target.value)}
          placeholder="Naam"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="E-mailadres"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={wachtwoord}
            onChange={e => setWachtwoord(e.target.value)}
            required
            minLength={8}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => setWachtwoord(genereerWachtwoord())}
            className="text-xs rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-50"
          >
            Nieuw
          </button>
        </div>
        <select
          value={rol}
          onChange={e => setRol(e.target.value as 'admin' | 'makelaar')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          <option value="admin">Beheerder (van dit kantoor)</option>
          <option value="makelaar">Medewerker</option>
        </select>
        {accountStatus === 'error' && <p className="text-xs text-red-600">{accountFout}</p>}
        {accountStatus === 'success' && <p className="text-xs text-green-600">Account aangemaakt en gemaild.</p>}
        <button
          type="submit"
          disabled={pending}
          className="text-sm rounded-lg bg-gray-900 text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          Account aanmaken
        </button>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Zet direct een actief account klaar met dit wachtwoord — geef het door aan de gebruiker.
          Voor een teamlid uitnodigen bínnen een kantoor gebruikt de kantoor-admin zelf de uitnodiging
          in Instellingen → Team (dat stuurt een magic link, geen wachtwoord nodig).
        </p>
      </form>
    </div>
  )
}
