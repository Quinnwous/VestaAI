# VestaAI — Roadmap

> Werklijst, geen logboek. Alleen open items — **klaar = weg**.
> Gesorteerd op prioriteit: 🔴 HOOG · 🟠 MIDDEL · 🟢 LAAG. Per item kort: wat · waarom · waar in de code.
> Laatst herzien: 15 september 2026 — koerswijziging naar waardering, zie `goals.md`.

> **Hervat-pointer (Claude-oppakbaar, geen eerdere chat nodig):**
> Laatst afgerond: (1) scope + shell van de koerswijziging — gesloten landingspagina,
> topbar met Woningdossier/Marktinzichten/Content/Kantoorinstellingen, kantoorbranding via
> CSS-variabelen; (2) alle prijzen/abonnementen/Stripe volledig uit de code (niet alleen
> bevroren); toegang is nu puur admin-beheerd; (3) hoofdstructuur herzien naar het
> micro/macro-model met de gedetailleerde module-spec hieronder; (4) Supabase-project was
> gepauzeerd — Quinn heeft het gereactiveerd, `quinn.berkouwer@icloud.com` (rol admin) en
> het kantoor "i4 Housing" (met het opgezochte palet) staan nu in de database; (5)
> **contentsuite weer ontgrendeld** (`CONTENT_VERGRENDELD = false` in `lib/features.ts`) —
> Quinn bouwt nog actief door en wil overal bij kunnen; `ObjectWorkspace`, `object/new` en de
> topbar tonen nu weer de echte formulieren in plaats van het slotpaneel; (6) de originele,
> uitgebreide landingspagina (`components/LandingPageClient.tsx`) is teruggezet met dezelfde
> visuele opzet (live demo-kaart, contentvoorbeelden, virtual-staging-vergelijking,
> Anthropic/Claude-strip, Kadaster/BAG-sectie) en twee nieuwe secties: Woningwaardering en
> Marktinzichten. Kalender/chatbot/fotoverbetering-verwijzingen (definitief verwijderde
> features) en alle prijzen zijn eruit gehaald. Zie "Al gebouwd & live" voor het volledige lijstje.
> **Volgende zonder blokkade, in deze volgorde:** (1) importformaat voor de transactiedataset
> vastleggen 🔴 — blokkeert het waarderingsmodel én de i4housing Map (zie "Databron"); (2)
> waarderingsmodel ontwerpen 🔴 (referentieselectie + kenmerk-effecten + modulaire variabelen
> + AI USP-extractor, zie spec hieronder); (3) `/marktanalyse` van mockup naar werkend scherm 🟠.
> **Geblokkeerd, niet oppakken:** waarderingsmodel bouwen (wacht op eerste import) ·
> concurrentieanalyse (wacht op makelaarsnaam in de dataset) · i4housing Map (wacht op
> transactiedataset mét coördinaten) · Realworks-API, social-auto-publiceren.
> **Werkwijze:** `npm run typecheck && npm run test` groen vóór elke commit; werk op een
> feature-branch en lever via PR + merge naar `main` (dat triggert de Vercel-deploy).

---

## Hoofdstructuur (vastgelegd 15 sep 2026)

Micro/macro-knip. Alles onder **Woningdossier** hangt aan één geselecteerd adres; **Marktinzichten**
is regionaal en staat los van een specifieke woning; **Kantoorinstellingen** is losstaande configuratie.

### Woningdossier (micro) — `components/ObjectWorkspace.tsx`

**Module A — Content en media** (ontgrendeld, zie `lib/features.ts` — `CONTENT_VERGRENDELD` is de schakelaar):
- Brochure · Funda-tekst · Social media-teksten (bv. Instagram-captions) · Verkoopadvies · Buurtrapport
- **i4housing Map** (nieuw, nog te bouwen): interactieve kaart met een straal van **exact 500 meter**
  rondom het actieve adres, met kantoor-vlaggetjes op alle historische transacties van het eigen
  kantoor binnen die straal. Vereist: (a) coördinaten (lat/lng) in de transactiedataset — zie
  "Databron" hieronder, (b) een kaartlibrary (nog te kiezen — Leaflet/Mapbox), (c) een geo-query
  (PostGIS `ST_DWithin` of een eenvoudige haversine-filter in Postgres/Supabase).

