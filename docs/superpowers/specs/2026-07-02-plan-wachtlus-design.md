# Ontwerp: "Wachten op abonnement" waterdicht + live bewezen

Datum: 2026-07-02 · Status: goedgekeurd door Quinn · Branch: `feat/plan-wachtlus`

> **ADDENDUM v2 (2026-07-03, goedgekeurd door Quinn):** het toegangsmodel is omgedraaid.
> Niet meer "geen plan = wachten op toewijzing", maar **iedereen start zelf een proef**.
> Zie sectie "Addendum v2" onderaan; die overschrijft waar hij botst met de tekst hieronder.

## Context & probleem

Quinn zag herhaald: (1) resetlinks die op de inlogpagina belandden, (2) "geklooi met het
abonnement" bij nieuwe accounts. De onderliggende oorzaken zijn vandaag grotendeels
opgelost (Supabase Site URL-fix, button-gated `/auth/reset-password` en `/auth/verify`,
plan-gating, `/admin` met klantenbeheer). Wat resteert:

- De wachtlus is niet rond: klant hoort niets als een plan wordt toegewezen; Quinn hoort
  niets als iemand nieuw registreert en wacht.
- Het vangnet `lib/ensureMakelaar.ts` botst met het model: het maakt kantoren aan met
  365 dagen gratis toegang en stuurt een verouderde "14-daagse proefperiode"-welkomstmail.
- `/admin` toont geen maandverbruik t.o.v. de planlimiet.
- De live end-to-end-verificatie (reset, registratie, plan-toewijzing) is nooit gedaan.

Stand productie-database (2 juli): `quinn.berkouwer@gmail.com` = puur platform-admin
(geen kantoor-record); `quinn.berkouwer@icloud.com` = kantoor "iCloud test", bevestigd,
plan/trial `null` (wachtstand). Oude testaccounts zijn al verwijderd.

Relevante infra-observatie: `vestaai.nl` doet een 308-redirect naar `www.vestaai.nl`
mét behoud van querystring — maillinks (gebouwd op Site URL `https://vestaai.nl`)
blijven dus werken. Geen actie nodig.

## Succescriteria

1. Wachtwoord-reset werkt bewezen live: verse mail → "Ga verder"-klik → nieuw wachtwoord → ingelogd.
2. Nieuwe registratie → klant ziet wachtscherm; Quinn krijgt een melding-mail; géén
   codepad geeft een nieuw kantoor per ongeluk automatische toegang.
3. Plan toewijzen in `/admin` → klant krijgt activeringsmail; dashboard ontgrendeld.
4. `/admin` toont per klant het maandverbruik t.o.v. de planlimiet.
5. Eindtest door Quinn slaagt: Pro toewijzen aan iCloud → activeringsmail op iCloud → dashboard werkt.

## Buiten scope

- Stripe self-checkout en webhook (bewust uitgesteld tot na de gratis testfase).
- Kolom "laatste activiteit" op `/admin` (afgewezen in vraagronde).
- Legacy route `app/auth/confirm/route.ts` (wordt door geen mailtemplate meer gelinkt; blijft staan).
- Object-generatie-time-out (`/api/generate` 504) — apart roadmap-item.

## Ontwerp

### A. Vangnet gelijktrekken — `lib/ensureMakelaar.ts`

- Nieuw-kantoor-pad maakt voortaan aan met `plan: null`, `trial_ends_at: null` —
  identiek aan de DB-trigger `handle_new_user()`. Constante `GRATIS_TOEGANG_DAGEN` vervalt.
- De `sendWelcomeEmail`-aanroep vervalt; de activeringsmail (B) wordt dé welkomstmail.
  Als `sendWelcomeEmail` daarmee geen call sites meer heeft (bij implementatie verifiëren
  met grep), verwijderen we de functie uit `lib/email.ts`.

### B. Activeringsmail naar de klant — `app/admin/actions.ts` + `lib/email.ts`

- Nieuwe mail `sendAccountGeactiveerdEmail(email, naam, planLabel)` in de bestaande
  Resend-huisstijl (`baseTemplate`). Onderwerp: "VestaAI — je account is geactiveerd".
  Inhoud: plan-label ("Pro" of "gratis toegang"), knop "Ga naar je dashboard" → `/dashboard`.
