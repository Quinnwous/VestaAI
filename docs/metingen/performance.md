# Performance — item 12.3

**Datum:** 27 september 2026
**Omgeving:** lokale productiebuild (`npm run build && npx next start -p 3112`),
Supabase-project is de echte (productie)database — alleen lezend. Lighthouse
via `npx lighthouse` (12.8.2) met een los gehoste Chromium (Playwright's
`chrome-mac-arm64`, `CHROME_PATH`), headless, ingelogd via een direct gezette
sessiecookie (`scripts/lib/dodSessie.mjs`, demo-kantoor). Dossier-route:
`/object/7ee41a72-efbf-4b7a-a0b6-c49da7cdc558` (Damlaan 7, Leidschendam — fase
Verkoopadvies, waardering aanwezig, demo-kantoor).

⚠️ **Betrouwbaarheid mobiel-cijfers:** deze sandbox draait op gedeelde/
onvoorspelbare CPU-capaciteit. Drie herhaalde metingen van dezelfde build
(dossier, mobiel) gaven performance-scores van 56, 69, 74, 75 — een spreiding
van ~19 punten op identieke code. Behandel de losse mobiel-Lighthousegetallen
hieronder als **indicatief/orde-grootte**, niet als exacte waarheid; de
desktop-cijfers (lichtere CPU-drossel) zijn veel stabieler (±1-2 punten) en
harder te nemen. Een herhaling op een rustige machine (of Vercel's eigen
Lighthouse-CI) is nodig voor een definitief go/no-go op de `>85`-mobiel-eis.

## 1. Lighthouse — vóór/ná

Methode: `--only-categories=performance,accessibility`, standaardpreset
(mobiel, gedrosseld) en `--preset=desktop`. "Vóór" = commit `83b37d6` (stand
vóór dit item); "ná" = na alle wijzigingen hieronder (§ 3).

| Route | Preset | Perf vóór | Perf ná | A11y vóór | A11y ná |
|---|---|---|---|---|---|
| `/dashboard` | mobiel | 89 | 88-90 | 95 | **100** |
| `/dashboard` | desktop | 100 | 99-100 | 95 | **100** |
| `/marktanalyse` | mobiel | 79 | 79-80 | 96 | **100** |
| `/marktanalyse` | desktop | 98 | 97-98 | 96 | **100** |
| `/object/[id]` (dossier) | mobiel | 73 | 56-75 (spreiding, zie ⚠️) | 96 | **100** |
| `/object/[id]` (dossier) | desktop | 97 | 96-97 | 96 | **100** |

**Doelen (roadmap): performance > 85, accessibility > 95.**
- **Accessibility: gehaald op alle drie routes** (95-96 → 100).
- **Performance desktop: al vóór dit item boven de 85-lat**, blijft dat.
- **Performance mobiel: dashboard haalt 85 nu al** (88-90). **Marktanalyse
  (~79-80) en dossier (56-75) halen de lat niet** ondanks de maplibre-fix
  (architectuur § 1) — zie § 4 Conclusies voor waarom en wat een volgende stap zou zijn.

## 2. Bundle-analyse (`@next/bundle-analyzer`)

Toegevoegd als opt-in devDependency: `ANALYZE=true npm run build` schrijft
`.next/analyze/{client,nodejs,edge}.html`.

### First Load JS per route — grootste verschuivingen

| Route | Vóór | Ná | Verschil |
|---|---|---|---|
| `/object/[id]` (dossier) | 547 kB | 269 kB | **-278 kB (-51%)** |
| `/woningen` | 490 kB | 212 kB | **-278 kB (-57%)** |
| `/marktanalyse/kaart` | 512 kB | 235 kB | **-277 kB (-54%)** |
| `/marktanalyse` | 300 kB | 300 kB | ongewijzigd (geen maplibre op deze route) |
| `/marktanalyse/concurrentie` | 289 kB | 289 kB | ongewijzigd |

### Wat zat er in die -278 kB?

