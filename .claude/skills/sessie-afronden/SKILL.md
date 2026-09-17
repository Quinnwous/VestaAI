---
name: sessie-afronden
description: Einde van een VestaAI-werksessie. Loopt de Definition of Done na, werkt docs/roadmap.md bij (checkboxen, Stand van zaken, Opgeleverd, besluitenlogboek), en committeert het werk. Gebruik dit wanneer Quinn aangeeft te stoppen, wanneer een fase-item af is, of vlak vóór een /clear.
---

# Sessie afronden

Doel: nooit een sessie eindigen waarbij het werk in de chat blijft hangen. Alles
wat telt (voortgang, besluiten, blokkades) moet in `docs/roadmap.md` en git
staan, zodat een volgende sessie — ook een andere chat, ook na contextverlies
— feilloos verder kan via `sessie-start`.

## Stappen

1. **Loop de Definition of Done na** (volledige versie: `docs/roadmap.md` § 4):
   - `npm run typecheck && npm run test && npm run build` groen.
   - Huisstijl-hook schoon (geen waarschuwingen van
     `.claude/hooks/huisstijl-check.sh` op de gewijzigde bestanden).
   - Lege/laad/foutstaat aanwezig waar relevant; geen console-errors.
   - Elke nieuwe query op `transacties` gepagineerd/geaggregeerd — nooit een
     kale `select('*')`.
   - Elke nieuwe tabel met RLS per kantoor.
   - Bij een schemawijziging: via `apply_migration` (Supabase-MCP), nooit los
     `execute_sql` voor DDL — anders raakt de migratiehistorie los van de
     werkelijke database (zie de aanleiding in
     `supabase/schema-baseline.sql`).
2. **Commit + PR.** Featurebranch per fase, commitbericht in het Nederlands
   zoals de rest van de geschiedenis, PR naar `main`.
3. **Werk `docs/roadmap.md` bij:**
   - Vink afgeronde items af (`- [ ]` → `- [x]`) in het fase-blok.
   - Werk § 📍 Stand van zaken bij: fase, laatst opgeleverd (dit item), het
     nieuwe volgende item, blokkades (verwijder wat is opgelost, voeg nieuwe
     toe), open vragen.
   - Voeg een regel toe aan § Opgeleverd: `- <datum> — <één-regel-omschrijving>`.
   - Nieuwe besluiten tijdens deze sessie? Voeg een sectie toe aan § 3
     Besluitenlogboek (datum + tabel/opsomming, zoals de bestaande secties).
4. **Nieuwe leerpunten over de codebase** (een valkuil, een patroon, een
   niet-vanzelfsprekende aanname) horen in `CLAUDE.md`, niet alleen in de
   chat — zie de kennisregel in de root-`CLAUDE.md` van de werkplaats.
5. **Bevestig aan Quinn** in een paar regels: wat is er gedaan, wat staat er
   nu in Opgeleverd, wat is het voorgestelde volgende item. Geen uitgebreid
   verslag — dat staat al in git en in de roadmap.
6. Pas hierna is `/clear` veilig.
