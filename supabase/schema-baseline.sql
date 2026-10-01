-- ============================================================================
-- VestaAI — Database-baseline (schema, RLS, policies, functies, views, indexen)
-- Vastgelegd: 17 sep 2026, via introspectie (Supabase-MCP `list_tables`,
-- `pg_policies`, `pg_views`, `list_extensions`) van project uvpcjpejocjmlxxyhqyz.
-- Ververst: 1 okt 2026 (item F2, "Herstelplan compleet") — volledig opnieuw
-- ingelezen tegen de live database (`list_tables` verbose, `pg_policies`,
-- `pg_get_functiondef`, `pg_indexes`, `pg_constraint`, `pg_views`,
-- `information_schema.triggers`, `pg_event_trigger`, `list_extensions`).
-- Ter controle: `scripts/controleer-schema.mjs`.
--
-- BELANGRIJK: dit is GEEN uitvoerbare migratie en geen letterlijke `pg_dump`
-- (geen Supabase CLI/db-wachtwoord lokaal beschikbaar). Het is een leesbare
-- momentopname van de daadwerkelijke databasestructuur, ter vergelijking door
-- `scripts/controleer-schema.mjs` — zodat een "vergeten migratie" zoals bij de
-- 16-sep-batch niet meer onopgemerkt blijft. Elke schemawijziging gaat via
-- `apply_migration` (wél getrackt in `list_migrations`).
-- ============================================================================

-- ── Extensies (geïnstalleerd, `installed_version` niet null) ───────────────
-- pgcrypto           (schema: extensions)  — cryptografische functies
-- pg_stat_statements (schema: extensions)  — query-statistieken
-- uuid-ossp          (schema: extensions)  — uuid_generate_v4()
-- pg_trgm            (schema: public)      — ⚠️ hoort niet in public (advisory, laag)
-- postgis            (schema: public)      — ⚠️ hoort niet in public (advisory, laag)
-- supabase_vault     (schema: vault)

-- ── Tabellen (schema public) ─────────────────────────────────────────────

-- kantoren (RLS: aan) — Stripe/trial-kolommen (plan, stripe_id, trial_ends_at,
-- referral_code) zijn verwijderd (opruimmigratie, vóór 1 okt 2026); `slug`
-- erbij voor de publieke huisstijl-lookup (kantoor_branding_publiek()).
create table if not exists kantoren (
  id                uuid primary key default extensions.uuid_generate_v4(),
  name              text not null,
  logo_url          text,
  huisstijl_json    jsonb,
  created_at        timestamptz not null default now(),
  admin_notified_at timestamptz,
  instellingen_json jsonb,
  slug              text unique,
  constraint kantoren_slug_formaat check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint kantoren_slug_lengte check (slug is null or (char_length(slug) >= 2 and char_length(slug) <= 60))
);
-- Policy: "makelaar ziet eigen kantoor" (select, authenticated, id = my_kantoor_id()).
-- Geen schrijf-policy: kantoren wordt alleen via de service-client gewijzigd
-- (platform-admin, lib/admin.ts).

-- makelaars (RLS: aan) — role stuurt sinds "Eén rol per kantoor" (16 sep 2026)
-- geen rechten meer (RLS is kantoorbreed); de kolom blijft staan.
create table if not exists makelaars (
  id         uuid primary key references auth.users(id),
  kantoor_id uuid not null references kantoren(id),
  name       text not null,
  email      text not null,
  role       text not null default 'makelaar' check (role = any (array['admin','makelaar'])),
  created_at timestamptz not null default now()
);
-- Policy: "makelaar ziet zichzelf en kantoorgenoten" (select, authenticated,
--   id = (select auth.uid()) OR kantoor_id = (select my_kantoor_id())).
-- Geen insert/update/delete-policy: accounts gaan alleen via /admin
-- (createKantoor/addMakelaarAccount, service-role).

