-- Breid de status-opties uit met 'onder_bod' en 'verkocht'
alter table objecten
  drop constraint if exists objecten_status_check;

alter table objecten
  add constraint objecten_status_check
  check (status in ('draft', 'published', 'onder_bod', 'verkocht'));