Twee maplibre-gl-chunks (`maplibre-gl.mjs` + `maplibre-gl-shared.mjs`, samen
~1 MB parsed / ~278 kB gzip) stonden **`isInitialByEntrypoint: true`** voor
`/object/[id]`, `/woningen` én `/marktanalyse/kaart` — ze zaten dus in het
synchrone laadpad van die route, niet in een los async-chunk, ook al is
`<BasisKaart>` zelf al `dynamic(() => import(...), { ssr: false })`
(`components/kaart/BasisKaart.tsx`). Root cause: drie "laag"-componenten die
als kind ván `<BasisKaart>` gebruikt worden — `WoningenKaartLaag.tsx`,
`components/kaart/VerkopenLaag.tsx`, `components/kaart/ReferentiesLaag.tsx` —
deden zelf `import * as maplibregl from 'maplibre-gl'` bovenaan hun module.
Een `next/dynamic`-grens beschermt alléén de module die hij zelf wrapt, niet
de children die de aanroepende pagina er los naast importeert — dus die drie
statische imports trokken maplibre-gl alsnog het hoofdbundel in van élke
pagina die zo'n laag ergens gebruikt, ongeacht of de kaart initieel getoond
wordt (bv. `/woningen` opent standaard in tabelweergave, geen kaart).

**Fix** (zie git-log): alleen het TypeScript-type statisch geïmporteerd
(`import type * as maplibregl from 'maplibre-gl'`), de runtime-`Marker`
opgehaald via `await import('maplibre-gl')` ín het `useEffect`. Webpack
hergebruikt daar de chunk die `BasisKaartMap.tsx` toch al laadt zodra de
kaart mount — geen dubbele download, wel een correcte async-grens.

**Belangrijke nuance** (zie § 4): voor `/object/[id]` rendert de referentie-
kaart (`WaarderingKaart`) meteen bij het openen van het dossier (niet achter
een toggle), dus de browser haalt de maplibre-chunk daar alsnog meteen op —
de *build-statistiek* daalde met 278 kB, maar de **echte netwerkbytes op een
doorsnee dossierbezoek daalden niet evenredig** (zie Lighthouse-diagnostiek
§ 4). Voor `/woningen` (standaard tabelweergave, kaart is een toggle) is de
winst wél reëel: die pagina laadt nu helemaal geen maplibre-gl meer totdat
iemand op "kaart" klikt.

### Overige grote chunks (blijven, geen quick fix binnen dit item)

- `8832-*.js` (~374 kB parsed / ~106 kB gzip) op `/marktanalyse` en
  `/marktanalyse/concurrentie`: recharts + zijn ingebakken
  `@reduxjs/toolkit`-state (recharts v3 gebruikt intern redux). Zit
  synchroon in de pagina omdat de charts meteen zichtbaar zijn (geen tab/
  scroll erachter) — een `dynamic(ssr:false)` op de hele
  `MarktanalyseExplorer`/`ConcurrentieExplorer` zou de SSR van de rest van
  de pagina (filters, kerncijfers) ook wegnemen en per saldo niet per se
  sneller aanvoelen. Chirurgisch alleen de `<LineChart>`/`<BarChart>`-JSX
  uitsplitsen naar een apart dynamic-geladen kindcomponent zou wel kunnen,
  maar is een grotere refactor van twee 700+-regel-bestanden — niet gedaan
  binnen dit item, zie § 5 Open punten.
- `2117-*.js`/`fd9d1056-*.js` (samen ~87,9 kB, "First Load JS shared by
  all"): Next.js 14 App Router-runtime zelf (react, react-server-dom-
  webpack, router-reducer). Onvermijdelijk bij deze Next-versie.

## 3. Verbeteringen die zijn doorgevoerd

1. **`@next/bundle-analyzer`** als opt-in devDependency (`ANALYZE=true`,
   `next.config.mjs`).
2. **maplibre-gl lazy in plaats van eager** in `WoningenKaartLaag.tsx`,
   `components/kaart/VerkopenLaag.tsx`, `components/kaart/ReferentiesLaag.tsx`
   (zie § 2).
