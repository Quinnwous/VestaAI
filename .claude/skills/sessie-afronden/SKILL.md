---
name: sessie-afronden
description: Einde van een VestaAI-werksessie. Loopt de Definition of Done na, werkt docs/roadmap.md (checkboxen, Stand van zaken) en docs/besluiten.md (opgeleverd, besluiten) bij, en committeert het werk. Gebruik dit wanneer Quinn aangeeft te stoppen, wanneer een fase-item af is, of vlak vóór een /clear.
---

# Sessie afronden

Doel: nooit een sessie eindigen waarbij het werk in de chat blijft hangen. Alles
wat telt (voortgang, besluiten, blokkades) moet in `docs/roadmap.md`,
`docs/besluiten.md` en git staan, zodat een volgende sessie — ook een andere
chat, ook na contextverlies — feilloos verder kan via `sessie-start`.

## Stappen

1. **Loop de Definition of Done na** (volledige versie: `docs/roadmap.md` § 4):
   - `npm run typecheck && npm run test && npm run build` groen.
   - Huisstijl-hook schoon (geen waarschuwingen van
     `.claude/hooks/huisstijl-check.sh` op de gewijzigde bestanden; geen
     `var(--merk…, #hex)`-fallbacks).
   - `npm run dod:screens` groen en de screenshots in `screenshots/`
     beoordeeld tegen `docs/ontwerpprincipes.md`. Elke geraakte route echt
     bekeken (open de png's): geen foutstaat, geen Next-error-overlay.
   - Lege/laad/foutstaat aanwezig waar relevant; geen console-errors; elke
     statistiek toont n en "data t/m".
   - `transacties` uitsluitend via `lib/transactiesQuery.ts` (guard-test
     groen, vanaf fase 2).
   - Elke nieuwe tabel met RLS per kantoor; elke nieuwe view met
     `security_invoker = true`.
   - Bij een schemawijziging: via `apply_migration` (Supabase-MCP), nooit los
     `execute_sql` voor DDL — anders raakt de migratiehistorie los van de
     werkelijke database (zie de aanleiding in
     `supabase/schema-baseline.sql`). Daarna `scripts/controleer-schema.mjs`.
2. **Commit + PR.** Featurebranch per fase, commitbericht in het Nederlands
   zoals de rest van de geschiedenis, PR naar `main`. Na de merge: deploy
   READY en geen runtime-errors (Vercel-MCP).
3. **Werk `docs/roadmap.md` bij:**
   - Vink afgeronde items af (`- [ ]` → `- [x]`) in het fase-blok. Is een
     hele fase af, klap hem in tot één regel met ✅ (zoals fase 0) en zet de
     details in `docs/besluiten.md` § Opgeleverd.
   - Werk § 📍 Stand van zaken bij: fase, laatst opgeleverd (dit item), het
     nieuwe volgende item, blokkades (verwijder wat is opgelost, voeg nieuwe
     toe), open vragen, en afwijkingen van de spec die je bent tegengekomen.
   - Nieuwe ideeën of uitgestelde deelklussen → § 9 Backlog, niet in het
     lopende item.
4. **Werk `docs/besluiten.md` bij:**
   - Voeg een regel toe aan § Opgeleverd: `- <datum> — <één-regel-omschrijving>`
     (nieuwste bovenaan).
   - Nieuwe besluiten tijdens deze sessie (ook keuzes die je zelf maakte omdat
     Quinn er niet was)? Voeg een datum-sectie toe bovenaan § Besluiten
     (tabel of opsomming, met "Door: Quinn / plan v2 / sessie").
5. **Nieuwe leerpunten over de codebase** (een valkuil, een patroon, een
   niet-vanzelfsprekende aanname) horen in `CLAUDE.md`, niet alleen in de
   chat — zie de kennisregel in de root-`CLAUDE.md` van de werkplaats.
6. **Bevestig aan Quinn** in een paar regels: wat is er gedaan, wat staat er
   nu in Opgeleverd, wat is het voorgestelde volgende item. Geen uitgebreid
   verslag — dat staat al in git en in de roadmap.
7. Pas hierna is `/clear` veilig.
