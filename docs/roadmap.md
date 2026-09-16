# VestaAI — Roadmap

> Werklijst, geen logboek. Alleen open items — **klaar = weg**.
> Gesorteerd op prioriteit: 🔴 HOOG · 🟠 MIDDEL · 🟢 LAAG. Per item kort: wat · waarom · waar in de code.
> Laatst herzien: 16 september 2026 — fasemodel-herstructurering gemerged en live; zie CLAUDE.md
> § Hoofdstructuur voor de volledige architectuur (F0-F10, niet hier herhaald).
> **Werkwijze:** `npm run typecheck && npm run test` groen vóór elke commit; werk op een
> feature-branch en lever via PR + merge naar `main` (dat triggert de Vercel-deploy).

---

## 🔴 Nu — blokkeert op Quinn, geen code-werk mogelijk zonder

- **Migraties draaien op de database** (actie Quinn, eenmalig, Supabase → SQL Editor) — de
  16-sep-migraties (fasemodel, transacties, waardering, kantoorinstellingen) bleken na het
  mergen naar `main` nog nooit op de echte database te zijn uitgevoerd. Zonder deze stap draait
  de live code tegen ontbrekende kolommen/tabellen. Zie de 7 bestanden
  `supabase/migrations/20260916_*.sql` — samen in één keer te plakken en te draaien, alles is
  idempotent (`if not exists`).
- **Realworks-export aanleveren** (actie Quinn) — kolommen, bereik en of coördinaten (lat/lng)
  en het verkopend kantoor erin zitten. Zodra dit er is: importeren via `/admin/transacties`
  (bestaand scherm) en controleren of `lib/transactieImport.ts`'s kolom-aliassen de echte
  headers herkennen — zo niet, aliaslijst uitbreiden (klein werkje, geen herontwerp).
- **Bevestigen of "verkopend kantoor" in de export zit** — bepaalt of de concurrentieanalyse
  (`lib/concurrentie.ts`, al volledig gebouwd) direct op deze ene bron kan draaien, of dat er
  alsnog een aparte Brainbay-import nodig is (zie "Admin-databeheer & maatwerk" hieronder).
- **Voorbeeld-verkoopadvies aanleveren** (actie Quinn) — het document zelf (waarde, buurt,
  "over ons", courtage in kantoorhuisstijl) is bewust nog niet gebouwd om dubbel werk te
  voorkomen. Alle onderliggende data staat al klaar: waardering (`lib/waardering.ts`),
  straal-kaart (`components/StraalKaartPaneel.tsx`), kantoorprofiel + courtage
  (`kantoren.instellingen_json`, beheerd via `/admin/kantoor/[id]`). Zodra het voorbeeld er is:
  opzetten als losse, herschikbare secties, `@react-pdf/renderer`-stijl zoals
  `components/PdfTemplate.tsx`, volledig in kantoorhuisstijl inclusief `accent_kleur`.
- **Supabase Auth: self-signup uitzetten** (actie Quinn, dashboard → Auth → Providers → Email)
  — `/login` heeft geen "Aanmelden"-formulier meer, maar `supabase.auth.signUp` staat op
  projectniveau mogelijk nog open. Zonder die toggle kan iemand die de open Supabase
  REST-endpoint direct aanroept alsnog een eigen kantoor laten aanmaken via de DB-trigger
  `handle_new_user()`, wat tegen het "puur admin-beheerd"-besluit ingaat.

## 🟠 Middel — kan zonder Quinn, maar is nu nog beperkt

- **CSV-kolomherkenning verfijnen zodra de echte export er is** — `lib/transactieImport.ts`
  herkent kolommen via een aliaslijst (geen mapping-UI). Werkt de echte Realworks-export daar
  niet meteen tegenaan, dan is uitbreiden van de aliassen genoeg — geen herontwerp nodig.
