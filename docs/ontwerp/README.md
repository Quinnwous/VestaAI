# docs/ontwerp — de prototypes zijn de spec

> Roadmap v2 § 3.8: voor elk hero-scherm bestaat vóór de bouw een interactief
> HTML-prototype in deze map. Sonnet port het 1-op-1 (layout, spacing, staten,
> interacties, formattering); alleen de datalaag wordt `lib/transactiesQuery.ts`.
> Bekijken: open het `.html`-bestand in de browser (`file://`) — `kit.css` en
> `kit.js` worden relatief geladen. Review na de bouw: skill `ontwerpreview`.

| Bestand | Voor | Status |
|---|---|---|
| `kit.css` | Tokens + primitives (topbar, filterbar, dropdown/popover, segmented, chips, pills, range-slider, switch, StatTile, ChartCard, tooltip, modal, staten) | klaar |
| `kit.js` | Dezelfde primitives als gedrag, opmaak (`euro`/`procent`/`dagen`/`datum`), URL-state, taxonomie woningtypes, team, synthetische datagenerator, het echte i4-logo | klaar |
| `marktanalyse.html` | Item 6.1 (+ 6.4 kwartaalbericht) | klaar (v2, 17 sep) |
| `verkoopkaart.html` | Items 7.1-7.3 | klaar (v2, 17 sep) |
| `concurrentie.html` | Item 6.3 — hero marktaandeel, wij vs. markt, trend per jaar (alle jaren), matrix "wie wint waar", ranglijst + concurrentprofiel-drawer met verbergen, lege staat "verkopend kantoor onbekend" | klaar (17 sep, Sonnet gebouwd, Fable AKKOORD na 1 ronde) |
| `transacties.html` | Item 6.2 — volledige filterset § 4, dichte tabel 50/pagina met sticky kop, detail-sheet met minikaart en "gebruik als referentie", CSV alleen eigen, skeleton bij serverlatency | klaar (17 sep, Sonnet gebouwd, Fable AKKOORD na 1 ronde) |
| `waardebepaling.html` | Item 4.6 — dossierheader, hero met band en badges, WOZ-ijkpunt, makelaarscorrectie, SVG-referentiekaart met straalcirkel en beeldmerk-pins, referentietabel met uitsluiten/herstel, correctie-chips (drie standen), drawer referentie toevoegen, staten laden/weinig data/leeg/zonder locatie/met correcties; cijfers = rekenvoorbeeld `docs/waardering-methode.md` | klaar (17 sep, Sonnet gebouwd, Fable AKKOORD na 1 ronde) |
| `startpagina.html` | Dashboard + dossierheader (2.5, 3.4, 10.2) — banner (teamfoto-placeholder neutraal), snelkoppelingen, kerncijfers met hero, recent bekeken, deze week; dossierheader met fasestepper, pitch-uitslag, waarde/content-blok, tabs; staten laden/weinig data/nieuw kantoor/in verkoop/verkocht/zonder foto | klaar (17 sep, Sonnet gebouwd, Fable AKKOORD na 1 ronde) |

Artifact-links (zelfde bestanden, gepubliceerd): zie `docs/besluiten.md` 17 sep.

Bekende kit-beperking: de topbar heeft geen mobiele inklapstand, dus elk
prototype overschrijdt op 390 px de viewport door de navigatie. Dat is geen
spec: de app gebruikt zijn eigen responsieve `AppTopbar`. Beoordeel prototypes
op 1280/1440 px; mobiel alleen op de inhoud onder de topbar.

Lokale helpers die in de prototypes staan maar NIET geport worden (staan ook
bovenaan elk bestand): fictieve kantoorlijst + toewijzing per rij
(concurrentie, transacties — in de app `verkopend_kantoor_norm`), straatnamen-
generator (transacties), eenzijdige range-slider (transacties; wordt een
variant van de app-slider), rekenregel voor de waarde (waardebepaling — in de
app `lib/waardering.ts`).

## 1. Ontwerprichting "i4 · zacht" (Apple-achtig, besluit Quinn 17 sep 2026)

1. **Vorm "zacht"** voor i4 Housing (was "strak"): kaarten 16 px, controls 12 px,
   chips/segmented/pillen volledig rond, modal 20 px. Dit is de bestaande
   radius-schaal van `lib/branding.ts` (`vorm: 'zacht'`); zet die via `/admin`
   of `scripts/repair-i4housing-branding.mjs` (item 1.9).
