---
name: bag-data
description: Verwerk de geverifieerde BAG-data (bouwjaar, gebruiksfunctie, gebruiksoppervlakte, pandstatus) uit de GEVERIFIEERDE DATA sectie in het dossier. Gebruik altijd als eerste skill — de output vormt de basis voor alle andere analyses.
---

# BAG-Data Extractie

Verwerk de officiële BAG-gegevens (Basisregistratie Adressen en Gebouwen) die via PDOK zijn opgehaald en in de GEVERIFIEERDE DATA staan. Vul nooit BAG-velden aan met schattingen — als een waarde ontbreekt in de geverifieerde data, noteer dit expliciet met een toelichting en hersteladvies.

## Databron
- **BAG via PDOK WFS** (Kadaster) — geverifieerde data staat klaar in de invoer onder `bag_gebouw` en `adres_verificatie`
- Dit zijn officieel geregistreerde waarden, geen schattingen

## Instructies

### Stap 1 — Adresverificatie uitvoeren
Lees `adres_verificatie` uit de GEVERIFIEERDE DATA:
- `weergavenaam` → volledig geverifieerd adres
- `postcode` → officiële postcode
- `percelen` → gekoppeld kadasterperceel (bijv. WSN01-B-11309)
- `buurt`, `wijk`, `gemeente` → officiële gebiedsindeling

### Stap 2 — Gebouwdata uitlezen
Lees `bag_gebouw` uit de GEVERIFIEERDE DATA:
- `bouwjaar` → officieel bouwjaar pand
- `oppervlakte_m2` → gebruiksoppervlakte GBO (officieel geregistreerd)
- `gebruiksdoel` → gebruiksfunctie (woonfunctie, kantoorfunctie, etc.)
- `status` → pandstatus (in gebruik, in aanbouw, gesloopt, etc.)

### Stap 3 — Afwijkingen signaleren
- Bouwjaar vs. visuele staat (bijv. bouwjaar 1985 maar volledig gerenoveerd) → Aandachtspunt — noteer discrepantie
- Gebruiksoppervlakte <50m² of >500m² → Aandachtspunt — controleer of registratie correct is
- Pandstatus anders dan "Verblijfsobject in gebruik" → Actie vereist — markeer als risico

### Stap 4 — Data-kwaliteitsscore berekenen
Bereken de `data_kwaliteit_score` (0–100%) op basis van aanwezigheid van kritische velden:

| Veld | Aanwezig | Punten |
|------|----------|--------|
| `adres_verificatie` volledig aanwezig | ja/nee | +20 |
| `postcode` aanwezig | ja/nee | +15 |
| `bag_gebouw.bouwjaar` aanwezig | ja/nee | +25 |
| `bag_gebouw.oppervlakte_m2` aanwezig | ja/nee | +25 |
| `bag_gebouw.gebruiksdoel` aanwezig | ja/nee | +15 |
| **Totaal mogelijk** | | **100** |

Stel de `data_kwaliteit_toelichting` op als één zin die aangeeft wat beschikbaar is en wat de impact is op de downstream-pipeline:
- Score 85–100: "Alle kernvelden beschikbaar — waarderings- en referentiepipeline volledig bruikbaar."
- Score 60–84: "Meeste kernvelden beschikbaar — beperkte impact op waardebepaling; zie ontbrekende velden."
- Score 35–59: "Kritische velden ontbreken — waardebepaling valt terug op gemeente-niveau indicaties."
- Score 0–34: "Onvoldoende BAG-data — alle downstream-analyses zijn indicatief en beperkt betrouwbaar."

### Stap 5 — Ontbrekende velden afhandelen
Als `bag_gebouw` null is of kritische velden ontbreken:

1. **Noteer expliciet welke velden ontbreken** en wat de gevolgen zijn voor downstream skills:
   - Ontbreekt `bouwjaar`: AVM-waardebepaling valt terug op Niveau 2 of 3; correctiefactoren voor bouwperiode niet toepasbaar
   - Ontbreekt `oppervlakte_m2`: AVM-waardebepaling kan geen m²-berekening uitvoeren; referentieselectie op basis van oppervlakte niet mogelijk
   - Ontbreekt `gebruiksdoel`: Woningtype-identificatie valt terug op adrescontext-heuristiek; VVE-check kan niet worden bevestigd
   - Ontbreekt `adres_verificatie`: Perceel-ID niet beschikbaar; kadastrale recherche beperkt

