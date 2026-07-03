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

- 🟠 **Chatbot-rolgating** — `/chatbot` is nu voor alle ingelogde gebruikers zichtbaar en uit `/settings` gehaald. Nog bepalen: mag iedere makelaar FAQ's bewerken of alleen admin? (leads lezen mag iedereen blijven). De object-chatpagina-tab in de werkruimte volgt met Fase 1d.
- 🟢 **Onboarding-stappen foto & chatbot** — de checklist heeft nu account/object/huisstijl/document/post mét completion-detectie. "Verbeter een foto" en "bekijk je object-chatbot" ontbreken nog omdat er geen betrouwbaar completion-signaal is (foto-resultaten worden niet bewaard → Fase 2; chatbot-bezoek wordt niet getrackt). Toevoegen zodra dat signaal bestaat.
- 🟢 **Documenten-ingang in de sidebar** — bewust nog niet toegevoegd; per-woning-documenten leven in de werkruimte. Komt met de kantoorbrede documenten-pagina in Fase 2.
- 🟢 **Publieke/marketing-pagina's voor ingelogde bezoekers** — sinds de globale `NavHeader` weg is, tonen `/`, `/prijzen` e.d. aan een ingelogde gebruiker alleen `PublicNav` (met "Inloggen"). Klein: ingelogd een "Naar dashboard"-link tonen of `/` → `/dashboard` redirecten.

---

## Fase 1c — Huisstijl-systeem v2 🔴

*Huisstijlgeheugen is de belangrijkste retention-driver en lock-in (goals.md). Gekozen richting: volwaardig systeem.*

*✅ Gebouwd (3 juli): **voorbeeldteksten 3 → 20** — `lib/schemas.ts` `.max(20)`, `HuisstijlTab.tsx` dynamische lijst (toevoegen/verwijderen). **Stijlprofiel-destillatie** — bij opslaan genereert `distilleerStijlprofiel()` in `lib/claude.ts` één compact profiel uit de voorbeelden (Sonnet, best-effort), opgeslagen in `huisstijl_json.stijlprofiel`; `buildSystemPrompt()` gebruikt het profiel + max 3 integrale voorbeelden i.p.v. alle 20 → geen promptkosten-explosie. Typecheck + build groen.*

- 🟢 **Label per voorbeeld (Funda / brochure / social)** — nog niet gedaan; nu zijn voorbeelden ongelabeld. Zou het stijlprofiel per content-type kunnen laten differentiëren. Ook: .txt/.pdf-upload i.p.v. alleen plakken.
- 🟢 **Brochure-huisstijl — restpunten** — ✅ gebouwd (3 juli): aparte brochure-voorbeelden + gedestilleerd `brochure_stijl.stijlprofiel` (alleen sturend voor `brochure_kort`/`brochure_lang` in `buildSystemPrompt`) + kantoorgegevens-slotpagina in de PDF (`PdfTemplate.tsx`). De PDF thematiseert al met primaire kleur + logo + slogan. Rest: lettertype-voorkeur (react-pdf font-registratie) en foto's in de brochure — dat laatste valt samen met de Fase 2-item 'PDF-brochure met foto's'.
- 🟠 **Leren van inline-bewerkingen** — makelaars bewerken output inline (ResultTabs) en slaan op; die edits zijn gratis trainingsdata. Bouw: bewaar per veld origineel + bewerkte versie (in `outputs_json` of aparte tabel), en destilleer periodiek (cron of bij n≥10 edits) de systematische verschillen tot extra stijlregels in het stijlprofiel — met een review-stap ("VestaAI heeft geleerd dat jullie 'woning' boven 'object' verkiezen — kloppen deze regels?"). *Afhankelijkheid: stijlprofiel-destillatie hierboven.*
- 🟠 **Huisstijl-gating meebewegen met abonnements-herziening** — huisstijl is nu Starter-geblokkeerd (`HuisstijlUpgradeBanner`). Bepaal in de nieuwe plannen wat Starter krijgt (bijv. toon+slogan wél, voorbeeldteksten/brochure-stijl Pro+) — huisstijl-diepte is het natuurlijke upsell-argument.

---

## Fase 1d — Chatbot v2 🔴

*De widget-chatbot kende alléén kantoor-FAQ's. Gekozen richting: beide sporen — deelbare link (quick win) + embed.*

