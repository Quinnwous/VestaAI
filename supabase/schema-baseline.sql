-- ============================================================================
-- VestaAI — Database-baseline (schema, RLS, policies)
-- Vastgelegd: 17 sep 2026, via introspectie (Supabase-MCP `list_tables`,
-- `pg_policies`, `pg_views`, `list_extensions`) van project uvpcjpejocjmlxxyhqyz.
-- Bijgewerkt: 17 sep 2026 (item 2.1) naar de staat NA migratie
-- `20260917_transacties_pijplijn.sql` — die migratie was op het moment van
-- schrijven nog niet toegepast (de orchestrator maakt eerst een back-up en
-- past hem daarna toe); dit bestand beschrijft dus de bedoelde staat, niet
-- per se de live staat op het moment dat je dit leest. Ter controle:
-- `scripts/controleer-schema.mjs`.
--
-- BELANGRIJK: dit is GEEN uitvoerbare migratie en geen letterlijke `pg_dump`
-- (geen Supabase CLI/db-wachtwoord lokaal beschikbaar). Het is een leesbare
-- momentopname van de daadwerkelijke databasestructuur, ter vergelijking door
-- `scripts/controleer-schema.mjs` (nog te bouwen, fase 0/11) — zodat een
-- "vergeten migratie" zoals bij de 16-sep-batch niet meer onopgemerkt blijft.
--
-- Aanleiding: de bestanden in `supabase/migrations/20260916_*.sql` staan NIET
-- in de getrackte migratiehistorie (`list_migrations`), maar de kolommen en
-- tabellen die ze beschrijven bestaan wél op de database — ze zijn ooit
-- rechtstreeks uitgevoerd (waarschijnlijk via de SQL Editor of een eerdere
-- `execute_sql`-aanroep) zonder als migratie te worden vastgelegd. Vanaf nu
-- gaat elke schemawijziging via `apply_migration` (wél getrackt).
-- ============================================================================

-- ── Extensies (geïnstalleerd, `installed_version` niet null) ───────────────
-- pgcrypto        (schema: extensions)  — cryptografische functies
-- pg_stat_statements (schema: extensions) — query-statistieken
-- uuid-ossp       (schema: extensions)  — uuid_generate_v4()
-- pg_trgm         (schema: public)      — ⚠️ hoort niet in public (advisory)
-- postgis         (schema: public)      — ⚠️ hoort niet in public (advisory)
-- supabase_vault  (schema: vault)

-- ── Tabellen (schema public) ─────────────────────────────────────────────

-- kantoren (RLS: aan)
create table if not exists kantoren (
  id                uuid primary key default extensions.uuid_generate_v4(),
  name              text not null,
  plan              text check (plan = any (array['starter','pro','kantoor','gratis'])),
  logo_url          text,
  huisstijl_json    jsonb,
  stripe_id         text,
  trial_ends_at     timestamptz,
  created_at        timestamptz not null default now(),
  referral_code     varchar unique,
  admin_notified_at timestamptz,
  instellingen_json jsonb
  -- ⚠️ plan/stripe_id/trial_ends_at/referral_code zijn dood (Stripe/trial-model
  -- verwijderd 15 sep 2026) — verwijderen via de goedgekeurde opruimmigratie
  -- 20260916_opruimen_ongebruikt.sql (nog niet uitgevoerd, vereist akkoord Quinn).
);
-- Policies: "makelaar ziet eigen kantoor" (select, authenticated, id = my_kantoor_id()),
--           "admin mag kantoor bijwerken" (update, authenticated, id = my_kantoor_id() AND is_kantoor_admin())
-- ⚠️ is_kantoor_admin() checkt makelaars.role='admin', maar sinds 16 sep 2026
--    stuurt role geen rechten meer binnen de app-laag — controleren of dit
--    beleidsverschil ergens een functionele blokkade geeft (fase 8-onderzoek).

