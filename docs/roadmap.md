# VestaAI — Roadmap

Status: `[ ]` open · `[~]` in uitvoering · `[x]` klaar

> Eerste tester: **i4housing**. Alles in Fase 0–2 is gericht op klaarstomen voor hun pilot.

---

## Fase 0 — Externe setup ⚠️ BLOKKEERDER VOOR ALLES

Niets werkt zonder deze stap. Quinn regelt dit handmatig.

- [x] `ANTHROPIC_API_KEY` invullen in `.env.local` → generatie testen op `localhost:3000`
- [ ] Supabase-project aanmaken → migraties `001_initial.sql` t/m `010_object_status_uitbreiden.sql` uitvoeren (in volgorde)
- [~] `.env.local` aanvullen met alle keys (zie `.env.example`) — Claude/Supabase/Stripe/Resend ✅ · Stripe webhook + price IDs + Kadaster nog open
- [ ] Magic link testen: link ontvangen in echte mailbox, sessie bewaard na refresh
- [x] Resend API key instellen + domein verifiëren (transactionele mail)
- [ ] Stripe-dashboard: Starter (€99/mo, €990/jr), Pro (€199/mo, €1.990/jr), Kantoor (€599/mo, €5.990/jr) aanmaken → price-IDs in `.env.local`
- [ ] Stripe webhook lokaal testen: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Supabase Storage-bucket aanmaken (`kantoor-assets`, publiek leesbaar)
- [ ] Vercel project aanmaken → alle env vars toevoegen → eerste deploy testen
- [ ] Supabase Edge Function deployen: `supabase functions deploy trial-warning-email` → dagelijks schedule instellen (cron: `0 8 * * *`)
- [ ] End-to-end smoke test op Vercel: registreer account → genereer object → exporteer PDF

---

## Fase 1 — Product-polish (doel: i4housing kan het zonder begeleiding gebruiken)

### 1A — Branding ✅ OPGELOST via Tailwind config

