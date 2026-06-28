---
name: buurtanalyse-cbs
description: Haal demografische buurtdata op via CBS — gemiddeld inkomen, bevolkingsdichtheid, verhouding huur/koop, woningvoorraad en opleidingsniveau. Gebruik buurt- en wijkcode uit de GEVERIFIEERDE DATA als ingang. Als buurtcode niet beschikbaar is, gebruik dan de gemeente-niveau CBS-referentietabel als fallback. Markeer alles als [indicatief] wanneer CBS-filter niet beschikbaar was.
---

# Buurtanalyse (CBS)

Analyseer de demografische en sociaaleconomische context van de buurt op basis van CBS kerncijfers wijken en buurten. De buurtcode en wijkcode zijn geverifieerd via PDOK. Wanneer geen buurtcode beschikbaar is, wordt altijd de gemeente-niveau CBS-referentietabel als fallback gebruikt zodat er altijd een buurtprofiel geproduceerd kan worden.

## Databronnen
- **PDOK Locatieserver** (geverifieerd) → buurtcode (BU...), wijkcode (WK...), gemeentecode (GM...)
- **CBS Statline OData** [geverifieerd indien beschikbaar — via `cbs_buurt` in geverifieerde data; dataset 85039NED Kerncijfers wijken en buurten 2023]
- **CBS gemeente-niveau referentietabel** [indicatief — Kerncijfers 2022, gemeente-niveau fallback als `cbs_buurt` null is]

**Actuele buurtdata:** https://www.cbs.nl/nl-nl/reeksen/kerncijfers-wijken-en-buurten

## Instructies

### 1. Bepaal beschikbaarheid buurtcode

Controleer of `adres_verificatie.buurtcode` beschikbaar is:
- **Buurtcode beschikbaar**: volg instructies onder stap 2 (buurtspecifiek)
- **Buurtcode null of niet beschikbaar**: volg instructies onder stap 3 (gemeente-niveau fallback)

### 2. Als buurtcode beschikbaar (buurtspecifieke analyse)

Gebruik `adres_verificatie.buurtcode` als ingang:
- Buurtcode: bijv. BU06290110 (Weteringpark, Wassenaar)
- Wijkcode: bijv. WK062901
- Gemeentecode: bijv. GM0629 (Wassenaar)

**CBS-data interpreteren** (gebaseerd op gemeente/wijk gemiddelden):
- Gemiddeld inkomen per inwoner (×1.000 euro)
- % koopwoningen vs. huurwoningen
- % eengezinswoningen vs. meergezinswoningen
- Gemiddelde WOZ-waarde gemeente (×1.000 euro)
- Bevolkingsdichtheid (per km²)
- Bouwjaarklasse woningvoorraad (% voor/na 2000)
- Opleidingsniveau (% hoog opgeleid)

Geef ook een **vergelijking met het gemeenteniveau** (gebruik onderstaande referentietabel) en met het **nationaal gemiddelde**.

### 3. Als buurtcode null (gemeente-niveau fallback)

Gebruik de onderstaande CBS gemeente-referentietabel. Markeer alle uitkomsten expliciet als **[gemeente-niveau CBS 2022 — buurtspecifieke data niet beschikbaar]**.

**CBS Referentietabel grote gemeentes (CBS Kerncijfers 2022, gemeente-niveau):**

| Gemeente | Gem. inkomen | % Koop | Gem. WOZ | % Hoog opgeleid | Bevolkingsdichtheid |
|----------|-------------|--------|---------|----------------|---------------------|
| Wassenaar | €62.800 | 74% | €624.000 | 68% | laag (ca. 1.200/km²) |
| Bloemendaal | €68.500 | 78% | €712.000 | 72% | laag (ca. 900/km²) |
| Blaricum | €71.200 | 80% | €748.000 | 74% | laag (ca. 700/km²) |
| Heemstede | €52.400 | 71% | €542.000 | 65% | gemiddeld (ca. 2.200/km²) |
| Amsterdam | €37.200 | 28% | €389.000 | 55% | hoog (ca. 5.200/km²) |
| Utrecht | €38.100 | 42% | €358.000 | 58% | hoog (ca. 3.400/km²) |
| Den Haag | €33.400 | 46% | €298.000 | 44% | hoog (ca. 3.200/km²) |
| Rotterdam | €30.200 | 40% | €264.000 | 38% | hoog (ca. 3.100/km²) |
| Haarlem | €38.800 | 46% | €368.000 | 52% | hoog (ca. 2.800/km²) |
| Leiden | €35.600 | 44% | €338.000 | 55% | hoog (ca. 2.700/km²) |
| Delft | €32.800 | 43% | €312.000 | 56% | hoog (ca. 2.600/km²) |
| Amstelveen | €42.600 | 55% | €412.000 | 62% | gemiddeld (ca. 2.000/km²) |
| Eindhoven | €33.600 | 51% | €298.000 | 46% | gemiddeld (ca. 1.800/km²) |
| Breda | €32.400 | 56% | €286.000 | 42% | gemiddeld (ca. 1.400/km²) |
| Tilburg | €30.800 | 52% | €268.000 | 39% | gemiddeld (ca. 1.500/km²) |
| Groningen | €29.800 | 38% | €248.000 | 52% | hoog (ca. 2.400/km²) |
| Nijmegen | €30.400 | 46% | €268.000 | 50% | hoog (ca. 2.200/km²) |
| Arnhem | €29.600 | 50% | €254.000 | 42% | gemiddeld (ca. 1.600/km²) |
| Zwolle | €33.200 | 58% | €292.000 | 44% | gemiddeld (ca. 1.200/km²) |
| **Landelijk NL** | **€30.800** | **57%** | **€317.000** | **41%** | **gemiddeld** |

