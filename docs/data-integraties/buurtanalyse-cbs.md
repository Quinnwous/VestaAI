---
name: buurtanalyse-cbs
description: Live CBS-buurtdata via de open OData-API — gemiddelde WOZ, inkomen, opleidingsniveau, woningtypen, huishoudens en bevolkingsdichtheid. Geïmplementeerd in lib/verrijking.ts. Per indicator wordt naar buurt-, wijk- of gemeenteniveau gezakt, en het gebruikte niveau reist altijd mee.
---

# Buurtanalyse (CBS) — live koppeling

**Status: geïmplementeerd** in `lib/verrijking.ts` (`fetchCbs`). Dit document beschrijft
de werkende koppeling, geen toekomstplan. De vroegere hardgecodeerde referentietabel
met 19 gemeentes is verwijderd: die cijfers stamden uit 2022 en waren aantoonbaar
achterhaald (Amsterdam stond op een gemiddelde WOZ van €389.000 waar CBS €498.000 meet).

## Bron

| | |
|---|---|
| API | `https://opendata.cbs.nl/ODataApi/odata/{dataset}/TypedDataSet` |
| Dataset | `85984NED` — Kerncijfers wijken en buurten **2024** |
| Kosten | gratis, geen sleutel, geen registratie |
| Dekking | alle ~14.000 buurten, ~3.300 wijken, 342 gemeentes + landelijke referentierij |

**Waarom 2024 en niet de nieuwste jaargang?** `86165NED` (2025) bestaat, maar het veld
`GemiddeldInkomenPerInwoner_78` is daar nog leeg — zelfs op gemeenteniveau. 2024 is de
meest recente jaargang die alle indicatoren die wij gebruiken daadwerkelijk vult.
Controleer bij een jaarlijkse update dus eerst of inkomen gevuld is, niet alleen of de
dataset bestaat.

## Twee valkuilen in de API

1. **Regiocodes zijn rechts opgevuld tot 10 tekens.** `WijkenEnBuurten eq 'GM0363'`
   levert niets op; `'GM0363    '` wel. Buurtcodes zijn toevallig al 10 tekens, waardoor
   dit probleem pas opvalt zodra je wijk of gemeente opvraagt. Zie `cbsRegioCode()`.
2. **Filteren kan alleen op de dimensie `WijkenEnBuurten`.** Een `$filter` op een
   topic-veld (zoals `SoortRegio_2`) geeft geen foutmelding over het veld, maar
   `HTTP 500: query returns more than 10000 records`. Gebruik `startswith()` op de
   dimensie als je een heel niveau wilt ophalen.

## Cascade per indicator

CBS onderdrukt cijfers zodra een gebied te klein wordt — inkomen ontbreekt daardoor in
veel buurten, ook in grote steden. We vragen daarom **buurt, wijk, gemeente én `NL00`
in één call** op en zakken *per losse indicator* naar het eerstvolgende niveau dat een
cijfer heeft. Elk cijfer draagt zijn eigen `niveau` mee (`CbsMetriek`), zodat de UI en
de Claude-prompt nooit een gemeentecijfer als buurtfeit kunnen tonen.

Voorbeeld (Prinsengracht 263, Amsterdam): WOZ €900.000 is een **buurt**cijfer,
inkomen €65.800 een **wijk**cijfer. Beide worden als zodanig gelabeld.

De ingang komt uit PDOK (`buurtcode`, `wijkcode`, `gemeentecode`), die al in de
verrijkingslaag zat. PDOK levert ook de buurt- en wijknáám; CBS doet dat niet bruikbaar.

## Gebruikte velden

| Veld | Betekenis | Bewerking |
|---|---|---|
| `GemiddeldeWOZWaardeVanWoningen_39` | gemiddelde WOZ | × 1.000 |
| `GemiddeldInkomenPerInwoner_78` | inkomen per inwoner | × 1.000 |
| `Koopwoningen_47` | % koopwoningen | — |
| `BasisonderwijsVmboMbo1_67` · `HavoVwoMbo24_68` · `HboWo_69` | opleidingsniveau | aandeel hbo/wo binnen het totaal van de drie, alle drie op hetzelfde gebiedsniveau |
| `PercentageEengezinswoning_40` | % eengezinswoningen | — |
| `Bevolkingsdichtheid_34` | inwoners/km² | — |
| `k_65JaarOfOuder_12` ÷ `AantalInwoners_5` | % 65-plussers | afgeleid |
| `HuishoudensMetKinderen_32` ÷ `HuishoudensTotaal_29` | % huishoudens met kinderen | afgeleid |
| `GemiddeldeHuishoudensgrootte_33` | huishoudensgrootte | — |

## Buurtprofiel

Premium / Bovengemiddeld / Gemiddeld / Ondergemiddeld, gescoord op WOZ, inkomen en
opleidingsniveau ten opzichte van de **landelijke rij uit dezelfde jaargang** (`NL00`) —
dus niet tegen hardgecodeerde referentiewaarden. Indicatoren die zelf al op landelijk
niveau zijn teruggevallen tellen niet mee: anders vergelijkt een gebied met zichzelf en
valt alles op 'Gemiddeld'.

## Markttype-fallback

`marktProfielOpzoeken()` houdt de expliciete `GEMEENTE_TYPE_MAP` leidend. Gemeentes die
daar niet in staan belandden voorheen allemaal op `landelijk`; ze worden nu geclassificeerd
op echte cijfers: WOZ ≥ 1,45× landelijk → `premium`, anders dichtheid ≥ 1.200/km² →
`middelgroot`. Die drempel isoleert 8 van de 342 gemeentes (Laren, De Bilt, Gooise Meren,
Landsmeer, Bergen NH, Oegstgeest, Wijdemeren, Ouder-Amstel).

Bewust **niet** afgeleid: de typen `randstadcentrum` en `randstadbuiten`. Dat is een
marktoordeel dat niet uit demografie volgt; afleiden zou schijnprecisie zijn.

Belangrijk: deze classificatie leest `cbs.gemeente_niveau` — de ongecascadeerde
gemeentecijfers. De gewone velden bevatten meestal het buurtcijfer, en een dure buurt
maakt de gemeente nog niet duur.

## Foutgedrag

Valt CBS uit, dan is `verrijking.cbs` `null` en gaat de generatie gewoon door zonder
buurtprofiel. Er wordt bewust **geen** statische fallback meer geserveerd: verouderde
cijfers tonen als "landelijk gemiddelde" was precies het probleem dat deze koppeling oplost.