2. **Adviseer concrete herstelacties**:
   - "Controleer het adres in de BAG-viewer: https://bagviewer.kadaster.nl/lvbag/bag-viewer/#?searchQuery=[adres]"
   - "Stel vast of het ingevoerde adres exact overeenkomt met de officiële schrijfwijze (huisnummer, toevoeging)"
   - "Controleer of het pand een actieve inschrijving heeft via Kadaster Online of het WOZ-waardeloket"

3. **Geef aan welke skills beperkt zijn** in de `aanbevolen_herstelactie`:
   - Vermeld per ontbrekend veld welke skill-stap daardoor minder betrouwbaar is

## Markeringsregels
- Alle velden uit `bag_gebouw` en `adres_verificatie`: **geverifieerd via BAG (Kadaster)**
- Niets aanvullen met schattingen — ontbrekende waarden als `null` plus toelichting
- Data-kwaliteitsscore en toelichting: berekend op basis van aanwezige geverifieerde velden

## JSON Output

```json
"bag_data": {
  "bron": "BAG (Basisregistratie Adressen en Gebouwen) via PDOK WFS — Kadaster",
  "data_kwaliteit_score": 85,
  "data_kwaliteit_toelichting": "Bouwjaar en oppervlakte beschikbaar — waarderings-pipeline volledig bruikbaar. Ontbrekend: geen.",
  "bag_nummeraanduiding_id": "0629200000543815",
  "adres_geverifieerd": "Johanneshoevelaan 23, 2241XB Wassenaar",
  "postcode": "2241XB",
  "bouwjaar": 2006,
  "gebruiksoppervlakte_m2": 151,
  "gebruiksdoel": "woonfunctie",
  "pandstatus": "Verblijfsobject in gebruik",
  "perceel": "WSN01-B-11309",
  "buurt": "Weteringpark",
  "wijk": "Wijk 01 Noordoostelijk deel der gemeente",
  "gemeente": "Wassenaar",
  "aanbevolen_herstelactie": null,
  "ontbrekende_velden": [],
  "downstream_impact": "Geen beperkingen — alle skills kunnen volledig worden uitgevoerd.",
  "aandachtspunten": []
}
```

### Voorbeeld bij onvolledige BAG-data

```json
"bag_data": {
  "bron": "BAG (Basisregistratie Adressen en Gebouwen) via PDOK WFS — Kadaster",
  "data_kwaliteit_score": 35,
  "data_kwaliteit_toelichting": "Oppervlakte en bouwjaar ontbreken — AVM-waardebepaling valt terug op gemeente-benchmark (Niveau 3). Waardebepaling heeft beperkte nauwkeurigheid.",
  "bag_nummeraanduiding_id": null,
  "adres_geverifieerd": "Keizersgracht 123, 1015CJ Amsterdam",
  "postcode": "1015CJ",
  "bouwjaar": null,
  "gebruiksoppervlakte_m2": null,
  "gebruiksdoel": "woonfunctie",
  "pandstatus": "Verblijfsobject in gebruik",
  "perceel": null,
  "buurt": "Grachtengordel-West",
  "wijk": "Centrum",
  "gemeente": "Amsterdam",
  "aanbevolen_herstelactie": "Controleer adres in BAG-viewer: https://bagviewer.kadaster.nl/lvbag/bag-viewer/#?searchQuery=Keizersgracht+123+Amsterdam. Verifieer of oppervlakte en bouwjaar beschikbaar zijn onder het correcte verblijfsobject-ID.",
  "ontbrekende_velden": ["bouwjaar", "oppervlakte_m2", "perceel"],
  "downstream_impact": "AVM-waardebepaling: Niveau 3 (gemeente-benchmark). Referentieselectie: geen oppervlakte-filtering mogelijk. Woningtype-identificatie: valt terug op adrescontext-heuristiek.",
  "aandachtspunten": [
    "Aandachtspunt — Bouwjaar ontbreekt: correctiefactor bouwperiode niet toepasbaar in AVM",
    "Aandachtspunt — Oppervlakte ontbreekt: m²-gebaseerde waardeschatting niet mogelijk",
    "Aandachtspunt — Perceel-ID ontbreekt: kadastrale recherche beperkt uitvoerbaar"
  ]
}
```
