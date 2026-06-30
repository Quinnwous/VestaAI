# VestaAI — Roadmap

> Eerste tester: **i4housing**. Alles tot en met Fase 2 is gericht op klaarstomen voor hun pilot.
> Alleen open items staan hier. Klaar = weg.

---

## Status-overzicht — 30 juni 2026

### Hoe ver zijn we?

De kern van het product is **gebouwd en deploybaar**. De AI-generatie werkt, auth werkt, het dashboard werkt. Maar de e2e flow op Vercel is nooit doorgetest — dat is de grootste onzekerheid voor de pilot.

### Wat werkt er wél?

| Feature | Status | Toelichting |
|---------|--------|-------------|
| 8-velden formulier → 7 content-types | ✅ Werkt | Core AI-generatie via Claude API |
| Tabbladen + kopieerknop | ✅ Werkt | Funda, brochure, Instagram (3×), LinkedIn (2×), koper-e-mail, buurt |
| PDF-export | ✅ Werkt | react-pdf, downloadbaar |
| Per-veld herschrijven | ✅ Werkt | Makelaar kan 1 content-blok opnieuw laten genereren |
| Auth (magic link) | ✅ Werkt | Supabase email login |
| Dashboard (objectenlijst) | ✅ Werkt | Overzicht van alle objecten |
| Huisstijlgeheugen | ✅ Werkt | Schrijftoon + slogan + voorbeeldteksten worden echt in de Claude-prompt gebruikt — Pro/Kantoor plan |
| Document assistent | ✅ Werkt | Upload PDF/TXT → vragen stellen via Claude |
| Content kalender | ✅ Werkt | Posts plannen per dag, status bijhouden |
| Betaalmuur + trial-check | ✅ Werkt | Plan-controle, trial-expiratie |
| Settings (account, team, statistieken, chatbot) | ✅ Werkt | Admin-only acties correct afgeschermd |
| Stripe checkout + customer portal | ✅ Code klaar | Nog niet end-to-end getest (price IDs ontbreken) |

### Wat werkt NIET of is onaf?

| Feature | Status | Wat ontbreekt |
|---------|--------|----------------|
| BAG-adresautocomplete | ✅ Werkt | `KADASTER_API_KEY` toegevoegd als Vercel Custom Secret — werkt nu ook live |
| Foto-verbetering | ⚠️ Niet actief | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_IMAGES_TOKEN` ontbreken — toont "not configured" melding |
| Virtual staging | ⚠️ Niet actief | `REIMAGINEHOME_API_KEY` ontbreekt — toont "not configured" melding |
| Stripe betalingen | ⚠️ Niet actief | Price IDs niet aangemaakt, webhook niet geconfigureerd — uitgesteld tot na gratis testfase |
| Trial-warning e-mail | ⚠️ Niet deployed | Code klaar (`supabase/functions/trial-warning-email/`) — moet nog gedeployed + gescheduled worden |
| E2e smoke test op Vercel | ❌ Nooit gedaan | Registreer → genereer → PDF op productie-URL — grootste openstaande risico voor pilot |

### Wat is helemaal nog niet gebouwd?

Bewust uitgesteld tot Fase 3:

| Feature | Toelichting |
|---------|-------------|
| Social media direct posten | Instagram/LinkedIn API integratie |
| WOZ-vergelijking, CBS-buurtanalyse | Data-integraties voor slimmere buurtomschrijvingen |
| Funda/Realworks XML-koppeling | Directe export naar CRM's |
| Affiliateprogramma | Referral-links per klant |

---

## Fase 1 — Product afronden

Alles wat nodig is om het product stabiel en productie-klaar te maken.

- [ ] Trial-warning e-mail deployen: `supabase functions deploy trial-warning-email` + dagelijkse cron schedulen in Supabase Dashboard (`0 8 * * *`)
- [ ] E2e smoke test op Vercel: registreer account → genereer object → exporteer PDF — volledig doorlopen
- [ ] Stripe: Starter (€99/mo, €990/jr), Pro (€199/mo, €1.990/jr), Kantoor (€599/mo, €5.990/jr) price IDs aanmaken → in Vercel env — uitgesteld tot na gratis testfase
- [ ] Stripe webhook configureren op Vercel (`/api/webhooks/stripe`) — uitgesteld tot na gratis testfase

### Claude-prompts verbeteren (lopend)

- [ ] Funda-tekst: minimum verhogen naar 700 woorden; eerste zin mag nooit met adres/straatnaam beginnen; meer alinea's over technische staat en duurzaamheid
- [ ] Koper-e-mail: prompt gecorrigeerd (post-bezichtiging, niet uitnodiging) ✅ — testen met echte generatie of output correct is

---

## Fase 2 — Live brengen (i4housing pilot)

- [ ] i4housing uitnodigen: Pro-plan + founding member korting (30%)
- [ ] Eerste generatie samen doorlopen of async met Loom-screenrecording
- [ ] Feedbackkanaal instellen: e-mail of WhatsApp met i4housing
- [ ] Blokkades oplossen binnen 24 uur
- [ ] Output kwaliteit valideren: buurtomschrijvingen accuraat voor Amsterdam? Instagram-varianten bruikbaar? Huisstijl correct toegepast?
- [ ] Founding member coupon aanmaken in Stripe (30% recurring discount) — Quinn handmatig

---

## Fase 3 — Groei (eerste 5–50 kantoren)

### Landingspagina versterken

- [ ] Testimonial van i4housing toevoegen (naam, kantoor, quote + tijdsbesparing)
- [ ] Product in actie: GIF of embedded screenrecording van de generatie-flow

### Go-to-market

- [ ] NVM PropTech-programma aanmelden
- [ ] i4housing vragen om 2–3 doorverwijzingen in NVM-netwerk
- [ ] Affiliateprogramma bouwen: unieke referral-link per klant → 1 maand gratis bij conversie

### Foto-features activeren

- [ ] AI-fotoverbetering: Cloudflare Images activeren (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_IMAGES_TOKEN` in Vercel env)
- [ ] Virtual staging: REimagineHome API-key aanvragen en instellen (`REIMAGINEHOME_API_KEY`)

### Slimmere data-input

- [ ] WOZ-vergelijking: automatisch prijscontext toevoegen (zie `docs/data-integraties/`)
- [ ] CBS-buurtanalyse: wijkdata ophalen voor buurtomschrijving
- [ ] Historisch waardeverloop + marktdynamiek
- [ ] Voorzieningen via Overpass (scholen, OV, winkels)

### Koppelingen

- [ ] Social media direct posten via API (Meta Business API + LinkedIn OAuth)
- [ ] Chatbot-widget testen op externe makelaarsite (embed-snippet staat klaar in ChatbotTab)
- [ ] Realworks XML-export genereren vanuit VestaAI
- [ ] NVM-contact leggen via i4housing voor formele Funda-partneraccess

### Monitoring

- [ ] Google Ads activeren bij €5K MRR (€500/mnd budget)
- [ ] Kosten per klant monitoren: bij €99/mo (Starter) moet API-kosten <€8/mo blijven

---

## Permanente kwaliteit

- [ ] `npm run typecheck` altijd groen voor elke commit
- [ ] `npm run test` altijd groen
- [ ] Lighthouse landingspagina: >90 performance, >95 accessibility
- [ ] Mobile-responsive: check elk nieuw scherm