De hele `blue`-palette is in `tailwind.config.ts` gemapt naar Forest Green (#1A6B45). `bg-blue-600` = #1A6B45 overal in de app.

- [x] `tailwind.config.ts`: blue-palette volledig omgezet naar Forest Green shades (was al gedaan)
- [x] Favicon en OG-image (`app/opengraph-image.tsx`, `app/icon.tsx`): Forest Green, nieuwe headline "Van 45 minuten naar 90 seconden"

### 1B — Onboarding

Een nieuwe gebruiker moet zonder handleiding begrijpen wat te doen.

- [x] Welkomstmail via Resend: automatisch verzonden na registratie via `app/auth/confirm/route.ts` (non-blocking)
- [x] Lege dashboard-state: `WelkomBanner.tsx` toont CTA wanneer count === 0
- [x] `WelkomBanner.tsx`: geïnspecteerd — triggert correct wanneer count === 0, toont welkomstbericht met CTA naar /object/new en /settings
- [x] Onboarding-tracking (`005_onboarding_tracking.sql`): voortgangsstrip `OnboardingChecklist.tsx` gebouwd — 3 stappen (account/object/huisstijl), verdwijnt als alles klaar
- [x] `goals.md` bijgewerkt: verwijst nu naar i4housing als eerste tester i.p.v. "tante"

### 1C — Core-flow testen (happy path + edge cases)

- [ ] Formulier → loading → tabbladen: volledig end-to-end testen met echte Anthropic API
- [ ] BAG-adrescomplete (`api/bag`): vult adresveld automatisch aan? — testen met echt adres
- [ ] Resultaatscherm: alle 10 teksten zichtbaar, kopieerknop werkt, geen lege tabs
- [ ] PDF-export: `PdfTemplate.tsx` correct opgemaakt, downloadbaar, huisstijl correct
- [ ] Herschrijf-knop (`api/object/[id]/herschrijf`): werkt per individueel veld?
- [ ] Notitie-veld: opslaan en herladen na page refresh correct
- [ ] Prijswijziging-modal: updatet bestaande output correct
- [ ] StatusToggle (verkocht/beschikbaar): wijziging persisterend
- [ ] Starter-limiet (40 objecten/mo): Betaalmuur blokkeert na limiet, toont upgrade-prompt

### 1D — Trial + betaling flow

- [ ] `trial_ends_at` correct gezet bij aanmelding (check in Supabase na registratie)
- [ ] Trial-waarschuwingsmail 3 dagen voor einde: Edge Function triggert correct
- [ ] Na trial: Betaalmuur toont upgrade-prompt met directe link naar Stripe checkout
- [ ] Stripe checkout → betaling → `/betaling-gelukt`: abonnement actief in Supabase
- [ ] Stripe webhook (`api/webhooks/stripe`): plan-upgrade correct verwerkt in `kantoren`-tabel
- [ ] Customer portal (`api/stripe/customer-portal`): makelaar kan zelf opzeggen/wijzigen
- [ ] Testscenario: trial verlopen → upgrade → plan actief → objecten weer toegankelijk

### 1E — Founding member actie zichtbaar maken

- [x] Banner op `app/page.tsx`: "Founding member — 30% korting voor altijd. Nog [X] plekken." (hardcoded 47)
- [x] `/prijzen` PrijzenToggle.tsx: founding member badge zichtbaar (amber banner)
- [ ] Stripe: founding member coupon aanmaken (30% recurring discount) — Quinn handmatig
- [x] Grens bewaken: banner verbergt automatisch als `FOUNDING_PLEKKEN` naar 0 wordt gezet (beide locaties: `app/page.tsx` en `PrijzenToggle.tsx`)

### 1F — Juridisch minimum voor live

- [x] Privacyverklaring/AVG: pagina aangemaakt (`/privacy`) — sessie-cookies verklaard, 7 verwerkers gedocumenteerd
- [x] Cookieless verklaring: `/privacy` vermelt dat VestaAI alleen functionele sessie-cookies gebruikt (geen tracking, geen banner nodig)
- [x] Footer: links naar `/privacy` toegevoegd in `app/page.tsx` en `app/prijzen/page.tsx`

---

## Fase 2 — i4housing pilot

### 2A — Uitnodiging en onboarding

- [ ] i4housing uitnodigen: Pro-plan + founding member korting (30%)
- [x] Begeleidingsdocument aangemaakt: `docs/begeleiding-i4housing.md` — 5 stappen, geen tech-jargon
- [ ] Eerste generatie samen doorlopen of async met Loom-screenrecording

### 2B — Feedback verzamelen en verwerken

- [ ] Feedbackkanaal instellen: e-mail of WhatsApp met i4housing
- [x] NPS-modal (`NpsModal.tsx`): triggert vanaf 3e generatie (bug >= 3 ipv === 3 opgelost)
- [x] Feedback-log aangemaakt: `docs/feedback-i4housing.md` — template klaar voor invullen
- [ ] Blokkades oplossen binnen 24 uur

### 2C — AI-output kwaliteit verbeteren op basis van echte feedback

- [x] System prompt fine-tunen: uitgebreide Funda-regels (openingszin, geen prijs, geen superlatieven zonder bewijs), woordaantallen per format, scherpe Instagram/LinkedIn differentiatiegids — `lib/claude.ts`
- [ ] Buurtomschrijvingen: accuraat voor Amsterdam/i4housing-werkgebied?
- [ ] Instagram-varianten: bruikbaar of te standaard?
- [ ] Huisstijlgeheugen testen: i4housing logo uploaden + toonprofiel instellen → genereer → klopt het?
- [x] Bouwjaar/energielabel automatisch via BAG: EP-Online publieke API geïntegreerd, PropertyForm vult 3 velden auto-fill

---

## Fase 3 — Eerste 5–30 betalende klanten

### 3A — Landingspagina versterken (na pilot)

De huidige landingspagina mist bewijs en urgentie. Getallen als "10 teksten" zijn feature-lijstjes, geen social proof.

- [ ] Testimonial van i4housing toevoegen (naam, kantoor, quote + tijdsbesparing in cijfers)
- [x] Hero-propositie scherper: "Van 45 minuten naar 90 seconden" als paginatitel
- [ ] Product in actie: GIF of embedded screenrecording van de generatie-flow
- [x] Vergelijkingstabel: VestaAI vs. ChatGPT vs. zelf schrijven — toegevoegd aan landingspagina
- [x] FAQ-sectie: "Werkt dit met Funda?", "Wat als de tekst niet goed is?", "Privacy objectdata?", "Founding member?" — toegevoegd aan landingspagina

### 3B — GTM uitvoeren

- [x] LinkedIn-lanceringspost: geschreven in `docs/linkedin-lanceringspost.md` — met varianten en publicatietips
- [ ] NVM PropTech-programma aanmelden
- [ ] i4housing vragen om 2–3 doorverwijzingen in NVM-netwerk
- [ ] Affiliateprogramma bouwen: unieke referral-link per klant → 1 maand gratis bij conversie

### 3C — Statistieken & monitoring

- [x] `StatistiekenTab.tsx`: aangevuld met plan/trial status, objects deze maand vs limiet, tijdsbesparing berekening
- [x] Admin-dashboard `/admin`: actieve kantoren, plan-verdeling, indicatieve MRR, objecten per dag/week/maand, recente registraties (alleen zichtbaar voor quinn.berkouwer@gmail.com)
- [ ] Kosten per klant monitoren: bij €99/mo (Starter) moet API-kosten <€8/mo blijven; Pro/Kantoor marge breder

---

## Fase 4 — Productuitbreiding (na 30+ kantoren)

### 4A — Content calendar volledig afmaken

- [x] Kalender (`app/kalender` + `api/planning`): flow is compleet — maandview, dagpaneel, plannen/markeren/verwijderen, `object_id` opgeslagen
- [x] `PlanPostKnop.tsx`: plant posts in de DB (niet direct publiceren) — toont datum+tijdkiezer, POST naar `/api/planning`
- [ ] Direct posten naar Instagram/LinkedIn: Meta Business API + LinkedIn API (OAuth flow bouwen)

### 4B — Foto-features activeren

- [ ] AI foto verbetering: externe API koppelen (vendor TBD); `FotoVerbetering.tsx` en `api/fotos/verbeter` zijn klaar
- [ ] Virtual staging: externe API koppelen (vendor TBD); `VirtualStaging.tsx` en `api/fotos/staging` zijn klaar
- [x] UX: foto-features (FotoVerbetering + VirtualStaging) toegevoegd aan object-detail pagina, boven DocumentenAssistent

### 4C — Intelligentere data-input (zie `docs/fase2/`)

- [x] BAG-koppeling uitgebreid: bouwjaar + oppervlak via Kadaster BAG API, energielabel via publieke EP-Online API (no key) — PropertyForm vult alle 3 auto-fill bij "Ophalen uit BAG" (minder handmatig invullen)
- [ ] WOZ-vergelijking (`docs/fase2/woz-vergelijking.md`): automatisch prijscontext toevoegen aan generatie
- [ ] CBS-buurtanalyse (`docs/fase2/buurtanalyse-cbs.md`): automatische wijkdata ophalen voor buurtomschrijving
- [ ] Historisch waardeverloop (`docs/fase2/historisch-waarde.md`)
- [ ] Marktdynamiek (`docs/fase2/marktdynamiek.md`)
- [ ] Voorzieningen via Overpass (`docs/fase2/overpass-voorzieningen.md`): scholen, OV, winkels automatisch

### 4D — Chatbot-widget voor makelaarswebsites

- [ ] Widget (`/widget/chatbot.js`): embed-script testen op externe website (technisch klaar, embed-snippet in ChatbotTab)
- [x] `ChatbotTab.tsx`: makelaar configureert FAQ-items + embed-snippet in Instellingen; leads zichtbaar
- [x] Leadcapture: bezoekers die vragen stellen worden opgeslagen in `chatbot_leads` tabel

### 4E — Documentenassistent

- [x] `DocumentenAssistent.tsx` + `api/documenten/upload` + `api/documenten/chat`: upload VVE-notulen, leveringsakte of koopakte → Q&A via Claude
- [x] Opgenomen in object-detail pagina (niet als losse tab maar inline onder NotitieVeld)

### 4F — Funda/Realworks koppeling

- [ ] Realworks XML-export genereren vanuit VestaAI (beschreven als alternatief voor Funda API)
- [ ] NVM-contact leggen via i4housing voor formele Funda-partneraccess

---

## Fase 5 — België + franchise (maand 5–12)

### 5A — Belgische markt (Vlaanderen)

- [ ] BE-specifieke teksten: Immoweb i.p.v. Funda, Vlaamse regelgeving, andere toon
- [ ] CIB Vlaanderen aanmelden als partner/tool
- [ ] Tenant-configuratie: NL vs. BE marktkeuze bij onboarding (of aparte subdomain)

### 5B — Franchise-plan

- [x] Kantoor-plan (€599/mo) — plan bestaat al in codebase als 'kantoor'; alleen Stripe product aanmaken
- [ ] White-label: eigen logo + domeinnaam per franchise-partner
- [ ] Multi-kantoor-beheer: franchise-eigenaar ziet alle aangesloten kantoren in één dashboard
- [ ] API-toegang: REST API + documentatie voor franchise-integraties
- [ ] Outreach: ERA NL, Engel & Völkers NL, Makelaarsland

---

## Fase 6 — Groei & automatisering (maand 9–24)

- [ ] Google Ads activeren bij €5K MRR (€500/mnd budget)
- [ ] NVM Magazine artikel / advertentie
- [x] Jaarabonnement prominenter op landingspagina: "2 maanden gratis" link bij prijzen, toggle op `/prijzen` defaultt al op jaarplan
- [ ] Affiliateprogramma automatiseren: tracking via Stripe + automatische maandkorting
- [ ] Duits: interface vertalen, Immobilienscout24-regelset toevoegen

---

## Permanente kwaliteit (geldt altijd)

- [ ] `npm run typecheck` altijd groen voor elke commit
- [ ] `npm run test` altijd groen
- [ ] Lighthouse landingspagina: >90 performance, >95 accessibility
- [ ] Mobile-responsive: makelaars werken op tablet/telefoon — check elk nieuw scherm
- [x] Security: object-detail pagina verifieert nu kantoor-eigenaarschap (was via service-client zonder RLS)
