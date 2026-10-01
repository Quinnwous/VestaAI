# VestaAI — Productoverzicht: wat er staat

> **Stand 1 okt 2026.** Alles wat gebouwd en live is, per onderdeel: wat het
> doet, waar het in de code zit en wat de beperkingen zijn. Wat nog moet gebeuren
> staat in `docs/roadmap.md`; hoe het technisch in elkaar zit in
> `docs/architectuur.md`; het verloop per ronde in `docs/besluiten.md`.
>
> Is iets af, dan komt het hier (en gaat het uit de roadmap).

**In één zin:** een white-label platform voor één makelaarskantoor (i4 Housing,
Wassenaar) met per woning een dossier van verkoopadvies tot verkocht —
waardebepaling, buurtdata en een contentsuite in NL + EN — plus vier verkenners
op de eigen transactiedata. Alles in de huisstijl van het kantoor, toegang puur
via de platform-admin.

**Legenda:** ✅ live en bruikbaar · 🟡 live, maar wacht op data of een
betaalde testrun · ⏸ voorbereid, nog niet zichtbaar.

## In één oogopslag

| Onderdeel | Status | Opmerking |
|---|---|---|
| Kantoorlogin + huisstijl per kantoor | ✅ | `/login/i4housing`, logo/kleuren/lettertype/vormtaal |
| Startpagina | ✅ | toont bij i4 nog lege kerncijfers (0 transacties) |
| Woningdossier (fasemodel + intake) | ✅ | aanmaken in ~1 s, zonder AI |
| Waardebepaling + pdf + presentatiemodus | 🟡 | werkt op het demo-kantoor; i4 wacht op de import |
| Buurt & data (CBS, voorzieningen, WOZ) | ✅ | WOZ vult de makelaar zelf in |
| Contentsuite NL + EN | 🟡 | echte duur NL + EN nog niet gemeten; staging nooit betaald getest |
| Verkoopadvies | ⏸ | datalaag klaar, document wacht op Quinns voorbeeld |
| Woningen-overzicht (tabel + kaart) | ✅ | |
| Marktanalyse + kwartaalbericht | 🟡 | lege staat bij i4 tot de import |
| Transacties opzoeken | 🟡 | idem |
| Concurrentieanalyse | 🟡 | heeft "verkopend kantoor" in de export nodig |
| Verkoopkaart | 🟡 | alleen eigen verkopen; lege staat bij i4 |
| ⌘K-zoeken, feedbackknop, account, kantoorpagina | ✅ | |
| Platform-admin | ✅ | kantoren, accounts, huisstijl, instellingen, import |
| Importpijplijn transacties | 🟡 | klaar, wacht op de Brainbay-/Realworks-exports |
| Publieke site + juridische teksten | ✅ | KvK-gegevens ontbreken nog; jurist-toets open |
| Kwaliteitsbewaking (tests, CI, DoD-scripts) | ✅ | 1019 unit-tests, CI op GitHub, e2e, axe, generale repetitie |

---

## 1. Toegang en white-label

- **Gesloten platform.** Geen zelf-aanmelden, geen prijzen of abonnementen
  (Stripe op 15 sep verwijderd). De platform-admin maakt kantoren en accounts
  aan in `/admin`. Iedereen binnen een kantoor ziet en kan hetzelfde (één rol).
- **Kantoorlogin** `/login/<slug>` in de huisstijl van het kantoor (branding via
  de publieke RPC `kantoor_branding_publiek`), met "wachtwoord vergeten" en een
  reset-mail in kantoorstijl. De laatst gebruikte slug wordt onthouden.
  Algemene login: `/login`.
- **Huisstijl per kantoor** (`lib/branding.ts`): primaire en accentkleur,
  lettertype (Jakarta/Gantari/Nunito), vormtaal (zacht/strak), logo, favicon,
  sfeerbeeld, contactgegevens en website — als `--merk*`-variabelen over de hele
  ingelogde omgeving, inclusief pop-ups, pdf's en e-mails. Contrast wordt per
  kantoor bewaakt: een merkkleur die met geen enkele tekstkleur AA haalt, wordt
  net genoeg verdonkerd (i4-blauw `#0080C8` → `#007BC0`).
