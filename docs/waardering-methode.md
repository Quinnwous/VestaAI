# Waardebepaling — de methode in makelaarstaal

> Voor de taxateur van i4 Housing (tussencheck, zie `docs/goals.md`) en voor
> wie de rekenkern aansluit (roadmap fase 4). Rekenkern: `lib/waardering.ts`
> (v2), `lib/prijsindex.ts`; datacontract `WaarderingUitkomstSchema` in
> `lib/schemas.ts`. Gebouwd en getest op 17 sep 2026; de bindende regels
> staan in `docs/roadmap.md` § 3.3.

## 1. Wat het is en niet is

Een **indicatieve waardebepaling op basis van vergelijkbare verkopen**, zoals
een makelaar die zelf maakt voor een verkoopadvies: recente, nabije, gelijkende
verkopen, per verkoop teruggerekend naar "wat zou dít huis dan doen", en daar
een gewogen midden en een bandbreedte uit. Elke stap staat in de uitkomst en
is na te rekenen. Het is **geen taxatie** in de zin van NRVT/NWWI en gebruikt
**geen statistisch model** (geen regressie): bij een regionale dataset van
enkele duizenden verkopen per jaar geeft een transparante referentielijst met
een eerlijke band meer vertrouwen dan een puntschatting uit een model.

## 2. De stappen

1. **Referenties kiezen.** Zelfde woningtypegroep (appartement · rijwoning ·
   halfvrijstaand · vrijstaand), woonoppervlak binnen ± 35 %, bouwjaar binnen
   ± 25 jaar (± 40 bij vrijstaand), verkocht in de laatste 36 maanden vóór de
   peildatum. We beginnen binnen **750 m** en verbreden pas als er minder dan
   8 zijn: 1.000 → 2.000 → 5.000 m, daarna 60 maanden terug. De gebruikte
   straal staat altijd in de uitkomst. Meer dan 25 passende verkopen? Dan
   blijven de 25 best passende over.
2. **Tijdcorrectie (prijsindex).** Per kwartaal de mediane € per m² van de
   regionale verkopen in dezelfde typegroep, gladgestreken over drie
   kwartalen (gewogen naar aantal verkopen). Een verkoop uit 2025-Q1 wordt
   naar vandaag gebracht met index(nu) / index(2025-Q1). Een kwartaal telt pas
   als het venster ≥ 30 verkopen bevat; anders het dichtstbijzijnde
   betrouwbare kwartaal (max. 2 kwartalen verderop, met melding), daarna de
   CBS-index, en anders géén tijdcorrectie mét waarschuwing.
3. **Correcties per referentie** — zoals de correctiekolommen in een
   taxatierapport. Verschilt een referentie van het subject in garage, tuin,
   energielabelklasse (A-B / C-D / E-G) of bouwperiode (< 1945 / 1945-1975 /
   1975-2000 / 2000+), dan corrigeren we haar € per m² met de verhouding van de
   prijsniveaus van die klassen in de regio (mediaan € per m² per klasse,
   zelfde typegroep). Grootte: de € per m² daalt met het oppervlak; we
   schatten die helling robuust (mediaan van paarsgewijze hellingen) en
   corrigeren voor het verschil in m². Regels: alleen toegepast als beide
   klassen ≥ 30 verkopen hebben, per kenmerk begrensd op ± 15 %, in totaal op
   ± 30 %; elke correctie is per referentie zichtbaar en per kenmerk uit te
   zetten.
4. **Geïmpliceerde waarde per referentie** = € per m² × indexfactor ×
   correctiefactor × woonoppervlak van het subject.
5. **Gewicht per referentie** = gelijkenis (type, oppervlak, bouwjaar; 0-1)
   × 1 / (1 + afstand / 500 m) × 1 / (1 + maanden geleden / 12) × 0,5 als de
   verkoop in een andere plaats ligt. Dichtbij, recent en gelijkend telt dus
   het zwaarst; een verkoop op 2 km van 2 jaar terug telt nog maar voor een
   fractie.
