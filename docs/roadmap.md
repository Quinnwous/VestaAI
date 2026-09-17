# VestaAI — Roadmap (Masterplan "demo-klaar")

> Dit is het leidende plan voor de komende weken. **Begin elke sessie hier** bij
> § Stand van zaken. Volledige context, besluiten en motivatie: zie de secties
> hieronder. Werkwijze: `npm run typecheck && npm run test` groen vóór elke
> commit; feature-branch per fase → PR → merge naar `main` (Vercel-deploy).
> Opus plant (`/model opusplan`), Sonnet bouwt.

---

## 📍 Stand van zaken

- **Fase:** 1 — UI-fundament + nieuwe schil (1.1 t/m 1.8 klaar, 1.9-1.10 nog open)
- **Laatst opgeleverd:** fase 0 volledig afgerond (zie § Opgeleverd) én fase 1's
  kern: topbar herbouwd (groter logo, Verhuur weg, avatarmenu), blauwe balk
  weg, volle breedte op de meeste schermen, de woningenlijst verhuisd naar
  `/woningen` en een nieuwe startpagina op `/dashboard` (banner + kerncijfers
  + snelkoppelingen), `/account` (naam + wachtwoord), kantoorpagina
  opgeschoond. Alles op branch `feat/nieuwe-schil`, gecommit en gepusht.
- **Bewust nog niet gedaan binnen fase 1** (zie de aantekeningen bij 1.4/1.6/1.8
  hieronder voor waarom): `RecentBekeken` + tabel `gebruik_events`, het losse
  `bannerfoto`-veld in de admin, de tweekoloms intake-redesign
  (`object/new` blijft op 900px tot dan), de Tailwind→ui-primitives-slag op
  de kantoorpagina.
- **Volgende item:** eerst **1.9** (drie kleine kleurbugs +
  demo-knop-gating) en **1.10** (favicon/SEO — vroeg belangrijk, Google
  ververst traag), dan de Fase 1 "Klaar als"-criteria nalopen met
  `scripts/screenshots.mjs` (vereist `E2E_TEST_EMAIL` + een echt account) en
  de PR openen. Daarna verder met fase 2.
- **Blokkades:**
  - Verwerkersovereenkomst met i4housing (concept staat klaar:
    `docs/verwerkersovereenkomst-concept.md`) moet juridisch getoetst en
    getekend zijn vóórdat de volledige Brainbay-/Realworks-exports
    geïmporteerd worden (fase 4.8) — blokkeert fase 4, niet fase 1-3.
  - Volledige exports van Brainbay + Realworks nog niet ontvangen (toegezegd:
    week 1) — blokkeert fase 4, niet fase 1-3.
  - Voorbeeld-verkoopadvies van Quinn nog niet ontvangen (blokkeert fase 10).
  - **Twee handmatige Supabase Auth-instellingen** (niet via de MCP te zetten,
    alleen via het dashboard): self-signup uitzetten (Auth → Providers →
    Email) en "Leaked password protection" aanzetten (Auth → Policies). Beide
    blokkeren geen code-werk, maar staan nog open.
- **Open vragen:** geen.

---

## 1. Context

VestaAI is op 15 en 16 sep 2026 omgebouwd naar een fasemodel voor één klant,
i4housing (Wassenaar, NVM). De code liep voor op de documentatie, delen oogden
onaf en functies draaiden op lege data. Een onafhankelijke review en eigen
verificatie (17 sep 2026) leverden bovendien **vier structurele problemen** op
die vóór elke nieuwe functie opgelost moeten worden:

1. **Datalek-risico.** Elke ingelogde makelaar van élk kantoor mocht alle
   transacties lezen (`supabase/migrations/20260916_transacties_rls.sql:15-18`,
   bewust ingericht als "gedeelde pool"). De view `transacties_met_coordinaten`
   omzeilde RLS (geen `security_invoker`). Zodra het demo-kantoor bestaat, kan
   dat account de Brainbay-data van i4housing opvragen.
2. **Import faalt op echte bestanden.** De upsert
   `onConflict: 'kantoor_id,adres,verkoopdatum'`
   (`app/admin/transacties/actions.ts:68`) past niet op de unieke index met
   `coalesce(verkoopdatum, …)` (`20260916_transacties.sql:58-59`). Verder alleen
   CSV (geen XLSX), via een server action met een limiet van 1 MB, en geen
   geocodering (`lib/transactieImport.ts:185-187`).
3. **Analyses kappen stil af op 1.000 rijen.** `select('*')` zonder paginering
   (`marktanalyse/page.tsx:25`, `object/[id]/page.tsx:64,67`, idem concurrentie
   en kaart), terwijl Supabase standaard hooguit 1.000 rijen teruggeeft.
4. **Waardering zonder locatie en tijd.** `lib/waardering.ts` gebruikt `lat`/`lng`
   niet (alleen gedeclareerd, `:26-27`) en corrigeert niet voor de verkoopdatum.
   Een referentie in Leiden weegt even zwaar als de buurwoning, een verkoop uit
   2021 alsof hij van vandaag is.

**Waarom i4housing gaat betalen** (kwaliteitslat "€500/mnd", en ze gaan
uiteindelijk ook echt betalen): ze hebben Brainbay- en Realworks-data maar
krijgen er moeizaam inzicht uit. Ze betalen voor **een prachtig, interactief
systeem bovenop hun eigen data**, plus content die uren scheelt, in een
omgeving die voelt als hun eigen. De Brainbay-licentie is geregeld (volgens
Quinn).

**Eerlijke doorlooptijd:** ±50–60 sessies, dus **10–12 weken bij dagelijks
werken**, inclusief ruimte voor herwerk na screenshotreviews. Loopt het uit,
dan geldt de schrapvolgorde in § 8.