**Module B — Waardering** (reken- en datamodule, in aanbouw):
- **Modulaire variabelen als losse blokken**: de makelaar moet kamers, WOZ, oppervlakte, kavelgrootte,
  energielabel en staat van onderhoud individueel kunnen toevoegen, in- of uitschakelen voor de
  berekening. UI-implicatie: dit is geen vast formulier maar een blokken-canvas — ontwerp dit als
  aparte `WaarderingBlok`-componenten die elk hun eigen aan/uit-state en effect-op-waarde dragen.
- **AI USP-extractor**: vrij tekstveld waar de makelaar bijzonderheden intypt (bv. "heeft een mooie
  garage", "nieuw dakkapel") — een Claude-call vertaalt dit naar gestructureerde USP's die de
  waardering en/of marketingtekst beïnvloeden. Aparte, kleine prompt naast de hoofdwaardering.
- Waarde met bandbreedte, referentietransacties, PDF-rapport in kantoorhuisstijl.

### Marktinzichten (macro) — `app/(app)/marktanalyse/`

- **Marktanalyse**: datagrafieken over macro-trends — prijsontwikkeling, vraag naar woningtype
  (bv. hoekwoning vs. tussenwoning), doorlooptijd, per type/wijk/periode.
- **Concurrentieanalyse**: dashboards die verkoopresultaten en marktaandeel van het eigen kantoor
  afzetten tegen concurrenten in de regio. Architectuur moet ruimte laten voor toekomstige
  uitbreiding (dit hoeft niet in v1 compleet te zijn, maar het datamodel moet er niet voor op de
  schop hoeven).

### Kantoorinstellingen — `app/(app)/huisstijl/`, `app/(app)/settings/`

Huisstijl, logo, tone-of-voice voor alle AI-content. Al gebouwd (`lib/branding.ts` + `HuisstijlTab`).

---

## 🔴 Nu — fundament voor waardering

- **Supabase-URL herstellen** (actie Quinn) — zie de waarschuwing in de hervat-pointer hierboven. Blokkeert letterlijk alles wat met de database praat, inclusief lokaal ontwikkelen.
- **Databron vastleggen** (actie Quinn) — combinatie van Altum AI (adres → woningkenmerken, zoals in Dealwijs) en een eigen, regelmatig te importeren dataset van verkochte woningen (transacties, heel Nederland). Blokkeert het waarderingsmodel én de i4housing Map. Nodig om te bepalen:
  - Importformaat van de eigen dataset (kolommen, frequentie, bestandstype) — **inclusief coördinaten (lat/lng)**, anders kan de 500m-radiuskaart niet gebouwd worden.
  - Licentiestatus — zie de waarschuwing in `goals.md` § Risico's: Kadaster/NVM-brainbay/Funda-data is licentieplichtig, scrapen mag niet. Dit moet zeker staan vóórdat er een import gebouwd wordt, niet erna.
  - Of Altum AI hetzelfde werkgebied dekt als de eigen dataset (heel Nederland, gekozen 15 sep) of dat de dekking per gebied verschilt.
- **Importpijplijn eigen transactiedata** — CSV/Excel → Supabase-tabel met adres, coördinaten, verkoopprijs, verkoopdatum, kenmerken (type, m², bouwjaar, energielabel, kamers, garage, etc.). Ontwerp het schema generiek genoeg voor makelaarsnaam als optioneel veld (nu leeg, later gevuld voor concurrentieanalyse).
- **Waarderingsmodel — referentieselectie** — bij een adres de meest vergelijkbare verkochte woningen vinden (afstand, type, oppervlak, bouwperiode). Combineert Altum-kenmerken van het te waarderen adres met de eigen referentiedataset.
- **Waarderingsmodel — kenmerk-effecten** — het "wat-als"-stuk achter de modulaire variabelen: wat doet een extra kamer, een beter energielabel, een garage of een aanbouw met de waarde? Uit de data zelf afleiden (regressie of vergelijkbare-paren-methode), niet hardcoderen — anders klopt het niet per regio.
- **Woningdossier: waarderingsscherm bouwen (Module B)** — vervangt de placeholder in `components/ObjectWorkspace.tsx`. Bouwvolgorde: (1) modulaire variabele-blokken UI, (2) referentieselectie + kenmerk-effecten eronder, (3) AI USP-extractor, (4) PDF-rapport in kantoorhuisstijl.
- **Adres toevoegen aan het woningdossier** — vervangt de placeholder in `app/(app)/object/new/page.tsx`. Korte flow: adres → Altum-kenmerken ophalen → opslaan. Geen 8-veldenformulier meer (dat hoorde bij contentgeneratie).

## 🟠 Middel — marktinzichten & afwerking

- **`/marktanalyse` van mockup naar werkend scherm** — nu `InAanbouw`-placeholders (`app/(app)/marktanalyse/page.tsx`). Marktanalyse: filter op type/wijk/periode, marktbeeld (prijsontwikkeling, m²-prijs, doorlooptijd). Concurrentieanalyse: zie hieronder.
- **Concurrentieanalyse** — pas oppakken zodra de verkopende makelaar in de dataset zit (actie Quinn, zie "Databron"). Marktaandeel per kantoor, segment, doorlooptijd. Houd het datamodel uitbreidbaar (zie Hoofdstructuur hierboven).
- **i4housing Map (Module A)** — kaart met 500m-radius en kantoor-vlaggetjes op historische transacties, zie spec hierboven. Wacht op coördinaten in de transactiedataset.
- **AI USP-extractor (Module B)** — los, klein Claude-prompt-ontwerp: vrije tekst → gestructureerde USP's. Kan grotendeels los van het waarderingsmodel gebouwd worden zodra de invoer-UI er is.
- **Huisstijl: accentkleur echt gebruiken in de rapportlaag** — `accent_kleur` staat sinds 15 sep in `HuisstijlSchema` (`lib/schemas.ts`) en wordt al getoond in `HuisstijlTab`, maar het waarderingsrapport (nog te bouwen) moet 'm ook echt toepassen naast `primaire_kleur`.
- **`lib/plans.ts`-vervanger als er ooit weer geprijsd wordt** — de oude object-limieten zijn volledig verwijderd (zie "Al gebouwd & live"). Mocht er weer een prijsmodel komen, dan is dat een nieuw ontwerp vanaf nul — niet de oude Starter/Pro/Kantoor-structuur terugzetten zonder expliciet besluit van Quinn.

## 🟢 Laag — opruimen, niet blokkerend

- **Content-tabellen/kolommen uit de contentsuite van vóór 15 aug** — `post_planning`, `chatbot_leads`, `chatbot_faq` en de kolommen `objecten.chat_publiek`/`chat_foto_url` + `object_documenten.publiek_chatbaar` staan nog ongebruikt in Supabase. Los op te ruimen, geen haast.
- **`kantoren.plan`/`trial_ends_at`/`stripe_id`-kolommen** — sinds 15 sep nergens meer gelezen of geschreven (zie "Al gebouwd & live"). Kunnen weg via een migratie zodra dat rustig uitkomt; geen functionele impact zolang ze blijven staan.
- **CBS-jaargang jaarlijks bijwerken** — `lib/verrijking.ts` staat op `85984NED` (2024). CBS publiceert elk voorjaar een nieuwe jaargang, maar niet alle velden zijn meteen gevuld — check bij het ophogen of inkomen gevuld is. Nieuwe ID's: `https://opendata.cbs.nl/ODataCatalog/Tables?$filter=substringof('Kerncijfers wijken en buurten',Title)&$format=json`.
- **Supabase-mailonderwerpen vernederlandsen** — "Reset your password" / "Confirm your email address" → NL (dashboard → Auth → Email Templates).
- **Supabase Auth: self-signup uitzetten** (aanbevolen) — `/login` heeft geen "Aanmelden"-formulier meer, maar `supabase.auth.signUp` staat op projectniveau mogelijk nog open (dashboard → Auth → Providers → Email → "Allow new users to sign up" uitzetten). Zonder die toggle kan iemand die de open Supabase REST-endpoint direct aanroept alsnog een eigen kantoor laten aanmaken via de DB-trigger `handle_new_user()`, wat tegen het "puur admin-beheerd"-besluit van 15 sep ingaat.

---

## Al gebouwd & live (koerswijziging 15 sep — niet opnieuw doen/checken)

- **Landingspagina** — het originele, uitgebreide marketingontwerp is terug (`components/LandingPageClient.tsx`, exact dezelfde visuele opzet als vóór de koerswijziging): live demo-kaart, contentvoorbeelden (Funda/brochure/Instagram/LinkedIn/e-mail/buurt), virtual-staging voor/na-vergelijking, BAG/Kadaster-sectie, documentenassistent-demo, Anthropic/Claude-strip. Twee secties toegevoegd: **Woningwaardering** en **Marktinzichten** (vervangen de oude prijzen-sectie). Verwijderd: alle prijzen, "Aanmelden"/proefperiode-CTA's (nu "Toegang aanvragen" → `/contact`), en verwijzingen naar kalender/chatbot/fotoverbetering (definitief verwijderde features). `/prijzen` blijft verwijderd.
- **Topbar met nieuwe hoofdstructuur** — `components/AppTopbar.tsx`: Woningdossier · Marktinzichten (Marktanalyse + Concurrentieanalyse) · Content · Kantoorinstellingen.
- **Kantoorbranding na login** — `lib/branding.ts` bouwt uit `kantoren.huisstijl_json` een volledig palet en zet dat als CSS-variabelen (`--merk*`) in `app/(app)/layout.tsx`. `accent_kleur` toegevoegd aan `HuisstijlSchema` en de huisstijl-instellingen.
- **Contentsuite ontgrendeld** — `lib/features.ts` (`CONTENT_VERGRENDELD = false`) laat de content-API's en de echte formulieren (`ObjectWorkspace` Module A, `object/new`) weer werken. De vlag blijft bestaan: op `true` zetten sluit alles in één keer weer af.
- **Alle prijzen/abonnementen/Stripe volledig verwijderd (niet alleen bevroren)** — `lib/plans.ts`, alle Stripe-routes (`checkout`, `customer-portal`, `webhooks/stripe`), de `stripe`-npm-dependency, `vercel.json`-cron voor trial-waarschuwing, en alle bijbehorende UI (plan-badges, upgrade-CTA's, trial-banners, referral "1 maand gratis") zijn weg. Toegang is nu **puur admin-beheerd**: geen plan, geen proefperiode — alleen (de)activeren via `/admin`.
- **`/login` self-signup gesloten** — het "Aanmelden"-tabblad is verwijderd; alleen inloggen + wachtwoord-reset. Teamleden binnen een kantoor uitnodigen loopt via de bestaande `nodigTeamlidUit` (magic link, `Instellingen → Team`).
- **Admin: kantoor/account-beheer** — `/admin` heeft nu `createKantoor` en `addMakelaarAccount` (`app/admin/actions.ts` + `AccountBeheer.tsx`): een kantoor aanmaken, en een account met zelfgekozen wachtwoord direct koppelen aan een kantoor (incl. opruimen van het kantoor dat de DB-trigger er per ongeluk bij aanmaakt).
- **i4 Housing-kantoor + Quinn's account live** — het Supabase-project was gepauzeerd (free tier); na reactivering staat het kantoor "i4 Housing" (`huisstijl_json` met het opgezochte palet) in de database, met `quinn.berkouwer@icloud.com` als admin-account.

---

## Bewust níet doen

- ❌ **Content-kalender, foto-verbetering en object-chatbot** — op 15 sep 2026 volledig verwijderd. Niet opnieuw bouwen zonder expliciet besluit van Quinn.
- ❌ **Zelf aanmelden / publiek geprijsde site / abonnementen** — bewust geschrapt 15 sep. Nieuwe kantoren worden handmatig klaargezet via `/admin`. Niet terugzetten zonder besluit van Quinn.
- ❌ Geen AI-inbox (e-mail/WhatsApp) — kernproduct HousApp, jaar voorsprong + funding.
- ❌ Geen bezichtigingsplanner.

---

## Permanente kwaliteit

- `npm run typecheck` + `npm run test` altijd groen vóór elke commit.
- Lighthouse landing: >90 performance, >95 accessibility.
- Elk nieuw scherm mobile-responsive checken.
