---
name: marktdynamiek
description: Analyseer de lokale marktsituatie — gemiddelde verkooptijd, kans op overbieden, aanbod/vraagverhouding en marktomstandigheid (kopersmarkt/verkopersmarkt) voor de specifieke regio. Gebruik voor verkoopstrategie advies. Identificeer het gemeente-type en gebruik de bijbehorende marktprofiel-benchmarks voor specifieke, onderbouwde output. Alles markeren als [indicatief].
---

# Marktdynamiek-Berekening

Analyseer de dynamiek van de lokale woningmarkt om de verkoopstrategie te onderbouwen: hoe snel verkopen woningen in dit segment, hoe groot is de kans op overbieden, en is het een kopers- of verkopersmarkt? Identificeer altijd het gemeente-type en gebruik de bijbehorende marktprofiel-matrix voor specifieke, goed onderbouwde output.

## Databronnen
- **NVM Marktcijfers** [indicatief — kwartaalrapportages deels publiek]
- **Funda aanbod** [indicatief — actueel aanbod publiek zichtbaar]
- **Kadaster/Brainbay verkooptijden** [indicatief — NVM-lidmaatschap vereist]
- **CBS woningmarktdata** [indicatief — geaggregeerd]

## Gemeente-type Classificatie

Identificeer het gemeente-type op basis van de gemeente uit `adres_verificatie`. Gebruik de bijbehorende marktprofiel-benchmarks als primaire output voor alle marktdynamiek-indicatoren.

### Gemeente-type indeling:

| Type | Gemeentes |
|------|-----------|
| **Premiumgemeente** | Wassenaar, Bloemendaal, Bergen NH, Blaricum, Laren, Aerdenhout, Heemstede, Rozendaal, Eemnes |
| **Randstadcentrum** | Amsterdam, Rotterdam, Den Haag, Utrecht |
| **Randstadbuiten** | Haarlem, Leiden, Delft, Zoetermeer, Amstelveen, Barendrecht, Capelle aan den IJssel, Alphen aan den Rijn, Gouda |
| **Middelgrote stad** | Eindhoven, Breda, Tilburg, Groningen, Nijmegen, Arnhem, Zwolle, Apeldoorn, Enschede, Maastricht |
| **Landelijk/overig** | Alle overige Nederlandse gemeentes |

## Marktprofiel-Matrix per Gemeente-type (2024, NVM-indicatief)

### Premiumgemeente (Wassenaar, Bloemendaal, Blaricum e.d.)
- **Verkooptijd**: gemiddeld 4–8 weken
- **Overbiedingskans**: 30–50% (op basis van 2024-markt)
- **Gemiddeld overbied-percentage**: 5–15% boven vraagprijs
- **Vraag/aanbod**: krap aanbod, 2–4 maanden voorraad
- **Seizoensadvies**: best verkopen april–juni en september–oktober; rustigste periodes: augustus en december
- **Typische verkoopstrategie**: stille verkoop of exclusief kanaal aanbevolen voor objecten boven €1.000.000; biedingsprocedure effectief voor €400k–€900k segment
- **Marktomstandigheid 2024**: verkopersmarkt in €400k–€900k segment; neutraal tot licht kopersmarkt in €900k+ segment vanwege beperkter kopersuniversum

### Randstadcentrum (Amsterdam, Rotterdam, Den Haag, Utrecht)
- **Verkooptijd**: gemiddeld 3–6 weken
- **Overbiedingskans**: 60–75%
- **Gemiddeld overbied-percentage**: 8–20% boven vraagprijs
- **Vraag/aanbod**: zeer krap, minder dan 2 maanden voorraad
- **Seizoensadvies**: doorlopend actief woningmarkt; lichte activiteitsdip in augustus en december
- **Typische verkoopstrategie**: biedingsprocedure sterk aanbevolen voor goed geprijsde objecten; publicatie dinsdag/woensdag voor optimale Funda-views in het weekend
- **Marktomstandigheid 2024**: uitgesproken verkopersmarkt in appartements- en tussenwoningsegment; neutraal in het topsegment >€1.500.000

### Randstadbuiten (Haarlem, Leiden, Delft, Amstelveen e.d.)
- **Verkooptijd**: gemiddeld 4–8 weken
- **Overbiedingskans**: 40–60%
- **Gemiddeld overbied-percentage**: 5–12% boven vraagprijs
- **Vraag/aanbod**: krap, 2–3 maanden voorraad
- **Seizoensadvies**: lente en vroege herfst meest actief
- **Typische verkoopstrategie**: biedingsprocedure effectief; marktconforme vraagprijs als instapstrategie
- **Marktomstandigheid 2024**: verkopersmarkt tot licht neutraal

