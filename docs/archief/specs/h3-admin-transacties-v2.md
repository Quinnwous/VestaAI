# H3 — `/admin/transacties` v2: importhistorie + terugdraaien (fase 5.4)

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md, `docs/roadmap.md` § Fase 5 item 5.4, de migratie `supabase/migrations/20260917_transacties_pijplijn.sql` (tabel `imports` + kolom `transacties.import_id` bestaan al op productie — **geen migratie nodig**) en **`lib/importSnapshot.ts`** (het contract voor `imports.snapshot_json`; een andere agent bouwt tegelijk het importscript dat dit schrijft — volg het exact, wijzig het bestand niet).

`/admin` is platform-admin-gebied: VestaAI-stijl (bestaande Tailwind-grijzen zoals de huidige pagina), **niet** de kantoorhuisstijl.

## Opdracht (commit na elke stap)
1. **`lib/importTerugdraaien.ts`** (pure logica, getest): `planTerugdraai({ imp, laatsteImportIdVanKantoor, snapshot, rijIdsMetImportId })` → ofwel `{ ok: false, reden }` (niet de laatste import van dat kantoor · status niet `klaar` · snapshot ontbreekt/ongeldig · `afgekapt`) ofwel `{ ok: true, herstel: ImportSnapshotRij[], verwijder: string[] }` (verwijder = rijen met die `import_id` die niet in `snapshot.bijgewerkt` staan). Gebruik `leesImportSnapshot`.
2. **Server actions in `app/admin/transacties/actions.ts`**:
   - `terugdraaienImport(importId)`: `vereisPlatformAdmin`, laatste import van dat kantoor bepalen (op `gestart_op`, status ≠ `teruggedraaid`), plan maken, dan herstellen (update per rij met `vorige`, in batches) → verwijderen (in batches van 500, altijd met `.eq('kantoor_id', …)` én `.eq('import_id', …)` als harde filter) → `imports`: `status 'teruggedraaid'`, `teruggedraaid_op`. Bij een fout halverwege: foutmelding met wat al gedaan is; niet stil doorgaan.
   - De bestaande CSV-import (`bevestigTransactieImport`) schrijft voortaan óók een `imports`-rij (`bron 'handmatig'`, bestandsnaam als die mee kan komen, aantallen, `status` bezig → klaar/mislukt) en zet `import_id` op de rijen. Om nieuw vs. bijgewerkt te weten: bestaande rijen eerst ophalen op (kantoor_id, adres_sleutel, verkoopdatum) en een snapshot bouwen volgens `lib/importSnapshot.ts` — schrijf daarvoor een kleine pure helper in `lib/importTerugdraaien.ts` (bv. `bouwSnapshotUitBestaande`) mét test. (De andere agent maakt een eigen variant in `lib/importPijplijn.ts`; die worden later samengevoegd — niet zijn bestanden aanraken.)
3. **UI `app/admin/transacties/`**:
   - Sectie "Importhistorie" onder de kantorentabel: per import (nieuwste eerst, max 25) kantoor, bron, bestandsnaam, datum (nl-NL via `lib/opmaak.ts`), nieuw / bijgewerkt / uitgesloten, status-badge, en geocode-% (aantal rijen met die `import_id` en `geocode_status = 'exact'` ÷ totaal — één telling per import is prima bij 25 rijen).
   - Per import een uitklapbaar kwaliteitsrapport uit `kwaliteitsrapport_json` (toon generiek: aantallen per reden, voorbeelden als die er zijn; het schema komt uit `lib/importPijplijn.ts` van de andere agent — lees het defensief, onbekende vorm → "Geen rapport").
   - Knop "Laatste import terugdraaien" alleen bij de laatste niet-teruggedraaide import per kantoor, met een bevestigingsstap die toont hoeveel rijen verwijderd en hersteld worden (voorbereid via een aparte server action die alleen het plan teruggeeft). Niet-terugdraaibaar (bv. `afgekapt`) → knop uitgeschakeld met de reden.
   - Lege staat ("Nog geen imports"), laadstaat en foutstaat.
4. Controleer met een test of de CSV-import-flow nog dezelfde `TransactieInsert`-rijen oplevert (bestaande tests van `lib/transactieImport.ts` groen houden).

## Jouw bestanden
`app/admin/transacties/**`, `lib/importTerugdraaien.ts` (+test).
NIET aanraken: `lib/importSnapshot.ts`, `lib/transactieImport.ts`, `lib/import*` behalve je eigen bestand, `lib/rd.ts`, `lib/ontdubbelen.ts`, `lib/transactieKwaliteit.ts`, `lib/kantoorNormalisatie.ts`, `lib/verrijking.ts`, `lib/geocodering*`, `lib/schemas.ts`, `scripts/**`, `components/**`, `package.json`, `docs/**`, `CLAUDE.md`, `supabase/**`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar. Een route-/actionbestand exporteert alleen wat het mag (zie CLAUDE.md: hulpfuncties in `lib/`).
- Test niets tegen productie dat schrijft. Geen terugdraai-actie echt uitvoeren.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die. Kopieer geen `.env.local`.

## Oplevering
Wat je veranderde per bestand, uitkomst typecheck/test/build, open punten voor de samenvoeging met `lib/importPijplijn.ts`, branchnaam + laatste commit-hash.
