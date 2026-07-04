# VestaAI — Roadmap

> Alleen open items staan hier. Klaar = weg.
> Per item: **wat · waarom · waar in de code · afhankelijkheden**. Prioriteit: 🔴 HOOG · 🟠 MIDDEL · 🟢 LAAG.
> Laatst herzien: 3 juli 2026 (productanalyse: dashboard-vindbaarheid, huisstijl v2, chatbot v2, media/documenten, integraties).

> ✅ Klaar (3 juli): proefperiode-model live (30 dagen / 5 objecten totaal, trigger + vangnet + verlopen-schermen), gratis-plan (5/mnd), activeringsmail + welkomstmail + registratiemelding (atomisch, nooit dubbel), maandverbruik op /admin, uitloggen → homepage, referral-trigger-fix (search_path — stille signup-breuk sinds 1 juli), reset- en registratie-flow live bewezen E2E, Stripe test-mode klaargezet (producten/prijzen/webhook). Details in geheugen `[[auth-onboarding-architecture]]`.

**Kerninzicht uit de analyse van 3 juli:** veel features die "missen" bestáán al, maar zijn onvindbaar. Foto-verbetering, virtual staging en de documenten-assistent (VvE/kadaster-upload + chat) zitten verstopt onderaan de object-detailpagina; de chatbot zit alleen in een admin-tab van Instellingen. Fase 1b (vindbaarheid) verzilvert dus bestaand werk — hoogste rendement per bouwuur.

---

## Fase 1 — Betrouwbaarheid & basis

*Zonder betrouwbaar kernproduct is elke feature-uitbreiding zinloos (concurrentieanalyse §6.1). Deze fase gaat vóór alles.*

