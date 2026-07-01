# VestaAI — Roadmap

> Alleen open items staan hier. Klaar = weg.

---

## Openstaand — 1 juli 2026

### Fase 1 — Product afronden

- E2e smoke test op Vercel: registreer account → genereer object → exporteer PDF — volledig doorlopen
- Stripe: Starter (€60/mo, €600/jr), Pro (€150/mo, €1.500/jr), Kantoor (€500/mo, €5.000/jr) price IDs aanmaken → in Vercel env — uitgesteld tot na gratis testfase
- Stripe webhook configureren op Vercel (`/api/webhooks/stripe`) — uitgesteld tot na gratis testfase

---

### Fase 2 — Live brengen

- Output kwaliteit valideren: buurtomschrijvingen accuraat? Instagram-varianten bruikbaar? Huisstijl correct toegepast?

---

### Fase 3 — Groei (eerste 5–50 kantoren)

**Landingspagina versterken**

- Testimonial toevoegen (naam, kantoor, quote + tijdsbesparing) — placeholder staat klaar in LandingPageClient.tsx
- Domein kopen (vestaai.nl of vergelijkbaar) → daarna in Supabase: Project Settings → Auth → SMTP Provider → Sender Email aanpassen van `onboarding@resend.dev` naar `noreply@vestaai.nl` (domein eerst verifiëren in Resend dashboard)

**Go-to-market**

- NVM PropTech-programma aanmelden

**Koppelingen**

- Social media direct posten via API (Meta Business API + LinkedIn OAuth)
- Chatbot-widget testen op externe makelaarsite (embed-snippet staat klaar in ChatbotTab)
- NVM-contact leggen voor formele Funda-partneraccess

**Monitoring**

- Google Ads activeren bij €5K MRR (€500/mnd budget)
- Vercel AI Gateway activeren: per-gebruiker kostentracking, rate limiting en budget alerts (nu nog niet nodig, loont pas bij 10+ actieve klanten)

---

### Permanente kwaliteit

- `npm run typecheck` altijd groen voor elke commit
- `npm run test` altijd groen
- Lighthouse landingspagina: >90 performance, >95 accessibility
- Mobile-responsive: check elk nieuw scherm
