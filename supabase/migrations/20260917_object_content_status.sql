-- Item 3.1 (docs/roadmap.md § 3.2 "Dossier los van content"): een dossier
-- wordt aangemaakt zonder Claude (`POST /api/object`); content komt pas op
-- knopdruk of bij de fase-overgang naar In verkoop (`POST /api/generate`,
-- nu "genereer voor dossier-id"). Deze migratie is volledig additief — geen
-- kolom weg, niets hernoemd (zie CLAUDE.md ⚠️ "Eén database, twee
-- codeversies") — en mag dus los van een codepush toegepast worden.
--
-- `outputs_json` blijft NOT NULL (geen aparte nullable-migratie nodig): een
-- net aangemaakt dossier zonder content krijgt een lege, geldige
-- ContentOutput-structuur (lib/schemas.ts LEEG_CONTENT_OUTPUT) in plaats van
-- null. Nullable maken zou ObjectWorkspace/ResultTabs/PDF- en export-routes
-- overal een null-check moeten laten doen voor iets dat zelden voorkomt (een
-- dossier zonder content) — dat raakt aanzienlijk meer bestanden dan een
-- lege-waarde-object, voor hetzelfde resultaat.

alter table objecten
  add column if not exists content_status text not null default 'geen'
    check (content_status = any (array['geen', 'bezig', 'klaar', 'fout'])),
  add column if not exists content_gegenereerd_op timestamptz,
  add column if not exists content_bezig_sinds timestamptz;

comment on column objecten.content_status is
  'geen | bezig | klaar | fout — status van de contentgeneratie (item 3.1). "bezig" is een lock met verlooptijd (6 min, zie lib/contentGeneratie.ts CONTENT_LOCK_VERLOOP_MS) tegen dubbele Claude-generaties.';
comment on column objecten.content_gegenereerd_op is
  'Tijdstip waarop de laatste (succesvolle) contentgeneratie klaar was.';
comment on column objecten.content_bezig_sinds is
  'Tijdstip waarop de huidige "bezig"-lock is geclaimd — een lock ouder dan 6 minuten telt als verlopen en mag opnieuw geclaimd worden.';

-- Bestaande dossiers hebben hun content al (de oude synchrone pijplijn
-- genereerde bij het aanmaken) — die tellen met terugwerkende kracht als
-- 'klaar' zodat de Teksten-tab niet ineens een lege staat toont.
update objecten
  set content_status = 'klaar'
  where content_status = 'geen'
    and outputs_json is not null
    and outputs_json::text <> '{}';