6. **Waarde** = gewogen mediaan van de geïmpliceerde waarden.
   **Bandbreedte** = gewogen 10e–90e percentiel, en minimaal ± 5 % rond de
   waarde (± 10 % bij 4-5 referenties, ± 15 % bij minder dan 4). Afgerond op
   € 1.000. Bij minder dan 6 referenties staat er nadrukkelijk *weinig data*.
7. **Ernaast, niet erin:** de WOZ-waarde met peildatum als ijkpunt en de
   makelaarscorrectie met motivatie (die blijft altijd zichtbaar als
   correctie, nooit als "de" waarde).

## 3. Rekenvoorbeeld

Subject: rijwoning in Wassenaar, 120 m², bouwjaar 1965, garage, tuin,
label C. Peildatum 1 september 2026. Binnen 750 m zijn er 8 passende verkopen
(geen verbreding nodig). Index t/m 2026-Q3. Dit voorbeeld is ook een testcase
(`lib/waardering.test.ts`, "rekenvoorbeeld").

| # | Adres | m² | Bouwjaar | Verkocht | Prijs | € / m² | Afstand | Mnd | Index | Geïndexeerd € / m² | Geïmpliceerde waarde | Gelijkenis | Gewicht |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Kerkstraat 12 | 115 | 1962 | 14-05-2026 | 715.000 | 6.217 | 180 m | 3 | 1,007 | 6.261 | **751.326** | 0,85 | 0,501 |
| 2 | Molenweg 3 | 128 | 1970 | 02-02-2026 | 760.000 | 5.938 | 420 m | 6 | 1,021 | 6.063 | **727.724** | 0,82 | 0,298 |
| 3 | Dorpsstraat 41 | 122 | 1966 | 08-08-2025 | 705.000 | 5.779 | 300 m | 12 | 1,058 | 6.114 | **733.331** | 0,88 | 0,276 |
| 4 | Lindelaan 8 | 110 | 1958 | 20-11-2025 | 640.000 | 5.818 | 650 m | 9 | 1,039 | 6.045 | **725.502** | 0,80 | 0,198 |
| 5 | Parklaan 14 | 125 | 1968 | 01-10-2024 | 700.000 | 5.600 | 240 m | 23 | 1,113 | 6.233 | **748.174** | 0,85 | 0,197 |
| 6 | Vijverweg 22 | 118 | 1961 | 10-12-2024 | 660.000 | 5.593 | 520 m | 20 | 1,113 | 6.225 | **747.268** | 0,86 | 0,159 |
| 7 | Beukenhof 5 | 135 | 1975 | 15-04-2025 | 790.000 | 5.852 | 700 m | 16 | 1,077 | 6.303 | **755.996** | 0,75 | 0,134 |
| 8 | Zandpad 7 | 105 | 1955 | 20-07-2024 | 600.000 | 5.714 | 610 m | 25 | 1,122 | 6.411 | **769.416** | 0,75 | 0,110 |

(In dit voorbeeld zijn er te weinig regionale verkopen om kenmerk-correcties
toe te passen; correctiefactor overal 1,000.)

- Gewogen mediaan van de geïmpliceerde waarden: **€ 747.702 → € 748.000**.
- Gewogen P10–P90: 726.291 – 755.839. Dat is smaller dan de minimale marge
  van ± 5 % (8 referenties), dus de band wordt **€ 710.000 – € 785.000**.
- Uitkomst: *€ 748.000 (710.000 – 785.000), n = 8, straal 750 m, index t/m
  2026-Q3, geen waarschuwingen.*

Ter illustratie van een correctie: had Lindelaan 8 géén garage, en liggen de
regionale prijsniveaus voor rijwoningen op € 6.240/m² mét en € 6.000/m²
zonder garage (elk ≥ 30 verkopen), dan krijgt die referentie factor
6.240 / 6.000 = **1,04** en telt zij als 6.045 × 1,04 = 6.287 € / m².