2. **Blauw is primair, rood is accent — en beide zijn zichtbaar.** Blauw:
   knoppen, actieve staten, "wij"-reeksen, pins, hero-tegel (verloop
   `#0A8AD2 → #005A8E`). Rood: het echte logo, de "live"-stip in de databadge,
   tel-badges op filters, segment B, de ring en het stokje van de pin, en de
   schakelaar-aan-staat. Nooit rood voor een semantische status (dat is amber
   `--let`); groen `--goed` alleen voor "gunstig".
3. **Ambient kleur op de achtergrond:** twee zachte radiale verlopen (blauw
   linksboven, rood rechtsboven) op `body`, zodat de pagina niet grijs oogt.
4. **Frosted balken:** topbar en filterbalk zijn sticky met
   `backdrop-filter: saturate(180%) blur(20px)` en 76-82 % wit.
5. **Schaduw met een zweem blauw** (`--schaduw-card`), hover tilt de kaart 1 px.
6. **Segmented controls met schuivende witte thumb**, dropdown-filters als
   pillen met chevron en rode tel-badge, popovers met "Wis" en "Gereed".
7. **Typografie:** Nunito Sans (Proxima Nova-stand-in), koppen 800 met
   `-0.025em`, getallen `tabular-nums`, labels sentence-case 13 px 600 (geen
   uppercase-eyebrows behalve de sectienaam in merkblauw).
8. **Beweging:** `cubic-bezier(.2,.8,.2,1)`, 220 ms; popover scale-in 180 ms;
   getal-tweens 400 ms; pins "poppen" bij afspelen; alles onder
   `prefers-reduced-motion` uit.
9. **Grafieken:** vloeiende lijnen (Catmull-Rom, spanning 1/8), verloopvlak
   onder "wij", eindlabels met botsingscorrectie, staven met ronde kop,
   frosted tooltipkaart met alle reeksen + n. Geen legendabox als er eindlabels
   zijn; hier wél een pil-legenda omdat er 2-3 reeksen zijn.
10. **Kaart:** PDOK BRT-Achtergrondkaart **pastel** (meer kleur dan grijs,
    pins blijven leesbaar); pin = mini-beeldmerk (zie § 5).

## 2. Tokens → app

