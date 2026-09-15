# VestaAI — Doelen & Strategie

> Dit document is het kompas voor alle product- en businessbeslissingen.

---

## Wat we bouwen

> **Koerswijziging 15 september 2026.** VestaAI was een AI-contentplatform. Het wordt een
> waarderingsplatform. De contentsuite is niet weggegooid maar vergrendeld (zie
> `lib/features.ts`) en komt later terug als tweede pijler, niet als kern.

**VestaAI is het waarderingsplatform voor Nederlandse makelaars — in hun eigen huisstijl.**

De woning is de kern. Per adres bouwt de makelaar een dossier op met een onderbouwde
waarde, vergelijkbare verkopen en scenario's waarmee hij aan de keukentafel kan rekenen.
Daarnaast staat marktanalyse: vrije vragen aan de transactiedata, los van één woning.

**Het probleem dat we oplossen:** een waardebepaling is het moment waarop een makelaar de
opdracht wint of verliest. Vandaag gebeurt dat met een onderbuikgevoel, een handvol
referenties uit het hoofd en een rapport uit Word. De makelaar kan niet laten zien wat een
beter energielabel, een dakkapel of een garage met de waarde doet — terwijl dat precies de
vraag van de verkoper is.

**Ons voordeel in één zin:** de enige tool die een waardebepaling van onderbuikgevoel naar
navolgbare onderbouwing tilt, en die onderbouwing aflevert als rapport in de huisstijl van
het kantoor zelf.

**De drie beloften:**
1. *Waarde met onderbouwing* — een bandbreedte, gedragen door echte transacties in de buurt, niet door een black box.
2. *Scenario's* — wat doet een label-sprong, een extra kamer, een garage of een aanbouw met de waarde?
3. *Het is hun platform* — vanaf het inloggen draagt de omgeving het logo en de kleuren van het kantoor, tot in het rapport.

---

## Markt

| Segment | Omvang | Aanpak |
|---------|--------|--------|
| NL actieve kantoren | ~9.000 (CBS) | Primaire markt |
| NVM-leden | ~5.500 | Meest solvabel, 74% transacties |
| Belgische makelaars (Vlaanderen) | ~8.000 | Fase 3 |
| Duitse Makler | ~40.000 | Fase 3+ |

**TAM:** ~€247M/jaar (NL + BE + DE)  
**Doel NL:** €1M+ ARR bij 10% penetratie

**Distributie-gatekeeper:** Realworks heeft ~80% marktaandeel onder NL-makelaars en is daarmee de facto poortwachter — zonder koppeling is Vesta voor de meeste kantoren een los tool i.p.v. ingebakken workflow. HousApp koppelt al met zowel Realworks als Kolibri. Een echte Realworks-API-koppeling (i.p.v. de huidige XML-export) en Kolibri/AppXchange-aanmelding staan daarom in `roadmap.md` als post-livegang-prioriteit onder "moat & distributie".

---

## Prijzen

> **Volledig verwijderd op 15 sep 2026** (op verzoek van Quinn — "kom ik later op terug").
> Geen abonnementen, geen Stripe, geen plan-gating meer in de code (`lib/plans.ts`, alle
> Stripe-routes en de bijbehorende UI zijn verwijderd — zie `CLAUDE.md`). Toegang is nu puur
> admin-beheerd: de platform-admin zet een kantoor en de bijbehorende accounts klaar in
> `/admin`, zonder plan of proefperiode. Nieuwe prijslogica volgt pas als daar opnieuw over
> besloten wordt — dit document bevat bewust geen cijfers meer totdat dat gebeurt.

---

## Go-to-market strategie

**Kernregel:** Makelaars kopen van mensen die ze vertrouwen. Geen advertenties in de beginfase.

**Fase 1 — Pilot:** Eerste klant als pilotpartner. Directe ingang tot NVM-netwerk. Doel: 5 testers + 1 testimonial.

**Fase 2 — Lancering:** Testers converteren naar betaald. LinkedIn-lancering met persoonlijk verhaal. NVM PropTech-programma aanmelden. Doel: 30 kantoren.

**Fase 3 — België:** CIB Vlaanderen. Casestudy met echte tijdsbesparing. Doel: 80 NL + 30 BE. *(Extern marktonderzoek aug 2026 bevestigt: geen dominante Belgische speler doet vandaag AI-contentgeneratie voor makelaars — eerste-mover kans, deze fase mag naar voren zodra Fase 1/2 staan.)*

**Fase 4 — Franchise:** Directe outreach ERA, Engel & Völkers NL, Makelaarsland. Affiliate-programma. Doel: 5 franchise-deals, 250 kantoren.

**Fase 5 — Schaal:** Google Ads. NVM Magazine. Funda API-koppeling. Doel: €1M+ ARR.

---

## Lock-in strategie

