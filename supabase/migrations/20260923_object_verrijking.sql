-- Item 10.3 (docs/roadmap.md § fase 10): verrijkingsdata (WOZ, CBS-
-- buurtcijfers, voorzieningen, markttype — lib/verrijking.ts) opgeslagen bij
-- het aanmaken van het dossier, met tijdstempel "opgehaald op". Nullable en
-- puur additief: bestaande dossiers hebben geen verrijking_json tot ze
-- ververst worden via POST /api/object/[id]/verrijking (zie
-- lib/verrijkingOpslag.ts VerrijkingOpslagSchema voor de vorm).
--
-- ✅ TOEGEPAST op productie (geverifieerd 28 sep 2026).
alter table objecten add column if not exists verrijking_json jsonb;
