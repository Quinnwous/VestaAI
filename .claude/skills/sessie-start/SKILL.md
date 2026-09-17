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
   - `docs/roadmap.md` § 3 Architectuurbesluiten — bindend voor elk item;
     lees in elk geval de subsectie die het volgende item raakt (3.1 data,
     3.2 dossier/content, 3.3 waardering, 3.4 content, 3.5 kaart, 3.6 AI,
     3.7 URL-state/primitives).
   - Het fase-blok in § 5 dat bij "huidige fase" hoort — het volgende item
     heeft daar zijn spec (*Doel · Raakt · Hergebruik · Spec · Tests · Klaar
     als*). De checkboxen laten zien wat al af is.
   - `docs/besluiten.md` — alleen de bovenste datum-sectie, tenzij Quinns
     vraag over een ouder besluit lijkt te gaan.
   - § 8 Acties Quinn — check of een eerder genoemde blokkade inmiddels is
     opgelost (exports binnen? verwerkersovereenkomst getekend? Vercel Pro?).
3. **Vat samen in maximaal 8 regels** aan Quinn: fase, laatst opgeleverd,
   voorgestelde volgende stap, en eventuele blokkades die die stap
   tegenhouden. Geen herhaling van het hele plan.
4. **Stel vragen (AskUserQuestion) alleen als het volgende item niet
   eenduidig is**, bijvoorbeeld:
   - een blokkade uit § 8 staat nog open en het volgende item hangt ervan af;
   - er is sinds de laatste sessie iets veranderd dat niet in de roadmap
     staat (exports binnen, voorbeeld aangeleverd);
   - Quinn noemt een taak die niet één-op-één in een bestaand item past.
   Is Quinn er niet (autonome sessie), kies dan zelf, noteer de keuze in
   `docs/besluiten.md` en werk door — blokkeer alleen bij iets onomkeerbaars
   (migratie of bulk-update op echte data, verwijderen).
5. **Mini-plan, dan bouwen.** Schrijf ≤10 regels in de chat: bestanden,
   volgorde, welke bestaande functies je hergebruikt, welke tests je eerst
   schrijft. Plan mode is alleen nodig bij items gemarkeerd *(ontwerpkeuze)*.
   Rekenlogica eerst als pure functie in `lib/` mét vitest-test, dan de UI.

## Wat dit NIET is

Geen samenvatting van het hele plan en geen herontwerp van het item: de spec
in de roadmap is leidend. Botsen spec en code, dan wint de code-realiteit —
noteer de afwijking in § 📍 Stand van zaken en ga verder.