-- objecten (RLS: aan) — woningdossier, fasemodel. chat_publiek/chat_foto_url
-- en pitch_uitslag zijn vervallen (object-chatbot en pitch-concept weg vóór
-- 1 okt 2026); verrijking_json erbij (buurtdata-verrijking, lib/verrijking*).
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
  lat             double precision,
  lng             double precision,
  fase            text not null default 'verkoopadvies' check (fase = any (array['verkoopadvies','in_verkoop','verkocht'])),
  outputs_json_en jsonb,
  waardering_json jsonb,
  usps_structuur  jsonb,
  -- item 3.1: dossier aanmaken is losgekoppeld van content genereren. Lock met
  -- verlooptijd (6 min, lib/contentGeneratie.ts CONTENT_LOCK_VERLOOP_MS) tegen
  -- dubbele Claude-generaties.
  content_status         text not null default 'geen' check (content_status = any (array['geen','bezig','klaar','fout'])),
  content_gegenereerd_op timestamptz,
  content_bezig_sinds    timestamptz,
  -- item 3.4: tijdstip van de laatste faseovergang, voedt "X dagen in <fase>"
  -- in DossierHeader.tsx. setObjectFase zet hem opnieuw bij een echte overgang.
  fase_sinds             timestamptz not null default now(),
  verrijking_json jsonb
);
-- Policies (kantoorbreed sinds 20260928100000_rls_kantoorbreed_en_initplan.sql,
-- "Eén rol per kantoor" — geen eigenaar- of admin-voorwaarde meer):
--   "makelaar ziet kantoor-objecten"        (select, authenticated, kantoor_id = (select my_kantoor_id()))
--   "makelaar mag object aanmaken"          (insert, authenticated, makelaar_id = (select auth.uid()))
--   "makelaar wijzigt kantoor-objecten"     (update, authenticated, kantoor_id = (select my_kantoor_id()) — qual én with check)
--   "makelaar verwijdert kantoor-objecten"  (delete, authenticated, kantoor_id = (select my_kantoor_id()))

-- transacties (RLS: aan) — i4housing's eigen Brainbay-/Realworks-data.
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
  -- ── item 2.1, migratie 20260917_transacties_pijplijn.sql ──
  bron                   text check (bron = any (array['brainbay','realworks','handmatig','fixture'])),
  import_id              uuid references imports(id) on delete set null,
  adres_sleutel          text not null,  -- postcode|huisnummer|toevoeging, terugval straat|huisnummer|plaats
  huisnummer             integer,
  toevoeging             text,
  woningtype_groep       text,  -- appartement | rijwoning | halfvrijstaand | vrijstaand, geen check (applicatielaag)
  woningtype_sub         text,  -- taxonomie docs/ontwerp/README.md § 5, geen check (applicatielaag)
  geocode_status         text check (geocode_status = any (array['exact','benaderd','mislukt'])),
  uitgesloten_reden      text,
  aankopend_kantoor      text,
  verkopend_kantoor_norm text,
  prijs_m2               numeric generated always as (verkoopprijs::numeric / nullif(woonoppervlak_m2, 0)) stored
);
-- Policy: "makelaar leest eigen kantoor-transacties" (select, authenticated,
--   kantoor_id = (select my_kantoor_id())). Geen schrijf-policy: import/mutatie
--   alleen via de service-client (platform-admin, scripts/import-transacties.mjs).
-- Indexen: transacties_geo_idx (gist geo), transacties_eigen_verkoop_idx
-- (kantoor_id, eigen_verkoop), transacties_kantoor_verkoopdatum_idx
-- (kantoor_id, verkoopdatum), transacties_kantoor_plaats_idx (kantoor_id,
-- plaats), transacties_kantoor_woningtype_groep_idx (kantoor_id,
-- woningtype_groep), transacties_natuurlijke_sleutel_idx UNIQUE (kantoor_id,
-- adres_sleutel, verkoopdatum) NULLS NOT DISTINCT, transacties_import_id_idx
-- (import_id).

-- imports (RLS: aan) — importlog per CSV-batch; snapshot_json is het vangnet
-- om een import terug te draaien. Alleen service-role schrijft.
create table if not exists imports (
  id                      uuid primary key default gen_random_uuid(),
  kantoor_id              uuid not null references kantoren(id),
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
--   kantoor_id = (select my_kantoor_id())).
-- Index: imports_kantoor_id_idx (kantoor_id).

