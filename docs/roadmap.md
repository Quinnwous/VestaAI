# VestaAI — Roadmap

Bij twijfel over product of prioriteiten: `VestaAI.html` raadplegen.

---

## ✅ Day 1 — Formulier + Claude API (AFGEROND)

Werkende demo zonder auth. Formulier invullen → Claude genereert content → 6 tabs.

**Opgeleverd:**
- 8-velden formulier met Zod-validatie (`PropertyForm`)
- POST `/api/generate` → Claude API → 10-sleutels JSON, met retry-logica
- Geanimeerde loading checklist
- 6-tab resultatenweergave (Funda · Brochure · Instagram · LinkedIn · E-mail · Buurt)
- 15 unit tests, TypeScript clean, build slaagt

**Om te testen:** `ANTHROPIC_API_KEY` invullen in `.env.local` → `npm run dev` → `localhost:3000`

---

## Week 2 — Inloggen + Betalen

**Doel:** echte gebruikers kunnen registreren, inloggen via magic link, en betalen via Stripe. Gegenereerde content wordt opgeslagen.

### Dag 1 — Supabase opzetten

- [ ] Supabase-project aanmaken op supabase.com
- [ ] SQL-migraties uitvoeren (tabellen: `kantoren`, `makelaars`, `objecten`)
- [ ] `.env.local` aanvullen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `lib/supabase.ts` schrijven: server-client helper + browser-client helper
- [ ] Typecheck + commit

### Dag 2 — Magic link login

- [ ] `/login` pagina: e-mailinvoerveld + "Stuur magic link"-knop
- [ ] `supabase.auth.signInWithOtp({ email })` aanroepen
- [ ] `/auth/confirm` route: PKCE-callback afhandelen, sessie bevestigen
- [ ] Doorsturen naar `/object/new` na succesvolle login
- [ ] Test: magic link ontvangen in echte mailbox, ingelogd zijn, sessie bewaard na refresh

### Dag 3 — Middleware + content opslaan

- [ ] Next.js middleware (`middleware.ts`): niet-ingelogde gebruikers → `/login`
- [ ] `/object/new` beschermen
- [ ] Na succesvolle generate: object opslaan in `objecten`-tabel (`input_json` + `outputs_json`)
- [ ] Typecheck + commit

### Dag 4 — Stripe producten + checkout

- [ ] Stripe-dashboard: Solo (€79/mo) en Kantoor (€149/mo) producten aanmaken
- [ ] `lib/stripe.ts` schrijven: Stripe-client helper
- [ ] `/api/stripe/checkout` route: checkout-sessie aanmaken met `customer_email`
- [ ] Betaalmuur-component: tonen als trial verlopen is
- [ ] Succespagina na afgeronde betaling (`/betaling-gelukt`)

### Dag 5 — Stripe webhooks + trial-logica

