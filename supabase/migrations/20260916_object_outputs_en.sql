-- Engelse tegenhanger van de contentsuite (F8, besluit 16 sep 2026, zie
-- CLAUDE.md § Hoofdstructuur: "elke tekst standaard NL+EN"). Los van
-- outputs_json (NL, bewerkbaar) — de Engelse versie is ter inzage/kopiëren,
-- zie components/ResultTabs.tsx.
alter table objecten
  add column if not exists outputs_json_en jsonb;
