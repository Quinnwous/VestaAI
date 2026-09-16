-- Fix voor de kapotte import-upsert (masterplan fase 0.4, docs/roadmap.md).
-- De bestaande unieke index gebruikte coalesce(verkoopdatum, '1900-01-01') —
-- een functionele index die PostgREST's upsert(onConflict: 'kantoor_id,adres,
-- verkoopdatum') niet kan matchen (Postgres eist dat de ON CONFLICT-kolommen
-- letterlijk overeenkomen met een unieke index/constraint). Elke import met
-- een botsende rij faalde daardoor met foutcode 42P10.
--
-- Fix: vervang door een gewone unieke index op de kale kolommen met
-- `nulls not distinct` (Postgres 15+, hier PG17) — behandelt een ontbrekende
-- verkoopdatum consistent als "gelijk" aan een andere ontbrekende datum,
-- exact hetzelfde gedrag als de oude coalesce-truc, maar nu wél matchbaar
-- door een upsert. Definitieve sleutel (met adres-normalisatie + datumvenster
-- voor Brainbay/Realworks-verschillen) volgt in fase 4.4 — dit is de
-- minimale fix om de bestaande importfunctionaliteit werkend te krijgen.
--
-- Geverifieerd 17 sep 2026: reproduceerde eerst de 42P10-fout met de oude
-- index, daarna bevestigd dat een dubbele import (zelfde adres+datum, ook met
-- een null-datum) correct update i.p.v. dupliceert.

drop index if exists transacties_natuurlijke_sleutel_idx;

create unique index transacties_natuurlijke_sleutel_idx
  on transacties (kantoor_id, adres, verkoopdatum) nulls not distinct;
