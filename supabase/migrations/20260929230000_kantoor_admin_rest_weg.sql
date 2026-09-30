-- Laatste rest van de vervallen kantoor-admin-rol weg (29 sep 2026).
--
-- De policy "admin mag kantoor bijwerken" op kantoren liet een makelaar met
-- makelaars.role = 'admin' zijn eigen kantoorrij rechtstreeks via PostgREST
-- wijzigen (naam, huisstijl_json, instellingen_json …). Sinds 16 sep 2026 is er
-- één rol per kantoor en zijn huisstijl, instellingen en team uitsluitend
-- platform-admin-beheerd (/admin, via de service-client). De app schrijft
-- nergens met de sessie-client naar kantoren (gecontroleerd: app/admin/actions.ts,
-- app/api/huisstijl/leren/toepassen/route.ts en lib/nieuweKlant.ts gebruiken
-- allemaal createServiceSupabaseClient()), dus deze policy werd niet gebruikt
-- en was alleen een achterdeur. is_kantoor_admin() had geen andere gebruiker
-- meer (pg_policies nagelopen; objecten volgt sinds 20260928100000 kantoorbreed).
--
-- Raakt geen data; haalt niets weg wat de code gebruikt → los van een
-- codepush toe te passen. makelaars.role blijft bestaan (stuurt geen rechten).

drop policy if exists "admin mag kantoor bijwerken" on public.kantoren;
drop function if exists public.is_kantoor_admin();
