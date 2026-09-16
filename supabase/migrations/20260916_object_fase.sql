-- Fases van een woningdossier (besluit 16 sep 2026, zie CLAUDE.md § Hoofdstructuur):
-- Acquisitie -> In verkoop -> Verkocht. Bepaalt welke modules zichtbaar zijn in
-- components/ObjectWorkspace.tsx. Bestaande dossiers hebben allemaal al
-- gegenereerde content en gaan dus met terugwerkende kracht naar 'in_verkoop' —
-- alleen nieuw aangemaakte dossiers starten voortaan in 'acquisitie'.
alter table objecten
  add column if not exists fase text not null default 'acquisitie'
    check (fase in ('acquisitie', 'in_verkoop', 'verkocht'));

alter table objecten
  add column if not exists pitch_uitslag text
    check (pitch_uitslag in ('open', 'gewonnen', 'verloren'));

update objecten set fase = 'in_verkoop' where fase = 'acquisitie';