- Linksboven staat een klein "VestaAI × kantoorlogo"-lockup; verder nergens de
  naam VestaAI achter de login.
- **i4 Housing** is ingericht: huisstijl, kantoorprofiel, werkgebied
  (Wassenaar, Den Haag), courtage 1 % excl. btw, tekstsjabloon. Er is één
  account (Quinn als makelaar); de zes teamaccounts zijn nog niet aangemaakt.

## 2. Startpagina (`/dashboard`)

Begroeting op tijd van de dag (server-side berekend), merkverloop of
sfeerbeeld (`StartBanner`), **kerncijfers** (verkocht laatste 12 maanden,
gemiddelde looptijd, marktaandeel in de hoofdplaats, prijs t.o.v. vraagprijs,
aantal in verkoop, lopende verkoopadviezen) en **recent bekeken** dossiers
(`gebruik_events`). Geen snelkoppelingen (bewust).

## 3. Woningdossier (`/object/[id]`)

Eén dossier per adres, drie fases: **Verkoopadvies → In verkoop → Verkocht**,
door te zetten met de fasestepper in de dossierheader. De header toont adres,
fase, sinds wanneer en de kernbedragen.

- **Intake** (`/object/new`, `components/PropertyForm.tsx`): zesstappenwizard
  (adres, woning, staat & afwerking, ligging & buitenruimte, verhaal,
  commercieel) met BAG-adresaanvulling die bouwjaar en oppervlakte voorvult,
  een check op een al bestaand dossier, een live "Deze woning"-paneel ernaast,
  woningtype als groep + subtype, en courtage voorgevuld met de kantoorstandaard
  (per woning aan te passen, label excl./incl. btw).
- **Tab Waardering** — de waardebepaling (§ 4) met de dossierkaart:
  referenties en eigen verkopen binnen 250/500/1.000 m.
- **Tab Buurt & data** — CBS-buurtcijfers (WOZ-gemiddelde, inkomen,
  opleiding, huishoudens, dichtheid) met per cijfer het niveau
  (buurt/wijk/gemeente), voorzieningen in de buurt en de WOZ-waarde die de
  makelaar zelf invult. Een mislukte bron staat er als "mislukt", niet als leeg
  — sinds 1 okt ook bij CBS (een serverfout werd eerder als "leeg" opgeslagen).
  Alle 15 dossiers van het demo-kantoor zijn op 1 okt ververst: CBS en
  voorzieningen `ok`. **Verversen zonder dataverlies:** faalt een bron bij
  "Ververs" terwijl er goede data stond, dan blijft die staan met de melding
  "Verversen lukte niet — dit zijn je gegevens van <datum>" (per bron
  `bronMeta` in `verrijking_json`, `voegVerrijkingSamen()` in
  `lib/verrijkingOpslag.ts`). Ook een PDOK-uitval meldt nu `mislukt`, en
  gemeente/coördinaat blijven staan. Overpass is dag-op-dag overbelast
  (HTTP 504), dus de melding kan voorkomen.
- **Tab Content en media** (vanaf In verkoop) — Teksten, Media, Documenten en
  Export (§ 5).
- **AI USP-extractor**: zet de vrije intaketekst om in gestructureerde
  verkoopargumenten.
- **Notitie** per dossier en **stijl leren** (zie § 5).
- **Presentatiemodus** (`/object/[id]/presentatie`, knop "Presenteren"):
  schermvullend verhaal voor aan de keukentafel — woning → waarde → kaart →
  top-6 referenties → WOZ → toelichting van de makelaar; pijltjes/spatie, Esc,
  fullscreen. Leest de opgeslagen waardering.
- **Verkoopadvies** ⏸ — de datalaag staat (`lib/verkoopadvies.ts`,
  `lib/verkoopadviesLaden.ts`: dossier, waardering, kantoorinstellingen,
  marktcontext 24 mnd, gereedheidscheck op 7 onderdelen). Document en knop
  wachten op Quinns voorbeeld (roadmap).

## 4. Waardebepaling

