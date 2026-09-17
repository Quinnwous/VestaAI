-- Item 3.4 (docs/roadmap.md § Fase 3): de dossierheader toont "X dagen in
-- <fase>" naast de fasestepper. Daarvoor moet elk dossier onthouden sinds
-- wanneer het in de huidige fase zit. Volledig additief — geen kolom weg,
-- niets hernoemd (zie CLAUDE.md ⚠️ "Eén database, twee codeversies") — mag
-- dus los van een codepush toegepast worden.
--
-- Bestaande rijen hebben geen historie van hun laatste faseovergang, dus
-- `fase_sinds = created_at` is de beste beschikbare benadering (een dossier
-- staat sinds z'n aanmaak minstens in zijn huidige fase). Nieuwe
-- faseovergangen zetten `fase_sinds = now()` expliciet in `setObjectFase`
-- (app/(app)/object/[id]/actions.ts).

alter table objecten
  add column if not exists fase_sinds timestamptz not null default now();

comment on column objecten.fase_sinds is
  'Tijdstip van de laatste faseovergang (Verkoopadvies/In verkoop/Verkocht) — voedt "X dagen in <fase>" in DossierHeader.tsx (item 3.4). Bij aanmaak default now(); setObjectFase zet hem opnieuw bij een echte overgang.';

-- Alle bestaande rijen kregen net de default (now()) — die overschrijven we
-- meteen met hun eigen created_at, de beste beschikbare benadering.
update objecten
  set fase_sinds = created_at;
