# K1 — Verkoopadvies: datalaag + gereedheidscheck (fase 11, zonder UI)

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md en `docs/roadmap.md` § Fase 11 en § 3.1 (datalagen — `transacties` alléén via `lib/transactiesQuery.ts`, guard-test).

## Waarom nu, en waarom zo klein
Fase 11 (verkoopadvies) is bewust geblokkeerd tot Quinns voorbeelddocument er is: de **opbouw en vormgeving** hangen daarvan af. Het **datacontract** staat wel vast en is nodig hoe het voorbeeld er ook uitziet:

`VerkoopadviesInput = { dossier (intake), waardering (v2), kantoor (instellingen: courtage, profiel, werkgebied), marktcontext (marktanalyseSamenvatting voor plaats + typegroep), makelaar }`

Bouw alleen die datalaag. **Geen** UI, **geen** pdf, **geen** Claude-aanroep, geen teksten die de opbouw van het advies vastleggen.

## Opdracht (commit na elke stap)
1. **`lib/verkoopadvies.ts`** — types + pure functies:
   - `VerkoopadviesInput` volgens het contract. Hergebruik bestaande types: `PropertyInput` (`lib/schemas.ts`), de waarderingsopslag via `migreerWaarderingJson()` (`lib/waardering.ts` — de uitkomst die er al staat, **niets herberekenen**, zelfde regel als de pdf-route), `KantoorInstellingen`, `EffectieveCourtage` via `effectieveCourtage()` (`lib/courtage.ts`: dossiervoorstel wint van de kantoorstandaard), `MarktanalyseSamenvatting` (`lib/transactiesQuery.ts`), makelaar `{ naam, email }`, kantoor `{ naam, website, telefoon, email }` via `bouwBranding()`/`websiteWeergave()` (`lib/branding.ts`).
   - `bouwVerkoopadviesInput(ruw)` — puur: van opgehaalde ruwe rijen naar het contract (parse intake met `PropertyInputSchema`, waardering met `migreerWaarderingJson`, plaats via `canoniekePlaats()` uit `lib/plaatsNormalisatie.ts`, typegroep via `woningtypeGroep`-logica die de intake al kent).
   - `verkoopadviesGereedheid(input)` → lijst `{ onderdeel, status: 'ok' | 'ontbreekt' | 'zwak', uitleg }` voor: waardering (ontbreekt / te weinig referenties → zwak, gebruik de bestaande drempels uit `lib/waardering.ts`), courtage, kantoorprofiel (opgericht/kenmerken), werkgebied, marktcontext (n < `MIN_N_BETROUWBAAR` uit `lib/marktanalyse.ts` → zwak), prijsverwachting verkoper, WOZ. Uitleg in je-vorm, kort, zonder "VestaAI".
   - Uitgebreide tests (`lib/verkoopadvies.test.ts`) op fixtures: volledig dossier, dossier zonder waardering, kantoor zonder instellingen, marktcontext met n = 3.
2. **Server-loader** `haalVerkoopadviesInput(client, objectId)` in hetzelfde bestand of `lib/verkoopadviesLaden.ts` (server-only): sessie-client, zelfde toegangsregel als `app/api/pdf/waardebepaling/route.ts` (object van het eigen kantoor, anders `null`), marktcontext via `marktanalyseSamenvatting(client, { plaatsen: plaatsVarianten(plaats), typegroepen: [groep], periode 24 mnd })` — controleer de echte filtervorm van `TransactieFilter` en pas je aan. Laat de guard-test (`lib/transactiesQuery.guard.test.ts`) groen: geen directe `.from('transacties')`.
3. Geen route en geen UI toevoegen. Documenteer bovenin het bestand: "Fase 11: het contract is stabiel; secties/pdf volgen op het voorbeeld van Quinn."

## Jouw bestanden
`lib/verkoopadvies.ts` (+test), eventueel `lib/verkoopadviesLaden.ts`.
NIET aanraken: alles buiten die bestanden — in het bijzonder `lib/transactieImport.ts`, `components/TransactiesZoeken.tsx`, `lib/transactiesQuery.ts` (alleen importeren), `lib/schemas.ts`, `docs/**`, `CLAUDE.md`, `supabase/**`, `package.json`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen. Niets naar productie schrijven.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die.

## Oplevering
Wat je bouwde, welke bestaande functies je hergebruikte, de gereedheidslijst zoals een testdossier hem teruggeeft, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
