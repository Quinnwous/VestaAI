'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const supabase = supabaseConfigured
    ? createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            VestaAI
          </Link>
          <p className="mt-2 text-sm text-gray-500">Professionele vastgoedcontent in 90 seconden.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {!supabaseConfigured ? (
            // Dev-modus: Supabase nog niet geconfigureerd
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Auth nog niet geconfigureerd</h2>
              <p className="text-sm text-gray-500 mb-4">
                Vul <code className="bg-gray-100 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code> en{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
                in in <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code>.
              </p>
              <Link
                href="/object/new"
                className="inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Toch verder in dev-modus →
              </Link>
            </div>
          ) : status === 'sent' ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check je inbox</h2>
              <p className="text-sm text-gray-500">
                We hebben een inloglink gestuurd naar <strong>{email}</strong>.
                Klik op de link in de mail om in te loggen.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Andere e-mail proberen
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Inloggen</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mailadres
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="naam@kantoor.nl"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-600">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {status === 'loading' ? 'Bezig...' : 'Stuur inloglink →'}
                </button>
              </form>

              <p className="mt-5 text-xs text-center text-gray-400">
                Nog geen account?{' '}
                <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
                  Bekijk VestaAI
                </Link>
                {' '}en start je proefperiode.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
