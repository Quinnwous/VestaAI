# J2 — Courtage: kantoorstandaard, per dossier aanpasbaar, btw-aanduiding

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md en `.claude/skills/kantoorhuisstijl/SKILL.md`.

## Waarom
Besluit Quinn (28 sep): i4 Housing rekent standaard **1 % courtage, exclusief btw**, maar per woning moet het aanpasbaar zijn. De bouwstenen bestaan al, maar zijn niet verbonden:
- kantoorstandaard: `instellingen_json.courtage.percentage` (`KantoorInstellingenSchema` in `lib/schemas.ts`, beheer in `app/admin/kantoor/InstellingenForm.tsx`, read-only op `app/(app)/kantoor/page.tsx`);
- per dossier: intakeveld `courtagevoorstel_percentage` in stap 6 van `components/PropertyForm.tsx` — maar dat start leeg met een hardgecodeerde placeholder "1.25" en weet niets van de kantoorstandaard.
Dit voedt straks het verkoopadvies (fase 11).

## Opdracht (commit na elke stap)
1. **btw-aanduiding** — `KantoorInstellingenSchema.courtage` krijgt `btw: z.enum(['exclusief', 'inclusief']).optional()` (ontbreekt = exclusief, de NL-gewoonte). In `InstellingenForm.tsx` een keuze naast het percentage. Let op: `lib/instellingenSamenvoegen.ts` overschrijft het hele `courtage`-object — dat is correct zolang het formulier het veld meestuurt.
2. **Pure helper** `lib/courtage.ts` (+test): `effectieveCourtage(dossierVoorstel, kantoorInstellingen)` → `{ percentage, btw, bron: 'dossier' | 'kantoor' | null }` en `courtageLabel(...)` → "1,00 % excl. btw" (nl-NL-opmaak via `lib/opmaak.ts`; kijk of daar al een percentage-formatter is).
3. **Intake** (`PropertyForm.tsx`, alleen het courtageveld en wat nodig is om de kantoorstandaard binnen te krijgen): bij een **nieuw** dossier start het veld op de kantoorstandaard (doorgeven via `app/(app)/object/new/page.tsx` — die haalt `instellingen_json` al op — en `NewObjectForm.tsx`); placeholder = de kantoorstandaard; label "Courtage (%) — excl. btw" volgens de instelling, met hulptekst "Standaard van je kantoor: 1,00 %. Pas aan voor deze woning." Bij bewerken van een bestaand dossier blijft de opgeslagen waarde staan. **Bug meefixen:** `register('courtagevoorstel_percentage', { valueAsNumber: true })` geeft bij een leeg veld `NaN`, wat de optionele Zod-validatie laat falen — gebruik hetzelfde `setValueAs`-patroon als `prijsverwachting_verkoper` erboven. Test de parse van een leeg veld.
4. **Tonen**: in `components/DezeWoningPaneel.tsx` (live samenvatting naast de intake) de effectieve courtage met label, en op `app/(app)/kantoor/page.tsx` de btw-aanduiding naast het percentage. Kantoorhuisstijl: `var(--merk*)`, geen hex, geen Tailwind-kleurclasses in nieuwe code, "je/jouw", geen "VestaAI".

## Jouw bestanden
`lib/schemas.ts` (alleen `courtage` in `KantoorInstellingenSchema`), `app/admin/kantoor/InstellingenForm.tsx`, `lib/courtage.ts` (+test), `components/PropertyForm.tsx` (alleen het courtageveld + props), `app/(app)/object/new/page.tsx`, `app/(app)/object/new/NewObjectForm.tsx`, `components/DezeWoningPaneel.tsx`, `app/(app)/kantoor/page.tsx`.
NIET aanraken: `lib/kerncijfers.ts`, `lib/plaatsNormalisatie.ts`, `lib/importPijplijn.ts`, `lib/geocodering.ts`, `lib/marktanalyse.ts`, `lib/concurrentie.ts`, `app/(app)/marktanalyse/**`, `app/(app)/dashboard/**`, `app/admin/transacties/**`, `lib/instellingenSamenvoegen.ts`, `supabase/**`, `docs/**`, `CLAUDE.md`, `package.json`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen. Niets naar productie schrijven.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die.

## Oplevering
Wat je veranderde per bestand, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
