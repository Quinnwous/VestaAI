---
name: sessie-start
description: Begin van een VestaAI-werksessie. Leest de stand van zaken uit docs/roadmap.md, vat die kort samen, noemt blokkades, en stelt vragen totdat helder is wat het volgende item precies inhoudt. Gebruik dit aan het begin van elke sessie, of wanneer context is verloren (nieuwe chat, na /clear) en niet duidelijk is waar het project staat.
---

# Sessie starten

Doel: binnen één stap opnieuw volledig op de hoogte zijn van waar VestaAI staat,
zonder dat Quinn dat opnieuw moet uitleggen — zie CLAUDE.md § 🚦 Begin hier.

## Stappen

1. **Lees `docs/roadmap.md` § 📍 Stand van zaken.** Kritiek pad, de volgende
   ronde, wat op Quinn wacht, en de waarschuwingen. De roadmap bevat alléén
   open werk.
2. **Lees ook, kort:**
   - Het item zelf in `docs/roadmap.md` § 3 (spec: doel, wat het raakt,
     klaar-als).
   - `docs/architectuur.md` — de sectie die het item raakt (§ 1 datalagen,
     § 2 dossier/content, § 3 waardering, § 4 contentsjabloon, § 5 kaart,
     § 6 AI-modellen, § 7 URL-state/primitives, § 8 ontwerpspoor, § 9
     datamodel). Die regels zijn bindend.
   - `docs/productoverzicht.md` — het onderdeel dat je gaat raken, zodat je
     weet wat er al staat en niets dubbel bouwt.
   - `docs/besluiten.md` — alleen de bovenste datumsectie, tenzij Quinns vraag
     over een ouder besluit gaat.
   - `docs/roadmap.md` § 2 Wacht op Quinn — is een eerder genoemde blokkade
     inmiddels opgelost (exports binnen? voorbeeld aangeleverd? Vercel Pro?)
3. **Vat samen in maximaal 8 regels** aan Quinn: waar het project staat, wat
   laatst is opgeleverd, de voorgestelde volgende stap, en blokkades die die
   stap tegenhouden. Geen herhaling van het hele plan.
4. **Stel vragen (AskUserQuestion) alleen als het volgende item niet
   eenduidig is**, bijvoorbeeld:
   - een blokkade uit § 2 staat nog open en het volgende item hangt ervan af;
   - er is sinds de laatste sessie iets veranderd dat niet in de roadmap staat
     (exports binnen, voorbeeld aangeleverd);
   - Quinn noemt een taak die niet één-op-één in een bestaand item past.
   Is Quinn er niet (autonome sessie), kies dan zelf, noteer de keuze in
   `docs/besluiten.md` en werk door — blokkeer alleen bij iets onomkeerbaars
   (migratie of bulk-update op echte data, verwijderen, betaalde API-rondes).
5. **Mini-plan, dan bouwen.** Schrijf ≤ 10 regels in de chat: bestanden,
   volgorde, welke bestaande functies je hergebruikt, welke tests je eerst
   schrijft. Plan mode alleen bij items gemarkeerd *(ontwerpkeuze)*.
   Rekenlogica eerst als pure functie in `lib/` mét vitest-test, dan de UI.
   Meerdere items zonder bestandsoverlap → parallel met agents volgens
   `docs/werkwijze.md` § 3.

## Wat dit NIET is

Geen samenvatting van het hele plan en geen herontwerp van het item: de spec
in de roadmap is leidend. Botsen spec en code, dan wint de code-realiteit —
noteer de afwijking in § 📍 Stand van zaken en ga verder.
