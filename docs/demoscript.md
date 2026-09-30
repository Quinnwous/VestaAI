# Demoscript — i4housing (±25 minuten)

> Item 12.5a (`docs/roadmap.md` § 5 Fase 12). Uitwerking van het demoscript in
> § 2 (zes scènes) tot klik-voor-klik, met terugvalplan per scène. Knoplabels,
> routes en teksten hieronder zijn geverifieerd tegen de code op 27 sep 2026
> (`git log` `ff8b181`) — niet verzonnen. Wijzigt een label in de code, dan
> wijzigt dit document mee.

## ⚠️ Belangrijkste blokkade voor de live demo

**Fase 5 (echte i4housing-data) is nog niet gestart** (Brainbay/Realworks-
exports nog niet ontvangen, zie roadmap § Stand van zaken). Het kantoor
`i4housing` (`/login/i4housing`) bestaat, heeft zijn eigen huisstijl en logt
in, maar heeft **nul rijen in `transacties`** — Marktanalyse, Transacties,
Concurrentie, Verkoopkaart en de kerncijfers op `/dashboard` tonen daar op dit
moment allemaal de eerlijke lege staat ("Nog geen transacties"), en de
waardering van elk nieuw dossier valt terug op "methode: plaats" zonder
referenties.

Zolang dat zo is:
- **Repeteer en demonstreer op `/login/demo`** ("Demo Makelaardij", neutrale
  huisstijl, ~8.000 regionale transacties rond Wassenaar e.o., 1.103 eigen
  verkopen). Dit script is er 1-op-1 op geschreven.
- **Zodra fase 5 is opgeleverd** (`5.1`–`5.5`): zelfde klik-voor-klik-script,
  maar ingelogd op `/login/i4housing` met i4housing's eigen huisstijl (blauw
  `#0080C8` / rood `#C61E45`, "zacht"). Vervang in elke scène hieronder
  "Demo Makelaardij" door "i4 Housing" en de voorbeeldcijfers door de echte.
  Niets aan de klikvolgorde verandert.
- Voor de **allerlaatste generale repetitie vóór de echte demo**: opnieuw
  langs dit script op `/login/i4housing`, zodra fase 5 live is.

---

## Voorbereiding

### Drie demo-dossiers (één per fase)

Het demo-kantoor heeft via `scripts/seed-demo-kantoor.mjs` al **15 dossiers**
staan: 5 per fase (Verkoopadvies / In verkoop / Verkocht), waarvan 4 in
"In verkoop" al gegenereerde content hebben. Voor de demo drie vaste dossiers
kiezen en **hun `/object/<id>`-URL vooraf opslaan** (bladwijzer of notitie),
zodat je tijdens de demo niet hoeft te zoeken:

| Fase | Wat je nodig hebt | Hoe te vinden/maken |
|---|---|---|
| **Verkoopadvies** | Eén dossier zonder foto's/content, met een waardering die een duidelijke bandbreedte en ≥ 8 referenties toont (voor scène 4: kies er zelf ook een **nieuwe** bij, zie hieronder) | `/woningen` → filter **Verkoopadvies** → open er één, noteer `object_id` uit de URL |
| **In verkoop** | Eén dossier **met** al gegenereerde NL+EN-content (voor scène 5 als vaste terugval, zie hieronder) | `/woningen` → filter **In verkoop** → open er één waar de contentknop al "Content klaar" toont |
| **Verkocht** | Eén dossier, puur om te laten zien dat alles bereikbaar blijft (archief) | `/woningen` → filter **Verkocht** → open er één |

**Gekozen op 30 sep 2026** (demo-kantoor, alle drie in Wassenaar, met de meeste
referenties in hun fase — gecontroleerd in de database):

| Fase | Dossier | Waarom |
|---|---|---|
| Verkoopadvies | Kerkehoutlaan 12 — `/object/0e4c5322-92a4-41f7-b005-57344f8b6a4e` | waardering met 25 referenties, geen content |
| In verkoop | Storm van 's-Gravesandeweg 3 — `/object/e86b86d7-5755-41c7-9319-ea02a9ec3423` | NL-content klaar, 22 referenties. ⚠️ nog **geen Engelse** content (geen enkel demo-dossier heeft die): één keer "Genereer content" draaien, en dat hoort bij de betaalde testruns (roadmap § 8 punt 6) |
| Verkocht | Rust en Vreugdlaan 5 — `/object/f1db5bd7-133f-4e1a-989c-7be97d505f10` | content klaar, 25 referenties |

