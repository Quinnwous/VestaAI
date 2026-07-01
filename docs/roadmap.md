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
- **vestaai.nl domein** — gekocht, DNS ingesteld bij TransIP (A `76.76.21.21`, www CNAME Vercel, Resend DKIM/SPF/DMARC/MX). Checken na propagatie (30 min–paar uur):
  1. `vestaai.nl` bereikbaar via browser
  2. Resend dashboard → Domains → **Verify** klikken tot groen
  3. Supabase → Auth → SMTP Settings → Sender Email wijzigen naar `noreply@vestaai.nl`
  4. Supabase → Authentication → URL Configuration → Site URL wijzigen naar `https://vestaai.nl`
- **Supabase bevestigingsmail werkt nog niet** — geen mail ontvangen bij registratie. Stap 3 hierboven lost dit op zodra Resend geverifieerd is. Controleer ook of SMTP-wachtwoord exact de `re_...` Resend API key is en Username letterlijk `resend` (niet het e-mailadres).

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
