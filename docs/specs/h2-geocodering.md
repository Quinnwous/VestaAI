# H2 — Geocodering van transacties (fase 5.3)

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md (let op de les over `lib/verrijking.ts`: een externe bron die faalt mag nooit stil als "geen resultaat" doorgaan), `docs/roadmap.md` § Fase 5 item 5.3, en de migratie `supabase/migrations/20260917_transacties_pijplijn.sql` (kolom `geocode_status` bestaat al op productie: `'exact' | 'benaderd' | 'mislukt'` of null — **geen migratie nodig**).

## Opdracht (commit na elke stap)
1. **`lib/geocodering.ts`** (pure logica, getest):
   - `bouwPdokQuery(rij)`: postcode + huisnummer (+ toevoeging) → gestructureerde PDOK Locatieserver-query (`fq=type:adres`, `q=postcode:… and huisnummer:…`), anders straat + huisnummer + plaats als vrije tekst, anders `null`.
   - `beoordeelTreffer(rij, pdokDoc)` → `{ status: 'exact' | 'benaderd' | 'mislukt', lat, lng, wijk, buurt }`: `exact` alleen als postcode én huisnummer overeenkomen; `benaderd` bij een treffer op straat+plaats (of een ander huisnummer); anders `mislukt`. Parse `centroide_ll` (`POINT(lng lat)`).
   - Geef ook `wijknaam`/`buurtnaam` van PDOK terug: het script vult `wijk`/`buurt` **alleen als die leeg zijn** (voedt de wijkfilter van de marktanalyse).
2. **`lib/verrijking.ts`**: exporteer de bestaande `pdokLookup` niet zomaar — maak er (of ernaast) een kleine geëxporteerde functie `pdokZoek(query: string, fq?: string)` die dezelfde `fetchMet` gebruikt en onderscheid maakt tussen "leeg" en "mislukt" (HTTP-fout/timeout). Bestaand gedrag van `lookupCoordinaten`/`fetchVerrijking` mag niet veranderen; tests blijven groen.
3. **`scripts/geocodeer-transacties.mjs`** — `--kantoor <id> [--limiet N] [--write]`. Selecteert rijen van dat kantoor met `geocode_status is null` én `geo is null` (hervatbaar: opnieuw draaien pakt alleen wat nog open staat), max ~10 verzoeken/s, met één retry bij een mislukte call. Dry-run (standaard) geocodeert een steekproef van max 20 rijen en print wat hij zou schrijven, zonder te schrijven. `--write`: weigert zonder back-up van vandaag (zie hoe `scripts/backup-data.mjs` zijn bestanden wegschrijft), schrijft `geo` (WKT `SRID=4326;POINT(lng lat)` — check hoe de bestaande code `geo` schrijft), `geocode_status`, en lege `wijk`/`buurt`. Een mislukte **call** (netwerk/HTTP) → status blijft null (wordt later opnieuw geprobeerd); **geen treffer** → `'mislukt'`. Eindrapport: aantallen per status, % exact, top-10 mislukte adressen (zonder die naar een extern systeem te sturen). Service-client met een **harde `kantoor_id`-filter** in elke query (zie toelichting in `scripts/backtest-waardering.mjs`). Kijk hoe bestaande scripts `.ts`-modules uit `lib/` importeren en doe het hetzelfde. **Draai het NIET met `--write`.**
4. Controleer of `transacties_met_coordinaten`/de RPC's iets met `geocode_status` doen (bv. `benaderd` anders tonen). Niets aanpassen in SQL — alleen melden in je oplevering.

## Jouw bestanden
`lib/geocodering.ts` (+test), `lib/verrijking.ts` (alleen de nieuwe export + test), `scripts/geocodeer-transacties.mjs`.
NIET aanraken: `lib/transactieImport.ts`, `lib/transactieNormalisatie.ts`, `lib/import*`, `lib/rd.ts`, `lib/ontdubbelen.ts`, `lib/transactieKwaliteit.ts`, `lib/kantoorNormalisatie.ts`, `lib/schemas.ts`, `scripts/import-transacties.mjs`, `app/**`, `components/**`, `package.json`, `docs/**`, `CLAUDE.md`, `supabase/**`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar, zoals de rest van de code.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die. Kopieer geen `.env.local`; kun je de dry-run daardoor niet draaien, meld het (de hoofdsessie doet hem).

## Oplevering
Wat je veranderde per bestand, uitkomst typecheck/test/build, bevindingen uit stap 4, branchnaam + laatste commit-hash.