- [ ] `/api/webhooks/stripe` route: events afhandelen (`checkout.session.completed`, `customer.subscription.deleted`)
- [ ] `kantoren.plan` en `trial_ends_at` bijwerken op subscription-events
- [ ] Middleware uitbreiden: trial-check (>14 dagen zonder betaling → betaalmuur)
- [ ] Lokaal testen met `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Typecheck + commit

---

## Week 3 — Kantoorinstellingen + Huisstijl

**Doel:** makelaars stellen hun kantooridentiteit in; de Claude-prompt wordt automatisch gepersonaliseerd.

### Dag 1 — Instellingenpagina + navigatie

- [ ] Navigatie-header toevoegen (logo, "Nieuw object", "Instellingen", uitlog)
- [ ] `/settings` route aanmaken met tabs: Account · Huisstijl · Team
- [ ] Accountgegevens tonen (naam, e-mail, huidig plan)

### Dag 2 — Logo upload

- [ ] Supabase Storage-bucket aanmaken (`kantoor-assets`, publiek leesbaar)
- [ ] Uploadformulier in `/settings` → afbeelding opslaan in bucket
- [ ] `kantoren.logo_url` bijwerken
- [ ] Logo tonen in navigatie-header

### Dag 3-4 — Huisstijl-profiel

- [ ] Huisstijl-formulier: schrijftoon (formeel · informeel · enthousiast), kantoorslogan (max 100 tekens), primaire kleur (hex)
- [ ] Opslaan als `kantoren.huisstijl_json`
- [ ] `lib/claude.ts` uitbreiden: `huisstijl_json` dynamisch in system prompt injecteren
- [ ] Testen: zelfde object met en zonder huisstijl → zichtbaar verschil in output

### Dag 5 — Voorbeeldteksten

- [ ] Textarea voor max 3 voorbeeldteksten (bestaande Funda-advertenties van het kantoor)
- [ ] Opslaan in `kantoren.huisstijl_json.voorbeelden`
- [ ] Als few-shot-voorbeelden meegeven in user message aan Claude
- [ ] Typecheck + commit

---

## Week 4 — PDF-export

**Doel:** makelaars kunnen een professionele, gebrandmerkte PDF downloaden.

### Dag 1-2 — react-pdf setup + basistemplate

- [ ] `@react-pdf/renderer` installeren
- [ ] `/api/pdf/generate` route: PDF aanmaken op basis van `object_id`
- [ ] Basistemplate: logo, kantoorkleur, typografie, paginanummering
- [ ] Funda-tekst exporteren als eerste sectie

### Dag 3-4 — Volledig branded template

- [ ] Alle 7 content-types als secties in de PDF
- [ ] Brochure: lange variant standaard, korte variant als bijlage
- [ ] Instagram-varianten naast elkaar op één pagina
- [ ] Huisstijl-kleuren en logo toepassen vanuit `huisstijl_json`

### Dag 5 — Export UX

- [ ] "Exporteer PDF"-knop toevoegen aan ResultTabs
- [ ] Loading-state tijdens PDF-render (kan 2–5 seconden duren)
- [ ] Automatisch downloaden als `[adres]-VestaAI.pdf`
- [ ] Typecheck + commit

---

## Maand 2 — Dashboard + Multi-user

**Doel:** volledig SaaS-platform voor kantoren met meerdere makelaars.

### Week 1 — Objectenoverzicht

- [ ] `/dashboard` met kaartjes per gegenereerd object (adres, datum, status)
- [ ] Klikken op kaartje → resultaten herbekijken (geen nieuwe API-call)
- [ ] Zoeken op adres
- [ ] Filteren op datum (nieuwste eerst)
- [ ] Paginering (20 objecten per pagina)

### Week 2 — Multi-user

- [ ] Kantoor-admin kan collega's uitnodigen via e-mail (Resend)
- [ ] Rollen: `admin` (gebruikersbeheer + instellingen) en `makelaar` (alleen objecten)
- [ ] Gebruikersoverzicht in `/settings/team`
- [ ] Limiet Solo-plan: 1 gebruiker; Kantoor-plan: 5 gebruikers

### Week 3 — Notificaties (Resend)

- [ ] `lib/email.ts` schrijven: Resend-client helper
- [ ] Welkomstmail bij registratie (bevestiging + link naar object/new)
- [ ] Trial-waarschuwing: 3 dagen voor afloop (automatisch via cron of webhook)
- [ ] Factuurbevestiging na betaling (via Stripe webhook)

### Week 4 — Stabiliteit + monitoring

- [ ] Sentry integreren voor error tracking (front + back)
- [ ] Dashboard-metrics: objecten gegenereerd/maand, populairste content-tab
- [ ] Response-caching: gegenereerde content 24u cachen (geen dubbele API-kosten)
- [ ] Load test: 10 gelijktijdige generates → Claude API rate-limits in kaart

---

## Fase 2 — Marktdata (Maand 4+)

API-referenties staan in `docs/fase2/`. Prioriteit bepalen op basis van gebruikersfeedback.

| Feature | Referentie | Waarde |
|---|---|---|
| Bouwjaar + m² automatisch ophalen | `docs/fase2/bag-data.md` | Minder handmatig invulwerk |
| WOZ-vergelijking | `docs/fase2/woz-vergelijking.md` | Marktpositie duiden |
| Buurtstatistieken (CBS) | `docs/fase2/buurtanalyse-cbs.md` | Rijkere buurtomschrijving |
| Voorzieningen in de buurt (OSM) | `docs/fase2/overpass-voorzieningen.md` | Rijkere buurtomschrijving |
| Historische waardeontwikkeling | `docs/fase2/historisch-waarde.md` | Investeringsperspectief |
| Marktdynamiek | `docs/fase2/marktdynamiek.md` | Verkoopadvies |
