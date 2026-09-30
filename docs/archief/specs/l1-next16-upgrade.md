# L1 — Upgrade Next.js 14.2 → 16 (React 18 → 19)

Je werkt in de VestaAI-repo, in je eigen git-worktree. Lees eerst CLAUDE.md volledig — de ⚠️-lessen gelden allemaal nog (hydratie, react-pdf, maplibre-worker, route-exports, huisstijl).

## Waarom
Quinn wil een snelle, soepele site. De serverfuncties staan sinds vandaag in Frankfurt (grootste winst). De volgende stap is het framework: Next 16 + React 19 geven minder client-JavaScript, snellere hydratie, betere caching en Turbopack. Mobiel dossier scoort nu ~73 in Lighthouse (DoD-doel 85). Bouwlinq (andere repo) draait al op Next 16.2 / React 19.2 — ter referentie, niet kopiëren.

## Aanpak — in stappen, elke stap groen voor je verder gaat (commit na elke stap)
Volg de **officiële** gidsen; haal ze op met WebFetch en vertrouw niet op geheugen:
- https://nextjs.org/docs/app/guides/upgrading/version-15
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/docs/app/guides/upgrading/codemods

1. **Naar 15** (`next@15`, `react@19`, `react-dom@19`, `@types/react@19`, `@types/react-dom@19`, `eslint-config-next@15`). Draai de codemods (o.a. `next-async-request-api` — `params`, `searchParams`, `cookies()`, `headers()` worden async; controleer ook `lib/supabase.ts` en alles wat `cookies()` gebruikt, en `middleware.ts`). Typecheck + tests + build groen → commit.
2. **Naar 16** (`next@latest`, nu 16.3.x; `eslint-config-next` mee). Volg de v16-gids: o.a. `middleware.ts` → `proxy.ts` (controleer wat de gids zegt en of de Supabase-sessieverversing blijft werken), Turbopack standaard voor `next build` (onze config heeft geen webpack-maatwerk; `@next/bundle-analyzer` moet nog werken of vervang hem door wat de gids aanraadt), `next lint` is weg → `"lint"`-script naar de ESLint-CLI en zo nodig een flat config (`eslint.config.mjs`; `eslint` 8 → 9). Typecheck + tests + build groen → commit.
3. **Bekende risicoplekken — elk expliciet nalopen en in je oplevering melden:**
   - `@supabase/ssr` (0.12): cookie-API in server components/route handlers/middleware(proxy) met async `cookies()`; inloggen, uitloggen, sessieverversing, `/login/[slug]`.
   - `@react-pdf/renderer` 4.x onder React 19: de pdf-routes (`app/api/pdf/**`) en hun render-tests (`components/*PdfTemplate.test.ts`) moeten groen blijven.
   - `recharts` 3, Radix-primitives, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table` onder React 19.
   - `useFormState` → `useActionState` als dat ergens voorkomt; `forwardRef`-gebruik mag blijven.
   - Caching-defaults: in 15 zijn `fetch` en GET-route-handlers niet meer standaard gecachet. Controleer dat niets dat bewust gecachet werd (bv. `app/api/kaart/buurtgrenzen` met `s-maxage`) zijn gedrag verliest; voeg niets nieuws aan caching toe zonder het te melden.
   - `vitest` (Vite 8/oxc, zie CLAUDE.md § Commands) met React 19 — de component-tests moeten groen blijven.
   - `lib/maplibreWorker.guard.test.ts` en `public/maplibre-gl/` (zelf gehoste worker).
   - `export const runtime = 'nodejs'` en `maxDuration` in routes; `sharp` in `lib/statischeKaart.ts`.
   - Metadata-bestanden (`app/opengraph-image.tsx`, `twitter-image.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`).
4. **Geen functionele wijzigingen** en geen refactors buiten wat de upgrade vereist. Geen migraties.
5. Werk de Stack-tabel in `CLAUDE.md` bij (Next.js 16, React 19) en de alinea over `vitest` als daar iets aan verandert — dat is de enige doc-wijziging.

## Jouw bestanden
Alles wat de upgrade raakt (package.json/-lock, config, app/**, lib/**, components/** voor zover nodig, `CLAUDE.md` alleen de Stack-regels). NIET: `docs/**`, `supabase/**`, `vercel.json`.

## Regels
- TypeScript strict, geen `any`. Commit na elke deelstap, Nederlandse commitberichten, eindigend met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Niet pushen. Niets naar productie schrijven.
- Je worktree heeft geen `.env.local` en misschien geen echte `node_modules` — je installeert pakketten; controleer eerst met `ls -la node_modules` of het een symlink naar de hoofdmap is en **installeer nooit via een symlink in de hoofdmap** (maak dan een echte `node_modules` in je worktree).
- DoD: `npm run typecheck && npm run test && npm run build` groen. `dod:screens`, `demo:repetitie` en de maplibre-guardtest draait de hoofdsessie na de merge.

## Oplevering
Per stap wat er veranderde (codemods + handwerk), bevindingen per risicoplek uit stap 3, uitkomst typecheck/test/build, eventuele open punten, branchnaam + laatste commit-hash.