- **Kenmerk-effecten uitbreiden** — `lib/waardering.ts` `kenmerkEffect()` ondersteunt nu
  garage/tuin (de velden die in `transacties` staan). Zodra de importdata rijker blijkt (bv.
  energielabel, bouwperiode-categorieën), extra vergelijkbare-paren-analyses toevoegen — blijf
  bij de vergelijkbare-paren-methode, geen regressie (zie `docs/goals.md` § Risico's).
- **"Meenemen als referentie" in Transacties opzoeken** — `components/TransactiesZoeken.tsx`
  heeft de selectie-UI al klaar; de daadwerkelijke koppeling naar een lopende waardebepaling
  (handmatig referenties toevoegen aan `lib/waardering.ts`'s automatische selectie) is nog niet
  gebouwd. Vereist een manier om een expliciete referentielijst per object op te slaan naast de
  automatische selectie.
- **Verkopend-kantoor-veld op de kaart** — de verkoopkaart toont nu uitsluitend
  `eigen_verkoop`-rijen (besluit 16 sep 2026). Als er ooit behoefte komt aan een tweede laag met
  regiotransacties (neutraal, niet als vlaggetje), is dat een kleine uitbreiding van
  `components/Verkoopkaart.tsx` — nu bewust niet gebouwd.

## Admin-databeheer & maatwerk

Bewust bedieningsmodel (`docs/goals.md` § Bedieningsmodel): i4housing gebruikt de app
self-service, Quinn beheert de data en maatwerk als platform-admin.

- **Periodieke Realworks-herimport** — het importscherm (`/admin/transacties`) is al herhaalbaar
  (upsert op kantoor+adres+datum), dus een maandelijkse herimport is gewoon hetzelfde scherm
  opnieuw gebruiken. Geen extra bouwwerk, wel een terugkerende actie voor Quinn.
- **Brainbay-import (concurrentiedata)** — alleen nog nodig als blijkt dat de Realworks-export
  geen `verkopend_kantoor` bevat (zie 🔴 hierboven). Zou dezelfde `transacties`-tabel en hetzelfde
  importscherm kunnen hergebruiken (`verkopend_kantoor` invullen, `eigen_verkoop: false`) — geen
  nieuw datamodel nodig.
- **Kantoor-data direct aanpasbaar door Quinn** — grotendeels gebouwd: huisstijl, courtage,
  kantoorprofiel en werkgebied zijn te bewerken via `/admin/kantoor/[id]`.
- **Maatwerkverzoeken-flow** — nog niet gebouwd, bewust "Binnenkort" (net als Verhuur). i4housing
  vraagt binnen de app handwerk aan (artist impression, bewerkte staging-foto); Quinn ziet het in
  `/admin`, werkt het extern uit, resultaat komt terug in het dossier. Nog te ontwerpen: een
  tabel `verzoeken` (kantoor_id, object_id optioneel, type, toelichting, bijlage-url, status,
  resultaat-url), statusflow (open → in behandeling → klaar), Resend-melding bij afronding.

## 🟢 Laag — opruimen, niet blokkerend

- **Ongebruikte tabellen/kolommen daadwerkelijk droppen** — migratie staat al klaar
  (`supabase/migrations/20260916_opruimen_ongebruikt.sql`): `post_planning`, `chatbot_leads`,
  `chatbot_faq`, `referrals`, en de kolommen `kantoren.plan`/`trial_ends_at`/`stripe_id`/
  `referral_code`, `objecten.chat_publiek`/`chat_foto_url`, `object_documenten.publiek_chatbaar`.
  Nog niet uitgevoerd op de database — vereist Quinns akkoord vóór een destructieve migratie.
- **CBS-jaargang jaarlijks bijwerken** — `lib/verrijking.ts` staat op `85984NED` (2024). CBS
  publiceert elk voorjaar een nieuwe jaargang, maar niet alle velden zijn meteen gevuld — check
  bij het ophogen of inkomen gevuld is. Nieuwe ID's:
  `https://opendata.cbs.nl/ODataCatalog/Tables?$filter=substringof('Kerncijfers wijken en buurten',Title)&$format=json`.
- **Supabase-mailonderwerpen vernederlandsen** — "Reset your password" / "Confirm your email
  address" → NL (dashboard → Auth → Email Templates).
- **Kaart: eigen marker-icoon i.p.v. cirkel** — `components/Verkoopkaart.tsx` gebruikt nu een
  effen `CircleMarker` in de merkkleur. Een vlaggetjes-icoon (SVG, brand-aware kleur) zou mooier
  zijn — puur visuele verfijning, geen functionele blokkade.

---

## Bewust níet doen

- ❌ **Content-kalender, foto-verbetering en object-chatbot** — op 15 sep 2026 volledig
  verwijderd. Niet opnieuw bouwen zonder expliciet besluit van Quinn.
- ❌ **Zelf aanmelden / publiek geprijsde site / abonnementen** — bewust geschrapt 15 sep.
  Nieuwe kantoren, accounts én teamleden altijd via `/admin`. Niet terugzetten zonder besluit.
- ❌ **Kantoor-admin-rol** — op 16 sep 2026 vervangen door één rol per kantoor. Niet terugzetten.
- ❌ **Regressie voor kenmerk-effecten** — bewust gekozen voor vergelijkbare-paren i.p.v.
  regressie (zie `docs/goals.md` § Risico's: een regressie op deze schaal suggereert een
  schijnzekerheid die de data niet waarmaakt).
- ❌ Koperskant: geen kopersdatabase, zoekprofielen, bezichtigingsplanning of leadopvolging
  (besluit 16 sep 2026 — VestaAI dient de verkoperskant, niet de koperskant).
- ❌ Externe live koppelingen: geen live Realworks-API, geen Funda-publicatie, geen automatisch
  posten op social, geen WordPress-koppeling. Alles via kopiëren/plakken of een CSV-bestand
  totdat er een expliciet besluit valt over een echte API-koppeling.
- ❌ Facturatie en boekhouding — courtage wordt berekend en getoond, er komen geen facturen.
- ❌ Geen AI-inbox (e-mail/WhatsApp) — kernproduct HousApp, jaar voorsprong + funding.
- ❌ Geen bezichtigingsplanner.

---

## Permanente kwaliteit

- `npm run typecheck` + `npm run test` altijd groen vóór elke commit.
- Lighthouse landing: >90 performance, >95 accessibility.
- Elk nieuw scherm mobile-responsive checken.
