---
name: ontwerpreview
description: Visuele review van een gebouwd scherm tegen zijn ontwerp-prototype in docs/ontwerp/. Gebruik dit als onderdeel van de Definition of Done voor elk hero-scherm (marktanalyse, transacties, concurrentie, verkoopkaart, waardebepaling, dossier, startpagina), nadat scripts/screenshots.mjs heeft gedraaid. Vergelijkt screenshot met prototype, levert een lijst afwijkingen, en geeft pas akkoord als die zijn opgelost.
---

# Ontwerpreview

Doel: voorkomen dat een interactieve verkenner "technisch af" maar visueel
amateuristisch of tekst-gebaseerd wordt opgeleverd. Het prototype in
`docs/ontwerp/<scherm>.html` is de spec (roadmap § 3.8); de gebouwde pagina
moet er naast kunnen liggen zonder dat je het verschil ziet, behalve de data.

## Wanneer

Bij elk item dat in `docs/roadmap.md` naar een prototype in `docs/ontwerp/`
verwijst — vóór `/sessie-afronden`, en opnieuw na elke fix-ronde.

## Stappen

1. **Maak de twee beelden.**
   - Prototype: open `docs/ontwerp/<scherm>.html` met Playwright op 1440 px
     breed (`fullPage`), bewaar als `screenshots/ontwerp-<scherm>.png`.
   - App: `scripts/screenshots.mjs` voor dezelfde route op 1440 px, met de
     demo-fixture ingelogd, dezelfde filterstand als het prototype (zet die
     via de URL).
2. **Laat een subagent met vision beide beelden bekijken** (`Agent`,
   `model: sonnet` volstaat; `opus` bij twijfel), met deze opdracht:
   > Vergelijk beeld A (prototype) met beeld B (gebouwd). Lees eerst de
   > checklist hieronder. Rapporteer élke afwijking als: *plek · wat wijkt af ·
   > wat het prototype doet*. Rangschik op zichtbaarheid. Sluit af met
   > AKKOORD of NIET AKKOORD.
3. **Loop de checklist zelf ook na** (interactie zie je niet op een
   screenshot):
   - **Layout:** zelfde volgorde en verhouding van blokken; dezelfde
     kolomverdeling; sticky filterbar; niets "zweeft" in leeg vlak; spacing
     op de 4/8-schaal; volle breedte binnen `--app-breedte`.
   - **Typografie:** kantoorlettertype; tabular-nums op elk getal; nl-NL
     opmaak (`€ 1.250.000`, `4,2%`, `34 dgn`); eyebrow + titel volgens
     `PageHeader`.
   - **Kleur:** alleen `--merk*` + neutraal grijs; "wij" = merk, "markt" =
     donker neutraal, segment B = accent; semantische kleuren nooit de
     accentkleur; geen library-defaultkleuren.
   - **Grafieken:** geen default-legendabox waar directe eindlabels staan;
     rasterlijnen dun en licht; eigen tooltipkaart met alle reeksen + n;
     eindlabels botsen niet; y-as met "mooie" stappen en korte labels; geen
     dubbele as.
   - **Data-context:** elke tegel en grafiek toont n en "data t/m"; weinig
     data → waarschuwing, geen kaal getal.
   - **Staten:** leeg, laden (skeleton, geen spinner), weinig data en fout
     zien eruit als in het prototype (gebruik de prototype-strip om ze te
     bekijken).
   - **Interactie (handmatig in de browser):** filter → resultaat binnen
     100 ms; crossfilter werkt (klik op een staaf zet een filter-chip);
     hover onthult detail; Escape/klik-buiten sluit panelen; Tab bereikt
     elk element met merkkleurige focusring; filterstand in de URL en
     terugknop werkt; getallen tweenen bij verandering; reduced-motion
     respecteren.
   - **Kaart (indien van toepassing):** grijze basiskaart, pins in
     merkkleur met witte rand, hover-kaart, lijst en kaart wijzen naar
     elkaar, vloeiend pannen/zoomen, geen CSP-fouten in de console.
4. **Fix alles wat NIET AKKOORD is, herhaal stap 1-3.** Geen afwijking
   "laten staan voor later" — dat is precies hoe schermen amateuristisch
   blijven. Wél toegestaan: een bewuste, genoteerde afwijking omdat de
   datalaag het vereist (schrijf hem in het item in `docs/roadmap.md`).
5. **Noteer het akkoord** in `/sessie-afronden` (Stand van zaken:
   "ontwerpreview akkoord op <datum>").

## Wat dit NIET is

Geen smaakdiscussie: het prototype is al de ontwerpkeuze. Wil je het ontwerp
zelf veranderen, pas dan eerst het prototype aan (ontwerpsessie) en review
daarna opnieuw.
