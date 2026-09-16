-- Waarderingsmodule (F7, zie CLAUDE.md § Hoofdstructuur): bewaart de laatst
-- berekende waardebepaling (referenties/bandbreedte) en een eventuele
-- correctie door de makelaar mét motivatie (besluit 16 sep 2026: bijsturen
-- mag, maar altijd met een reden die meegaat in het verkoopadvies).
alter table objecten
  add column if not exists waardering_json jsonb,
  -- AI USP-extractor (F7): gestructureerde USP's, gedestilleerd uit het vrije
  -- tekstveld van de intake. Los van `input_json.usps` (de brontekst) zodat
  -- herextractie niet de originele invoer overschrijft.
  add column if not exists usps_structuur jsonb;