- `setPlan` en `grantGratisToegang` lezen vóór de update `plan` + `trial_ends_at` en
  bepalen de transitie met `heeftToegang()` uit `lib/plans.ts`. Alleen bij
  **geen toegang → wel toegang** wordt gemaild; een planwissel (bijv. Pro → Kantoor) is stil.
  De transitieregel komt als pure functie (bv. `moetActiveringsmailSturen(oud, nieuw)`)
  in `lib/plans.ts` zodat hij unit-testbaar is.
- Ontvanger: het makelaars-lid van het kantoor met `role = 'admin'`, anders het eerste lid
  (zelfde selectie als `/admin` nu toont).
- Mailverzending is fire-and-forget (`.catch`): een mailfout mag een plan-toewijzing nooit
  laten falen. `setActief`/heractiveren stuurt bewust géén mail.

### C. Registratiemelding naar Quinn — migratie + `lib/ensureMakelaar.ts` + `lib/email.ts`

- **Migratie (Supabase):** `alter table kantoren add column admin_notified_at timestamptz;`
  plus backfill `update kantoren set admin_notified_at = now();` zodat bestaande kantoren
  (waaronder "iCloud test") nooit een melding veroorzaken.
- Nieuwe mail `sendNieuweKlantMelding(...)`: onderwerp "VestaAI — nieuwe klant wacht op
  activering", inhoud naam + e-mail + kantoornaam van de klant, knop → `/admin`.
  Ontvangers: de platform-admin-adressen (zelfde bron als `lib/admin.ts`:
  `quinn.berkouwer@gmail.com` + eventuele `PLATFORM_ADMIN_EMAILS`).
- **Haakpunt:** `ensureMakelaar` (draait server-side bij elk dashboard-bezoek,
  `app/dashboard/page.tsx`). Belangrijk: de check draait óók op het pad waar het
  makelaar-record al bestaat (het normale geval — de DB-trigger maakt records al bij
  signup aan), niet alleen op het aanmaak-pad. Flow: na de bestaand/aangemaakt-check het
  kantoor van de gebruiker ophalen (`id, plan, trial_ends_at, admin_notified_at`); als
  `admin_notified_at` null is → atomisch claimen met
  `update ... set admin_notified_at = now() where id = X and admin_notified_at is null`
  (service-role; alleen wie de claim wint mailt — nooit dubbel) → melding sturen als het
  kantoor geen toegang heeft. Kantoren mét toegang worden alleen stil geclaimd (geen mail).
- Teamleden die bij een bestaand kantoor komen triggeren niets (vlag staat al).
- Geaccepteerde beperking (aanpak A, gekozen boven pg_net-trigger): een klant die bevestigt
  maar het dashboard nooit opent, geeft geen melding. In de praktijk stuurt `/auth/verify`
  na 1,2 s automatisch door naar het dashboard.

### D. Maandverbruik op `/admin` — `app/admin/page.tsx` + `AdminBeheer.tsx`

- De bestaande objecten-query wordt uitgebreid met `created_at`; per kantoor tellen we
  objecten van de lopende kalendermaand. `KantoorRow` krijgt `objectenDezeMaand` en `limiet`.
- Nieuwe kolom "Deze mnd" in de beheer-tabel: `3 / 15` (limiet via `maandLimietVoor(plan)`;
  trial/gratis = 100). Kantoor zonder toegang: `—`.
- Copy-fix in `sendTrialWarningEmail` (`lib/email.ts`): "Starter 40 objecten/maand" → "5
  objecten/maand", "Pro Onbeperkt" → "15 objecten/maand", conform `PLAN_MAANDLIMIET`.

### E. Deploy & rolverdeling

Branch `feat/plan-wachtlus` → PR → **Quinn merget** (harness blokkeert self-merge) →
Vercel deployt `main` automatisch. Kwaliteitspoort vóór de PR: `npm run typecheck` en
`npm run test` groen.

### F. Live verificatie (door Claude, ná de merge)

1. Deploy bevestigen (nieuwe productie-build serveert de wijzigingen).
2. **Reset-flow:** echte resetmail aanvragen voor `quinn.berkouwer@gmail.com` via de
   publieke flow → mail via de Gmail-koppeling lezen → link controleren (geen `/**`,
   `token_hash` aanwezig) → pagina curl'en (200) → klik simuleren met `verifyOtp` tegen
   productie (zonder wachtwoord te wijzigen; dit verbruikt het token). Daarna vraagt
   Claude Quinn de flow één keer echt te doorlopen met een nieuwe, verse mail.
