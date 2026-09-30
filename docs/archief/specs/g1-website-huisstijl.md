# G1 — Websiteveld in de huisstijl

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md en `.claude/skills/kantoorhuisstijl/SKILL.md` (§ "Nieuw merkveld toevoegen").

## Opdracht
De huisstijl heeft `telefoon` en `email` maar geen website. Voeg `website` toe en toon hem overal waar telefoon/e-mail al als kantoorcontact staan.

1. `lib/schemas.ts` → `HuisstijlSchema`: `website` optioneel (string, max ~120). Normaliseer niet in het schema zelf; maak een pure helper (bv. `websiteWeergave(url)` in `lib/branding.ts`) die `https://www.i4housing.nl/` → `i4housing.nl` geeft voor weergave, en een volledige `https://`-href maakt als het protocol ontbreekt. Ongeldige invoer → `null` (niet tonen). Tests in `lib/branding.test.ts`.
2. `lib/branding.ts` → `Branding.website` + `bouwBranding()`.
3. `app/admin/kantoor/HuisstijlForm.tsx` → invoerveld naast telefoon/e-mail (zelfde stijl, `type="url"`, placeholder `www.kantoor.nl`), opslaan zoals telefoon (trim, leeg → undefined). Controleer ook de server action die het formulier opslaat (valideert die met `HuisstijlSchema`?).
4. Tonen (alleen als gevuld): `components/BrochurePdfTemplate.tsx` slotpagina-contact, `components/WaardebepalingPdfTemplate.tsx` (waar telefoon/e-mail staan; staan ze er niet, voeg dan niets toe), en de presentatiemodus: `lib/presentatie.ts` `kantoorContactregel()` uitbreiden met website (+ test in `lib/presentatie.test.ts`) en de doorgifte in `app/(app)/object/[id]/presentatie/page.tsx` + `components/presentatie/WaardePresentatie.tsx`. Pdf: react-pdf Helvetica is WinAnsi — gewone tekens, geen emoji. De pdf-templates hebben render-tests (`*.test.ts`); breid die uit met een kantoor mét website.
5. Géén databasemigratie nodig (`huisstijl_json` is jsonb). Zet de website van i4 Housing niet in de code; `scripts/repair-i4housing-branding.mjs` mag `website: 'https://www.i4housing.nl'` krijgen in zijn MERK-object (dat script is standaard dry-run; draai het NIET met `--write`).

## Jouw bestanden
`lib/schemas.ts` (alleen HuisstijlSchema), `lib/branding.ts` (+test), `app/admin/kantoor/HuisstijlForm.tsx` (+ bijbehorende action), `components/BrochurePdfTemplate.tsx`, `components/WaardebepalingPdfTemplate.tsx` (+ tests), de pdf-routes die het kantoorobject vullen (`app/api/pdf/**`), `lib/presentatie.ts` (+test), `app/(app)/object/[id]/presentatie/page.tsx`, `components/presentatie/WaardePresentatie.tsx`, `scripts/repair-i4housing-branding.mjs`.
NIET aanraken: `components/MarktanalyseExplorer.tsx`, `lib/marktanalyse.ts`, `app/(app)/marktanalyse/**`, `components/SegmentVergelijking.tsx`, `docs/**`, `CLAUDE.md`, `supabase/**`.

## Regels
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die. Kopieer geen .env.local.

## Oplevering
Wat je veranderde per bestand, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
