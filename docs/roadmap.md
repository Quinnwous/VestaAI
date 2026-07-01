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
- **vestaai.nl domein** — ✅ werkt, Vercel toont "Valid Configuration", Site URL in Supabase bijgewerkt naar `https://vestaai.nl`
- **Resend e-mail instellen** — DNS-records (DKIM) in TransIP toegevoegd, verificatie bij Resend is pending. Zodra groen:
  1. Supabase → Authentication → SMTP Settings → **Enable custom SMTP** aan
  2. Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: Resend API key (`re_...`)
  3. Sender email: `noreply@vestaai.nl`
  4. Testen: nieuwe registratie → bevestigingsmail moet binnenkomen van `@vestaai.nl`

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