### Middelgrote stad (Eindhoven, Breda, Groningen e.d.)
- **Verkooptijd**: gemiddeld 5–10 weken
- **Overbiedingskans**: 30–50%
- **Gemiddeld overbied-percentage**: 3–10% boven vraagprijs
- **Vraag/aanbod**: normaal tot licht krap, 2–4 maanden voorraad
- **Seizoensadvies**: lente actief; zomer en winter rustiger
- **Typische verkoopstrategie**: marktconforme vraagprijs; biedingsprocedure optioneel afhankelijk van locatie en type
- **Marktomstandigheid 2024**: neutraal tot licht verkopersmarkt

### Landelijk/overig
- **Verkooptijd**: gemiddeld 6–14 weken
- **Overbiedingskans**: 15–30%
- **Gemiddeld overbied-percentage**: 0–5% boven vraagprijs
- **Vraag/aanbod**: normaal, 3–5 maanden voorraad
- **Seizoensadvies**: lente meest actief, overige seizoenen rustiger
- **Typische verkoopstrategie**: realistische vraagprijs essentieel; onderhandelingsruimte ingebouwd
- **Marktomstandigheid 2024**: neutraal tot licht kopersmarkt in dunbevolkte regio's

## Instructies

1. **Identificeer het gemeente-type** op basis van de gemeente uit `adres_verificatie`. Vermeld het vastgestelde gemeente-type expliciet in de output.

2. **Marktomstandigheid bepalen** voor de gemeente/regio op basis van het gemeente-type profiel:
   - **Verkopersmarkt**: vraag > aanbod, korte verkooptijden, overbiedingen frequent
   - **Kopersmarkt**: aanbod > vraag, langere verkooptijden, onderhandeling mogelijk
   - **Neutraal**: vraag ≈ aanbod
   - Onderbouw de kwalificatie altijd met een motivatie

3. **Produceer altijd de volgende vier uitkomsten:**
   1. **Marktomstandigheid** (kopersmarkt / neutraal / verkopersmarkt) met motivatie
   2. **Verwachte verkooptijd** in weken (range op basis van gemeente-type benchmark)
   3. **Aanbevolen verkoopstrategie**: biedingsprocedure ja/nee, stille verkoop ja/nee, prijsstrategie
   4. **Beste moment om op de markt te komen**: seizoen en timing

4. **Gemiddelde verkooptijd** [indicatief]:
   - Aantal weken van publicatie tot koopovereenkomst op basis van gemeente-type profiel
   - Vergelijk met landelijk gemiddelde

5. **Overbiedingskans** [indicatief]:
   - Percentage woningen dat boven vraagprijs wordt verkocht (gemeente-type benchmark)
   - Gemiddeld overbod in % op basis van marktprofiel
   - Markeer als: **[indicatief — NVM-transactiedata vereist voor exacte verificatie]**

6. **Aanbod/vraagverhouding** [indicatief]:
   - Beschikbare voorraad in maanden op basis van gemeente-type profiel
   - Seizoenspatroon toelichting

7. **Verkoopstrategie aanbeveling**:
   - Vraagprijs strategie: lager instappen (bieden), marktconform, of boven markt
   - Publicatietijdstip (optimaal: dinsdag/woensdag voor Funda-views)
   - Biedingsprocedure aanbevolen ja/nee
   - Stille verkoop aanbevolen ja/nee (met drempel)

## Markeringsregels
- Alle marktdynamiek data: **[indicatief — NVM/Brainbay vereist voor exacte verificatie]**
- Gemeente-type benchmarks: **[indicatief — NVM kwartaalrapportages 2024]**

## JSON Output

```json
"marktdynamiek": {
  "gemeente": "[gemeente uit adres_verificatie]",
  "gemeente_type": "[Premiumgemeente / Randstadcentrum / Randstadbuiten / Middelgrote stad / Landelijk]",
  "marktomstandigheid": "[kopersmarkt / neutraal / verkopersmarkt] [indicatief]",
  "marktomstandigheid_motivatie": "[onderbouwing op basis van gemeente-type profiel]",
  "gemiddelde_verkooptijd_weken": "[range op basis van gemeente-type] [indicatief]",
  "overbiedingskans_pct": "[range op basis van gemeente-type] [indicatief]",
  "gemiddeld_overbod_pct": "[range op basis van gemeente-type] [indicatief]",
  "aanbod_voorraad_maanden": "[range op basis van gemeente-type] [indicatief]",
  "seizoen_advies": "[beste periode om op de markt te komen]",
  "verkoopstrategie": {
    "biedingsprocedure_aanbevolen": "[ja / nee / optioneel]",
    "stille_verkoop_aanbevolen": "[ja / nee — drempel vermelden]",
    "prijsstrategie": "[lager instappen / marktconform / boven markt]",
    "publicatietiming": "[aanbevolen dag en eventuele seizoenstiming]",
    "presentatieadvies": "[indicatief]"
  },
  "databron_toelichting": "Marktdynamiek is indicatief op basis van NVM gemeente-type benchmarks 2024. Verificatie via NVM Marktcijfers en Brainbay aanbevolen voor exacte data."
}
```
