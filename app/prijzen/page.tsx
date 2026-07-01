import Link from 'next/link'
import type { Metadata } from 'next'
import { PrijzenToggle } from './PrijzenToggle'

export const metadata: Metadata = {
  title: 'Prijzen — VestaAI',
  description: 'Kies het abonnement dat bij uw makelaarspraktijk past. VestaAI — de complete AI-toolkit voor makelaars. Starter vanaf €60/maand, Pro vanaf €150/maand.',
}

export default function PrijzenPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
            VestaAI
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Inloggen →
          </Link>
        </div>
      </header>

      {/* Header */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Simpele, eerlijke prijzen
        </h1>
        <p className="text-lg text-gray-500">
          14 dagen gratis proberen — geen creditcard nodig. Daarna kiest u pas.
        </p>
      </section>

      {/* Plannen */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        {/* Founding member banner */}
        <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 px-8 py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">Founding Member — Eerste 50 klanten</p>
          <p className="text-3xl font-extrabold text-amber-900 mb-1">30% korting op elk abonnement</p>
          <p className="text-sm text-amber-700">Geldt voor de volledige eerste 12 maanden. Sluit u nu aan en betaal nooit meer de volle prijs.</p>
        </div>

        <PrijzenToggle />

        {/* Enterprise contact */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Meer dan 10 vestigingen of eigen branding?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Het Kantoor-plan biedt alles wat grote netwerken nodig hebben. Vragen over implementatie of maatwerk?
          </p>
          <a
            href="mailto:quinn.berkouwer@gmail.com?subject=VestaAI Kantoor-plan"
            className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
          >
            Neem contact op →
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Veelgestelde vragen</h2>
          <div className="space-y-8">
            {[
              {
                v: 'Hoe werkt de gratis proefperiode?',
                a: 'U maakt een account aan — geen creditcard nodig. U heeft 14 dagen lang volledige toegang tot alle functies van het Kantoor-plan. Daarna kiest u zelf welk abonnement u wilt.',
              },
              {
                v: 'Kan ik tussentijds opzeggen?',
                a: 'Ja, u kunt maandelijks opzeggen. Bij een jaarabonnement loopt het door tot het einde van de betaalperiode.',
              },
              {
                v: 'Wat is het verschil tussen Starter en Pro?',
                a: 'Starter is voor één gebruiker met een limiet van 5 objecten per maand (±€12 per object). Pro heeft geen limieten, ondersteuning voor meerdere gebruikers en het huisstijlgeheugen: VestaAI leert de schrijfstijl, het logo en de toon van uw kantoor.',
              },
              {
                v: 'Wordt er Nederlands gegenereerd?',
                a: 'Ja — onze AI-assistent genereert uitsluitend Nederlandse teksten, afgestemd op de Nederlandse en Belgische vastgoedmarkt en Funda-richtlijnen.',
              },
              {
                v: 'Wat kost het per gegenereerd object?',
                a: 'Bij het Starter-plan: €60 / 5 = €12 per object. Bij Pro en Kantoor is het onbeperkt. De achterliggende API-kosten zijn voor ons rekening.',
              },
            ].map(({ v, a }) => (
              <div key={v}>
                <p className="text-sm font-semibold text-gray-900 mb-2">{v}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Begin vandaag nog</h2>
        <p className="text-gray-500 mb-8">14 dagen gratis proberen · Geen creditcard · Altijd opzegbaar</p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-blue-600 px-10 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Start gratis proefperiode →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 VestaAI</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