---

## 2. Productdoel: vier dingen die het product moet waarmaken

Dit zijn de doelen van het product, geen letterlijke demoreacties. De demo
zelf (één grote demo "als het af is", laptop/groot scherm) toont de
datafuncties in het neutrale kantoor "Demo Makelaardij" en de look-and-feel in
de i4housing-omgeving, via twee voorbereide Chrome-profielen.

| Doel | Waar het zit | Fases |
|---|---|---|
| **"Dit is óns platform"** | Inlogpagina in hun stijl, startpagina met hun teamfoto, logo en kleuren overal, teksten in hun eigen sjabloon, pdf's en e-mails in hun stijl | 1, 3, 9 |
| **"Eindelijk snappen we onze data"** | Import met kwaliteitsrapport, marktanalyse, concurrentie en verkoopkaart als interactieve verkenners, AI-marktsamenvatting | 4, 6, 7 |
| **"Hiermee winnen we opdrachten"** | Acquisitiedossier: waardering op locatie + index met referenties, wat-als, straal van 500 m, één pagina waarde-onderbouwing, pitchscorebord, (verkoopadvies) | 5, 6, 10 |
| **"Dit scheelt ons uren"** | Intake → Funda/brochure/social/e-mail in NL+EN in hun format binnen minuten (met zichtbare timer), virtual staging | 9 |

---

## 3. Besluitenlogboek

### 17 sep 2026 — fase 0 uitgevoerd: twee live beveiligingsproblemen gevonden en gefixt

Bij het uitvoeren van fase 0.1 (databasestatus via de Supabase-MCP) bleek het
risico uit het masterplan geen toekomstig risico te zijn, maar een **actief,
live probleem**:

- **Cross-tenant datalek in `transacties`.** De policy "Ingelogde makelaars
  lezen de transactiedataset" liet elke ingelogde makelaar van élk kantoor
  alle transacties van alle kantoren lezen — en de pagina's
  `marktanalyse/page.tsx`, `transacties/page.tsx` en `concurrentie/page.tsx`
  bevragen `transacties` al met de sessie-gebonden client (niet service-role).
  Dit was dus geen theoretisch risico voor zodra het demo-kantoor bestaat,
  maar een bug die vandaag al fout gaat zodra twee kantoren allebei data
  hebben.
- **RLS-omzeiling via de view.** `transacties_met_coordinaten` was aangemaakt
  als `SECURITY DEFINER` (eigenaar `postgres`), wat RLS op de onderliggende
  tabel volledig omzeilt voor wie de view bevraagt — vastgesteld met
  `grant`-informatie dat zowel `anon` als `authenticated` een SELECT-recht op
  de view hadden. Zonder de fix zou dit ook via de publieke anon-key
  (zonder inloggen) uitleesbaar zijn geweest zodra er rijen in stonden.
- **Fix:** migratie `20260916213323_rls_kantoor_isolatie_transacties.sql` —
  nieuwe policy scoped op `kantoor_id`, view herschapen met
  `security_invoker = true`, `grant select` alleen aan `authenticated`.
  Getest met een rolled-back transactie: twee test-kantoren, de policy geeft
  aantoonbaar alleen het eigen kantoor terug.
- Op hetzelfde moment ontdekt en gefixt: de import-upsert in
  `app/admin/transacties/actions.ts` gebruikte
  `onConflict: 'kantoor_id,adres,verkoopdatum'`, wat niet matchte met de
  bestaande functionele index (`coalesce(verkoopdatum, …)`) — élke import met
  een botsende rij faalde met Postgres-foutcode 42P10. Gereproduceerd en
  gefixt via migratie `20260916213816_fix_transacties_upsert_sleutel.sql`
  (`nulls not distinct`-index).
- Ook vastgesteld: `handle_new_user()` (de oude self-signup-trigger die
  automatisch een kantoor+makelaar aanmaakt) bestaat nog als functie, maar is
  **niet meer als trigger gekoppeld** aan `auth.users` — het zelf-registratie-
  risico via de database is dus kleiner dan aangenomen in het masterplan
  (self-signup op providerniveau uitzetten blijft wel een actie, zie § Stand
  van zaken, als tweede verdedigingslinie).
- Alle betrokken tabellen waren op het moment van de fix leeg (0 rijen), dus
  geen back-up nodig vóór deze specifieke actie — het back-upscript (0.2)
  is desondanks gebouwd en getest, voor elke volgende risicovolle stap.

**Les voor de rest van het plan:** DDL die buiten `apply_migration` om wordt
uitgevoerd (bijvoorbeeld via de SQL Editor) komt niet in de migratiehistorie
terecht — dit is precies hoe de 16-sep-migraties "onzichtbaar" konden blijven
terwijl hun effect allang op de database stond. Vanaf nu gaat elke
schemawijziging via `apply_migration` (zie sessie-afronden-skill).

### 16-17 sep 2026 — masterplan "demo-klaar"

