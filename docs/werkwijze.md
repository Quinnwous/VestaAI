# VestaAI — Werkwijze

> Hoe we bouwen, controleren en opleveren. De korte versie van deze regels
> staat in `CLAUDE.md` (die laadt elke sessie); dit is de volledige.
> Tot 30 sep 2026 stond dit in roadmap § 4 en § 11.

---

## 1. Waar staat wat

| Document | Inhoud | Wanneer bijwerken |
|---|---|---|
| `docs/roadmap.md` | **alleen open werk** + stand van zaken + acties Quinn | elke sessie |
| `docs/productoverzicht.md` | **wat er staat**, per module | zodra iets af is |
| `docs/architectuur.md` | hoe het gebouwd is, bindende technische regels | bij een structurele wijziging |
| `docs/besluiten.md` | logboek van besluiten en opleveringen, nieuwste bovenaan | elke sessie |
| `CLAUDE.md` | regels en valkuilen die elke sessie nodig heeft | bij een nieuwe les |
| `docs/README.md` | wegwijzer door alle docs | bij een nieuw document |

**Een item is af →** uit de roadmap halen (niet afvinken en laten staan),
beschrijven in het productoverzicht, een regel in het besluitenlogboek. Een
nieuw idee → roadmap § Backlog, nooit het lopende item in.

**Agent-opdrachten** schrijf je naar de scratchpad, niet naar `docs/`. Is een
spec het bewaren waard (ontwerpkeuzes die in de code terugkomen), dan na
afloop naar `docs/archief/specs/`.

## 2. Sessieritme

1. `/sessie-start` — leest de stand van zaken in de roadmap en vat samen in
   ≤ 8 regels.
2. Neem het volgende item. Mini-plan (≤ 10 regels) in de chat: bestanden,
   volgorde, tests, wat je hergebruikt. Plan mode alleen bij items gemarkeerd
   *(ontwerpkeuze)*.
3. Bouwen: rekenlogica eerst als pure functie in `lib/` mét vitest-test, dan de
   UI.
4. Definition of Done (§ 4).
5. `/sessie-afronden` — DoD, docs, commit, push, PR, merge, deploy-check.

## 3. Parallel met agents

De hoofdsessie regisseert; Sonnet-subagents bouwen elk één roadmap-item.

- **Keuze op nul bestandsoverlap.** Elke agent een eigen worktree
  (`isolation: worktree`), eigen dev-poort (31xx), `node_modules` als symlink.
- **Opdracht als bestand:** schrijf de spec naar de scratchpad en geef de agent
  één regel: "Lees de opdracht in <absoluut pad> en voer die uit". Een lange
  prompt laat de auto-mode-classifier time-outen (de agent start dan niet).
- **Worktrees vertakken van `origin/main`**, niet van de featurebranch: een
  spec of contract dat alleen op de featurebranch staat, ziet de agent niet.
  Verwacht add/add-conflicten op gedeelde bestanden bij het mergen.
- Agents **committen na elke deelstap**, schrijven migraties maar passen ze niet
  toe, en raken `docs/roadmap.md`/`docs/besluiten.md` niet aan.
- In een worktree ontbreken `.env.local` en echte `node_modules`: `npm run build`
  (Turbopack) faalt daar — agents bouwen met `ANALYZE=true npm run build`
  (webpack). `dod:screens`, de echte build en `maplibreWorker.guard.test.ts`
  draait de hoofdsessie na de merge.
- **Gestopt op de gebruikslimiet** en Quinn zegt "ga door": hervat élke
  onderbroken agent via SendMessage (zelfde agent, zelfde worktree) en maak de
  ronde af. Uitzondering: stopte een agent vóór zijn eerste wijziging, dan is
  zijn worktree al opgeruimd — start hem dan opnieuw met dezelfde opdracht.

## 4. Definition of Done (elk item)

- `npm run typecheck && npm run lint && npm run test && npm run build` groen;
  lint = 0 problemen.
- GitHub Actions (`.github/workflows/ci.yml`) draait typecheck/lint/test
  automatisch op elke pull request en elke push naar `main` (geen secrets,
  geen build — die heeft productie-env-vars nodig). Dit vervangt geen lokale
  DoD-run; het is het laatste net voordat iets naar `main` gaat.
- Huisstijl-hook schoon: `var(--merk*)` (tekst in merkkleur via
  `var(--merk-tekst)`), "je/jouw", geen "VestaAI" achter de login, geen groene
  grijzen, geen `var(--merk…, #hex)`-fallbacks. Checklist:
  `.claude/skills/kantoorhuisstijl/SKILL.md`.
- `npm run dod:screens` groen: huisstijlcheck, screenshots op 390/1280/1920 px,
  axe (`serious`/`critical` = fout), linkcheck en toetsenbordronde. De
  screenshots in `screenshots/` beoordeeld tegen `docs/ontwerp/principes.md`;
  op 390 px breekt niets.
- **Elke geraakte route écht bekeken**: geen foutstaat, geen
  Next-error-overlay. Een check die "schoon" meldt op een gecrashte pagina telt
  niet.
- Lege, laad- en foutstaat aanwezig; skeletons, geen spinners; geen
  console-errors; elke statistiek toont n en "data t/m".
- `transacties` alleen via `lib/transactiesQuery.ts` (guard-test groen).
- Hero-schermen: `ontwerpreview` AKKOORD (architectuur § 8).
- Nieuwe tabel → RLS per kantoor, via een migratie met `apply_migration`; nieuwe
  view → `security_invoker = true`.
- Docs bijgewerkt volgens § 1.

## 5. Vangrails productiedatabase

Er is één database (productie) en geen Supabase Pro, dus geen herstelpunten.

