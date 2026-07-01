# VestaAI — Roadmap

> Alleen open items staan hier. Klaar = weg.

---

## Openstaand — 1 juli 2026

### Fase 1 — Product afronden

- E2e smoke test op Vercel: registreer account → genereer object → exporteer PDF — volledig doorlopen
- Stripe: Starter (€99/mo, €990/jr), Pro (€199/mo, €1.990/jr), Kantoor (€599/mo, €5.990/jr) price IDs aanmaken → in Vercel env — uitgesteld tot na gratis testfase
- Stripe webhook configureren op Vercel (`/api/webhooks/stripe`) — uitgesteld tot na gratis testfase

---

### Fase 2 — Live brengen

- Output kwaliteit valideren: buurtomschrijvingen accuraat? Instagram-varianten bruikbaar? Huisstijl correct toegepast?

---

### Fase 3 — Groei (eerste 5–50 kantoren)

**Landingspagina versterken**

- Testimonial toevoegen (naam, kantoor, quote + tijdsbesparing) — placeholder staat klaar in LandingPageClient.tsx
- Product in actie: GIF of embedded screenrecording van de generatie-flow — placeholder staat klaar

**Go-to-market**

- NVM PropTech-programma aanmelden

**Koppelingen**

- Social media direct posten via API (Meta Business API + LinkedIn OAuth)
- Chatbot-widget testen op externe makelaarsite (embed-snippet staat klaar in ChatbotTab)
- NVM-contact leggen voor formele Funda-partneraccess

**Monitoring**

- Google Ads activeren bij €5K MRR (€500/mnd budget)

---

### Permanente kwaliteit

- `npm run typecheck` altijd groen voor elke commit
- `npm run test` altijd groen
- Lighthouse landingspagina: >90 performance, >95 accessibility
- Mobile-responsive: check elk nieuw scherm