-- makelaars (RLS: aan)
create table if not exists makelaars (
  id                 uuid primary key references auth.users(id),
  kantoor_id         uuid not null references kantoren(id),
  name               text not null,
  email              text not null,
  role               text not null default 'makelaar' check (role = any (array['admin','makelaar'])),
  created_at         timestamptz not null default now(),
  first_generated_at timestamptz
);
-- Policies: "makelaar ziet kantoorgenoten" (select, authenticated, kantoor_id = my_kantoor_id()),
--           "makelaar ziet zichzelf" (select, public, id = auth.uid())

-- objecten (RLS: aan) — woningdossier, fasemodel-kolommen aanwezig
create table if not exists objecten (
  id              uuid primary key default extensions.uuid_generate_v4(),
  kantoor_id      uuid not null references kantoren(id),
  makelaar_id     uuid not null references makelaars(id),
  address         text not null,
  input_json      jsonb not null,
  outputs_json    jsonb not null,
  status          text not null default 'draft' check (status = any (array['draft','published','onder_bod','verkocht'])),
  created_at      timestamptz not null default now(),
  notitie         text,
  chat_publiek    boolean not null default true,   -- dood: object-chatbot verwijderd 15 sep
  chat_foto_url   text,                             -- dood
  lat             double precision,
  lng             double precision,
  fase            text not null default 'verkoopadvies' check (fase = any (array['verkoopadvies','in_verkoop','verkocht'])),
  -- pitch_uitslag VERVALLEN (migratie 20260917_transacties_pijplijn.sql, item
  -- 2.1) — pitch-concept al uit de code sinds 1.9c (17 sep 2026), kolom nu ook
  -- uit het schema. fase-waarde 'acquisitie' hernoemd naar 'verkoopadvies' in
  -- dezelfde migratie (besluit Quinn 17 sep 2026); bestaande rijen bijgewerkt.
  outputs_json_en jsonb,
  waardering_json jsonb,
  usps_structuur  jsonb,
  -- item 3.1 (migratie 20260917_object_content_status.sql): dossier
  -- aanmaken is losgekoppeld van content genereren. outputs_json blijft
  -- NOT NULL — een net aangemaakt dossier krijgt een lege, geldige
  -- ContentOutput-structuur (lib/schemas.ts LEEG_CONTENT_OUTPUT) in plaats
  -- van null, zie de migratie voor de afweging.
  content_status         text not null default 'geen' check (content_status = any (array['geen','bezig','klaar','fout'])),
  content_gegenereerd_op timestamptz,
  content_bezig_sinds    timestamptz, -- lock-claim-tijdstip, verlopen na 6 min (lib/contentGeneratie.ts)
  -- item 3.4 (migratie 20260917_object_fase_sinds.sql): tijdstip van de
  -- laatste faseovergang, voedt "X dagen in <fase>" in DossierHeader.tsx.
  -- Bestaande rijen kregen created_at; setObjectFase zet hem opnieuw bij
  -- een echte overgang.
  fase_sinds             timestamptz not null default now()
);
-- Policies: "makelaar ziet kantoor-objecten" (select, authenticated, kantoor_id = my_kantoor_id()),
--           "makelaar mag object aanmaken" (insert, public, makelaar_id = auth.uid()),
--           "makelaar mag eigen object wijzigen" (update, public, makelaar_id = auth.uid()),
--           "makelaar mag eigen object verwijderen" (delete, public, makelaar_id = auth.uid()),
--           "admin mag kantoor-objecten wijzigen" (update, authenticated, kantoor_id = my_kantoor_id() AND is_kantoor_admin()),
--           "admin mag kantoor-objecten verwijderen" (delete, authenticated, kantoor_id = my_kantoor_id() AND is_kantoor_admin())
-- ⚠️ TE VERIFIËREN (fase 8): update/delete zijn beperkt tot makelaar_id = auth.uid()
--    (eigen dossier) of role='admin' (kantoor-admin, sinds 16 sep afgeschaft).
--    Bij "één rol per kantoor" zou elke collega elk dossier moeten kunnen
--    bewerken — check of app-mutaties via service-role lopen (dan is dit geen
--    probleem) of via de sessie-gebonden client (dan faalt een collega-edit
--    stil, 0 rijen bijgewerkt, geen foutmelding).

