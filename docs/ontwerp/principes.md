# VestaAI — Ontwerpprincipes

> Leidend voor élk nieuw scherm en elke wijziging in de ingelogde omgeving.
> De Definition of Done toetst hieraan (`docs/werkwijze.md` § 4); dit document
> is de volledige versie.
> Geldt náást (niet in plaats van) de huisstijlregels in
> `.claude/skills/kantoorhuisstijl/SKILL.md` — dat gaat over merkkleur/vorm
> per kantoor, dit gaat over layout, beweging, data-weergave en interactie.

## Referenties

Geen van deze producten wordt gekopieerd — ze zijn een kompas voor het
*gevoel*, niet een sjabloon:

- **Stripe Dashboard** — datadichtheid met rust: veel cijfers, maar nooit
  druk. Tabellen en grafieken die naast elkaar kunnen bestaan zonder te
  schreeuwen.
- **Linear** — snelheid en subtiele beweging. Niets voelt traag; niets
  springt.
- **Claude-artifacts** — interactieve verkenners die direct reageren op een
  schuiver of knop, zonder laadscherm ertussen.
- **Apple (iOS-/macOS-instellingen, Wallet)** — sinds 17 sep 2026 leidend
  voor het *gevoel* van de kantooromgeving van i4 Housing: afgeronde kaarten
  (vorm "zacht"), frosted sticky balken, segmented controls met schuivende
  thumb, dropdown-filters als pillen, zachte schaduw met een zweem merkkleur,
  één hero-moment per pagina in merkblauw, rood alleen als accent. Uitgewerkt
  in `docs/ontwerp/README.md` § 1 en `docs/ontwerp/kit.css`. Voor
  datadichtheid blijft Stripe het kompas.
- **Airbnb** — alléén voor beeldmomenten (de startbanner, een dossierfoto).

## Layout

- Fluïde breedte, max `var(--app-breedte)` (1680px), via
  `components/ui/AppPagina.tsx` — nooit een losse `maxWidth` per pagina.
- Marge schaalt met het scherm: `var(--app-marge)` (`clamp(20px, 3vw, 48px)`),
  niet een vaste `40px`.
- Grid in 12 kolommen waar een pagina meerdere gelijkwaardige blokken toont
  (bv. de startpagina-kerncijfers); een enkele contentkolom (formulier,
  dossier) hoeft geen grid.
- Spacing in stappen van 4/8 (8, 12, 16, 20, 24, 32, 44, 80) — geen
  losse waarden als `18px` of `27px` tenzij een bestaand patroon dat al doet
  (bv. de topbar-hoogte 66px).
- Kaartpadding 20-24px; paginakop via `components/ui/PageHeader.tsx`
  (`Eyebrow` + `SerifTitle`), consistent op elke pagina.

## Typografie

- Lettertype van het kantoor (`var(--merk-font-body)` / `var(--merk-font-heading)`)
  — nooit een hardgecodeerd font.
- Schaal: 12 / 13 / 14 / 16 / 20 / 24 / 32 / 40. Grotere koppen alleen op de
  startpagina-banner en het woningdossier-adres.
- Cijfers altijd `fontVariantNumeric: 'tabular-nums'` zodat een kolom getallen
  niet "danst" bij het herladen (`components/ui/StatTile.tsx` doet dit al).
- Opmaak in `nl-NL`: `€ 1.250.000` (geen `$` of `1,250,000`), `4,2%` (komma,
  niet punt), `12 dgn` in plaats van `12 days`. Centraliseren in `lib/opmaak.ts`
  (gebouwd bij zijn eerste gebruiker, roadmap v2 item 6.1) i.p.v. los
  `.toLocaleString()` overal.

## Vorm

- Radius uitsluitend via `var(--merk-radius-*)` (schaal per kantoor in
  `lib/branding.ts`). i4 Housing staat sinds 17 sep 2026 op **zacht**
  (kaart 16 px, control 12 px, chips/pillen rond) — nooit een hardgecodeerde
  radius, zodat een "strak" kantoor met dezelfde componenten strak oogt.

## Kleur

- Uitsluitend `var(--merk*)` + neutraal grijs (`colors` uit
  `components/ui/tokens.ts`) — zie de huisstijlskill voor de volledige regel.
- Beide merkkleuren mogen zichtbaar zijn: primair voor knoppen, actieve
  staten, "wij"-reeksen, pins en de hero-tegel; accent voor de live-stip,
  tel-badges, segment B, de pin-omlijning en de schakelaar-aan-staat. Twee
  zachte ambient-verlopen op `body` (primair linksboven, accent rechtsboven)
  voorkomen een grijze pagina.
- Semantische kleuren (succes/waarschuwing/fout) staan vast en los van
  `--merk-accent` — bij i4housing is de accentkleur rood, en een afgevinkte
  stap in rood leest als een foutmelding.
- Eén tweede, louter onderscheidende reeks in een grafiek (bv. "Segment B"
  naast "Segment A") mag wél `--merk-accent` gebruiken.

## Beweging

- Eén curve: `cubic-bezier(.2,.8,.2,1)` (`--ease`), 220 ms (`--t`).
- Hover/focus: 150ms.
- Panelen open/dicht, tabwissel, popover (scale .96 → 1 + fade): 180-250ms.
- Getal-tweens (StatTile): ~400ms, ease-out cubic — niet lineair, dat oogt
  mechanisch.
