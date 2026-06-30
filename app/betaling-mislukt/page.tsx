import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Betaling geannuleerd — VestaAI',
  robots: { index: false },
}

export default function BetalingMisluktPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Betaling geannuleerd</h1>
        <p className="text-gray-500 mb-8">
          Er is niets in rekening gebracht. Kies een abonnement wanneer u klaar bent om door te gaan.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/api/stripe/checkout?plan=starter"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Starter — €60/maand
          </Link>
          <Link
            href="/api/stripe/checkout?plan=pro"
            className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
          >
            Pro — €150/maand
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600 mt-2"
          >
            Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
