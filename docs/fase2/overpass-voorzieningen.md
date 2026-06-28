---
name: overpass-voorzieningen
description: Breng de nabijheid van dagelijkse voorzieningen in kaart op basis van OpenStreetMap-data via de Overpass API. Gebruik wanneer bereikbaarheid en leefomgeving relevant zijn voor de verkooppresentatie of vraagprijsbepaling.
---

# Overpass Voorzieningen

Verwerk de `poi_data` uit de GEVERIFIEERDE DATA tot een gestructureerd overzicht van nabijgelegen voorzieningen per categorie. Bron is OpenStreetMap via de Overpass API. Vermeld altijd of data geverifieerd of indicatief is. Genereer tevens een kant-en-klare Funda-bereikbaarheidstekst.

## Databronnen
- **OpenStreetMap via Overpass API** (geverifieerd) → `poi_data` veld in GEVERIFIEERDE DATA
- **Locatie-inschatting op basis van gemeente** (indicatief) → rijafstand snelweginrit
- Zoekradius: 1.500 meter rondom het pand (luchtlijn)

## Instructies

### Verwerking poi_data per categorie

Verwerk elke categorie uit `poi_data.voorzieningen`. Gebruik de volgende richtlijnen:

1. **Aanwezige categorie** — geef voor elk item weer:
   - Naam van de voorziening
   - Afstand in meters (afronden op 50m)
   - Looptijd in minuten (afronden op halve minuten, voetgangersnorm: 80 m/min)
   - Slechts de dichtstbijzijnde 2–3 opties per categorie vermelden in het rapport

2. **Lege categorie** — schrijf: `"[Niet gevonden in 1.500m radius]"`

3. **Categorieën**:
   - `supermarkt` — dagelijkse boodschappen (bijv. Albert Heijn, Jumbo, Lidl)
   - `apotheek` — farmaceutische diensten
   - `huisarts` — eerstelijnszorg
   - `school` — basisschool en/of middelbare school
   - `ov_halte` — bus- of tramhalte (dichtstbijzijnde)
   - `treinstation` — dichtstbijzijnde NS-station
   - `park` — openbaar groen, stadspark of recreatiegebied

### Bereikbaarheid per auto

- Als `rijtijden_auto` aanwezig in de data: gebruik de gemeten rijduren als primaire bron (OSRM — **[indicatief — zonder file]**).
  - Vermeld de 2–3 meest relevante steden (dichtstbij of meest gebruikt als werklocatie voor de regio)
  - Formaat: "34 min rijden naar Amsterdam CS (32 km)"
- Als `rijtijden_auto` ontbreekt: schat de rijafstand naar de dichtstbijzijnde snelweginrit op basis van de gemeente (**[indicatief — exacte rijafstand via routeplanner]**)
- Gebruik gangbare snelwegafstanden per regio als richtlijn (bijv. Amsterdam Centrum: A10 ca. 2–5 km, Wassenaar: A44 ca. 3 km)

### Funda-tekst bereikbaarheid

Genereer een kant-en-klare bereikbaarheidstekst voor gebruik in de Funda-advertentie:
- Maximaal 60 woorden
- Professioneel, actief en verkoopgericht
- Noem de meest relevante voorzieningen op loopafstand
- Noem de dichtstbijzijnde OV-verbinding en indien relevant het treinstation
- Vermeld de ligging ten opzichte van een snelweg indien gunstig
- Schrijf in de derde persoon, gericht op de woning (niet "u kunt...")
- Geen prijsinformatie, geen overtreffende trappen

### Kwaliteitsbeoordeling nabijheid

Voeg een compacte beoordeling toe op basis van de afstanden:
- **Uitstekend**: supermarkt en OV-halte beide binnen 400m
- **Goed**: supermarkt binnen 800m, OV-halte binnen 600m
- **Voldoende**: supermarkt binnen 1.200m, OV bereikbaar met fiets
- **Beperkt**: essentiële voorzieningen verder dan 1.200m of afwezig in radius
- Gebruik uitsluitend de gemeten afstanden — geen subjectief oordeel

## Markeringsregels
- Naam, afstand en looptijd per POI uit Overpass API: **geverifieerd**
- Rijafstand snelweginrit: **[indicatief — exacte afstand via routeplanner]**
- Kwaliteitsbeoordeling: gebaseerd op geverifieerde afstanden, categorisering is richtlijn
- OSM-data kan verouderd zijn voor recent geopende of gesloten vestigingen: **[geverifieerd op ophaaldatum]**

## JSON Output

```json
"nabijheid_voorzieningen": {
  "supermarkt": [
    {
      "naam": "Albert Heijn Keizersgracht",
      "afstand_m": 350,
      "looptijd_min": 4.5
    },
    {
      "naam": "Jumbo Leidseplein",
      "afstand_m": 700,
      "looptijd_min": 9.0
    }
  ],
  "apotheek": [
    {
      "naam": "Apotheek De Jordaan",
      "afstand_m": 250,
      "looptijd_min": 3.0
    }
  ],
  "huisarts": [
    {
      "naam": "Huisartsenpraktijk Van der Berg",
      "afstand_m": 450,
      "looptijd_min": 6.0
    }
  ],
  "scholen": [
    {
      "naam": "Basisschool De Kleine Kapitein",
      "afstand_m": 550,
      "looptijd_min": 7.0
    }
  ],
  "ov_haltes": [
    {
      "naam": "Halte Keizersgracht (tram 2, 11, 12)",
      "afstand_m": 150,
      "looptijd_min": 2.0
    }
  ],
  "treinstation": [
    {
      "naam": "Amsterdam Centraal",
      "afstand_m": 1200,
      "looptijd_min": 15.0
    }
  ],
  "groen": [
    {
      "naam": "Vondelpark",
      "afstand_m": 900,
      "looptijd_min": 11.5
    }
  ],
  "bereikbaarheid_auto": {
    "Amsterdam CS": {"rijduur_min": 34, "afstand_km": 32.1},
    "Den Haag CS":  {"rijduur_min": 18, "afstand_km": 16.4},
    "snelweginrit": "A44 richting Amsterdam",
    "toelichting": "[indicatief — OSRM zonder file]"
  },
  "nabijheid_beoordeling": "Uitstekend — supermarkt op 350m, tramhalte op 150m loopafstand",
  "funda_tekst_bereikbaarheid": "Ideaal gelegen in het centrum van Amsterdam, op loopafstand van tramhalte Keizersgracht (tram 2, 11 en 12) en een Albert Heijn op 350 meter. Amsterdam Centraal is bereikbaar op 15 minuten lopen. Rondom meerdere parken, scholen en medische voorzieningen aanwezig.",
  "bron": "OpenStreetMap via Overpass API — geverifieerd",
  "ophaaldatum": "2026-03-19"
}
```