- Vergelijkbare-verkopenmethode op de eigen transactiedataset
  (`lib/waardering.ts`): referenties binnen een straal die vanzelf verbreedt,
  tijdcorrectie via een prijsindex uit de eigen data (terugval CBS),
  kenmerkcorrecties per referentie (garage, tuin, energielabel, bouwperiode),
  een bandbreedte die breder wordt bij weinig data, en een waarschuwing onder
  6 referenties. Methode in makelaarstaal: `docs/waardering/methode.md`.
- **Referentietabel** met per referentie afstand, datum, prijs, m², €/m²,
  index, correcties, gewicht en geïmpliceerde waarde; bedragen breken niet af
  (laptop 1280 px), op mobiel scrolt de tabel binnen zijn eigen kader.
- Makelaar kan referenties uitsluiten of toevoegen (waarde verandert live) en
  een correctie met verplichte motivatie vastleggen. WOZ staat als ijkpunt
  ernaast.
- **Waardebepaling-pdf** van één pagina in kantoorstijl, met statische
  locatiekaart en genummerde top-6 (~2,5 s). Variant **voor de verkoper**
  (`&voor=verkoper`): zonder interne waarschuwingen, met kantoorcontact.
- **Backtest** op de demo-fixture: mediane fout 6,1 %, 76 % binnen de band
  (lat ≤ 7 % / ≥ 75 %). Op echte data nog niet gedraaid.
- Geen NWWI-taxatie — dat staat op elke uitkomst en in de voorwaarden.

## 5. Contentsuite (fase In verkoop)

- **Genereren op knopdruk of automatisch** bij de overgang naar In verkoop;
  loopt op de achtergrond met een lock per dossier, het scherm toont voortgang.
  NL en EN tegelijk; Engels is best-effort.
- **Kernteksten:** Funda-tekst (volgt het i4-sjabloon: 4SALE! · WOONCOMFORT ·
  BUITENLEVEN · LOCATIE · GOED OM TE WETEN, met gerichte herkansing bij een
  afwijking), brochuretekst, Instagram, LinkedIn, WhatsApp-sneak-preview,
  koper-e-mail en buurtomschrijving. NL en EN naast elkaar vanaf 1280 px,
  kopieerknop per veld, inline bewerken en **herschrijven** per veld.
- **Extra's op aanvraag** ("Meer…"): open huis, follow-up (wel/niet
  geïnteresseerd), videoscript, kopersvragen-FAQ, energieadvies. Blijven staan
  bij opnieuw genereren.
- **Stijl leren:** handmatige bewerkingen worden verzameld; het kantoor keurt
  de daaruit gedestilleerde schrijfregels goed in het dossier.
- **Media:** fotobibliotheek en **virtual staging** (Gemini) met een vast
  label "Virtueel ingericht" op het resultaat en de regel "publiceer dit als
  impressie".
- **Documenten:** documentenassistent — pdf/Word uploaden, vragen stellen,
  content opnieuw laten genereren met het document als bron.
- **Export:** brochure-pdf in kantoorstijl (cover, foto's, kenmerkentabel,
  slotpagina), pdf van de teksten, teksten per e-mail als pdf,
  Realworks-export, en een prijswijziging-/verkocht-tekst.
- Content staat aan (`CONTENT_VERGRENDELD = false`) en kan met één vlag weer op
  slot.

## 6. Woningen (`/woningen`)

Alle dossiers van het kantoor als tabel of op de kaart, met zoeken, filter op
fase en makelaar, sortering; alle standen in de URL.

## 7. Marktinzichten

Vier verkenners op de transactiedataset van het kantoor; filters in de URL,
elke statistiek met n en "data t/m", standaardfilter = werkgebied.

- **Marktanalyse** (`/marktanalyse`): filters op plaats/wijk, woningtype,
  periode, prijs, oppervlak en meer; kerncijfers met delta t.o.v. de vorige
  periode; grafieken prijs, € per m², looptijd en prijsklassen; "wij vs.
  markt"; **segment A vs. B**-vergelijking. Knop **Kwartaalbericht schrijven**:
  Claude schrijft een marktupdate met de echte cijfers, met een guardrail die
  elk getal in de tekst controleert.