| Onderwerp | Besluit |
|---|---|
| Blauwe balk | Weg |
| Verhuur | Volledig uit de app. Bewust níet doen (voorlopig) |
| Navigatie | Overzicht · Woningdossier · Marktinzichten. **Kantoor alleen in het profielmenu** (avatar met initiaal → Mijn account · Kantoor · Uitloggen) |
| Breedte | Fluïde, max 1680 px. Ontworpen voor 1280–1920 px + 1080p-scherm. Mobiel: niets breekt, geen polijstwerk |
| "Aan de slag"-blok | Weg |
| Na inloggen | Startpagina: teambanner (adminveld `bannerfoto`), begroeting + snelkoppelingen, kerncijfers, recent bekeken |
| Mijn account | Naam wijzigen, e-mail tonen, wachtwoord wijzigen |
| Kaart | **Alleen eigen verkopen, ook in het straalpaneel**. Standaardstraal per woning **500 m** (schuiver 100–1000 m) |
| Transactiedata | **Strikt per kantoor afgeschermd** (RLS). De "gedeelde referentiepool" vervalt; verkopen van andere kantoren staan toch al onder het kantoor-id van i4housing |
| Kern van het product | Waarde · markt · concurrentie op eigen Brainbay- en Realworks-data. Content is een volwaardig onderdeel |
| Exports | **Volledige** Brainbay- + Realworks-exports in week 1, na een verwerkersovereenkomst (AVG) |
| Demo | Eén grote demo; neutraal demo-kantoor voor data, i4housing-omgeving voor look-and-feel |
| Verkoopadvies | Wacht op het voorbeelddocument van Quinn |
| Ontwerp | Direct bouwen, geen mockups. Compensatie: harde ontwerpstandaard + zelfreview via screenshots |
| Database | Blijft productie. **Supabase Pro zo lang mogelijk uitstellen**, daarom eigen back-ups + vangrails (§ 4) |
| Hosting | Beide gratis. Vercel Pro vóór het eerste betaalde contract |
| Apparaten | Laptop/desktop. Keukentafel-modus → backlog |
| Idee-bundel (waardecheck-widget, ROI-dashboard, prijsadvies) | Geparkeerd |
| Werkwijze | Opus plant, Sonnet bouwt (`/model opusplan`); dagelijks een sessie |

### 16 sep 2026 — fasemodel-herstructurering

- Micro/macro-navigatie vervangen door een **fasemodel**: één woningdossier per
  adres met fases Acquisitie → In verkoop → Verkocht.
- **Eén rol per kantoor** (geen kantoor-admin meer); huisstijl, courtage en
  team zijn platform-admin-beheerd via `/admin`.
- Echte **transactiedataset** (tabel `transacties`, CSV-import via
  `/admin/transacties`) voedt waardering, marktinzichten en verkoopkaart.
