-- Zakelijke kantoorinstellingen (courtage, kantoorprofiel, werkgebied) — los van
-- de visuele huisstijl in huisstijl_json. Beheerd door de platform-admin in
-- /admin (besluit 16 sep 2026: één rol per kantoor, geen instellingenscherm
-- meer bij het kantoor zelf). Zie lib/schemas.ts KantoorInstellingenSchema.
alter table kantoren add column if not exists instellingen_json jsonb;
