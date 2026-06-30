import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacyverklaring — VestaAI',
  description: 'Hoe VestaAI omgaat met uw persoonsgegevens en objectdata.',
}

export default function PrivacyPage() {
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

      <main className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Privacyverklaring</h1>
        <p className="text-sm text-gray-400 mb-12">Laatst bijgewerkt: 29 juni 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-10">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Wie zijn wij?</h2>
            <p className="text-gray-600 leading-relaxed">
              VestaAI is een product van Quinn Berkouwer, gevestigd in Nederland.
              Contactadres: <a href="mailto:quinn.berkouwer@gmail.com" className="text-blue-600 underline">quinn.berkouwer@gmail.com</a>.
              VestaAI is een SaaS-platform voor Nederlandse en Belgische makelaars waarmee zij razendsnel een
              complete content-set per woning kunnen genereren.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Welke gegevens verwerken wij?</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-800 mb-1">Accountgegevens</p>
                <p className="text-gray-600 leading-relaxed">
                  Naam, e-mailadres en kantoorgegevens bij registratie. Opgeslagen via Supabase
                  (GDPR-compliant, datacenters in de EU).
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Objectdata</p>
                <p className="text-gray-600 leading-relaxed">
                  Adres, woningtype, m², bouwjaar, energielabel, vraagprijs en USP's die u invoert.
                  Deze gegevens worden uitsluitend gebruikt om de AI-generatie te maken.
                  Wij verkopen of delen deze data niet met derden.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Huisstijlgegevens</p>
                <p className="text-gray-600 leading-relaxed">
                  Logo, schrijftoon en voorbeeldteksten die u instelt voor het huisstijlgeheugen.
                  Opgeslagen in Supabase Storage, alleen toegankelijk voor uw kantoor.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Betaalgegevens</p>
                <p className="text-gray-600 leading-relaxed">
                  Factuur- en betaalgegevens worden verwerkt door Stripe Inc. VestaAI slaat geen
                  creditcardgegevens op. Stripe is PCI-DSS Level 1 gecertificeerd.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Waarvoor gebruiken wij uw gegevens?</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 leading-relaxed">
              <li>Het uitvoeren van de dienst (content genereren via Claude AI)</li>
              <li>Verwerking van abonnementen en facturen via Stripe</li>
              <li>Transactionele e-mails (welkomst, trial-waarschuwing, factuurbevestiging) via Resend</li>
              <li>Klantenservice en technische ondersteuning</li>
              <li>Verbetering van de dienst op basis van anonieme gebruiksstatistieken</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Derde partijen</h2>
            <div className="space-y-3">
              {[
                ['Supabase', 'Database, authenticatie en opslag — EU-servers, GDPR-compliant'],
                ['Anthropic (Claude API)', 'AI-generatie — uw objectdata wordt per request verstuurd, niet permanent opgeslagen bij Anthropic'],
                ['Stripe', 'Betalingen en abonnementsbeheer — PCI-DSS Level 1'],
                ['Resend', 'Transactionele e-mails — GDPR-compliant'],
                ['Vercel', 'Hosting en edge functions — EU-regio beschikbaar'],
                ['Sentry', 'Foutregistratie voor technische monitoring — geen persoonsgegevens in logs'],
              ].map(([partij, beschrijving]) => (
                <div key={partij} className="flex gap-3">
                  <span className="font-medium text-gray-800 w-32 flex-shrink-0">{partij}</span>
                  <span className="text-gray-600">{beschrijving}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Bewaartermijn</h2>
            <p className="text-gray-600 leading-relaxed">
              Objectdata en gegenereerde teksten worden bewaard zolang uw account actief is.
              Na opzegging worden uw gegevens binnen 90 dagen verwijderd.
              Factuurgegevens bewaren wij 7 jaar conform de fiscale bewaarplicht.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Uw rechten (AVG)</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              U heeft het recht op inzage, correctie, verwijdering en overdraagbaarheid van uw persoonsgegevens.
              Ook heeft u het recht bezwaar te maken tegen verwerking.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Verzoeken kunt u sturen naar{' '}
              <a href="mailto:quinn.berkouwer@gmail.com" className="text-blue-600 underline">quinn.berkouwer@gmail.com</a>.
              Wij reageren binnen 30 dagen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              VestaAI gebruikt uitsluitend functionele sessie-cookies voor authenticatie (Supabase).
              Wij plaatsen geen tracking- of advertentiecookies. Er is geen cookiebanner nodig.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Beveiliging</h2>
            <p className="text-gray-600 leading-relaxed">
              Alle verbindingen verlopen via HTTPS (TLS 1.3). Data in rust is versleuteld via AES-256
              (Supabase standaard). Row Level Security (RLS) zorgt ervoor dat kantoren alleen hun eigen
              data kunnen inzien.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Contact en klachten</h2>
            <p className="text-gray-600 leading-relaxed">
              Voor vragen of klachten over de verwerking van uw persoonsgegevens kunt u contact opnemen via{' '}
              <a href="mailto:quinn.berkouwer@gmail.com" className="text-blue-600 underline">quinn.berkouwer@gmail.com</a>.
              U heeft ook het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens
              (<a href="https://autoriteitpersoonsgegevens.nl" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">autoriteitpersoonsgegevens.nl</a>).
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-20">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 VestaAI</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
            <Link href="/prijzen" className="hover:text-gray-600 transition-colors">Prijzen</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Inloggen</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