3. **Contrastfixes (a11y, `color-contrast`, enige falende audit op alle drie
   routes)**:
   - `colors.muted`/hardgecodeerd `#98A0A6` (tientallen plekken, tekst/
     labels): 2,65:1 op wit → **`#5C6470`** (= bestaande `colors.body`, geen
     nieuwe kleur), 5,2-6,0:1 op alle gebruikte achtergronden.
     `components/ResultTabs.tsx` en `components/ContentTekstenTab.tsx` bewust
     overgeslagen (buiten scope van dit item — andere agent).
   - `StatTile`/`DumbbellStat` semantisch groen/amber (`#1B7F4C`/`#B45309` →
     **`#166534`/`#92400E`**): faalden op hun eigen pil-achtergrond.
   - Dossier "Verwijder woning" (`text-red-500` → `text-red-600`, 3,76 → 4,83
     op wit) en "Toon oorspronkelijke invoer" (`text-gray-400` →
     `text-gray-500`, 2,45 → 4,66 op `#FAFBFB`).
   - Dashboard/woningen fase-badge amber (`#D97706` → `#92400E`, 2,97 → 6,6
     op de eigen 7%-achtergrondtint) — stond gedupliceerd in twee bestanden
     (`RecentBekeken.tsx`, `WoningenOverzicht.tsx`).

   Resultaat: accessibility 100 op alle drie gemeten routes, op alle
   presets.

4. **`scripts/meet-performance.mjs`** (nieuw, alleen lezend): querytimings
   op de echte demo-data, zie § 4.

Alle stappen: `npm run typecheck && npm run test` groen na elke commit; geen
migraties; geen hardgecodeerde merkkleuren toegevoegd (muted/body/groen/amber
zijn neutrale UI-tokens, geen `--merk*`-kleuren).

## 4. Server-side querytimings (`scripts/meet-performance.mjs`)

```
npx tsx --env-file=.env.local scripts/meet-performance.mjs
```

Logt in als het demo-account (RLS-gescoped, net als een echte makelaar),
roept dezelfde `lib/transactiesQuery.ts`-functies/RPC's aan als de pagina's
zelf, 5 herhalingen per meting, mediaan gerapporteerd (eerste run is vaak
kouder door verbindings-/planopbouw):

| Route | Functie | Mediaan | Min–max | n (rijen) |
|---|---|---|---|---|
| dashboard | `dataTotEnMet()` | 80 ms | 65–246 ms | — |
| dashboard | `haalEigenVerkopen()` (kerncijfers) | 156 ms | 119–179 ms | 1083 |
| dashboard | `haalRecentBekekenOp()` | 55 ms | 46–62 ms | 20 |
| marktanalyse | `haalEigenVerkopen()` (wij-lijn) | 183 ms | 164–186 ms | 1083 |
| marktanalyse | RPC `marktanalyse_samenvatting` | 129 ms | 119–184 ms | 7829 (achterliggend) |
| marktanalyse | RPC `transacties_plaatsen_wijken` | 52 ms | 51–73 ms | 12 |
| **transacties** | **`haalTransactiesVoorVerkenner()` (volledige set)** | **866 ms** | **818–879 ms** | **7829** |
| concurrentie | RPC `concurrentie_marktaandeel` (v1) | 78 ms | 76–91 ms | 10 |
| concurrentie | RPC `concurrentie_segmenten` (v1) | 77 ms | 76–80 ms | 21 |
| concurrentie | RPC `concurrentie_ranglijst` (v2) | 89 ms | 83–96 ms | 10 |
| concurrentie | RPC `concurrentie_wij_vs_markt` (v2) | 82 ms | 81–96 ms | — |
| dossier | `objecten` select-by-id (ongecachet) | 52 ms | 49–123 ms | — |
| dossier | `haalEigenVerkopen()` metCoordinaten (referentiekaart) | 246 ms | 202–469 ms | 1083 |

