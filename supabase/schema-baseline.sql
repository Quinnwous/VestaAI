-- ============================================================================
-- VestaAI — Database-baseline (schema, RLS, policies)
-- Vastgelegd: 17 sep 2026, via introspectie (Supabase-MCP `list_tables`,
-- `pg_policies`, `pg_views`, `list_extensions`) van project uvpcjpejocjmlxxyhqyz.
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
  fase            text not null default 'acquisitie' check (fase = any (array['acquisitie','in_verkoop','verkocht'])),
  pitch_uitslag   text check (pitch_uitslag = any (array['open','gewonnen','verloren'])),
  outputs_json_en jsonb,
  waardering_json jsonb,
  usps_structuur  jsonb
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

-- transacties (RLS: aan — ZIE 20260917-migratie voor de RLS-fix)
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
  created_at        timestamptz not null default now()
);
-- Policy (na fix 17 sep 2026, migratie rls_kantoor_isolatie_transacties):
--   "makelaar leest eigen kantoor-transacties" (select, authenticated,
--    kantoor_id = (select kantoor_id from makelaars where id = auth.uid()))
-- Vóór de fix: "Ingelogde makelaars lezen de transactiedataset" (elk
-- ingelogd account zag ALLE kantoren — bewust ontworpen als "gedeelde
-- referentiepool", ingetrokken 17 sep 2026, zie besluitenlogboek).

-- view: transacties_met_coordinaten (na fix 17 sep 2026)
--   `with (security_invoker = true)` — was SECURITY DEFINER (eigenaar
--   'postgres'), wat RLS op transacties volledig omzeilde voor iedereen die
--   de view bevroeg, incl. de publieke anon-key. grant select alleen aan
--   authenticated (niet aan anon — de view is toch niet updatable).

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
