---
name: sessie-afronden
description: Einde van een VestaAI-werksessie. Loopt de Definition of Done na, haalt afgeronde items uit docs/roadmap.md, beschrijft ze in docs/productoverzicht.md, logt besluiten in docs/besluiten.md, en commit, pusht, merget en controleert de deploy. Gebruik dit wanneer Quinn aangeeft te stoppen, wanneer een ronde of item af is, of vlak vóór een /clear.
---

# Sessie afronden

Doel: nooit een sessie eindigen waarbij het werk in de chat blijft hangen. Alles
wat telt (voortgang, besluiten, blokkades) moet in de docs en in git staan,
zodat een volgende sessie — ook een andere chat, ook na contextverlies —
feilloos verder kan via `sessie-start`.

## Stappen

1. **Loop de Definition of Done na** (volledige versie: `docs/werkwijze.md` § 4):
   - `npm run typecheck && npm run lint && npm run test && npm run build` groen
     (lint = 0 problemen).
   - Huisstijl-hook schoon (geen waarschuwingen van
     `.claude/hooks/huisstijl-check.sh` op de gewijzigde bestanden; geen
     `var(--merk…, #hex)`-fallbacks).
   - `npm run dod:screens` groen en de screenshots in `screenshots/`
     beoordeeld tegen `docs/ontwerp/principes.md`. Elke geraakte route echt
     bekeken (open de png's): geen foutstaat, geen Next-error-overlay.
   - Lege/laad/foutstaat aanwezig waar relevant; geen console-errors; elke
     statistiek toont n en "data t/m".
   - `transacties` uitsluitend via `lib/transactiesQuery.ts` (guard-test groen).
   - Elke nieuwe tabel met RLS per kantoor; elke nieuwe view met
     `security_invoker = true`.
   - Bij een schemawijziging: via `apply_migration` (Supabase-MCP), nooit los
     `execute_sql` voor DDL. Daarna `scripts/controleer-schema.mjs`.
2. **Werk de docs bij** (regels: `docs/werkwijze.md` § 1):
   - **`docs/roadmap.md`:** haal afgeronde items **weg** (niet afvinken en
     laten staan). Werk § 📍 Stand van zaken bij: laatst opgeleverd, de
     volgende ronde, blokkades (opgeloste weg, nieuwe erbij) en afwijkingen van
     de spec. Nieuwe ideeën of uitgestelde deelklussen → § 5 Backlog.
   - **`docs/productoverzicht.md`:** beschrijf wat er nieuw staat of veranderd
     is in de sectie van dat onderdeel (wat het doet, waar het zit,
     beperkingen), werk de tabel "In één oogopslag" en de stand-datum bij.
   - **`docs/besluiten.md`:** voeg bovenaan een datumsectie toe
     (`### <datum> (ronde X) — <titel>`) met een tabel
     `Onderwerp | Besluit | Door` — opleveringen én besluiten, ook keuzes die je
     zelf maakte omdat Quinn er niet was.
   - **Structureel iets veranderd** (nieuwe tabel, nieuwe bron, andere
     datastroom)? → `docs/architectuur.md`.
   - **Nieuwe les** (een valkuil, een niet-vanzelfsprekende aanname) → kort in
     `CLAUDE.md` bij de valkuilen; de details horen in architectuur of
     werkwijze. Houd `CLAUDE.md` compact: hij laadt elke sessie.
3. **Commit, push, merge, live — in één keer, zonder opnieuw te vragen,
   automatisch aan het einde van elke ronde** (besluit Quinn 17 en 26 sep, zie
   CLAUDE.md). Commitbericht in het Nederlands. Push de featurebranch
   (`feat/…`), maak of werk de PR naar `main` bij, merge hem met
   `gh pr merge <nr> --merge --delete-branch` (GitHub verwijdert de branch daar
   ook zelf), en controleer daarna: deploy READY en geen runtime-errors (Vercel-MCP). Tijdens de sessie
   zelf niet tussendoor pushen. Uitzondering: een migratie die echte data raakt
   blijft akkoord-plichtig.
4. **Bevestig aan Quinn** in een paar regels: wat er gedaan is, wat nu live
   staat, wat de voorgestelde volgende ronde is. Geen uitgebreid verslag — dat
   staat al in git en in de docs.
5. Pas hierna is `/clear` veilig.
