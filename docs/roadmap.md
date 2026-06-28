# VestaAI — Stappenplan

Bij twijfel over product of prioriteiten: `VestaAI.html` raadplegen.
Klaar? Stap verwijderen uit dit bestand.

---

## Fase 1 — MVP (nu bezig)

- [ ] `ANTHROPIC_API_KEY` invullen in `.env.local` en happy-path testen op `localhost:3000`
- [ ] Supabase-project aanmaken op supabase.com
- [ ] SQL-migraties uitvoeren: tabellen `kantoren`, `makelaars`, `objecten`
- [ ] `.env.local` aanvullen met Supabase-keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] `lib/supabase.ts` schrijven: server-client helper + browser-client helper
- [ ] `/login` pagina: e-mailinvoerveld + "Stuur magic link"-knop
- [ ] `supabase.auth.signInWithOtp({ email })` aanroepen
- [ ] `/auth/confirm` route: PKCE-callback afhandelen, sessie bevestigen, doorsturen naar `/object/new`
- [ ] Test: magic link ontvangen in echte mailbox, sessie bewaard na refresh
- [ ] `middleware.ts`: niet-ingelogde gebruikers → `/login`
- [ ] Na succesvolle generate: object opslaan in `objecten`-tabel (`input_json` + `outputs_json`)
- [ ] Stripe-dashboard: Solo (€79/mo) en Kantoor (€149/mo) producten aanmaken
- [ ] `lib/stripe.ts` schrijven: Stripe-client helper
- [ ] `/api/stripe/checkout` route: checkout-sessie aanmaken met `customer_email`
- [ ] Betaalmuur-component: tonen als trial verlopen is
- [ ] Succespagina na afgeronde betaling (`/betaling-gelukt`)
- [ ] `/api/webhooks/stripe` route: `checkout.session.completed` + `customer.subscription.deleted` afhandelen
- [ ] `kantoren.plan` en `trial_ends_at` bijwerken op subscription-events
- [ ] Middleware uitbreiden: trial-check (>14 dagen zonder betaling → betaalmuur)
- [ ] Lokaal testen met `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Fase 2 — Kantoorinstellingen + Huisstijl

- [ ] Navigatie-header toevoegen (logo, "Nieuw object", "Instellingen", uitlog)
- [ ] `/settings` pagina met tabs: Account · Huisstijl · Team
- [ ] Supabase Storage-bucket aanmaken (`kantoor-assets`, publiek leesbaar)
- [ ] Logo-uploadformulier → opslaan in bucket, `kantoren.logo_url` bijwerken, logo in header tonen
- [ ] Huisstijl-formulier: schrijftoon (formeel · informeel · enthousiast), slogan (max 100 tekens), primaire kleur (hex)
- [ ] Opslaan als `kantoren.huisstijl_json`
- [ ] `lib/claude.ts` uitbreiden: `huisstijl_json` dynamisch in system prompt injecteren
- [ ] Textarea voor max 3 voorbeeldteksten van het kantoor → opslaan in `huisstijl_json.voorbeelden`
- [ ] Voorbeeldteksten als few-shot-voorbeelden meegeven in de user message aan Claude
- [ ] Testen: zelfde object met en zonder huisstijl → zichtbaar verschil in output

---

## Fase 3 — PDF-export

- [ ] `@react-pdf/renderer` installeren
- [ ] `/api/pdf/generate` route: PDF aanmaken op basis van `object_id`
- [ ] Basistemplate: logo, kantoorkleur, typografie, paginanummering
- [ ] Alle 7 content-types als secties in de PDF
- [ ] Brochure: lange variant standaard, korte variant als bijlage
- [ ] Instagram-varianten naast elkaar op één pagina
- [ ] Huisstijl-kleuren en logo vanuit `huisstijl_json` toepassen
- [ ] "Exporteer PDF"-knop in `ResultTabs`
- [ ] Loading-state tijdens PDF-render + automatisch downloaden als `[adres]-VestaAI.pdf`

---

## Fase 4 — Dashboard + Multi-user

- [ ] `/dashboard` met kaartjes per gegenereerd object (adres, datum)
- [ ] Klikken op kaartje → resultaten herbekijken zonder nieuwe API-call
- [ ] Zoeken op adres + filteren op datum + paginering (20 per pagina)
- [ ] Kantoor-admin kan collega's uitnodigen via e-mail
- [ ] Rollen: `admin` (instellingen + teambeheer) en `makelaar` (alleen objecten)
- [ ] Gebruikersoverzicht in `/settings/team`
- [ ] `lib/email.ts` schrijven: Resend-client helper
- [ ] Welkomstmail bij registratie
- [ ] Trial-waarschuwing 3 dagen voor afloop
- [ ] Factuurbevestiging na betaling (via Stripe webhook)
- [ ] Sentry integreren voor error tracking
- [ ] Response-caching: gegenereerde content 24u cachen

---

## Fase 5 — Marktdata (op basis van gebruikersfeedback)

API-referenties staan in `docs/fase2/`.

- [ ] BAG-koppeling: bouwjaar + m² automatisch ophalen (`docs/fase2/bag-data.md`)
- [ ] WOZ-vergelijking (`docs/fase2/woz-vergelijking.md`)
- [ ] CBS-buurtstatistieken (`docs/fase2/buurtanalyse-cbs.md`)
- [ ] Voorzieningen in de buurt via OpenStreetMap (`docs/fase2/overpass-voorzieningen.md`)
- [ ] Historische waardeontwikkeling (`docs/fase2/historisch-waarde.md`)
- [ ] Marktdynamiek per object (`docs/fase2/marktdynamiek.md`)
