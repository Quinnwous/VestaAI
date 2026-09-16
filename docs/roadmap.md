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
> **Volgende zonder blokkade, in deze volgorde:** (1) gedeelde intake bouwen 🔴 (één
> invoerstap voor adres+kenmerken+doelgroep+USP-tekst die zowel Module A als Module B voedt,
> zie Hoofdstructuur — hangt niet af van de transactie-import, kan nu al); (2) importformaat
> voor de transactiedataset vastleggen 🔴 — blokkeert het waarderingsmodel én de i4housing Map
> (zie "Databron"); (3) waarderingsmodel ontwerpen 🔴 (referentieselectie + kenmerk-effecten +
> modulaire aan/uit-blokken + AI USP-extractor, zie spec hieronder); (4) `/marktanalyse` van
> mockup naar werkend scherm 🟠.
> **Geblokkeerd, niet oppakken:** waarderingsmodel bouwen (wacht op eerste import) ·
> i4housing Map (wacht op transactiedataset mét coördinaten) · Realworks-API,
> social-auto-publiceren.
> **Databron concurrentieanalyse (besluit 15 sep):** Brainbay (NVM) — i4housing heeft hier
> als NVM-lid toegang toe. Nog een openstaand actiepunt (actie Quinn): exportformaat en
> importfrequentie vanuit Brainbay vastleggen, net als bij de Realworks-export voor de
> waardering.
> **Bedieningsmodel (besluit 15 sep, zie `goals.md`):** i4housing self-service laten
> gebruiken, maar databeheer (Realworks- én Brainbay-import, periodieke updates,
> kantoor-specifieke aanpassingen) en maatwerkverzoeken (bv. virtual staging/artist
> impressions op aanvraag) lopen via Quinn als VestaAI-admin, niet self-service door het
> kantoor. Zie nieuwe roadmap-items hieronder onder "Admin-databeheer & maatwerk".
> **Werkwijze:** `npm run typecheck && npm run test` groen vóór elke commit; werk op een
> feature-branch en lever via PR + merge naar `main` (dat triggert de Vercel-deploy).

---

## Hoofdstructuur (vastgelegd 15 sep 2026)

Micro/macro-knip. Alles onder **Woningdossier** hangt aan één geselecteerd adres; **Marktinzichten**
is regionaal en staat los van een specifieke woning; **Kantoorinstellingen** is losstaande configuratie.

### Woningdossier (micro) — `components/ObjectWorkspace.tsx`

**Eén gedeelde intake (besluit 15 sep — vervangt het idee van een apart invoermoment per
module):** bij "Woning toevoegen" vult de makelaar één keer alles in — adres, kamers, WOZ,
oppervlakte, kavelgrootte, energielabel, staat van onderhoud, doelgroep, en een vrij
tekstveld voor bijzonderheden. Direct daarna volgt automatische verrijking (Kadaster/BAG/CBS/
Overpass, `lib/verrijking.ts`, bestaat al). Deze ene intake + verrijking voedt zowel Module A
als Module B — geen los formulier per module. Zie roadmap-item "Woning toevoegen: gedeelde
intake bouwen" onder 🔴 Nu.

**Module A — Content en media** (ontgrendeld, zie `lib/features.ts` — `CONTENT_VERGRENDELD` is de schakelaar):
- Brochure · Funda-tekst · Social media-teksten (bv. Instagram-captions) · Verkoopadvies · Buurtrapport
- **i4housing Map** (nieuw, nog te bouwen): interactieve kaart met een straal van **exact 500 meter**
  rondom het actieve adres, met kantoor-vlaggetjes op alle historische transacties van het eigen
  kantoor binnen die straal. Vereist: (a) coördinaten (lat/lng) in de transactiedataset — zie
  "Databron" hieronder, (b) een kaartlibrary (nog te kiezen — Leaflet/Mapbox), (c) een geo-query
  (PostGIS `ST_DWithin` of een eenvoudige haversine-filter in Postgres/Supabase).

