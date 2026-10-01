# Oordeel blinde ronde 1 okt 2026

Drie modellen, vijf woningen, huisstijl i4 Housing (4SALE!-sjabloon, 5
voorbeeldteksten). Quinn vond alle teksten "wel goed" en liet de keuze aan
Claude, met als regel: is er één echt veel beter, kies die; anders het
goedkoopste; kwaliteit gaat voor.

**Niet blind:** Claude kende de sleutel al bij het beoordelen. Daarom telt
vooral wat toetsbaar is: feiten tegen de invoer, de regels uit de prompt en
fouten in het Nederlands.

## Per woning (beste eerst)

| Woning | Sonnet 4.6 | Sonnet 5 | Haiku 4.5 | Beste |
|---|---|---|---|---|
| 01 Wassenaar, villa | A — goed; "De badkamer(s)", verzonnen "hoge plafonds" | C — dichtst bij de feiten, natuurlijk; witregels tussen alinea's ontbreken | B — verzint verwarmd zwembad, schuifdeuren, vloerverwarming en een tweede verdieping; "zonnige zwembad", "slecht 10-15 minuten" | Sonnet 5 |
| 02 Leiden, appartement | C — juist aantal slaapkamers en singeluitzicht | B — goed; "het Herensingel", witregels ontbreken | A — onzinzin ("wat maken van navels spoor en fietsconnectie"), "bevind je jezelf", verzonnen vloeren en buitenruimte | Sonnet 4.6 |
| 03 Den Haag, herenhuis | B — suite goed, maar "vijf kamers op de verdiepingen" en de Theresiastraat (Bezuidenhout) als winkelstraat | C — nauwkeurigst | A — dubbele suite als slaapkamer boven, Malieveld "nabij", "gezellge", "workflow" | Sonnet 5 |
| 04 Voorschoten, 2-onder-1-kap | A — "vijf kamers op de verdiepingen", verzonnen doorgang keuken–garage | C — verzint een tweede verdieping, noemt wel de open-huisdatum | B — tweede verdieping verzonnen, "eyecatcher", "niet overgewaardeerd kan worden" | gelijk (4.6/5) |
| 05 Wassenaar, penthouse | C — kapotte zin ("Dit royale buitenruimte omsluiting de woning"), "Het absolute blikvanger" | A — schoon Nederlands; twee slaapkamers i.p.v. drie | B — "alle genieting", "een prestigieuze adres", de A4 i.p.v. de A44 | Sonnet 5 |

## Conclusie

- **Haiku 4.5 valt af.** Goedkoopst ($0,016 per tekst) en snelst (± 30 s),
  maar in elke tekst taalfouten en verzonnen, concrete voorzieningen (een
  verwarmd zwembad, een extra verdieping). Voor klantgerichte Funda-teksten
  niet acceptabel.
- **Sonnet 5 is iets beter dan Sonnet 4.6, niet veel beter** (3 keer beste, 1
  keer gelijk, 1 keer tweede). In de praktijk is het duurder ($0,077 tegen
  $0,055 per tekst) en trager (± 100 s tegen ± 65 s): bij 3 van de 5 woningen
  gaf het eerst ongeldige JSON en was een tweede poging nodig. Ook ontbreken
  de witregels tussen alinea's.
- **Besluit: CONTENT blijft `claude-sonnet-4-6`.** Volgens Quinns regel
  (gelijkwaardig → goedkoopste) en zonder extra risico vóór de demo.
- **Opnieuw bekijken na de demo:** Sonnet 5 met structured outputs
  (`output_config.format`). Zonder de JSON-herkansing kost een Sonnet 5-tekst
  ± $0,047 bij ± 50 s, goedkoper en sneller dan Sonnet 4.6.

## Belangrijkste vondst: de prompt, niet het model

Alle drie de modellen verzonnen verdiepingen en slaapkamers en misten het
balkon in Leiden, omdat de contentprompt alleen adres, type, kamers, m²,
bouwjaar, label, prijs, usp's en doelgroep meekreeg. Slaapkamers, woonlagen,
tuin, balkon, keuken- en badkamerjaar, zonnepanelen en de rest van de intake
bereikten het model nooit. Hersteld op 1 okt 2026 (`lib/contentKenmerken.ts`,
plus de regel "feiten alleen uit de gegevens hierboven").
