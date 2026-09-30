# Backtest waardering v2

> Item 4.8 (`docs/roadmap.md` § 3.3 + § 5 Fase 4). Elke steekproefwoning wordt gewaardeerd met peildatum = de dag vóór haar eigen verkoopdatum, uitsluitend met transacties van daarvóór — precies zoals de synthetische vitest-vangrail (`lib/waardering.backtest.test.ts`), maar dan op de demo-fixture. Meetlogica gedeeld met de test via `lib/backtest.ts`. Dit rapport wordt bij elke run overschreven; in item 5.5 draait hetzelfde script opnieuw op echte i4housing-data.

- **Datum:** 2026-09-17
- **Dataset:** demo-account `demo@vestaai.nl` (kantoor Demo Makelaardij, RLS) — 7829 niet-uitgesloten transacties, waarvan 2066 recent (24 maanden t/m 2026-09-17) met coördinaten
- **N (steekproef):** 400
- **Seed:** 42
- **Commando:** `npx tsx --env-file=.env.local scripts/backtest-waardering.mjs`

## Totaal

|  | n | mediaan fout | P80 fout | P90 fout | binnen band | gem. bandbreedte | gem. n | zonder uitkomst | met waarschuwing |
|---|---|---|---|---|---|---|---|---|---|
| totaal | 400 | 6.1 % | 11.5 % | 15.3 % | 76 % | 24.5 % | 16.9 | 0 % | 1 % |

## Per typegroep

|  | n | mediaan fout | P80 fout | P90 fout | binnen band | gem. bandbreedte | gem. n | zonder uitkomst | met waarschuwing |
|---|---|---|---|---|---|---|---|---|---|
| appartement | 113 | 5.8 % | 13.3 % | 17.7 % | 74 % | 26.7 % | 16.1 | 0 % | 0 % |
| rijwoning | 145 | 6 % | 11 % | 14.1 % | 74 % | 21.2 % | 17.9 | 0 % | 2 % |
| halfvrijstaand | 75 | 5.3 % | 10.1 % | 12.9 % | 81 % | 27.1 % | 15.6 | 0 % | 0 % |
| vrijstaand | 67 | 8 % | 12.4 % | 15 % | 73 % | 24.9 % | 17.7 | 0 % | 3 % |

## Per verbredingstrede

|  | n | mediaan fout | P80 fout | P90 fout | binnen band | gem. bandbreedte | gem. n | zonder uitkomst | met waarschuwing |
|---|---|---|---|---|---|---|---|---|---|
| 750 m | 270 | 5.6 % | 10.5 % | 14.6 % | 77 % | 21.7 % | 18.7 | 0 % | 0 % |
| 1000 m | 71 | 6.8 % | 11.5 % | 16.5 % | 73 % | 24.6 % | 10.8 | 0 % | 0 % |
| 2000 m | 40 | 7.6 % | 14.8 % | 21 % | 78 % | 36.7 % | 17.5 | 0 % | 0 % |
| 5000 m | 19 | 6.9 % | 14.1 % | 24.5 % | 63 % | 36.9 % | 13.6 | 0 % | 26 % |

## Interpretatie (makelaarstaal)

- Een mediane fout van 6.1 % betekent: bij de helft van de steekproefwoningen zat de puntwaarde van de waardering binnen 6.1 % van de werkelijke verkoopprijs (bij de andere helft verder weg — P80/P90 laten zien hoever de staart reikt).
- 76 % binnen de band betekent: bij 76 van de 100 woningen viel de échte verkoopprijs tussen de getoonde laag- en hoogwaarde — dat is het percentage waarop de band zijn belofte waarmaakt.
- Beide demo-lat-doelen zijn gehaald op deze dataset — geen aanpassing aan de bandregels nodig.
- Ondanks een gehaald totaalcijfer zit(ten) **appartement** (5.8 % fout, 74 % binnen band, n=113), **rijwoning** (6 % fout, 74 % binnen band, n=145), **vrijstaand** (8 % fout, 73 % binnen band, n=67) zelf onder de demo-lat — daar is de band voor die taxateur minder betrouwbaar dan het totaal doet vermoeden.
- De verbredingstredes met weinig woningen (5000 m: n=19) geven geen betrouwbaar beeld op zichzelf — dat zijn de gevallen waarin de straal al moest verbreden omdat er lokaal te weinig vergelijkbare verkopen waren, en de cijfers daar zwaaien het hardst mee (zie bv. het percentage "met waarschuwing").

## Vergelijking met de demo-lat en de synthetische backtest

| | Mediaan fout | Binnen band |
|---|---|---|
| Demo-lat (roadmap § 3.3) | ≤ 7 % | ≥ 75 % |
| Synthetisch (17 sep 2026, 400 woningen, `lib/waardering.backtest.test.ts`) | 5.2 % | 78 % |
| **Dit rapport (demo-fixture)** | **6.1 %** | **76 %** |

Beide demo-lat-doelen zijn gehaald.