**Module B — Waardering** (reken- en datamodule, in aanbouw):
- **Modulaire variabelen als losse blokken**: toont de kamers, WOZ, oppervlakte, kavelgrootte,
  energielabel en staat van onderhoud uit de gedeelde intake, elk individueel in- of
  uitschakelbaar voor de berekening ("wat-als"-scenario's). Geen nieuwe invoer — een
  aan/uit-weergave bovenop wat al is ingevuld. UI-implicatie: geen vast formulier maar een
  blokken-canvas — ontwerp dit als aparte `WaarderingBlok`-componenten die elk hun eigen
  aan/uit-state en effect-op-waarde dragen, gevoed vanuit de intake-data.
- **AI USP-extractor**: verwerkt het vrije-tekstveld uit de gedeelde intake (bv. "heeft een
  mooie garage", "nieuw dakkapel") — een Claude-call vertaalt dit naar gestructureerde USP's
  die de waardering en/of marketingtekst beïnvloeden. Aparte, kleine prompt naast de
  hoofdwaardering; draait op dezelfde intake als Module A, niet op een eigen invoerveld.
- Referentiedataset is i4housing's eigen Realworks-verkoopdata (geen externe/landelijke
  bron, zie "Databron" hieronder). Waarde met bandbreedte, referentietransacties,
  PDF-rapport in kantoorhuisstijl.

### Marktinzichten (macro) — `app/(app)/marktanalyse/`

Drie items in de dropdown:

- **Marktanalyse**: datagrafieken over macro-trends — prijsontwikkeling, vraag naar woningtype
  (bv. hoekwoning vs. tussenwoning), doorlooptijd, per type/wijk/periode.
- **Transacties opzoeken**: losse zoekfunctie over de transactiedataset — op adres, wijk of
  periode individuele verkochte woningen terugvinden (i4housing's eigen Realworks-historie,
  en zodra Brainbay is aangesloten ook die transacties). Los van Marktanalyse's
  geaggregeerde grafieken: dit is opzoeken van een los record, geen trend.
- **Concurrentieanalyse**: dashboards die verkoopresultaten en marktaandeel van het eigen kantoor
  afzetten tegen concurrenten in de regio, op basis van Brainbay-data (besluit 15 sep, zie
  hervat-pointer). Architectuur moet ruimte laten voor toekomstige uitbreiding (dit hoeft
  niet in v1 compleet te zijn, maar het datamodel moet er niet voor op de schop hoeven).

### Kantoorinstellingen — `app/(app)/huisstijl/`, `app/(app)/settings/`

Huisstijl, logo, tone-of-voice voor alle AI-content. Al gebouwd (`lib/branding.ts` + `HuisstijlTab`), inclusief lettertype, vormtaal, sfeerbeeld in de zijmarges en contactbalk.

Open punten voor een volledig white-label ervaring:
- **Afzenderdomein per kantoor** — transactionele mail gaat nog uit als `noreply@vestaai.nl`. Voor echte white-label moet i4housing.nl (of een subdomein) in Resend geverifieerd worden; de mailsjablonen dragen al de kantoornaam en -kleur.
- **Supabase Auth-mails** (uitnodiging, wachtwoord-reset) staan nog op de standaardsjablonen in het Supabase-dashboard — die zijn niet kantoorgebonden en niet in code te versieren.

---

## 🔴 Nu — fundament voor waardering

- **Supabase-URL herstellen** (actie Quinn) — zie de waarschuwing in de hervat-pointer hierboven. Blokkeert letterlijk alles wat met de database praat, inclusief lokaal ontwikkelen.
- **Databron vastleggen** (actie Quinn) — i4housing's eigen, regelmatig te importeren Realworks-verkoopdata (geen externe/landelijke dataset, geen Altum AI — bewust losgelaten 15 sep, zie `goals.md` § Risico's voor het bijbehorende compromis: kleinere referentiedataset). Blokkeert het waarderingsmodel én de i4housing Map. Nodig om te bepalen:
  - Exportformaat vanuit Realworks (kolommen, frequentie, bestandstype) — **inclusief coördinaten (lat/lng)**, anders kan de 500m-radiuskaart niet gebouwd worden.
  - Hoe ver de Realworks-verkoophistorie van i4housing terugreikt (hoeveel referentietransacties zijn er daadwerkelijk beschikbaar).