3. **Registratie-flow:** wegwerpaccount `quinn.berkouwer+e2e@gmail.com` via de echte
   signup → bevestigingsmail lezen → verify doorlopen → controleren: kantoor in wachtstand
   (plan/trial null), wachtscherm-tekst aanwezig, melding-mail aan Quinn ontvangen →
   testaccount + kantoor daarna volledig verwijderen (auth user + records).
4. **Eindtest (Quinn):** in `/admin` Pro toewijzen aan "iCloud test" → activeringsmail op
   iCloud → dashboard ontgrendeld, limiet 15/maand zichtbaar in `/admin`.
5. Roadmap bijwerken: verificatie-item en het achterhaalde "test-accounts opruimen"-item
   verwijderen (accounts zijn al weg); memory `auth-onboarding-architecture` aanvullen met
   de nieuwe mails en kolom.

## Risico's & mitigaties

- **Mailfouten** breken nooit een flow: alle sends fire-and-forget met `.catch`.
- **Dubbele meldingen** uitgesloten door de atomische claim op `admin_notified_at`.
- **Spam over bestaande klanten** uitgesloten door de backfill in de migratie.
- **RLS/beveiliging:** alle nieuwe schrijfacties lopen via bestaande service-role-paden
  achter `isPlatformAdmin`-checks; er wijzigt niets aan policies.
- **Stripe** wordt niet geraakt (uitgesteld); plan-toewijzing blijft puur een DB-veld.

## Testen

- Unit (Vitest): `moetActiveringsmailSturen`-transitieregel (geen toegang → toegang wél;
  planwissel, deactivering, gelijkblijvend géén mail).
- Typecheck strict, bestaande tests groen.
- De rest wordt bewezen via de live verificatie in sectie F (echte mails, echte klikken).

---

## Addendum v2 (2026-07-03) — proefperiode-model

Quinn draaide de kernbeslissing om. Nieuw toegangsmodel:

1. **Registratie → automatisch 14 dagen proef met max 5 objecten totaal.** De DB-trigger
   `handle_new_user()` én het vangnet `ensureMakelaar` zetten `trial_ends_at = now() + 14 dagen`
   (plan blijft null = proef). Migratie `20260703_trial_model.sql`.
2. **Nieuw planniveau `'gratis'`** (kolom-CHECK uitbreiden): door de platform-admin toe te
   wijzen, geen einddatum, **5 objecten per maand**. Vervangt de oude "gratis toegang"-hack
   (plan null + trial 3650 dagen). `/admin`-dropdown: Proef/geen · Gratis · Starter · Pro · Kantoor.
3. **Limieten:** proef = 5 objecten **totaal** (geen maandgrens); gratis = 5/maand;
   Starter 5 · Pro 15 · Kantoor 100 per maand (ongewijzigd).
4. **Proef verlopen (geen plan):** scherm "Je proefperiode is afgelopen — kies een abonnement"
   met knop naar `/settings` (daar staan de Stripe-checkout-knoppen) + contactoptie.
   `/api/generate` geeft dezelfde boodschap als 402. De oude "wachten op toewijzing"-copy vervalt.
5. **Stripe gaat live** (Starter, Pro én Kantoor, maandprijzen 60/150/500): de bestaande
   checkout- en webhook-code blijft; er komen echte price IDs, een webhook-endpoint op
   `https://www.vestaai.nl/api/webhooks/stripe` en de bijbehorende Vercel-env-waarden
   (`STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET`). Env-waarden zet Quinn in het Vercel-dashboard
   (geen CLI-auth beschikbaar); Claude levert de exacte waarden aan.
6. **Mails:** welkomstmail "je 14-daagse proefperiode is gestart" blijft bestaan en wordt —
   net als de melding aan Quinn ("nieuwe klant is gestart met de proefperiode") — verstuurd
   bij het eerste dashboard-bezoek via de atomische `admin_notified_at`-claim (beide mails,
   één claim). Activeringsmail (geen toegang → toegang) en trial-waarschuwing blijven zoals
   ontworpen.
7. **Uitloggen → homepage** (`/` i.p.v. `/login`).
8. **Verificatie-aanpassing:** het wegwerpaccount moet nu direct toegang hebben (proef,
   `trial_ends_at` ≈ +14 dagen), welkomstmail op het testadres én melding-mail bij Quinn.
   Er is geen wachtscherm meer direct na registratie.

Succescriterium 2 wordt: *elk nieuw account krijgt exact één 14-daagse proef (5 objecten
totaal); daarna alleen toegang via betaald plan, 'gratis' of handmatige trial-verlenging.*
