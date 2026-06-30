-- Interne notitie per object (zichtbaar alleen voor de makelaar/kantoor, niet voor kopers)
alter table objecten
  add column if not exists notitie text;
