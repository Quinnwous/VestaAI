# VestaAI — Roadmap

Bij twijfel over product of prioriteiten: `VestaAI.html` raadplegen.
Tactische taken: verwijder ze zodra ze klaar zijn. De strategische secties bovenaan blijven staan — die zijn het kompas.

---

## Visie

VestaAI is de AI-assistent voor het makelaarskantoor — niet alleen content, maar het hele plaatje. Content-generatie is het instapproduct omdat het direct waarde levert en makkelijk te verkopen is. Maar VestaAI groeit naar een volledig platform: marktonderzoek, Kadaster-data, meerdere databronnen, en een document-chatbot waarmee makelaars vragen kunnen stellen over VVE-notulen, leveringsaktes en koopaktes. Uiteindelijk is VestaAI de AI-laag achter een makelaarskantoor.

**Exitstrategie:** acquisitie in ~5 jaar (2031), realistisch €1–20M. Potentiële kopers: Funda, Realworks, NVM-gelieerde SaaS, PropTech PE-funds, grote makelaarsketens. Wat ons aantrekkelijk maakt: gebruikersbasis NL/BE + begin Europa, stabiele MRR, data-assets, en een AI-platform dat moeilijk zelf te bouwen is.

---

## Groeifases (overzicht)

| Fase | Periode | Kern |
|------|---------|------|
| 0 — Fundament | nu → Q3 2026 | MVP bouwen + UX professioneel |
| 1 — Gratis beta | Q3/Q4 2026 | 10–20 makelaars testen, feedback verzamelen |
| 2 — Eerste betalende klanten | Q4 2026 – Q1 2027 | €1.000–3.000 MRR, product-market fit bewijzen |
| 3 — Groei NL/BE | 2027 | 100+ klanten, €10K MRR, dominantie NL/BE |
| 4 — Full-stack + Europa | 2028 | Document-chatbot, Kadaster, Europa-pilot |
| 5 — Schaling & exit-ready | 2029–2031 | 500–1.500 klanten, M&A-gesprekken |

---

## Constante aandachtsgebieden

**UX/UI:** Vóór elke fase-overgang een designreview. Na iedere 25 nieuwe klanten: gebruiksdata analyseren en pijn-punten verhelpen. Standaard: professioneel, minimalistisch, geen template-gevoel.

**Marketing:** Fase 1–2: 2× per week op LinkedIn (AI + makelaars, concrete resultaten). Fase 3+: contentkalender, casestudies met klanttoestemming, thought leadership.

**Financieel dashboard (bijhouden vanaf dag 1):** MRR · churn · CAC (kosten per nieuwe klant) · LTV · API-kosten per gegenereerd object → margin per plan bewaken.

**Tech-debt:** Na iedere commerciële groeifase een tech-debt sprint. Geen rotzooi meenemen naar Europa.

---

## Fase 0 — Fundament ← nu bezig

**Klaar als:** MVP draait end-to-end, UX voelt professioneel, geen fatale bugs.

### Wacht op Quinn (externe setup)

