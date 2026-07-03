# VestaAI — Roadmap

> Alleen open items staan hier. Klaar = weg.

---

## Openstaand — 3 juli 2026

> ✅ Klaar (3 juli): proefperiode-model live (30 dagen / 5 objecten totaal, trigger + vangnet + verlopen-schermen), gratis-plan (5/mnd), activeringsmail + welkomstmail + registratiemelding (atomisch, nooit dubbel), maandverbruik op /admin, uitloggen → homepage, referral-trigger-fix (search_path — stille signup-breuk sinds 1 juli), reset- en registratie-flow live bewezen E2E, Stripe test-mode klaargezet (producten/prijzen/webhook). Details in geheugen `[[auth-onboarding-architecture]]`.

### Fase 1 — Product afronden

- **Object-generatie time-out (HOOG — klant-hinder)** — `/api/generate` liep 1× 180s vast (Vercel 504); de client toont dan "The string did not match the expected pattern" (kapotte JSON-parse van de time-out-HTML). Onderzoek `generateContent` in `lib/claude.ts` (2 retries) + `fetchVerrijking` in `lib/verrijking.ts` (externe API's). Ook: client-side nette fout tonen i.p.v. `res.json()` op niet-JSON.
- **Stripe afmaken (actie Quinn + daarna checkout-smoke-test)** — 4 env-waarden in Vercel zetten (STRIPE_PRICE_STARTER/PRO/KANTOOR + STRIPE_WEBHOOK_SECRET, waarden staan in `.env.local`) en checken dat STRIPE_SECRET_KEY daar staat → redeploy → Claude test checkout-redirect. Let op: alles is **test-mode** (sk_test); vóór echte facturatie live-mode key + prices/webhook opnieuw + de prijsherziening hieronder.
- **Proef-copy naar 30 dagen** — systeem staat al op 30 dagen / 5 objecten; de site zegt nog "14 dagen gratis" op ±12 plekken (landingspagina, /prijzen incl. FAQ-belofte "alle functies van het Kantoor-plan", login, over-ons, wijken, opengraph) + `docs/goals.md`. Framing: "30 dagen gratis, geen verplichtingen" (HousApp-norm).
- **Supabase-mailonderwerpen vernederlandsen** — "Reset your password" / "Confirm your email address" → NL (Supabase dashboard → Auth → Email Templates, alleen subject-veld; body's zijn al NL).
- E2e smoke test op Vercel: registreer account → genereer object → exporteer PDF — volledig doorlopen
- **Abonnementen opnieuw uitdenken (vóór livegang betalingen)** — welke plannen met hoeveel objecten/maand? En de prijscommunicatie omgooien naar HousApp-model: **prijs per makelaar adverteren** (excl. btw publiceren) voor het aanvankelijke aantal makelaars — oogt goedkoper dan één kantoorprijs, terwijl per-kantoor als "hele kantoor voor één prijs" het onderscheidend voordeel blijft. Input: `docs/concurrentieanalyse-housapp.md` §5 (HousApp: €29–167 per makelaar/mnd). Let op: `lib/plans.ts`-limieten (5/15/100) en prijzenpagina moeten mee; daarna Stripe-prices vervangen (price-swap).

---

### Fase 2 — Live brengen

- Output kwaliteit valideren: buurtomschrijvingen accuraat? Instagram-varianten bruikbaar? Huisstijl correct toegepast?

---

### Fase 3 — Groei (eerste 5–50 kantoren)

**Landingspagina versterken**

- Testimonial toevoegen (naam, kantoor, quote + tijdsbesparing) — placeholder staat klaar in LandingPageClient.tsx
- **vestaai.nl domein** — ✅ werkt (Site URL Supabase = `https://vestaai.nl`, géén `/**`).
- **Resend e-mail** — ✅ domein geverifieerd, custom SMTP aan, afzender `noreply@vestaai.nl`, mails komen in de inbox.

**Vertrouwen & AVG**

- AVG-/vertrouwenspagina toevoegen: klantgegevens worden niet verkocht en niet voor andere doeleinden gebruikt, data staat in een beveiligde database in de EU (Supabase), geen training van AI-modellen op klantdata, verwerkersovereenkomst als download. Vergelijk: HousApp voert SOC 2 Type 2 + AVG prominent als verkoopargument (`docs/concurrentieanalyse-housapp.md` §6).

**Go-to-market**

- NVM PropTech-programma aanmelden

**Koppelingen**

- **Echte Realworks- én Kolibri-koppeling** (API i.p.v. de huidige XML-download). Strategisch belang: workflow-lock-in + distributie (zie `docs/concurrentieanalyse-housapp.md` §6). Verkenning 3 juli 2026:
  - *Realworks:* makelaar koopt de API via de Realworks CRM Marketplace; wij koppelen met een developer-ID via developers.realworks.nl. Relevante API: **Wonen API** (objecten exporteren, leads importeren). **Open vraag die de business case bepaalt:** kunnen aanbiedingsteksten via de API ook geschréven worden, of alleen gelezen? → registreren op het developer-portaal (gratis) en docs checken. Plan B als schrijven niet kan: objectdata inlezen als autofill van de 8 velden — ook al een sterk verkoopargument. Kosten marketplace-API's nog onbekend.
  - *Kolibri:* aanmelden voor de **AppXchange** (hun app-store, 1.200+ makelaars) via contactformulier; API-first architectuur. Daar zit al een "ChatGPT Advertentieteksten"-app — de route bestaat bewezen, maar er zit dus ook al een generieke concurrent; ons verhaal: suite + Funda-regelset + huisstijl + NL-buurtdata.
  - *Let op:* Realworks faseert oude XML/endpoints uit richting API v3 — huidige Realworks-XML-export hierop controleren.
  - *Volgorde:* (1) nu developer-portaal registreren + schrijfvraag beantwoorden, (2) Kolibri-aanmelding starten na livegang (doorlooptijd onbekend, vroeg beginnen), (3) pas bouwen ná de time-out-fix en outputvalidatie.
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