- **Importpijplijn eigen transactiedata** — CSV/Excel (Realworks-export), handmatig geïmporteerd door Quinn via `/admin` (niet self-service door i4housing, zie "Bedieningsmodel" in de hervat-pointer) → Supabase-tabel met adres, coördinaten, verkoopprijs, verkoopdatum, kenmerken (type, m², bouwjaar, energielabel, kamers, garage, etc.). Geen makelaarsnaam-veld nodig — het is per definitie allemaal i4housing's eigen verkoophistorie; concurrentieanalyse gebruikt een aparte Brainbay-import (zie "Admin-databeheer & maatwerk" hieronder).
- **Woning toevoegen: gedeelde intake bouwen** — vervangt de placeholder in `app/(app)/object/new/page.tsx` én het oude losse 8-veldenformulier. Besluit 15 sep: één invoerstap voor de hele woning, die zowel Module A als Module B voedt (zie Hoofdstructuur hierboven) — adres, kamers, WOZ, oppervlakte, kavelgrootte, energielabel, staat van onderhoud, doelgroep, vrije-tekst bijzonderheden. Flow: intake invullen → opslaan → automatische verrijking (Kadaster/BAG/CBS/Overpass, `lib/verrijking.ts`, bestaat al) → content (Module A) en waardering (Module B) draaien allebei op dezelfde data. Geen aparte Altum-lookup, geen tweede invoermoment in Module B.
- **Waarderingsmodel — referentieselectie** — bij een adres de meest vergelijkbare verkochte woningen vinden (afstand, type, oppervlak, bouwperiode) uit i4housing's eigen referentiedataset, op basis van de kenmerken uit de gedeelde intake.
- **Waarderingsmodel — kenmerk-effecten** — het "wat-als"-stuk achter de modulaire variabelen: wat doet een extra kamer, een beter energielabel, een garage of een aanbouw met de waarde? Uit de data zelf afleiden (regressie of vergelijkbare-paren-methode) — met de kanttekening dat dit op een kleinere, één-kantoor-dataset minder robuust is dan op een landelijke bron (zie `goals.md` § Risico's).
- **Woningdossier: waarderingsscherm bouwen (Module B)** — vervangt de placeholder in `components/ObjectWorkspace.tsx`. Bouwvolgorde: (1) modulaire aan/uit-blokken die de intake-data tonen, (2) referentieselectie + kenmerk-effecten eronder, (3) AI USP-extractor op het intake-tekstveld, (4) PDF-rapport in kantoorhuisstijl.

## 🟠 Middel — marktinzichten & afwerking

- **`/marktanalyse` van mockup naar werkend scherm** — nu `InAanbouw`-placeholders (`app/(app)/marktanalyse/page.tsx`), en de `AppTopbar.tsx`-dropdown heeft nog maar twee van de drie items (zie Hoofdstructuur). Marktanalyse: filter op type/wijk/periode, marktbeeld (prijsontwikkeling, m²-prijs, doorlooptijd). Transacties opzoeken: nieuw dropdown-item toevoegen, zoekscherm op adres/wijk/periode over de eigen (en straks Brainbay-) transacties. Concurrentieanalyse: zie hieronder.
- **Concurrentieanalyse** — databron is Brainbay (besluit 15 sep, niet langer geblokkeerd op een open vraag). Wacht nog op de Brainbay-import (zie "Admin-databeheer & maatwerk" hieronder). Marktaandeel per kantoor, segment, doorlooptijd. Houd het datamodel uitbreidbaar (zie Hoofdstructuur hierboven).
- **i4housing Map (Module A)** — kaart met 500m-radius en kantoor-vlaggetjes op historische transacties, zie spec hierboven. Wacht op coördinaten in de transactiedataset.
- **AI USP-extractor (Module B)** — los, klein Claude-prompt-ontwerp: vrije tekst → gestructureerde USP's. Kan grotendeels los van het waarderingsmodel gebouwd worden zodra de invoer-UI er is.
- **Huisstijl: accentkleur echt gebruiken in de rapportlaag** — `accent_kleur` staat sinds 15 sep in `HuisstijlSchema` (`lib/schemas.ts`) en wordt al getoond in `HuisstijlTab`, maar het waarderingsrapport (nog te bouwen) moet 'm ook echt toepassen naast `primaire_kleur`.
- **`lib/plans.ts`-vervanger als er ooit weer geprijsd wordt** — de oude object-limieten zijn volledig verwijderd (zie "Al gebouwd & live"). Mocht er weer een prijsmodel komen, dan is dat een nieuw ontwerp vanaf nul — niet de oude Starter/Pro/Kantoor-structuur terugzetten zonder expliciet besluit van Quinn.

## Admin-databeheer & maatwerk (nieuw, besluit 15 sep)

Bewust bedieningsmodel: i4housing gebruikt de app self-service, maar Quinn beheert de data
en verzorgt maatwerk namens hen als VestaAI-admin — zie `goals.md` § Bedieningsmodel voor de
achterliggende reden (en het compromis: schaalt niet vanzelf naar meerdere kantoren).

- **Brainbay-import (concurrentiedata)** — periodiek (frequentie nog te bepalen) door Quinn
  via `/admin` te importeren, los van de Realworks-eigen-data-import. Voedt
  Concurrentieanalyse. Exportformaat vanuit Brainbay nog vast te leggen (net als bij
  Realworks).
- **Periodieke Realworks-herimport** — de eenmalige importpijplijn (zie 🔴 Nu) moet
  herhaalbaar zijn: maandelijks (of vaker) nieuwe verkopen bijwerken, niet een eenmalige
  actie.
- **Kantoor-data direct aanpasbaar door Quinn** — `/admin` uitbreiden zodat Quinn (los van
  `createKantoor`/`addMakelaarAccount`) kantoor-specifieke data en instellingen kan bijwerken
  namens i4housing, zonder dat zij daarvoor zelf iets hoeven te doen.
- **Maatwerkverzoeken-flow (nieuw)** — i4housing kan binnen de app een verzoek indienen voor
  handwerk dat (nog) niet geautomatiseerd is (bv. een artist impression of een bewerkte
  virtual-staging-foto): foto + toelichting uploaden. Quinn ziet het verzoek in `/admin`,
  werkt het extern uit, en zet het resultaat terug in het dossier van dat kantoor. Nog te
  ontwerpen:
  - Waar een verzoek landt (nieuwe tabel, bv. `verzoeken`: kantoor_id, object_id (optioneel),
    type, toelichting, bijlage-url, status, resultaat-url).
  - Statusflow (open → in behandeling → klaar) en of de makelaar een melding krijgt zodra het
    klaar is (Resend-e-mail ligt voor de hand, is al in gebruik).
  - Of dit aan een object hangt (Woningdossier) of losstaand is (ook bruikbaar voor
    niet-object-gebonden verzoeken).

## 🟢 Laag — opruimen, niet blokkerend

- **Content-tabellen/kolommen uit de contentsuite van vóór 15 aug** — `post_planning`, `chatbot_leads`, `chatbot_faq` en de kolommen `objecten.chat_publiek`/`chat_foto_url` + `object_documenten.publiek_chatbaar` staan nog ongebruikt in Supabase. Los op te ruimen, geen haast.
- **`kantoren.plan`/`trial_ends_at`/`stripe_id`-kolommen** — sinds 15 sep nergens meer gelezen of geschreven (zie "Al gebouwd & live"). Kunnen weg via een migratie zodra dat rustig uitkomt; geen functionele impact zolang ze blijven staan.
- **CBS-jaargang jaarlijks bijwerken** — `lib/verrijking.ts` staat op `85984NED` (2024). CBS publiceert elk voorjaar een nieuwe jaargang, maar niet alle velden zijn meteen gevuld — check bij het ophogen of inkomen gevuld is. Nieuwe ID's: `https://opendata.cbs.nl/ODataCatalog/Tables?$filter=substringof('Kerncijfers wijken en buurten',Title)&$format=json`.
- **Supabase-mailonderwerpen vernederlandsen** — "Reset your password" / "Confirm your email address" → NL (dashboard → Auth → Email Templates).
- **Supabase Auth: self-signup uitzetten** (aanbevolen) — `/login` heeft geen "Aanmelden"-formulier meer, maar `supabase.auth.signUp` staat op projectniveau mogelijk nog open (dashboard → Auth → Providers → Email → "Allow new users to sign up" uitzetten). Zonder die toggle kan iemand die de open Supabase REST-endpoint direct aanroept alsnog een eigen kantoor laten aanmaken via de DB-trigger `handle_new_user()`, wat tegen het "puur admin-beheerd"-besluit van 15 sep ingaat.

---

## Al gebouwd & live (koerswijziging 15 sep — niet opnieuw doen/checken)

- **Landingspagina** — het originele, uitgebreide marketingontwerp is terug (`components/LandingPageClient.tsx`, exact dezelfde visuele opzet als vóór de koerswijziging): live demo-kaart, contentvoorbeelden (Funda/brochure/Instagram/LinkedIn/e-mail/buurt), virtual-staging voor/na-vergelijking, BAG/Kadaster-sectie, documentenassistent-demo, Anthropic/Claude-strip. Twee secties toegevoegd: **Woningwaardering** en **Marktinzichten** (vervangen de oude prijzen-sectie). Verwijderd: alle prijzen, "Aanmelden"/proefperiode-CTA's (nu "Toegang aanvragen" → `/contact`), en verwijzingen naar kalender/chatbot/fotoverbetering (definitief verwijderde features). `/prijzen` blijft verwijderd.
- **Topbar met nieuwe hoofdstructuur** — `components/AppTopbar.tsx`: Woningdossier · Marktinzichten (dropdown, momenteel Marktanalyse + Concurrentieanalyse — "Transacties opzoeken" nog toe te voegen, zie 🟠 Middel) · Content · Kantoorinstellingen.
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
