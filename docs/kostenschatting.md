# VestaAI — Kostenschatting

> Doel: inzicht in de variabele API-kosten per pand en de infrastructuurkosten bij het
> huidige gebruik door i4housing, de enige klant.
> Gaat over kosten die VestaAI zelf maakt, niet over wat klanten betalen — zie `goals.md` § Prijzen.
> Tarieven zijn indicatief en gebaseerd op prijzen medio 2026. Controleer actuele tarieven vóór financiële beslissingen.

---

## Wat is een "volledige run"?

Eén volledige run = alles wat VestaAI kan doen voor één pand:

1. **Hoofdgeneratie** — 17 content-types via Claude Sonnet 4.6
2. **Virtual staging × 10** — Gemini genereert een gestylede kamer per lege kamerfoto
3. **Document-assistent** — 1 PDF uploaden + 5 vragen stellen via Claude (juridische documenten)
4. **Prijswijziging** — 1 extra Claude-call voor VERKOCHT of PRIJSREDUCTIE social content

Niet meegenomen als "basisrun" (incidenteel gebruik):
- Per-veld herschrijven (~€0,01 per rewrite)
- Wijk-SEO-tekst (~€0,01 per tekst)

---

## Kostensplit per feature

### Tarieven Claude Sonnet 4.6 (Anthropic)
| | Prijs |
|---|---|
| Input tokens | $3,00 per 1M |
| Output tokens | $15,00 per 1M |

### Tarieven Gemini 2.0 Flash (Google)
| | Prijs |
|---|---|
| Nu (`gemini-2.0-flash-exp`) | **Gratis** — experimenteel model, geen productietarief |
| Straks (verwacht na productierelease) | ~$0,04 per gegenereerde afbeelding (referentie: Imagen 3-tarief) |

---

### 1. Hoofdgeneratie (17 content-types)

| | Tokens | Kosten |
|---|---|---|
| Input (systeem + user) | ~2.000 | $0,006 |
| Output (alle 17 velden) | ~8.000 | $0,120 |
| **Subtotaal** | | **~€0,12** |

**Toelichting output:** funda_tekst (750 woorden), brochure_kort/lang, 3× Instagram, 2× LinkedIn, koper_email, buurtomschrijving, open_huis, 2× bezichtiging-followup, video_script, energie_advies, kopersvragen_faq, marktanalyse.

⚠️ De CLAUDE.md noemde nog €0,08 per content-set — dat was vóór energie_advies, kopersvragen_faq en marktanalyse werden toegevoegd. De actuele schatting is **€0,12**.

Pro/Kantoor-klanten sturen ook huisstijl-voorbeeldteksten mee: +~1.000 input tokens = extra ~€0,003. Verwaarloosbaar.

---

### 2. Virtual staging × 10 (Gemini 2.0 Flash)

| | Nu | Na productierelease |
|---|---|---|
| Per staging | €0,00 (gratis) | ~€0,04 |
| **10 stagings** | **€0,00** | **~€0,37** |

**Let op:** `gemini-2.0-flash-exp` is een experimenteel model. Google geeft geen garantie op beschikbaarheid of gratis gebruik. Reken hier niet op voor de lange termijn.

---

### 3. Document-assistent (1 PDF + 5 vragen)

De code gebruikt de Anthropic Files API: PDF wordt éénmalig geüpload en opgeslagen bij Anthropic. Bij elke vraag stuurt de app de `file_id` mee — maar de PDF-tokens worden wél per call in rekening gebracht.

| | Tokens | Kosten |
|---|---|---|
| Input per vraag (PDF ~5.000 tk + systeem + vraag) | ~5.300 | $0,016 |
| Output per vraag | ~500 | $0,008 |
| **5 vragen totaal** | 26.500 in / 2.500 out | **~€0,11** |

⚠️ De document-assistent is de duurste feature per sessie. Bij intensief gebruik (meerdere sessies per dag per klant) kunnen deze kosten snel oplopen. Overweeg rate-limiting of een sessielimiet per maand.

---

### 4. Prijswijziging (VERKOCHT / PRIJSREDUCTIE)

| | Tokens | Kosten |
|---|---|---|
| Input | ~300 | $0,001 |
| Output (3 social posts) | ~600 | $0,009 |
| **Subtotaal** | | **~€0,01** |

---

## Totaal per pand

| Feature | Kosten nu | Kosten na Gemini-betaling |
|---------|-----------|--------------------------|
| Hoofdgeneratie (Claude) | €0,12 | €0,12 |
| Virtual staging × 10 (Gemini) | **€0,00** | **€0,37** |
| Document-assistent (1 PDF + 5 vragen) | €0,11 | €0,11 |
| Prijswijziging (Claude) | €0,01 | €0,01 |
| **TOTAAL** | **~€0,24** | **~€0,61** |

> **Vuistregel:** zonder staging ~€0,24/pand; met staging (betaald) ~€0,61/pand.

---

## Infrastructuurkosten bij het huidige gebruik (i4housing, enige klant)

> Abonnementsprijzen zijn op 15 sep 2026 uit het product gehaald (zie `goals.md` § Prijzen) —
> deze sectie gaat dus alleen nog over de kale infra-/API-kosten, niet over marge of omzet.
> **Open actiepunt:** het werkelijke aantal objecten/maand dat i4housing verwerkt is nog niet
> bekend — de aanname hieronder is bewust laag en voorzichtig, geen gemeten getal. Bijwerken
> zodra er een paar weken echt gebruik is geweest.