- 🔴 **Object-generatie time-out (klant-hinder)** — `/api/generate` liep 1× 180s vast (Vercel 504); de client toont dan "The string did not match the expected pattern" (kapotte JSON-parse van de time-out-HTML). Onderzoek `generateContent` in `lib/claude.ts` (2 retries) + `fetchVerrijking` in `lib/verrijking.ts` (externe API's). Ook: client-side nette fout tonen i.p.v. `res.json()` op niet-JSON. *Blokkeert outputvalidatie en alle demo's.*
- 🔴 **E2e smoke test op Vercel** — registreer account → genereer object → exporteer PDF, volledig doorlopen.
- 🔴 **Output-kwaliteit valideren** — buurtomschrijvingen accuraat? Instagram-varianten bruikbaar? Huisstijl correct toegepast? *Doe dit vóór de huisstijl-v2-bouw (Fase 1c): eerst weten wat de huidige 3 voorbeelden opleveren.*
- 🔴 **Stripe afmaken (actie Quinn + daarna checkout-smoke-test)** — 4 env-waarden in Vercel zetten (STRIPE_PRICE_STARTER/PRO/KANTOOR + STRIPE_WEBHOOK_SECRET, waarden staan in `.env.local`) en checken dat STRIPE_SECRET_KEY daar staat → redeploy → Claude test checkout-redirect. Let op: alles is **test-mode** (sk_test); vóór echte facturatie live-mode key + prices/webhook opnieuw + de prijsherziening hieronder.
- 🟠 **Abonnementen opnieuw uitdenken (vóór livegang betalingen)** — welke plannen met hoeveel objecten/maand? En de prijscommunicatie omgooien naar HousApp-model: **prijs per makelaar adverteren** (excl. btw publiceren) voor het aanvankelijke aantal makelaars — oogt goedkoper dan één kantoorprijs, terwijl per-kantoor als "hele kantoor voor één prijs" het onderscheidend voordeel blijft. Input: `docs/concurrentieanalyse-housapp.md` §5 (HousApp: €29–167 per makelaar/mnd). Let op: `lib/plans.ts`-limieten (5/15/100) en prijzenpagina moeten mee; daarna Stripe-prices vervangen (price-swap). Neem hierin mee: (a) is 5 objecten genoeg om in 30 dagen overtuigd te raken? (b) huisstijl-v2-features (Fase 1c) als Pro/Kantoor-differentiator.
- 🟢 **Supabase-mailonderwerpen vernederlandsen** — "Reset your password" / "Confirm your email address" → NL (Supabase dashboard → Auth → Email Templates, alleen subject-veld; body's zijn al NL).

---

## Fase 1b — Dashboard & vindbaarheid 🔴

*✅ Gebouwd (3 juli): route-group `app/(app)/` met vaste **sidebar** (`components/AppShell.tsx`) i.p.v. de 3-links-header; **object-werkruimte** met tabs Content · Foto's & staging · Documenten · Export & delen (`components/ObjectWorkspace.tsx`); **dashboard-feature-kaarten** "Dit kan VestaAI" (`components/FeatureKaarten.tsx`); losse `/huisstijl`- en `/chatbot`-pagina's; admin kreeg `app/admin/layout.tsx`, `NavHeader`/`NavLinks` weg. **Tweede wave:** Huisstijl- & Chatbot-tab uit `/settings` gehaald (ontdubbeld), referral zichtbaar voor alle rollen (`ReferralPanel` ontgated), onboarding-checklist +document/+post-stap met completion-detectie, kalender-landingspagina (uitleg + lege-staat), proef-copy overal 14→30 dagen. Typecheck + build groen.*

- ✅ **Chatbot-rolgating** (4 juli, live) — besluit: **FAQ bewerken = alleen admin**, FAQ lezen + leads bekijken = iedere makelaar. De API-routes (`/api/chatbot/faq` POST/DELETE) enforced admin al server-side (403); de UI volgt nu: `ChatbotTab` krijgt `isAdmin` mee, verbergt voor niet-admins het toevoegformulier + verwijderknoppen en toont een leesnotitie. De object-chatpagina-tab in de werkruimte (Deel-chatbot) is er al (Fase 1d).
- 🟢 **Onboarding-stappen foto & chatbot** — de checklist heeft nu account/object/huisstijl/document/post mét completion-detectie. "Verbeter een foto" en "bekijk je object-chatbot" ontbreken nog omdat er geen betrouwbaar completion-signaal is (foto-resultaten worden niet bewaard → Fase 2; chatbot-bezoek wordt niet getrackt). Toevoegen zodra dat signaal bestaat.
- 🟢 **Documenten-ingang in de sidebar** — bewust nog niet toegevoegd; per-woning-documenten leven in de werkruimte. Komt met de kantoorbrede documenten-pagina in Fase 2.
- ✅ **Publieke/marketing-pagina's voor ingelogde bezoekers** (4 juli, live) — `/` redirect ingelogde gebruikers al naar `/dashboard`/`/admin`. `PublicNav` (contact/over-ons/voorwaarden) toont nu "Naar dashboard" i.p.v. "Inloggen" via een lichtgewicht `GET /api/me`-check (pagina's blijven statisch; bewust géén Supabase-client in de bundel). *Rest (🟢): `/prijzen` heeft een eigen header (niet `PublicNav`) en toont ingelogd nog "Inloggen/Aanmelden" — losstaand mee te nemen.*

---

## Fase 1c — Huisstijl-systeem v2 🔴

*Huisstijlgeheugen is de belangrijkste retention-driver en lock-in (goals.md). Gekozen richting: volwaardig systeem.*

*✅ Gebouwd (3 juli): **voorbeeldteksten 3 → 20** — `lib/schemas.ts` `.max(20)`, `HuisstijlTab.tsx` dynamische lijst (toevoegen/verwijderen). **Stijlprofiel-destillatie** — bij opslaan genereert `distilleerStijlprofiel()` in `lib/claude.ts` één compact profiel uit de voorbeelden (Sonnet, best-effort), opgeslagen in `huisstijl_json.stijlprofiel`; `buildSystemPrompt()` gebruikt het profiel + max 3 integrale voorbeelden i.p.v. alle 20 → geen promptkosten-explosie. Typecheck + build groen.*

- 🟢 **Label per voorbeeld (Funda / brochure / social)** — nog niet gedaan; nu zijn voorbeelden ongelabeld. Zou het stijlprofiel per content-type kunnen laten differentiëren. (✅ 4 juli: **.txt/.pdf-upload** van voorbeelden i.p.v. alleen plakken — `POST /api/huisstijl/extract`, TXT direct + PDF via Files API/Haiku, upload-knop in `HuisstijlTab`.)
- 🟢 **Brochure-huisstijl — restpunten** — ✅ gebouwd (3 juli): aparte brochure-voorbeelden + gedestilleerd `brochure_stijl.stijlprofiel` (alleen sturend voor `brochure_kort`/`brochure_lang` in `buildSystemPrompt`) + kantoorgegevens-slotpagina in de PDF (`PdfTemplate.tsx`). De PDF thematiseert al met primaire kleur + logo + slogan. Rest: lettertype-voorkeur (react-pdf font-registratie) en foto's in de brochure — dat laatste valt samen met de Fase 2-item 'PDF-brochure met foto's'.
- ✅ **Leren van inline-bewerkingen** (4 juli, live) — inline-bewerkingen (`PATCH /api/object/[id]/veld`) worden als {origineel → bewerkt} vastgelegd in de nieuwe tabel `stijl_bewerkingen` (alleen betekenisvolle wijzigingen ≥40 tekens). In de huisstijl-tab: bij ≥4 onverwerkte bewerkingen een **"Analyseer"-knop** → `distilleerBewerkingsregels` (Sonnet) maakt een voorstel (`POST /api/huisstijl/leren`), dat de admin **reviewt en accepteert of negeert** (`/toepassen`). Geaccepteerde regels gaan naar `huisstijl_json.geleerde_regels`, worden in `buildSystemPrompt` meegestuurd en blijven behouden bij opnieuw opslaan van de huisstijl. *Keuze: handmatige trigger + expliciete review i.p.v. cron/auto-toepassen. Rest (🟢): later evt. automatisch attenderen bij n bewerkingen.*
- 🟠 **Huisstijl-gating meebewegen met abonnements-herziening** — huisstijl is nu Starter-geblokkeerd (`HuisstijlUpgradeBanner`). Bepaal in de nieuwe plannen wat Starter krijgt (bijv. toon+slogan wél, voorbeeldteksten/brochure-stijl Pro+) — huisstijl-diepte is het natuurlijke upsell-argument.

---

## Fase 1d — Chatbot v2 🔴

*De widget-chatbot kende alléén kantoor-FAQ's. Gekozen richting: beide sporen — deelbare link (quick win) + embed.*

*✅ Gebouwd (3 juli): **object-kennis** — `/api/chat` accepteert een `object_id` en bouwt server-side een kennisbasis uit `input_json` (8 velden + USP's) + relevante `outputs_json` (buurt, energie-advies, kopersvragen-FAQ); antwoorden blijven binnen die data, bezichtiging/bod → doorverwijzen naar de makelaar. **Deelbare publieke chatpagina** — `app/chat/[objectId]/page.tsx` (publiek, geen login, `noindex`, huisstijl-kleur + logo), te delen via de nieuwe "Deel-chatbot"-tab in de object-werkruimte (`components/ObjectChat.tsx`). De onraadbare UUID fungeert als unlisted link. Typecheck + build groen.*

- ✅ **Aan/uit-schakelaar + cover-foto op de chatpagina** (4 juli, live) — `objecten.chat_publiek` (default true) + `chat_foto_url` (prod-migratie + repo-bestand). Toggle + foto-upload in de "Deel-chatbot"-tab (`components/DeelChatbot.tsx`) via `/api/object/[id]/chat-instellingen` (GET/PATCH) en `/api/object/[id]/foto` (POST/DELETE); de publieke pagina respecteert de toggle en toont de foto. NB: losse cover-foto per woning — de volledige foto-bibliotheek (Fase 2) kan die later automatisch vullen.
- ✅ **Documenten-koppeling** (4 juli, live) — opt-in per document (`object_documenten.publiek_chatbaar`, default privé; prod-migratie toegepast + repo-migratiebestand). Publiek-chatbare docs gaan als `type:'document'`-blokken mee in `/api/chat` (Sonnet + `files-api-2025-04-14`-beta; zonder docs blijft het Haiku). Toggle + laden van bestaande docs in `DocumentenAssistent`; nieuwe routes `/api/documenten` (GET-lijst) en `/api/documenten/[id]` (PATCH-toggle). Meegenomen fix: `/api/chat` stript een leidende assistant-greeting (Anthropic vereist start met een user-bericht).
- ✅ **Lead-capture uitbouwen** (4 juli, live) — `chatbot_leads` kreeg `object_id` (nullable FK) + `telefoon` (prod-migratie + repo-bestand). Publieke `ObjectChat` toont een interesse-/bezichtigingsformulier (naam/e-mail/telefoon/bericht), dat automatisch opduikt na ≥2 vragen; `/api/chat/lead` accepteert `object_id`, leidt kantoor+makelaar server-side af en mailt de makelaar (Resend, reply-to = lead). Leads per woning zichtbaar in de "Deel-chatbot"-tab (`components/DeelChatbot.tsx` via GET `/api/object/[id]/leads`). Kantoorbrede widget-leads mailen nu de kantoor-admins (`sendNieuweKantoorLeadMelding`); de `/chatbot`-leadlijst toont telefoon. *Rest (🟢, optioneel): objectkolom in de kantoorbrede leadlijst.*
- 🟠 **Embed-widget spoor afmaken** — ✅ gebouwd (4 juli): installatie-instructies in `ChatbotTab` (stappenplan per site-type WordPress/Wix/eigen bouwer, uitklapbaar) + kant-en-klare "stuur naar je webbouwer"-mailtekst mét snippet en kopieerknop. **Rest (actie Quinn):** de widget één keer daadwerkelijk op een externe makelaarssite plaatsen en testen — pas dan is dit spoor bewezen.
- 🟢 **FAQ-limiet en beheer** — LIMIT 30 in `/api/chat` heroverwegen zodra object-kennis er is; FAQ-suggesties genereren uit veelgestelde chatvragen.

---

## Fase 2 — Media & documenten verdiepen 🟠

*Nu zijn foto's en documenten vluchtig of los: verbeterde/gestagede foto's komen als base64 terug en verdwijnen bij het wegklikken (alleen analyse-scores landen in `outputs_json.fotos_analyse`); documenten hangen per object maar doen niets voor de content-generatie.*

- 🟠 **Foto-bibliotheek per object** — foto's uploaden en bewáren bij een object (Supabase Storage `kantoor-assets/[kantoor_id]/fotos/`, koppeltabel of JSON-kolom), met per foto: origineel, verbeterde versie, staging-varianten. Downloads en hergebruik (brochure-PDF, social posts, chatpagina) vanuit één plek. *Voorwaarde voor: foto's in PDF-export en op de publieke chatpagina.*
- 🟠 **Staging- en verbeter-resultaten opslaan** — resultaat van `api/fotos/verbeter` en `api/fotos/staging` naar Storage schrijven i.p.v. alleen base64 naar de client; geschiedenis per foto tonen. *Afhankelijk van foto-bibliotheek.*
- ✅ **Documenten → content-generatie** (4 juli, live) — in de werkruimte kan de makelaar geüploade documenten (meetrapport/keuring/taxatie) in de teksten laten verwerken: `POST /api/object/[id]/hergenereer` hangt de document-file-id's via de Files API-beta aan een nieuwe `generateContent`-call (extra `documentFileIds`-param + system-prompt-instructie: exacte m², bouwkundige staat, gebreken overnemen, niets verzinnen) en overschrijft `outputs_json`. Knop + expliciete bevestiging in `DocumentenAssistent` (waarschuwt dat handmatige bewerkingen verloren gaan). *Rest (🟢): bij de eerste generatie in `object/new` zijn er nog geen documenten — pas beschikbaar ná upload in de werkruimte. Optioneel later: document-upload in het nieuwe-object-formulier zelf.*
- 🟢 **Documenten-assistent verbreden** — meer bestandstypen (DOCX; nu alleen PDF/TXT, max 10 MB per bestand in `api/documenten/upload`), kantoorbrede documenten (algemene voorwaarden, standaard koopakte-uitleg) naast object-documenten.
- 🟢 **PDF-brochure met foto's** — zodra de foto-bibliotheek bestaat: foto's opnemen in de react-pdf-export volgens de brochure-huisstijl (Fase 1c).

---

## Fase 3 — Koppelingen & distributie

*Strategisch belang: workflow-lock-in + distributie (concurrentieanalyse §6.3). HousApp gebruikt CRM-integraties als gracht; Kolibri's AppXchange is tegelijk distributiekanaal naar precies onze doelgroep.*

- 🔴 **Echte Realworks-koppeling (API i.p.v. XML-download)** — verkenning 3 juli 2026:
  - Makelaar koopt de API via de Realworks CRM Marketplace; wij koppelen met een developer-ID via developers.realworks.nl. Relevante API: **Wonen API** (objecten exporteren, leads importeren).
  - **Open vraag die de business case bepaalt:** kunnen aanbiedingsteksten via de API ook geschréven worden, of alleen gelezen? → registreren op het developer-portaal (gratis) en docs checken. Plan B als schrijven niet kan: objectdata inlezen als autofill van de 8 velden — ook al een sterk verkoopargument (adres intypen → alles vooringevuld). Kosten marketplace-API's nog onbekend.
  - *Let op:* Realworks faseert oude XML/endpoints uit richting API v3 — huidige CasaXML-export (`app/api/export/realworks/route.ts`) hierop controleren.
  - *Volgorde:* (1) nu developer-portaal registreren + schrijfvraag beantwoorden, (2) pas bouwen ná de time-out-fix en outputvalidatie.
- 🔴 **Kolibri-koppeling (AppXchange)** — aanmelden voor de AppXchange (hun app-store, 1.200+ makelaars) via contactformulier; API-first architectuur. Daar zit al een "ChatGPT Advertentieteksten"-app — de route bestaat bewezen, maar er zit dus ook al een generieke concurrent; ons verhaal: suite + Funda-regelset + huisstijl + NL-buurtdata. *Doorlooptijd onbekend — aanmelding starten direct na livegang, bouwen daarna.*
- 🟠 **Social media direct publiceren** — Meta Business API (Instagram) + LinkedIn OAuth, als sluitstuk van de content-kalender: "publiceren nog handmatig" wordt automatisch op de geplande datum (`post_planning.status` → cron). Verhoogt dagelijkse gebruiksfrequentie → lagere churn (concurrentieanalyse §6.6). *Na Fase 1b (kalender-landing) — eerst de flow duidelijk, dan automatiseren.*
- 🟢 **NVM-contact voor formele Funda-partneraccess** — lange termijn; Funda-koppeling is het eindspel van "genereer → staat live".

---

## Fase 3 — Groei & vertrouwen

- 🔴 **Testimonial + casestudy pilotmakelaar** — naam, kantoor, quote + concrete tijdsbesparing op de landingspagina (placeholder staat klaar in `LandingPageClient.tsx`) + één uitgeschreven casestudy. HousApp toont 9 klantverhalen; wij 0 — belangrijkste marketingactie (concurrentieanalyse §6.2).
- ✅ **AVG-/vertrouwenspagina** (4 juli, live) — scanbare `/vertrouwen` (verkoopgericht, on-brand): EU-database, geen dataverkoop, **geen AI-training op klantdata**, versleuteling + RLS, Stripe, DPA op aanvraag. Kruisgelinkt met `/privacy`. Bewust géén SOC 2-claim (niet gecertificeerd) en DPA "op aanvraag" i.p.v. een verzonnen download. *Rest (🟢, actie Quinn): prominente link vanaf landing/prijzen + juridische check van de teksten; eventueel een echt DPA-document klaarzetten.*
- 🟠 **NVM PropTech-programma aanmelden.**
- 🟠 **Klantverhalen-pagina** — naar HousApp-model: korte verhalen per kantoor met cijfers, niet alleen quotes. *Na eerste 3–5 klanten.*
- 🟠 **Maandelijkse HousApp-check (10 min)** — changelog/release notes, vacatures (content/LLM-engineers), klantverhalen die over teksten beginnen, Kolibri-blog. Signaal = HousApp beweegt richting content → verdediging uit concurrentieanalyse §7 activeren.
- 🟢 **Google Ads activeren bij €5K MRR** (€500/mnd budget).
- 🟢 **Vercel AI Gateway activeren** — per-gebruiker kostentracking, rate limiting en budget alerts (loont pas bij 10+ actieve klanten).

---

## Bewust níet doen

*Focusbewaking (concurrentieanalyse §6.8/§9): complementair aan workflow-tools zijn is een feature, geen zwakte.*

- ❌ Geen AI-inbox (e-mail/WhatsApp) — kernproduct van HousApp, jaar voorsprong + funding.
- ❌ Geen bezichtigingsplanner.
- ❌ Geen leadgen-widgets/woningwaardering als leadmagneet (Grow-terrein van HousApp; chatbot-leads per object zijn ons antwoord).

---

## Permanente kwaliteit

- `npm run typecheck` altijd groen voor elke commit
- `npm run test` altijd groen
- Lighthouse landingspagina: >90 performance, >95 accessibility
- Mobile-responsive: check elk nieuw scherm