-- object_documenten (RLS: aan) — documenten per dossier, voor Claude-uploads.
create table if not exists object_documenten (
  id                uuid primary key default extensions.uuid_generate_v4(),
  object_id         uuid references objecten(id),
  kantoor_id        uuid not null references kantoren(id),
  bestandsnaam      text not null,
  storage_pad       text not null,
  mime_type         text not null,
  grootte_bytes     bigint not null,
  anthropic_file_id text,
  created_at        timestamptz not null default now()
);
-- Policies: "makelaar ziet kantoor-documenten" (select), "makelaar mag
-- document toevoegen" (insert), "makelaar mag kantoor-document verwijderen"
-- (delete) — alle drie op kantoor_id = (select my_kantoor_id()). Geen
-- update-policy (documenten zijn immutable: vervangen = verwijderen + opnieuw
-- toevoegen).
-- Indexen: obj_doc_kantoor_idx (kantoor_id), obj_doc_object_idx (object_id)
-- WHERE object_id IS NOT NULL.

-- object_fotos (RLS: aan, GEEN policies) — fotobibliotheek / virtual staging.
-- Alleen de service-client (createServiceSupabaseClient) kan lezen/schrijven;
-- een ingelogde makelaar krijgt via de sessie-gebonden client altijd 0 rijen.
-- Bevestig dit bewust is vóórdat een UI-feature hier rechtstreeks op leunt.
create table if not exists object_fotos (
  id           uuid primary key default extensions.uuid_generate_v4(),
  object_id    uuid not null references objecten(id),
  kantoor_id   uuid not null references kantoren(id),
  url          text not null,
  storage_pad  text not null,
  soort        text not null default 'verbeterd',
  bestandsnaam text,
  created_at   timestamptz not null default now()
);
-- Indexen: object_fotos_kantoor_id_idx (kantoor_id), object_fotos_object_idx (object_id).

-- stijl_bewerkingen (RLS: aan, GEEN policies) — "leren van bewerkingen",
-- zelfde situatie als object_fotos: uitsluitend via de service-client.
create table if not exists stijl_bewerkingen (
  id         uuid primary key default extensions.uuid_generate_v4(),
  kantoor_id uuid not null references kantoren(id),
  object_id  uuid references objecten(id),
  sleutel    text not null,
  origineel  text not null,
  bewerkt    text not null,
  verwerkt   boolean not null default false,
  created_at timestamptz not null default now()
);
-- Indexen: stijl_bewerkingen_object_id_idx (object_id),
-- stijl_bewerkingen_kantoor_onverwerkt_idx (kantoor_id) WHERE verwerkt = false.

-- gebruik_events (RLS: aan) — productanalytics ("dossier bekeken"), item 9.x.
create table if not exists gebruik_events (
  id          uuid primary key default gen_random_uuid(),
  kantoor_id  uuid not null references kantoren(id),
  makelaar_id uuid not null references makelaars(id),
  object_id   uuid references objecten(id),
  type        text not null check (type = 'dossier_bekeken'),
  created_at  timestamptz not null default now()
);
-- Policies: "makelaar leest events van eigen kantoor" (select, kantoor_id =
--   (select my_kantoor_id())), "makelaar logt alleen eigen events" (insert,
--   kantoor_id = (select my_kantoor_id()) AND makelaar_id = (select auth.uid())).
-- Indexen: gebruik_events_kantoor_makelaar_idx (kantoor_id, makelaar_id,
-- created_at DESC), gebruik_events_makelaar_id_idx (makelaar_id),
-- gebruik_events_object_id_idx (object_id).

-- spatial_ref_sys (RLS: UIT) — PostGIS-systeemtabel (SRID-referentiedata,
-- 8500+ vaste rijen). Geen bedrijfsdata, geen kantoor_id. Niet in de back-up
-- (scripts/backup-data.mjs) — zie advisory hieronder waarom RLS hier niet aan
-- te zetten is met dit projectaccount.