(De v2-concurrentie-RPC's — `concurrentie_ranglijst`/`concurrentie_wij_vs_markt`
— antwoordden gewoon; CLAUDE.md meldt die migratie als "nog niet toegepast",
kennelijk is dat inmiddels wel gebeurd of de test viel terug op een reeds
bestaande functie. Niet verder uitgezocht — buiten scope van dit item.)

### Conclusies

> **Correctie 27 sep 2026 (na deze meting):** de pagina `/marktanalyse/transacties`
> draait al sinds item 6.2 op de RPC `transacties_zoeken` (v2, toegepast op
> productie; `EXPLAIN ANALYZE` ongefilterd 7.829 rijen: **163 ms**).
> `haalTransactiesVoorVerkenner()` (866 ms) had geen levende aanroeper meer —
> hij is nu alleen de terugval als de RPC ontbreekt (`PGRST202`). De conclusies
> hieronder over "Transacties opzoeken" zijn daarmee achterhaald; een verouderd
> bestandscommentaar in `lib/transactiesQuery.ts` had op het verkeerde spoor gezet.

- **Alle RPC's (marktanalyse/concurrentie) zijn snel: 52-129 ms** op de
  echte demo-dataset — precies wat de patroon-2-aggregatiestrategie
  (`docs/architectuur.md` § 1) beoogde. Geen actie nodig.
- **`/marktanalyse/transacties` ("Transacties opzoeken") is de duidelijke
  uitschieter: 866 ms** voor `haalTransactiesVoorVerkenner()`. Dit is een
  bewuste, in de code zelf gedocumenteerde tussenfase (`lib/
  transactiesQuery.ts` bestandscommentaar: "de volledige... rijenset via
  `haalTransactiesVoorVerkenner`... RPC's... worden pas in fase 6
  aangesloten") — een range-lus van 8× 1000 rijen i.p.v. een
  server-side geaggregeerde RPC. Dit is de grootste resterende
  server-side performance-gap, maar **niet binnen dit item opgelost**: het
  vervangen van de volledige-tabel-fetch door een RPC/paginatie is een
  functionele wijziging aan een expliciet als "tussenfase" bestempelde
  pagina, met eigen risico's (sortering/filtering die nu client-side op de
  volledige set gebeurt) — hoort thuis in een eigen roadmap-item, niet
  stilletjes meegenomen in een performance-sessie. **Genoteerd voor de
  hoofdsessie.**
- **`haalEigenVerkopen() metCoordinaten` (dossier-referentiekaart, 246 ms
  mediaan, tot 469 ms)** en dezelfde functie op dashboard/marktanalyse
  (~150-185 ms) zijn de op één na grootste kostenpost — ook een range-lus
  (nu 2 requests voor 1083 rijen). Ruim binnen een enkele paginalaadtijd,
  geen quick win zonder dezelfde RPC-aanpak.
- **TTFB (server-response-time) op de dossierroute: 410-590 ms** in de
  Lighthouse-audits — grotendeels verklaard door de queries hierboven die
  parallel lopen (`Promise.all` in `app/(app)/dashboard/page.tsx`, bevestigd;
  vergelijkbaar patroon aannemelijk in de marktanalyse/concurrentie-
  actions, niet stuk voor stuk geverifieerd).

## 5. Waarom mobiel-performance de 85-lat niet haalt (marktanalyse, dossier)

Uit de Lighthouse-diagnostiek (vóór én ná, nagenoeg identiek):

- **LCP-element is tekst** (bv. de dossier-`<h1>` met het adres), geen
  afbeelding — de vertraging zit dus niet in een trage hero-image maar in
  hoeveel werk de browser moet doen (downloaden + parsen + hydrateren)
  vóórdat die tekst kan verschijnen.