- Content genereert standaard **NL + EN** tegelijk.
- Kantoor-admin-rol vervangen — niet terugzetten.
- Regressie voor kenmerk-effecten bewust vermeden — vergelijkbare-paren-methode
  blijft de standaard (zie `docs/goals.md` § Risico's).
- Koperskant expliciet buiten scope — VestaAI dient de verkoperskant.

### 15 sep 2026 — koerswijziging naar waardering

- VestaAI was een AI-contentplatform; wordt een multi-featureplatform
  (waardering + marktinzichten naast content).
- Alle prijzen/abonnementen/Stripe volledig verwijderd (niet bevroren — weg).
- Toegang puur admin-beheerd, geen self-signup, geen proefperiode.
- Content-kalender, foto-verbetering en object-chatbot volledig verwijderd.

---

## 4. Werkwijze

**Sessieritme (dagelijks)**
1. Open VestaAI als eigen VS Code-workspace. Alleen dan laden de huisstijl-hook
   in `.claude/settings.json` en de projectskills gegarandeerd.
2. `/model opusplan` → `/sessie-start`: leest § Stand van zaken, geeft de
   status in ≤8 regels, noemt blokkades en stelt vragen (AskUserQuestion) tot
   het volgende item eenduidig is.
3. Plan mode (Opus): item-spec met bestanden, hergebruik en klaar-als.
4. Uitvoering op Sonnet (automatisch via opusplan). Zelfstandige deelklussen
   gaan naar subagents (`model: sonnet`, op de achtergrond, `isolation:
   worktree` waar het parallel kan zonder overlappende bestanden).
5. `/sessie-afronden`: Definition of Done → commit/PR → stand van zaken +
   besluitenlogboek bijwerken → `/clear`.

**Definition of Done (elk item)**
- `npm run typecheck && npm run test && npm run build` groen; nieuwe
  rekenlogica als pure functie in `lib/` met een vitest-test.
- Huisstijl-hook schoon: `var(--merk*)`, "je/jouw", geen "VestaAI" achter de
  login, geen groene grijstinten.
- `scripts/screenshots.mjs` (Playwright) op 1280 en 1920 px, beoordeeld tegen
  `docs/ontwerpprincipes.md`; afwijkingen eerst zelf oplossen.
- Lege, laad- en foutstaat aanwezig; geen console-errors; op 390 px breekt
  niets.
- Elke query op `transacties` selecteert expliciete kolommen en pagineert of
  aggregeert in de database. Nooit een kale `select('*')`.
- Elke nieuwe tabel krijgt RLS per kantoor (`kantoor_id` = kantoor van
  `auth.uid()`), in een migratie in `supabase/migrations/`.
- Docs bijgewerkt (CLAUDE.md-architectuur, roadmap-status).

**Vangrails voor de productiedatabase** (zonder Supabase Pro zijn er geen
herstelbare back-ups)
- **Back-up vóór elke risicovolle stap** (migratie, import, bulk-update,
  opruimen): `scripts/backup-data.mjs` exporteert `kantoren`, `makelaars`,
  `objecten`, `transacties` en `stijl_bewerkingen` via de service-role naar
  `VestaAI/backups/<datum-tijd>/` (gitignored), en controleert daarna het
  aantal rijen. Geen back-up, geen actie.
- Scripts: dry-run als standaard, `--write` expliciet. Seed- en
  opruimscripts raken uitsluitend kantoren met `instellingen_json.demo ===
  true`, afgedwongen met een test.
- Imports krijgen een `import_id` en zijn met één knop terug te draaien.
- Migraties alleen na expliciet akkoord van Quinn, via de Supabase-MCP (Quinn
  autoriseert eenmalig via `/mcp`). De destructieve opruimmigratie
  (`20260916_opruimen_ongebruikt.sql`) blijft liggen tot er een back-up is en
  Quinn akkoord geeft.
- `scripts/controleer-schema.mjs` vergelijkt `supabase/schema-baseline.sql` +
  migraties met de database en draait in `/sessie-afronden`.
- Nieuwe code valt terug als een tabel of kolom nog ontbreekt; een deploy
  breekt nooit.
- Pauzerisico van gratis Supabase (na 7 dagen inactiviteit): bij dagelijks
  werken geen probleem; de dag voor de demo controleren.

**Git:** featurebranch per fase → PR → `main` (Vercel-productiedeploy) → live
nalopen via de Vercel-MCP (deployment READY, geen runtime-errors).

---

## 5. Ontwerpstandaard → `docs/ontwerpprincipes.md` (fase 1, leidend voor Sonnet)

**Referenties:** Stripe Dashboard (datadichtheid met rust) · Linear (snelheid,
subtiele beweging) · Claude-artifacts (verkenners die direct reageren) ·
Apple/Airbnb (alléén voor beeldmomenten).

**Regels (samengevat, volledige versie in `docs/ontwerpprincipes.md`):**
- **Layout:** fluïde, max 1680 px, 12-koloms grid, spacing in stappen van 4/8.
- **Typografie:** lettertype van het kantoor; cijfers `tabular-nums`; opmaak
  `nl-NL` (`€ 1.250.000`, `4,2%`, `12 dgn`).
- **Kleur:** alleen `--merk*` + neutraal grijs. Semantisch los van
  `--merk-accent`.
- **Beweging:** hover 150 ms; panelen 200–250 ms; getal-tweens 400 ms; geen
  bounce; `prefers-reduced-motion`.
- **Data:** elke statistiek toont n + badge "data t/m [datum]"; te weinig
  data → waarschuwing, geen schijnzeker getal; filters <100 ms; skeletons,
  nooit spinners.
- **Interactie:** elke filterstand in de URL; toetsenbord + focusring.
- **Afbeeldingen:** nooit een gebroken-afbeelding-icoon; vaste
  beeldverhoudingen.

---

## 6. Fases

Volgorde: 0 → 1 → 2 → 3 → 4 (volledige exports in week 1) → 5 → 6 → 7 → 8 → 9
→ 10 (wacht op voorbeelddocument) → 11. Fase 12 loopt parallel via een
subagent zodra fase 1 gemerged is.

### Fase 0: Veiligheid, fundament & documentatie (2 sessies)
- [x] 0.1 **Stand van de database** via de Supabase-MCP: `20260916_*`-migraties
      bleken NIET getrackt maar hun DDL WEL al toegepast (los uitgevoerd, buiten
      de migratiehistorie om — zie `supabase/schema-baseline.sql`); security
      advisors gedraaid (resultaten hieronder); **baseline-schemadump**
      geschreven naar `supabase/schema-baseline.sql`. Self-signup uitzetten en
      "leaked password protection" aanzetten kunnen niet via de MCP (alleen
      dashboard) — blijven open als handmatige actie Quinn, zie § Stand van
      zaken.
- [x] 0.2 **Back-upscript** `scripts/backup-data.mjs` + `backups/` in `.gitignore`;
      eerste back-up gedraaid en geverifieerd (rijaantallen kloppen).
- [x] 0.3 **RLS per kantoor**: bij verificatie bleek dit een live, actief
      probleem, niet alleen een risico voor de toekomst — gefixt via migratie
      `20260916213323_rls_kantoor_isolatie_transacties.sql`: nieuwe policy
      `kantoor_id = (select kantoor_id from makelaars where id = auth.uid())`,
      view `transacties_met_coordinaten` herschapen met
      `security_invoker = true`. Getest met een rolled-back transactie (twee
      test-kantoren, policy geeft alleen het eigen kantoor terug).
      `spatial_ref_sys` (PostGIS-systeemtabel) kon niet gefixt worden — eigendom
      van de extensie, "must be owner"-fout; laag risico (alleen
      SRID-referentiedata), genoteerd in de baseline.
- [x] 0.4 **Import-bug**: gereproduceerd (foutcode 42P10: de oude
      `coalesce(verkoopdatum, …)`-index matchte niet met
      `onConflict: 'kantoor_id,adres,verkoopdatum'`) en gefixt via migratie
      `20260916213816_fix_transacties_upsert_sleutel.sql` (`nulls not
      distinct`-index). Getest: herimport update i.p.v. dupliceert, ook bij
      een ontbrekende verkoopdatum.
- [x] 0.5 **Beveiliging tweede laag**: `auth.getUser()` → 401 toegevoegd aan
      `app/api/bag/route.ts`, `bag/suggest/route.ts` en `verrijking/route.ts`.
      CSP in `next.config.mjs` opgeschoond: alle Stripe-referenties eruit
      (`script-src`, `frame-src`, `connect-src` — niet alleen `api.stripe.com`).
- [x] 0.6 **Documentatie**: dit document herschreven tot masterplan;
      `CLAUDE.md` sessieprotocol/DoD/vangrails bovenaan + de
      "gedeelde-referentiepool"-tekst gecorrigeerd naar de RLS-per-kantoor-
      realiteit (was feitelijk onjuist na 0.3); `docs/goals.md` hexwaarden
      gecorrigeerd + betaalintentie toegevoegd; root-`CLAUDE.md`
      VestaAI-beschrijving geactualiseerd (Stripe/BE/"8 velden"/`VestaAI.html`
      waren allemaal verouderd).
- [x] 0.7 **Geheugen opschonen**: `vestaai-setup-status.md` en
      `vestaai-eerste-tester.md` verwijderd (achterhaald); uit
      `vestaai-huisstijl.md`/`vestaai-whitelabel-i4housing.md` bleek alleen de
      `var(--merk,#hex)`-fallback-valkuil nog niet gedocumenteerd — die is
      toegevoegd aan CLAUDE.md, de rest was al gedekt door de code/CLAUDE.md
      of achterhaald (font is inmiddels Newsreader, niet Playfair/Lora); beide
      bestanden verwijderd; `vestaai-masterplan.md` toegevoegd als pointer;
      `MEMORY.md` bijgewerkt.
- [x] 0.8 **Projectskills** `.claude/skills/sessie-start/SKILL.md` en
      `.claude/skills/sessie-afronden/SKILL.md` geschreven.
- [x] 0.9 **Concept-verwerkersovereenkomst** `docs/verwerkersovereenkomst-concept.md`
      geschreven — expliciet gemarkeerd als "niet ondertekenen zonder
      juridische toetsing".
- **Klaar als:** een ingelogd demo-account kan via de REST-API aantoonbaar géén
  transacties van een ander kantoor lezen (✅ geverifieerd met een
  rolled-back testtransactie; een volledige REST-test met twee échte accounts
  volgt in fase 11.3 zodra er meerdere kantoren met accounts bestaan); er
  staat een back-up en een baseline (✅); `/sessie-start` in een nieuwe chat
  weet zonder uitleg waar we staan (✅, dit document + de skill).

### Fase 1: UI-fundament + nieuwe schil (4 sessies, ~1 sessie nog te gaan)
- [x] 1.1 **Fundament eerst**: `docs/ontwerpprincipes.md`; `scripts/screenshots.mjs`;
      basisprimitives `AppPagina`/`StatTile`/`EmptyState`/`Skeleton`;
      `--app-breedte: 1680px` + `--app-marge`.
- [x] 1.2 **Blauwe balk weg**: `app/(app)/layout.tsx`.
- [x] 1.3 **Topbar**: lockup groter (26px-blok, 15px-tekst, 38px-kantoorlogo);
      menu's Woningdossier · Marktinzichten (Verhuur volledig verwijderd, geen
      slot/binnenkort-restant); avatar-dropdown met initiaal (Mijn account ·
      Kantoor · Uitloggen), klik-buiten/Escape/mobiel werken.
