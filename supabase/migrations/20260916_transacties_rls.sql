-- RLS voor transacties (ontbrak in 20260916_transacties.sql). Gevonden bij het
-- controleren van de kantoorpagina: deze migratie — en alle andere van 16 sep —
-- bleek nooit op de database te zijn uitgevoerd (kolommen/tabel ontbraken).
--
-- Lees-toegang is bewust niet tot het eigen kantoor beperkt: de dataset is een
-- gedeelde referentiepool ("aangevuld met verkopen van andere kantoren voor een
-- grotere referentiebasis", zie CLAUDE.md § Transactiedataset) die marktanalyse
-- en waardering voeden. `eigen_verkoop`/`kantoor_id` bepalen alleen welke rijen
-- op de verkoopkaart een vlaggetje krijgen, niet wie mag lezen.
-- Schrijven gaat uitsluitend via de platform-admin met de service-role-key
-- (app/admin/transacties/actions.ts) — die omzeilt RLS toch al, dus er is geen
-- insert/update/delete-policy voor authenticated/anon nodig.
alter table transacties enable row level security;

create policy "Ingelogde makelaars lezen de transactiedataset"
  on transacties for select
  to authenticated
  using (exists (select 1 from makelaars where id = auth.uid()));
