# J1 — Plaatsnormalisatie ('s-Gravenhage ↔ Den Haag)

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md.

## Waarom
Het werkgebied van i4 Housing is Wassenaar en **Den Haag**. BAG, PDOK en (waarschijnlijk) de Brainbay-export schrijven de officiële naam **'s-Gravenhage**. De RPC's vergelijken plaatsen exact (`t.plaats = any(...)`), dus met werkgebied "Den Haag" en data "'s-Gravenhage" tonen marktanalyse, concurrentie en de standaardfilters nul Haagse verkopen. Er is al een halve oplossing: `plaatsSleutel`/`plaatsenGelijk`/`plaatsVarianten` in `lib/kerncijfers.ts` — maar alleen het dashboard gebruikt die.

**Besluit:** de canonieke schrijfwijze in de database is de spreektaal ("Den Haag"). We normaliseren **bij het schrijven** (import), zodat elke exacte vergelijking vanzelf klopt; de aliaslijst blijft voor vergelijkingen met invoer van buiten.

## Opdracht (commit na elke stap)
1. **`lib/plaatsNormalisatie.ts`** (+test): verhuis `kalePlaatsnaam`, `PLAATS_ALIAS_GROEPEN`, `plaatsSleutel`, `plaatsenGelijk`, `plaatsVarianten` hierheen uit `lib/kerncijfers.ts` (daar re-exporteren of de imports omzetten, zodat `app/(app)/dashboard/page.tsx` en `lib/kerncijfers.test.ts` blijven werken). Nieuw: `canoniekePlaats(naam)` → de canonieke schrijfwijze: eerste naam in de aliasgroep is canoniek; zet de groep om naar `['Den Haag', "'s-Gravenhage", 's-Gravenhage', 'S GRAVENHAGE']`-achtig en test dat alle varianten → "Den Haag". Zonder aliasgroep: nette hoofdletters/witruimte (`wassenaar` → `Wassenaar`, `  Den  Haag ` → `Den Haag`), maar tussenvoegsels als in `'s-Hertogenbosch` en `Bergen op Zoom` niet slopen — test een paar echte Nederlandse namen.
2. **Import**: `lib/importPijplijn.ts` schrijft `plaats: canoniekePlaats(...)`. Test in `lib/importPijplijn.test.ts`.
3. **Geocodering**: `lib/geocodering.ts` `beoordeelTreffer` vergelijkt `woonplaatsnaam` en `rij.plaats` via `plaatsenGelijk` (nu: kale lowercase-vergelijking → "'s-Gravenhage" vs "Den Haag" wordt ten onrechte `mislukt`). Test.
4. **Werkgebied als filter**: waar het werkgebied de standaardfilter wordt (`standaardFilterState` in `lib/marktanalyse.ts`, `standaardConcurrentieFilter` in `lib/concurrentie.ts`, en de pagina's in `app/(app)/marktanalyse/**` die ze aanroepen), eerst door `canoniekePlaats` halen — dan werkt ook een werkgebied dat iemand als "'s-Gravenhage" invulde. Tests.
5. **Bestaande data**: controleer read-only of er in de code een pad is dat plaatsen anders schrijft (bv. `lib/transactieImport.ts` voor de oude CSV-route, `scripts/seed-demo-kantoor.mjs`). Pas alleen code aan; draai geen scripts tegen productie. Meld in je oplevering of een eenmalige normalisatie van bestaande rijen nodig is (de hoofdsessie beslist en voert uit).

## Jouw bestanden
`lib/plaatsNormalisatie.ts` (+test), `lib/kerncijfers.ts` (+test, alleen het verhuizen), `app/(app)/dashboard/page.tsx` (alleen de import), `lib/importPijplijn.ts` (+test, alleen `plaats`), `lib/geocodering.ts` (+test), `lib/marktanalyse.ts` (+test, alleen de standaardfilter), `lib/concurrentie.ts` (+test, alleen de standaardfilter), `app/(app)/marktanalyse/**/page.tsx`.
NIET aanraken: `components/PropertyForm.tsx`, `components/DezeWoningPaneel.tsx`, `app/(app)/object/**`, `app/(app)/kantoor/**`, `app/admin/**`, `lib/schemas.ts`, `supabase/**`, `docs/**`, `CLAUDE.md`, `package.json`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen. Niets naar productie schrijven.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die.

## Oplevering
Wat je veranderde per bestand, bevinding stap 5, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