- **`total-byte-weight` op de dossierroute bleef ~1,24 MB, vóór én ná de
  maplibre-fix.** Reden: `WaarderingKaart` (met de referentiekaart) mount
  meteen bij het openen van het dossier — niet achter een toggle/tab zoals
  op `/woningen`. De browser haalt de async maplibre-chunk dus alsnog
  meteen op zodra de pagina hydrateert; de fix loste een **architectuur-bug**
  op (de dynamic-grens werd door de children omzeild, zie § 2) maar geen
  **product-keuze** (de kaart is meteen zichtbaar). Een verdere stap —
  de kaart pas laden zodra hij in beeld scrollt (IntersectionObserver) —
  zou de eerste paint wél kunnen versnellen, maar is een UX-afweging (de
  referentiekaart is functioneel relevant voor het verkoopadvies, geen
  decoratie) en niet binnen dit item doorgevoerd.
- **Render-blocking CSS**: twee stylesheets (~305 ms + ~155 ms "wasted ms"
  op mobiel) — inherent aan hoe Next.js 14 CSS extraheert, geen kant-en-
  klare fix zonder risico op stijlregressies.
- **`mainthread-work-breakdown` laat zien dat een flink deel van de
  scripting-tijd (tot ~1000 ms bootup-time op de gedrosselde mobiele CPU)
  simpelweg de Next.js 14 App Router-runtime zelf is** (react,
  react-server-dom-webpack, router-reducer) — niet iets dat deze route
  specifiek kan wegoptimaliseren zonder een Next-upgrade.
- **recharts (~106 kB gzip via chunk `8832-*`) zit synchroon in
  `/marktanalyse`** omdat de grafieken meteen zichtbaar zijn — zelfde
  categorie afweging als de kaart hierboven (zie § 2).

Kortom: de twee gehaalde performance-doelen (desktop overal, dashboard
mobiel) zijn stevig; marktanalyse/dossier mobiel vragen om een grotere
ingreep dan "laaghangend fruit" (recharts/kaart pas bij zichtbaarheid laden,
mogelijk een lichtere grafiekbibliotheek, of de Next.js-upgrade die het
CLAUDE.md al noemt als openstaand beveiligingspunt) — buiten de scope en het
risicoprofiel van dit item.

## 6. Open punten (voor de hoofdsessie)

- Mobiel performance-doel (>85) niet gehaald voor `/marktanalyse` (~79-80)
  en `/object/[id]` (56-75, hoge meetspreiding — zie ⚠️ bovenaan). Zie § 5
  voor de architecturale redenen; geen van de opties (IntersectionObserver-
  laadgrens voor kaart/grafieken, RPC voor "Transacties opzoeken", Next.js-
  upgrade) is binnen dit item doorgevoerd — elk raakt product/architectuur-
  keuzes die niet stilletjes in een performance-sessie horen.
- `/marktanalyse/transacties`: 866 ms server-side voor de volledige-tabel-
  fetch (§ 4) — expliciet bekende tussenfase in de code zelf, grootste
  concrete vervolgstap.
- Gevonden maar **niet gefixt** (buiten scope, staat in bestanden waar deze
  sessie niet aan mag komen): geen a11y/performance-problemen aangetroffen
  in `components/ResultTabs.tsx`/`components/ContentTekstenTab.tsx` tijdens
  deze sessie specifiek, behalve dat ze dezelfde `#98A0A6`-tekstkleur
  gebruiken als de rest van de app (zie § 3) — nog steeds 2,65:1 contrast
  daar, dus als een van de gemeten/toekomstige routes die componenten
  toont, telt die a11y-audit daar nog steeds als falend.
- `components/ui/StatTile.tsx` regel 120 heeft een `var(--merk-rgb,
  26,107,69)`-fallback met ingebakken kleur (huisstijl-hook waarschuwt
  hierover) — pre-existing, niet aangeraakt door dit item (geen performance-
  of a11y-issue, wel een huisstijl-schuld voor een andere sessie).
- Lighthouse-mobielcijfers zijn in deze sandbox onbetrouwbaar volatiel
  (±19 punten tussen identieke runs) — een herhaling op een rustige machine
  of via Vercel's eigen Lighthouse-CI/PageSpeed Insights op de preview-URL
  is nodig voor een hard go/no-go op de mobiele 85-lat.