- [x] 1.4 **Volle breedte**: `AppPagina` toegepast op `/woningen`,
      `object/[id]`, `marktanalyse/layout`, `/kantoor`. **Bewust nog niet
      gedaan:** `object/new` (900px) — dat vereist eerst de tweekoloms
      intake-redesign (wizard + WoningdataPanel naast elkaar); losstaand
      breder maken zou een wizard in een leeg vlak laten zweven.
- [x] 1.5 **"Aan de slag" weg**: `components/FeatureKaarten.tsx` verwijderd,
      vervangen door `Snelkoppelingen` op de nieuwe startpagina.
- [x] 1.6 **Startpagina — kern**: lijst verhuisd naar `/woningen`
      (`WoningenClient.tsx`, `PitchScorebord.tsx`, `loading.tsx`); nieuwe
      `/dashboard` met `StartBanner` (begroeting + datum, valt terug op het
      bestaande sfeerbeeld of een merkverloop) en `Kerncijfers` (6 tegels,
      `lib/kerncijfers.ts` + 11 tests: lopende acquisities, winratio 12mnd,
      in verkoop, verkocht dit jaar, gem. looptijd, prijs t.o.v. vraagprijs —
      elk met een eerlijke waarschuwing bij te weinig data). Gedeelde
      auth/self-heal-logica geëxtraheerd naar `lib/haalIngelogdeMakelaar.tsx`
      (gebruikt door zowel `/dashboard` als `/woningen`).
      **Bewust nog niet gedaan** (vereist een nieuwe migratie resp. een door
      Quinn goedgekeurde foto — hoort niet in dezelfde sessie als de
      mechanische routingwissel):
      - `RecentBekeken` + tabel `gebruik_events` + `lib/gebruik.ts`
        (`logGebruik()`);
      - los `bannerfoto`-veld in de admin (`AfbeeldingUpload`,
        `HuisstijlForm.tsx`) — de banner gebruikt voorlopig het bestaande
        sfeerbeeld (`achtergrondUrl`).
- [x] 1.7 **Mijn account** (`/account`, nieuw): naam wijzigen, e-mail
      read-only, wachtwoord wijzigen (`wijzigWachtwoord`-action verifieert
      eerst het huidige wachtwoord via `signInWithPassword`). Zod-schema
      `WachtwoordWijzigenSchema` in `lib/schemas.ts`.
- [x] 1.8 **Kantoorpagina**: "VestaAI" 4× eruit → "je platformbeheerder";
      profielsectie en uitlogknop verwijderd (nu op `/account` resp. in het
      profielmenu). **Bewust nog niet gedaan:** Tailwind-grijs →
      ui-primitives, tweekoloms grid — dat is een visuele herontwerp-taak,
      geen bugfix, en de pagina werkt correct zoals hij nu is.
- [ ] 1.9 **Bugs**: `StatusToggle.tsx:10` kapotte class, `FaseToggle.tsx:15,81`
      en `StatistiekenPaneel.tsx:89` hardgecodeerd groen; demo-knop alleen in
      dev/demo. **Nog te doen.**
- [ ] 1.10 **Google-logo & SEO-basis**: `app/icon.png`/`favicon.ico`/`apple-icon.png`;
      manifest repareren; canonical + JSON-LD; opengraph-image; robots/sitemap
      (nu ook `/woningen`/`/account` toevoegen aan de disallow-lijst).
      **Nog te doen** — belangrijk om vroeg te doen, Google ververst favicons traag.
