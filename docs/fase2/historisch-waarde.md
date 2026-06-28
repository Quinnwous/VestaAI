---
name: historisch-waarde
description: Breng de historische waardeontwikkeling in kaart via WOZ-waarden en eerdere koopsommen. Gebruik om prijstrend en waardeontwikkeling te analyseren. Alle historische data markeren als [indicatief] tenzij aantoonbaar uit publieke bronnen. Produceert altijd een historisch overzicht op gemeenteniveau op basis van CBS/NVM openbare data, ook wanneer woning-specifieke data niet beschikbaar is.
---

# Historisch Waarde-Overzicht

Analyseer de waardeontwikkeling van het pand over de afgelopen jaren aan de hand van historische WOZ-waarden en bekende transactieprijzen. Wanneer woning-specifieke data niet beschikbaar is, wordt altijd een historisch overzicht op gemeenteniveau geproduceerd op basis van CBS-gemeentestatistieken en NVM-marktdata.

## Databronnen
- **WOZ Waardeloket API**: `woz_data` veld — als beschikbaar, gebruik de WOZ-waarden uit `woz_data.woz_waarden` voor het verloopoverzicht
- **WOZ-waarden** [indicatief — WOZ Waardeloket niet publiek bereikbaar zonder betaald abonnement]
- **Eerdere koopsommen** [indicatief — Kadaster betaald product; NVM-transacties via Brainbay]
- **CBS WOZ-statistieken gemeenteniveau** [indicatief — openbaar, als proxy voor lokale trendanalyse]
- **NVM kwartaalrapportages** [indicatief — deels publiek beschikbaar]
- **Funda Verkocht** [indicatief — beperkt publiek zichtbaar]

## Instructies

### 0. Geverifieerde WOZ-data (indien aanwezig)

Als `woz_data` aanwezig is in de data: gebruik de geverifieerde WOZ-waarden als ankerpunt voor de historische waardeontwikkeling. Vermeld de WOZ-waarden per peildatum. Berekende stijgingspercentages zijn geverifieerd als ze uit `woz_data` komen, anders indicatief.

- Gebruik `woz_data.woz_waarden` voor het verloopoverzicht in stap 3
- Markeer deze waarden als **[geverifieerd — WOZ Waardeloket API]** in plaats van indicatief

### 1. Lokale WOZ-trendtabel (gemeenteniveau) — ALTIJD PRODUCEREN

Produceer bij elke output een historische trendtabel op gemeenteniveau. Deze tabel is gebaseerd op CBS WOZ-gemeentestatistieken en is altijd beschikbaar, ongeacht de beschikbaarheid van woning-specifieke data. Markeer expliciet als **[indicatief — CBS gemeentestatistieken, niet per woning]**.

Gebruik de onderstaande gemeente-specifieke bekende cumulatieve stijgingsdata (2019–2024) als basis voor het invullen van de trendtabel:

**Bekende gemeente-specifieke data (CBS-indicatief):**
- **Wassenaar**: cumulatieve stijging 2019–2024 ca. +45%, sterk boven nationaal gemiddelde van ca. +35%
- **Bloemendaal / Aerdenhout / Heemstede**: cumulatieve stijging ca. +43%, boven nationaal gemiddelde
- **Amsterdam**: cumulatieve stijging ca. +38%, iets boven nationaal gemiddelde
- **Utrecht**: cumulatieve stijging ca. +40%, boven nationaal gemiddelde
- **Haarlem**: cumulatieve stijging ca. +38%, iets boven nationaal gemiddelde
- **Leiden / Delft**: cumulatieve stijging ca. +36%, rondom nationaal gemiddelde
- **Den Haag**: cumulatieve stijging ca. +30%, onder nationaal gemiddelde
- **Rotterdam**: cumulatieve stijging ca. +28%, onder nationaal gemiddelde
- **Eindhoven / Breda / Tilburg**: cumulatieve stijging ca. +32%, licht onder nationaal gemiddelde
- **Overige gemeentes**: gebruik nationaal gemiddelde als proxy (ca. +35% cumulatief)

**Standaard trendtabel (pas aan op basis van gemeente):**

| Jaar | Gemeente WOZ-index | Nationaal gemiddelde | Lokale afwijking |
|------|--------------------|---------------------|-----------------|
| 2019 | basis (100) | basis (100) | neutraal |
| 2020 | [invullen op basis van gemeente] | +6% | [berekenen] |
| 2021 | [invullen op basis van gemeente] | +14% | [berekenen] |
| 2022 | [invullen op basis van gemeente] | +8% | [berekenen] |
| 2023 | [invullen op basis van gemeente] | -6% | [berekenen] |
| 2024 | [invullen op basis van gemeente] | +6% | [berekenen] |

**Voorbeeld voor Wassenaar (cumulatief +45% over 2019–2024):**

| Jaar | Gemeente WOZ-index | Nationaal gemiddelde | Lokale afwijking |
|------|--------------------|---------------------|-----------------|
| 2019 | basis (100) | basis (100) | neutraal |
| 2020 | +9% | +6% | +3% premium |
| 2021 | +16% | +14% | +2% premium |
| 2022 | +13% | +8% | +5% premium |
| 2023 | -4% | -6% | +2% veerkracht |
| 2024 | +9% | +6% | +3% premium |

Markeer altijd: **[indicatief — CBS gemeentestatistieken, niet per woning]**

### 2. Nationale markttrend (NVM/CBS openbaar) — ALTIJD PRODUCEREN

