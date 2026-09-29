# K2 — Dode importcode weg + "locatie benaderd" tonen

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md en `.claude/skills/kantoorhuisstijl/SKILL.md`.

## 1. Dode importcode opruimen (commit apart)
Sinds ronde I lopen alle imports via `lib/importPijplijn.ts` (`voerImportPijplijnUit`). `parseTransactieCsv()` in `lib/transactieImport.ts` heeft geen aanroeper meer in een schrijfpad (alleen commentaarverwijzingen). Controleer dat met een grep over `app/`, `lib/`, `components/`, `scripts/`, `e2e/`. Klopt het:
- verwijder `parseTransactieCsv` en alles wat daarna ongebruikt raakt in `lib/transactieImport.ts` (maar **niet** `parseCsv`, `vindKolom`, `ALIASSEN`, `naarGetal`, `naarCoordinaat`, `naarBoolean`, `naarDatum`, `TransactieVeld`, `TransactieInsert` als die elders worden gebruikt — grep per export);
- zet de tests in `lib/transactieImport.test.ts` om: tests van verwijderde functies weg, tests van de gebleven helpers houden;
- werk de commentaarverwijzingen bij (`lib/importProfielen.ts` noemt `parseTransactieCsv()` twee keer) en het bestandscommentaar bovenin `lib/transactieImport.ts` (het is nu een bibliotheek met parse-helpers, geen importroute meer).

## 2. "Locatie benaderd" in Transacties opzoeken (commit apart)
Geocodering (`lib/geocodering.ts`) markeert een transactie als `geocode_status = 'benaderd'` als PDOK alleen straat + plaats vond, niet het exacte adres. De kolom wordt al opgehaald (`lib/transactiesQuery.ts`, kolomlijst) maar nergens getoond. Regel uit CLAUDE.md: statistische claims nooit schijnzeker.
- In het detailpaneel (Sheet) van `components/TransactiesZoeken.tsx`: bij `benaderd` een rustige aanduiding bij de minikaart, bv. "Locatie benaderd — op straatniveau, niet het exacte adres". Bij `null`/`exact` niets.
- In de tabelrij: geen extra kolom; hooguit een klein icoon met tooltip (bestaande `Tooltip`-primitive in `components/ui/`) — kies de rustigste vorm en motiveer.
- Zit `geocode_status` niet in het type dat de component krijgt (RPC `transacties_zoeken` retourneert mogelijk een eigen kolomset), zoek dan uit waar het detail geladen wordt (`haalTransactiesOpId`?) en gebruik dat. Voeg **geen** migratie toe; lukt het niet zonder RPC-wijziging, meld het en doe alleen deel 1.
- Kantoorhuisstijl: `var(--merk*)` of neutraal grijs uit `components/ui/tokens.ts`, geen hex, geen Tailwind-kleurclasses; "je/jouw"; geen "VestaAI". Semantisch geen accentkleur (die is rood bij i4).
- Test: pure helper (bv. `locatieAanduiding(status)` in een `lib/`-bestand) mét vitest.

## Jouw bestanden
`lib/transactieImport.ts` (+test), `lib/importProfielen.ts` (alleen commentaar), `components/TransactiesZoeken.tsx`, eventueel een nieuw klein `lib/locatieAanduiding.ts` (+test).
NIET aanraken: `lib/verkoopadvies*`, `lib/transactiesQuery.ts` (tenzij alleen een kolom aan een bestaande select toevoegen — meld het), `lib/importPijplijn.ts`, `lib/schemas.ts`, `app/admin/**`, `docs/**`, `CLAUDE.md`, `supabase/**`, `package.json`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen. Niets naar productie schrijven.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die.

## Oplevering
Wat je verwijderde/veranderde per bestand, gekozen vorm voor de aanduiding + motivatie, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
