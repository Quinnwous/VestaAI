-- Opruimmigratie 2 (1 okt 2026, akkoord Quinn): restanten van het oude
-- NPS-/trialmodel, nergens meer gebruikt. Vooraf gecontroleerd: 0 rijen in
-- nps_responses, makelaars.first_generated_at nergens gevuld, geen functie,
-- view, trigger of foreign key die ernaar verwijst (de enige policy hoort bij
-- de tabel zelf en verdwijnt mee). Back-up: backups/2026-10-01T05-37-56-484Z/.
--
-- Toegepast op 1 okt 2026 via apply_migration (versie 20261001053851).
-- Het veld `first_generated_at` is in dezelfde ronde uit het type `Makelaar`
-- in lib/supabase.ts gehaald.
drop table if exists public.nps_responses;
alter table public.makelaars drop column if exists first_generated_at;