*✅ Gebouwd (3 juli): **object-kennis** — `/api/chat` accepteert een `object_id` en bouwt server-side een kennisbasis uit `input_json` (8 velden + USP's) + relevante `outputs_json` (buurt, energie-advies, kopersvragen-FAQ); antwoorden blijven binnen die data, bezichtiging/bod → doorverwijzen naar de makelaar. **Deelbare publieke chatpagina** — `app/chat/[objectId]/page.tsx` (publiek, geen login, `noindex`, huisstijl-kleur + logo), te delen via de nieuwe "Deel-chatbot"-tab in de object-werkruimte (`components/ObjectChat.tsx`). De onraadbare UUID fungeert als unlisted link. Typecheck + build groen.*

- 🟢 **Expliciete aan/uit-schakelaar + objectfoto op de chatpagina** — nu is elke woning via zijn (onraadbare) UUID-link bereikbaar; een echte aan/uit-toggle per object vereist een DB-kolom (bijv. `objecten.chat_publiek`). Objectfoto op de pagina ontbreekt omdat foto's nog niet bewaard worden (→ Fase 2 foto-bibliotheek).
- 🔴 **Documenten-koppeling** — geüploade stukken per object (`object_documenten`, Anthropic Files API) beschikbaar maken als chatbot-kennis: "Wat zijn de servicekosten?" → antwoord uit de VvE-stukken. Technisch: bij chat met `object_id` de `anthropic_file_id`'s van dat object als `type:'document'`-blokken meesturen (patroon staat al in `app/api/documenten/chat`); dan Sonnet + `files-api-2025-04-14`-beta i.p.v. Haiku wanneer een object chatbare docs heeft. **Vereist twee gevoelige stappen (daarom gepauzeerd, beslissing Quinn):** (1) prod-DB-migratie — kolom `object_documenten.publiek_chatbaar boolean default false` (default = privé); (2) bewuste keuze om juridische stukken op de *publieke* chatpagina bloot te stellen. Voorstel: opt-in per document (default uit) via een toggle in `DocumentenAssistent`.
- 🟠 **Lead-capture uitbouwen** — de chatbot vangt al vragen op; voeg toe: naam/e-mail/telefoon vragen bij interesse ("Wilt u een bezichtiging?"), leads per object zichtbaar in de werkruimte + e-mailnotificatie naar de makelaar (Resend staat klaar).
- 🟠 **Embed-widget spoor afmaken** — bestaand item: embed-snippet testen op een externe makelaarssite (snippet staat klaar in ChatbotTab). Plus: nette instructiepagina met stappenplan per site-type (WordPress, Wix, eigen bouwer) en een "stuur naar je webbouwer"-mailtekst.
- 🟢 **FAQ-limiet en beheer** — LIMIT 30 in `/api/chat` heroverwegen zodra object-kennis er is; FAQ-suggesties genereren uit veelgestelde chatvragen.

---

## Fase 2 — Media & documenten verdiepen 🟠

*Nu zijn foto's en documenten vluchtig of los: verbeterde/gestagede foto's komen als base64 terug en verdwijnen bij het wegklikken (alleen analyse-scores landen in `outputs_json.fotos_analyse`); documenten hangen per object maar doen niets voor de content-generatie.*

- 🟠 **Foto-bibliotheek per object** — foto's uploaden en bewáren bij een object (Supabase Storage `kantoor-assets/[kantoor_id]/fotos/`, koppeltabel of JSON-kolom), met per foto: origineel, verbeterde versie, staging-varianten. Downloads en hergebruik (brochure-PDF, social posts, chatpagina) vanuit één plek. *Voorwaarde voor: foto's in PDF-export en op de publieke chatpagina.*
- 🟠 **Staging- en verbeter-resultaten opslaan** — resultaat van `api/fotos/verbeter` en `api/fotos/staging` naar Storage schrijven i.p.v. alleen base64 naar de client; geschiedenis per foto tonen. *Afhankelijk van foto-bibliotheek.*
- 🟠 **Documenten → content-generatie** — meetrapport of bouwkundige keuring als optionele input voor de 8-velden-generatie: oppervlaktes, staat van onderhoud en bijzonderheden automatisch meenemen in Funda-tekst en FAQ. Begin klein: documenten-tekst als extra context in de generate-prompt wanneer aanwezig.
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
- 🔴 **AVG-/vertrouwenspagina** — klantgegevens worden niet verkocht en niet voor andere doeleinden gebruikt, data in een beveiligde EU-database (Supabase), geen training van AI-modellen op klantdata, verwerkersovereenkomst als download. HousApp voert SOC 2 Type 2 + AVG prominent als verkoopargument (`docs/concurrentieanalyse-housapp.md` §6); kantoren (zeker franchise) vragen ernaar.
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
