-- Koppeling "eigen verkoop → teamlid" voor het filter "Verkocht door"
-- (docs/ontwerp/README.md § 4, kolom Verkoopkaart/Transacties) — item 7.2
-- (verkoopkaart-explorer v2) bouwde dit filter bewust NIET, want `transacties`
-- heeft geen makelaar-kolom (zie de waarschuwing bovenaan `lib/schemas.ts`
-- `TransactieFilterSchema` en `lib/verkoopkaart.ts`).
--
-- ADDITIEF, nullable, geen backfill hier (bestaande rijen krijgen `null` —
-- "Verkocht door" toont dan gewoon niets aan te vinken totdat een import of
-- een los correctiescript deze kolom vult per rij). Zet géén "not null" en
-- verwijder geen kolom — CLAUDE.md § "Eén database, twee codeversies".
--
-- ⚠️ Nog NIET toegepast (vereist Quinns akkoord, zie CLAUDE.md § Vangrails
-- productiedatabase). Om het filter daadwerkelijk te laten werken is naast
-- deze migratie ook nodig: `makelaar_id` opnemen in
-- `lib/transactiesQuery.ts` `ALLE_TRANSACTIE_KOLOMMEN`/`MET_COORDINATEN_KOLOMMEN`,
-- een manier om bestaande rijen te koppelen (CSV-kolom bij import, of een
-- eenmalig matchscript op naam), en de "Verkocht door"-dropdown + filter in
-- `lib/verkoopkaart.ts`/`lib/marktanalyse.ts` (`TransactieFilterSchema.makelaars`
-- staat al klaar, de RPC's negeren het veld tot dan).

alter table transacties
  add column if not exists makelaar_id uuid references makelaars(id) on delete set null;

comment on column transacties.makelaar_id is
  'Teamlid dat de eigen verkoop deed (filter "Verkocht door", docs/ontwerp/README.md § 4). Nullable, geen backfill — zie bestandscommentaar.';

create index if not exists transacties_makelaar_id_idx on transacties (kantoor_id, makelaar_id);
