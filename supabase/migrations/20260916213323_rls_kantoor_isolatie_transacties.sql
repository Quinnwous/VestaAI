-- RLS-isolatie per kantoor voor transacties + view zonder RLS-omzeiling
-- (masterplan 16-17 sep 2026, fase 0.3, docs/roadmap.md). Gevonden bij verificatie:
-- 1) transacties had een "gedeelde referentiepool"-policy: elke ingelogde makelaar
--    van élk kantoor kon alle rijen lezen (marktanalyse/transacties/concurrentie
--    gebruiken hier al de sessie-gebonden client op, dus dit was een live
--    cross-tenant leak zodra er data in de tabel staat).
-- 2) transacties_met_coordinaten was aangemaakt als SECURITY DEFINER-view
--    (eigenaar 'postgres'), wat RLS op transacties volledig omzeilt voor
--    iedereen die de view bevraagt — inclusief de publieke anon-key.
-- Besluit (roadmap § Besluitenlogboek): transactiedata is strikt per kantoor
-- afgeschermd, geen gedeelde pool meer.
--
-- Toegepast direct via de Supabase-MCP op 17 sep 2026 (alle tabellen waren op
-- dat moment leeg — 0 rijen overal — dus geen back-up nodig vóór deze stap).

drop policy if exists "Ingelogde makelaars lezen de transactiedataset" on transacties;

create policy "makelaar leest eigen kantoor-transacties"
  on transacties for select
  to authenticated
  using (kantoor_id = (select kantoor_id from makelaars where id = auth.uid()));

-- Schrijven blijft uitsluitend via de platform-admin met de service-role-key
-- (app/admin/transacties/actions.ts) — die omzeilt RLS toch al, dus geen
-- insert/update/delete-policy voor authenticated/anon nodig.

drop view if exists transacties_met_coordinaten;

create view transacties_met_coordinaten
  with (security_invoker = true)
  as
  select
    id, kantoor_id, adres, postcode, plaats, wijk, buurt, geo,
    verkoopprijs, vraagprijs, verkoopdatum, looptijd_dagen, woningtype,
    woonoppervlak_m2, perceel_m2, inhoud_m3, bouwjaar, energielabel, kamers,
    garage, tuin, buitenruimte, eigen_verkoop, verkopend_kantoor, created_at,
    st_y(geo::geometry) as lat,
    st_x(geo::geometry) as lng
  from transacties;

-- Alleen select nodig (de view is toch niet updatable door de computed
-- lat/lng-kolommen); service-role bevraagt sowieso met bypass-rechten.
grant select on transacties_met_coordinaten to authenticated;