- **Klaar als:** geen blauwe balk en geen Verhuur ✅; avatarmenu werkt overal ✅;
  startpagina met banner/kerncijfers zonder fouten bij lege data ✅
  (recent bekeken volgt nog); `/woningen` compleet ✅; account wijzigt naam en
  wachtwoord ✅; kantoorpagina zonder "VestaAI" ✅; favicons geven 200 ❌ (1.10
  nog te doen); DoD (typecheck/test/build) groen ✅.

### Fase 2: Interactieve primitives (2 sessies)
- [ ] 2.1 `RangeSlider`/`ToggleGroup`/`Chip`/`ChartCard`/`FilterBar`/`Drawer`/`DataTable`.
- [ ] 2.2 `motion`, `lib/grafiekThema.ts`, `useFilterState`, `lib/opmaak.ts` (nl-NL).
- [ ] 2.3 Interne voorbeeldpagina `/admin/ui`.
- **Klaar als:** elke primitive staat op `/admin/ui`, toetsenbordbedienbaar,
  volgt de ontwerpprincipes, geen console-waarschuwingen.

### Fase 3: White-label-wow (1–2 sessies)
- [ ] 3.1 **Inloggen in kantoorstijl**: `/login/[kantoor-slug]`; middleware
      `/login/`-prefix doorlaten.
- [ ] 3.2 **Auth-mails in kantoorstijl** via Resend + `generateLink`.
- [ ] 3.3 **Consistentiecontrole**: tabtitel, favicon, e-mails, lege staten.
- **Klaar als:** van inloglink tot reset-mail nergens VestaAI-groen of de naam
  VestaAI (behalve de afgesproken lockup).

### Fase 4: Datapijplijn, datakwaliteit & demo-kantoor (6–8 sessies)
- [ ] 4.1 **Exportanalyse** (volledige exports, week 1): kolommen, formaten,
      datumdefinities; bevat Brainbay het verkopend kantoor?
