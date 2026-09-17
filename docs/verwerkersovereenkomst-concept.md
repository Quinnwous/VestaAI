# Concept-verwerkersovereenkomst VestaAI ↔ i4housing

> ⚠️ **Dit is een werkconcept, geen juridisch document.** Geschreven als
> startpunt voor een gesprek met i4housing, niet om zonder toetsing te
> ondertekenen. **Laat dit door een jurist (of een gespecialiseerde
> AVG-dienst) beoordelen vóórdat het getekend wordt** — zie
> `docs/roadmap.md` § 8, blokkade "verwerkersovereenkomst". Dit document
> bevat bewust geen paragraafnummering of juridisch bindende taal; dat hoort
> in de definitieve versie thuis.

## Waarom dit nodig is

i4housing levert VestaAI (Quinn/VestaAI B.V. i.o.) hun volledige Brainbay- en
Realworks-transactie-export aan: adressen, verkoopprijzen, verkoopdata en
kenmerken van verkochte woningen. Adressen gecombineerd met verkoopprijzen
zijn persoonsgegevens (herleidbaar tot de (voormalige) eigenaar van een
woning) in de zin van de AVG. i4housing is hier de **verwerkingsverantwoordelijke**
(zij bepalen doel en middelen — het is hun klantrelatie en hun data), VestaAI
is de **verwerker** (wij verwerken de data in opdracht, voor waardering,
marktanalyse en concurrentieanalyse binnen het platform).

Zonder een verwerkersovereenkomst is deze import niet AVG-conform, ongeacht
hoe goed de techniek (RLS, encryptie, back-ups) is ingericht.

## Onderwerpen die de overeenkomst moet dekken

1. **Wat wordt verwerkt**
   - Transactiedata: adres, postcode, plaats, wijk/buurt, verkoopprijs,
     vraagprijs, verkoopdatum, looptijd, woningkenmerken (type, oppervlak,
     bouwjaar, energielabel, kamers, garage, tuin), en (indien aangeleverd)
     coördinaten en verkopend kantoor.
   - Geen NAW-gegevens van kopers/verkopers zelf — alleen woning- en
     transactiekenmerken. Als de export toch namen/contactgegevens bevat,
     expliciet afspreken dat die vóór import verwijderd worden.

2. **Doel van de verwerking**
   - Woningwaardering (vergelijkbare-verkopen-methode) voor i4housing's eigen
     dossiers.
   - Marktanalyse en concurrentieanalyse binnen i4housing's eigen platform-
     omgeving.
   - Geen ander gebruik: geen doorverkoop, geen gebruik voor andere klanten,
     geen training van modellen die buiten i4housing's omgeving gebruikt
     worden (zie § Isolatie hieronder — dit is technisch afgedwongen, niet
     alleen contractueel).

3. **Bewaartermijn**
   - Zolang i4housing klant is, plus een redelijke overgangstermijn na
     beëindiging (bijvoorbeeld 30 dagen) om data te kunnen exporteren.
   - Op verzoek van i4housing: verwijdering binnen een afgesproken termijn.

4. **Sub-verwerkers**
   - Supabase (database + hosting, EU-regio `eu-central-1`, Frankfurt).
   - Vercel (hosting van de applicatie).
   - Anthropic (Claude API — alleen voor contentgeneratie op basis van
     invoertekst van de makelaar, niet voor de transactiedataset zelf).
   - Resend (transactionele e-mail — geen transactiedata hierin).
   - PDOK/Kadaster (adresverrijking — alleen adresopzoeking, geen
     verkoopprijzen worden hiernaartoe gestuurd).

5. **Beveiligingsmaatregelen** (concreet te noemen, niet alleen "passende
   maatregelen")
   - Row Level Security per kantoor op alle transactie- en dossiertabellen
     (zie `docs/besluiten.md`, sectie 17 sep 2026 / fase 0.3 — data van i4housing
     is niet zichtbaar voor andere kantoren in het systeem, ook niet voor het
     interne testkantoor).
   - Toegang tot de productiedatabase beperkt tot de platform-admin
     (service-role-key, nooit gedeeld).
   - Back-ups vóór elke risicovolle wijziging (`scripts/backup-data.mjs`).
   - HTTPS/TLS voor alle verbindingen; Supabase- en Vercel-infrastructuur
     zelf voldoet aan hun eigen (SOC 2 / ISO 27001-achtige) certificeringen
     — te verifiëren en te verwijzen naar hun eigen verwerkersovereenkomsten
     (Supabase en Vercel hebben zelf een DPA die VestaAI als hun klant kan
     accepteren).

6. **Datalek-protocol**
   - Meldplicht aan i4housing binnen 48 uur na ontdekking van een mogelijk
     datalek dat hun gegevens raakt, zodat zij op tijd bij de Autoriteit
     Persoonsgegevens kunnen melden (wettelijke 72-uurstermijn).

7. **Rechten van i4housing als verantwoordelijke**
   - Recht op inzage in hoe de data verwerkt wordt.
   - Recht om een audit uit te (laten) voeren.
   - Recht op teruggave/verwijdering van hun data bij beëindiging.

8. **Isolatie van de data — de technische garantie achter dit contract**
   Dit is geen juridische clausule maar de technische onderbouwing die het
   contract geloofwaardig maakt: VestaAI is een multi-tenant platform
   (`kantoren`/`makelaars` in Supabase), maar elke kantoor-rij is strikt
   afgeschermd via Row Level Security. i4housing's transactiedata is dus
   nooit zichtbaar voor een ander kantoor — ook niet voor het synthetische
   demo-kantoor dat gebruikt wordt om functies te bouwen en te testen (zie
   `docs/roadmap.md` fase 0.3 en fase 4.9).

## Wat NOG moet gebeuren voordat dit een echt contract is

- [ ] Juridische toetsing (jurist of gespecialiseerde AVG-dienst).
- [ ] Vaststellen: is i4housing zelf al AVG-verwerkingsverantwoordelijke
      richting hún klanten (verkopers) voor deze data, of moet dat ook nog
      belegd worden?
- [ ] Navragen bij i4housing of de Brainbay-licentie (NVM) toestaat dat hun
      data in een extern platform (VestaAI) wordt geladen — een licentievraag,
      los van de AVG-verwerkersovereenkomst (zie `docs/roadmap.md` § 8).
- [ ] Ondertekening door beide partijen vóór de import van de volledige
      exports (fase 4.8).