-- ── View: transacties_met_coordinaten ──────────────────────────────────────
-- Alle kolommen van transacties plus `lat`/`lng` (st_y/st_x op geo::geometry).
-- `security_invoker = true` (bevestigd via pg_class.reloptions) — RLS van
-- transacties geldt dus ook via deze view; gebruik hem altijd voor
-- coördinaten, nooit de EWKB-hex uit transacties.geo rechtstreeks.

-- ── Functies (schema public, eigen code — exclusief PostGIS-interne functies) ─
-- my_kantoor_id()                      sql STABLE SECURITY DEFINER — kantoor_id
--                                       van de ingelogde makelaar; basis van elke RLS-policy.
-- kantoor_branding_publiek(p_slug)     sql STABLE SECURITY DEFINER — publieke
--                                       huisstijl-lookup op kantoren.slug (geen auth nodig).
-- transacties_gefilterd(p_filters)     sql STABLE — gedeeld filterfundament
--                                       (RETURNS SETOF transacties) waar alle
--                                       onderstaande rapportagefuncties op bouwen.
-- transacties_zoeken / transacties_plaatsen_wijken — transactiezoeker (paginering, facetten).
-- marktanalyse_reeks / marktanalyse_samenvatting / marktanalyse_verdeling_prijsklasse — marktanalyse.
-- concurrentie_marktaandeel / concurrentie_ranglijst / concurrentie_segmenten /
-- concurrentie_matrix / concurrentie_aandeel_jaar / concurrentie_profiel /
-- concurrentie_wij_vs_markt — concurrentieanalyse.
-- prijsindex_kwartaal                  sql STABLE — prijs/m² per kwartaal.
-- referenties_in_straal(p_lat,p_lng,…) sql STABLE — vergelijkbare verkopen
--                                       binnen een straal (lib/waardering.ts).
-- rls_auto_enable()                    plpgsql SECURITY DEFINER, event trigger
--                                       (ensure_rls, ddl_command_end) — zet RLS
--                                       automatisch aan op elke nieuwe tabel in
--                                       schema public. Verklaart waarom een
--                                       nieuwe tabel altijd met RLS "aan" start;
--                                       er moeten dus nog wél policies bij.
-- ⚠️ Alle STABLE-functies hierboven hebben `SET search_path TO 'public'` — bij
--    een PostGIS-aanroep (st_distance, st_dwithin in referenties_in_straal)
--    werkt dat alleen omdat postgis zelf (nog) in schema public staat, zie de
--    advisory hieronder. Verhuist postgis ooit naar een eigen schema, dan
--    moeten deze functies mee worden bijgewerkt.
-- Bevestigd verdwenen (geen enkele functiedefinitie meer op de database):
-- handle_new_user(), is_kantoor_admin() — beide ongebruikt, geen trigger op
-- auth.users aanwezig (information_schema.triggers, schema public, is leeg;
-- er bestaan ook geen triggers op de business-tabellen).

-- ── Bevestigd verdwenen tabellen (niet meer aanwezig, opruimmigratie vóór
--    1 okt 2026) ────────────────────────────────────────────────────────────
-- post_planning, chatbot_faq, chatbot_leads, referrals, wijken.

-- ── Overige advisory-bevindingen (laatst herbevestigd 1 okt 2026) ──────────
-- • spatial_ref_sys: RLS staat uit (PostGIS-systeemtabel). ALTER TABLE
--   mislukt met "must be owner" — eigendom van de postgis-extensie, niet aan
--   te passen met dit projectaccount. Geen persoonsgegevens, laag risico.
-- • pg_trgm/postgis in schema `public` i.p.v. een eigen schema (WARN, laag,
--   nog steeds zo op 1 okt 2026).
-- • Leaked-password-protection staat uit (Auth-instelling, alleen via
--   dashboard/Management API te zetten — actie Quinn, niet via SQL te
--   verifiëren).
-- • Self-signup (auth.signUp) mogelijk nog aan op providerniveau (Auth-
--   instelling, alleen via dashboard te controleren — actie Quinn). Risico
--   laag: er bestaat geen trigger op auth.users die automatisch een
--   makelaar/kantoor-koppeling aanmaakt, dus een self-signup geeft geen
--   toegang tot een kantoor.
