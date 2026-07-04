'use client'

import { useState } from 'react'

type FaqItem = {
  id: string
  vraag: string
  antwoord: string
  volgorde: number
}

type Lead = {
  id: string
  naam: string | null
  email: string
  bericht: string | null
  created_at: string
}

interface Props {
  kantoorId: string
  kantoorNaam: string
  faqItems: FaqItem[]
  leads: Lead[]
}

export function ChatbotTab({ kantoorId, faqItems: initFaq, leads: initLeads }: Props) {
  const [faq, setFaq] = useState<FaqItem[]>(initFaq)
  const [leads] = useState<Lead[]>(initLeads)
  const [nieuwVraag, setNieuwVraag] = useState('')
  const [nieuwAntwoord, setNieuwAntwoord] = useState('')
  const [opslaan, setOpslaan] = useState(false)
  const [verwijderenId, setVerwijderenId] = useState<string | null>(null)
  const [embedGekopieerd, setEmbedGekopieerd] = useState(false)
  const [webbouwerGekopieerd, setWebbouwerGekopieerd] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const embedSnippet = `<!-- VestaAI Chatbot Widget -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${appUrl}/widget/chatbot.js';
    s.dataset.kantoorId = '${kantoorId}';
    s.async = true;
    document.head.appendChild(s);
  })();
</script>`

  const webbouwerMail = `Onderwerp: Chatbot-widget plaatsen op onze website

Hoi,

Kun je onderstaand script toevoegen aan onze website? Het plaatst een chatbot rechtsonder in beeld waarmee bezoekers vragen over onze woningen kunnen stellen.

Plaats de code vlak vóór de sluitende </head>-tag, of via de "custom code / header scripts"-instelling van ons platform:

${embedSnippet}

Dit werkt op elke website (WordPress, Wix, Squarespace of eigen bouw) en heeft verder geen aanpassingen nodig. Laat je het weten als het geplaatst is?

Met vriendelijke groet`

  const handleToevoegen = async (e: React.FormEvent) => {
    e.preventDefault()
    setOpslaan(true)
    const res = await fetch('/api/chatbot/faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kantoor_id: kantoorId,
        vraag: nieuwVraag,
        antwoord: nieuwAntwoord,
        volgorde: faq.length,
      }),
    })
    if (res.ok) {
      const { id } = await res.json()
      setFaq(prev => [...prev, { id, vraag: nieuwVraag, antwoord: nieuwAntwoord, volgorde: faq.length }])
      setNieuwVraag('')
      setNieuwAntwoord('')
    }
    setOpslaan(false)
  }

  const handleVerwijder = async (id: string) => {
    setVerwijderenId(id)
    const res = await fetch(`/api/chatbot/faq/${id}`, { method: 'DELETE' })
    if (res.ok) setFaq(prev => prev.filter(f => f.id !== id))
    setVerwijderenId(null)
  }

  const kopieerEmbed = async () => {
    await navigator.clipboard.writeText(embedSnippet)
    setEmbedGekopieerd(true)
    setTimeout(() => setEmbedGekopieerd(false), 2500)
  }

  const kopieerWebbouwer = async () => {
    await navigator.clipboard.writeText(webbouwerMail)
    setWebbouwerGekopieerd(true)
    setTimeout(() => setWebbouwerGekopieerd(false), 2500)
  }

  return (
    <div className="max-w-2xl space-y-10">

      {/* Embed-code */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Chatbot op uw website</h2>
        <p className="text-xs text-gray-500 mb-3">
          Plak dit script-snippet in de <code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code> van uw kantoorwebsite. De chatbot verschijnt als een knop rechtsonder.
        </p>
        <div className="relative">
          <pre className="rounded-xl bg-gray-900 text-gray-100 text-xs p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
            {embedSnippet}
          </pre>
          <button
            onClick={kopieerEmbed}
            className="absolute top-3 right-3 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 transition-colors"
          >
            {embedGekopieerd ? '✓ Gekopieerd' : 'Kopieer'}
          </button>
        </div>
      </section>

      {/* Installatie-instructies */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Zo plaats je de widget</h2>
        <p className="text-xs text-gray-500 mb-3">
          Kies je platform voor een stap-voor-stap-uitleg. Bouwt iemand anders je site? Stuur dan de kant-en-klare mail onderaan.
        </p>

        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-900 flex items-center justify-between hover:bg-gray-50">
              WordPress
              <span className="text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <ol className="px-4 pb-4 pt-1 text-xs text-gray-600 leading-relaxed list-decimal list-inside space-y-1">
              <li>Installeer een gratis plugin als <span className="font-medium">&ldquo;WPCode&rdquo;</span> of <span className="font-medium">&ldquo;Insert Headers and Footers&rdquo;</span>.</li>
              <li>Ga naar de instelling <span className="font-medium">Header / &lt;head&gt;-scripts</span>.</li>
              <li>Plak daar het script hierboven en sla op.</li>
              <li>Ververs je website — de chatbot-knop staat rechtsonder.</li>
            </ol>
          </details>

          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-900 flex items-center justify-between hover:bg-gray-50">
              Wix
              <span className="text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <ol className="px-4 pb-4 pt-1 text-xs text-gray-600 leading-relaxed list-decimal list-inside space-y-1">
              <li>Ga in het Wix-dashboard naar <span className="font-medium">Instellingen → Custom Code</span>.</li>
              <li>Klik <span className="font-medium">+ Add Custom Code</span> en plak het script.</li>
              <li>Kies bij &ldquo;Place Code in&rdquo; voor <span className="font-medium">Head</span> en bij &ldquo;Apply to&rdquo; voor <span className="font-medium">All pages</span>.</li>
              <li>Publiceer je site opnieuw.</li>
            </ol>
          </details>

          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-900 flex items-center justify-between hover:bg-gray-50">
              Eigen website of andere bouwer
              <span className="text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <ol className="px-4 pb-4 pt-1 text-xs text-gray-600 leading-relaxed list-decimal list-inside space-y-1">
              <li>Open het HTML-bestand of het CMS-onderdeel waar de <code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code> staat.</li>
              <li>Plak het script vlak vóór de sluitende <code className="bg-gray-100 px-1 rounded">&lt;/head&gt;</code>-tag.</li>
              <li>Zet de wijziging live. Het script laadt op elke pagina en toont de knop rechtsonder.</li>
            </ol>
          </details>
        </div>

        {/* Stuur naar je webbouwer */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Stuur naar je webbouwer</h3>
            <button
              onClick={kopieerWebbouwer}
              className="text-xs rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 transition-colors flex-shrink-0"
            >
              {webbouwerGekopieerd ? '✓ Gekopieerd' : 'Kopieer mailtekst'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">Kant-en-klaar mailtje inclusief het script — plak in een mail aan wie je site beheert.</p>
          <pre className="rounded-lg bg-white border border-gray-200 text-gray-600 text-xs p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-sans">
            {webbouwerMail}
          </pre>
        </div>
      </section>

      {/* FAQ-beheer */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Kennisbasis (FAQ)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Voeg veelgestelde vragen en antwoorden toe. De chatbot gebruikt deze als kennisbasis bij het beantwoorden van bezoekersvragen.
        </p>

        {faq.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">Nog geen FAQ-items. Voeg hieronder het eerste item toe.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 mb-4 overflow-hidden">
            {faq.map((item) => (
              <div key={item.id} className="px-4 py-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.vraag}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.antwoord}</p>
                  </div>
                  <button
                    onClick={() => handleVerwijder(item.id)}
                    disabled={verwijderenId === item.id}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
                    aria-label="Verwijder FAQ-item"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleToevoegen} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nieuw FAQ-item</h3>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Vraag</label>
            <input
              type="text"
              value={nieuwVraag}
              onChange={e => setNieuwVraag(e.target.value)}
              required
              placeholder="Bijv. 'Hoe lang duurt een bezichtiging?'"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Antwoord</label>
            <textarea
              value={nieuwAntwoord}
              onChange={e => setNieuwAntwoord(e.target.value)}
              required
              rows={3}
              placeholder="Bijv. 'Een bezichtiging duurt gemiddeld 30 tot 45 minuten.'"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={opslaan}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {opslaan ? 'Opslaan...' : 'Toevoegen'}
          </button>
        </form>
      </section>

      {/* Leads */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Leads ({leads.length})
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          E-mailadressen die bezoekers hebben achtergelaten via de chatbot.
        </p>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400">Nog geen leads ontvangen.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {leads.map(lead => (
              <div key={lead.id} className="px-4 py-3 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    {lead.naam && <p className="text-sm font-medium text-gray-900">{lead.naam}</p>}
                    <p className="text-sm text-blue-600">{lead.email}</p>
                    {lead.bericht && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lead.bericht}</p>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