- `ANTHROPIC_API_KEY` invullen in `.env.local` en happy-path testen op `localhost:3000`
- Supabase-project aanmaken op supabase.com → SQL uit `supabase/migrations/001_initial.sql` uitvoeren
- `.env.local` aanvullen met alle keys (zie `.env.example`)
- Test: magic link ontvangen in echte mailbox, sessie bewaard na refresh
- Stripe-dashboard: Solo (€79/mo) en Kantoor (€149/mo) producten aanmaken → prijs-IDs invullen in `.env.local`
- Lokaal testen met `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Supabase Storage-bucket aanmaken (`kantoor-assets`, publiek leesbaar)
- Testen: zelfde object met en zonder huisstijl → zichtbaar verschil

### Nog te bouwen (code)

- Trial-waarschuwingsmail 3 dagen voor afloop (vereist Supabase Edge Function of cron-job)
- Sentry integreren voor error tracking

---

## Fase 1 — Gratis beta

**Klaar als:** ≥5 makelaars gebruiken het actief, NPS ≥30, top-3 verbeterpunten zijn helder.

### Acquisitie

- Lijst maken: welke makelaars ken ik persoonlijk of via via?
- Ieder persoonlijk benaderen: "Ik bouw een tool, wil je gratis testen en eerlijke feedback geven?"
- Drempel nul: geen credit card, gewoon toegang — maximaal 15 gratis objecten per beta-gebruiker (API-kosten begrenzen)

### Feedback-structuur

- In-app survey na 1e gebruik: NPS (0–10) + één open vraag ("Wat mis je het meest?")
- Na 2 weken: 30 min videocall met 3–5 actieve gebruikers
- Bijhouden: welke content-types worden meest gebruikt, waar haken mensen af, wat missen ze

### UX/UI

- Beta-gebruikers observeren zonder uitleg — kijken waar ze vastlopen
- Pijn-punten direct oplossen vóór betalende fase

---

## Fase 2 — Eerste betalende klanten

**Klaar als:** ≥15 betalende klanten, churn <10%/maand, MRR ≥€1.500.

### Acquisitie & conversie

- Beta-gebruikers persoonlijk bellen: "Ik ga het betaald maken — wil jij als eerste instappen?"
- Warme referrals vragen bij tevreden beta-klanten
- LinkedIn-posts starten: 2× per week, AI + makelaars, concrete voorbeelden en resultaten

### Pricing-validatie

- Luisteren naar bezwaren op €79/€149 — aanpassen als er een patroon is
- Jaarbetaling aanbieden met ~15% korting → betere cashflow en lagere churn

### Technisch

- Sentry error tracking live
- Response-caching actief (API-kosten drukken)
- Multi-user invite flow stabiel voor Kantoor-plan

### Financieel checkpoint

- Break-even op API-kosten: ~10–15 Solo-klanten
- Doel: positieve cashflow voor einde Q1 2027

---

## Fase 3 — Groei NL/BE (2027)

**Klaar als:** 100+ actieve klanten, churn <5%/maand, MRR ≥€10K, duidelijke differentiatie t.o.v. concurrenten.

### Acquisitie

- Referral-mechanisme in product: uitnodigen = maand gratis
- Kantoor-deals actief pushen: één kantoor = €149/mo, betere unit economics
- Franchise-plan activeren voor grotere netwerken
- Content marketing op volle kracht: LinkedIn + eventueel Instagram (makelaars zitten daar ook)

### Product

- BAG-koppeling: bouwjaar + m² automatisch ophalen (`docs/fase2/bag-data.md`)
- WOZ-vergelijking (`docs/fase2/woz-vergelijking.md`)
- CBS-buurtstatistieken (`docs/fase2/buurtanalyse-cbs.md`)
- Voorzieningen via OpenStreetMap (`docs/fase2/overpass-voorzieningen.md`)
- Historische waardeontwikkeling (`docs/fase2/historisch-waarde.md`)
- Marktdynamiek per object (`docs/fase2/marktdynamiek.md`)
- Few-shot learning via klant-voorbeeldteksten (uitbreiden)

### UX/UI

- Na 50 klanten: serieuze UX-audit op basis van gebruiksdata (Hotjar of vergelijkbaar)
- Onboarding-flow meten en aanscherpen: sign-up → eerste gegenereerde tekst <5 minuten

### Partnerships verkennen

- NVM/VBO: gesprek of officiële partner-status of aanmelding mogelijk is
- Makelaarskantoren met meerdere vestigingen: enterprise deal structureren

---

## Fase 4 — Full-stack + Europese voorbereiding (2028)

**Klaar als:** Stabiel platform, Europa-pilot live met ≥10 betalende klanten, duidelijke roadmap naar €100K ARR.

### Product — volledige AI-assistent

- **Document-chatbot:** makelaar uploadt VVE-notulen, leveringsakte of koopakte → kan vragen stellen via chat ("Zijn er achterstallige bijdragen?", "Wat is de ontbindingstermijn?")
- **Marktonderzoek per object:** vergelijkbare transacties, prijstrends, buurtanalyse automatisch gegenereerd
- **Kadaster-integratie:** eigendomshistorie, hypotheken, erfpacht automatisch ophalen
- **CRM-light:** objectbeheer + klantcontact vanuit VestaAI
- **Exportintegraties:** Funda XML, Realworks

### Europese voorbereiding

- i18n-framework in codebase inbouwen
- Marktonderzoek: Duitsland (groot, gefragmenteerd) vs. Spanje (hoog transactievolume)?
- Pilot 1 extra markt: eigen taal, lokale content-normen, lokale databronaansluiting
- Gesprekken met lokale brancheorganisaties of resellers

### Financieel checkpoint

- MRR-doel: €25–50K (NL/BE + Europa-begin)
- Overweeg eerste medewerker of vaste freelance developer

---

## Fase 5 — Schaling & exit-ready (2029–2031)

**Klaar als:** Term sheet van serieuze partij ontvangen, of bewuste beslissing om door te groeien.

### Schaling

- 500–1.500 klanten in NL/BE + 1–2 Europese markten
- MRR €50–150K
- Klein maar slagvaardig team (2–5 mensen)

### Exit-voorbereiding

- Financiën: clean P&L, geen spaghetti-contracten, GAAP-vriendelijke rapportage
- IP: domeinen, merknaam, codebase volledig gedocumenteerd
- Data-assets: geanonimiseerde gebruiksdata en benchmarks (dit is waarde voor een koper)
- Geen sleutelpersoon-risico: kennis van het platform moet overdraagbaar zijn

### Actief contact

- Netwerk opbouwen met potentiële kopers en PropTech PE-funds — niet wachten tot iemand aanklopt
- Zichtbaar zijn op de juiste plekken (PropTech-conferenties, branche-events)
- Bij serieuze gesprekken: M&A-adviseur inschakelen
