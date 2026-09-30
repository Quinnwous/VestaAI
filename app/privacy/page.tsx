import Link from 'next/link'
import type { Metadata } from 'next'
import { PublicFooter } from '@/components/PublicFooter'
import { PlausibleScript } from '@/components/PlausibleScript'

export const metadata: Metadata = {
  title: 'Privacyverklaring — VestaAI',
  description: 'Hoe VestaAI omgaat met uw persoonsgegevens en objectdata.',
  alternates: {
    canonical: '/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PlausibleScript />
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
        <p className="text-sm text-gray-400 mb-12">Laatst bijgewerkt: 30 september 2026</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-10">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Wie zijn wij?</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              VestaAI is een product van Quinn Berkouwer, gevestigd in Nederland.
              Contactadres: <a href="mailto:quinn.berkouwer@gmail.com" className="text-blue-600 underline">quinn.berkouwer@gmail.com</a>.
              VestaAI is een platform voor de Nederlandse makelaardij — in de huisstijl van uw kantoor —
              met woningwaardering en marktinzicht op de eigen transactiedataset van het kantoor, plus een
              complete contentsuite per woning. Toegang is admin-beheerd: uw kantoor kent geen registratie
              in eigen beheer.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Voor uw accountgegevens en uw bezoek aan deze website is VestaAI <strong>verwerkingsverantwoordelijke</strong>.
              Voor de woningdossiers en de transactiedataset van uw kantoor is <strong>uw kantoor</strong> verwerkingsverantwoordelijke
              en treedt VestaAI op als <strong>verwerker</strong>, conform de verwerkersovereenkomst tussen uw kantoor en VestaAI.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Welke gegevens verwerken wij?</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-800 mb-1">Accountgegevens</p>
                <p className="text-gray-600 leading-relaxed">
                  Naam, e-mailadres en kantoorgegevens die de platform-admin voor uw kantoor aanmaakt.
                  Opgeslagen via Supabase (GDPR-compliant, datacenters in de EU).
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Objectdata</p>
                <p className="text-gray-600 leading-relaxed">
                  Adres, woningtype, m², bouwjaar, energielabel, vraagprijs en USP&apos;s die u invoert.
                  Deze gegevens worden gebruikt voor de waardebepaling en om content te genereren.
                  Wij verkopen of delen deze data niet met derden.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Transactiedataset</p>
                <p className="text-gray-600 leading-relaxed">
                  De eigen verkoopdata van uw kantoor (adres, verkoopprijs, verkoopdatum en woningkenmerken),
                  die de platform-admin voor u importeert en gebruikt voor de waardebepaling, marktanalyse en
                  concurrentieanalyse. De combinatie van adres en verkoopprijs is een persoonsgegeven in de zin
                  van de AVG en wordt met dezelfde zorgvuldigheid behandeld als objectdata. Per kantoor
                  afgeschermd via row-level security: uw kantoor ziet nooit de data van een ander kantoor. Voor
                  deze dataset treedt VestaAI op als verwerker namens uw kantoor; uw kantoor blijft hiervoor
                  verwerkingsverantwoordelijke.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Huisstijlgegevens</p>
                <p className="text-gray-600 leading-relaxed">
                  Logo, kleuren, lettertype en voorbeeldteksten van uw kantoor, beheerd door de platform-admin.
                  Opgeslagen in Supabase Storage, alleen toegankelijk voor uw kantoor.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Waarvoor gebruiken wij uw gegevens?</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 leading-relaxed">
              <li>Het uitvoeren van de dienst (waardebepaling, marktinzicht en content genereren via Claude AI, virtual staging via Gemini)</li>
              <li>Transactionele e-mails (accountmeldingen, wachtwoordherstel) via Resend</li>
              <li>Klantenservice en technische ondersteuning</li>
              <li>Verbetering van de dienst op basis van anonieme, cookieloze gebruiksstatistieken (Plausible)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Derde partijen en doorgifte buiten de EER</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Onze database (Supabase) draait in Frankfurt en onze serverfuncties (Vercel) draaien eveneens in
              Frankfurt. Voor een aantal ondersteunende diensten gaan gegevens naar een leverancier in de
              Verenigde Staten. Elke doorgifte daarnaartoe is afgedekt door het EU-VS Data Privacy Framework
              en/of modelbepalingen (Standard Contractual Clauses) — per leverancier hieronder aangegeven.
            </p>
            <div className="space-y-4">
              {[
                ['Supabase', 'Database, authenticatie en opslag. Project gehost in de EU (Frankfurt). Verwerkersovereenkomst met modelbepalingen voor eventuele doorgifte naar sub-verwerkers buiten de EER.'],
                ['Anthropic (Claude API)', 'AI-generatie voor content en USP-extractie. Amerikaans bedrijf — doorgifte afgedekt via modelbepalingen in Anthropic’s verwerkersovereenkomst; Anthropic staat niet in het Data Privacy Framework-register. Zonder aparte zero-data-retention-afspraak verwijdert Anthropic uw prompts en de gegenereerde tekst automatisch binnen 30 dagen, en gebruikt ze niet om modellen te trainen zonder uw toestemming.'],
                ['Google (Gemini API)', 'AI-generatie voor virtual staging, op de betaalde laag. Doorgifte afgedekt door zowel het EU-VS Data Privacy Framework (Google LLC is gecertificeerd) als modelbepalingen. Op de betaalde laag gebruikt Google uw foto’s niet om producten of modellen te verbeteren.'],
                ['Resend', 'Transactionele e-mails (accountmeldingen, wachtwoordherstel). Amerikaans bedrijf, gecertificeerd onder het EU-VS Data Privacy Framework.'],
                ['Vercel', 'Hosting en serverfuncties, draaiend in Frankfurt. Amerikaans bedrijf, gecertificeerd onder het EU-VS Data Privacy Framework en met modelbepalingen in de verwerkersovereenkomst.'],
                ['Plausible', 'Cookieloze, geanonimiseerde websitestatistieken op onze publieke pagina’s. Europees bedrijf (Estland); gegevens worden verwerkt en opgeslagen op Europese infrastructuur en verlaten de EU niet.'],
              ].map(([partij, beschrijving]) => (
                <div key={partij} className="flex gap-3 flex-col sm:flex-row">
                  <span className="font-medium text-gray-800 w-44 flex-shrink-0">{partij}</span>
                  <span className="text-gray-600 leading-relaxed">{beschrijving}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs leading-relaxed mt-4">
              Deze paragraaf geeft de stand van zaken op 30 september 2026 weer; certificeringen en
              overeenkomsten kunnen door de leverancier zelf worden gewijzigd.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Bewaartermijn</h2>
            <p className="text-gray-600 leading-relaxed">
              Objectdata, de transactiedataset en gegenereerde teksten worden bewaard zolang de toegang van
              uw kantoor actief is. Trekt de platform-admin de toegang van een kantoor in, dan worden de
              gegevens binnen 90 dagen verwijderd, tenzij een wettelijke bewaarplicht een langere termijn
              vereist.
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
              VestaAI gebruikt functionele sessie-cookies voor authenticatie (Supabase) en cookieloze,
              geanonimiseerde websitestatistieken (Plausible) op onze publieke pagina&apos;s.
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

      <PublicFooter links={[{ href: '/', label: 'Home' }, { href: '/vertrouwen', label: 'Vertrouwen' }, { href: '/login', label: 'Inloggen' }]} />
    </div>
  )
}