- **Transacties opzoeken** (`/marktanalyse/transacties`): server-gepagineerde
  tabel met zoeken, filters, sortering, minikaart per transactie (met melding
  als de locatie benaderd is) en CSV-export van de eigen verkopen.
- **Concurrentieanalyse** (`/marktanalyse/concurrentie`): marktaandeel,
  ranglijst, wie wint welk segment, wij vs. markt (looptijd, prijs t.o.v.
  vraagprijs), aandeel per jaar, matrix per wijk en een profiel per concurrent.
  Heeft `verkopend_kantoor` in de export nodig; tot die tijd een eerlijke lege
  staat.
- **Verkoopkaart** (`/marktanalyse/kaart`): alleen eigen verkopen als
  beeldmerk-pin, live filters, tijdlijn met afspeelknop, zijlijst, hover-kaart
  en een schakelbare laag buurtgrenzen.

## 8. Overige onderdelen in de app

- **⌘K-zoeken** (`components/ZoekPalet.tsx`, `app/api/zoeken`, `lib/zoeken.ts`):
  woningen van het kantoor, pagina's en een snelkoppeling naar Transacties
  opzoeken.
- **Feedbackknop** in het avatarmenu (`components/FeedbackKnop.tsx`): stuurt
  pagina + tekst per mail naar Quinn.
- **Mijn account** (`/account`): naam en wachtwoord wijzigen.
- **Kantoor** (`/kantoor`): read-only huisstijl, kantoorgegevens, team en
  statistieken. Bewerken kan alleen de platform-admin.

## 9. Platform-admin (`/admin`)

- Kantoren aanmaken, accounts koppelen met een zelfgekozen wachtwoord,
  toegang intrekken (bant alle gebruikers van een kantoor).
- Per kantoor (`/admin/kantoor/[id]`): huisstijl (kleuren, lettertype, vorm,
  logo, favicon, sfeerbeeld, website, voorbeeldteksten uploaden als basis voor
  de schrijfstijl), tekstsjabloon, instellingen (courtage, kantoorprofiel, werkgebied,
  kantoor-aliassen) en team.
- **Transacties** (`/admin/transacties`): CSV-import via dezelfde pijplijn als
  het importscript, importhistorie met kwaliteitsrapport, en "laatste import
  terugdraaien".
- Nog niet gebouwd: een gebruiksoverzicht (was schrapbaar in 12.4).

## 10. Transactiedata en import

- **Stand van de data:** het demo-kantoor ("Demo Makelaardij") heeft een
  synthetische regio van ~8.000 transacties (Wassenaar, Den Haag, Voorschoten,
  Leidschendam, Rijswijk) en 15 voorbeelddossiers; **i4 Housing heeft 0
  transacties en 0 dossiers** tot de echte exports er zijn. Transacties zijn
  strikt per kantoor afgeschermd.
- **Importpijplijn** (`lib/importPijplijn.ts`, `scripts/import-transacties.mjs`):
  Brainbay en Realworks, CSV en XLSX; kolomherkenning per bron (profielen nog
  voorlopig), RD → WGS84, plaatsnormalisatie ("Den Haag"), kantoornaam-
  normalisatie + aliassen voor `eigen_verkoop`, plausibiliteitsregels met
  `uitgesloten_reden`, ontdubbelen (Realworks wint, ± 90 dagen), dry-run met
  kwaliteitsrapport, weigert te schrijven zonder back-up van vandaag, en elke
  import is terug te draaien.
- **Geocodering** (`scripts/geocodeer-transacties.mjs`): PDOK, hervatbaar,
  `exact`/`benaderd`/`mislukt`.
- Periodiek herimporteren doet Quinn (concierge-model).

## 11. Publieke site

Landing (waardering + marktinzicht, content, white-label, concierge; CTA naar
contact of login), `/contact` (mailto), `/over-ons`, `/vertrouwen`, `/privacy`
en `/voorwaarden` (v1.1, 30 sep: rolverdeling verwerker/verantwoordelijke,
artikel over AI-uitvoer en waardebepaling, doorgifte buiten de EER per
leverancier), sitemap, robots, eigen 404. Plausible (cookieloos) alleen op
publieke pagina's. Formeel "u" publiek, informeel "je" achter de login.
Ontbreekt nog: KvK-nummer, adres en zakelijk mailadres.

