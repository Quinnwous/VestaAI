# VestaAI — Doelen & Strategie

> Dit document is het kompas voor alle product- en businessbeslissingen.

---

## Wat we bouwen

> **Koerswijziging 15 september 2026.** VestaAI was een AI-contentplatform. Het wordt een
> multi-featureplatform voor makelaars: content blijft, maar is nu één onderdeel naast
> Woningwaardering en Marktinzichten (Marktanalyse + Concurrentieanalyse). Gebouwd in eerste
> instantie specifiek voor één klant.

**VestaAI is het platform voor Nederlandse makelaars — in hun eigen huisstijl — dat de hele
weg van eerste contact tot verkoopklaar dossier ondersteunt: content, waardering en
marktinzicht in één omgeving.**

De woning is de kern. Per adres bouwt de makelaar een dossier op: content (Funda-tekst,
brochures, virtual staging, documentenassistent), een onderbouwde waardebepaling met
vergelijkbare verkopen en scenario's, en — los van één woning — marktanalyse en
concurrentieanalyse op de regio.

**Het probleem dat we oplossen:** een makelaar wint of verliest een opdracht op het moment
van de waardebepaling, en verkoopt daarna met content die vaak generiek en tijdrovend is.
Beide momenten gebeuren vandaag met onderbuikgevoel, een sjabloon en handwerk. VestaAI
onderbouwt de waarde met data en scenario's, en versnelt de content die daarna volgt — in
één omgeving, in de huisstijl van het kantoor.

**De belofte:**
1. *Waarde met onderbouwing* — een bandbreedte, gedragen door echte referentietransacties, niet door een black box.
2. *Scenario's* — wat doet een label-sprong, een extra kamer, een garage of een aanbouw met de waarde?
3. *Snellere, betere content* — Funda-teksten, brochures, social en virtual staging in minuten in plaats van uren.
4. *Marktinzicht* — prijsontwikkeling, doorlooptijd en de eigen positie t.o.v. concurrenten in de regio.
5. *Het is hun platform* — vanaf het inloggen draagt de omgeving het logo en de kleuren van het kantoor, tot in elk rapport.

---

## Voor wie & wat dit nu is

**i4housing is momenteel de enige klant, en het product wordt op dit moment specifiek voor
hen gebouwd — niet als "eerste pilot van velen", maar als de daadwerkelijke scope.** Er is
geen actief verkoopdoel, geen wervingsplan en geen prijsmodel. Toegang is puur
admin-beheerd (zie § Prijzen).

Dat betekent niet dat de deur voorgoed dicht is: het datamodel is al multi-tenant
(`kantoren`/`makelaars` in Supabase) en het white-label-systeem (`lib/branding.ts`) werkt
per kantoor. Als er ooit voor gekozen wordt om VestaAI aan andere kantoren aan te bieden,
hoeft de architectuur daar niet voor op de schop. Maar dat is een bewuste, latere beslissing
— geen doel dat nu meestuurt in prioritering of features.

---

## Bedieningsmodel: concierge, niet alleen self-service

**Bewuste keuze (15 sep 2026):** i4housing gebruikt de app zelf voor alle functies, maar het
databeheer en maatwerk erachter loopt via Quinn als VestaAI-admin, niet self-service door
het kantoor. Concreet: Quinn importeert en ververst periodiek de Realworks- en
Brainbay-data, kan kantoor-specifieke data direct aanpassen, en voert handwerk uit op
aanvraag (bv. een artist impression of een bewerkte virtual-staging-foto) dat i4housing
binnen de app kan aanvragen en waarvan het resultaat terugkomt in hun dossier.

**Waarom dit bewust zo is:** het is tegelijk een echt voordeel voor i4housing (zij hoeven
geen data-import of technisch werk te doen) én een bewuste manier om onmisbaar te blijven
in de relatie — zij hebben Quinn nodig, niet alleen de software.

**Het compromis, expliciet benoemd:** dit model schaalt niet vanzelf. Bij één klant is
handmatig databeheer en maatwerk goed te doen; bij meerdere kantoren (mocht dat ooit een
doel worden, zie § Voor wie & wat dit nu is) wordt Quinn zelf de bottleneck tenzij delen
van dit werk alsnog geautomatiseerd of self-service gemaakt worden. Voor nu, met één klant,
is dat geen probleem — maar het is geen architectuur die "vanzelf" opschaalt, en moet niet
als zodanig worden aangenomen bij latere beslissingen.

---

## Prijzen

> **Volledig verwijderd op 15 sep 2026** (op verzoek van Quinn — "kom ik later op terug").
> Geen abonnementen, geen Stripe, geen plan-gating meer in de code (`lib/plans.ts`, alle
> Stripe-routes en de bijbehorende UI zijn verwijderd — zie `CLAUDE.md`). Toegang is nu puur
> admin-beheerd: de platform-admin zet een kantoor en de bijbehorende accounts klaar in
> `/admin`, zonder plan of proefperiode. Een prijsmodel is nu niet aan de orde — dit
> document bevat bewust geen cijfers zolang er maar één (niet-betalende) klant is.

---

## Risico's

| Risico | Ernst | Mitigatie |
|--------|-------|-----------|
| **Kenmerk-effecten minder robuust op kleine dataset** | Medium | De waardering leunt op i4housing's eigen Realworks-verkoophistorie, niet op een landelijke dataset. Minder vergelijkingsmateriaal betekent dat "wat doet een extra kamer/energielabel" statistisch minder hard onderbouwd is. Rapport en UI moeten dit als indicatie presenteren, niet als harde wetmatigheid; bij twijfel liever een bredere bandbreedte tonen dan een schijnzekere puntschatting. |
| Waarderingsclaim (aansprakelijkheid) | Medium | De uitkomst is een onderbouwde indicatie, geen taxatie in de zin van het NRVT. Rapport en UI moeten dat expliciet benoemen. |
| Claude API afhankelijkheid | Medium | Model-agnostische architectuur; kan switchen. |
| AI-transparantieverplichting (EU AI Act) | Laag–Medium | AI-content-labeling zit al in virtual staging; uitbreiden naar het waarderingsrapport zodra dat live gaat. |
| Draagvlak bij i4housing | Medium | Eén klant betekent geen buffer als het product niet aanslaat. Kort-cyclisch testen en feedback ophalen in plaats van in één keer breed op te leveren. |
| Tech risico | Laag | Bewezen API-architectuur, geen custom ML. |

---

## Strategisch voordeel van i4housing als eerste klant

i4housing (Molenplein 2, Wassenaar — NVM, sterk op de expat-markt rond Den Haag) is niet
zomaar een testklant: hun huisstijl (blauw `#0089D0`, accent rood `#C81E46`) is de eerste
white-label-implementatie, en hun eigen Realworks-verkoopdata wordt de referentiedataset
voor de waardering. Dat geeft:
- Een echte, gebruikte omgeving in plaats van een demo — directe productfeedback.
- Een concrete dataset om het waarderingsmodel op te bouwen en te toetsen.
- Als het werkt: een eerste referentieklant met testimonial, mocht bredere verkoop ooit
  alsnog een doel worden.