| kit.css | App | Opmerking |
|---|---|---|
| `--merk`, `--merk-hover`, `--merk-diep`, `--merk-zacht`, `--merk-rand`, `--merk-op`, `--merk-accent*`, `--merk-rgb` | `lib/branding.ts` → `--merk*` | Gebouwd in item 1.9 (17 sep): `--merk-licht` = `lichter(primair, .25)` (voor verlopen, hero-tegel; `--merk-zacht` blijft de bijna-witte achtergrondtint), `--merk-accent-zacht/-rand/-rgb` afgeleid van de accentkleur; `--merk-diep` bestond al |
| `--r-sm … --r-pill` | `--merk-radius-sm … -pill` | bestaande schaal "zacht" |
| `--bg … --grid`, `--control` | `components/ui/tokens.ts` | `--control` (#EEF1F5) en `--border` als rgba zijn nieuw |
| `--goed`, `--let` (+ `-zacht`) | `tokens.ts` semantisch | vervangt losse groen/rood-hexes; rood nooit semantisch |
| `--serie-wij/markt/b` | `lib/grafiekThema.ts` | markt = donker neutraal (referentielijn) |
| `--schaduw-card/-hover/-pop`, `--ease`, `--t` | `globals.css` | |

## 3. Primitives → app (Radix via shadcn-patroon, item 6.0)

| kit.js | Component | Basis |
|---|---|---|
| `topbar()` | `AppTopbar.tsx` + marktanalyse-layout | bestaand, herstylen (pil-nav, frosted, echt logo) |
| `dropdown()` | `components/ui/FilterDropdown.tsx` | Radix Popover + trigger `.fbtn` met samenvatting en tel-badge |
| `segmented()` | `components/ui/SegmentedToggle.tsx` (bestaand, herbouwen) | Radix ToggleGroup of eigen, mét schuivende thumb |
| `vinkje()`, `chipsLijst()` | `Checkbox`, `Chip` | Radix Checkbox |
| `rangeSlider()` | `components/ui/RangeSlider.tsx` | Radix Slider (twee grepen), waardepillen erboven, ticks eronder |
| `schakel()` | `Switch` (bestaand) | Radix Switch, aan = accentkleur |
| `filterPills()` | `components/ui/FilterPills.tsx` | actieve filters + "Wis alles" |
| `tween()` | `StatTile.tsx` | bestaand |
| `leesHash()/schrijfHash()` | `hooks/useFilterState.ts` | `next/navigation` `useSearchParams` + Zod-schema i.p.v. hash |
| `genereerTransacties()` | `scripts/seed-demo-kantoor.mjs` (2.3) | dezelfde verdelingen; velden = kolommen `transacties` v2 |
| `TAXONOMIE` | `lib/transactieNormalisatie.ts` | `woningtype_groep` + `woningtype_sub` |
| `protoStrip()` | — | **niet porten** |

## 4. Filtermodel (vult `TransactieFilterSchema`, § 3.1)

| Filter | Control | Schema-veld | Marktanalyse | Transacties | Concurrentie | Verkoopkaart |
|---|---|---|---|---|---|---|
| Plaats + wijk | dropdown, zoekveld, plaats-vinkje met wijken eronder | `plaatsen[]`, `wijken[]` ("plaats\|wijk") | ✓ | ✓ | ✓ | (werkgebied vast) |
| Woningtype | dropdown, groep-vinkje (indeterminate) + subtypes | `typen[]` (subtypes; leeg = alle) | ✓ | ✓ | ✓ | ✓ |
| Periode | segmented 12/24/36/alles (+ aangepast bereik in Transacties) | `datum_van`, `datum_tot` | ✓ | ✓ | ✓ | tijdlijn (kwartaal van-tot + afspelen) |
| Prijs | dropdown, dubbele schuiver 0-5 mln stap 25 k, "geen max" | `prijs_min`, `prijs_max` | ✓ | ✓ | ✓ | ✓ |
| Woonoppervlak | dropdown, schuiver 30-500 m² | `opp_min`, `opp_max` | ✓ | ✓ | – | ✓ |
| Bouwjaar | in "Meer", schuiver 1900-2026 | `bouwjaar_min/max` | ✓ | ✓ | – | ✓ |
| Energielabel | in "Meer", chips A+++…G | `energielabels[]` | ✓ | ✓ | – | ✓ |
| Kamers | in "Meer", segmented 2+…6+ | `kamers_min` | ✓ | ✓ | – | ✓ |
| Perceel | in "Meer", schuiver 0-5.000 m² (n.v.t. appartement) | `perceel_min/max` | ✓ | ✓ | – | – |
| Kenmerken | in "Meer", vinkjes tuin/garage (later: balkon/dakterras, parkeren) | `tuin`, `garage` | ✓ | ✓ | – | ✓ |
| T.o.v. vraagprijs | in "Meer", segmented alle/boven/op-of-onder | `tov_vraagprijs` | ✓ | ✓ | – | – |
| Looptijd | in "Meer" (Transacties), schuiver 0-365 dgn | `looptijd_max` | – | ✓ | – | – |
| Verkocht door | dropdown, teamleden (alleen eigen verkopen) | `makelaars[]` | – | ✓ | – | ✓ |
| Verkopend kantoor | dropdown met zoek (Transacties); op Concurrentie niet als filter maar als "verberg dit kantoor" in ranglijst/drawer (pil om te herstellen) | `kantoren[]` | – | ✓ | (verbergen) | – |
| Prijsklasse | Marktanalyse: crossfilter (klik in de grafiek → pil); Concurrentie: dropdown met 5 klassen (< 500 k · 500-750 k · 750 k-1 M · 1-1,5 M · > 1,5 M) | `prijs_min/max` (afgeleid) | ✓ | – | ✓ | – |
| Segment B | schakelaar + plaats/typegroep | tweede filterset | ✓ | – | – (backlog; ontwerpsessie 17 sep: de matrix + drawer dekken "kantoor A vs B" al) | – |

Regels: elk actief filter is zichtbaar als pil onder de filterbalk met ×; een
tel-badge op de trigger toont hoeveel filters in een dropdown actief zijn;
"Herstel" zet alles terug; de hele filterstand staat in de URL; een filter
reageert client-side binnen 100 ms (eigen verkopen) of met skeleton (RPC).

## 5. Woningtype-taxonomie (`woningtype_groep` × `woningtype_sub`)

| Groep (waardering § 3.3) | Subtypes (filter, intake, import-normalisatie) |
|---|---|
| appartement | Bovenwoning, Benedenwoning, Maisonnette, Portiekflat, Galerijflat, Penthouse, Studio |
| rijwoning ("Eengezinswoning") | Tussenwoning, Hoekwoning, Eindwoning, Geschakelde woning, Herenhuis, Drive-in woning |
| halfvrijstaand | Twee-onder-een-kap, Geschakelde twee-onder-een-kap |
| vrijstaand | Vrijstaande woning, Villa, Landhuis, Bungalow, Woonboerderij |

Brainbay/Realworks leveren soort + type in eigen bewoordingen; `lib/transactieNormalisatie.ts`
mapt die naar deze lijst (onbekend → groep op basis van "appartement/woonhuis"
+ `sub = null`). De intake (`PropertyForm`, item 3.2) krijgt een Select met
deze groepen en subtypes i.p.v. de oude 6-waarden-enum.

## 6. Kaart en pin

- Basiskaart: PDOK BRT-Achtergrondkaart **pastel** (in de app: MapLibre +
  PDOK-vectortiles pastelstijl; in het prototype een statische uitsnede van
  Wassenaar/Voorschoten als data-URI, tegels x 8389-8394 / y 5399-5403, zoom 14).
- **Pin = mini-beeldmerk** (26×32, anker onderaan): rode ruit-omlijning
  (`--merk-accent`, 2 px), blauwe ruit (`--merk`), wit hart (r 2,1), rood stokje
  naar het ankerpunt. Hover: ruit `--merk-diep` + halo (blauw 22 %).
  Gekozen: ruit rood, ring blauw. Bij afspelen "poppen" nieuwe pins.
  SVG staat in `verkoopkaart.html` (`.pin svg`); in de app als
  `components/kaart/Pin.tsx` en als MapLibre-marker (HTML-marker, geen sprite).
- Clustering boven 200 zichtbare pins: blauwe cirkel met wit aantal en rode
  ring (zelfde beeldtaal). Niet in het prototype.
- Hover-kaart (frosted): adres · plaats/wijk · prijs (blauw) · subtype · m² ·
  bouwjaar · label · verkocht op · looptijd · boven/onder vraagprijs · makelaar.
- Zijlijst: rijen met typebadge (eerste letter groep), adres, datum · m² ·
  subtype · makelaar, prijs (blauw) + looptijd; hover ↔ pin; klik = pan +
  selectie; sorteren datum/prijs/looptijd. Kerncijfers "in beeld" met hero-tegel.
- Tijdlijn: dubbele schuiver over kwartalen met jaartikken + ronde afspeelknop.

## 7. Staten

Elke verkenner kent vier staten en het prototype toont ze via de
prototype-strip: **normaal**, **laden** (skeletons, geen spinner), **weinig
data** (tegel krijgt amberkleurige waarschuwing met n), **leeg** (kaart met
uitleg en "Herstel filters"). Port ze exact.

## 8. Port-instructies voor Sonnet

1. Lees dit bestand, `kit.css`, `kit.js` en het prototype van het item.
2. Bouw eerst de primitives die het item nodig heeft (uit § 3) in
   `components/ui/`, gethemed via `--merk*`; hergebruik wat er al is.
3. Bouw de pagina met exact dezelfde structuur en klassen-rollen (topbar →
   kop → filterbalk → pillen → tegels → grafieken/kaart), zelfde spacing.
4. Vervang de synthetische data door `lib/transactiesQuery.ts`; houd de
   client-side filterlogica voor eigen verkopen (< 100 ms) en gebruik RPC's
   voor de regio; toon skeletons alleen bij de eerste RPC.
5. Niet porten: prototype-strip, `alert()`-stubs, data-URI-kaart, hash-state
   (wordt `useFilterState` met `useSearchParams`).
6. Draai `ontwerpreview` (screenshot naast prototype) tot AKKOORD.

## 9. Recept voor een nieuwe ontwerpsessie (alle geplande prototypes zijn klaar; dit is voor een nieuw scherm)

Gebruik `kit.css`/`kit.js` (geen nieuwe tokens zonder reden), dezelfde
paginastructuur, dezelfde filterbalk-primitives, de staten via de
prototype-strip, synthetische data uit `Kit.genereerTransacties`, één "hero"-
moment per pagina in merkblauw, rood alleen als accent. Schrijf bovenaan het
bestand het item-nummer en wat er NIET in de app hoort. Neem één screenshot
op 1440 px, corrigeer wat je ziet, publiceer als artifact en noteer de link in
`docs/besluiten.md`.
