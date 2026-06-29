import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Betaling geslaagd — VestaAI',
  robots: { index: false },
}

export default function BetalingGeluktPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Betaling geslaagd</h1>
        <p className="text-gray-500 mb-8">
          Je abonnement is actief. Welkom bij VestaAI — begin meteen met je eerste object.
        </p>
        <Link
          href="/object/new"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Maak eerste object aan →
        </Link>
      </div>
    </main>
  )
}