## 12. Kwaliteit en tooling

- **Unit-tests** (Vitest): 1019 tests in 81 bestanden, met guard-tests die de
  architectuurregels afdwingen (transacties via één module, modelstrings op één
  plek, MapLibre-worker zelf gehost). De docx-extractie draait op een
  synthetische fixture (`lib/__fixtures__/voorbeeld.docx`).
- **CI op GitHub** (`.github/workflows/ci.yml`, sinds 1 okt): `npm ci`,
  typecheck, lint en tests op elke PR en elke push naar `main`, Node 24 (gelijk
  aan Vercel). Geen secrets, geen build — die blijft lokaal in de DoD.
- **E2e** (Playwright, `e2e/`): kantoorlogin, dossier < 5 s, waardering +
  pdf, kaart zonder CSP-fout, admin, RLS-isolatie tussen kantoren, Radix-
  primitives; contentgeneratie alleen met `E2E_GENERATE=1` (kost geld).
- **`npm run dod:screens`**: huisstijlcheck (geen VestaAI-groen of -naam),
  screenshots op drie breedtes, axe, linkcheck en toetsenbordronde.
- **`npm run demo:repetitie`**: loopt de zes demoscènes automatisch af.
- **Huisstijl-hook**: waarschuwt bij elke bewerking in de ingelogde omgeving.
- **Meetscripts**: Lighthouse (ingelogd, mediaan), paginasnelheid, RPC-timings
  — resultaten in `docs/metingen/`. Mobiel na de performanceronde: dashboard 91,
  concurrentie 87, woningen 92, marktanalyse 80, dossier 76.
- Scripts en hun gebruik: `scripts/README.md`.

## 13. Infrastructuur

Vercel (Hobby-plan, functies in Frankfurt naast de database), Supabase (gratis
plan, eu-central-1), Resend (vestaai.nl), Plausible, domein
`www.vestaai.nl`. Back-ups: lokaal via `scripts/backup-data.mjs` (map
`backups/`, niet in git) — alle 9 bedrijfstabellen, Storage (alle buckets, uit
te zetten met `--zonder-storage`) en een `manifest.json` met aantallen;
herstelprocedure in `docs/werkwijze.md` § 5 (accounts in `auth.users` zitten
er níet in). Schemabaseline `supabase/schema-baseline.sql` ververst op 1 okt.
`npm audit`: 0 kwetsbaarheden (ook in de dev-tooling).

## 14. Bewust níet gebouwd

- ❌ **Verhuur** — uit de app (16-17 sep). Niet terugzetten zonder besluit
  (i4housing doet aantoonbaar verhuur, zie besluitenlogboek).
- ❌ **Regiolaag op de verkoopkaart** — alleen eigen verkopen. Regionale data
  voedt wél waardering, marktanalyse en de referentiekaart in het dossier.
- ❌ **Content-kalender, foto-verbetering, object-chatbot** — verwijderd 15 sep.
- ❌ **Zelf aanmelden, prijzen, abonnementen, kantoor-admin-rol.**
- ❌ **Regressie voor kenmerk-effecten** — vergelijkbare paren blijft.
- ❌ **Koperskant** (kopersdatabase, zoekprofielen, bezichtigingen, leads).
- ❌ **Live koppelingen** (Realworks-API, Funda-publicatie, auto-posten) —
  kopiëren/plakken of bestandsimport.
- ❌ **Facturatie/boekhouding, AI-inbox, bezichtigingsplanner.**
- ❌ **Upload-UI voor grote imports** — het script is de weg.
- ❌ **Cookiebanner** — alleen functionele cookies en cookieloze Plausible.
  Opnieuw bekijken zodra er tracking of embeds bijkomen.
- ❌ **Retourbeleid, formuliertoestemming, captcha** — geen betalingen en geen
  publieke formulieren. Komt er een contactformulier: validatie, honeypot,
  rate-limit en toestemmingstekst.
- ❌ **Pitch-concept** (gewonnen/verloren, winratio) — het verkoopadvies is het
  moment; daarna zet de makelaar het dossier door.
