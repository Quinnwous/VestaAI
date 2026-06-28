# /verbeter — AI Makelaar Verbeterproces

Voer een volledig 4-fasen verbeterproces uit op de AI Makelaar workflow.
Gebruik dit commando wanneer de gebruiker vraagt om de workflow, skills, tools of output te verbeteren.

Werk systematisch door alle 4 fasen heen. Sla geen fasen over. Gebruik subagents (Explore, Plan) voor parallel werk.

---

## FASE 1 — Audit: huidige staat in kaart brengen

Lees de volgende bestanden volledig en bouw een **kompakt overzicht**:

### Skills (gebruik Explore agent — parallel)
- Lees ALLE bestanden in `Skills/*/SKILL.md`
- Per skill noteer: naam, databron(nen), JSON output-sleutels, of data geverifieerd of indicatief is
- Identificeer: welke skills steunen op indicatieve data die eigenlijk geverifieerd kan worden?
- Identificeer: welke skills produceren overlappende output?
- Identificeer: ontbreken er logische skills voor een volledig verkoop/aankooponderzoek?

### Tools (lees direct)
- `Tools/config.py` — welke skills actief, in welke volgorde?
- `Tools/data_ophaler.py` — welke API's worden aangeroepen, wat retourneert `haal_alle_data()`?
- `Tools/workflow_runner.py` — hoe werkt de orchestratie (Stage 1 / Stage 2), hoe worden skills geladen?
- `Tools/cache_manager.py` — caching logica
- `Tools/pdf_generator.py` — PDF-generatie methode
- `Tools/telegram-bot.py` — Telegram interface

### Webapp (lees direct)
- `Tools/webapp/app.py` — routes, SSE-logica, upload-endpoint
- `Tools/webapp/templates/index.html` — dashboard UI
- `Tools/webapp/templates/nieuw.html` — nieuw dossier formulier
- `Tools/webapp/templates/dossier.html` — rapport viewer + voortgang
- `Tools/webapp/static/style.css` — design systeem

### Bestaande output
- Als er bestanden in `Dossiers/` staan: lees een `rapport.html` en een `dossier.json` om te zien hoe de output er werkelijk uitziet
- Noteer: sectie-indeling correct, SVG-grafieken aanwezig, statusmarkeringen correct (geen emoji)?

### Referentie
- `CLAUDE.md` — totaaloverzicht van het systeem

**Output fase 1:** Presenteer een overzichtstabel met:
1. Huidige sterktes
2. Gaten / ontbrekende functionaliteit
3. Skills met indicatieve data die geverifieerd kan worden
4. UI/UX verbeterpunten webapp

---

## FASE 2 — Online onderzoek

Gebruik WebSearch en WebFetch om actief te zoeken. Wees concreet — noteer gevonden bronnen met URL.

### A. NVM/makelaars back-office checklist
Zoek naar: wat moeten back-office medewerkers bij een makelaarskantoor onderzoeken vóór een woning in verkoop gaat?
- Welke documenten zijn verplicht voor Funda-publicatie?
- Welke onderzoeken zijn gebruikelijk of wettelijk vereist?
  - Asbestinventarisatie (woningen vóór 1994)
  - NEN 2580 meetcertificaat (verplicht bij verkoop)
  - Funderingsonderzoek (woningen vóór 1940, risicogebieden)
  - Bouwtechnische keuring
- Erfpacht-check (grondeigendom, canon, erfpachtcanon herziening)
- Inrit/uitweg: privaatrechtelijk of openbaar?
- Riolering: publiek of privaat/septic?
- Recente omgevingsvergunningen (verbouwhistorie — omgevingsloket.nl)
- Bijzondere lasten: lokale belastingen, rioolrecht, precariobelasting

Zoektermen (NL): "makelaar verkoop checklist", "NVM verkoopdossier verplichte documenten", "Funda publicatie vereisten", "back office makelaarskantoor onderzoek"

### B. Nieuwe Nederlandse databronnen/APIs
Zoek naar APIs die we nog NIET gebruiken:
- `omgevingsloket.nl` API — omgevingsvergunningen, bouwtekeningen
- `bodemloket.nl` API — bodemkwaliteit en saneringen
- `kadaster.nl` open data — eigendomshistorie, hypotheken, erfpacht
- `rvo.nl` subsidie-API — verduurzamingssubsidies (ISDE, SEEH, saldering)
- `nationaalgeodataportaal.nl` — andere PDOK datasets
- `cbs.nl` OData API — buurtstatistieken direct (i.p.v. indicatief)
- Funda API (indien beschikbaar voor makelaars)

Zoektermen: "Dutch real estate API", "PDOK API overzicht", "omgevingsloket API documentatie", "kadaster open data API"