- **Back-up** (`node --env-file=.env.local scripts/backup-data.mjs`) vóór elke
  migratie, import, bulk-update of opruimactie.
- Scripts zijn standaard dry-run; `--write` expliciet. Seed- en opruimscripts
  raken alleen kantoren met `instellingen_json.demo === true` (afgedwongen met
  een test). Imports hebben een `import_id` en zijn terug te draaien.
- Migraties via `apply_migration` (nooit DDL via `execute_sql`, anders raakt de
  migratiehistorie los van de database), en alleen na akkoord van Quinn als ze
  echte data raken. Daarna `scripts/controleer-schema.mjs`.
- **Eén database, twee codeversies:** productie draait de code van `main`. Een
  migratie die iets weghaalt of hernoemt breekt de live site zolang `main` nog
  oude code heeft. Brekende migraties dus pas samen met de merge van de code die
  erbij hoort, of eerst additief (kolom erbij, code over, later droppen).
  Additieve migraties mogen tussendoor.
- `.env.local` wijst naar productie: ook `npm run dev`, e2e en de DoD-scripts
  praten met de echte database (lezend, of alleen in het demo-kantoor).

### Herstelprocedure

- **Back-up bevat:** alle bedrijfstabellen (`scripts/backup-data.mjs` §
  `TABELLEN`) als JSON, Storage (alle buckets, tenzij `--zonder-storage`) onder
  `storage/<bucket>/<pad>`, en `manifest.json` (tijdstip, per tabel het
  aantal rijen, per bucket aantal bestanden/bytes).
- **Niet in de back-up: `auth.users`** (Supabase Auth, geen `public`-tabel).
  Bij een volledig herstel (lege database) moeten de accounts eerst opnieuw
  via de Supabase Auth Admin API of het dashboard worden aangemaakt — met
  dezelfde `id`'s als in `makelaars.json`, anders faalt de foreign key
  `makelaars.id → auth.users.id`.
- **Controleer eerst het manifest** (`backups/<tijdstip>/manifest.json`):
  `volledig: true` en per tabel `klopt: true`, vóór je iets terugzet.
- **Eén tabel herstellen:** lees `<tabel>.json`, upsert per batch van ~500
  rijen via de service-client (zelfde patroon als `maakUpsertBatches()` in
  `lib/importPijplijn.ts` — nooit kale upserts, die wissen aanvulbare velden).
- **Alles herstellen, in FK-volgorde:** `kantoren` → `makelaars` (ná de
  bijbehorende auth-gebruikers) → `imports` → `objecten` → `transacties` →
  `object_documenten`/`object_fotos`/`stijl_bewerkingen`/`gebruik_events`
  (hangen af van `objecten`, onderling geen volgorde-eis).
- **Storage herstellen:** upload elk bestand onder `storage/<bucket>/<pad>`
  terug naar diezelfde bucket/pad (`supabase.storage.from(bucket).upload(pad, …)`).
- Draai na een herstel `node --env-file=.env.local scripts/controleer-schema.mjs`
  — een herstel naar een oudere back-up kan een kolom missen die een latere
  migratie toevoegde.

## 6. Git en live

- Tijdens een ronde alleen lokaal committen, op een featurebranch
  (`feat/…` — de vooraf toegestane push-permissie geldt voor `feat/*`).
- **Einde van elke ronde, automatisch** (besluit Quinn 17 en 26 sep, geldt tot
  hij anders zegt): DoD nalopen, docs bijwerken, committen, featurebranch
  pushen, PR naar `main` maken en mergen, en controleren dat de Vercel-deploy
  READY is zonder runtime-errors. Daarna pas de ronde melden.
- Commitberichten in het Nederlands.
- Mergen met `gh pr merge <nr> --merge --delete-branch`: GitHub haalt de
  gemergde branch sinds 1 okt 2026 zelf weg (repo-instelling), `--delete-branch`
  ruimt ook de lokale branch op en zet je terug op `main`.
- **Doorlopende rondes:** is een ronde live, start dan meteen de volgende uit de
  roadmap (nul bestandsoverlap, met agents). Alleen stoppen bij iets
  onomkeerbaars (migratie op echte data, verwijderen van data, betaalde
  API-rondes) of als er geen bouwbaar item meer is zonder input van Quinn — dat
  dan in één bericht melden.

## 7. Permanente kwaliteit

- Geen modelstring buiten `lib/aiModellen.ts`, geen Claude-call buiten
  `lib/claude.ts`.
- Elke statistiek toont n en "data t/m"; te weinig data → waarschuwing, geen
  schijnzeker getal.
- Elk nieuw scherm werkt op 390 px; Lighthouse publiek > 90.
- Geen zelfgebouwde interactieprimitive waar Radix hem levert; geen grafiek met
  library-defaults; geen hero-scherm zonder prototype en `ontwerpreview`.
- Een externe bron die faalt, meldt dat — nooit stil "geen resultaat".
- Een migratie toegepast → ook de commentaren in code en migratiebestand
  bijwerken ("nog niet toegepast"-notities verouderen snel).

## 8. Periodiek onderhoud (± maandelijks, of vóór een mijlpaal)

- `npx knip` — ongebruikte bestanden, exports en dependencies (scripts en e2e
  als entry meegeven, anders volgen er valse meldingen).
- `npm audit` (productie moet 0 blijven) en gericht updaten.
- Lokale branches die niet via `--delete-branch` zijn opgeruimd:
  `git branch --merged main` (GitHub doet dit sinds 1 okt zelf).
- `backups/` uitdunnen volgens het bewaarbeleid (roadmap).
- `docs/productoverzicht.md` naast de code leggen: klopt het nog?
