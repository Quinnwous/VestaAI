# VestaAI — Kostenschatting

> Doel: inzicht in de variabele kosten per pand, de break-even per plan en de infrastructuurkosten bij 100 klanten.
> Prijzen zijn indicatief en gebaseerd op tarieven medio 2026. Controleer actuele tarieven vóór financiële beslissingen.

---

## Wat is een "volledige run"?

Eén volledige run = alles wat VestaAI kan doen voor één pand:

1. **Hoofdgeneratie** — 17 content-types via Claude Sonnet 4.6
2. **Foto-analyse × 10** — Claude Vision beoordeelt elke foto (kwaliteitscore + Funda-geschiktheid); Sharp past correcties lokaal toe (gratis)
3. **Virtual staging × 10** — Gemini genereert een gestylede kamer per lege kamerfoto
4. **Document-assistent** — 1 PDF uploaden + 5 vragen stellen via Claude (juridische documenten)
5. **Prijswijziging** — 1 extra Claude-call voor VERKOCHT of PRIJSREDUCTIE social content

Niet meegenomen als "basisrun" (incidenteel gebruik):
- Per-veld herschrijven (~€0,01 per rewrite)
- Wijk-SEO-tekst (~€0,01 per tekst)
- Chatbot (bezoekers op externe makelaarsite — kosten afhankelijk van bezoekersvolume)

---

## Kostensplit per feature

### Tarieven Claude Sonnet 4.6 (Anthropic)
| | Prijs |
|---|---|
| Input tokens | $3,00 per 1M |
| Output tokens | $15,00 per 1M |
| Image input (Vision) | $3,00 per 1M tokens (~1.500–2.500 tk per foto, afhankelijk van resolutie) |

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

### 2. Foto-analyse × 10 (Claude Vision — Sonnet 4.6)

| | Per foto | × 10 foto's |
|---|---|---|
| Input (afbeelding + systeem + tekst) | ~2.350 tk → $0,007 | |
| Output (JSON analyse + aanbevelingen) | ~400 tk → $0,006 | |
| **Per foto** | **~€0,012** | |
| **Subtotaal 10 foto's** | | **~€0,12** |

Sharp (lokale bildverwerking, correcties toepassen) kost niks — draait op Vercel zonder externe API.

---

### 3. Virtual staging × 10 (Gemini 2.0 Flash)

| | Nu | Na productierelease |
|---|---|---|
| Per staging | €0,00 (gratis) | ~€0,04 |
| **10 stagings** | **€0,00** | **~€0,37** |

**Let op:** `gemini-2.0-flash-exp` is een experimenteel model. Google geeft geen garantie op beschikbaarheid of gratis gebruik. Reken hier niet op voor de lange termijn.

---

### 4. Document-assistent (1 PDF + 5 vragen)

De code gebruikt de Anthropic Files API: PDF wordt éénmalig geüpload en opgeslagen bij Anthropic. Bij elke vraag stuurt de app de `file_id` mee — maar de PDF-tokens worden wél per call in rekening gebracht.

| | Tokens | Kosten |
|---|---|---|
| Input per vraag (PDF ~5.000 tk + systeem + vraag) | ~5.300 | $0,016 |
| Output per vraag | ~500 | $0,008 |
| **5 vragen totaal** | 26.500 in / 2.500 out | **~€0,11** |

⚠️ De document-assistent is de duurste feature per sessie. Bij intensief gebruik (meerdere sessies per dag per klant) kunnen deze kosten snel oplopen. Overweeg rate-limiting of een sessielimiet per maand.

---

### 5. Prijswijziging (VERKOCHT / PRIJSREDUCTIE)

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
| Foto-analyse × 10 (Claude Vision) | €0,12 | €0,12 |
| Virtual staging × 10 (Gemini) | **€0,00** | **€0,37** |
| Document-assistent (1 PDF + 5 vragen) | €0,11 | €0,11 |
| Prijswijziging (Claude) | €0,01 | €0,01 |
| **TOTAAL** | **~€0,36** | **~€0,73** |

