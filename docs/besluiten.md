# VestaAI — Besluitenlogboek & opleverlog

> Logboek, geen werklijst. Het plan zelf staat in `docs/roadmap.md`. Nieuwe
> besluiten komen hier bovenaan (nieuwste eerst); `/sessie-afronden` voegt ze
> toe. `/sessie-start` leest alleen de bovenste datum-sectie.

---

### 30 sep 2026 — website-checklist van Quinn gefilterd → fase 14

Twee generieke "laat je vibe-coded site niet aanklagen"-lijsten (±30 punten,
deels dubbel, deels voor webshops) nagelopen tegen de code.

| Onderwerp | Besluit | Door |
|---|---|---|
| Staat al (geverifieerd) | Privacy- en voorwaardenpagina, HTTPS + HSTS-preload + CSP (`next.config.mjs`), alleen publieke sleutels in de frontend (`NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY`, `_APP_URL`), metatitels + OG/Twitter-afbeelding, favicon/apple-icon/manifest, `sitemap.ts` + `robots.ts` (app-routes uitgesloten), eigen 404 + foutpagina's, alt-tekst op alle 9 `<img>` (decoratief = `alt=""`), afbeeldingen/snelheid/mobiel (fase 12, Lighthouse), analytics (Plausible), één duidelijke CTA (13.2), skip-link. Geen nep-reviews of testimonials gevonden | Opus |
| Niet van toepassing | Cookiebanner en losse cookiepagina (alleen functionele cookies + cookieloze Plausible), retourbeleid (geen betalingen), formulier-toestemming/-validatie/spamfilter (geen publieke formulieren), third-party embeds (geen; alleen PDOK-tegels en Plausible). Vastgelegd in roadmap § 10 met het moment waarop het wél nodig wordt | Opus |
| Gevonden → fase 14 | Voorwaarden noemen VestaAI "verwerkingsverantwoordelijke" (moet: verwerker voor kantoordata); onwaarmaakbare beloftes (99,5 % uptime, "volledig AVG-proof"); geen doorgifte buiten de EER in de privacyverklaring; Plausible draait ook achter de login terwijl de verklaring "publieke pagina's" zegt; geen KvK/adres/zakelijk mailadres op de site; gestagede foto's ongelabeld (AI Act art. 50 lid 4); tekst op i4-blauw 4,3 : 1 (< AA); geen automatische a11y-check | Opus |
| Voor Quinn | § 8 punten 17-19: bedrijfsgegevens, Gemini betaalde laag, beeldrechten i4; juridische toets door een jurist bij punt 16 | Opus |
 — performance mobiel ronde 2, opschoning roadmap, kantoor-admin-achterdeur (PR #48, #49)

| Onderwerp | Besluit | Door |
|---|---|---|
| Diagnose | Nulmeting productie (ingelogd, mobiel, mediaan van 3): dashboard 87, marktanalyse 64, concurrentie 51, woningen 82, dossier 58; landing 86, kantoorlogin 82. Het LCP-element is overal de h1 uit de server-HTML; 87 % van de LCP is **render delay** (de LCP valt na hydratie, dus rekent Lighthouse de volledige JS-download op traag 4G mee). Minder JS in de eerste lading is de hefboom, niet de server | Opus |
| Recharts lazy (P1) | Grafieken naar `components/grafieken/` (enige recharts-importeurs), `next/dynamic` met skelet van exact dezelfde hoogte; `KwartaalberichtModal` ook lazy | Sonnet |
| Kaartlagen + dossier (P2) | `react-dom/server` via `await import()` in de kaartlagen (59 kB weg van woningen/transacties/kaart); `ObjectWorkspace` mount secties en content-subtabs pas bij het eerste bezoek en houdt ze daarna gemount (bewerkingen blijven staan); Media/Documenten/Export-componenten via `next/dynamic` | Sonnet |
| Layout | Kantoorfonts (Gantari, Nunito) zonder preload — een kantoor gebruikt er één, preload haalde alle 5 fontbestanden (217 kB) op élke pagina; Plausible `lazyOnload` (was een lange taak van ~0,5 s midden in de hydratie); `"sideEffects": ["*.css"]` + directe ui-imports in de layout-boom | Opus |
| Resultaat bundel | Initieel gzip (webpack-analyse): marktanalyse 209 → 77 kB, concurrentie 197 → 65, woningen 132 → 69, transacties 161 → 91, kaart 159 → 76, layout 66 → 37, dossier 121 → 120 (winst daar: minder hydratie/fetches) | Opus |
| Kwaliteit bewaakt | Vraag Quinn: "gaat dit ten koste van de kwaliteit?" — Nee: niets weggehaald, alleen laadvolgorde. A/B met productiebuilds van deze branch en `main` (mediaan van 4): inhoud zichtbaar even snel op alle vier pagina's (verschil ≤ 60 ms); networkidle dossier In verkoop 2,4 → 1,3 s. Merkbaar voor een gebruiker: grafiek verschijnt met een skelet ervoor, Media/Documenten/Export laden bij de eerste klik, kantoorfont kan bij het allereerste bezoek heel kort in de terugvalletter staan, Plausible telt een bezoek < 1 s mogelijk niet | Quinn + Opus |
| Repetitie-waarschuwingen | De 3 "traag > 3 s"-waarschuwingen in scène 4 bestonden al op `main` (gemeten): ze meten tot networkidle incl. kaarttegels, niet wat de gebruiker ziet | Opus |
| Nameting (live) | Productie na PR #48, mobiel, mediaan van 3: dashboard 87 → 91, marktanalyse 64 → 80, concurrentie 51 → 87, woningen 82 → 92, dossier 58 → 76, landing 86 → 90, kantoorlogin 82 → 85. Deploy READY, 0 runtime-errors | Opus |
| Genoeg is genoeg | Quinn: "de score is op dit moment prima" — geen performance-ronde 3; marktanalyse (80) en dossier (76) blijven onder 85, reden gedocumenteerd in 12.6 | Quinn |
| Vercel-geheimen | Akkoord Quinn om de 6 ongebruikte geheimen te verwijderen, maar Claude kan het niet: de Vercel-MCP heeft geen verwijder-actie en de CLI is niet ingelogd. Blijft handwerk voor Quinn (§ 8 punt 10, met stappen) | Quinn |
| Meetscript | `scripts/meet-lighthouse.mjs` (ingelogd via sessiecookie, `--anoniem` voor publiek, mediaan van n runs, `--label` → `docs/data/lighthouse-<label>.json`). Productie is `www.vestaai.nl` (kale domein stuurt door) | Opus |
| Browsertabbladen | `@next/bundle-analyzer` opende bij elke analyse-build 3 tabbladen bij Quinn → `openAnalyzer: false` | Quinn + Opus |
| Kantoor-admin-achterdeur | Policy "admin mag kantoor bijwerken" liet de ene makelaar met `role = 'admin'` zijn kantoorrij (huisstijl, instellingen, naam) via REST wijzigen — in strijd met "platform-admin-beheerd". De app schrijft nergens met de sessie-client naar `kantoren`. Policy + `is_kantoor_admin()` weg (`20260929230000_kantoor_admin_rest_weg.sql`, toegepast; raakt geen data; rooktest productie groen) | Opus |
| Checks | Security-advisor: alleen bekende/bewuste meldingen + leaked-password (open, § 8). `npm audit` productie 0. Schema-check groen. Vercel: 0 runtime-errors (24 u); `PLATFORM_ADMIN_EMAILS` staat lokaal én op Vercel niet (gelijk). Gevonden: 6 ongebruikte geheimen op Vercel (5× `STRIPE_*`, `CRON_SECRET`) → § 8, verwijderen na akkoord | Opus |
| Opschoning docs | Roadmap: fases 1 en 6 ingeklapt, Stand van zaken herschreven, § 8 geverifieerd en geordend (blokkerend / klein / later), § 9 opgeschoond. CLAUDE.md: datamodel `objecten` klopte niet (`pitch_uitslag` bestaat niet meer), `content_keuzes`-regel en migratiestatus bijgewerkt. Verouderde "nog niet toegepast"-commentaren in 6 bestanden rechtgezet. Opgeruimd: een gemergde, vergeten worktree van 28 sep (H4) | Opus |

### 29 sep 2026 (zestiende ronde) — Next.js 16 + React 19 live (PR #46), meting

| Onderwerp | Besluit | Door |
|---|---|---|
| Next 16 live | 14.2 → 16.3.6 / React 19.3 via de officiële codemods (Sonnet), nagelopen en gemerged door Opus. Runtime-checks in de hoofdsessie: `dod:screens` 33/33, `demo:repetitie` groen, e2e 10/10; geen runtime-errors op productie | Sonnet + Opus |
| Valse foutstaten | Na de upgrade meldden `dod:screens`/repetitie 38 "foutstaten": Next 15+ zet `<nextjs-portal>` (dev-tools-knop) altijd neer en `toontFoutstaat()` telde dat als fout. Nu alleen een foutdialoog of issue-telling; tegenproef met een echte fout gedaan | Opus |
| Kwetsbaarheden | Productie 8 → 0: `@xmldom/xmldom` 0.8.15 (via `mammoth`) en `baseline-browser-mapping` via `overrides`, ongebruikte `@types/react-pdf` weg (trok `pdfjs-dist` ≤ 4.1 mee). `npm audit fix` crasht op het URL-geïnstalleerde `xlsx` — gericht met overrides | Opus |
| Meting servertijd | TTFB na Next 16 (fra1): Overzicht 286, Woningen 208, Dossier 194, Marktanalyse 179, Transacties 228, Concurrentie 180 ms; volledige pagina 0,28–0,57 s. T.o.v. alleen fra1 nog 5–15 % winst op de volledige pagina; t.o.v. vanochtend (iad1) ~3× sneller. `docs/data/paginasnelheid-na-next16.json` | Opus |
| Meting Lighthouse mobiel | Ingelogd op productie, 3 runs (deze machine is ruisgevoelig — TBT varieerde 140–1.135 ms): dossier 50/66/73 (LCP ~5,2 s), dashboard 82/89/93, marktanalyse 65–68 (LCP ~5,4 s). **Next 16 bracht mobiel niet naar 85**: de rem is het client-JavaScript en de LCP op gesimuleerd traag 4G, niet de server. Vervolg (voorstel, niet gestart): gerichte ronde per pagina met de bundle-analyzer — grafieken en kaart pas laden als ze in beeld komen, minder hydratie boven de vouw | Opus |
| Lint | 31 meldingen van `eslint-plugin-react-hooks` v7 op bestaande componenten; niet in de DoD, bewust niet meegenomen in de upgrade | Opus |

### 29 sep 2026 (vijftiende ronde) — serverfuncties naar Frankfurt, kantoorprofiel i4, Next 16 gestart

| Onderwerp | Besluit | Door |
|---|---|---|
| Functieregio | Database in `eu-central-1` (Frankfurt), functies draaiden in `iad1` (Washington, Vercel-standaard, nooit bewust gekozen) → elke databasevraag twee keer over de oceaan. `vercel.json` `regions: ["fra1"]` (PR #45). Gemeten met `scripts/meet-paginasnelheid.mjs` (ingelogd, productie, mediaan van 8): TTFB Overzicht 737 → 321 ms, Woningen 592 → 217, Dossier 584 → 218, Marktanalyse 538 → 184, Transacties 519 → 213, Concurrentie 494 → 186, Zoeken 704 → 191 ms (−56 tot −73 %); volledige pagina 1,0–1,8 s → 0,3–0,6 s. JSON in `docs/data/paginasnelheid-{voor-iad1,na-fra1}.json` | Quinn + Opus |
| Kantoorprofiel i4 | Tekst op basis van i4housing.nl (je-vorm, zoals hun site), lidmaatschap NVM, opgericht leeg (niet op de site). Geen zin over wie het kantoor leidt (Quinn: niet nodig; Ton van Soest leidt het niet meer). Namen in de teamlijst bevestigd, o.a. Nicole van Dijk | Quinn + Opus |
| Team-accounts | Zes makelaars vastgelegd in `docs/i4housing-team.md`, nog niet aangemaakt. Let op: `addMakelaarAccount` mailt de persoon direct; advies: aanmaken zonder mail | Quinn |
| Next 16 | Upgrade 14.2 → 16 (React 19) in stappen via de officiële gidsen, spec `docs/specs/l1-next16-upgrade.md`. Waarom niet vanaf het begin: het project startte op de versie die het model het best kende; bij een nieuw project expliciet de nieuwste stabiele versies en de regio naast de database kiezen | Quinn + Opus |

### 29 sep 2026 (dertiende en veertiende ronde) — plaatsnormalisatie, courtage per dossier, verkoopadvies-datalaag (PR #43, #44)

| Onderwerp | Besluit | Door |
|---|---|---|
| Canonieke plaatsnaam | In de database de spreektaal: "Den Haag" (niet "'s-Gravenhage"). `canoniekePlaats()` bij het schrijven (import); HOOFDLETTER- of kleine-letterinvoer wordt opnieuw geformatteerd ("WASSENAAR" → "Wassenaar", "ijmuiden" → "IJmuiden"), gemengde invoer blijft staan. Werkgebied gaat door dezelfde functie vóór de standaardfilters. De hoofdlettergevallen vond Opus in review — anders had een export in hoofdletters het werkgebied alsnog gemist | Sonnet + Opus |
| Demo-kantoor omgezet | 3.182 synthetische transacties + werkgebied "'s-Gravenhage" → "Den Haag", ná de deploy van de code (anders liep oude code op nieuwe data), na back-up `backups/2026-09-29T07-25-17-919Z/`. Generale repetitie daarna groen | Opus |
| Courtage per dossier | Nieuw dossier start op `instellingen_json.courtage.percentage`, label "excl./incl. btw" (`courtage.btw`, ontbreekt = exclusief), per woning aanpasbaar; leeg veld gaf `NaN` → validatiefout (gefixt). `PropertyForm` wordt alleen voor nieuwe dossiers gebruikt, dus geen risico dat een bestaande waarde overschreven wordt | Sonnet |
| Verkoopadvies-datalaag | Het fase-11-contract gebouwd zonder UI/pdf (die wachten op het voorbeeld): `bouwVerkoopadviesInput()`, `haalVerkoopadviesInput()` (sessie-client, marktcontext 24 mnd verankerd aan de laatste verkoopdatum, best-effort), `verkoopadviesGereedheid()` (7 onderdelen: ok/zwak/ontbreekt). Filter op subtypes van de typegroep — `TransactieFilter` kent geen `typegroepen` | Sonnet |
| Locatie benaderd | `geocode_status = 'benaderd'` zichtbaar in Transacties opzoeken: tekstregel onder de minikaart, klein pin-icoon met tooltip in de tabel (geen extra kolom) | Sonnet |
| `parseTransactieCsv` weg | Geen aanroeper meer sinds ronde I; `TransactieInsert` ook. `lib/transactieImport.ts` is nu een bibliotheek met parse-helpers | Sonnet |
| Werk van een andere sessie | Platformschema i4 Housing (html + pdf) en de `CLAUDE.md`-regel over `gemini-2.5-flash-image` meegecommit op verzoek van Quinn, na controle op geheimen | Quinn |

### 28 sep 2026 (twaalfde ronde) — admin-CSV via de pijplijn, kantoor-aliassen, i4-instellingen (PR #42)

| Onderwerp | Besluit | Door |
|---|---|---|
| Kantoor-aliassen | Invoerveld in `/admin/kantoor/[id]` → Instellingen, één naam per regel, live genormaliseerde vorm, suggestie "Kantoornaam toevoegen"; `schoonAliassen()` ontdubbelt op de norm, max 20. Voor i4 pas invullen als de export laat zien hoe ze daarin heten | Sonnet + Opus |
| Admin-CSV via de importpijplijn | Zelfde kwaliteitsregels, `uitgesloten_reden`, ontdubbelen en rapport als het script (profiel `handmatig`); een expliciete `eigen_verkoop`-kolom wint van de aliassen. Eén snapshot-bouwer (`bouwSnapshot` in `lib/importPijplijn.ts`) | Sonnet |
| Herimport wist geen geocodering | Lege `geo`/`geocode_status`/`wijk`/`buurt` werden als null geüpsert (supabase-js vult ontbrekende sleutels in een batch aan met null) → elke herimport zonder coördinaten wiste de geocodering. Nu `maakUpsertBatches()`: lege aanvulbare kolommen weg, upsert per kolomset. Gevonden in review | Opus |
| Instellingen samenvoegen | `slaKantoorInstellingenOp` verving `instellingen_json` volledig → opslaan wiste `demo: true`. Nu `voegInstellingenSamen()`: alleen formuliervelden overschrijven. Demo-vlag in productie gecontroleerd: intact | Opus |
| i4 Housing-instellingen | Werkgebied: **Wassenaar** (primair), **Den Haag**. Courtage: standaard **1 % excl. btw**, per dossier aanpasbaar (intakeveld `courtagevoorstel_percentage`). Via SQL gezet (was leeg) | Quinn |
| Plaatsnaam Den Haag | BAG/PDOK/Brainbay schrijven "'s-Gravenhage": zonder normalisatie mist de werkgebiedfilter alle Haagse verkopen → item J1 | Opus |
| Verwerkersovereenkomst | Uitgesteld tot het platform in gebruik is. Kanttekening vastgelegd: de import van hun Realworks-data is formeel al verwerking (AVG) | Quinn |
| Vercel Pro | Nog even niet | Quinn |

### 28 sep 2026 (elfde ronde) — datavoorbereiding fase 5, verkopersversie pdf, hardening (PR #41)

| Onderwerp | Besluit | Door |
|---|---|---|
| Koers | Na de statusvraag: geen verdere polish, maar fase 5 voorbereiden op alles wat níet van het exportformaat afhangt — dan kost de import bij binnenkomst dagen i.p.v. weken | Quinn + Opus |
| 5.2 Importkern | `lib/rd.ts` (RD → WGS84, getest op Amersfoort en Rotterdam), `kantoorNormalisatie` (zonder spaties in de norm: "i4 Housing" = "I4housing"), `transactieKwaliteit` (roadmapgrenzen), `ontdubbelen` (Realworks wint, ± 90 dagen), `importProfielen` (aliassen **voorlopig**), `importPijplijn`, `scripts/import-transacties.mjs` (CSV + XLSX, dry-run standaard, weigert `--write` zonder back-up van vandaag) | Sonnet |
| `xlsx` | Officiële SheetJS-release (cdn.sheetjs.com, 0.20.3) i.p.v. npm 0.18.5 (verouderd, bekende kwetsbaarheden). In ESM heeft SheetJS geen fs-toegang: bestand zelf inlezen en `XLSX.read(buffer)` | Opus |
| 5.3 Geocodering | `lib/geocodering.ts` + script; mislukte call ≠ geen treffer (status blijft null → volgende run opnieuw). Toevoeging niet in de PDOK-query: "12 A" is in de BAG een huisletter, met `huisnummertoevoeging:A` vond PDOK niets (live getest); `kiesBesteTreffer()` kiest de variant | Sonnet + Opus |
| 5.4 Importhistorie + terugdraaien | Alleen de laatste import per kantoor; status `klaar` én `mislukt` (juist dan nodig). Snapshot in dezelfde insert als de `imports`-rij, vóór de eerste upsert (contract `lib/importSnapshot.ts`). `.in()`-lookups in stukken van 200 (PostgREST-URL-limiet) | Sonnet + Opus |
| Handout presentatiemodus | Geen apart document: de waardebepaling-pdf is al het achterlaatdocument. Variant `&voor=verkoper` — zonder makelaar-interne waarschuwingen, met kantoorcontact in de voettekst; split-knop in het paneel, knop op de laatste presentatiestap | Opus + Sonnet |
| Mobiel dossier | Split-knop gaf 71 px horizontale scroll; knoppenrij wrapt nu | Opus |
| Hardening-migratie | Toegepast na back-up (akkoord 24 sep); geverifieerd: geen trigger op `auth.users`, `anon` heeft geen EXECUTE meer. De permissieregel voor `apply_migration` stond al | Opus |
| Auth-schakelaars | Niet te doen vanuit de sessie: de MCP heeft geen Auth-configtool, zoeken naar een beheertoken werd door de classifier geblokkeerd (terecht), Claude in Chrome niet verbonden → Quinn | — |
| Website i4 | `huisstijl_json.website` gericht gezet (alleen dat veld; het reparatiescript zou de hele huisstijl en assets opnieuw schrijven) | Opus |
| Worktrees vanaf `main` | Agent-worktrees vertakken van `origin/main`, niet van de featurebranch: specs en gedeelde contracten die alleen op de featurebranch staan, zien agents niet. Geef het absolute pad naar de spec in de hoofdmap, of merge eerst naar main | Opus |

### 28 sep 2026 (tiende ronde) — G1 websiteveld in de huisstijl

| Onderwerp | Besluit | Door |
|---|---|---|
| Website in de huisstijl | `huisstijl_json.website`, geen vormvalidatie in het schema (een rare waarde mag de hele opslag niet laten falen); `websiteWeergave()` normaliseert voor weergave (`https://www.i4housing.nl/` → `i4housing.nl`) en geeft `null` bij ongeldige invoer → element verdwijnt. Getoond op de brochure-slotpagina en in de presentatie-contactregel (telefoon → e-mail → website). Waardebepaling-pdf niet: die toont geen kantoorcontact. Geen migratie (jsonb) | Sonnet + Opus |
| Invoerveld | `type="text" inputMode="url"`, niet `type="url"`: de native formuliervalidatie blokkeerde `www.kantoor.nl` zonder protocol — precies wat de placeholder voorstelt (gevonden in review) | Opus |
| Volgende kandidaten | A/B-segmentvergelijking niet naar transacties/concurrentie kopiëren; handout van de presentatiemodus eerst | Opus |

### 28 sep 2026 (negende ronde) — segmentvergelijking A vs. B, presentatie-polish

| Onderwerp | Besluit | Door |
|---|---|---|
| Segmentvergelijking | Zodra segment B aan staat: kaart "Segment A vs. segment B" onder de kerncijfers (mediaan prijs, €/m², looptijd, t.o.v. vraagprijs, aantal), n per segment in de kop, verschil neutraal (▲/▼, geen groen/rood). Drempel `MIN_N_BETROUWBAAR = 6` nu gedeeld in `lib/marktanalyse.ts`. Eigen component i.p.v. `DumbbellStat` (die kleurt wij/markt en semantisch). B-samenvatting met eigen `.catch` → A blijft werken | Sonnet + Opus |
| Schakelaar segment B | Kiest automatisch een plaats buiten A; zitten alle plaatsen al in A, dan blijft B op "Kies een plaats…" (gezien bij het demo-kantoor, correct gedrag) | Opus |
| Presentatiemodus | Stap 1 zonder foto toont het kantoorlogo; contactregel en logo-keuze gedeeld (`kantoorContactregel`, `logoWeergave`). Website ontbreekt in het datamodel → item G1 (spec in `docs/specs/`) | Sonnet |
| Agent-opdrachten | Lange prompts laten de auto-mode-classifier time-outen (agent start niet). Spec als bestand, prompt van één regel (CLAUDE.md) | Opus |
| Automatisering rondes | Headless lus (`claude -p` per ronde) besproken; Quinn: handmatig blijven doen | Quinn |

### 28 sep 2026 (achtste ronde, autonoom) — presentatiemodus, .env.example, RLS-bevinding

| Onderwerp | Besluit | Door |
|---|---|---|
| Presentatiemodus ("keukentafel") | Uit de backlog gehaald (besluit 16 sep: "keukentafel-modus → backlog"). Route `/object/[id]/presentatie`, podium over de hele viewport, stappen woning → waarde → kaart → top-6 → WOZ → toelichting (stappen zonder data vallen weg), ←/→/spatie, Esc/×, Fullscreen API. Leest de opgeslagen `waardering_json` via `migreerWaarderingJson()` — zelfde bron en top-6 als de pdf, niets herberekend. Knop "Presenteren" naast de pdf-knop | Sonnet + Opus |
| Waarschuwingen voor de verkoper | `verkoperWaarschuwingen()`: alleen "weinig data"/"geen locatie". Index-notities ("index 2023-Q3 niet betrouwbaar…") blijven voor de makelaar in paneel en pdf. Kop "Toelichting van de makelaar" i.p.v. "Van jouw makelaar" (de verkoper kijkt mee) | Opus |
| `.env.example` + `env:check` | Drie groepen (verplicht/optioneel/scripts), zonder waarden; `scripts/check-env.mjs` leest de groepen uit `.env.example` (één bron) en print alleen namen. `!.env.example` in `.gitignore`. Bevestigt: `PLATFORM_ADMIN_EMAILS` ontbreekt lokaal | Sonnet |
| `content_keuzes` | Was al opgeruimd op 27 sep; alleen het optionele schemaveld + backcompat-test staan nog, bewust | Sonnet |
| RLS `objecten` vs. één rol per kantoor | Gevonden via de security-advisor: UPDATE/DELETE alleen eigenaar of `is_kantoor_admin()`; de dossieracties schrijven via de sessie-client → bij een collega stil 0 rijen. **Quinn: "geen probleem als ze elkaars dossiers kunnen aanpassen"** → migratie `20260928100000_rls_kantoorbreed_en_initplan.sql` (na back-up toegepast): UPDATE/DELETE kantoorbreed, admin-policies weg, `(select auth.uid())`/`(select my_kantoor_id())` in alle policies van objecten/makelaars/transacties/imports/object_documenten/gebruik_events, 6 FK-indexen. Isolatie geverifieerd (demo-makelaar ziet 1 kantoor). Acties melden 0 rijen nu als fout | Quinn + Opus |
| `dod:screens` | Neemt nu ook `/object/[id]/presentatie` mee (dossier van het DoD-kantoor mét opgeslagen waardering) | Opus |

### 28 sep 2026 (zevende ronde, autonoom) — opruimen "nog niet toegepast", filter-poets, pdf-pin

| Onderwerp | Besluit | Door |
|---|---|---|
| Verouderde migratie-commentaren | Read-only geverifieerd (Opus, `pg_proc`/`information_schema`): `marktanalyse_verdeling_prijsklasse`, `transacties_plaatsen_wijken`, `kantoor_branding_publiek`, `kantoren.slug`, `objecten.verrijking_json`, `gebruik_events` en de concurrentie-v2-RPC's staan live; **`transacties.makelaar_id` niet** (commentaren daarover kloppen). Alle 15 plekken bijgewerkt, inclusief migratiekoppen | Sonnet + Opus |
| Terugvalcode weg | Code die alleen bestond voor een ontbrekende migratie is verwijderd: `zoekTransactiesTerugval()` (PGRST202, ± 250 regels + test), de 42703-takken voor `kantoren.slug` (admin) en `verrijking_json` (verrijking-route, was 503 `migratieVereist`), de `undefined`-slugstaat in `InstellingenForm`. Echte foutafhandeling (RPC faalt → `null` → nette foutstaat) blijft | Sonnet |
| Foutteksten explorers | "…de bijbehorende migratie moet nog worden toegepast" → "Deze cijfers kunnen we nu niet laden. Probeer het later opnieuw." — geen techniekjargon richting de makelaar | Sonnet |
| "Wis" op Plaats (concurrentie) | De Wis-link in de dropdown gaat nu naar leeg = alle plaatsen, net als marktanalyse/transacties. Pil-× en "Wis alles" blijven naar de standaard (werkgebied) — in alle drie hetzelfde | Sonnet |
| Pdf-subject-pin | `subjectPinStijl()` in `lib/statischeKaart.ts`: altijd witte halo (2,5 pt), en onder relatieve luminantie 0,06 een `lichter(kleur, .5)`-vulling. Drempel: referentiepins zijn `#14181B` (≈ 0,009); i4housing-blauw (≈ 0,20) en VestaAI-groen (≈ 0,11) blijven ongewijzigd. De tekenlogica bleek in `WaardebepalingPdfTemplate.tsx` te zitten, niet in de kaartmodule — Opus koppelde hem | Sonnet + Opus |
| Worktree-omgeving | Agent-worktrees hebben geen `.env.local` en geen echte `node_modules`-symlink: `dod:screens` en `maplibreWorker.guard.test.ts` draaien daar niet. Die checks draait de hoofdsessie na de merge (agents kopiëren geen productiecredentials) | Opus |

### 28 sep 2026 (zesde ronde, autonoom) — ⌘K-zoeken, buurtgrenzen, filtervergelijkers

| Onderwerp | Besluit | Door |
|---|---|---|
| ⌘K-zoeken | Radix Dialog (geen Sheet), knop in de topbar + ⌘K/Ctrl K (label pas na mount, platform verschilt). Groepen: woningen (sessie-client + `kantoor_id`, max 8, ≥ 2 tekens, `ilike` met `escapeIlike`), pagina's (statisch), snelkoppeling `/marktanalyse/transacties?zoek=` (bestaande URL-state, geen wijziging aan Transacties). Bug onderweg: sluit-reset-timeout werd niet geannuleerd bij heropenen via de sneltoets | Sonnet + Opus |
| Buurtgrenzen | CBS Wijken en Buurten **2024**, PDOK OGC API Features (`collections/buurten/items`), alleen de zichtbare bbox (> 0,6° → "Zoom in…"), eigen proxy `app/api/kaart/buurtgrenzen` (ingelogd, `s-maxage=86400`), properties server-side uitgedund (PDOK kent `properties` niet). Neutrale lijnen, labels vanaf zoom 12, standaard uit, schakelaar in de kaartkop. Geen CSP-wijziging | Sonnet |
| Filtervergelijkers | `lib/filterVergelijk.ts`: `bereikGelijk` + volgorde-onafhankelijke `verzamelingGelijk` (niet `plaatsenGelijk`: die naam betekent iets anders in `lib/kerncijfers.ts`). Concurrentie vergelijkt nu ook volgorde-onafhankelijk | Sonnet |
| Topbar 390 px | De nieuwe zoekknop duwde de hamburger 49 px buiten beeld op élke pagina — de agent zag het niet, `dod:screens` wel. Op ≤ 900 px nu alleen het zoekicoon, kleinere gaten, en de kantoornaam krimpt met een ellips (VestaAI-lockup blijft vast) | Opus |
| Concurrentie-v2-RPC's | Read-only geverifieerd: alle 5 bestaan en zijn identiek aan `20260924_rpc_concurrentie_v2.sql`; commentaren bijgewerkt. Tweede geval van verouderde "nog niet toegepast"-notities → systematische opruiming als volgend item | Sonnet + Opus |

### 28 sep 2026 (vijfde ronde, autonoom — Quinn sliep) — pdf-kaart, repetitie scène 4, filterpillen

| Onderwerp | Besluit | Door |
|---|---|---|
| Kaart in waardebepaling-pdf | § 9 naar voren gehaald (scène 4 eindigt bij deze pdf). PDOK BRT heeft geen WMS GetMap → WMTS-tegels `pastel/EPSG:3857`, samengesteld met `sharp` (bestaande dependency; les: `.extract()` niet direct na `.composite()` in één keten). Top-6-op-gewicht genummerd, nieuwe #-kolom in de tabel; kaart 160×84 pt naast de hero; ondergrens 350 m span, nooit uitzoomen voorbij zoom 12. Coördinaten via `haalTransactieCoordinaten()` (batch, query-laag). Tegels 3 s timeout, anders pdf zonder kaart + log. De route rekent niets opnieuw uit | Sonnet |
| Repetitie scène 4 | Typt "Langstraat 10 Wassenaar", kiest met ArrowDown + Enter, eist bouwjaar + oppervlakte binnen 8 s; bewaakt dat geen niet-GET naar `/api/` gaat. Maakt geen dossier aan | Sonnet |
| Filterpillen | Plaats-pil zodra de keuze afwijkt van het werkgebied, leeg = "Alle plaatsen", × = terug naar standaard. Marktanalyse had geen pil, Transacties toonde hem juist bij de standaard | Sonnet + Opus |
| Autonoom doorgaan | Quinn: "doe gelijk de volgende ronde, hou jezelf bezig". Na de demo-items pakken de rondes backlog "na de demo" op die zonder Quinn kan; niets onomkeerbaars | Quinn |

### 27 sep 2026 (vierde ronde, twee Sonnet-agents + Opus) — 12.5b, BAG, filters, poets

| Onderwerp | Besluit | Door |
|---|---|---|
| 12.5b repetitiescript | `scripts/generale-repetitie.mjs` / `npm run demo:repetitie`: loopt de zes scènes af op het demo-kantoor (1920×1080), screenshot per stap naar `screenshots/repetitie/`, faalt op `pageerror`, console-error, overlay, lege staat, ontbrekend knoplabel, niet-2xx; > 3 s = waarschuwing. Klikt niets aan dat schrijft of geld kost (dossier aanmaken, content, kwartaalbericht, uitsluiten/vastleggen, fase-pil); pdf's wél (alleen lezend, 0,4-0,9 s) | Sonnet |
| BAG-bug | `/adressen?zoekresultaat=` bestaat niet (400), `pageSize` min. 10, bouwjaar staat op het pand. Beide routes vouwden de fout stil tot "leeg" → autocomplete en voorvullen deden niets (hoe lang precies niet nagegaan). Nu `lib/bag.ts`: `q` + `adressenuitgebreid` (bouwjaar + oppervlakte in één call, `Accept-Crs`), fouten gelogd zonder adres. Getest tegen de echte API | Opus |
| "Wis" op Plaats | `serialiseerFilterState` liet een lege lijst uit de URL, parsen vulde de niet-lege standaard (werkgebied) weer in. Leeg bij niet-lege standaard wordt nu `plaatsen=`; leeg = alle plaatsen in de rekenlogica | Opus |
| Omweg vorige periode | `vorigePeriodeFilter()` en de tweede RPC-aanroep weg na verificatie met `pg_get_functiondef` dat de SQL-fix live staat; kwartaalbericht gebruikt `samenvatting.vorig.van/.tot` | Sonnet |
| Adres-autocomplete | ARIA 1.2-combobox (`role="combobox"`, `aria-controls`, `aria-activedescendant`); build-waarschuwing weg | Sonnet |
| Hervatten na limiet | Beide agents stopten op de limiet mét ongecommit werk in hun worktree → hervat via SendMessage (afspraak 27 sep) | Opus |

### 27 sep 2026 (derde ronde, vier Sonnet-agents) — 12.5a, één dossierkaart, minikaart, backlog-poets

| Onderwerp | Besluit | Door |
|---|---|---|
| 12.5a demoscript | `docs/demoscript.md`: klik-voor-klik per scène met terugvalplan, labels geverifieerd in de code. Geschreven op `/login/demo` (~8.000 transacties): het i4housing-kantoor heeft nul transacties tot fase 5, dus alle marktinzichten tonen daar de lege staat. Overzetten naar `/login/i4housing` zodra fase 5 live is | Sonnet |
| § 2 bijgesteld | Scène 1 zonder "deze week" (geschrapt onder 10.4) en met merkverloop i.p.v. teamfoto zolang 12.1 open is; knop heet "Kwartaalbericht schrijven" | Opus |
| Eén dossierkaart | `StraalKaartPaneel` verwijderd; de kaart in `WaarderingKaart.tsx` (via `WaardebepalingPaneel`) heeft twee lagen: "Referenties (n)" en "Eigen verkopen (n)" met straal 250/500/1000 m in de kaartkop (niet óp de kaart: rechtsboven zitten de zoomknoppen). Standaardlaag via `bepaalStandaardLaag()` (`lib/dossierKaart.ts`): referenties, tenzij die er niet zijn maar eigen verkopen wel. Eén MapLibre-instantie per dossier | Sonnet |
| NL-zoomknoppen | `locale` op de `maplibregl.Map` ("Inzoomen", "Uitzoomen", "Noorden boven") | Sonnet |
| Minikaart transactie-sheet | `TransactieMinikaart` (190 px, `direct`, geen scrollzoom) met één pin via `ReferentiesLaag` zonder referenties. Coördinaat per geopende rij via `haalTransactieCoordinaat()` op de view (RPC `transacties_zoeken` levert geen lat/lng; uitbreiden = migratie), gecachet per id | Sonnet |
| Extra's met documenten | `genereerExtraContent` krijgt de `anthropic_file_id`'s (max 3) mee, zoals kern-call en hergenereer; zonder documenten blijft het gewone (niet-beta) pad | Sonnet |
| Publieke footer | `components/PublicFooter.tsx` op `/contact`, `/voorwaarden`, `/over-ons`, `/privacy`, `/vertrouwen`: tagline en grijs (`#626C67`) gelijk aan de landing. `/vertrouwen` nu formeel ("u") | Sonnet |
| Huisstijl-hook | Regex vangt alleen kleur-fallbacks (hex, `rgb(`/`rgba(`/`hsl(`, kale triplet `26,107,69`), geen radius/schaduw/gewicht meer | Sonnet + Opus |

### 27 sep 2026 (tweede ronde, vier Sonnet-agents) — 8.4, intake, kaarten lazy, transacties

| Onderwerp | Besluit | Door |
|---|---|---|
| 8.4 brochure-pdf | `GET /api/pdf/brochure` + `BrochurePdfTemplate`: cover (hoofdfoto of merkvlak, adres, vraagprijs k.k., logo), intro (`brochure_tekst`, terugval `funda_tekst`), max 8 foto's (4 per pagina), kenmerkentabel (`lib/brochureKenmerken.ts`), slotpagina (`brochure_stijl.slot_tekst` of kantoorcontact). Geen AI, elke foto-/logo-URL vooraf gecontroleerd. Helvetica (geen lokaal kantoorlettertype beschikbaar zonder nieuwe dependency). Les: een absolute full-bleed `<Image>` met broertjes schoof in react-pdf een lege pagina in → `fixed` op de achtergrondafbeelding | Sonnet |
| 8.4 testfoto's | De agent uploadde tegen zijn opdracht in tijdelijk twee foto's naar een demo-dossier om de cover te testen en verwijderde ze daarna; gecontroleerd: 0 foto-rijen, geen restbestanden gevonden. Alleen demo-kantoor | Opus |
| Intake | Stap 5-vinkjes weg (`content_keuzes` deprecated, blijft optioneel voor oude dossiers) → hint naar "Meer…". 10.5: ≥ 1280 px wizard + sticky "Deze woning"-paneel (`components/DezeWoningPaneel.tsx`, live via `useWatch`), content begrensd op 1.180 px | Sonnet |
| Kaarten lazy | `BasisKaart` mount pas binnen 200 px van de viewport (`IntersectionObserver`, skelet op de juiste hoogte); prop `direct` op `/marktanalyse/kaart` en `/woningen`-kaart. Dossier mobiel: bytes 2.244 → 1.164 KiB, LCP 7,1 → 5,1 s; score 72 → 73 (mediaan, instabiel) | Sonnet |
| Transacties | Opdracht bleek al gedaan: de pagina draait sinds 6.2 op RPC `transacties_zoeken` (v2 toegepast, 163 ms). Wél: terugval bij `PGRST202` en verouderde "nog niet toegepast"-notities gecorrigeerd (code, migratie, schema, performance.md) — oorzaak van de dubbele opdracht | Sonnet + Opus |
| Limiet vóór eerste wijziging | Alle vier de agents stopten op de limiet vóór hun eerste wijziging; worktrees waren al opgeruimd → opnieuw gestart i.p.v. hervat (CLAUDE.md aangevuld) | Opus |
| Doorlopende rondes | Quinn: na een afgeronde ronde meteen de volgende starten, niet wachten (CLAUDE.md § Parallel met agents) | Quinn |

### 27 sep 2026 (sessie Opus als regisseur + vier Sonnet-agents) — 8.3, 9.2, 12.3, 13.2

| Onderwerp | Besluit | Door |
|---|---|---|
| 8.3 outputset v2 | Kern-call levert 7 velden (`funda_tekst`, `brochure_tekst`, `instagram`, `linkedin_kantoor`, `sneak_preview` (NL), `koper_email`, `buurtomschrijving`), max_tokens 16.000 → 6.000. Extra's (`open_huis`, twee follow-ups, `video_script`, `energie_advies`, `kopersvragen_faq`) op knopdruk via `POST /api/object/[id]/extra?type=` en een "Meer…"-menu, NL-only. Oude sleutels blijven optioneel; `metLegacyFallback()` parse't eerst, want `outputs_json` komt ongevalideerd uit de database (oude dossiers crashten de Teksten-tab) | Sonnet |
| 8.3 gerichte herkansing | Sjabloonfout → alleen `funda_tekst` opnieuw (platte tekst, model `CONTENT`, max 3.000 tokens) i.p.v. de hele suite; "herkansing gaf geen valide JSON" kan niet meer | Sonnet |
| 8.3 review: extra's niet kwijt | "Genereer content" overschreef `outputs_json` en wiste zo elke extra → `behoudExtras()`. De extra-route geeft 409 zolang `content_status = 'bezig'` en leest vlak voor het schrijven opnieuw | Opus |
| 8.3 intake stap 5 | `content_keuzes` in `PropertyForm.tsx` filtert niets meer (die velden zitten niet meer in de kern). Bewust niet in dit item; volgend item | Sonnet + Opus |
| 9.2 reset-mail | `/login/<slug>` → `POST /api/auth/kantoor-reset`: service role `generateLink({ type: 'recovery' })` + Resend-mail met logo/kleur/naam van het kantoor. Altijd `{ ok: true }` (geen enumeratie), alleen als de makelaar bij dat kantoor hoort, `redirectTo` uit `APP_URL` + gevalideerde slug, in-memory rate-limit (5/10 min per ip+e-mail). Middleware laat de route door (niet-ingelogd per definitie). Generieke `/login` ongewijzigd | Sonnet |
| 9.2 review | `ilike` las `_`/`%` als jokerteken (`q_inn@…` vond `quinn@…`) → escapen + exacte vergelijking + link naar het opgeslagen adres. Elk antwoord duurt minimaal 1,5 s (anders verraadt de responstijd een bestaand account). Hulpfuncties in `lib/kantoorReset.ts`: een Next-routebestand mag alleen route-exports hebben (de build faalde) | Opus |
| 12.3 performance | `maplibre-gl` zat ondanks `dynamic(ssr:false)` in de hoofdbundel: de laag-componenten importeerden hem zelf → runtime via `await import()`, type statisch. First Load JS dossier 547 → 269 kB, `/woningen` 490 → 212 kB. `colors.muted` `#98A0A6` (2,65:1) → `#5C6470`; a11y 100 op alle drie de routes. `@next/bundle-analyzer` opt-in (`ANALYZE=true`). Mobiele performance marktanalyse (~80) en dossier (56-75, instabiele meting) halen 85 niet: kaart/grafieken laden direct — architectuurkeuze, backlog | Sonnet |
| 12.3 review | Na de kleurvervanging waren afgeronde en toekomstige intakestappen even grijs → afgerond `#2C3238` | Opus |
| 13.2 landing | Hero = waardebepaling + marktinzicht op eigen data, met "geen taxatie"-disclaimer; content, white-label en concierge als dragende features; staging-sectie, content-hero-demo en "Fortune 500"-taal weg; vier feitelijk onjuiste claims gecorrigeerd (USP's beïnvloeden de waardering niet, alleen vijf kenmerk-correcties, WOZ niet automatisch, geen Funda-API in ontwikkeling). A11y 100, performance ~91 (lokaal) | Sonnet |
| 13.2 review | Trust strip noemde Funda/NVM/Realworks — leest als koppeling of goedkeuring die er niet is → alleen echte bronnen (eigen verkoopdata, BAG, CBS, PDOK, opslag in de EU, Claude). "Direct plaatsbaar, geen nabewerking" en "700+ woorden" weg; FAQ zegt eerlijk dat er geen Funda-koppeling is | Opus |
| Dossierheader > € 1 mln | "€ 1.482.000" werd in de tegel afgekapt → `euroTegel()` (`lib/opmaak.ts`): vanaf een miljoen `€ 1,48 mln`; het exacte bedrag staat in het waarderingspaneel | Opus |

### 27 sep 2026 — i4housing-tekstsjabloon live, afspraak "ga door"

| Onderwerp | Besluit | Door |
|---|---|---|
| i4housing-tekstsjabloon | Akkoord Quinn. Na back-up (`backups/2026-09-27T10-18-58-728Z/`) alléén `huisstijl_json.tekstsjabloon` toegevoegd (gerichte update, schema-gevalideerd; overige 14 velden aantoonbaar ongewijzigd). **Niet** via `repair-i4housing-branding.mjs --write`: dat uploadt ook logo/favicon/sfeerbeelden opnieuw en herschrijft de hele huisstijl — meer dan akkoord was gegeven | Quinn + Opus |
| Limiet → "ga door" | Na een gebruikslimiet betekent "ga door": onderbroken agents hervatten via SendMessage, niet opnieuw starten (CLAUDE.md § Parallel met agents) | Quinn |

### 26-27 sep 2026 (sessie Opus als regisseur + drie Sonnet-agents) — 7.3, 7.4, 8.2, 9.3, 12.2

| Onderwerp | Besluit | Door |
|---|---|---|
| 7.3 straal per woning | `StraalKaartPaneel` en de referentiekaart in de waardering op `BasisKaart` (nieuw: `SubjectPin`, `ReferentiePin`, `ReferentiesLaag`, `KaderLaag`; pure filter `lib/straalFilter.ts`). `Slider` kreeg een enkelvoudige modus. Review Opus: vaste zoom 15 sneed de 500 m-cirkel af (op 390 px niet in beeld) en het eigen adres ontbrak → `kaderRondStraal()` in `lib/geo.ts` (gedeeld met de referentiekaart), herkaderen bij schuiven, subjectpin | Sonnet + Opus |
| 7.4 Leaflet weg | `Verkoopkaart.tsx`, `VerkoopkaartClient.tsx`, `VerkoopkaartExplorer.tsx` (v1) en de `?kaart=v1`-terugval verwijderd; `leaflet`/`react-leaflet`/`@types/leaflet` uit `package.json`. Geen CSP-wijziging nodig (tiles liepen via `img-src https:`). Fase 7 af | Sonnet |
| 8.2 plaats in de prompt | Het tekstsjabloon is een derde cachebaar systeemblok ná het taalspecifieke basisblok: blok 1 (huisstijl) en 2 (basisprompt) blijven byte-identiek, dus de 8.1-caching blijft intact; als laatste blok weegt de override van de lengte-eisen het zwaarst | Sonnet |
| 8.2 generiek, geen speciale kop | De bullet-eis bij GOED OM TE WETEN zit in de sectie-instructie van de i4housing-preset, niet hardgecodeerd op die kopnaam — werkt zo voor elk kantoor | Sonnet |
| 8.2 herkansing met tijdsbudget | Een sjabloonherkansing genereert de hele suite opnieuw (1-3 min). Alleen als de eerste poging < 110 s duurde (`SJABLOON_HERKANSING_BUDGET_MS`), anders accepteren met `[tekstsjabloon]`-waarschuwing — twee volle generaties passen niet in 300 s. Mislukt de herkansing op JSON, dan de eerste output. **Beter (8.3):** alleen `funda_tekst` opnieuw laten schrijven | Opus |
| 8.2 Engelse slotzin | Nieuw optioneel `engels.slotzin` (admin-veld + i4housing-preset "Excited about this home? …"). Zonder: de EN-generatie vertaalt de Nederlandse slotzin en de validator eist hem niet letterlijk — een Engelse Funda-tekst eindigde anders in het Nederlands | Opus |
| 8.2 preset nog niet in de database | `repair-i4housing-branding.mjs` alleen dry-run gedraaid (toont het juiste object). Wegschrijven wacht op Quinn | Opus |
| 9.3 consistentiecontrole | `controleer-huisstijl.mjs` dekt nu dossiers per fase met elke tab, `/woningen` leeg + kaart, accountmenu en feedbacksheet (Radix-portals), `/login/<slug>` en de pdf's (kleuroperatoren in de Flate-streams + metadata, `scripts/lib/vestaGroen.mjs`). Groentinten worden afgeleid uit `tailwind.config.ts`/`tokens.ts`/`globals.css` (tint 90-175°, niet bijna-zwart, ≥ 4/255 spreiding) i.p.v. vijf vaste waarden; ook SVG fill/stroke en verlopen; zichtbare naam "VestaAI" buiten de lockup telt als fout (e-mailadressen niet). Enige vondst: kantoorlogin-achtergrond `#FBFCFB` → `#FAFBFB`. Verder schoon op 390/1280/1920 | Opus |
| 12.2 e2e | `e2e/`: kantoorlogin (`/login/demo`, `/login/i4housing`), dossier < 5 s via `POST /api/object` (met ongemeten opwarmrun; opruimen alleen na `assertKantoorIsDemo()` en met filter op id + kantoor), waardering n + pdf, kaart zonder CSP-fout, admin-importhistorie, RLS in beide richtingen via REST (transacties + objecten). 22 passed, 5 skipped (content achter `E2E_GENERATE=1`). Geen app-bugs; wel `hasAuth()` in `primitives.spec.ts` en dom-lib in `e2e/tsconfig.json` gerepareerd | Sonnet |
| Gebruikslimiet midden in een agent | De e2e-agent stopte op de sessielimiet; hervat via SendMessage (werk bleef staan dankzij commit-per-stap). Les: een vastgelopen `next dev` op een vaste worktree-poort overleeft zo'n onderbreking — `lsof -iTCP:<poort>` vóór herstart | Opus |

### 24 sep 2026 (sessie Opus als regisseur + drie Sonnet-agents) — Buurt & data vóór de demo

| Onderwerp | Besluit | Door |
|---|---|---|
| WOZ per woning niet gekoppeld | Oorzaak "kon niet worden opgehaald": `api.wozwaardeloket.nl` bestaat niet meer (DNS). Het loket draait nu op `api.kadaster.nl/lvwoz/wozwaardeloket-api/v1`, maar dat is de interne backend van een publieke site die geautomatiseerde bevraging niet toestaat — daar bouwen we niet op. `fetchWoz` geeft `niet_gekoppeld` (nieuwe `FetchStatus`), zonder netwerkaanroep; `haalWozIjkpunt` → `null` (waarderingspaneel verbergt het ijkpunt). UI toont het **CBS-buurtgemiddelde** klein en expliciet als "niet de waarde van deze woning". Een betaalde bron kiezen is Quinns beslissing (roadmap § 8) — één functie + vlag `WOZ_GEKOPPELD` | Opus |
| WOZ: zelf invullen | Quinn (24 sep): WOZ via een andere API, maar alleen gratis; anders zelf invullen. Onderzoek: er is **geen gratis WOZ-API die een commercieel platform mag gebruiken** — loket verbiedt geautomatiseerd opvragen, Kadaster "WOZ Bevragen" alleen voor gemeenten/Huisvestingswet, woz-api.nl (€ 0,35/adres, 10 gratis) en Altum AI (€ 0,47/call, 15-50 gratis) zijn betaald. Dus: `input_json.woz_waarde` + `woz_peiljaar` (intakestap 6 én inline in de WOZ-kaart, `PATCH /api/object/[id]/woz`, link naar het loket), ingevulde WOZ gaat voor als ijkpunt in waardering en pdf (`lib/woz.ts`) | Quinn + Opus |
| Overpass: wisselvallig, niet stuk | Meting 24 sep (12 aanroepen, 4 publieke instances): 504/429/timeouts, 3 van 12 geslaagd. Lokaal en met User-Agent werkt het wél — het is overbelasting. Daarom: terugval-mirror `z.overpass-api.de` na `lz4` (timeout 9 s per poging), 429 telt als `mislukt` i.p.v. `leeg`, en bij mislukken de CBS-"Nabijheid voorzieningen" (supermarkt/huisarts/school/kinderopvang, gemiddeld per buurt) in UI én contentprompt | Opus |
| Uitval zichtbaar maken | `fetchVerrijking` logt een mislukte bron met reden (`[verrijking] voorzieningen mislukt (Wassenaar): …`), zonder adres (persoonsgegeven). Vóór deze fix was een uitval op Vercel nergens te zien — de reden dat de oorzaak op 23 sep niet gevonden werd | Opus |
| Verouderde verrijkingsrijen | Rijen zonder `bronnen` of zonder `cbs.nabijheid` worden bij het openen van de tab één keer ververst (zelfde actie als Ververs); tot dan telt ontbrekende WOZ als niet gekoppeld en ontbrekende voorzieningen als mislukt — de oude code vouwde fouten stil op tot "leeg" ("Geen voorzieningen binnen 1,5 km" bij een villa in Wassenaar) | Opus |
| 7.2 verkoopkaart v2 (26 sep) | Port van `docs/ontwerp/verkoopkaart.html` op `BasisKaart` (`components/VerkoopkaartExplorerV2.tsx`, logica in `lib/verkoopkaart.ts` die `filterEigenRijen` uit de marktanalyse hergebruikt); v2 is standaard, `?kaart=v1` blijft Leaflet-terugval tot 7.3/7.4. Afwijkingen: geen "Verkocht door"-filter (geen makelaarkolom; additieve migratie klaar, niet toegepast), MapLibre's eigen zoomknoppen i.p.v. die uit het prototype, afspeelknop wél gebouwd. Review hoofdsessie: twee hardgecodeerde blauwtinten → merkvariabelen; screenshots 390/1280 zonder overloop of pageerrors | Sonnet + Opus |
| 10.1/10.2 woningen + dossierheader (26 sep) | `/woningen` v2: server-side zoeken/filteren (fase, makelaar) in de URL, `DataTable` of kaart op `BasisKaart` (eigen pinlaag buiten `components/kaart/`), lege staten met/zonder filters. Dossierheader v2 (`components/DossierHeader.tsx`): foto (oudste uit `object_fotos`, anders merkverloop), kenmerkpillen, fasestepper, tegels Waarde (makelaarscorrectie wint) / Vraagprijs / Dagen in fase (server-side, `fase_sinds`), pdf- en contentknop. Hydratie: `dagenInFaseAantal(faseSinds, nu)` met verplichte `nu`. Review Opus: layout naar twee kolommen zoals het prototype (tegelkolom viel op 1280 px naar een nieuwe regel en brak "€ 737.000"), info onder de foto op 390 px, hardgecodeerd blauw in de placeholder → merkkleur, StatTile-waarden `nowrap`. Aanname: "eerste foto" = oudste | Sonnet + Opus |
| WOZ-invoer end-to-end (26 sep) | `wozHandmatig` loopt van `object/[id]/page.tsx` via `ObjectWorkspace` naar `BuurtDataTab`. Getest op een demo-dossier: invullen → na herladen zichtbaar → WOZ-ijkpunt in de waardering → wissen (demo-dossier weer schoon) | Opus |
| 6.4 kwartaalbericht (26 sep) | `lib/kwartaalbericht.ts` bouwt het feitenblad server-side (`/api/kwartaalbericht`, niet uit clientcijfers) uit `marktanalyseSamenvatting` huidig+vorig + eigen aandeel; `schrijfKwartaalbericht()` in `lib/claude.ts` (model `CONTENT`), 250-350 woorden in kantoortoon, NL/EN. **Guardrail:** elk getal in de tekst (NL-notatie, "procent", mln, afrondingsladder) moet in het feitenblad staan; anders één herkansing met correctie-instructie, daarna een eerlijke fout. Geen opslag; modal met kopiëren + `.md`. Afwijking: geen aparte trendreeks in het feitenblad (samenvatting dekt de delta's; minder guardrail-risico). Echte generatie gecontroleerd (demo-kantoor, 24 mnd): alleen feitenblad-cijfers. EN nog niet tegen de echte API getest | Sonnet + Opus |
| Escape in de gedeelde Modal | `components/ui/Modal.tsx` sloot alleen bij klik buiten; nu ook met Escape (ontwerpprincipes: elke modal) — centraal i.p.v. lokaal per modal | Opus |
| Kop-op-kop Marktinzichten weg | Alle vier de verkenners hebben nu een eigen h1 → de gedeelde serif-kop "Zoeken in de markt" uit `marktanalyse/layout.tsx` is weg, het eyebrow-label "Marktinzichten" blijft (zoals de prototypes) | Opus |
| StatTile-hero white-label | De hero-gradient begon op hardgecodeerd `#0A8AD2` (i4-blauw) met witte tekst — bij elk ander kantoor fout. Nu `var(--merk)` → `var(--merk-diep)`, tekst `var(--merk-op)` (doorschijnend via `color-mix`) | Opus |
| Opruimen na PR #28 | PR #28 staat op `main`, productie-deploy READY; enige runtime-error in 24 u is een onbestaande Server Action `"x"` op `/` (bot/scanner, geen appfout). Worktrees waren al weg; vijf gemergde lokale branches verwijderd | Opus |

### 23 sep 2026 (sessie Opus als regisseur + Sonnet-agents parallel) — 9.1, 13.1 en meer

| Onderwerp | Besluit | Door |
|---|---|---|
| Werkwijze: parallelle agents | Opus plant en reviewt, Sonnet-subagents bouwen elk één item in een eigen git-worktree (`.claude/worktrees/`, nu in `.gitignore` en uitgesloten in `vitest.config.ts`/`tsconfig.json` — anders draaien de tests van élke worktree mee). Items gekozen op nul bestandsoverlap; elke agent een eigen dev-poort (31xx). Agents schrijven migraties maar passen ze niet toe; de hoofdsessie reviewt, maakt een back-up en past toe. Docs (`roadmap.md`/`besluiten.md`) alleen door de hoofdsessie, om merge-conflicten te voorkomen | Quinn + Opus |
| Additieve migraties zelf toepassen | Quinn (23 sep): additieve migraties (nieuwe kolom/tabel/functie, backfill van alleen die nieuwe kolom) mag Claude zelf toepassen, **na een back-up**. Brekende of bestaande data wijzigende migraties blijven akkoord-plichtig | Quinn |
| Eval-ronde content nog niet | Quinn (23 sep): de blinde A/B-ronde van 8.1 (betaalde API-calls) nog niet draaien; het script staat klaar in dry-run | Quinn |
| 9.1 slug-lookup via RPC | `/login/[slug]` draait vóór er een sessie is, dus de branding komt uit `kantoor_branding_publiek(p_slug)` — `security definer`, vaste `search_path`, geeft alleen negen publieke brandingvelden terug (naam, logo, kleuren, lettertype, vorm, favicon, sfeerbeelden). Geen publieke RLS-policy op `kantoren`: die zou een hele rij blootgeven (instellingen, stijlprofiel). Migratie `20260923_kantoren_slug.sql` toegepast na back-up; slugs `i4housing` en `demo` | Sonnet + Opus |
| 9.1 slug hoort bij kantoorgegevens | Bewerken in `InstellingenForm.tsx` naast de kantoornaam, niet in `HuisstijlForm` — het is identiteit/routing, geen visuele stijl. Na uitloggen: terug naar `/login/<slug>` (cookie `vesta_login_slug`, pad-vangrail tegen open redirect), zonder slug ongewijzigd naar `/` | Sonnet |
| 9.1 kantoorlogin informeel | De kantoorlogin is de voordeur van de ingelogde omgeving, dus "je" (placeholder, resetteksten), neutrale grijzen i.p.v. de groen-getinte, en geen "Neem contact op"-link naar VestaAI's `/contact` maar "Vraag het na bij je kantoor". De generieke `/login` blijft publiek: formeel en VestaAI-groen. Dubbele tabtitel "Inloggen — VestaAI — VestaAI" gerepareerd (layout gaf het achtervoegsel zelf al mee) | Opus |
| 13.1 publieke copy | Proefperiode-CTA van `/over-ons` weg (bestond niet meer), privacyverklaring feitelijk bijgewerkt (transactiedataset met VestaAI als verwerker, Google Gemini en Plausible als derde partijen toegevoegd, geen "opzegging/factuurgegevens"), `/vertrouwen` idem. Landingspagina had geen onware claims; herpositionering blijft 13.2 | Sonnet |
| 8.1 modelconstanten | `lib/aiModellen.ts`: `CONTENT` = `claude-sonnet-4-6` (ongewijzigd tot de blinde evaluatie), `CONTENT_KANDIDAAT` = `claude-sonnet-5`, `EXTRACTIE`/`HERSCHRIJF` = `claude-haiku-4-5` (draaiden al op Haiku), `SAMENVATTING` = `claude-sonnet-4-6`. De USP-extractor blijft bewust op Sonnet: hij interpreteert vrije tekst, en zonder vergelijking is Haiku daar niet aantoonbaar even goed (kandidaat: `EXTRACTIE_KANDIDAAT`). Guard-test: geen `claude-`-modelstring buiten `lib/aiModellen.ts` | Sonnet |
| 8.1 prompt caching | Systeemprompt in twee blokken met elk een `cache_control`: eerst het huisstijlblok (stijlprofiel/voorbeelden/geleerde regels, met vaste Nederlandse labels zodat NL en EN byte-identiek zijn), dan het taalspecifieke basisprompt. Gemeten met `count_tokens`: 3.373 + 1.569 tokens, beide boven de cache-ondergrens. ⚠️ NL en EN starten tegelijk, dus de tweede taal profiteert níet van de cache van de eerste binnen dezelfde generatie — wel volgende generaties en herschrijfacties binnen 5 minuten. Volgorde huisstijl-vóór-basisprompt is gewijzigd; te toetsen in de evaluatieronde | Sonnet + Opus |
| 8.1 evaluatieset | `docs/evaluatie/` (5 dossiers, schema-gevalideerd) + `scripts/evalueer-content.mjs` (via `npx tsx`, standaard dry-run, `--write` = ±10 generaties, sleutel apart in `docs/evaluatie/sleutels/`). Nog niet gedraaid (besluit Quinn) | Sonnet |
| 6.1 marktanalyse v2 | Port van `docs/ontwerp/marktanalyse.html` op nieuwe primitives (`FilterBar`, `FilterDropdown`, `FilterPills`, `RangeSlider`, `ChartCard`, `Chip`, `Checkbox`; `StatTile` met hero/delta/sparkline), `hooks/useFilterState.ts`, `lib/opmaak.ts`, `lib/grafiekThema.ts`. Pagina haalt eigen verkopen + regionale RPC's parallel op i.p.v. de hele tabel: **~6 s → ~1,2 s**. Twee nieuwe RPC's (`marktanalyse_verdeling_prijsklasse`, `transacties_plaatsen_wijken`, `security invoker`) toegepast na back-up. URL-filterstaat heeft een eigen compacte vorm met conversie naar `TransactieFilter` — sjabloon voor 6.2/6.3 | Sonnet + Opus |
| 6.1 afwijkingen prototype | Geen eindlabels op de lijnen (pil-legenda + tooltip met alle reeksen en n); periode via bestaande `SegmentedToggle`; weinig-data-waarschuwing (n < 6) ook op de hero-tegel — de regel "geen schijnzeker getal" wint van het prototype. Kop-op-kop ("Zoeken in de markt" uit de gedeelde layout + "Marktanalyse"): blijft tot 6.2/6.3 hun eigen kop hebben, dan gaat de gedeelde layout-kop weg | Sonnet + Opus |
| 6.1 delta's: bug in `marktanalyse_samenvatting` | Alle tegels toonden "geen vergelijking": de RPC bouwt zijn basis via `transacties_gefilterd(p_filters)`, dat de datumsleutels zélf al toepast — de vorige periode viel er dus altijd buiten. Opgelost in de code (`vorigePeriodeFilter()` in `lib/marktanalyse.ts`: tweede RPC-aanroep met het verschoven venster). De SQL-fix `20260924_fix_marktanalyse_samenvatting_vorige_periode.sql` eerst bewust niet toegepast (wijzigt een bestaande functie, omweg werkte al), daarna **wél** toegepast toen 6.2 dezelfde bug bleek te hebben: signatuur identiek aan de live functie, alleen de vorige periode wordt nu correct. De omweg `vorigePeriodeFilter()` is daarmee overbodig (één extra RPC-call) — opruimen in 12.3 | Sonnet + Opus |
| 6.2 transacties v2 | `DataTable` (TanStack Table **v9**, andere API dan v8) server-gepagineerd, zoekveld op adres en sortering op elke kolom via een achterwaarts compatibele `create or replace` van `transacties_gefilterd`/`transacties_zoeken` (definitie vergeleken met de live versie vóór toepassen). "Verkocht door" toont de leesbare naam (`verkopend_kantoor`), niet de kleine-letter-sleutel `_norm`. Geen filter per makelaar: `transacties` heeft geen makelaarkolom (het prototype verzon die data). Minikaart in de sheet is een placeholder tot 7.2 `BasisKaart` gebruikt | Sonnet + Opus |
| 7.1 kaart | MapLibre op PDOK's BRT-vectortiles (`api.pdok.nl/.../ogc/v1/tiles/WebMercatorQuad`) met een eigen pastelstijl (`pdokPastelStijl()` in `lib/kaart.ts` — PDOK heeft geen pastelvariant). **Worker zelf gehost** in `public/maplibre-gl/`: onder onze CSP laadt de blob-worker `maplibre-gl-shared.mjs` niet ("Worker failed to load"). Het is een statische kopie; `lib/maplibreWorker.guard.test.ts` faalt zodra een maplibre-update hem laat verouderen. Proef achter `/marktanalyse/kaart?kaart=v2`; Leaflet blijft standaard tot 7.2/7.4. maplibre-gl zit alleen in de kaartroute (418 kB first load daar, gedeelde bundel ongewijzigd 87,9 kB) | Sonnet + Opus |
| 10.3 buurtdata eerlijk | Per bron een status `ok`/`leeg`/`mislukt`; "mislukt" toont "Kon niet worden opgehaald", nooit "geen gevonden". Het vaste "Markttype"-blok (4-8 weken, 5-15 % boven vraagprijs) is **eruit**: een vuistregel die onze eigen data tegensprak (−1 %). In de plaats: "Markt in [plaats]" uit de eigen transacties (12 mnd tot de laatste verkoopdatum, met n en "data t/m"). Verrijking wordt niet synchroon bij het aanmaken opgehaald (zou de < 5 s-belofte van 3.1 breken) maar direct erna (fire-and-forget) + eenmalig bij het openen van de tab. ⚠️ WOZ-loket en Overpass gaven bij de test voor een Wassenaars adres "mislukt" — oorzaak nog niet gevonden, zie backlog | Sonnet + Opus |
| Tijdstempels in Amsterdamse tijd | `datumTijd()` in `lib/opmaak.ts` las UTC ("opgehaald om 06:11" om 08:11). Nu `Intl` met `timeZone: 'Europe/Amsterdam'` — hydratieveilig omdat de tijdzone vastligt, dus server en browser geven dezelfde tekst | Opus |
| 10.4 gebruik_events | Tabel met RLS op kantoorniveau (zoals `transacties`); "Recent bekeken" filtert daarbovenop op de eigen makelaar. Alleen het openen van een dossier wordt gelogd; de tijdlijn "Deze week" is bewust niet gebouwd (schrapbaar). Migratie toegepast | Sonnet + Opus |
| 12.4 feedbackknop | "Feedback geven" in het avatar- en mobiele menu → sheet → Resend-mail naar de platform-admin (reply-to = makelaar). Rate-limit bewust in-memory (60 s, reset bij koude start) — geen tabel voor iets kleins. `FEEDBACK_SKIP_SEND=1` slaat verzenden over voor tests | Sonnet |
| 6.3 concurrentie v2 | Vijf nieuwe RPC's (`concurrentie_ranglijst/_wij_vs_markt/_aandeel_jaar/_matrix/_profiel`, `security invoker`) op `verkopend_kantoor_norm`; de oude 2.2-RPC's blijven ongemoeid. Bij de review gerepareerd: de hero toonde 1,5 % i.p.v. 14,7 % (vergeten ×10 bij het tween-patroon), punt- i.p.v. komma-decimalen (`toFixed` → `procent()`), "gem." waar het een mediaan is, 36 px horizontale scroll op 390 px (legenda-pillen in `ChartCard` braken niet af), en het profiel zocht een kantoor op via `lower(trim(naam))` terwijl `_norm` ook leestekens strip ("Huys & Partners" zou leeg blijven) — nu komt de sleutel uit de data. Drawer met concurrentprofiel is gebouwd én in de browser doorgeklikt. Afwijkingen van het prototype: geen delta op de hero, native tooltip in de matrix, "verberg dit kantoor" herberekent de percentages niet | Sonnet + Opus |
| ⚠️ Kantoorkleuren in portals | Radix-portals (Sheet/Popover/Tooltip/SelectMenu) renderen in `<body>`, buiten de layout-div met `--merk*`, en erfden de VestaAI-groene terugval van `:root` — het concurrentprofiel was groen. De layout schrijft de variabelen nu ook als `:root`-regel (`brandingRootCss()`, `<` wordt geweigerd). Raakt élke drawer en dropdown, ook die van 4.4 en de filters | Opus |
| CSP: Plausible toegestaan | Het Plausible-script in `app/layout.tsx` werd op élke pagina door de CSP geblokkeerd (console-error) — de analytics hebben dus nooit gewerkt. `https://plausible.io` toegevoegd aan `script-src` en `connect-src` | Opus |

---

### 23 sep 2026 (sessie Sonnet) — profielmenu viel weg achter de pagina

| Onderwerp | Besluit | Door |
|---|---|---|
| Dropdown geclipt door `overflow: hidden` | Quinn meldde dat het profielmenu (avatarknop rechtsboven) achter de pagina viel — een andere oorzaak dan de hydratiebug van 19 sep op dezelfde component. De topbar-rij (`components/AppTopbar.tsx`) had `overflow: hidden` om de nav-pillen binnen de balk te houden; het (absoluut gepositioneerde) profielmenu zat in diezelfde container en werd daardoor geclipt in plaats van getoond. Nav-pillen scrollen al zelf via hun eigen `overflowX: auto`, dus de clip op de hele rij was overbodig — verwijderd. Eén regel, geen andere aanpak overwogen | Sonnet |
| Direct live | Op Quinns verzoek meteen gepusht, PR #26 aangemaakt en gemerged naar `main` — niet gewacht tot sessie-einde, conform de uitzondering in CLAUDE.md dat Quinn buiten de normale afspraak om alsnog expliciet om live kan vragen | Quinn + Sonnet |
| DoD achteraf gecontroleerd | `npm run typecheck && npm run test && npm run build` groen, huisstijl-hook schoon op het gewijzigde bestand. `npm run dod:screens` crashte lokaal (exit 137, vermoedelijk resource-limiet van de sandbox); in plaats daarvan `scripts/controleer-huisstijl.mjs` los gedraaid tegen een handmatig gestarte dev-server — alle ingelogde routes groen, geen runtime-errors, geen VestaAI-groen-lek | Sonnet |

---

### 19 sep 2026 (sessie Opus) — item 6.0 + welkomstblok + hydratiebug

| Onderwerp | Besluit | Door |
|---|---|---|
| 6.0 zonder shadcn | Wél de Radix-primitives, **niet** het shadcn-class-patroon dat de roadmap-spec noemde. shadcn stuurt kleur via Tailwind-classes op een eigen tokenlaag (`--background`/`--primary`/…); die zou naast `components/ui/tokens.ts` een tweede waarheid worden die synchroon moet blijven — precies de drift waar de VestaAI-groen-bugs vandaan kwamen. Bovendien verbiedt de bouwregel in CLAUDE.md Tailwind-kleurclasses achter de login (de `blue`-schaal rendert groen). Primitives dus inline gestyled met `tokens.ts` + `var(--merk*)`; alleen wat een inline style niet kán (`[data-state]`, `:focus-visible`, `[data-highlighted]`) staat als `.vui-*` in `globals.css`. Geen `clsx`/`cva`/`tailwind-merge` | Opus |
| Primitives bewijzen in productie | Geen showcasepagina en geen dode code: de drawer "Referentie toevoegen" (4.4) is overgezet op `Sheet`. Gemeten in de browser dat focus-trap, scroll-lock, Escape en focus-herstel werken. Het handwerk had wél `aria-modal`, maar géén focus-trap en liet de achtergrond zichtbaar voor schermlezers — Radix zet in plaats daarvan `aria-hidden` op alles daarbuiten, wat beter wordt ondersteund | Opus |
| e2e-auth gerepareerd | `e2e/auth.setup.ts` bezocht de magic link, die naar de **productie**-URL redirect; lokaal logde hij dus nooit in en alle ingelogde e2e-tests sloegen stilletjes over. Nu dezelfde cookie-aanpak als `scripts/lib/dodSessie.mjs`. Daarbij bleek de dashboard-smoketest nog te toetsen op de snelkoppelingen die 1.9c had verwijderd | Opus |
| Welkomstbanner: geen foto | De aangeleverde teamfoto was 399×501 px en werd op desktop ~3× opgeschaald: te vaag (oordeel Quinn). In plaats daarvan het ontwerp dat al in `docs/ontwerp/startpagina.html` § `.kantoorbanner` stond — merkverloop met fijn raster en diagonale glans. Bewust beeld i.p.v. terugval, scherp op elk scherm, werkt in elke kantoorkleur. Contextregel eronder met een echt getal ("3 dossiers wachten op content"), meeliftend op de bestaande objecten-query. `banner_url`/`banner_focus_y` blijven bestaan voor een latere scherpe foto (≥ 1600 px) | Quinn + Opus |
| ⚠️ Hydratie sloopt de hele pagina | `StartBanner` was een client component met `new Date()`: op Vercel (UTC) een andere begroeting dan in de browser (Amsterdam) → hydratiemismatch (React #425/#422). Op productie gemeten dat die fouten **alleen op `/dashboard`** optraden. Gevolg: de hele pagina bleef half-levend, inclusief het profielmenu in de topbar dat niet meer opende. Datum en begroeting komen nu uit `lib/begroeting.ts`, server-side in `Europe/Amsterdam`, als props. Banner is nu een server component en de fade-in is CSS i.p.v. JS-state — hij stond op `opacity: 0` tot JS draaide, dus bij falende hydratie simpelweg onzichtbaar | Opus |

---

### 18 sep 2026 (sessie Opus) — fase 4 afgerond met item 4.7 (waardebepaling-pdf)

| Onderwerp | Besluit | Door |
|---|---|---|
| 4.7 opbouw | `app/api/pdf/waardebepaling/route.ts` (GET, `object_id`) + `components/WaardebepalingPdfTemplate.tsx` + `WaardebepalingPdfButton.tsx`. De route **rekent niets opnieuw uit**: hij leest de opgeslagen `objecten.waardering_json` (v1 wordt gemigreerd via `migreerWaarderingJson`). Zo kan de pdf nooit een ander bedrag tonen dan het scherm waar de makelaar hem opent | Sonnet + Opus |
| Toegang | Sessie-client voor auth, daarna service-client mét expliciete `.eq('kantoor_id', …)` — zelfde patroon als `waardering-actions.ts`. Geverifieerd: 400 zonder waardering, 400 zonder `object_id`, **404 op een dossier van een ander kantoor**, redirect naar `/login` zonder sessie | Opus |
| Kenmerk-effecten in de pdf | Niet de vier losse kolommen (klasse/pct/n) maar de kant-en-klare `toelichting` uit `lib/waardering.ts`, die de referentieklasse noemt ("A-B +7 % t.o.v. C-D"). Kenmerken waarvan de woning ín de referentieklasse valt ("zonder +0 % t.o.v. zonder") worden **weggelaten**: op het scherm zijn ze nuttig naast een aan/uit-chip, in een document voor de verkoper zijn ze ruis. `grootte` hoort er wél bij (stond er eerst niet in) | Opus |
| Waarschuwingen | De volledige `uitkomst.waarschuwingen` komt mee in een eigen blok, niet alleen de weinig-data-melding — § 3.3 verbiedt een schijnzeker getal zonder caveats. Geen ⚠-glyph: react-pdf's ingebouwde Helvetica is WinAnsi en kent U+26A0 niet (`•` wel) | Opus |
| Logo-vangrail | `bruikbaarLogo()` (HEAD-check vooraf) blijft verplicht: react-pdf's `<Image>` kent geen `onError`, dus een verlopen logo-URL laat de hele generatie klappen. Demo Makelaardij heeft geen logo → terugval op de kantoornaam; met i4 Housing's echte logo geverifieerd | Opus |
| Nieuwe test + vitest-config | `components/WaardebepalingPdfTemplate.test.ts` rendert het document écht en telt de pagina's (ook mét lange correctiemotivatie — het langste variabele blok). Reden: react-pdf valideert zijn styles pas tijdens het renderen, dus typecheck en build zien een kapotte style-prop niet; de makelaar wel. Hiervoor moest `vitest.config.ts` JSX aanzetten: Vite 8 gebruikt oxc, dus `oxc: { jsx: { runtime: 'automatic' } }` — niet de oude `esbuild`-optie, die doet niets meer | Opus |
| Meting | 1,0 s per pdf (lat: < 10 s), één pagina in alle geteste varianten | Opus |

---

### 18 sep 2026 (sessie Opus/Sonnet) — fase 4 deel 1: waardering op echte data

| Onderwerp | Besluit | Door |
|---|---|---|
| 4.1/4.3/4.5 aansluiting | Server action `berekenWaardering(objectId, opties)`: subject uit het dossier, kandidaten via `referentiesInStraal` (max 5 km) + `haalRegionaleSet`, dan `berekenWaarderingV2()`; opslag als v2 (`WaarderingOpslagSchema`), oude v1-json wordt bij lezen gemigreerd. Wat-als-schakelaars rekenen client-side door zonder nieuwe serveraanroep. v1 (`berekenWaardebepaling` c.s.) verwijderd. `page.tsx` laadt niet langer de volledige transactietabel per dossierbezoek | Sonnet |
| Prijsindex-bron | `prijsindexKwartaal` (RPC) wordt **niet** gebruikt: die filtert alleen op subtype. `berekenWaarderingV2` bouwt de index zelf uit de regionale set (werkgebied + typegroep), gelijk aan § 3.3 en aan de backtest — productie en kalibratie blijven zo identiek | Sonnet |
| CBS-terugval | `scripts/haal-cbs-prijsindex.mjs` haalt tabel 85792NED op (regio GM0518 's-Gravenhage, code uit de metadata); `lib/cbsPrijsindexData.json` wordt **wel** gecommit — er is geen build-stap die het script draait, anders heeft productie nooit een terugval | Sonnet + Opus |
| Bug plaatsnamen | Werkgebied zegt "'s-Gravenhage", adressen zeggen "Den Haag": zonder normalisatie woog `plaatsFactorVoor()` elke referentie in dezelfde stad half mee en vond de terugval-zonder-locatie 0 kandidaten. Subject-plaats wordt nu gecanoniseerd met `plaatsenGelijk()` | Sonnet |
| 4.8 backtest | `scripts/backtest-waardering.mjs` + `lib/backtest.ts` (meetlogica gedeeld met de vitest-vangrail) + `docs/waardering-backtest.md`: 400 woningen, peildatum = dag vóór verkoop, **mediane fout 6,1 %, 76 % binnen de band** — demo-lat (≤ 7 % / ≥ 75 %) gehaald, geen aanpassing aan de bandregels. Per typegroep blijft vrijstaand het zwakst (8 %) | Sonnet |
| Mac wakker houden | Automatische hook ingetrokken op verzoek van Quinn (zie 17 sep); hij zet `caffeinate` zelf aan voor een gekozen duur | Quinn |

---

### 17 sep 2026 (sessie Opus/Sonnet, deel 2) — items 1.9c, 1.9b, 1.10

Twee Sonnet-agents parallel (1.9c app-code, 1.10 SEO — geen bestandsoverlap,
alleen typecheck parallel, build daarna door de orchestrator); 1.9b schreef de
orchestrator zelf.

| Onderwerp | Besluit | Door |
|---|---|---|
| Kerncijfertegels (1.9c) | Vijf tegels: Lopende verkoopadviezen · In verkoop · Verkocht dit jaar (kalenderjaar) · Gem. looptijd en Prijs t.o.v. vraagprijs over de **laatste 12 maanden** (was "dit jaar"; beide delen n en de weinig-data-grens). Geen dubbele tegel: de al bestaande vraagprijs-tegel is de vervanger van de winratio. `filterOpLaatsteMaanden` kreeg een datum-accessor zodat hij ook op `verkoopdatum` werkt | Sonnet |
| Mobiele topbar (1.9c) | ≤ 900 px: pillen en avatar weg, hamburger met dezelfde zes items plat onder elkaar plus het profielblok | Sonnet |
| Fasestap (1.9c) | In Verkoopadvies toont `FaseToggle` een badge + knop "Naar In verkoop" | Sonnet |
| `dod:screens` (1.9b) | Eén commando dat een draaiende server gebruikt of zelf `next dev` start (en weer stopt). Faalt op VestaAI-groen, foutstaat, `pageerror`, niet-2xx en — toegevoegd na de eerste run — **horizontale overloop**, omdat de huisstijlcheck een 596 px brede startpagina op 390 px "schoon" noemde. Login gedeeld in `scripts/lib/dodSessie.mjs`; `controleer-huisstijl.mjs` faalt nu ook bij groen (gaf eerder alleen een melding). Aangetoond: opzettelijke `throw` in `/account` → exit 1 in alle vier stappen | Opus |
| Beeldmerk (1.10) | Bestaande VestaAI-tegel (groen, witte V) uit `LandingPageClient`/`PublicNav`, geen nieuw ontwerp. `twitter-image` hergebruikt `opengraph-image` | Sonnet + Opus |
| Positionering in metadata (1.10) | Titel "VestaAI — Platform voor makelaars"; omschrijving: waardering, marktinzicht en concurrentieanalyse op eigen transactiedata, contentsuite, in de huisstijl van het kantoor | Sonnet |
| Bugs gevonden bij de controle | (1) `middleware.ts` stuurde `/opengraph-image` en `/twitter-image` naar `/login` → toegevoegd aan de publieke routes; (2) OG-beeld crashte in Satori (div met meerdere kinderen zonder flex); (3) `StartBanner` `aspect-ratio: 16/5` + `min-height: 180` dwong 576 px minimale breedte af → `height: clamp(180px, 30vw, 376px)` | Opus |
| Productiedata | Gecontroleerd (alleen lezen): 0 objecten, 0 transacties, 1 kantoor. Migratie 2.1 raakt dus geen echte data | Opus |
| Push/merge-werkwijze | Tijdens een sessie alleen lokaal committen; bij "rond af" in één keer pushen, mergen en live zetten zonder opnieuw te vragen (geen productiedata die verloren kan gaan). Toestemmingsregels voor `git push origin feat/*` en `gh pr …` in `.claude/settings.local.json` | Quinn |
| 2.1 schema v2 | Migratie `transacties_pijplijn` toegepast na back-up (`backups/2026-09-17T08-44-16-408Z/`): tabel `imports` (RLS, alleen lezen per kantoor), pijplijnkolommen op `transacties` incl. `adres_sleutel not null` en generated `prijs_m2`, unieke sleutel op `(kantoor_id, adres_sleutel, verkoopdatum)`, drie composiet-indexen (losse `kantoor_id`- en `verkoopdatum`-index gedropt: gedekt), `objecten.fase` → `verkoopadvies`, `pitch_uitslag` gedropt, view herschapen met alle nieuwe kolommen. `import_id … on delete set null` (import verwijderen mag geen transacties wissen). Typegroep/subtype zonder check-constraint (taxonomie leeft in `lib/transactieNormalisatie.ts`). `anon` ingetrokken op `imports` en de view. `scripts/controleer-schema.mjs` nieuw en groen | Sonnet + Opus |
| 2.4 foutlogging | `lib/fouten.ts` `meldFout()` (één JSON-regel, geheimen/e-mail recursief weggefilterd, geeft digest of korte referentie terug); 17 call sites in 14 API-routes, 5 nieuwe try/catch rond externe calls (Claude, react-pdf, Resend, verrijking); ook stille `.catch(() => null)`-fallbacks loggen nu (gedrag gelijk). `app/global-error.tsx` nieuw; alle drie foutschermen tonen "Er is iets misgegaan" (de DoD-scripts zoeken op die tekst) + digest | Sonnet |
| 2.3 demo-fixture | Kantoor "Demo Makelaardij" (`instellingen_json.demo = true`, neutrale leisteen-huisstijl), 7.996 transacties 2019 t/m nu (2 sleutelbotsingen uit de generator), 1.103 eigen verkopen, 167 uitgesloten, 15 dossiers (5 per fase, 4 met content), account `demo@vestaai.nl` (wachtwoord in `.env.local` `DEMO_PASSWORD`). `eigen_verkoop` = rijen waar het demo-kantoor zelf verkoper is. Geschreven na back-up `backups/2026-09-17T09-16-09-773Z/`. `tsx` als devDependency (script importeert TS uit `lib/`) | Sonnet + Opus |
| Signup-trigger | `handle_new_user` (erfenis van zelf-aanmelden) maakt bij elke nieuwe auth-user een eigen proefkantoor + admin-makelaar. `plaatsInKantoor` in de admin ruimt dat op; het seed-script deed dat niet → zwerfkantoor "Vestaai" ontstaan en weer opgeruimd, script gerepareerd. Trigger zelf hoort weg (gesloten platform) → roadmap § 9 database-hardening | Opus |
| DoD-account | `DOD_EMAIL` standaard `demo@vestaai.nl`: schermen worden met data gecontroleerd. Direct resultaat: horizontale overloop op `/marktanalyse/concurrentie` (grid zonder `minmax(0, 1fr)`) gevonden en gefixt | Opus |
| **Bug: 1.000-rijen-plafond** | Alle huidige verkenners halen transacties met één query op; PostgREST levert maximaal 1.000 rijen, dus marktanalyse, concurrentie, transacties en kaart rekenen op een willekeurige deelverzameling (marktanalyse toont "1000 transacties" bij 7.996). Wordt opgelost in 2.2 (RPC's + range-lussen); tot dan zijn de cijfers in de verkenners niet betrouwbaar | Opus |
| **Productie-incident** | Quinn mergede PR #17 terwijl mijn commits van vandaag niet gepusht waren (push geblokkeerd): `main` = code van fase 1.1-1.8, database al op schema v2 → `/dashboard` crashte op `pitch_uitslag`. Opgelost met PR #19 (push + merge), gecontroleerd op www.vestaai.nl met beide accounts, geen runtime-errors. Les in CLAUDE.md: brekende migraties alleen samen met push + merge | Opus |
| 2.2 query-laag | `lib/transactiesQuery.ts` is de enige plek die `transacties`/de view/transactie-RPC's aanspreekt (guard-test), altijd met de sessie-client zodat RLS geldt. RPC's `marktanalyse_reeks`, `_samenvatting`, `concurrentie_marktaandeel`, `_segmenten`, `transacties_zoeken`, `prijsindex_kwartaal`, `referenties_in_straal` (invoker, stable, `uitgesloten_reden is null`): 75-200 ms op de fixture, vergelijkingstests tegen de pure functies groen (`SUPABASE_TEST=1`). **Tussenfase:** verkenners krijgen alle rijen via `haalTransactiesVoorVerkenner` (range-lus, ~1,2-1,6 s) en houden hun UI tot fase 6. Straal-test met 0,5 % randmarge (PostGIS-ellipsoïde vs. haversine-bol). Transactietabel pagineert per 50 (rendering van 7.800 rijen brak de screenshot en was traag) | Sonnet + Opus |
| Fixture-datums | Generator maakte 33 verkopen na vandaag (dag gekozen binnen het kwartaal); nu vaste peildatum `2026-09-17` als bovengrens, test toegevoegd, fixture opnieuw geseed met `--reset` na back-up | Opus |
| 2.5 kerncijfers | Zes tegels zoals het prototype: Verkocht laatste 12 mnd (+ delta t.o.v. de 12 ervoor) · Gem. looptijd (vs. markt) · Marktaandeel eerste werkgebiedplaats · Prijs t.o.v. vraagprijs · In verkoop · Lopende verkoopadviezen; elk met n en "data t/m". "Markt" = eerste werkgebiedplaats, laatste 12 mnd (één RPC-call). Plaatsnaam-normalisatie (`'s-Gravenhage` ↔ Den Haag, diakrieten) in `lib/kerncijfers.ts`. Demo: 159 verkocht (+10,4 %), 57 dgn (markt 58), marktaandeel Wassenaar 17 % (62/364), −1 % t.o.v. vraagprijs. Test ving een dubbeltelling (vorige-12-maanden-venster zonder bovengrens) | Sonnet |
| 3.1/3.3 dossier los van content | Migratie `object_content_status` (additief): `content_status` (geen/bezig/klaar/fout), `content_gegenereerd_op`, `content_bezig_sinds`. `outputs_json` blijft `not null`; nieuw dossier krijgt `LEEG_CONTENT_OUTPUT` (nullable maken had null-checks in pdf/export/tabs gekost). Lock-claim atomair in één `update … where`. Auto-generatie bij In verkoop vanuit de client (fire-and-forget fetch), niet vanuit de server action — de aparte request houdt zijn eigen functieduur. `LoadingProgress` (nep-pijplijn van 2 min) weg; rate-limit-map en 7-daagse cache weg. `object/new` nooit meer achter `CONTENT_VERGRENDELD`. Getest als demo-gebruiker op een productiebuild: aanmaken 1,2 s, 400 zonder Verhaal, 409 bij dubbele start, generatie 189 s → `klaar`, lege staat en contentweergave visueel gecontroleerd; testdossiers daarna verwijderd | Sonnet + Opus |
| 3.2 intake | `woningtype_groep` + `woningtype_sub` i.p.v. de oude 6-waarden-enum; oude `input_json` wordt bij het parsen gemapt (geen datamigratie). `usps`/`doelgroep` optioneel; wizardstap 5 en 6 "kan later". `prijsverwachting_verkoper` via `setValueAs` (leeg veld gaf `NaN`) | Sonnet |
| 3.4 dossierheader | `components/DossierHeader.tsx` vervangt `FaseToggle`: adres + kenmerken, fasestepper (alleen naastgelegen stappen klikbaar; terugzetten met bevestiging), "X dagen in fase" via nieuwe kolom `objecten.fase_sinds` (additieve migratie). Generatie-trigger bij In verkoop verhuisd, niet gedupliceerd. `VerkoopadviesPaneel`/`InAanbouw` weg tot fase 11 | Sonnet |
| Fixes na review 3.x | (1) Backfill `content_status` telde lege demo-dossiers (structuur met lege strings, niet `{}`) als `klaar` → gecorrigeerd op `funda_tekst`, migratiebestand aangepast, seed-script zet de status nu zelf. (2) `woningtypeLabel()` normaliseert zelf oude `input_json` (de dossierpagina geeft ruwe JSON door; kenmerkenregel begon met "·") | Opus |
| Werkwijze-les agents | Typecheck groen ≠ build groen: `next build` draait ook ESLint (ongebruikte variabelen in een test braken de build). Agents die geen build mogen draaien (parallel werk) laten de orchestrator altijd `npm run build` doen vóór commit | Opus |
| Mac wakker (ingetrokken 18 sep) | Kort een SessionStart-hook gehad die `caffeinate` startte; op verzoek van Quinn weer volledig verwijderd (hook, script, geheugen) — hij zet het liever zelf handmatig aan voor een bepaalde duur | Quinn |
| Migratiehistorie | De migraties van 16 sep (transacties, object_fase, …) staan niet in `supabase_migrations` — via de SQL-editor gedraaid. Echte staat daarom uit `information_schema` gehaald; `controleer-schema.mjs` bewaakt voortaan de verwachte kolommen | Opus |

---

### 17 sep 2026 (sessie Opus/Sonnet) — item 0.1: prototypes bijgetrokken naar het referentiebeeld

Orchestrator Fable → Opus (Fable-bestedingslimiet halverwege), bouwers vier
Sonnet-agents (één per bestand). Tussen de bestanden gedeelde wijzigingen deed
de orchestrator zelf, zodat de agents elkaar niet in de weg zaten.

| Onderwerp | Besluit | Door |
|---|---|---|
| Topbar kit | `K.topbar({ actief })` plat met zes pillen, geen subnav; alle zes call-sites mee aangepast. De dossier-tabs in `waardebepaling.html` gebruiken de `.subnav`-stijl nog, dus die CSS blijft staan | Opus |
| Overlays | Blur weg uit de gedeelde `.sluier` in `kit.css` (gold voor alle prototypes, dus centraal i.p.v. een lokale override in marktanalyse) | Opus |
| Transacties | Kit-tegelrij (hero "transacties in selectie" + vier tegels met n, delta t.o.v. vorige periode en 8-kwartalen-sparkline), tabel in `.kaart` met kaartkop en segmented sortering, notificatie-stip op "Exporteer CSV". De rode `tellerbadge`-pil is weg: rood vlak, niet toegestaan (README regel 2b); het aantal staat nu in de hero. Hero-delta neutraal (meer transacties is niet gunstig of ongunstig) | Sonnet, 1 correctieronde |
| Verkoopkaart | Losse `.inbeeld`-strook → kit-tegelrij; kaart en lijst elk in een kaart met kaartkop; leeg-overlay zonder blur. Geen "vorige periode" (tijdlijn is een bereik), dus bijschrift "n = … · in de selectie" i.p.v. een delta | Sonnet, 1 correctieronde |
| Marktanalyse | Stond al op de norm; alleen een 3 px accentstreepje op de titel van het kwartaalbericht zodra het klaar is | Sonnet |
| Startpagina | Snelkoppelingen, winratio-tegel (→ "Prijs t.o.v. vraagprijs", n = 112) en pitch-uitslag weg; "Pitch gewonnen" → "Verkoopadvies verstuurd"; "Lopende acquisities" → "Lopende verkoopadviezen"; "Content volgt na gunning" → "Content volgt vanaf In verkoop" (gunning is ook pitch-taal). Interne sleutel `acquisitie` blijft, zoals in de app tot 2.1 | Sonnet + Opus |
| Waardebepaling | Fasestap "Acquisitie" → "Verkoopadvies" | Opus |
| Ontwerpreview | Screenshots op 1280 px (Playwright, `file://`), beoordeeld tegen concurrentie/startpagina/waardebepaling: **alle zes AKKOORD**, geen console-fouten | Opus |
| Kit-leemtes | Naar roadmap § 9: gedeelde sparkline-helper, `.btn:disabled`, mobiele topbar | Opus |
| Artifacts | Herpubliceren geblokkeerd door de auto-mode-classifier (upload naar claude.ai). Niet omzeild; staat als actie bij Quinn (roadmap § 8, punt 12). Links hieronder tonen dus nog de versie van vóór 0.1 | — |

**Werkwijze-les:** een hervatte subagent (SendMessage) draait op het model van
de orchestrator op dat moment, niet op Sonnet. Voor correctierondes daarom een
nieuwe agent starten met `model: sonnet` en een zelfstandige opdracht.

---

### 17 sep 2026 (laatste Fable-sessie) — rekenkern waardering, proefrit 1.9, vier ontwerpprototypes

Laatste dag met Fable 5.1 als "brein" (daarna alleen Sonnet). Werkverdeling:
Sonnet-subagents bouwden (op het abonnement, geverifieerd door Quinn), Fable
schreef alleen de statistisch lastige module zelf en deed de reviews.

| Onderwerp | Besluit | Door |
|---|---|---|
| Rekenkern waardering (fase 4) | Gebouwd als pure TypeScript naast de `@deprecated` v1: `lib/waardering.ts` v2, `lib/prijsindex.ts`, `lib/cbsPrijsindex.ts`, schema's in `lib/schemas.ts`, 22 + 13 tests, synthetische backtest als vitest-vangrail (`lib/waardering.backtest.test.ts`, generator `lib/waardering.synthetisch.ts`). Methode in makelaarstaal met rekenvoorbeeld (= testcase) in `docs/waardering-methode.md`; dat document gaat naar de taxateur van i4 Housing voor de tussencheck (§ 8 actie 6) | Fable |
| Bandbreedte | Gewogen **P10–P90** i.p.v. P25–P75: een interkwartielband dekt per definitie maar de helft van de uitkomsten en haalde in de backtest 72 %; P10–P90 haalt 78 %. `BAND_PERCENTIELEN` is de kalibratieknop voor de echte backtest (4.8). Minimale marge ± 5 / 10 / 15 % bij n ≥ 6 / 4-5 / < 4 (de "+5/+10 punt"-regel was dubbelzinnig) | Fable |
| Correcties per referentie | Zonder correcties werden slecht gelabelde woningen 9 % en grotere woningen 3,6 % overschat. Daarom correcties zoals in een taxatierapport: prijsniveau per klasse (garage, tuin, labelklasse, bouwperiode) op de regionale set + Theil-Sen-helling voor grootte; alleen bij ≥ 30 verkopen per klasse, begrensd ± 15 % per kenmerk / ± 30 % totaal, per kenmerk schakelbaar en per referentie zichtbaar. Geen multivariate regressie (§ 3.3 blijft staan) | Fable |
| Plaatsfactor | Een verkoop in een andere plaats telt voor de helft mee in het gewicht (prijsniveaus verschillen per gemeente meer dan afstand verklaart) | Fable |
| Datalaag ↔ rekenkern | RPC's leveren `Kandidaat`-rijen en de `bouwIndex()`-vorm; `haalRegionaleSet()` vervangt de geplande RPC `kenmerk_paren` zodat er één implementatie van de methode is (roadmap 2.2/4.5) | Fable |
| CBS-terugval | StatLine-tabel **85792NED** (prijsindex 2020=100, regio) vastgelegd in `lib/cbsPrijsindex.ts`; regiocode uit de metadata halen, niet raden | Fable |
| Proefrit Sonnet (item 1.9) | Zie de entry hieronder. Uitkomst: specs en skills waren goed genoeg; het gat zat in de DoD-tooling (huisstijlcheck gaf groen op een gecrashte startpagina). Gefixt + item 1.9b | Fable/Sonnet |
| Ontwerpsessies | Alle vier resterende prototypes gebouwd door Sonnet en door Fable gereviewd met één correctieronde elk: `concurrentie.html` (balkvulling, trend over alle jaren, korte namen, overlay zonder blur), `transacties.html` (kleurcodering ratio, paginascroll met sticky kop, overlay, kopregel), `startpagina.html` (placeholders neutraal zodat er één hero blijft, acquisitie als standaardstaat), `waardebepaling.html` (eyebrow, drie-standen-chips voor correcties i.p.v. vijf rode toggles). Overlays dimmen voortaan zonder blur; een groep schakelaars gebruikt chips, de rode kit-toggle blijft voor losse schakelaars | Fable |
| README § 4 | Concurrentie filtert op plaats/wijk, type, periode en prijsklasse (5 klassen); "verkopend kantoor" is daar geen filter maar "verberg dit kantoor"; Segment B op Concurrentie naar backlog | Fable |
| Kit-beperking | Topbar heeft geen mobiele stand; prototypes worden op 1280/1440 beoordeeld, de app heeft zijn eigen `AppTopbar`. Centraal oplossen in kit.css staat op de backlog | Fable |
| Datums | Alles van de nacht 16→17 sep stond als 17-18/18 sep gelogd; git-log is leidend, overal gecorrigeerd | Fable |
| Geen pitch-concept | De opdracht is zo goed als binnen zodra het verkoopadvies op papier staat; er zijn geen gewonnen of verloren pitches. Winratio, `PitchScorebord`, pitch-uitslag en alle "pitch"-teksten verdwijnen (item 1.9c; kolom vervalt in 2.1). Fase "Acquisitie" heet voortaan **"Verkoopadvies"** (Quinn, 17 sep, avond): label overal direct (1.9c), interne waarde `acquisitie` → `verkoopadvies` in schema v2 (2.1) met bijwerking van bestaande rijen | Quinn |
| Navigatie plat | Topbar zonder dropdowns: Overzicht · Woningdossier (knop naar `/woningen`) · Marktanalyse · Transacties · Concurrentie · Verkoopkaart. Quinn noemde "alle 3 onderdelen uit marktinzichten"; de verkoopkaart is de vierde en is als losse pil meegenomen (aanname, terugdraaien = één pil weg). "Woning toevoegen" verhuist naar de kop van `/woningen`; snelkoppelingen op de startpagina vervallen | Quinn |
| Feedback Quinn op de prototypes | De drie nieuwste (`concurrentie`, `startpagina`, `waardebepaling`) zijn het referentiebeeld voor álle schermen; `transacties.html` wijkt af (kale tabelpagina) en `marktanalyse`/`verkoopkaart` gaan ook naar dat beeld; overal 2-3 kleine rode accentdetails terug (Quinn miste ze). Vastgelegd als README § 1 referentiebeeld + regel 2b; bijwerking = roadmap mini-item 0.1 (Sonnet, eerste sessie) | Quinn |

Artifact-links (prototypes, gepubliceerd 17 sep):
concurrentie https://claude.ai/artifact/3Q3toKB4sENg3yRKmvVXoU ·
transacties https://claude.ai/artifact/FU2FbGSxhrkurHkvEadQe5 ·
startpagina https://claude.ai/artifact/Va49HD5pyFyAmafBVJnDzB ·
waardebepaling https://claude.ai/artifact/H1hunisisuRxJLPNHsaXWm
(marktanalyse en verkoopkaart: zie de entry van 17 sep "ontwerprichting").

**Opgeleverd (17 sep, Fable):** commits 9824a37 (rekenkern), b5aa393 (1.9 +
review), 5643720 (CBS), 1b101bb (6.2/6.3), c493fb9 (startpagina) en de
slotcommit met waardebepaling. Synthetische backtest: 400 woningen, mediane
fout 5,2 %, 78 % binnen de band. Volgende sessie (Sonnet): `/sessie-start` →
item 1.9b.

## Besluiten

### 17 sep 2026 (proefrit) — item 1.9 bugs + fallback-opruiming gebouwd

Losse testsessie (proefrit: bouwt Sonnet zelfstandig een item op basis van
CLAUDE.md + de skills + de roadmap-spec, zonder tussentijdse vragen) leverde
roadmap-item **1.9 Bugs + fallback-opruiming** (a) t/m (e) volledig af.
Eigen beslissingen bij spec-ambiguïteit, telkens genomen zonder Quinn te
kunnen raadplegen:

| Onderwerp | Besluit | Door |
|---|---|---|
| `--merk-licht` | Nieuw token, apart van `--merk-zacht` (die blijft de bijna-witte achtergrondtint): `lichter(primair, .25)`, bedoeld voor verlopen (hero-tegel). `docs/ontwerp/README.md` § 2 en roadmap 1.9e spraken elkaar tegen over of dit een nieuw token was of een hernoeming van `--merk-zacht` | sessie |
| `--merk-diep` | Bleek al te bestaan in `lib/branding.ts` — roadmap 1.9e noemde 'm abusievelijk als "nieuw toe te voegen"; ongewijzigd gelaten, geen dubbel token | sessie |
| Centrale fallback-kleuren (`:root` in `app/globals.css`, 1.9b) | Exact herberekend via de bestaande `donkerder()`/`lichter()`-functies op `VESTA_MERK`, niet overgenomen van de onderling verschillende hexjes die al los in components stonden (bleken 4-5 varianten per token te zijn, nooit consistent) | sessie |
| `var(--merk-rgb, 26,107,69)`-fallbacks | Ook opgeruimd, niet alleen de hex-varianten die spec (a)/(c) letterlijk noemen — zelfde soort lek (kapotte kantoor-lookup onzichtbaar) | sessie |
| `bg-green-100`/`text-green-900` (StatusToggle, FaseToggle ×2, StatistiekenPaneel) | Vervangen door `var(--merk-zacht)`/`var(--merk-hover)` — hardgecodeerd Tailwind-groen, geen `var()`-fallback dus strikt buiten spec (a)'s tekst, maar wel de met naam genoemde "Raakt"-bestanden en het item-doel ("laatste zichtbare groen weg") | sessie |
| `StatusToggle.tsx:10` kapotte class | `bg-[var(--merk-zacht,#EAF5EE)]0` had een stray `0` ná de Tailwind-arbitrary-class (dus geen geldige utility, geen kleur); weggehaald, de statusdot gebruikt nu een solide `var(--merk)` i.p.v. de zachte tint | sessie |
| Demo-knop "Vul een voorbeeld in" (`NewObjectForm.tsx`) | Achter `process.env.NODE_ENV !== 'production'`. `instellingen_json.demo` bestaat nog niet (komt in fase 2) en `lib/schemas.ts` was deze sessie verboden terrein — dus alleen de "dev"-helft van "alleen in dev/demo" gebouwd; "demo"-helft is een openstaand vervolgpunt | sessie |
| `scripts/controleer-huisstijl.mjs` | Uitgebreid met een uitzondering voor de "VestaAI × kantoor"-lockup (`title="VestaAI"`, bewust groen per CLAUDE.md) en een `--width`-flag. Zonder de uitzondering meldt het script op élke pagina groen en is "meldt niets" (roadmap 1.9 Klaar-als) nooit haalbaar; `--width` was nodig omdat `scripts/screenshots.mjs` lokaal niet draait (zie hieronder) | sessie |
| `scripts/repair-i4housing-branding.mjs` | `MERK.vorm` stond nog hardgecodeerd op `'strak'` — zonder fix zou `--write` de besluit-wijziging (17 sep, strak → zacht) juist weer hebben teruggedraaid. Dry-run bevestigde vóór de fix `"vorm": "strak"` in de live database; ná `--write` staat hij op `"zacht"` | sessie |

**Opgeleverd (17 sep, proefrit):** item 1.9 (a)-(e) — zie
`docs/roadmap.md` § Stand van zaken voor status en het volledige
bevindingenrapport (documentatie-onduidelijkheden) in de sessie-uitvoer.
DoD: typecheck/test/build groen, `controleer-huisstijl.mjs` schoon op
390/1280/1920 px over 9 pagina's, `--write` op de i4housing-huisstijl
uitgevoerd. **Openstaande bevinding (niet gefixt, buiten scope 1.9):**
`/dashboard` gooit op elke breedte een harde runtime-fout ("Functions
cannot be passed directly to Client Components") — `Kerncijfers.tsx`
(server component) geeft inline pijl-functies door aan `opmaak`-props van
`StatTile` (client component). Bron: `app/(app)/dashboard/Kerncijfers.tsx:37,46,53`.

**Vervolg (Fable, 17 sep, review van de proefrit):** de crash is gefixt
(`'use client'` op `Kerncijfers.tsx`; props zijn allemaal serialiseerbaar) en
gecontroleerd met een screenshot. Belangrijkste les: `controleer-huisstijl.mjs`
meldde "schoon" op een gecrashte pagina — het script faalt nu (exit 1) op de
foutstaat, de Next-overlay en `pageerror`. De rest van de tooling-oogst
(`screenshots.mjs` lokaal kapot: `E2E_TEST_EMAIL` + redirect naar productie)
is roadmap-item **1.9b** geworden, vóór 1.10; DoD § 4 en de skills
`sessie-afronden`/`ontwerpreview` verwijzen tot dan naar
`controleer-huisstijl.mjs --width=<px>`. Overige spec-onduidelijkheden zijn
verwerkt: README § 2 (tokens), item 2.3 (demo-knop tweede helft + hergebruik
van de synthetische generator). Datumcorrectie: alles van de nacht 16→17 sep
stond als "17-18/18 sep" gelogd; de git-log is leidend, dus overal 16-17/17 sep.
Oordeel over de proefrit zelf: Sonnet bouwde 1.9 volledig en nam
verdedigbare beslissingen bij elke onduidelijkheid; het enige echte gat zat
in de tooling, niet in de specs. Werkwijze v2 blijft staan.

### 17 sep 2026 (later) — ontwerprichting "i4 · zacht" + filtermodel

Quinns reactie op de eerste prototypes: meer i4housing (blauw én rood
zichtbaar), afgeronde hoeken, professionele Apple-achtige stijl, véél meer
filteropties met dropdowns en meer variabelen, kaart met iets meer kleur en
huisjes die op het logo lijken. Niet bouwen, wél alles vastleggen zodat het
morgen in één keer goed gaat.

| Onderwerp | Besluit | Door |
|---|---|---|
| Vorm i4 Housing | `huisstijl_json.vorm` van `strak` naar **`zacht`** (radius 10-20 px). Wordt gezet in item 1.9 via het repair-script; CLAUDE.md-tekst "knoppen zonder afronding" is achterhaald | Quinn |
| Stijlrichting | **Apple-achtig**: frosted balken, segmented met schuivende thumb, dropdown-filters als pillen, zachte schaduw met zweem merkkleur, hero-tegel in blauw verloop, ambient-verlopen op de achtergrond. Vastgelegd in `docs/ontwerp/README.md` § 1 en `docs/ontwerpprincipes.md` | Quinn / plan v2 |
| Rood terug | Accentkleur zichtbaar: echt logo in de topbar, live-stip, tel-badges op filters, segment B, pin-omlijning + stokje, schakelaar-aan. Nooit semantisch (ongunstig = amber) | plan v2 |
| Filtermodel | Dropdown-popovers met samenvatting en tel-badge; plaats/wijk met zoekveld; woningtype-taxonomie (4 groepen × 20 subtypes); schuivers voor prijs/oppervlak/bouwjaar/perceel; energielabel-chips; kamers; kenmerken; t.o.v. vraagprijs; looptijd; verkocht door (teamlid); verkopend kantoor; actieve filterpillen; alles in de URL. Tabel per verkenner in `README.md` § 4; `TransactieFilterSchema` en kolom `woningtype_sub` volgen eruit (roadmap § 3.1, 2.1, 3.2) | plan v2 |
| Kaart | PDOK **pastel** i.p.v. grijs; pin = **mini-beeldmerk** (blauwe ruit, rode omlijning, wit hart, rood stokje) afgeleid van het i4-logo (`i4-Housing-logo-231x77-1.png` van i4housing.nl); hover-kaart met makelaar; filter "Verkocht door" | Quinn / plan v2 |
| Gedeelde kit | `docs/ontwerp/kit.css` + `kit.js` = tokens en primitives voor álle prototypes én de spec voor `globals.css`/`components/ui`; nieuwe tokens `--merk-diep/-licht/-accent-zacht/-rand/-rgb`, `--control`, `--goed/--let` | plan v2 |
| Artifacts v2 | Marktanalyse https://claude.ai/artifact/W3319zFnBY52XkspasLFfi · Verkoopkaart https://claude.ai/artifact/Qy5Ny5c9Hs39GTNxUFJkNm (zelfde URL's als v1, opnieuw gepubliceerd met de kit) | plan v2 |

### 17 sep 2026 — ontwerpspoor voor interactieve verkenners (roadmap § 3.8)

Aanleiding: Quinn wil dat de verkenners (marktanalyse, transacties,
concurrentie, verkoopkaart) "Claude-artifact-achtig" professioneel worden en
niet tekstueel/amateuristisch, in i4housing-huisstijl.

| Onderwerp | Besluit | Door |
|---|---|---|
| Prototype = spec | Voor elk hero-scherm bestaat vóór de bouw een interactief HTML-prototype in `docs/ontwerp/` (kantoorhuisstijl, synthetische data, alle staten). Sonnet port het 1-op-1; de tekst-spec is samenvatting, niet bron. v1's "direct bouwen, geen mockups" is hiermee herzien voor hero-schermen | plan v2 |
| Wie ontwerpt | Ontwerpsessies op een sterk ontwerpmodel (Fable/Opus) of via Claude Design; 1 sessie per prototype; resultaat altijd als bestand in de repo | plan v2 |
| Primitives | Interactieprimitives uit Radix (shadcn/ui-patroon) + TanStack Table, gethemed via `--merk*`; zelf bouwen alleen wat Radix niet levert. Nieuw item 6.0 | plan v2 |
| Grafiekthema | Geen library-defaults; wij = merk met vlak, markt = donker neutraal (referentielijn, bewust geen categorie), segment B = accent; directe eindlabels met botsingscorrectie; eigen tooltipkaart | plan v2 |
| Review | Skill `ontwerpreview`: screenshot app naast screenshot prototype, beoordeeld door subagent met vision + checklist; onderdeel van de DoD voor hero-schermen | plan v2 |
| Eerste prototypes | `docs/ontwerp/marktanalyse.html` en `docs/ontwerp/verkoopkaart.html` opgeleverd (Fable, 17 sep) | plan v2 |

### 17 sep 2026 — klantvoorstel v1 voor i4housing opgesteld (nog niet verstuurd)

`docs/voorstel-i4housing.html` (bron, logo inline) + `.pdf` (Playwright-render,
2 pagina's A4, i4housing-huisstijl, informele toon, "ik"-vorm). Pagina 1:
datakoppeling (Realworks + NVM/Brainbay + open data → dataset alleen van
i4housing → waardering, marktanalyse, concurrentie, i4housing-kaart), het
verkoopadvies dat voortaan op die vier is gebaseerd, en "het wordt steeds
beter" (leert van verkopen en tekstaanpassingen; pitch/fases bewust niet genoemd). Pagina 2: één
kostenlijst (Vercel Pro, Supabase Pro, Claude API, Claude Pro, domein/e-mail,
beheer 5 uur/mnd à € 20 = € 100), bij elkaar ± € 200; voorstel € 250/mnd excl. btw
(12 mnd vast, geen "afgerond"-regel en geen tariefdatum in het document); bouw t/m demo € 0; maandelijks, geen looptijd. Bewust
weggelaten (Quinn, 17 sep): afspraken, benodigdheden, planning, handtekening,
virtual staging.

### 16-17 sep 2026 — masterplan herzien naar v2 ("demo-backwards")

Aanleiding: Quinn liet het masterplan van 16-17 sep kritisch tegen het licht
houden (Fable 5.1 als medeoprichter-brein), met als eis dat Sonnet het plan
daarna zonder verdere uitleg tot een topproduct kan uitwerken. Vier vragen
zijn vooraf door Quinn beantwoord; de rest zijn plankeuzes.

| Onderwerp | Besluit | Door |
|---|---|---|
| Brainbay-export | Bevat **regionale NVM-transacties van álle kantoren** in het werkgebied, incl. verkopend kantoor. Duizenden rijen; concurrentieanalyse is dus echt mogelijk | Quinn |
| Demo-data | De demo draait op **i4housing's eigen data in hun eigen omgeving**. Het demo-kantoor ("Demo Makelaardij") wordt ontwikkel-fixture en noodterugval, geen demo-podium | Quinn |
| Tussencheck | **Eén gerichte tussencheck** vóór de grote demo is toegestaan: één waardebepaling-pdf van een recente eigen verkoop naar hun taxateur ("klopt dit ongeveer?"). Lost de tegenspraak tussen `goals.md` (kort-cyclisch) en het masterplan (één demo) op | Quinn |
| Verkoopadvies | Blijft wachten op Quinns voorbeelddocument. Wél wordt het datacontract alvast vastgelegd zodat de bouw daarna één sessie kost | Quinn |
| Planmethode | **Demo-backwards**: het demoscript (6 scènes) staat vooraan in de roadmap; elke fase dient een scène. Wat in geen scène zit is polish en staat in de schrapvolgorde | plan v2 |
| Data eerst | Vóór elke verkenner of waardering komt een **realistische synthetische demo-fixture** (werkgebied Wassenaar e.o., duizenden regionale rijen + ~150 eigen verkopen/jaar). Niemand bouwt nog tegen 0 rijen | plan v2 |
| Datalagen | Drie lagen, vastgelegd in `lib/transactiesQuery.ts` (de enige module die `transacties` bevraagt): regionaal → aggregatie in Postgres (RPC's); eigen verkopen → compacte projectie client-side; referenties → `ST_DWithin`-RPC | plan v2 |
| Import | Primair via **script** (`scripts/import-transacties.mjs`, concierge-model, dry-run standaard) i.p.v. een upload-UI met 1 MB-limiet. `/admin/transacties` toont importhistorie, kwaliteitsrapport en terugdraaiknop | plan v2 |
| Dossier ≠ content | Een dossier aanmaken is **direct** (geen wachttijd op Claude). Content wordt pas gegenereerd bij de overgang naar In verkoop of op knopdruk. Scheelt kosten voor verloren pitches en maakt de acquisitiescène demo-bestendig | plan v2 |
| Prijsindex | Kwartaalindex **uit de eigen regionale dataset** (mediaan €/m² per kwartaal, per woningtypegroep, gladgestreken); CBS-prijsindex bestaande koopwoningen alleen als terugval bij te weinig regionale data | plan v2 |
| Contentsjabloon | Het i4housing-format (4SALE! · WOONCOMFORT · BUITENLEVEN · LOCATIE · GOED OM TE WETEN · vaste slotzin, ±480 woorden, NL+EN) wordt een **gestructureerd `tekstsjabloon`** in `HuisstijlConfig`, niet een prompt-hint. Outputset teruggesnoeid tot wat i4housing gebruikt, plus een **sneak-preview-WhatsApp-bericht** (hun eigen kanaal) | plan v2 |
| Kwartaalbericht | De "kwartaalcijfers-generator" gaat van de backlog naar het kernplan: i4housing publiceert nu handmatig kwartaalcijfers; dit wordt scène 2 van de demo | plan v2 |
| Primitives | **Geen losse primitives-fase.** `FilterBar`/`useFilterState`/`lib/opmaak.ts`/`ChartCard`/`grafiekThema` worden gebouwd in dezelfde sessie als hun eerste gebruiker (marktanalyse); `RangeSlider` bij de kaart; `DataTable`/`Drawer` bij transacties zoeken. Geen `/admin/ui`-showcase | plan v2 |
| Kaarttechniek | **MapLibre GL + PDOK BRT-vectortiles (grijze/pastelstijl)** is de keuze; geen aparte spike-sessie, wel een time-boxed proof van één uur aan het begin van de kaartfase. Faalt CSP of performance, dan Leaflet met canvas-renderer | plan v2 |
| Foutlogging | `global-error.tsx` + `error.tsx` + `lib/fouten.ts` gaan naar Fase 2 (vroeg), niet naar de demo-fase — je wilt weten wat er misgaat terwijl je bouwt op echte data | plan v2 |
| Logboek | Besluitenlogboek en opleverlog verhuisd van `docs/roadmap.md` naar dit bestand, zodat de roadmap een werkplan blijft dat elke sessie goedkoop te lezen is | plan v2 |
| Vercel | Team staat op **Hobby**. Vóór de demo naar Pro (zie roadmap § Acties Quinn): de generate-route (`maxDuration 300`) en staging (120 s) mogen in de demo niet afkappen | plan v2 |
| Verhuur | Blijft buiten scope (besluit 16-17 sep). Genoteerd als observatie: i4housing voert aantoonbaar 4RENT!-teksten en heeft een afdeling Beheer — na de demo heroverwegen, het tekstsjabloon ondersteunt 4RENT! zonder extra werk | observatie |

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
  (self-signup op providerniveau uitzetten blijft wel een actie, als tweede
  verdedigingslinie).
- Alle betrokken tabellen waren op het moment van de fix leeg (0 rijen), dus
  geen back-up nodig vóór deze specifieke actie — het back-upscript (0.2)
  is desondanks gebouwd en getest, voor elke volgende risicovolle stap.

**Les voor de rest van het plan:** DDL die buiten `apply_migration` om wordt
uitgevoerd (bijvoorbeeld via de SQL Editor) komt niet in de migratiehistorie
terecht — dit is precies hoe de 16-sep-migraties "onzichtbaar" konden blijven
terwijl hun effect allang op de database stond. Vanaf nu gaat elke
schemawijziging via `apply_migration` (zie sessie-afronden-skill).

### 16-17 sep 2026 — masterplan "demo-klaar" (v1)

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
| Demo | Eén grote demo; ~~neutraal demo-kantoor voor data, i4housing-omgeving voor look-and-feel~~ → herzien 16-17 sep: eigen data in eigen omgeving |
| Verkoopadvies | Wacht op het voorbeelddocument van Quinn |
| Ontwerp | Direct bouwen, geen mockups. Compensatie: harde ontwerpstandaard + zelfreview via screenshots |
| Database | Blijft productie. **Supabase Pro zo lang mogelijk uitstellen**, daarom eigen back-ups + vangrails |
| Hosting | Beide gratis. Vercel Pro vóór het eerste betaalde contract → herzien 16-17 sep: vóór de demo |
| Apparaten | Laptop/desktop. Keukentafel-modus → backlog |
| Idee-bundel (waardecheck-widget, ROI-dashboard, prijsadvies) | Geparkeerd |
| Werkwijze | Opus plant, Sonnet bouwt (`/model opusplan`); dagelijks een sessie → herzien 16-17 sep: item-specs in de roadmap zijn Sonnet-klaar |

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

## Opgeleverd

- 28 sep 2026 — PR `feat/sessie-28sep-g`: G1 websiteveld in de huisstijl
  (admin-formulier, brochure-pdf, presentatiemodus).
- 28 sep 2026 — PR `feat/sessie-28sep-f`: segmentvergelijking A vs. B op
  marktanalyse, presentatiemodus-polish.
- 28 sep 2026 — PR #38 `feat/sessie-28sep-d` (+e): presentatiemodus, env:check,
  RLS `objecten` kantoorbreed + initplan-fix + FK-indexen, Wij vs. markt mobiel.
- 28 sep 2026 — PR `feat/sessie-28sep-d`: presentatiemodus waardebepaling,
  `.env.example` + `npm run env:check`.
- 28 sep 2026 — PR `feat/sessie-28sep-c`: verouderde "nog niet toegepast"-commentaren
  en terugvalcode opgeruimd, filter-poets (Wis op Plaats, merk-accent-fallbacks,
  `bereikGelijk`), pdf-subject-pin zichtbaar bij donkere merkkleur.
- 28 sep 2026 — PR `feat/sessie-28sep-b`: ⌘K-zoeken, buurtgrenzen op de
  verkoopkaart, gedeelde filtervergelijkers, concurrentie-RPC-status geverifieerd.
- 28 sep 2026 — PR `feat/sessie-28sep`: kaart in de waardebepaling-pdf, repetitie
  scène 4 met BAG-toets, Plaats-pil consistent op drie verkenners.
- 27 sep 2026 — PR `feat/sessie-27sep-d`: **12.5b** repetitiescript, BAG-autocomplete
  en voorvullen gerepareerd, "Wis" op Plaats, omweg vorige periode weg,
  minikaart naar `kaart/`, combobox-ARIA.
- 27 sep 2026 — PR `feat/sessie-27sep-c`: **12.5a** demoscript, één dossierkaart
  (referenties + eigen verkopen als lagen), minikaart in de transactie-sheet,
  backlog-poets (extra's met documenten, publieke footer, hook-regex, smoke-e2e).
- 27 sep 2026 — PR `feat/sessie-27sep-b`: **8.4, 10.5** (fase 10 af), intake stap 5
  opgeruimd, kaarten lazy in het dossier, transacties-terugval.
- 27 sep 2026 — PR `feat/sessie-27sep`: **8.3, 9.2, 12.3, 13.2** (fase 9 en 13
  af) + i4housing-tekstsjabloon in de database.
- 27 sep 2026 — PR `feat/sessie-26sep` (parallelle Sonnet-agents, Opus-review):
  **7.3, 7.4 (fase 7 af), 8.2, 9.3, 12.2** — één kaartstack zonder Leaflet,
  tekstsjabloon-model, uitgebreide huisstijlcheck incl. pdf's, e2e-suite met RLS-test.
- 26 sep 2026 — PR #29 `feat/sessie-24sep`: **6.4, 7.2, 10.1, 10.2**, Buurt &
  data gerepareerd, WOZ zelf invullen.
- 24 sep 2026 — PR `feat/fase-6` (parallelle Sonnet-agents, Opus-review):
  **6.1, 6.2, 6.3, 7.1, 8.1, 9.1, 10.3, 10.4, 10.6, 12.4, 13.1**; zeven migraties
  toegepast na back-up; kantoorkleuren in portals, CSP voor Plausible.
- 23 sep 2026 — bugfix: profielmenu in de topbar viel weg achter de pagina
  door `overflow: hidden` op de topbar-rij; direct live (PR #26).
- 19 sep 2026 — item **6.0**: Radix-primitives (`Sheet`, `Popover`, `Slider`,
  `Tooltip`, `SelectMenu`, `Tabs`) + TanStack Table, gethemed via `tokens.ts`
  en `var(--merk*)`, zónder shadcn-classlaag; drawer van 4.4 overgezet op
  `Sheet`; `e2e/auth.setup.ts` gerepareerd (magic-link redirect naar productie
  → alle ingelogde e2e-tests sloegen stil over). Daarnaast het welkomstblok op
  de startpagina herbouwd naar het prototype (verloop, geen foto) en de
  hydratiebug op `/dashboard` verholpen die het profielmenu onbruikbaar maakte.
- 18 sep 2026 — fase **4** afgerond (4.7 waardebepaling-pdf, één pagina, ~1 s)
  en fases 2.2 t/m 4 live gezet (PR #20): transactiesQuery, dossierkern en
  waardering v2. Backtest 6,1 % mediane fout, 76 % binnen de band.
- 16-17 sep 2026 — masterplan herzien naar v2 (demo-backwards, data eerst,
  Sonnet-klare item-specs); besluitenlogboek naar `docs/besluiten.md`;
  `goals.md`/`CLAUDE.md`/sessieskills in lijn gebracht. Geen code gewijzigd.
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
- 17 sep 2026 — fase 0 (0.1 t/m 0.9) volledig doorlopen: RLS-datalek in
  `transacties` + SECURITY DEFINER-view gefixt, kapotte import-upsert gefixt,
  auth-check toegevoegd aan 3 API-routes, CSP opgeschoond (Stripe eruit),
  back-upscript gebouwd en getest, baseline-schemadump geschreven,
  documentatie (CLAUDE.md/goals.md/root-CLAUDE.md) geactualiseerd, geheugen
  opgeschoond, sessieskills (`sessie-start`/`sessie-afronden`) en de
  concept-verwerkersovereenkomst geschreven. `typecheck`/`test`/`build` groen.
- 16 sep 2026 — masterplan "demo-klaar" opgesteld en vastgelegd in
  `docs/roadmap.md`, verwijzing toegevoegd bovenaan `CLAUDE.md` (PR #15).