Geen van de demo-dossiers heeft foto's; voor de brochure-pdf en virtual staging
in scène 5 vooraf een paar foto's uploaden in het In verkoop-dossier.

**Voor scène 4 (het live verkoopadvies)** maak je **een extra, vers dossier**
vlak vóór de repetitie/demo aan via `/object/new` — dat is juist het punt van
de scène (adres typen, dossier staat er direct, waardering live doorrekenen).
Kies een adres **binnen het werkgebied van de fixture** (Wassenaar, Voorschoten,
Den Haag/'s-Gravenhage, Leidschendam) zodat er referenties binnen de straal
liggen; een adres buiten de regio levert een dunne of lege referentieset op.
Test dit adres **minimaal één keer vooraf** — een waardering met te weinig
data (n < 4, band ± 15 %) oogt zwak in een demo.

**Voor scène 5 (content genereren, live)** gebruik je hetzelfde verse dossier
uit scène 4, of een eigen tweede vers dossier — zolang het nog geen content
heeft, zodat "Genereer content (NL + EN)" écht klikbaar en zichtbaar is. Zie
het terugvalplan bij scène 5 voor de tijdsrisico's.

**Voor "Leren van je bewerkingen" (onderdeel van scène 5):** dit paneel vraagt
minimaal 4 handmatige tekstbewerkingen voordat "Analyseer N bewerkingen"
klikbaar wordt (`components/StijlLerenPaneel.tsx`). Vier live bewerkingen
maken kost te veel tijd — **bewerk vooraf al 4+ velden** op het "In verkoop"-
terugvaldossier (of het verse scène 5-dossier, een dag van tevoren), zodat de
knop tijdens de demo al actief staat en je alleen op "Analyseer" hoeft te
klikken.

### Checklist — dag ervoor

1. **Vercel** naar **Pro** (roadmap § 8 actie 4, staat nog op Hobby) —
   zonder Pro kapt een lange functie-aanroep (contentgeneratie) af.
2. **Supabase-project actief**: log kort in, draai één query — een gratis
   project pauzeert na 7 dagen inactiviteit.
3. **Demo-freeze**: branch `demo` aanmaken vanaf `main`, **48 uur geen
   deploys** meer op die branch. Vanaf dit moment niets meer mergen dat de
   demo-omgeving kan raken.
4. **Contentgeneratie één keer timen** op de branch `demo` zelf (niet lokaal):
   start "Genereer content (NL + EN)" op een vers dossier, stopwatch. Ligt de
   tijd dicht bij de Vercel-limiet van 300 s, dan het terugvaldossier (zie
   hierboven) als hoofdplan voor scène 5 gebruiken in plaats van live
   genereren.
5. Alle drie/vier demo-dossier-URL's + het scène 4-adres nog een keer
   controleren (geen 404, geen foutstaat).
6. `npm run dod:screens` tegen de `demo`-branch draaien (huisstijlcheck +
   screenshots) — geen VestaAI-groen, geen foutstaat, geen `pageerror`.

### Checklist — 1 uur ervoor

1. Inloggen op `/login/demo` (of `/login/i4housing` zodra fase 5 live is) in
   het echte presentatie-account, sessie warm houden.
2. Tabs/vensters vooraf openen in deze volgorde (voorkomt live typen van
   URL's): `/dashboard` · `/marktanalyse` · `/marktanalyse/concurrentie` ·
   `/object/new` · het "In verkoop"-terugvaldossier · `/marktanalyse/kaart`.
3. Schermresolutie: laptop op het grote scherm, browserzoom op **100 %**
   (kleinere/grotere zoom breekt de `auto-fit`-grids op onvoorspelbare
   punten — nooit getest op afwijkende zoomniveaus).
4. Browser-devtools dicht, geen extensies die de pagina aanpassen
   (adblockers kunnen PDOK-tiles of Resend-preview blokkeren).
5. Wifi/netwerk testen — de kaart (PDOK-tiles) en contentgeneratie (Claude
   API) hebben beide een live verbinding nodig.
6. Notificaties/Slack/mail dicht.

### Generale repetitie

Minimaal één keer het hele script van scène 1 t/m 6 doorlopen **zonder te
pauzeren voor uitleg**, met een stopwatch per scène (streeftijden staan bij
elke scène hieronder), en **screenshots van elk scherm** die je erna naast
`docs/ontwerpprincipes.md` en de prototypes in `docs/ontwerp/` legt. Noteer
elke hapering (trage laadtijd, afwijkende tekst, gebroken layout op het
gebruikte scherm) en fix of plan een terugval vóórdat de echte demo begint.

### Automatische repetitie

Naast de handmatige generale repetitie hierboven bestaat een geautomatiseerd
script dat de zes scènes hierboven klik-voor-klik naloopt tegen een lokale
dev-server (item 12.5b, `scripts/generale-repetitie.mjs`):

```
npm run demo:repetitie                        # demo-kantoor, 1920×1080, poort 3101
npm run demo:repetitie -- --kantoor=i4housing
npm run demo:repetitie -- --breedte=1280 --port=3102
```

Het script:
- navigeert/klikt zoals dit document beschrijft, wacht op de verwachte
  inhoud en maakt een screenshot per stap (`screenshots/repetitie/<scène>--
  <stap>.png`);
- meet de laadtijd per stap en waarschuwt bij > 3 s — opvallend op het grote
  scherm van de echte demo, ook al is dat in lokale dev-mode vaak vooral de
  eerste (cold-compile) keer dat een route wordt bezocht;
- faalt hard op een `pageerror`, console-error, Next.js-foutoverlay, een lege
  staat waar data verwacht wordt (bv. "Nog geen transacties"), een
  ontbrekend knoplabel of een niet-2xx-navigatie;
- **scène 4, stap 2 typt écht een adres** (`Langstraat 10 Wassenaar` — een
  bestaand adres binnen het werkgebied, geen fixture-adres die bestaan niet
  in de BAG) teken voor teken in `/object/new`, wacht op de listbox
  (`role="listbox"`/`role="option"`, faalt na 5 s zonder suggestie), kiest de
  eerste suggestie via het toetsenbord (ArrowDown + Enter — test de
  combobox-ARIA, niet een muisklik) en pollt daarna `bouwjaar`/`oppervlak_m2`
  tot de BAG-koppeling ze heeft voorgevuld. Dit is de regressietoets voor de
  BAG-les van 27 sep 2026: de adres-autocomplete en het bouwjaar/oppervlak-
  voorvullen deden maandenlang ongemerkt niets omdat een mislukte BAG-call
  stil tot "leeg" werd opgevouwen — voorheen controleerde deze stap alleen of
  het adresveld zichtbaar was, wat die regressie nooit had gevangen. Een
  requestlistener bewaakt tijdens het typen/kiezen dat er geen niet-GET-
  verzoek naar `/api/` gaat (beide aanroepen, `/api/bag` en `/api/verrijking`,
  zijn read-only geverifieerd in de routecode). Na de check klikt het script
  eenmalig "Volgende →" naar wizardstap 2 (Woning) zodat de screenshot de
  voorvulling ook toont — verder dan die stap, of op "Woning aanmaken", wordt
  niet geklikt;
- **voert geen schrijfacties of betaalde AI-aanroepen uit**: maakt geen
  nieuw dossier (scène 4 gebruikt vanaf stap 5 een bestaand verkoopadvies-
  dossier van het kantoor) en klikt nooit "Genereer content", "Kwartaalbericht
  schrijven" (start al bij het ÓPENEN van de modal een Claude-call),
  "Uitsluiten"/"Vastleggen" bij de waardering (persisteren op de achtergrond
  naar `objecten.waardering_json`) of de fase-pil "In verkoop" (wijzigt
  `objecten.fase` én start automatisch contentgeneratie) — voor die stappen
  wordt alleen gecontroleerd dat de knop bestaat en klikbaar is. De
  waardebepaling- en brochure-pdf zijn wél puur lezend en worden aangeklikt,
  met een duurmeting (belofte < 10 s voor de waardebepaling-pdf);
- eindigt met een rapporttabel (scène · stap · status · duur) en het totaal.

Bekende beperking: hoveren over een kaartpin (scène 6, stap 3) is
canvas-gerenderd door MapLibre en wordt bewust overgeslagen — niet
betrouwbaar te automatiseren met een vaste selector.

Draai het vóór de handmatige generale repetitie én vóór de echte demo; een
rode regel in de tabel is een concreet punt om te fixen, geen giswerk.

---

## De zes scènes

### Scène 1 — "Dit is óns platform" (2 min)

**Belofte:** het is hun platform, niet een generieke tool.

| # | Klik / actie | Wat ze zien |
|---|---|---|
| 1 | Ga naar `/login/demo` (later: `/login/i4housing`) | Kantoorlogin in de huisstijl van het kantoor (logo, kleuren, lettertype) |
| 2 | Log in | Redirect naar `/dashboard` ("Overzicht" in de topbar) |
| 3 | — | **Startbanner**: merkverloop (géén teamfoto — zie let-op hieronder), datum, begroeting **"Goedemorgen/-middag/-avond, [voornaam]"**, contextregel (bv. "N dossiers wachten op content") |
| 4 | — | **Kerncijfers**, 6 tegels: *Verkocht laatste 12 maanden* (+ delta) · *Gem. looptijd* (vs. markt) · *Marktaandeel [plaats]* · *Prijs t.o.v. vraagprijs* · *In verkoop* · *Lopende verkoopadviezen* — elke tegel met n en "data t/m" |
| 5 | — | **Recent bekeken**: laatste ~5 dossiers die deze makelaar opende |

**Wat de presentator zegt:** "Dit hier is jullie eigen omgeving — jullie
logo, jullie kleuren, en meteen de cijfers van jullie eigen markt: wat er de
afgelopen 12 maanden is verkocht, hoe snel, en hoe jullie ervoor staan ten
opzichte van de rest van [plaats]."

**Let op — twee afwijkingen van de scène-belofte in § 2:**
- Er staat **geen teamfoto** in de banner (besluit Quinn 19 sep 2026: een
  aangeleverde foto oogde zacht opgeschaald; nu een merkverloop met raster/
  glans). Item **12.1** (teamfoto via `achtergrond_url`) staat nog open en
  wacht op een door Quinn goedgekeurde foto — noem in de demo dus niet "hier
  staat het team", tenzij 12.1 alsnog wordt opgeleverd.
- Er is **geen "Deze week"-tijdlijn** naast Recent bekeken — die is bewust
  geschrapt (item 10.4, roadmap § 6 schrapvolgorde) en niet gebouwd.

**Terugvalplan:**
- **Marktaandeel-tegel leeg/ontbreekt:** komt voor als het kantoor geen
  werkgebied heeft ingesteld (`instellingen_json.werkgebied`, platform-admin-
  beheerd) — tegel valt dan netjes weg i.p.v. te crashen. Vooraf checken en
  zo nodig instellen via `/admin/kantoor/[id]`.
- **Hydratiefout (pagina reageert nergens meer op, bv. profielmenu doet
  niets):** eerst `F5` proberen; gebeurt het opnieuw, dan is er een
  serverside/clientside-tijdsverschil (CLAUDE.md-les 19 sep) — niet live
  debuggen, doorgaan naar scène 2 en de startpagina na de demo checken.

---

### Scène 2 — "Eindelijk snappen we onze data" (5 min)

**Belofte:** inzicht + uren bespaard.

| # | Klik / actie | Wat ze zien |
|---|---|---|
| 1 | Topbar → **Marktanalyse** (`/marktanalyse`) | Eyebrow "Marktinzichten", titel "Marktanalyse", filterbalk bovenaan, badge "Data t/m [datum] · N transacties in de selectie" |
| 2 | Filterdropdown **Plaats** → alle vijf werkgebiedplaatsen staan standaard al aan; "Wis" en dan "Wassenaar" aanvinken (of de andere vier uitvinken) zodat alleen "Wassenaar" overblijft ⚠️ *niet* zelf op "Wassenaar" klikken — die staat al aan, dus dat vinkt 'm juist uít | Filterknop toont nu "Plaats Wassenaar" (geen losse ×-pil onder de balk — dat krijgen alleen Type/Prijs/Wijken e.d., zie hieronder), cijfers herberekenen (< 100 ms, client-side) |
| 3 | Filterdropdown **Woningtype** → vink "Vrijstaand" aan | Filterpil "Type: Vrijstaand" verschijnt onder de filterbalk, cijfers filteren verder |
| 4 | Gesegmenteerde periodeknop → **"24 mnd"** | 5 tegels met delta t.o.v. de vorige periode: *Mediaan verkoopprijs* (hero) · *Mediaan prijs per m²* · *Mediaan looptijd* · *Verkocht t.o.v. vraagprijs* · *Verkopen in de selectie* |
| 5 | — | Twee grafiekkaarten naast elkaar: prijs & € per m² per kwartaal, looptijd per kwartaal — lijnen "Wij" (merkkleur) vs. "Markt" (neutraal donker) |
| 6 | Schuif naar beneden | Verdeling naar prijsklasse (staven, klikbaar = crossfilter) en typegroep |
| 7 | (optioneel) Switch **"Segment B"** aanzetten, kies een andere plaats/type | Derde reeks in accentkleur naast Wij/Markt, ter vergelijking |
| 8 | Klik **"Kwartaalbericht schrijven"** (rechtsboven, naast de databadge) | Modal opent; Claude schrijft in ~250-350 woorden een Q3-marktupdate in i4housing's eigen toon, met alleen cijfers uit het zichtbare feitenblad; knoppen kopiëren + download `.md` |

**Wat de presentator zegt:** "Dit is niet een dashboard dat we voor jullie
hebben ingevuld — dit zijn filters die je zelf bedient. Kijk, ik zet 'm op
Wassenaar, vrijstaand, laatste 24 maanden — en binnen een paar seconden staat
er een compleet marktbericht klaar, in jullie eigen toon, met alleen cijfers
die je hier ook echt ziet staan."

**Terugvalplan:**
- **Geen transacties (i4housing zonder import):** badge toont neutraal "Nog
  geen transacties" i.p.v. een foutmelding — leg uit dat dit de nieuw-
  kantoor-staat is, en schakel meteen over naar `/login/demo` voor de rest
  van de scène, of sla scène 2 in zijn geheel over op i4housing tot fase 5
  live is.
- **Kwartaalbericht-knop faalt/duurt lang:** knop is disabled zolang er geen
  resultaten zijn; bij een serverfout gewoon doorpraten over de grafieken en
  de knop later los laten zien — er wordt niets opgeslagen, dus niets om op
  terug te vallen buiten "nog een keer proberen".
- **Grafieken tonen niets bij een te smalle filtercombinatie:** klik "Wis
  alles" (verschijnt zodra er ≥ 2 filterpillen actief zijn, onder de
  filterbalk) om alle filters terug te zetten. De "Wis"-knop *binnen* de
  Plaats-dropdown maakt de plaatskeuze leeg (= alle plaatsen); tot 27 sep deed
  hij niets, gefixt in `hooks/useFilterState.ts`.

---

### Scène 3 — "Wie wint waar" (3 min, conditioneel)

**Belofte:** positie in de regio.

⚠️ **Alleen tonen als bevestigd is dat de Brainbay-export het veld
"verkopend kantoor" bevat** (roadmap § 2 demo-minimum: "scène 3 zodra
Brainbay het verkopend kantoor blijkt te bevatten"). Op het demo-kantoor is
dit veld wél gevuld (fixture) — daar werkt de scène nu al voluit.

| # | Klik / actie | Wat ze zien |
|---|---|---|
| 1 | Topbar → **Concurrentie** (`/marktanalyse/concurrentie`) | Titel "Concurrentie", zelfde soort filterbalk als scène 2 |
| 2 | Filter op Wassenaar, vrijstaand, > € 1 mln (prijsfilter) | Tegels met marktaandeel, eigen kantoor uitgelicht in merkkleur |
| 3 | — | Matrix "wie wint waar" (plaats × typegroep → top-kantoor + aandeel) |
| 4 | — | "Wij vs. markt": looptijd, prijs t.o.v. vraagprijs, € per m² |
| 5 | Klik op een concurrent in de ranglijst | `Drawer` opent met het concurrentprofiel (top 8, schrapbaar) |

**Wat de presentator zegt:** "En dit is denk ik het stuk dat nog niemand
jullie kan laten zien: wie wint welk segment in jullie eigen regio, en hoe
presteren jullie zelf op looptijd en prijs ten opzichte van die concurrenten."

**Terugvalplan (dit ís de scène-brede terugval):**
- **Veld `verkopend_kantoor` (nog) niet gevuld in de i4housing-export:** de
  pagina toont een eerlijke, geen-foutmelding-lege staat: **"Verkopend
  kantoor onbekend in deze export"** met uitleg. Op i4housing's eigen data
  dus: **scène 3 overslaan** conform het demo-minimum in § 2, direct door
  naar scène 4. Niet proberen te verbergen — de lege staat is zelf al netjes
  genoeg om kort te tonen en uit te leggen wat er nog moet gebeuren.

---

### Scène 4 — "Hiermee zetten we het verkoopadvies op papier" (7 min)

**Belofte:** het verkoopadvies staat, de opdracht volgt.

| # | Klik / actie | Wat ze zien |
|---|---|---|
| 1 | Topbar → **Woningdossier** → knop **"Woning toevoegen"** (in de kop van `/woningen`) | `/object/new`, wizard-stap **1 "Adres"** |
| 2 | Typ het voorbereide adres in het adresveld, kies de BAG-suggestie | Bouwjaar/oppervlak/energielabel worden automatisch voorgevuld uit de BAG-koppeling |
| 3 | Stappen 2-4 (**Woning** · **Staat & afwerking** · **Ligging & buitenruimte**) kort doorlopen, minimaal woningtype/oppervlak/bouwjaar invullen | Live samenvatting ernaast (`DezeWoningPaneel`) vult mee |
| 4 | Stappen 5-6 (**Verhaal**, **Commercieel**) mogen leeg/kort — niet verplicht voor het aanmaken | — |
| 5 | Formulier indienen | **Dossier staat er direct** (< 5 s, geen Claude-call) — redirect naar `/object/<id>`, fase **Verkoopadvies** |
| 6 | In het dossier: waarderingspaneel | Hero-tegel **"Indicatieve waarde"** met bandbreedte (laag–hoog), badges (n = …, straal …, peildatum, data t/m) |
| 7 | Scroll naar de referentietabel + kaart | Referenties binnen de straal op de kaart (`WaarderingKaart`, subject-pin + referentie-pins), tabel met per referentie: € per m², indexfactor, correcties, gewicht → geïmpliceerde waarde |
| 8 | Klik het **×**-icoon naast één referentie ("Uitsluiten") | Referentie valt weg, waarde herberekent live |
| 9 | Onder "Correcties": klik de chip **"Garage"** of **"Tuin"** uit/aan | Waarde + band updaten live (wat-als) |
| 10 | Sectie **"Makelaarscorrectie"**: vul een bijgestelde waarde + verplichte motivatie in, klik **"Vastleggen"** | Correctie zichtbaar met motivatie, blijft bewaard |
| 11 | Klik **"Waardebepaling-pdf"** (rechtsboven in de dossierkop) | Pdf genereert in < 10 s, in kantoorstijl, met exact het bedrag dat op het scherm staat |
| 12 | In de fase-stepper bovenaan: klik de pil **"In verkoop"** | Dossier gaat door naar fase **In verkoop**; content start automatisch te genereren op de achtergrond |

**Wat de presentator zegt:** "Ik typ nu gewoon een adres in — geen
formulieren invullen die je straks toch weer overtypt. Het dossier staat er
meteen. En hier: dit is geen taxatie, maar een onderbouwde indicatie op basis
van vergelijkbare verkopen bij jullie in de buurt — met elke correctie
zichtbaar, en jullie eigen inzicht blijft altijd het laatste woord via de
makelaarscorrectie."

**Terugvalplan:**
- **Waardering toont weinig data / brede bandbreedte op het live adres:**
  gebruik het vooraf geteste adres (zie Voorbereiding) in plaats van een
  spontaan adres; als het toch dun uitvalt, benoem het expliciet — "bij
  minder dan 6 referenties verbreden we de bandbreedte bewust, in plaats van
  een schijnzeker getal te tonen" — dat is zelf een verkoopargument.
- **Kaart laadt niet (CSP/netwerk):** de referentietabel blijft zonder kaart
  gewoon werken (kaart is een aparte laag); toon dan alleen de tabel en ga
  door, of val terug op een screenshot van de kaart uit de generale
  repetitie.
- **Pdf-knop faalt of duurt lang:** de route rekent niets opnieuw uit (leest
  alleen `waardering_json`), dus een herhaalde klik is veilig; lukt het
  na twee pogingen niet, dan door naar stap 12 en de pdf later los laten
  zien.
- **BAG-lookup bij het adres faalt (stap 2):** velden blijven leeg,
  gewoon handmatig invullen (woningtype/oppervlak/bouwjaar) — het formulier
  accepteert dat, alleen de auto-vul valt weg. Deze stap heeft sinds 28 sep
  2026 een échte regressietoets in de automatische repetitie (§ Automatische
  repetitie hierboven) — een rode `scene4 2/3/4`-regel daar is dus een
  concreet BAG-signaal, niet alleen een demo-risico.

---

### Scène 5 — "Dit scheelt ons uren" (5 min)

**Belofte:** uren bespaard.

| # | Klik / actie | Wat ze zien |
|---|---|---|
| 1 | In het dossier (fase **In verkoop**) → tab **Content** | Als er nog geen content is: lege staat **"Nog geen content gegenereerd"** met knop **"Genereer content (NL + EN)"** |
| 2 | Klik **"Genereer content (NL + EN)"** | Spinner + tekst **"Content genereren (NL + EN)…"** met live mm:ss-timer, skeletons eronder |
| 3 | Wachten (zie terugvalplan — dit kan oplopen tot ~3 min) | Bij succes: 7 tabs verschijnen — **Funda · Brochure · Instagram · LinkedIn · WhatsApp · E-mail · Buurt** |
| 4 | Klik tab **Funda** | Funda-tekst in het 4SALE!-format (i4housing's eigen koppenstructuur), toggle **"🇳🇱 NL / 🇬🇧 EN"** ernaast |
| 5 | Klik tab **WhatsApp** | Sneak-preview-bericht, ≤ 600 tekens |
| 6 | Klik **"Exporteer PDF"** (brochure) | Brochure-pdf in kantoorstijl: cover, tekst, foto's, kenmerken, slot |
| 7 | Bewerk handmatig een zin in de Funda-tekst, sla op | Tekst wordt opgeslagen; telt mee als een "bewerking" |
| 8 | Scroll naar **"Leren van je bewerkingen"** onderaan | Als er ≥ 4 (vooraf gezette) bewerkingen zijn: knop **"Analyseer N bewerkingen"** | 
| 9 | Klik **"Analyseer …"** | Voorgestelde schrijfregels verschijnen; klik **"Toevoegen aan onze stijl"** om te bevestigen |

**Wat de presentator zegt:** "Dit is het stuk dat vandaag het meeste tijd
kost: de Funda-tekst, brochure, social posts, een WhatsApp-berichtje voor de
sneak preview, en een e-mail naar geïnteresseerde kopers — allemaal in één
keer, in het format dat jullie al gebruiken, in het Nederlands én Engels. En
als je zelf iets aanpast, leert het systeem daarvan mee."

**Terugvalplan (belangrijkste risico van de hele demo):**
- **Generatie duurt te lang (kern-call kan tegen de Vercel-limiet van 300 s
  aan lopen, vooral NL+EN samen):** dit is dé reden om het **"In verkoop"-
  terugvaldossier met al gegenereerde content** klaar te hebben staan
  (Voorbereiding hierboven). Live genereren op het verse scène 4-dossier
  proberen; loopt de timer voorbij ~90 s zonder dat het publiek al elders
  kijkt, **wissel dan naar het terugvaldossier** ("laat ik je meteen het
  eindresultaat laten zien terwijl deze op de achtergrond doorloopt") in
  plaats van live te blijven wachten.
- **Generatie mislukt (`status: 'fout'`):** lege staat met knop **"Opnieuw"**
  — één herkansing live proberen, anders meteen naar het terugvaldossier.
- **"Leren van je bewerkingen" toont nog "te weinig om te analyseren":**
  bevestigt dat de vooraf gezette bewerkingen niet zijn blijven staan (bv.
  overschreven door een latere generatieronde) — dan dit onderdeel kort
  mondeling toelichten in plaats van live te klikken.

---

### Scène 6 — "Onze verkopen op de kaart" (2 min, afsluiter)

**Belofte:** trots + overzicht.

| # | Klik / actie | Wat ze zien |
|---|---|---|
| 1 | Topbar → **Verkoopkaart** (`/marktanalyse/kaart`) | Kaart met alleen **eigen verkopen** als beeldmerk-pin in merkkleur |
| 2 | Onderaan: klik de **afspeelknop** (aria-label "Afspelen door de tijd") naast de periode-tijdlijn | Pins verschijnen chronologisch, 2019 → nu |
| 3 | Hover over een pin | Frosted hover-kaart met details van die verkoop |
| 4 | Filterdropdown → filter op woningtype | Kaart en zijlijst filteren mee, wijzen naar elkaar |

**Wat de presentator zegt:** "En tot slot: dit zijn al jullie eigen verkopen
van de afgelopen jaren, op de kaart, in jullie eigen kleur. Even terugspelen
door de tijd…" *(afspeelknop)* "…en dat is meteen een mooi overzicht om zelf
ook eens doorheen te scrollen."

**Terugvalplan:**
- **Kaart laadt niet / CSP-fout:** toon de screenshot uit de generale
  repetitie en sluit mondeling af — dit is de afsluiter, dus een gemiste
  kaart mag de eindindruk niet overheersen; kort houden en positief
  afsluiten op scène 4/5.
- **Afspeelknop mag vervallen** (expliciet toegestaan in het demo-minimum,
  § 2): bij tijdsdruk gewoon de statische kaart tonen en filteren, geen
  afspeelanimatie.

---

## Bekende risico's tijdens de demo (uit CLAUDE.md-lessen)

| Risico | Herkomst | Wat te doen |
|---|---|---|
| **Contentgeneratie > 300 s (Vercel-functielimiet)** | NL+EN-generatie duurt sinds 8.3 korter, maar is nog niet op de `demo`-branch getimed | Timen in de dag-ervoor-checklist; terugvaldossier klaar hebben (scène 5) |
| **Overpass/WOZ-achtige externe bronnen onbetrouwbaar onder last** | `lib/verrijking.ts` — publieke Overpass-servers gaven in een meting 3/12 geslaagd | Elke bron valt stil terug op een eigen staat (`ok`/`leeg`/`mislukt`/`niet_gekoppeld`), nooit een crash; als een buurtverrijking leeg blijft, gewoon doorgaan — dit is zichtbaar in dossierdata, niet in de zes scènes zelf |
| **Hydratiemismatch (server UTC vs. browser Europe/Amsterdam)** | Trof eerder de begroeting + maakte de hele pagina/topbar-profielmenu onreageerbaar | Als een knop "niets doet": eerst `F5`; gebeurt het structureel, dan is dit de oorzaak — niet live debuggen tijdens de demo, erna `page.on('pageerror')` in Playwright checken |
| **Supabase-pauze na 7 dagen inactiviteit (geen Pro)** | Gratis tier | Dag-ervoor-checklist: kort inloggen om het project wakker te houden |
| **Vercel Hobby kapt lange functies af** | Team staat nog op Hobby | Upgraden vóór de demo (checklist dag ervoor, punt 1) |
| **Browserzoom ≠ 100 %** | `auto-fit`-grids alleen getest op 100 % | Checklist 1 uur ervoor, punt 3 |
| **`i4housing`-kantoor heeft nog geen transacties** | Fase 5 geblokkeerd | Repeteren/demonstreren op `/login/demo` tot fase 5 live is (zie blokkade bovenaan) |

---

## Open punten gevonden tijdens het schrijven van dit script

Niet dit document zelf, maar losse bevindingen die het bouwen waard zijn vóór
de eerste échte demo (zie eindrapport van deze sessie / `docs/roadmap.md`):

- **12.1 (teamfoto in de startbanner)** is nog niet gebouwd — scène 1 in § 2
  belooft "met teamfoto", de code toont vandaag een merkverloop.
- **"Deze week"-tijdlijn** naast "Recent bekeken" op het dashboard bestaat
  niet (bewust geschrapt, item 10.4) — § 2 scène 1 noemt "recent bekeken,
  deze week" als twee dingen; het is er nog maar één.
- **Scène 3 (Concurrentie)** hangt volledig af van het veld
  `verkopend_kantoor` in de Brainbay-export — nog niet bevestigd (roadmap §
  Stand van zaken, open vraag).
- **Kwartaalbericht-knop heet in de code "Kwartaalbericht schrijven"**, niet
  "Schrijf kwartaalbericht" zoals in roadmap § 2 scène 2 staat — cosmetisch,
  maar de presentator moet op het juiste label klikken.
