# H4 — Verkopersversie van de waardebepaling-pdf ("handout" van de presentatiemodus)

Je werkt in de VestaAI-repo (Next.js 14 + Supabase), in je eigen git-worktree. Lees eerst CLAUDE.md (let op de react-pdf-regels in de Stack-tabel: WinAnsi-tekens, `bruikbaarLogo()`, render-test verplicht) en `.claude/skills/kantoorhuisstijl/SKILL.md`.

## Waarom zo klein
Roadmap-idee was een aparte printbare handout van `/object/[id]/presentatie`. Maar de waardebepaling-pdf (`GET /api/pdf/waardebepaling?object_id=…`, `components/WaardebepalingPdfTemplate.tsx`) is al één pagina met dezelfde inhoud (waarde, kaart, top-6). Wat een verkoper-handout anders maakt, is alleen: (1) geen makelaar-interne waarschuwingen (index-notities), en (2) het kantoorcontact erop, zodat de verkoper weet wie hij moet bellen. Bouw dus een **variant**, geen nieuw document.

## Opdracht (commit na elke stap)
1. **Route**: `app/api/pdf/waardebepaling/route.ts` accepteert `&voor=verkoper`. Zelfde toegangscontrole, zelfde opgeslagen `waardering_json` (er wordt niets herberekend). Bij `voor=verkoper`: waarschuwingen via `verkoperWaarschuwingen()` uit `lib/presentatie.ts` (in plaats van alle), en het kantoorcontact (`kantoorContactregel()` uit `lib/presentatie.ts`, die neemt telefoon/e-mail/website) doorgeven aan het template. Bestandsnaam met `-verkoper` erin. Zonder de parameter: gedrag exact als nu. Hulpfuncties niet in `route.ts` exporteren (CLAUDE.md-les).
2. **Template**: `WaardebepalingPdfTemplate` krijgt een optionele prop (bv. `contactregel?: string | null`) die, als gevuld, onderaan in de voettekst in kantoorkleur/grijs verschijnt ("Vragen? {kantoornaam} · {contactregel}"). Past alles nog op één pagina? Controleer dat. Breid `components/WaardebepalingPdfTemplate.test.ts` uit: rendert met en zonder contactregel.
3. **Presentatiemodus**: in `components/presentatie/WaardePresentatie.tsx` op de laatste stap (of in de bestaande bediening, waar het rustig staat) een knop "Pdf voor de verkoper" die `/api/pdf/waardebepaling?object_id=…&voor=verkoper` downloadt. Kantoorhuisstijl: `var(--merk*)`, geen hex, geen Tailwind-kleurclasses, "je/jouw", geen "VestaAI". Ook in `components/WaardebepalingPaneel.tsx` naast de bestaande pdf-knop een tweede, rustige optie (bv. een klein menu of secundaire knop "Verkopersversie") — kies de minst drukke vorm en motiveer in je oplevering.
4. Tests voor eventuele nieuwe pure helpers (bv. bestandsnaam, parameter-parsing) in `lib/`.

## Jouw bestanden
`app/api/pdf/waardebepaling/route.ts`, `components/WaardebepalingPdfTemplate.tsx` (+test), `components/presentatie/**`, `components/WaardebepalingPaneel.tsx`, `lib/presentatie.ts` (+test), eventueel een nieuwe `lib/pdfVariant.ts` (+test).
NIET aanraken: `app/admin/**`, `lib/import*`, `lib/transactie*`, `lib/verrijking.ts`, `lib/geocodering*`, `lib/rd.ts`, `lib/ontdubbelen.ts`, `lib/kantoorNormalisatie.ts`, `lib/schemas.ts`, `scripts/**`, `package.json`, `docs/**`, `CLAUDE.md`, `supabase/**`.

## Regels
- TypeScript strict, geen `any`. Nederlandse namen en commentaar.
- Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen.
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens` en `lib/maplibreWorker.guard.test.ts` werken niet in een worktree — de hoofdsessie draait die. Kopieer geen `.env.local`.

## Oplevering
Wat je veranderde per bestand, gekozen knopvorm in het paneel + motivatie, uitkomst typecheck/test/build, branchnaam + laatste commit-hash.