Als de gemeente niet in de tabel staat: gebruik het nationaal gemiddelde als proxy en markeer als **[nationaal gemiddelde als proxy — gemeente-specifieke CBS-data niet beschikbaar]**.

### 4. Vergelijk altijd met nationaal gemiddelde

Vergelijk bij elke output (zowel buurt- als gemeente-niveau) met de volgende nationale referentiewaarden:
- Nationaal gemiddeld inkomen per inwoner: **€30.800**
- Nationaal % koopwoningen: **57%**
- Nationaal gemiddelde WOZ-waarde: **€317.000**
- Nationaal % hoog opgeleid: **41%**

### 5. Geef een profiel-kwalificatie per indicator

Beoordeel elke indicator afzonderlijk als:
- **Bovengemiddeld**: significant hoger dan nationaal gemiddelde (>10% afwijking)
- **Gemiddeld**: rondom nationaal gemiddelde (±10%)
- **Ondergemiddeld**: significant lager dan nationaal gemiddelde (>10% afwijking)

Geef ook een **overkoepelend buurtprofiel**: Premium / Bovengemiddeld / Gemiddeld / Ondergemiddeld

### 6. Relevantie voor verkoopstrategie

Vertaal het buurtprofiel naar verkoopadvies:
- Doelgroep omschrijving (bijv. tweeverdieners, gezinnen, internationale kopers)
- Verwacht prijsniveau op basis van buurtprofiel
- Positionering aanbeveling

## Markeringsregels
- Buurtcode en wijkcode: **geverifieerd via PDOK**
- Buurtspecifieke CBS-statistieken: **[indicatief — geaggregeerde buurt/wijk data, niet per woning]**
- Gemeente-niveau fallback: **[gemeente-niveau CBS 2022 — buurtspecifieke data niet beschikbaar]**
- Nationaal gemiddelde als proxy: **[nationaal gemiddelde als proxy — gemeente-specifieke CBS-data niet beschikbaar]**

## JSON Output

```json
"buurtanalyse_cbs": {
  "buurt": "[naam buurt of 'gemeente-niveau fallback']",
  "buurtcode": "[BU... of null]",
  "wijk": "[naam wijk of null]",
  "gemeente": "[gemeente uit adres_verificatie]",
  "gemeentecode": "[GM...]",
  "data_niveau": "[buurtspecifiek / gemeente-niveau fallback / nationaal gemiddelde als proxy]",
  "cbs_data": {
    "gemiddeld_inkomen_per_inwoner_1000eur": "[waarde] [indicatief]",
    "kwalificatie_inkomen": "[bovengemiddeld / gemiddeld / ondergemiddeld]",
    "pct_koopwoningen": "[waarde] [indicatief]",
    "kwalificatie_koop": "[bovengemiddeld / gemiddeld / ondergemiddeld]",
    "pct_eengezinswoningen": "[waarde of n.v.t.] [indicatief]",
    "gemiddelde_woz_1000eur": "[waarde] [indicatief]",
    "kwalificatie_woz": "[bovengemiddeld / gemiddeld / ondergemiddeld]",
    "bevolkingsdichtheid_per_km2": "[waarde of omschrijving] [indicatief]",
    "pct_hoog_opgeleid": "[waarde] [indicatief]",
    "kwalificatie_opleiding": "[bovengemiddeld / gemiddeld / ondergemiddeld]"
  },
  "vergelijking_landelijk": {
    "inkomen_vs_nationaal": "[+X% / -X% / rondom gemiddelde] [indicatief]",
    "woz_vs_nationaal": "[+X% / -X% / rondom gemiddelde] [indicatief]",
    "koop_pct_vs_nationaal": "[+X% / -X% / rondom gemiddelde] [indicatief]"
  },
  "buurtprofiel": "[Premium / Bovengemiddeld / Gemiddeld / Ondergemiddeld] [indicatief]",
  "doelgroep_omschrijving": "[indicatief]",
  "relevantie_verkoop": "[indicatief]",
  "cbs_link": "https://www.cbs.nl/nl-nl/reeksen/kerncijfers-wijken-en-buurten",
  "databron_toelichting": "CBS Kerncijfers Wijken en Buurten 2022 — gemeente/wijk niveau, niet per adres. Voor actuele buurtdata: https://www.cbs.nl/nl-nl/reeksen/kerncijfers-wijken-en-buurten"
}
```