- [ ] 4.2 **Performance-architectuur**: aggregaties in Postgres (RPC's/views),
      `ST_DWithin` voor kaart/straal, geen `select('*')` meer.
- [ ] 4.3 **Import**: XLSX/CSV via Storage-bucket + route handler in batches;
      bronprofielen Brainbay/Realworks; tabel `imports` + terugdraaiknop.
- [ ] 4.4 **Ontdubbelen**: `adres_sleutel` + verkoopdatum-venster ±90 dagen;
      unieke index en upsert definitief gelijk.
- [ ] 4.5 **Datakwaliteit**: plausibiliteitsregels → `uitgesloten_reden`;
      kwaliteitsrapport na elke import.
- [ ] 4.6 **Geocodering**: `lib/pdok.ts` + `lib/geocodering.ts`; hervatbaar via
      `geocode_status`.
- [ ] 4.7 Migratie `transacties_pijplijn` + vitest-tests.
- [ ] 4.8 **Import i4housing** (na back-up + verwerkersovereenkomst).
- [ ] 4.9 **Demo-kantoor** `scripts/seed-demo-kantoor.mjs`: ~1.500 verkopen,
      8 fictieve concurrenten, ~15 dossiers, account "Demo Makelaardij".
- **Klaar als:** volledige exports importeren; herimport geen dubbelen;
  terugdraaien werkt; ≥95% geocodering "exact"; kwaliteitsrapport klopt; geen
  ongepagineerde query; demo-kantoor vult alle verkenners plausibel.

### Fase 5: Waardering die taxateurs overtuigt (4 sessies)
- [ ] 5.1 **Locatie**: referentiekandidaten via PostGIS `ST_DWithin`.
- [ ] 5.2 **Prijsindex**: CBS-index bestaande koopwoningen, regionaal.
- [ ] 5.3 **Referenties handmatig** toevoegen/uitsluiten.
- [ ] 5.4 Kenmerk-effecten uitbreiden (energielabel, bouwperiode).
- [ ] 5.5 **Backtest op echte i4housing-data** → `docs/waardering-backtest.md`.
- [ ] 5.6 `WaardebepalingPaneel` premium (uitlegbare opbouw, wat-als).
- [ ] 5.7 **Waarde-onderbouwing, één pagina** (pdf).
- **Klaar als:** backtest gedocumenteerd; elke waarde toont n/afstand/index/
  correcties; handmatige referentie verandert de uitkomst direct; one-pager
  binnen 10s klaar.

### Fase 6: Kaart (4–5 sessies)
- [ ] 6.1 **Spike**: MapLibre + PDOK-vectortiles vs. Leaflet + PDOK-raster
      (CSP, soepelheid, bundel).
- [ ] 6.2 `components/kaart/BasisKaart.tsx` + lagen (vlaggetjes, hovercard,
      wijkgrenzen).
- [ ] 6.3 **Verkoopkaart-explorer**: periode-schuiver + afspeelknop, filters,
      zijlijst.
- [ ] 6.4 **Straal per woning**: standaard 500 m, schuiver 100–1000 m.
- [ ] 6.5 Oude kaartcode opruimen na de keuze.
- **Klaar als:** vloeiend met volledige dataset; filters/straal reageren
  direct; geen CSP-fouten.

### Fase 7: Marktinzichten & concurrentie (6–7 sessies)
- [ ] 7.1 **Marktanalyse**: FilterBar, kerncijfers met delta, crossfilter.
- [ ] 7.2 **Transacties opzoeken**: DataTable, detail-drawer, "gebruik als
      referentie", CSV-export alleen eigen verkopen.
- [ ] 7.3 **Concurrentie** (afhankelijk van 4.1): marktaandeel, vergelijker,
      matrix "wie wint waar".
- [ ] 7.4 **AI-marktsamenvatting**: knop → Claude schrijft alinea over
      filterselectie.
- **Klaar als:** kernvragen in ≤3 klikken beantwoord; filters in URL; eerlijke
  lege/weinig-data-staten.

### Fase 8: Woningdossier premium (3 sessies)
- [ ] 8.1 `/woningen`: kaart- en tabelweergave.
- [ ] 8.2 Dossierheader met fasestepper.
- [ ] 8.3 Verrijkingsdata terug in het dossier.
- [ ] 8.4 Dossiertijdlijn uit `gebruik_events`.
- [ ] 8.5 `StijlLerenPaneel` vindbaar maken.
- **Klaar als:** dossier leest als één verhaal; fase in één oogopslag
  duidelijk.

### Fase 9: Content op i4housing-niveau (5 sessies)
- [ ] 9.1 **AI-modellen centraal** (`lib/aiModellen.ts`), upgrade Sonnet,
      blinde evaluatieset.
- [ ] 9.2 **Kantoor-tekstsjabloon** (i4housing-preset: 4SALE!/WOONCOMFORT/…).
- [ ] 9.3 **Brochure-pdf** volledig in kantoorstijl.
- [ ] 9.4 **Virtual staging**: model-check/upgrade.
- [ ] 9.5 `ResultTabs` premium + generatietimer.
- **Klaar als:** blinde vergelijking gewonnen; i4housing-tekst volgt sjabloon
  1-op-1; brochure niet te onderscheiden van hun eigen werk.

### Fase 10: Verkoopadvies (2–3 sessies, geblokkeerd op voorbeeld Quinn)
Losse, herschikbare secties in `@react-pdf/renderer`, volledig in kantoorstijl.
**Klaar als:** verkoopadvies binnen 1 minuut klaar, structureel gelijk aan het
voorbeeld. Zonder voorbeeld: demo zonder dit onderdeel.

### Fase 11: Demo-klaar & productierijp (3 sessies)
- [ ] 11.1 **Foutlogging** (`global-error.tsx` + wrapper, geen `instrumentation.ts`
      op Next 14.2).
- [ ] 11.2 **Feedbackknop** + gebruiksoverzicht in `/admin`.
- [ ] 11.3 **E2e** uitbreiden (login, dossier, waardering, kaart, content,
      admin-import, RLS-test).
- [ ] 11.4 **Performance**: Lighthouse, bundelanalyse.
- [ ] 11.5 **Demo-voorbereiding**: `docs/demoscript.md`, generale repetitie,
      demo-freeze.
- **Klaar als:** alle klaar-als-criteria gehaald; generale repetitie zonder
  haperingen; alle checks groen.

### Fase 12: Publieke site (parallel, subagent, 2–3 sessies; niet kritiek pad)
Start pas als fase 1 gemerged is (voorkomt mergeconflict in `app/layout.tsx`).
- [ ] 12.1 Verouderde copy eruit (`over-ons`, `privacy`, metadata/OG).
- [ ] 12.2 `LandingPageClient.tsx` herpositioneren naar het nieuwe verhaal.
- **Klaar als:** geen claim in strijd met het huidige model; Lighthouse >90/95.

---

## 7. Risico's

| Risico | Mitigatie |
|---|---|
| Dataverlies op productie zonder Pro | Back-up vóór elke risicovolle stap, imports terug te draaien |
| Datalek tussen kantoren / licentie | RLS per kantoor + `security_invoker` in fase 0, test met twee accounts |
| Exports groter of rommeliger dan gedacht | Volledige exports in week 1, database-aggregatie, kwaliteitsregels |
| Brainbay zonder verkopend kantoor | Vroeg vaststellen (4.1); concurrentie met eerlijke lege staat |
| Taxateurs vertrouwen de waardering niet | Locatie + index, transparante opbouw, backtest op echte data |
| Grote demo zonder tussentijdse feedback | Scherpe klaar-als-criteria, screenshotreviews, generale repetitie |
| Nieuw AI-model verandert de toon | Blinde evaluatieset (9.1) |
| Kaarttechniek botst met CSP/performance | Spike test CSP eerst; Leaflet-rasteralternatief |
| Supabase pauzeert vlak voor de demo | Dagelijks gebruik + check de dag ervoor |
| Uitloop (10–12 weken) | Schrapvolgorde § 8; nieuwe ideeën → backlog |

## 8. Blokkades & acties Quinn

1. **Vandaag:** Supabase-MCP autoriseren via `/mcp`.
2. **Week 1:** verwerkersovereenkomst met i4housing → volledige Brainbay- en
   Realworks-exports.
3. Teamfoto i4housing goedkeuren (fase 1).
4. Search Console + omleiding Vercel-alias (na 1.10).
5. Blind oordeel in de evaluatieset (fase 9).
6. Voorbeeld-verkoopadvies (vóór fase 10).
7. Akkoord op de opruimmigratie (na back-up).
8. Vóór het eerste contract: Vercel Pro, Supabase Pro, definitieve
   verwerkersovereenkomst.

## 9. Schrapvolgorde bij uitloop, backlog & geparkeerd

**Schrapvolgorde** (eerst geschrapt bovenaan): fase 12 publieke site → na de
demo · dossiertijdlijn (8.4) · afspeelknop op de kaart · AI-marktsamenvatting
(7.4) · kantoor-tegen-kantoor-vergelijker (7.3, matrix blijft) · auth-mails in
kantoorstijl (3.2).

**Backlog na de demo:** A/B-segmentvergelijking · keukentafel-/
presentatiemodus · kwartaalcijfers-generator · maatwerkverzoeken-flow (zie
hieronder) · ⌘K zoeken · Next 15-upgrade · jaarlijkse CBS-jaargang bijwerken
(`lib/verrijking.ts`, tabel `85984NED`) · Supabase-mailonderwerpen
vernederlandsen · kaart eigen marker-icoon i.p.v. cirkel.

**Maatwerkverzoeken-flow** (uit oude roadmap, nog niet gebouwd, bewust
"Binnenkort"): i4housing vraagt binnen de app handwerk aan (artist impression,
bewerkte staging-foto); Quinn ziet het in `/admin`, werkt het extern uit,
resultaat komt terug in het dossier. Nog te ontwerpen: tabel `verzoeken`
(kantoor_id, object_id optioneel, type, toelichting, bijlage-url, status,
resultaat-url), statusflow (open → in behandeling → klaar), Resend-melding bij
afronding.

**Periodieke actie (geen bouwwerk):** Realworks-/Brainbay-herimport is met het
bestaande importscherm te herhalen (upsert-gebaseerd) — een terugkerende
actie voor Quinn, geen nieuwe feature.

**Geparkeerd (niet aansprekend voor Quinn, 16 sep):** waardecheck-widget op
hun site · ROI-dashboard · prijsadvies bij lange looptijd.

---

## Bewust níet doen

- ❌ **Verhuur** — volledig uit de app gehaald (masterplan 16-17 sep 2026).
  Niet terugzetten zonder besluit.
- ❌ **Regiolaag op de verkoopkaart** — alleen eigen verkopen, ook in het
  straalpaneel (bevestigd 16-17 sep 2026). Regionale data voedt wél waardering
  en marktanalyse.
- ❌ **Content-kalender, foto-verbetering en object-chatbot** — op 15 sep 2026
  volledig verwijderd. Niet opnieuw bouwen zonder expliciet besluit van Quinn.
- ❌ **Zelf aanmelden / publiek geprijsde site / abonnementen** — bewust
  geschrapt 15 sep. Nieuwe kantoren, accounts én teamleden altijd via `/admin`.
  Niet terugzetten zonder besluit.
- ❌ **Kantoor-admin-rol** — op 16 sep 2026 vervangen door één rol per kantoor.
  Niet terugzetten.
- ❌ **Regressie voor kenmerk-effecten** — bewust gekozen voor
  vergelijkbare-paren i.p.v. regressie (zie `docs/goals.md` § Risico's: een
  regressie op deze schaal suggereert een schijnzekerheid die de data niet
  waarmaakt).
- ❌ Koperskant: geen kopersdatabase, zoekprofielen, bezichtigingsplanning of
  leadopvolging (besluit 16 sep 2026 — VestaAI dient de verkoperskant, niet de
  koperskant).
- ❌ Externe live koppelingen: geen live Realworks-API, geen
  Funda-publicatie, geen automatisch posten op social, geen
  WordPress-koppeling. Alles via kopiëren/plakken of een bestandsimport totdat
  er een expliciet besluit valt over een echte API-koppeling.
- ❌ Facturatie en boekhouding — courtage wordt berekend en getoond, er komen
  geen facturen.
- ❌ Geen AI-inbox (e-mail/WhatsApp) — kernproduct HousApp, jaar voorsprong +
  funding.
- ❌ Geen bezichtigingsplanner.

---

## Permanente kwaliteit

- `npm run typecheck` + `npm run test` altijd groen vóór elke commit.
- Lighthouse landing: >90 performance, >95 accessibility.
- Elk nieuw scherm mobile-responsive checken (niets breekt op 390 px).
- Elke query op `transacties` gepagineerd of geaggregeerd, nooit een kale
  `select('*')`.
- Elke nieuwe tabel met persoonsgegevens/transactiedata krijgt RLS per
  kantoor.

---

## Opgeleverd

- 16 sep 2026 — masterplan "demo-klaar" opgesteld en vastgelegd in
  `docs/roadmap.md`, verwijzing toegevoegd bovenaan `CLAUDE.md` (PR #15).
- 17 sep 2026 — fase 0 (0.1 t/m 0.9) volledig doorlopen: RLS-datalek in
  `transacties` + SECURITY DEFINER-view gefixt, kapotte import-upsert gefixt,
  auth-check toegevoegd aan 3 API-routes, CSP opgeschoond (Stripe eruit),
  back-upscript gebouwd en getest, baseline-schemadump geschreven,
  documentatie (CLAUDE.md/goals.md/root-CLAUDE.md) geactualiseerd, geheugen
  opgeschoond, sessieskills (`sessie-start`/`sessie-afronden`) en de
  concept-verwerkersovereenkomst geschreven. `typecheck`/`test`/`build` groen.
- 17 sep 2026 — fase 1.1 t/m 1.8: `docs/ontwerpprincipes.md`,
  `scripts/screenshots.mjs`, ui-primitives (`AppPagina`/`StatTile`/
  `EmptyState`/`Skeleton`); topbar herbouwd (groter logo, Verhuur weg,
  avatarmenu); blauwe contactbalk weg; volle breedte op `/woningen`,
  `object/[id]`, marktanalyse, `/kantoor`; "Aan de slag"-blok weg; lijst
  verhuisd naar `/woningen`, nieuwe startpagina op `/dashboard` (banner +
  kerncijfers, `lib/kerncijfers.ts` + 11 tests) met gedeelde auth-helper
  `lib/haalIngelogdeMakelaar.tsx`; nieuwe `/account`-pagina (naam + wachtwoord);
  kantoorpagina opgeschoond ("VestaAI" eruit, profiel/uitloggen verhuisd).
  `typecheck`/`test` (114 tests)/`build` groen.