Vermeld bij elke output de volgende vastgestelde nationale markttrends:

- **2019–2021**: sterke stijging +35% nationaal (historisch laag renteklimaat, krapte op de woningmarkt)
- **2022–H1 2023**: correctie -8% nationaal (rentestijging ECB, afkoeling vraag)
- **H2 2023–2024**: herstel +6% nationaal (rentestabilisering, vraag trekt aan)
- **Langetermijntrend Nederland**: gemiddeld +4–5% per jaar over de afgelopen 20 jaar (CBS)
- **Verwachting 2025–2026** [indicatief]: gematigde stijging verwacht (+3–5%), afhankelijk van renteontwikkeling ECB en woningbouwproductie

### 3. WOZ-waarden overzicht woning-specifiek [indicatief]

- Geef WOZ-waarden voor beschikbare jaren (typisch 5–10 jaar terug)
- Peildatum is altijd 1 januari van het voorgaande jaar
- Markeer als: **[indicatief — WOZ Waardeloket vereist betaald abonnement]**
- Als niet beschikbaar: noteer "Niet opgehaald — WOZ Waardeloket niet publiek bereikbaar zonder betaald abonnement"

### 4. Transactiehistorie woning-specifiek [indicatief]

- Eerdere verkoopprijzen van dit specifieke adres (indien publiek beschikbaar)
- Datum, verkoopprijs, eventuele bijzonderheden
- Markeer als: **[indicatief — Kadaster transactiedata vereist betaald abonnement]**
- Perceel-ID (indien beschikbaar uit `adres_verificatie.percelen`): controleer historische transacties via KIK-inzage op https://www.kadaster.nl (€3,30 per uittreksel)

### 5. Waardeontwikkeling berekening [indicatief]

- % stijging/daling per jaar (indien 2+ datapunten beschikbaar)
- Vergelijking met gemeentelijk gemiddelde en nationaal gemiddelde
- Positie van de woning in de lokale trendlijn

### 6. Conclusie

- Is de waardeontwikkeling bovengemiddeld / gemiddeld / ondergemiddeld ten opzichte van de gemeente en het nationale gemiddelde?
- Verwachting komende 12 maanden op basis van marktontwikkelingen [indicatief]
- Samenvatting van de lokale afwijking ten opzichte van het nationale gemiddelde

## Markeringsregels
- Alle historische waarden woning-specifiek: **[indicatief]** tenzij aantoonbaar publiek geverifieerd
- Gemeenteniveau trenddata: **[indicatief — CBS gemeentestatistieken, niet per woning]**
- Nationale trenddata: **[openbaar — CBS/NVM kwartaalrapportages]**
- Duidelijk aangeven welke data ontbreekt en waarom

## JSON Output

```json
"historisch_waarde": {
  "gemeente_woz_trend": {
    "bron": "CBS WOZ-gemeentestatistieken [indicatief — niet per woning]",
    "cumulatief_2019_2024_gemeente_pct": "[invullen op basis van gemeente]",
    "cumulatief_2019_2024_nationaal_pct": "+35%",
    "lokale_afwijking": "[berekenen]",
    "trendtabel": [
      {"jaar": 2019, "gemeente_index": "basis (100)", "nationaal": "basis (100)", "afwijking": "neutraal"},
      {"jaar": 2020, "gemeente_index": "[indicatief]", "nationaal": "+6%", "afwijking": "[indicatief]"},
      {"jaar": 2021, "gemeente_index": "[indicatief]", "nationaal": "+14%", "afwijking": "[indicatief]"},
      {"jaar": 2022, "gemeente_index": "[indicatief]", "nationaal": "+8%", "afwijking": "[indicatief]"},
      {"jaar": 2023, "gemeente_index": "[indicatief]", "nationaal": "-6%", "afwijking": "[indicatief]"},
      {"jaar": 2024, "gemeente_index": "[indicatief]", "nationaal": "+6%", "afwijking": "[indicatief]"}
    ]
  },
  "nationale_trendlijnen": {
    "periode_2019_2021": "sterke stijging +35% nationaal",
    "periode_2022_h1_2023": "correctie -8% nationaal",
    "periode_h2_2023_2024": "herstel +6% nationaal",
    "langetermijn_20_jaar": "gemiddeld +4-5% per jaar",
    "verwachting_2025_2026": "[indicatief — +3-5% afhankelijk ECB-rente en woningbouw]"
  },
  "woz_waarden_woning": [
    {"jaar": 2024, "woz": "[indicatief — WOZ Waardeloket niet publiek bereikbaar]"},
    {"jaar": 2023, "woz": "[indicatief]"},
    {"jaar": 2022, "woz": "[indicatief]"}
  ],
  "transactiehistorie": [
    {"datum": "[indicatief]", "verkoopprijs": "[indicatief — Kadaster betaald]", "bron": "niet geverifieerd"}
  ],
  "perceel_verificatie_link": "https://www.kadaster.nl/zakelijk/registraties/basisregistraties/bag — KIK-inzage €3,30 per uittreksel",
  "waardestijging_per_jaar_pct": "[indicatief]",
  "vergelijking_gemeentegemiddelde": "[indicatief]",
  "vergelijking_nationaal": "[indicatief]",
  "trend_kwalificatie": "[bovengemiddeld / gemiddeld / ondergemiddeld]",
  "databeschikbaarheid": "Gemeenteniveau CBS-trenddata altijd beschikbaar [indicatief]. Woning-specifieke WOZ en Kadaster-transacties vereisen betaald abonnement."
}
```
