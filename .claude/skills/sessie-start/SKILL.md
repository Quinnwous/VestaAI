---
name: sessie-start
description: Begin van een VestaAI-werksessie. Leest de stand van zaken uit docs/roadmap.md, vat die kort samen, noemt blokkades, en stelt vragen totdat helder is wat het volgende item precies inhoudt. Gebruik dit aan het begin van elke sessie, of wanneer context is verloren (nieuwe chat, na /clear) en niet duidelijk is waar het project staat.
---

# Sessie starten

Doel: binnen één stap opnieuw volledig op de hoogte zijn van waar VestaAI staat,
zonder dat Quinn dat opnieuw moet uitleggen — zie CLAUDE.md § 🚦 Begin hier bij
elke sessie.

## Stappen

1. **Lees `docs/roadmap.md` § 📍 Stand van zaken.** Dat blok bevat: huidige
   fase, laatst opgeleverde item, het geplande volgende item, openstaande
   blokkades en open vragen.
2. **Lees ook, kort:**
   - § 3 Besluitenlogboek — alleen de meest recente datum-sectie, tenzij de
     vraag van Quinn over een ouder besluit lijkt te gaan.
   - Het fase-blok in § 6 dat bij "huidige fase" hoort — de checkboxen
     (`- [ ]` / `- [x]`) laten precies zien wat al af is binnen die fase.
   - § 8 Blokkades & acties Quinn — check of een eerder genoemde blokkade
     inmiddels is opgelost (bijvoorbeeld: is de Supabase-MCP nu wel
     geautoriseerd? Zijn de exports binnen?).
3. **Vat samen in maximaal 8 regels** aan Quinn: fase, laatst opgeleverd,
   voorgestelde volgende stap, en eventuele blokkades die zijn stap
   tegenhouden. Geen uitgebreide herhaling van het hele plan — dat staat al
   in `docs/roadmap.md`.
4. **Stel vragen (AskUserQuestion) totdat het volgende item eenduidig is**,
   vooral als:
   - een blokkade uit § 8 nog openstaat en het volgende item daarvan afhangt;
   - er sinds de laatste sessie iets is veranderd dat niet in de roadmap
     staat (bijvoorbeeld: exports zijn binnengekomen, een voorbeeld is
     aangeleverd);
   - Quinn een taak noemt die niet één-op-één in een bestaand fase-item past.
5. **Ga pas bouwen zodra dit helder is.** Bij twijfel: liever een vraag te
   veel dan een verkeerde aanname (zie CLAUDE.md § Werkstijl in de root
   `CLAUDE.md` van de werkplaats).

## Wat dit NIET is

Dit is geen vervanging van plan mode. Voor een nieuw substantieel item geldt
nog steeds: `/model opusplan` → plan mode → `AskUserQuestion` bij
onduidelijkheden → `ExitPlanMode` → uitvoering op Sonnet. Sessie-start gaat
vooraf daaraan: het zorgt dat de juiste vraag gesteld wordt, niet dat het
antwoord al vaststaat.
