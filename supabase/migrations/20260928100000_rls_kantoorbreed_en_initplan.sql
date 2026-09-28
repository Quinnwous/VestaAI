-- RLS: één rol per kantoor ook bij schrijven + initplan-fix + FK-indexen
-- (28 sep 2026, besluit Quinn: "geen probleem als ze elkaars dossiers kunnen
-- aanpassen" — zie docs/besluiten.md).
--
-- 1. objecten: UPDATE/DELETE waren alleen toegestaan voor de eigenaar
--    (makelaar_id = auth.uid()) of de vervallen kantoor-admin-rol
--    (is_kantoor_admin()). setObjectFase/setObjectStatus/deleteObject
--    (app/(app)/object/[id]/actions.ts) schrijven via de sessie-client, dus
--    bij een collega raakten ze stil 0 rijen. Nu kantoorbreed, net als SELECT.
-- 2. Security-advisor "auth_rls_initplan": auth.uid()/my_kantoor_id() in een
--    policy wordt per rij opnieuw uitgerekend; als (select …) één keer per
--    query. Semantisch gelijk: my_kantoor_id() = "select kantoor_id from
--    makelaars where id = auth.uid()" (security definer), precies wat de
--    subqueries op transacties/imports/object_documenten al deden.
-- 3. Zes foreign keys zonder index (advisor "unindexed_foreign_keys").
--
-- Raakt geen data en haalt niets weg wat de code gebruikt: additief qua
-- rechten (alleen verruimd binnen het eigen kantoor), dus los van een
-- codepush toe te passen. Legacy-tabellen (post_planning, chatbot_*) bewust
-- niet — die verdwijnen met de opruimmigratie.

-- ── objecten ────────────────────────────────────────────────────────────────
drop policy if exists "admin mag kantoor-objecten verwijderen" on public.objecten;
drop policy if exists "admin mag kantoor-objecten wijzigen" on public.objecten;
drop policy if exists "makelaar mag eigen object verwijderen" on public.objecten;
drop policy if exists "makelaar mag eigen object wijzigen" on public.objecten;
drop policy if exists "makelaar mag object aanmaken" on public.objecten;
drop policy if exists "makelaar ziet kantoor-objecten" on public.objecten;

create policy "makelaar ziet kantoor-objecten" on public.objecten
  for select to authenticated
  using (kantoor_id = (select public.my_kantoor_id()));

create policy "makelaar mag object aanmaken" on public.objecten
  for insert to authenticated
  with check (makelaar_id = (select auth.uid()));

create policy "makelaar wijzigt kantoor-objecten" on public.objecten
  for update to authenticated
  using (kantoor_id = (select public.my_kantoor_id()))
  with check (kantoor_id = (select public.my_kantoor_id()));

create policy "makelaar verwijdert kantoor-objecten" on public.objecten
  for delete to authenticated
  using (kantoor_id = (select public.my_kantoor_id()));

-- ── transacties / imports ───────────────────────────────────────────────────
drop policy if exists "makelaar leest eigen kantoor-transacties" on public.transacties;
create policy "makelaar leest eigen kantoor-transacties" on public.transacties
  for select to authenticated
  using (kantoor_id = (select public.my_kantoor_id()));

drop policy if exists "makelaar leest eigen kantoor-imports" on public.imports;
create policy "makelaar leest eigen kantoor-imports" on public.imports
  for select to authenticated
  using (kantoor_id = (select public.my_kantoor_id()));

-- ── makelaars (twee permissive SELECT-policies samengevoegd) ───────────────
drop policy if exists "makelaar ziet zichzelf" on public.makelaars;
drop policy if exists "makelaar ziet kantoorgenoten" on public.makelaars;
create policy "makelaar ziet zichzelf en kantoorgenoten" on public.makelaars
  for select to authenticated
  using (id = (select auth.uid()) or kantoor_id = (select public.my_kantoor_id()));

-- ── object_documenten ───────────────────────────────────────────────────────
drop policy if exists "makelaar mag document toevoegen" on public.object_documenten;
drop policy if exists "makelaar mag eigen document verwijderen" on public.object_documenten;
drop policy if exists "makelaar ziet kantoor-documenten" on public.object_documenten;

create policy "makelaar ziet kantoor-documenten" on public.object_documenten
  for select to authenticated
  using (kantoor_id = (select public.my_kantoor_id()));
create policy "makelaar mag document toevoegen" on public.object_documenten
  for insert to authenticated
  with check (kantoor_id = (select public.my_kantoor_id()));
create policy "makelaar mag kantoor-document verwijderen" on public.object_documenten
  for delete to authenticated
  using (kantoor_id = (select public.my_kantoor_id()));

-- ── gebruik_events ──────────────────────────────────────────────────────────
drop policy if exists "makelaar leest events van eigen kantoor" on public.gebruik_events;
drop policy if exists "makelaar logt alleen eigen events" on public.gebruik_events;
create policy "makelaar leest events van eigen kantoor" on public.gebruik_events
  for select to authenticated
  using (kantoor_id = (select public.my_kantoor_id()));
create policy "makelaar logt alleen eigen events" on public.gebruik_events
  for insert to authenticated
  with check (kantoor_id = (select public.my_kantoor_id()) and makelaar_id = (select auth.uid()));

-- ── FK-indexen ──────────────────────────────────────────────────────────────
create index if not exists gebruik_events_makelaar_id_idx on public.gebruik_events (makelaar_id);
create index if not exists gebruik_events_object_id_idx on public.gebruik_events (object_id);
create index if not exists object_fotos_kantoor_id_idx on public.object_fotos (kantoor_id);
create index if not exists objecten_makelaar_id_idx on public.objecten (makelaar_id);
create index if not exists stijl_bewerkingen_object_id_idx on public.stijl_bewerkingen (object_id);
create index if not exists transacties_import_id_idx on public.transacties (import_id);
