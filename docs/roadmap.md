# VestaAI — Roadmap

> Werklijst, geen logboek. Alleen open items — **klaar = weg**.
> Gesorteerd op prioriteit: 🔴 HOOG · 🟠 MIDDEL · 🟢 LAAG. Per item kort: wat · waarom · waar in de code.
> Laatst herzien: 10 juli 2026.
>
> **Hervat-pointer (Claude-oppakbaar):** Track 4 uit 🟢 — huisstijl-label per voorbeeld (⚠️ DB-migratie), brochure-lettertype, FAQ-uit-chatvragen — daarna social auto-publiceren (🟠, wacht op Meta/LinkedIn-secrets). Volledige E2E-generatie-run zodra testaccount-creds er zijn (zie 🔴). PR #12 (prijzen + middleware + DOCX + e2e) is deze sessie gemerged.

---

## Al gebouwd & live (t/m 10 juli — niet opnieuw doen/checken)

- **Kern & accounts:** proefmodel (30d / 5 obj) + gratis-plan (5/mnd), activerings-/welkomst-/meldingsmails (atomisch), `/admin` v2 met maandverbruik, onboarding-checklist, referral, NPS. Onboarding-flow E2E bewezen op prod t/m dashboard.
- **Generatie:** 504-time-out opgelost via streaming (`messages.stream`) + `maxDuration 300` + in-flight-lock tegen dubbele runs (`/api/generate`, `/api/object/[id]/hergenereer`). Funda-lengte-fix (700+ w, 6-alinea-structuur) in `lib/claude.ts`. ⚠️ *nog niet 1× volledig E2E op prod bevestigd → zie 🔴.*
- **UI:** sidebar-appshell + object-werkruimte met tabs (`AppShell`, `ObjectWorkspace`), dashboard-featurekaarten, losse huisstijl-/chatbot-pagina's.
- **Huisstijl v2:** 20 voorbeeldteksten, stijlprofiel-destillatie, `.txt/.pdf`-upload, aparte brochure-stijl, leren-van-inline-bewerkingen (review-flow via `stijl_bewerkingen`).
- **Chatbot v2/v3:** object-kennis, deelbare publieke chatpagina (aan/uit + cover-foto), documenten-koppeling (opt-in per doc), lead-capture + mail naar makelaar, embed-installatie-instructies, agent-prompt met guardrails (14/14 scenario's, incl. prompt-injection).
- **Media & documenten:** foto-bibliotheek per object (`object_fotos` + Storage), documenten → content-hergeneratie (Files API), PDF-brochure met foto's.
- **Virtual staging:** model → `gemini-2.5-flash-image`. ⚠️ *Gemini-quota moet omhoog → zie 🔴.*
- **Site & infra:** volledige metadata/OG/sitemap/404, `/vertrouwen`-pagina, `e2e/smoke.mjs` (credential-vrije rooktest), prod-DB-migraties allemaal live, copy schoon van verboden claims. Stripe test-mode klaargezet (producten/prijzen/webhook).
- **Prijzen & publieke routes (PR #12, 10 juli):** plan-limieten **Starter 5 / Pro 25 / Kantoor onbeperkt** (soft-cap 100), per-kantoor als hoofdboodschap, "onbeperkt op Pro" overal geschrapt, Pro-kaart-bug (1→5 gebruikers) gefixt — consistent in `lib/plans.ts` + copy + `goals.md`. **Middleware-fix:** alle publieke routes (`/vertrouwen`·`/over-ons`·`/contact`·`/privacy`·`/voorwaarden`, SEO-`/wijken/*`, deelbare `/chat/*`, embed-API's `/api/chat`+`/api/me`+`/api/chatbot`) stonden achter een login-redirect → nu publiek (beveiligde routes ongewijzigd, geverifieerd). `/vertrouwen` gelinkt in nav+footer. **DOCX-upload** in documenten-assistent (`lib/docx.ts`, mammoth-tekstextractie, unit-getest). Authenticated generate-e2e herschreven + kostengate.

---

## 🔴 Kritiek pad — vóór livegang

### Actie Quinn (blokkeert livegang — niks te bouwen tot dit er is)
- **Gemini-tier ophogen** (virtual staging) — `GOOGLE_AI_API_KEY` zit op krappe image-quota, sloeg bij testen meteen op **429**. Verhoog quota in Google AI Studio/Cloud → daarna één **visuele eindcheck** van de staging-output op prod (nieuw model, kon zelf niet beoordelen door 429's).
- **Stripe env in Vercel** — 4 waarden zetten (`STRIPE_PRICE_STARTER/PRO/KANTOOR` + `STRIPE_WEBHOOK_SECRET`, staan in `.env.local`) + check dat `STRIPE_SECRET_KEY` er staat → redeploy. Alles test-mode; betaling hoeft in de testfase nog niet te werken.
- **Testimonial + casestudy pilotmakelaar** — naam/kantoor/quote + concrete tijdsbesparing (placeholder staat klaar in `LandingPageClient.tsx`, pilotkantoor Amsterdam beschikbaar). Belangrijkste marketingactie: HousApp toont 9 verhalen, wij 0.
- **Realworks developer-portaal registreren** (gratis) — beantwoordt de business-case-vraag: teksten schríjven via API of alleen lezen?
- **Gmail opruimen** — de "Confirm your email address"-testmail (`quinn.berkouwer+vestatest@gmail.com`); bijbehorend testaccount is al uit de DB.

### Te doen (Claude)
- **Live-generatie 1× E2E bevestigen** — de authenticated Playwright-test staat nu klaar (`e2e/smoke.spec.ts`: vult via de demo-knop, assert expliciet geen 504, achter `E2E_GENERATE=1`). Draaien: zet `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `E2E_TEST_EMAIL` in de env en run `E2E_GENERATE=1 npm run e2e` (~€0,08/run). Of handmatig één object op prod genereren (< ~2 min, geen 504, duur-log `[generate] verrijking …ms · generatie …ms`). Duurt het > 300 s → pas dán SSE-streaming naar de client bouwen.
- **Volledige feature-audit met ingelogd account** — de meeste features zijn nooit 1× E2E op prod aangeklikt: foto-verbetering, staging, foto-bibliotheek, PDF-export, kalender/plannen, prijswijziging, Realworks-XML, wijkpagina's, referral, NPS, admin-klantenbeheer.

### Na livegang — moat & distributie
- **Realworks-API-koppeling** (i.p.v. XML-download) — via Realworks CRM Marketplace + developer-ID. Wonen API: objecten exporteren, leads importeren. Plan B als schrijven niet kan: objectdata inlezen als autofill van de 8 velden. Let op: oude CasaXML-export (`app/api/export/realworks/route.ts`) faseert uit richting API v3. *Bouwen pas na portaal-registratie (zie Quinn).*
- **Kolibri-koppeling (AppXchange)** — aanmelden via contactformulier (app-store, 1.200+ makelaars). Er zit al een generieke "ChatGPT Advertentieteksten"-app; ons verhaal: suite + Funda-regelset + huisstijl + NL-buurtdata. Aanmelding starten direct na livegang, bouwen daarna.

---

## 🟠 Belangrijk (na livegang)

- **Site-polish** — mobiel (375px) door de kernschermen, Lighthouse landing (>90 perf / >95 a11y) + juridische check van de `/vertrouwen`-teksten. *(Linken van `/vertrouwen` is gedaan; publieke routes stonden achter de middleware-login-redirect — gefixt.)*
- **Documenten-assistent kwaliteitstest** — met realistisch test-PDF: citeert de chat correct, en verwerkt "hergenereer" de feiten (exacte m², staat) aantoonbaar in de teksten?
- **Embed-widget bewijzen** (actie Quinn) — de widget één keer daadwerkelijk op een externe makelaarssite plaatsen en testen; instructies + snippet staan al in `ChatbotTab`.
- **Social media direct publiceren** — Meta/IG + LinkedIn OAuth als sluitstuk van de kalender: `post_planning.status` → cron op de geplande datum. Verhoogt gebruiksfrequentie → lagere churn.
- **Documenten-assistent verbreden** — kantoorbrede documenten (algemene voorwaarden, koopakte-uitleg) naast object-documenten. *(DOCX naast PDF/TXT is gedaan.)*
- **NVM PropTech-programma aanmelden.**
- **Klantverhalen-pagina** — HousApp-model: korte verhalen per kantoor mét cijfers. Na eerste 3–5 klanten.
- **Maandelijkse HousApp-check** (10 min) — changelog/release notes, vacatures (content/LLM), klantverhalen over teksten, Kolibri-blog. Signaal = HousApp beweegt richting content → verdediging §7 activeren.

---

## 🟢 Later / nice-to-have

- **Supabase-mailonderwerpen vernederlandsen** — "Reset your password" / "Confirm your email address" → NL (dashboard → Auth → Email Templates, alleen subject; body's zijn al NL).
- **Onboarding-stappen foto & chatbot** — toevoegen zodra er een betrouwbaar completion-signaal is (foto-resultaten/chatbot-bezoek worden nu niet getrackt).
- **Documenten-ingang in de sidebar** — komt samen met de kantoorbrede documenten-pagina.
- **Huisstijl: label per voorbeeld** (Funda/brochure/social) — laat het stijlprofiel per content-type differentiëren. ⚠️ Vereist DB-migratie (label-kolom op stijl-voorbeelden) + prompt-aanpassing.
- **Brochure: lettertype-voorkeur** — react-pdf font-registratie.
- **FAQ-limiet heroverwegen** — `LIMIT 30` in `/api/chat` nu object-kennis er is; FAQ-suggesties genereren uit veelgestelde chatvragen.
- **NVM-contact Funda-partneraccess** — lange termijn; "genereer → staat live" is het eindspel.
- **Google Ads activeren bij €5K MRR** (€500/mnd).
- **Vercel AI Gateway** — per-gebruiker kostentracking + budget alerts; loont pas bij 10+ actieve klanten.

---

## Bewust níet doen

*Focusbewaking (concurrentieanalyse §6.8/§9): complementair aan workflow-tools zijn is een feature.*

- ❌ Geen AI-inbox (e-mail/WhatsApp) — kernproduct HousApp, jaar voorsprong + funding.
- ❌ Geen bezichtigingsplanner.
- ❌ Geen leadgen-widgets/woningwaardering als leadmagneet — chatbot-leads per object zijn ons antwoord.

---

## Permanente kwaliteit

- `npm run typecheck` + `npm run test` altijd groen vóór elke commit.
- Lighthouse landing: >90 performance, >95 accessibility.
- Elk nieuw scherm mobile-responsive checken.
