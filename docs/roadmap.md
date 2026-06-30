# VestaAI — Roadmap

> Eerste tester: **i4housing**. Alles in Fase 0–2 is gericht op klaarstomen voor hun pilot.
> Alleen open items staan hier. Klaar = weg.

---

## Fase 0 — Externe setup

- [ ] Stripe: Starter (€99/mo, €990/jr), Pro (€199/mo, €1.990/jr), Kantoor (€599/mo, €5.990/jr) aanmaken → price IDs in `.env.local` — uitgesteld tot na gratis testfase
- [ ] Stripe webhook instellen (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) — uitgesteld
- [ ] End-to-end smoke test op Vercel: registreer account → genereer object → exporteer PDF

---

## Fase 1 — Product-polish

### 1C — Core-flow testen (happy path + edge cases)

- [ ] Formulier → loading → tabbladen: volledig end-to-end met echte Anthropic API
- [ ] BAG-adresautocomplete (`api/bag`): vult adresveld automatisch aan — testen met echt adres
- [ ] Resultaatscherm: alle 10 teksten zichtbaar, kopieerknop werkt, geen lege tabs
- [ ] PDF-export: correct opgemaakt, downloadbaar, huisstijl correct
- [ ] Herschrijf-knop (`api/object/[id]/herschrijf`): werkt per individueel veld?
- [ ] Notitie-veld: opslaan en herladen na page refresh
- [ ] Prijswijziging-modal: updatet bestaande output correct
- [ ] StatusToggle (verkocht/beschikbaar): wijziging persisterend
- [ ] Starter-limiet (40 objecten/mo): betaalmuur blokkeert na limiet, toont upgrade-prompt

### 1D — Trial + betaling flow

- [ ] `trial_ends_at` correct gezet bij aanmelding (check in Supabase na registratie)
- [ ] Trial-waarschuwingsmail 3 dagen voor einde: Edge Function triggert correct
- [ ] Na trial: betaalmuur toont upgrade-prompt met directe link naar Stripe checkout
- [ ] Stripe checkout → betaling → `/betaling-gelukt`: abonnement actief in Supabase
- [ ] Stripe webhook (`api/webhooks/stripe`): plan-upgrade correct verwerkt in `kantoren`-tabel
- [ ] Customer portal (`api/stripe/customer-portal`): makelaar kan zelf opzeggen/wijzigen
- [ ] Testscenario: trial verlopen → upgrade → plan actief → objecten weer toegankelijk

### 1E — Founding member

- [ ] Stripe: founding member coupon aanmaken (30% recurring discount) — Quinn handmatig

---

## Fase 2 — i4housing pilot

### 2A — Uitnodiging en onboarding

- [ ] i4housing uitnodigen: Pro-plan + founding member korting (30%)
- [ ] Eerste generatie samen doorlopen of async met Loom-screenrecording

### 2B — Feedback

- [ ] Feedbackkanaal instellen: e-mail of WhatsApp met i4housing
- [ ] Blokkades oplossen binnen 24 uur

### 2C — AI-output kwaliteit

- [ ] Buurtomschrijvingen: accuraat voor Amsterdam/i4housing-werkgebied?
- [ ] Instagram-varianten: bruikbaar of te standaard?
- [ ] Huisstijlgeheugen testen: logo uploaden + toonprofiel → genereer → klopt het?

---

## Fase 3 — Eerste 5–30 betalende klanten

### 3A — Landingspagina versterken

- [ ] Testimonial van i4housing toevoegen (naam, kantoor, quote + tijdsbesparing)
- [ ] Product in actie: GIF of embedded screenrecording van de generatie-flow

### 3B — GTM uitvoeren

- [ ] NVM PropTech-programma aanmelden
- [ ] i4housing vragen om 2–3 doorverwijzingen in NVM-netwerk
- [ ] Affiliateprogramma bouwen: unieke referral-link per klant → 1 maand gratis bij conversie

### 3C — Monitoring

- [ ] Kosten per klant monitoren: bij €99/mo (Starter) moet API-kosten <€8/mo blijven

---

## Fase 4 — Productuitbreiding (na 30+ kantoren)

### 4A — Social media direct posten

- [ ] Instagram/LinkedIn direct posten via API (Meta Business API + LinkedIn OAuth)

### 4B — Foto-features activeren

- [ ] AI fotoverbetering: externe API koppelen (vendor TBD)
- [ ] Virtual staging: externe API koppelen (vendor TBD)

### 4C — Intelligentere data-input (zie `docs/data-integraties/`)

- [ ] WOZ-vergelijking: automatisch prijscontext toevoegen
- [ ] CBS-buurtanalyse: wijkdata ophalen voor buurtomschrijving
- [ ] Historisch waardeverloop
- [ ] Marktdynamiek
- [ ] Voorzieningen via Overpass (scholen, OV, winkels)

### 4D — Chatbot-widget

- [ ] Widget testen op externe makelaarsite (embed-snippet staat klaar in ChatbotTab)

### 4F — Funda/Realworks koppeling

- [ ] Realworks XML-export genereren vanuit VestaAI
- [ ] NVM-contact leggen via i4housing voor formele Funda-partneraccess

---

## Fase 5 — België + franchise

### 5A — Belgische markt (Vlaanderen)

- [ ] BE-specifieke teksten: Immoweb i.p.v. Funda, Vlaamse regelgeving
- [ ] CIB Vlaanderen aanmelden als partner/tool
- [ ] Tenant-configuratie: NL vs. BE bij onboarding

### 5B — Franchise

- [ ] White-label: eigen logo + domeinnaam per franchise-partner
- [ ] Multi-kantoor-beheer: franchise-eigenaar ziet alle kantoren in één dashboard
- [ ] API-toegang: REST API + documentatie
- [ ] Outreach: ERA NL, Engel & Völkers NL, Makelaarsland

---

## Fase 6 — Groei & automatisering

- [ ] Google Ads activeren bij €5K MRR (€500/mnd budget)
- [ ] NVM Magazine artikel / advertentie
- [ ] Affiliateprogramma automatiseren
- [ ] Duits: interface vertalen, Immobilienscout24-regelset

---

## Permanente kwaliteit

- [ ] `npm run typecheck` altijd groen voor elke commit
- [ ] `npm run test` altijd groen
- [ ] Lighthouse landingspagina: >90 performance, >95 accessibility
- [ ] Mobile-responsive: check elk nieuw scherm