-- transacties (RLS: aan — ZIE 20260917213323-migratie voor de RLS-fix, en
-- 20260917_transacties_pijplijn.sql (item 2.1) voor de pijplijn-kolommen hieronder)
create table if not exists transacties (
  id                uuid primary key default gen_random_uuid(),
  kantoor_id        uuid not null references kantoren(id),
  adres             text not null,
  postcode          text,
  plaats            text,
  wijk              text,
  buurt             text,
  geo               geography,
  verkoopprijs      integer,
  vraagprijs        integer,
  verkoopdatum      date,
  looptijd_dagen    integer,
  woningtype        text,
  woonoppervlak_m2  integer,
  perceel_m2        integer,
  inhoud_m3         integer,
  bouwjaar          integer,
  energielabel      text,
  kamers            integer,
  garage            boolean,
  tuin              boolean,
  buitenruimte      text,
  eigen_verkoop     boolean not null default true,
  verkopend_kantoor text,
  created_at        timestamptz not null default now(),
  -- ── vanaf hier: item 2.1, migratie 20260917_transacties_pijplijn.sql ──
  bron                   text check (bron = any (array['brainbay','realworks','handmatig','fixture'])),
  import_id              uuid references imports(id) on delete set null,
  adres_sleutel          text not null,  -- postcode|huisnummer|toevoeging, terugval straat|huisnummer|plaats
  huisnummer             integer,
  toevoeging             text,
  woningtype_groep       text,  -- appartement | rijwoning | halfvrijstaand | vrijstaand (§ 3.3), geen check (applicatielaag)
  woningtype_sub         text,  -- taxonomie docs/ontwerp/README.md § 5, geen check (applicatielaag)
  geocode_status         text check (geocode_status = any (array['exact','benaderd','mislukt'])),
  uitgesloten_reden      text,
  aankopend_kantoor      text,
  verkopend_kantoor_norm text,
  prijs_m2               numeric generated always as (verkoopprijs::numeric / nullif(woonoppervlak_m2, 0)) stored
);
-- Policy (na fix 17 sep 2026, migratie rls_kantoor_isolatie_transacties):
--   "makelaar leest eigen kantoor-transacties" (select, authenticated,
--    kantoor_id = (select kantoor_id from makelaars where id = auth.uid()))
-- Vóór de fix: "Ingelogde makelaars lezen de transactiedataset" (elk
-- ingelogd account zag ALLE kantoren — bewust ontworpen als "gedeelde
-- referentiepool", ingetrokken 17 sep 2026, zie besluitenlogboek).
--
-- Indexen (na item 2.1): transacties_geo_idx (gist geo),
-- transacties_eigen_verkoop_idx (kantoor_id, eigen_verkoop),
-- transacties_kantoor_verkoopdatum_idx (kantoor_id, verkoopdatum),
-- transacties_kantoor_plaats_idx (kantoor_id, plaats),
-- transacties_kantoor_woningtype_groep_idx (kantoor_id, woningtype_groep),
-- transacties_natuurlijke_sleutel_idx UNIQUE (kantoor_id, adres_sleutel,
-- verkoopdatum) NULLS NOT DISTINCT. transacties_kantoor_id_idx (kantoor_id)
-- en transacties_verkoopdatum_idx (verkoopdatum) zijn gedropt — overbodig
-- naast de kantoor_id-geleide composiet-indexen (RLS voegt altijd
-- kantoor_id = … toe, dus verkoopdatum/kantoor_id worden nooit los bevraagd).

-- tabel imports (item 2.1, RLS: aan) — importlog per CSV-batch, alleen
-- service-role schrijft (geen insert/update/delete-policies)
create table if not exists imports (
  id                      uuid primary key default gen_random_uuid(),
  kantoor_id              uuid not null references kantoren(id) on delete cascade,
  bron                    text not null check (bron = any (array['brainbay','realworks','handmatig','fixture'])),
  bestandsnaam            text,
  aantal_rijen            integer,
  aantal_nieuw            integer,
  aantal_bijgewerkt       integer,
  aantal_uitgesloten      integer,
  kwaliteitsrapport_json  jsonb,
  snapshot_json           jsonb,
  status                  text not null default 'bezig' check (status = any (array['bezig','klaar','mislukt','teruggedraaid'])),
  gestart_op              timestamptz not null default now(),
  klaar_op                timestamptz,
  teruggedraaid_op        timestamptz
);
-- Policy: "makelaar leest eigen kantoor-imports" (select, authenticated,
--   kantoor_id = (select kantoor_id from makelaars where id = auth.uid()))

-- view: transacties_met_coordinaten (na fix 17 sep 2026, kolommen uitgebreid item 2.1)
--   `with (security_invoker = true)` — was SECURITY DEFINER (eigenaar
--   'postgres'), wat RLS op transacties volledig omzeilde voor iedereen die
--   de view bevroeg, incl. de publieke anon-key. grant select alleen aan
--   authenticated (niet aan anon — de view is toch niet updatable). Bevat nu
--   ook de pijplijn-kolommen (bron, adres_sleutel, woningtype_groep/_sub,
--   geocode_status, uitgesloten_reden, verkopend_kantoor_norm, prijs_m2, …).

-- ── Tabellen die alleen via service-role gelezen/geschreven worden ────────
-- (RLS aan, geen policies voor anon/authenticated — bevestigd tegen de
-- codebase: alle queries op deze tabellen lopen via createServiceSupabaseClient)
-- object_fotos       — fotobibliotheek / virtual staging
-- stijl_bewerkingen  — "leren van bewerkingen"
-- object_documenten  — heeft wél policies (makelaar mag eigen kantoor-documenten
--                       zien/toevoegen/verwijderen via kantoor_id-subquery)

-- ── Dode tabellen (kandidaat voor 20260916_opruimen_ongebruikt.sql) ───────
-- post_planning, chatbot_faq, chatbot_leads, referrals, wijken (wijken is
-- publiek leesbaar voor SEO-pagina's die niet meer bestaan — nagaan of wijken
-- nog gebruikt wordt vóór verwijderen)

-- ── Dode functies (SECURITY DEFINER, callable door anon — niet als trigger
--    gekoppeld aan auth.users, dus geen actief self-signup-risico via de DB) ─
-- handle_new_user()   — vroegere signup-trigger; GEEN trigger meer aanwezig
--                        op auth.users (geverifieerd 17 sep 2026 — pg_trigger
--                        bevat geen enkele trigger met deze naam)
-- is_kantoor_admin(), my_kantoor_id() — nog actief gebruikt in RLS-policies,
--                        NIET dood, blijven staan

-- ── Overige advisory-bevindingen (17 sep 2026, niet met dit account op te
--    lossen of bewust uitgesteld) ─────────────────────────────────────────
-- • spatial_ref_sys: RLS staat uit (PostGIS-systeemtabel, alleen SRID-
--   referentiedata). ALTER TABLE mislukt met "must be owner" — eigendom van
--   de postgis-extensie, niet aan te passen met dit projectaccount. Geen
--   persoonsgegevens, laag risico — actie: navragen bij Supabase-support of
--   negeren als bekende PostGIS-beperking.
-- • pg_trgm/postgis in schema `public` i.p.v. een eigen schema (WARN, laag).
-- • Leaked-password-protection staat uit (Auth-instelling, alleen via
--   dashboard/Management API te zetten — actie Quinn).
-- • Self-signup (auth.signUp) mogelijk nog aan op providerniveau (Auth-
--   instelling, alleen via dashboard te controleren — actie Quinn). Risico
--   lager dan aangenomen: de DB-trigger die automatisch een kantoor aanmaakt
--   bestaat niet meer, dus signup zou geen makelaar/kantoor-koppeling geven.
