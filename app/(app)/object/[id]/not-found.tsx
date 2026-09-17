import Link from 'next/link'

export default function ObjectNotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-100 mb-4 select-none">404</p>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Woning niet gevonden</h1>
        <p className="text-sm text-gray-500 mb-6">Deze woning bestaat niet of je hebt geen toegang.</p>
        <Link
          href="/woningen"
          className="text-sm text-[var(--merk,#1A6B45)] hover:text-[var(--merk-hover,#114230)] font-medium underline"
        >
          ← Terug naar de portefeuille
        </Link>
      </div>
    </main>
  )
}
