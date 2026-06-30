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
