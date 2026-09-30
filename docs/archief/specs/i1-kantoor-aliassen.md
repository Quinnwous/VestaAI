# I1 — Kantoor-aliassen beheren in `/admin/kantoor/[id]`

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md.

## Waarom
Het importscript (`scripts/import-transacties.mjs`, `lib/importPijplijn.ts`) bepaalt `eigen_verkoop` door de kantoornaam in de export te vergelijken met `instellingen_json.kantoor_aliassen` (via `isEigenKantoor()` uit `lib/kantoorNormalisatie.ts`). Dat veld bestaat in `KantoorInstellingenSchema` (`lib/schemas.ts`), maar er is geen invoerveld: zonder aliassen wordt élke rij `eigen_verkoop: false`, en dan is de verkoopkaart leeg.

## Opdracht (commit na elke stap)
1. `app/admin/kantoor/InstellingenForm.tsx`: sectie "Kantoornamen in exports" met een tekstveld (één alias per regel, of kommagescheiden — kies één en zeg het in de hulptekst). Hulptekst: "Hoe jullie kantoor heet in Brainbay/Realworks-exports, bv. 'i4 Housing B.V.'. Wordt gebruikt om eigen verkopen te herkennen." Opslaan via de bestaande `slaKantoorInstellingenOp` (`app/admin/actions.ts`): lege regels weg, trimmen, ontdubbelen **op de genormaliseerde vorm** (`normaliseerKantoornaam`), max 20. Leeg → veld weglaten.
2. Live voorbeeld onder het veld: toon per alias de genormaliseerde vorm (`normaliseerKantoornaam`), zodat Quinn ziet dat "i4 Housing B.V." en "I4housing" op hetzelfde uitkomen. `lib/kantoorNormalisatie.ts` is client-safe (pure functie) — controleer dat hij niets server-only importeert.
3. Kantoornaam zelf automatisch als eerste suggestie tonen ("Kantoornaam toevoegen") als hij nog niet in de lijst staat.
4. Pure helper voor het opschonen van de lijst in `lib/kantoorNormalisatie.ts` (bv. `schoonAliassen(tekst): string[]`) mét tests.

`/admin` is platform-admin-gebied: VestaAI-stijl zoals de rest van `InstellingenForm.tsx`, niet de kantoorhuisstijl.

## Jouw bestanden
`app/admin/kantoor/InstellingenForm.tsx`, `app/admin/actions.ts` (alleen als het opslaan het veld nu weggooit), `lib/kantoorNormalisatie.ts` (+test), `app/admin/kantoor/[id]/page.tsx` (alleen doorgeven van de kantoornaam als dat nodig is).
NIET aanraken: `app/admin/transacties/**`, `lib/import*`, `lib/transactieImport.ts`, `scripts/**`, `lib/schemas.ts` (het schemaveld bestaat al), `components/**`, `docs/**`, `CLAUDE.md`, `supabase/**`, `package.json`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen. Niets naar productie schrijven.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die.

## Oplevering
Wat je veranderde per bestand, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