> **Vuistregel:** zonder staging ~€0,35/pand; met staging (betaald) ~€0,75/pand.

---

## Break-even per plan

Aanname: gemiddeld 20 objecten per kantoor per maand (mix van Starter-max en Pro-gemiddeld).

| Plan | Prijs/mo | Objecten/mo | API-kosten (nu) | Brutowinst |
|------|----------|-------------|-----------------|------------|
| Starter | €60 | 40 | 40 × €0,36 = €14 | **€46 (77%)** |
| Pro | €150 | ~20 | 20 × €0,36 = €7 | **€143 (95%)** |
| Kantoor | €500 | ~30 | 30 × €0,36 = €11 | **€489 (98%)** |

Break-even op API-kosten alleen: **1 klant betaalt 40× genereren voor €14** — tegenover €60 abonnement. Marge is comfortabel, zelfs bij Gemini-betaling.

---

## Infrastructuurkosten bij 100 klanten

### Variabele kosten (API)

Aanname: 100 kantoren × gem. 20 objecten/mo = **2.000 runs/mo**

| Scenario | Kosten/run | Totaal/mo |
|----------|-----------|-----------|
| Nu (Gemini gratis) | €0,36 | **€720/mo** |
| Na Gemini-betaling (alle objecten gestaged) | €0,73 | €1.460/mo |
| Realistisch (50% gebruikt staging) | ~€0,55 | **€1.090/mo** |

### Vaste infra-kosten

| Service | Plan | Kosten/mo | Noodzakelijk? |
|---------|------|-----------|---------------|
| **Vercel** | Pro | $20 (~€18) | **JA — verplicht.** De virtual staging route heeft `maxDuration = 120s`; Hobby-plan heeft max 60s. Dit blokkeert de feature nu al. |
| **Supabase** | Pro | $25 (~€23) | Aanbevolen. Free tier is technisch genoeg voor 100 klanten (500MB database, 1GB storage — alles past ruim), maar Pro geeft Point-in-Time Recovery, geen sleep-mode en SLA. |
| **Resend** | Free | €0 | Voldoende voor 100 klanten (~500 e-mails/mo, limiet is 3.000/mo). Pro ($20) nodig bij 300+ klanten. |
| **Plausible** | Starter | $9 (~€8) | Optioneel. Verifieer welk plan nu actief is. |
| **Stripe** | — | transactiekosten | 1,4% + €0,25 per betaling (EU-kaarten). Bij 100 klanten gem. €150/mo: **~€235/mo**. Geen API-credits storten — Stripe int dit automatisch. |

**Vaste infra totaal: ~€49/mo** (excl. Stripe-transactiekosten)

### Totale kostenstructuur bij 100 klanten

| Post | /mo |
|------|-----|
| Variabele API-kosten (Gemini gratis) | €720 |
| Vaste infra | €49 |
| Stripe transactiekosten | €235 |
| **Totale kosten** | **€1.004/mo** |

Verwachte omzet bij 100 klanten (indicatief: 60 Starter + 30 Pro + 10 Kantoor):

| | MRR |
|---|---|
| 60 × €60 | €3.600 |
| 30 × €150 | €4.500 |
| 10 × €500 | €5.000 |
| **Totaal** | **€13.100/mo** |

**Nettomarge: ~92%** (veronderstelt dat Gemini gratis blijft)

---

## Waar credits storten?

### Nu al betaald

| Waar | Voor wat | Actie |
|------|----------|-------|
| **Anthropic (console.anthropic.com)** | Alle Claude-calls: hoofdgeneratie, foto-analyse, document-assistent, prijswijziging, herschrijven | Credits storten of maandelijkse automatische afschrijving instellen. **Dit is de grootste kostenpost.** |

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
