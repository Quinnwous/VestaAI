# VestaAI — Roadmap

Leidend document voor wat er gebouwd wordt en in welke volgorde. Bij twijfel over prioriteiten: `VestaAI.html` (businessplan) raadplegen.

---

## ✅ Day 1 — Formulier + Claude API (DONE)

**Doel:** werkende demo zonder auth — formulier invullen → content ontvangen.

- [x] 8-velden formulier (`PropertyForm`) met Zod-validatie
- [x] POST `/api/generate` → Claude API → 10-sleutels JSON
- [x] Retry-logica + markdown fence-stripping
- [x] Geanimeerde loading checklist (`LoadingProgress`)
- [x] 6-tab resultatenweergave: Funda · Brochure · Instagram · LinkedIn · E-mail · Buurt
- [x] Kopieer-knop per tab, wordcount op Funda
- [x] 15 unit tests groen, TypeScript clean, build slaagt

**Wat je nu kunt doen:** `ANTHROPIC_API_KEY` invullen in `.env.local` → `npm run dev` → testen op `localhost:3000`.

---

## Week 2 — Auth + Betaling

**Doel:** echte gebruikers kunnen inloggen en betalen; data wordt opgeslagen.

### Dag 1–2: Supabase auth
- [ ] Supabase project aanmaken + `.env.local` invullen
- [ ] Magic link login (`/login` pagina + `/auth/confirm` callback)
- [ ] Middleware die niet-ingelogde gebruikers redirectt naar `/login`
- [ ] `lib/supabase.ts` server/client helpers
- [ ] Objecten opslaan in `objecten`-tabel na succesvolle generate

### Dag 3–4: Stripe
- [ ] Stripe product + prijzen aanmaken (Solo €79/mo, Kantoor €149/mo)
- [ ] Checkout-flow: na trial → betaalmuur
- [ ] Stripe webhook handler (`/api/webhooks/stripe`)
- [ ] `kantoren`-tabel bijwerken op subscription events

### Dag 5: Landing page
- [ ] Simpele `/` landingspagina (CTA → gratis trial starten)
- [ ] Trial van 14 dagen: `trial_ends_at` check in middleware

---

## Week 3 — Kantoorinstellingen + Huisstijl

**Doel:** makelaars kunnen hun kantooridentiteit instellen; prompts worden gepersonaliseerd.

- [ ] Instellingenpagina (`/settings`)
- [ ] Logo upload (Supabase Storage)
- [ ] Huisstijl-profiel: toon (formeel/informeel), kleurpalet, kantoorslogan
- [ ] `huisstijl_json` meegeven aan Claude system prompt
- [ ] Voorbeeldtekst-uploader (prompt fine-tuning)

---

## Week 4 — PDF-export

**Doel:** makelaars kunnen een branded PDF downloaden.

- [ ] `react-pdf` integreren
- [ ] PDF-template met kantoorlogo + huisstijlkleuren
- [ ] Exportknop op resultaten-tabs
- [ ] Funda-tekst + brochure als één document

---

## Maand 2 — Dashboard + Multi-user

**Doel:** volledig SaaS-platform voor kantoren.

- [ ] Objectenoverzicht (`/dashboard`) met zoeken + filteren
- [ ] Multi-user: kantoor-admin kan collega's uitnodigen
- [ ] Objecthistorie: eerder gegenereerde content herbekijken
- [ ] Gebruikersbeheer per kantoor
- [ ] Resend: welkomstmail + factuurnotificaties

---

## Fase 2 — Marktdata (toekomst)

Referentie-skills staan in `archive/skills/`. Komen terug als de kern stabiel is.

- [ ] BAG-koppeling (bouwjaar + m² automatisch ophalen)
- [ ] WOZ-vergelijking
- [ ] CBS-buurtstatistieken
- [ ] Overpass/OSM-voorzieningen