## 4. Waarschuwingen die de gebruiker altijd ziet

- *Weinig data* (n < 6) met verbrede band; *geen waarde* bij n = 0.
- *Zonder locatie*: verrijking mislukt → referenties op plaats + type, niet op
  afstand.
- *Minder dan 8 vergelijkbare verkopen, ook binnen 5 km en 60 maanden.*
- *Index niet betrouwbaar voor kwartaal X, kwartaal Y gebruikt* / *geen
  tijdcorrectie toegepast*.
- Elke correctie die niet toegepast kon worden ("te weinig data om toe te
  passen") staat bij de schakelaars.

## 5. Hoe goed is het? (backtest)

Elke eigen verkoop wordt achteraf gewaardeerd met uitsluitend verkopen van
vóór haar eigen verkoopdatum; daarna vergelijken we met de echte prijs.
Demo-lat (§ 3.3): mediaan absolute fout ≤ 7 % en ≥ 75 % van de prijzen
binnen de band.

Synthetische backtest (`lib/waardering.backtest.test.ts`, dataset met bekende
grondwaarheid en 7 % onverklaarbare ruis, 400 woningen, 17 sep 2026):

| | Mediaan fout | Binnen band |
|---|---|---|
| Alle | 5,2 % | 78 % |
| Appartement | 5,8 % | 71 % |
| Rijwoning | 4,8 % | 78 % |
| Halfvrijstaand | 4,9 % | 80 % |
| Vrijstaand | 5,6 % | 83 % |

Wat de backtest ons leerde en wat we daarom veranderden: zonder correcties per
referentie werden slecht gelabelde en grotere woningen 4-9 % overschat; met
een P25–P75-band lag maar de helft van de prijzen binnen de band (dat is
per definitie zo). Daarom P10–P90 en de correctiekolommen. Op de echte
i4housing-data (item 4.8) is de band de kalibratieknop: haalt hij de 75 %
niet, dan verbreden we hem — nooit de lat verlagen.

## 6. Vragen aan de taxateur (tussencheck)

1. Zijn de selectiegrenzen (± 35 % oppervlak, ± 25/40 jaar, 36 maanden,
   750 m als start) wat jij zelf zou hanteren in Wassenaar en omgeving?
2. Kloppen de correctiekenmerken (garage, tuin, labelklasse, bouwperiode,
   grootte) en mis je er een die in jullie regio zwaar weegt (ligging aan
   water/duinrand, perceelgrootte, staat van onderhoud)?
3. Vind je een minimale marge van ± 5 % eerlijk, of werk je zelf met een
   andere ondergrens?
4. Is een verkoop in een buurgemeente voor de helft laten meetellen redelijk,
   of zou je hem liever helemaal uitsluiten?
5. Welke referentie in het rekenvoorbeeld zou jij handmatig schrappen of
   toevoegen, en waarom? (Dat kan straks in het paneel.)

## 7. Technisch, voor wie aansluit

- `kiesReferenties(subject, kandidaten, { peildatum, uitgesloten })` →
  referenties + straal + methode + waarschuwingen. Kandidaten komen uit RPC
  `referenties_in_straal` (§ 3.1) als `Kandidaat[]` met `afstand_m`.
- `bouwIndex(rijen)` / `factor(reeks, van, naar)` in `lib/prijsindex.ts`; de
  RPC `prijsindex_kwartaal` levert straks dezelfde vorm als `bouwIndex()`.
- `berekenWaarderingV2(subject, kandidaten, { peildatum, index, cbs,
  regionaal, handmatig, correcties, woz })` → `WaarderingUitkomst` (versie 2).
  `regionaal` = werkgebied + typegroep (RPC `kenmerk_paren`, item 4.5).
- `migreerWaarderingJson(raw)` leest oude `waardering_json` ({ correctie })
  als `WaarderingOpslag` v2.
- De v1-functies blijven bestaan tot item 4.3 het paneel omzet; daarna
  verwijderen.
