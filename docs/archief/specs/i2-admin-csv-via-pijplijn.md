# I2 — Admin-CSV-import via de importpijplijn + één snapshot-bouwer

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md, `lib/importSnapshot.ts` (contract, niet wijzigen), `lib/importPijplijn.ts`, `lib/importTerugdraaien.ts` en `app/admin/transacties/actions.ts`.

## Waarom
Er zijn nu twee importpaden met elk hun eigen logica:
- `scripts/import-transacties.mjs` → `voerImportPijplijnUit()` (kwaliteitsregels, `uitgesloten_reden`, ontdubbelen, kwaliteitsrapport, `eigen_verkoop` via kantoor-aliassen) + `bouwSnapshot()` + `telNieuwEnBijgewerkt()` in `lib/importPijplijn.ts`;
- de CSV-import in `/admin/transacties` → nog de oude `parseTransactieCsv()` zonder kwaliteitsregels, met een eigen `bouwSnapshotUitBestaande()` in `lib/importTerugdraaien.ts`.
Twee snapshot-bouwers voor één contract gaan uit elkaar lopen. En een "kleine correctie" via het admin-formulier slaat nu elke plausibiliteitscontrole over.

## Opdracht (commit na elke stap)
1. **Eén snapshot-bouwer.** Vergelijk `bouwSnapshot()` (importPijplijn) en `bouwSnapshotUitBestaande()` (importTerugdraaien). Houd er één (de meest complete; `lib/importPijplijn.ts` ligt het meest voor de hand), laat de andere weg en zet alle aanroepers en tests om. Gedrag vastleggen met tests: welke kolommen komen in `vorige`, hoe `geo` wordt teruggeschreven (WKT `POINT(lng lat)` uit de lat/lng van `transacties_met_coordinaten`), `afgekapt` boven `MAX_SNAPSHOT_RIJEN`.
2. **Admin-CSV via de pijplijn.** `previewTransactieImport` en `bevestigTransactieImport` lopen voortaan via `voerImportPijplijnUit()` met bron `'handmatig'` (profiel = de generieke `ALIASSEN`, geen bron-specifieke aliassen; voeg zo nodig een `handmatig`-profiel toe in `lib/importProfielen.ts`). Uitgesloten rijen worden opgeslagen mét `uitgesloten_reden` (zoals het script doet); `kwaliteitsrapport_json` wordt gevuld. `eigen_verkoop`: een expliciete kolom in de CSV wint; anders via `instellingen_json.kantoor_aliassen` van het gekozen kantoor.
3. **Preview-UI** (`TransactieImportForm.tsx`): toon naast het bestaande voorbeeld de kerncijfers uit het rapport (aantal geldig / uitgesloten per reden / eigen verkopen / % met coördinaat), zodat Quinn vóór "Bevestigen" ziet wat er gebeurt. `Importhistorie.tsx` leest het rapport nu defensief — maak het concreet op de echte vorm uit `lib/importPijplijn.ts` (met één type, geen `unknown`-gegok meer).
4. Behoud: snapshot in dezelfde insert als de `imports`-rij (vóór de eerste upsert), `.in()`-lookups in stukken van 200, harde `kantoor_id`-filter, `vereisPlatformAdmin()` in elke action.
5. Het script `scripts/import-transacties.mjs` moet na stap 1 nog werken: draai `npx tsc --noEmit` en de tests; een dry-run kan niet in je worktree (geen `.env.local`) — meld het, de hoofdsessie doet hem.

## Jouw bestanden
`app/admin/transacties/**`, `lib/importPijplijn.ts` (+test), `lib/importTerugdraaien.ts` (+test), `lib/importProfielen.ts` (+test), `scripts/import-transacties.mjs` (alleen aanpassen aan een gewijzigde functienaam).
NIET aanraken: `lib/importSnapshot.ts`, `lib/kantoorNormalisatie.ts`, `app/admin/kantoor/**`, `app/admin/actions.ts`, `lib/schemas.ts`, `lib/verrijking.ts`, `lib/geocodering*`, `components/**`, `docs/**`, `CLAUDE.md`, `supabase/**`, `package.json`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar. Een action-/routebestand exporteert alleen wat het mag; hulpfuncties in `lib/`.
- Niets naar productie schrijven.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die.

## Oplevering
Wat je veranderde per bestand, welke snapshot-bouwer je hield en waarom, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