**De portefeuille is de belangrijkste retention-driver.** Een kantoor dat weggaat verliest zijn
woningdossiers: de waarderingen, de gekozen referenties en de rapporten die het aan klanten
heeft afgegeven. Dat is zwaarder om elders opnieuw op te bouwen dan een stijlprofiel, en het
raakt bovendien de verantwoording richting de verkoper.

**De huisstijl-laag versterkt dat.** Doordat de hele omgeving en elk rapport het logo en de
kleuren van het kantoor dragen, voelt VestaAI niet als een ingehuurd hulpmiddel maar als hun
eigen systeem. Wisselen betekent dan ook een zichtbare stap terug richting de klant.

**Verdediging per dreiging:**
- *Funda bouwt eigen tool:* Snel loyale user-base opbouwen voor ze starten. Klanten zijn dan al afhankelijk van Vesta's stijlprofielen. *(Signaal: Funda lanceerde al een eigen AI-virtual-stagingtool, 2025/2026 — geen volledig platform, wel een eerste stap.)*
- *CRM-spelers voegen AI toe:* 12–18 maanden reactietijd. Vesta heeft dan 500+ klanten en branchereputatie.
- *HousApp voegt contentmodule toe:* vandaag géén overlap (zij = workflow/inbox/planner/leadgen, wij = content), maar goed gefund (€4,3M, juli 2026) en consolideert via overnames (Friva-overname jan 2026, ~2.200 makelaars). Extern marktonderzoek schat de reactietijd eerder op 6–24 maanden dan de 12–18 hierboven — sneller dan gehoopt. Verdediging: huisstijl-lock-in (diepste gracht, content is bij hen feature #4, bij ons het bestaansrecht), suite-diepte, per-kantoor-prijs (structureel goedkoper voor grotere kantoren dan hun per-seat-model €69/€69/€29 per makelaar), en desnoods een niet-vijandig partnerschapsspoor als hun module er toch komt. Vroege-waarschuwing: maandelijkse concurrentie-scan (zie `roadmap.md`).
- *Internationale spelers doen NL:* Funda-kennis en NL buurtcultuur kosten jaren om te bouwen.

---

## Exitstrategie

**Voorkeur: Bootstrap tot €2M ARR.** Maximale autonomie, meest realistisch voor dit producttype.

**Alternatief:** VC-funding bij €500K ARR alleen voor versnelling naar Duitsland of salesteam.

**Strategische exit (jaar 5):**
- Potentiële kopers: Funda, Realworks, NVM-gelieerde SaaS, PropTech PE-funds
- Realistisch: €1–20M. Bij €1M ARR en 4–8× multiple = €4–8M exit.

---

## Risico's

| Risico | Ernst | Mitigatie |
|--------|-------|-----------|
| Funda bouwt eigen tool | Medium | Snel user-base + huisstijl lock-in opbouwen |
| HousApp lanceert contentmodule | Medium–Hoog | Zie "Verdediging per dreiging" hierboven; maandelijkse concurrentie-scan als vroege waarschuwing |
| Trage adoptie (conservatieve markt) | Medium | Resultaten bewijzen via testimonials, niet pitchen |
| AI-transparantieverplichting (EU AI Act / BE deontologische code) | Laag–Medium | AI-content-labeling ingebouwd in virtual staging (aug 2026); compliance-pagina volgt (zie `roadmap.md`) |
| **Licentie op de transactiedata** | **Hoog** | **Openstaand.** De waardering staat of valt met de geïmporteerde dataset van verkochte woningen. Kadaster-, NVM/brainbay- en Funda-data zijn licentieplichtig; scrapen is in strijd met de voorwaarden. Vóór livegang moet vaststaan wélke bron met wélke licentie wordt gebruikt en of commerciële doorlevering aan makelaars is toegestaan. |
| Waarderingsclaim (aansprakelijkheid) | Medium | De uitkomst is een onderbouwde indicatie, geen taxatie in de zin van het NRVT. Rapport en UI moeten dat expliciet benoemen. |
| Claude API afhankelijkheid | Medium | Model-agnostische architectuur; kan switchen |
| Oprichter-capaciteit | Beheersbaar | Bij €5K MRR eerste part-time hire |
| Tech risico | Laag | Bewezen API-architectuur, geen custom ML |
| Financieel startrisico | Laag | Break-even bij 2 klanten, <€500 startkosten |

---

## Strategisch voordeel

Eerste pilotpartner is **i4 Housing** (Molenplein 2, Wassenaar — NVM, sterk op de
expat-markt rond Den Haag). VestaAI wordt in eerste instantie voor hen gebouwd: hun
huisstijl (blauw `#0089D0`, accent rood `#C81E46`) is de eerste white-label-implementatie.
Dit elimineert de koude acquisitie-fase en biedt:
- Gratis testomgeving en directe productfeedback
- Eerste referentieklant met testimonial
- Directe entree tot het NVM-netwerk
