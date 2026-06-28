---
name: woz-vergelijking
description: Verwerk WOZ-waardedata uit de geverifieerde API-respons. Toon de meest recente WOZ-waarde met peildatum, het meerjarig verloop, het stijgingspercentage en de verhouding WOZ/m². Leg het peildatumsysteem en het verschil met marktwaarde uit. Als woz_data afwezig is, signaleer dit als aandachtspunt en verwijs naar handmatige opzoeking.
---

# WOZ-vergelijking

Verwerk de WOZ-waardedata uit het veld `woz_data` (aangeleverd door data_ophaler.py). Toon het historisch verloop, bereken het stijgingspercentage en leg de relatie met marktwaarde uit. WOZ-waarde is een belastinggrondslag — geen marktwaarde.

## Databronnen
- **WOZ Waardeloket API (Kadaster/VNG)** — geverifieerd via data_ophaler.py
- **Handmatige opzoeking** (fallback): https://www.wozwaardeloket.nl

## Instructies

### 1. Controleer beschikbaarheid woz_data

Controleer of `woz_data` aanwezig en gevuld is in de aangeleverde data:
- **woz_data aanwezig**: volg instructies onder stap 2 (volledige analyse)
- **woz_data afwezig of leeg**: volg instructies onder stap 3 (niet beschikbaar)

### 2. Als woz_data aanwezig (volledige analyse)

Gebruik de volgende velden uit `woz_data`:
- `woz_waarden`: lijst van objecten met `peildatum` (bijv. `"2024-01-01"`) en `waarde` (bijv. `875000`), gesorteerd op datum, meest recent eerst, maximaal 5 jaar
- `woz_object_id`: uniek objectidentificatienummer
- `bron`: verificatiestring van de API

**Stap A — Meest recente WOZ-waarde**

Neem het eerste element uit `woz_waarden` (meest recente):
- Weergeven als: WOZ-waarde [waarde in euro] per peildatum [datum]
- Toelichting peildatumsysteem: de WOZ-beschikking voor belastingjaar 2025 is gebaseerd op de marktwaarde per 1 januari 2024. Het jaar in de beschikking is dus altijd één jaar later dan de peildatum.

**Stap B — WOZ-verloop (tabel)**

Maak een tabel met alle beschikbare jaren uit `woz_waarden`:

| Belastingjaar | Peildatum | WOZ-waarde |
|---------------|-----------|-----------|
| [peildatum jaar + 1] | [peildatum] | € [waarde] |
| ... | ... | ... |

Sorteer van meest recent naar oudst.

**Stap C — Stijgingspercentage**

Bereken het totale stijgingspercentage ten opzichte van de oudste beschikbare waarde:
- Formule: `((nieuwste waarde - oudste waarde) / oudste waarde) * 100`
- Afronden op één decimaal
- Vermeld ook de periode waarover wordt berekend (bijv. "over 4 jaar")
- Als slechts één jaar beschikbaar: stijgingspercentage niet berekenen, vermelden als "n.v.t. (onvoldoende historische data)"

**Stap D — WOZ per m²**

Als `bag_data.oppervlakte` beschikbaar is:
- Bereken: `meest recente WOZ-waarde / gebruiksoppervlakte (m²)`
- Weergeven als: € [bedrag] per m²
- Toelichting: dit is de WOZ-waarde per m², niet de marktwaarde per m²

Als oppervlakte niet beschikbaar: veld weglaten, vermelden als "n.v.t. (oppervlakte niet beschikbaar)"

**Stap E — Toelichting WOZ vs. marktwaarde**

Altijd opnemen: de WOZ-waarde is vastgesteld als belastinggrondslag voor gemeentelijke belastingen (OZB) en waterschapsbelasting. Het verschil met de actuele marktwaarde bedraagt doorgaans 10–30%. De WOZ-waarde kan zowel hoger als lager liggen dan de marktwaarde, afhankelijk van het moment van taxatie en lokale marktontwikkelingen.

### 3. Als woz_data afwezig (niet beschikbaar)

- Vermeld: WOZ Waardeloket API niet bereikbaar of geen data geretourneerd voor dit object
- Verwijs naar handmatige opzoeking: https://www.wozwaardeloket.nl (zoek op postcode + huisnummer)
- Zet `status_risico` op "Aandachtspunt"
- Vul alle waarde-velden als `null`

## Markeringsregels
- WOZ-waarden uit API: **geverifieerd (WOZ Waardeloket API — Kadaster/VNG)**
- Stijgingspercentage en WOZ/m²-berekeningen: **berekend op basis van geverifieerde API-data**
- WOZ vs. marktwaarde interpretatie: **indicatief — verschil 10–30% gebruikelijk**
- Gemeente-niveau fallback niet van toepassing voor WOZ; verwijs altijd naar wozwaardeloket.nl

## JSON Output

```json
"woz_vergelijking": {
  "woz_actueel_waarde": "[waarde in euro of null]",
  "woz_actueel_peildatum": "[YYYY-MM-DD of null]",
  "woz_actueel_belastingjaar": "[peildatum jaar + 1 of null]",
  "woz_object_id": "[object-id of null]",
  "woz_verloop": [
    {
      "belastingjaar": "[jaar]",
      "peildatum": "[YYYY-MM-DD]",
      "waarde": "[waarde in euro]"
    }
  ],
  "woz_stijging_pct": "[X.X% over Y jaar of 'n.v.t. (onvoldoende historische data)' of null]",
  "woz_per_m2": "[bedrag per m² of 'n.v.t. (oppervlakte niet beschikbaar)' of null]",
  "status_risico": "[Geen bijzonderheden / Aandachtspunt]",
  "bron": "WOZ Waardeloket API (Kadaster/VNG) — geverifieerd",
  "toelichting": "WOZ-waarde is een belastinggrondslag voor OZB en waterschapsbelasting. Verschil met marktwaarde bedraagt doorgaans 10–30%. Peildatum is altijd 1 januari van het voorgaande belastingjaar. Voor handmatige opzoeking: https://www.wozwaardeloket.nl"
}
```
