# Scripts

Losse Node-scripts naast de app. ⚠️ `.env.local` wijst naar de
**productiedatabase**: alles hieronder is standaard alleen-lezend of een
dry-run; schrijven vraagt een expliciete `--write`. Scripts die `lib/*.ts`
importeren draaien via `npx tsx`, de rest via `node`.

## Kwaliteit en Definition of Done

| Script | Waarvoor | Commando |
|---|---|---|
| `dod-screens.mjs` | De visuele DoD in één keer: huisstijlcheck, screenshots, axe, linkcheck, toetsenbordronde | `npm run dod:screens` |
| `controleer-huisstijl.mjs` | Zoekt VestaAI-groen of de naam VestaAI in de ingelogde omgeving (ook tabs, pop-ups, pdf's) | via `dod:screens` |
| `screenshots.mjs` | Screenshots van alle ingelogde routes op 390/1280/1920 px → `screenshots/` | via `dod:screens` |
| `generale-repetitie.mjs` | Loopt de zes demoscènes af (`docs/i4housing/demoscript.md`) | `npm run demo:repetitie` |
| `check-env.mjs` | Welke omgevingsvariabelen ontbreken (leest `.env.example`, toont nooit waarden) | `npm run env:check` |
| `evalueer-content.mjs` | Blinde evaluatie van de contentmodellen (`EVALUATIE_MODELLEN`, labels A/B/C, standaard met de huisstijl van i4; `docs/evaluatie/`); `--write` kost API-geld | `npx tsx --env-file=.env.local scripts/evalueer-content.mjs [--write] [--zonder-huisstijl]` |

## Data en database

| Script | Waarvoor | Commando |
|---|---|---|
| `backup-data.mjs` | Back-up van alle bedrijfstabellen + Storage naar `backups/<tijdstip>/` (met `manifest.json`) — **vóór elke migratie, import of bulk-update**; herstelprocedure in `docs/werkwijze.md` § 5 | `node --env-file=.env.local scripts/backup-data.mjs [--zonder-storage]` |
| `controleer-schema.mjs` | Heeft de live database de kolommen die de code verwacht? | `node --env-file=.env.local scripts/controleer-schema.mjs` |
| `import-transacties.mjs` | Brainbay-/Realworks-export (CSV/XLSX) importeren via de pijplijn; weigert `--write` zonder back-up van vandaag | `npx tsx --env-file=.env.local scripts/import-transacties.mjs --bron brainbay\|realworks --bestand <pad> --kantoor <id> [--write]` |
| `geocodeer-transacties.mjs` | Coördinaten en buurt/wijk via PDOK, hervatbaar | `npx tsx --env-file=.env.local scripts/geocodeer-transacties.mjs --kantoor=<id> [--write]` |
| `backtest-waardering.mjs` | Hoe goed voorspelt de waardering? Schrijft `docs/waardering/backtest.md` | `npx tsx --env-file=.env.local scripts/backtest-waardering.mjs [--kantoor=<id>]` |
| `haal-cbs-prijsindex.mjs` | Ververst de CBS-prijsindex (terugval voor de tijdcorrectie) in `lib/cbsPrijsindexData.json` | `node scripts/haal-cbs-prijsindex.mjs` |

## Kantoren en accounts

| Script | Waarvoor | Commando |
|---|---|---|
| `seed-demo-kantoor.mjs` | Het demo-kantoor met ~8.000 synthetische transacties en voorbeelddossiers (raakt alleen kantoren met `demo: true`) | `npx tsx --env-file=.env.local scripts/seed-demo-kantoor.mjs [--write] [--reset]` |
| `repair-i4housing-branding.mjs` | Zet de volledige huisstijl van i4 Housing opnieuw goed (kleuren, assets, tekstsjabloon) | `node --env-file=.env.local scripts/repair-i4housing-branding.mjs [--write]` |
| `seed-i4housing-content.mjs` | Eenmalig gebruikt (23 sep): schrijfstijl van i4 aangevuld met hun eigen teksten | `npx tsx --env-file=.env.local scripts/seed-i4housing-content.mjs [--write]` |
| `maak-team-accounts.mjs` | Teamaccounts van een kantoor aanmaken zonder welkomstmail (standaard `docs/i4housing/i4housing-team.md`) | `node --env-file=.env.local scripts/maak-team-accounts.mjs --kantoor=<id> [--write]` |

## Metingen

| Script | Waarvoor | Commando |
|---|---|---|
| `meet-lighthouse.mjs` | Lighthouse op ingelogde pagina's, mediaan van n runs; `--label` → `docs/metingen/` | `node --env-file=.env.local scripts/meet-lighthouse.mjs --label=<naam>` |
| `meet-paginasnelheid.mjs` | Servertijd (TTFB) per pagina op productie → `docs/metingen/` | `node --env-file=.env.local scripts/meet-paginasnelheid.mjs --label=<naam>` |
| `meet-performance.mjs` | Timings van de RPC's en queries op de (demo-)data | `npx tsx --env-file=.env.local scripts/meet-performance.mjs` |
| `meet-contentgeneratie.mjs` | Echte duur van "Genereer content (NL + EN)" op productie (roadmap D2, demo-dag-check): wandklok + databasetijden, oordeel tegen 240/300 s. Alleen demo-kantoor; `--write` overschrijft de content van dat dossier en kost ≈ €0,12 | `node --env-file=.env.local scripts/meet-contentgeneratie.mjs --object <id> [--url <basis>] [--write]` |

## Overig

- `lib/` — gedeelde helpers: `dodSessie.mjs` (inloggen via sessiecookie),
  `vestaGroen.mjs` (welke kleuren tellen als VestaAI-groen), `axeCheck.mjs`,
  `linkCheck.mjs`, `toetsenbordCheck.mjs`, `envCheck.mjs`, `backupPijplijn.mjs`
  (paginering, Storage-padopbouw en manifest-opbouw achter `backup-data.mjs`).
- `fixtures/` — kleine testbestanden voor de importpijplijn.
