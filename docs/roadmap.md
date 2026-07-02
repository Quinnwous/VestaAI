# VestaAI — Roadmap

> Alleen open items staan hier. Klaar = weg.

---

## Openstaand — 2 juli 2026

> ✅ Klaar (2 juli): wachtwoord-reset, self-signup + e-mailbevestiging (beide button-gated token_hash), Resend-domein + `noreply@vestaai.nl`, RLS-recursie, self-heal + `handle_new_user`-trigger, platform-admin + klantenbeheer, plan-gating. Details in geheugen `[[auth-onboarding-architecture]]`.

### Fase 1 — Product afronden

- **Object-generatie time-out (HOOG — klant-hinder)** — `/api/generate` liep 1× 180s vast (Vercel 504); de client toont dan "The string did not match the expected pattern" (kapotte JSON-parse van de time-out-HTML). Onderzoek `generateContent` in `lib/claude.ts` (2 retries) + `fetchVerrijking` in `lib/verrijking.ts` (externe API's). Ook: client-side nette fout tonen i.p.v. `res.json()` op niet-JSON.
- **Live end-to-end verifiëren (volgende sessie)** — gmail → `/admin`; wijs iCloud test een plan toe (Pro) → iCloud-dashboard werkt (max 15/mnd); account zónder plan → "niet geactiveerd"-melding; reset + self-signup nog eens live doorlopen.
- E2e smoke test op Vercel: registreer account → genereer object → exporteer PDF — volledig doorlopen
- **Free trial wordt 30 dagen** (was 14) — overal doorvoeren: landingspagina- en prijzenpagina-copy, `docs/goals.md`, de standaard trial-periode die de admin toekent, en straks de Stripe-trial-instelling. Vrijblijvend framen ("30 dagen gratis, geen verplichtingen") — HousApp zet die norm.
- **Abonnementen opnieuw uitdenken (vóór Stripe-activering)** — welke plannen met hoeveel objecten/maand? En de prijscommunicatie omgooien naar HousApp-model: **prijs per makelaar adverteren** (excl. btw publiceren) voor het aanvankelijke aantal makelaars — oogt goedkoper dan één kantoorprijs, terwijl per-kantoor als "hele kantoor voor één prijs" het onderscheidend voordeel blijft. Input: `docs/concurrentieanalyse-housapp.md` §5 (HousApp: €29–167 per makelaar/mnd). Let op: `lib/plans.ts`-limieten (5/15/100) en prijzenpagina moeten mee.
- Stripe: Starter (€60/mo, €600/jr), Pro (€150/mo, €1.500/jr), Kantoor (€500/mo, €5.000/jr) price IDs aanmaken → in Vercel env — uitgesteld tot na gratis testfase én tot na de abonnements-herziening hierboven
- Stripe webhook configureren op Vercel (`/api/webhooks/stripe`) — uitgesteld tot na gratis testfase

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