### Variabele kosten (API)

Aanname (voorlopig, niet gemeten): i4housing × ~15 objecten/mo = **15 runs/mo**

| Scenario | Kosten/run | Totaal/mo |
|----------|-----------|-----------|
| Nu (Gemini gratis) | €0,24 | **~€4/mo** |
| Na Gemini-betaling (alle objecten gestaged) | €0,61 | ~€9/mo |

Op deze schaal is de variabele API-kost verwaarloosbaar t.o.v. de vaste infra-kosten
hieronder — geen reden om hier nu op te sturen.

### Vaste infra-kosten

| Service | Plan | Kosten/mo | Noodzakelijk? |
|---------|------|-----------|---------------|
| **Vercel** | Pro | $20 (~€18) | **JA — verplicht, klantaantal-onafhankelijk.** De virtual staging route heeft `maxDuration = 120s`; Hobby-plan heeft max 60s. Dit blokkeert de feature ook bij één klant. |
| **Supabase** | Free of Pro | €0 of $25 (~€23) | Bij één kantoor is Free tier technisch ruim voldoende (500MB database, 1GB storage). Pro is vooral zinvol vanwege Point-in-Time Recovery en het uitblijven van sleep-mode — bij één actieve productieklant is dat de moeite waard, maar geen harde eis meer zoals bij 100 klanten. |
| **Resend** | Free | €0 | Ruim voldoende bij één kantoor (limiet 3.000 e-mails/mo). |
| **Plausible** | Starter | $9 (~€8) | Optioneel. Verifieer welk plan nu actief is. |

**Vaste infra totaal: ~€18–41/mo**, afhankelijk van de Supabase-plankeuze.

### Totale kostenstructuur (huidig, i4housing)

| Post | /mo |
|------|-----|
| Variabele API-kosten (Gemini gratis) | ~€4 |
| Vaste infra | €18–41 |
| **Totale kosten** | **~€22–45/mo** |

Geen omzet-/margeberekening — er is geen betalende klant.

---

## Waar credits storten?

### Nu al betaald

| Waar | Voor wat | Actie |
|------|----------|-------|
| **Anthropic (console.anthropic.com)** | Alle Claude-calls: hoofdgeneratie, document-assistent, prijswijziging, herschrijven | Credits storten of maandelijkse automatische afschrijving instellen. **Dit is de grootste kostenpost.** |

### Nu gratis → straks betaald

| Service | Situatie | Wanneer actie? |
|---------|----------|----------------|
| **Google AI Studio (aistudio.google.com)** | `gemini-2.0-flash-exp` is gratis experimental. Zodra Google dit model productief maakt, gaan er kosten aan zitten (~€0,04/afbeelding). | Monitor Google's aankondigingen. Overweeg de model-naam in `/api/fotos/staging/route.ts` bij te werken naar `gemini-2.0-flash` zodra het betaalde tarief bekend is, en een Google Cloud Billing-account te activeren. |
| **Supabase Free → Pro** | Technisch nu gratis genoeg, maar Free draait periodiek in sleep-mode: slecht voor productie. | Upgraden naar Pro ($25/mo) vóór eerste betalende klant. |
| **Resend Free → Pro** | Gratis tot 3.000 e-mails/mo | Upgraden bij ~250+ klanten ($20/mo). |
| **Vercel Hobby → Pro** | De staging route vereist >60s timeout; dit werkt nu al niet op Hobby. | **Direct upgraden naar Pro ($20/mo)** als virtual staging actief wordt. |

### Gratis en blijft gratis

| Service | Waarom gratis? |
|---------|---------------|
| **BAG API (PDOK)** | Nationaal Georegister, open data, geen gebruikslimiet voor normaal gebruik |
| **Sharp** (foto-correcties) | Open-source npm-library, draait lokaal op Vercel — geen externe API |
| **Anthropic Files API** (document storage) | Geen opslagkosten; tokens worden bij gebruik verrekend |

---

## Aanbevelingen

1. **Vercel Pro nu activeren.** Virtual staging heeft 120s timeout nodig. Dit is een harde vereiste zodra de feature live gaat.

2. **Anthropic-budget instellen.** Zet een maandelijks spending limit in de Anthropic console (bijv. $100/mo om te beginnen) zodat je geen verrassingen krijgt bij onverwacht gebruik.

3. **Document-assistent monitoren.** Eén actieve klant die dagelijks 10+ vragen stelt kost al €0,22/dag = €6,60/mo extra. Overweeg een sessielimiet (bijv. 10 vragen/dag per kantoor) of toon de klant hoeveel sessies hij heeft gebruikt.

4. **Gemini-model pinnen.** De code gebruikt `gemini-2.0-flash-exp` — een experimenteel model dat zonder waarschuwing kan worden aangepast of afgeschaald. Houd een oog op de Google AI release notes en plan een switch naar het stabiele model.

5. **Prompt caching overwegen.** Zodra het platform groeit, kan Anthropic's prompt caching (beschikbaar via `cache_control`) de kosten voor de document-assistent met 70–90% verlagen (hergebruik van gecachede PDF-tokens). Nu nog niet geïmplementeerd in de code.