- Geen bounce/spring-effecten — die passen niet bij "zakelijk en rustig".
- Alles respecteert `prefers-reduced-motion: reduce` (direct naar eindstaat,
  geen animatie).
- Kleine, doelgerichte CSS-transities en een losse `requestAnimationFrame`-tween
  waar nodig (zie `StatTile.tsx`). Een animatielibrary komt er alleen als een
  concreet item hem nodig heeft (roadmap v2: geen losse primitives-fase).
- **Bewegingssysteem** (nov 2026, `app/globals.css` § Bewegingssysteem) — pure
  CSS, geen library, niets hangt van hydratie af:
  - `.vui-binnen` (+ `--i` voor de volgorde) en `.vui-gestaffeld` (op de
    ouder) voor binnenkomst bij het laden; tegelrijen, dossierkop, startbanner.
  - `.vui-onthul` voor wat onder de vouw staat (scroll-driven
    `animation-timeline: view()`); `ChartCard` en de gedeelde grafiekrasters
    doen het al. Niet op hele secties die hoger zijn dan het scherm.
  - `.vui-spot` (lichtvlek die de muis volgt) + `.vui-tegel` (2 px omhoog):
    standaard op `StatTile`. `Kantel` = 3D-kanteling, maximaal één per pagina.
  - Paginaovergang via React `<ViewTransition>` in `AppPagina` (Marktinzichten:
    `RouteOvergang` in de layout); de topbar staat stil, de actieve pil glijdt.
  - Altijd `animation-fill-mode: backwards`, nooit `both`: een vastgehouden
    eindtransform zet de hover-transform buiten werking.
  - Screenshots, axe en e2e draaien met `reducedMotion: 'reduce'` (eindstaat).
  - Doorlopend en rustig (ronde 3): ambient-verlopen achter de kantooromgeving
    (26-32 s), scrollvoortgang onder de topbar, trage zoom op teamfoto's
    (`scale`, los van de parallax-`transform`), sparklines die zich tekenen,
    pulserende ring om illustratiepins, markeerstreep onder het accentwoord.
  - `InBeeld` (components/ui/InBeeld.tsx) voor een eenmalige, tijdgebaseerde
    animatie zodra iets in beeld komt (landing: BAG-blok typt zich, staven
    groeien). Zonder JavaScript staat alles er gewoon.
  - Keyframes voor binnenkomst hebben alleen een `from`: het eind is de eigen
    waarde van het element, dus geen sprong bij bv. een halfdoorzichtige rij.
- **3D-beeld:** `HuisIllustratie`/`DataIllustratie` (isometrisch, volledig in
  `var(--merk*)`) voor lege staten (`EmptyState illustratie="woning|data"`),
  de startbanner zonder foto en de dossierkop zonder foto.

## Data-weergave

- **Elke statistiek toont zijn n** en, waar relevant, een badge
  "data t/m [datum]" — nooit een kaal getal zonder context.
- **Te weinig data → een waarschuwing, geen schijnzeker getal.** Zie het
  bestaande patroon in `lib/waardering.ts` (lage-data-waarschuwing) — dat
  geldt voortaan voor élke statistiek in de app, niet alleen waardering.
  `components/ui/StatTile.tsx` ondersteunt dit met de `waarschuwing`-prop.
- **Filters reageren binnen 100ms** waar de data al client-side beschikbaar
  is (pure functies in `lib/*.ts`); een aggregatie die de database moet
  raken toont een skeleton (`components/ui/Skeleton.tsx`), nooit een spinner.
- **Grafieken:** hooguit 5 reeksen tegelijk, directe labels waar het kan
  (i.p.v. alleen een legenda), een tooltip die alle onderliggende waarden
  toont. Zie de skill `dataviz` voor kleurformules en vormheuristiek; het
  gedeelde thema komt in `lib/grafiekThema.ts` (roadmap v2 item 6.1).
- **Lege staten wijzen naar een volgende actie** — `components/ui/EmptyState.tsx`
  i.p.v. losse "geen resultaten"-teksten per explorer.

## Interactie

- Elke filterstand hoort in de URL (querystring), zodat een view deelbaar is
  en de terugknop werkt — hook `useFilterState` (roadmap v2 item 6.1, daarna
  verplicht voor elke verkenner).
- Toetsenbord: elk interactief element bereikbaar met Tab, focusring in de
  merkkleur (niet de browserstandaard-blauw, dat botst met een niet-blauw
  kantoor).
- Elk paneel/elke modal sluit met Escape en een klik buiten het paneel (zie
  het bestaande patroon in `AppTopbar.tsx`).

## Afbeeldingen

- Nooit het gebroken-afbeelding-icoon van de browser: elke `<img>` met een
  kans op een kapotte URL heeft een `onError`-fallback (zie `KantoorBanner.tsx`
  en de logo-fallback in `AppTopbar.tsx`).
- Vaste beeldverhoudingen (`aspect-ratio`), zodat een laadmoment geen
  layoutsprong veroorzaakt.

## Toetsing (Definition of Done)

Voor elk item: `scripts/screenshots.mjs` op 390/1280/1920px, beoordeeld tegen
dit document. Zie docs/werkwijze.md voor de volledige Definition of Done.