### C. Relevante MCP servers
Zoek naar beschikbare MCP (Model Context Protocol) servers die nuttig kunnen zijn:
- Brave Search MCP (reeds geïnstalleerd?)
- Filesystem MCP
- Fetch/WebFetch MCP
- Andere relevante MCPs voor data-analyse of Nederlandse overheidsbronnen

Zoektermen: "MCP server real estate", "Model Context Protocol servers list", "MCP Dutch government data"

### D. Concurrentie en PropTech
Zoek naar vergelijkbare tools:
- Wat doen PropTech-bedrijven in NL? (Calcasa, Matrixian, Altum AI, Vastgoedjournaal.nl)
- Welke data leveren zij die wij niet hebben?
- Zijn er open standaarden voor vastgoeddata in NL?

Zoektermen: "PropTech Nederland makelaarsondersteuning", "Altum AI vastgoed API", "Calcasa API", "Matrixian vastgoed data"

### E. Rapport design / infographics
Zoek naar:
- State-of-the-art vastgoedrapport design (CBRE, Savills, JLL rapport voorbeelden)
- Welke infographic-typen zijn standaard in professionele vastgoedrapporten?
- Zijn er betere visualisaties dan lijndiagram WOZ-trend + radargrafiek buurt?

**Output fase 2:** Gestructureerde lijst van bevindingen per categorie A t/m E, met concrete URLs en aanbevelingen.

---

## FASE 3 — Verbeterplan opstellen

Op basis van fasen 1 en 2: stel een **concreet, geprioriteerd verbeterplan** op.

Gebruik EnterPlanMode om het plan vast te leggen. Het plan bevat:

### Structuur van het plan
Voor elke voorgestelde verbetering:
- **Wat:** Omschrijving van de wijziging
- **Waarom:** Welk gat of probleem lost dit op? (uit fase 1/2)
- **Impact:** Hoog / Middel / Laag (voor de makelaar)
- **Effort:** Klein (< 1u) / Middel (1-4u) / Groot (> 4u)
- **Hoe:** Welke bestanden worden gewijzigd? Welke API/databron?

### Categorieën
1. **Nieuwe skills** — naam, databron, JSON output-schema, prioriteit
2. **Bestaande skills uitbreiden** — welke skill, welke data erbij, hoe
3. **Nieuwe API-functies** in `data_ophaler.py` — endpoint, authenticatie, return-waarden
4. **Webapp verbeteringen** — routes, UI-elementen, nieuwe features
5. **MCP integraties** — welke MCP, waarvoor, hoe te installeren
6. **Rapport design** — sectiewijzigingen, nieuwe infographics, CSS-aanpassingen
7. **CLAUDE.md update** — documenteer alle wijzigingen aan het eind

Sorteer per categorie op impact × effort (hoog impact + laag effort = eerst).

Presenteer het plan aan de gebruiker en vraag goedkeuring via ExitPlanMode.

---

## FASE 4 — Verificatie

Na implementatie van de goedgekeurde verbeteringen, controleer **elke** wijziging:

### Checklist
- [ ] Staan alle nieuwe skills in `Tools/config.py` `ACTIVE_SKILLS`?
- [ ] Zijn vervallen skills nergens meer gerefereerd (config.py, workflow_runner.py)?
- [ ] Kan de webapp opstarten zonder errors: `python Tools/webapp/app.py`?
- [ ] Laden alle templates correct op `http://localhost:8000`?
- [ ] Zijn nieuwe SKILL.md bestanden geldig gestructureerd (YAML frontmatter + JSON output)?
- [ ] Produceert `haal_alle_data()` in `data_ophaler.py` de nieuwe velden?
- [ ] Is `CLAUDE.md` bijgewerkt met alle nieuwe skills, databronnen en wijzigingen?
- [ ] Zijn de 3 vervallen skills (energielabel-check, monumentstatus-check, nabijheid-voorzieningen) verwijderd of gearchiveerd?

### Test
Voer een korte end-to-end test uit:
```bash
python3 -c "
from Tools.data_ophaler import haal_alle_data
data = haal_alle_data('Keizersgracht 1, Amsterdam')
print('Velden:', list(data.keys()))
"
```

Rapporteer wat werkt, wat niet werkt, en wat nog aandacht nodig heeft.

---

## Notities voor uitvoering

- Wees concreet en actionable — geen vage aanbevelingen
- Prioriteer wat de makelaar direct waarde geeft
- Houd het kernprincipe: **feiten en geverifieerde data, geen subjectief advies**
- Update CLAUDE.md **altijd** als laatste stap na alle wijzigingen
- Als fase 2 niets relevants oplevert voor een subcategorie, noteer dat expliciet en ga door
