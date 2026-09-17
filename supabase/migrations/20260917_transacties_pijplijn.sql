-- Transactiedataset-pijplijn v2 (item 2.1, docs/roadmap.md § Fase 2): schema
-- voor import, ontdubbelen, geocodering en kwaliteit in één keer — plus de
-- fase-hernoeming 'acquisitie' -> 'verkoopadvies' op objecten (besluit Quinn
-- 17 sep 2026) en het laten vervallen van het pitch-concept (item 1.9c/2.1).
-- Tabel `transacties` en `objecten` zijn op het moment van schrijven leeg
-- (0 rijen) — geen echte data geraakt, geen back-up-afhankelijke datamigratie
-- nodig voor de kolomtoevoegingen zelf (de `update objecten set fase = …`
-- hieronder raakt wel toekomstige rijen, maar is bewust idempotent: rijen die
-- al 'verkoopadvies' zijn blijven ongemoeid bij een herdraai).

-- ── 1. Tabel `imports` — importlog per CSV-batch, alleen service-role schrijft ──
create table if not exists imports (
  id                   uuid primary key default gen_random_uuid(),
  kantoor_id           uuid not null references kantoren(id) on delete cascade,
  bron                 text not null check (bron in ('brainbay', 'realworks', 'handmatig', 'fixture')),
  bestandsnaam         text,
  aantal_rijen         integer,
  aantal_nieuw         integer,
  aantal_bijgewerkt    integer,
  aantal_uitgesloten   integer,
  kwaliteitsrapport_json jsonb,
  -- Vorige waarden van bijgewerkte rijen (begrensd aantal/omvang, zie
  -- lib/transactieImport.ts) — voedt een toekomstige "importeer terugdraaien".
  snapshot_json        jsonb,
  status               text not null default 'bezig' check (status in ('bezig', 'klaar', 'mislukt', 'teruggedraaid')),
  gestart_op           timestamptz not null default now(),
  klaar_op             timestamptz,
  teruggedraaid_op     timestamptz
);

alter table imports enable row level security;

-- Zelfde patroon als de transacties-select-policy hieronder: een makelaar mag
-- het importlog van zijn eigen kantoor zien (bv. "laatst geïmporteerd op"),
-- maar er zijn bewust geen insert/update/delete-policies — alleen de
-- platform-admin via de service-role (app/admin/transacties/actions.ts)
-- schrijft hier, net als op transacties zelf.
drop policy if exists "makelaar leest eigen kantoor-imports" on imports;
create policy "makelaar leest eigen kantoor-imports"
  on imports for select
  to authenticated
  using (kantoor_id = (select kantoor_id from makelaars where id = auth.uid()));

create index if not exists imports_kantoor_id_idx on imports (kantoor_id);

-- ── 2. Nieuwe kolommen op `transacties` (§ 3.1 / item 2.1-spec) ─────────────
alter table transacties
  add column if not exists bron text check (bron in ('brainbay', 'realworks', 'handmatig', 'fixture')),
  -- on delete set null: een import-record terugdraaien/verwijderen mag nooit
  -- de bijbehorende transactierijen zelf laten verdwijnen.
  add column if not exists import_id uuid references imports(id) on delete set null,
  -- Genormaliseerde sleutel: postcode|huisnummer|toevoeging, terugval
  -- straat|huisnummer|plaats — zie lib/transactieNormalisatie.ts. Kan direct
  -- `not null` omdat de tabel leeg is (geen bestaande rijen om te backfillen).
  add column if not exists adres_sleutel text not null,
  add column if not exists huisnummer integer,
  add column if not exists toevoeging text,
  -- § 3.3-taxonomie (waarderingsgroepen) resp. docs/ontwerp/README.md § 5
  -- (subtypes) — bewust geen check-constraint: de subtype-lijst hoort in de
  -- applicatielaag (lib/transactieNormalisatie.ts), niet in de database, zodat
  -- een nieuwe subtype-toevoeging geen migratie vergt.
  add column if not exists woningtype_groep text,
  add column if not exists woningtype_sub text,
  add column if not exists geocode_status text check (geocode_status in ('exact', 'benaderd', 'mislukt')),
  add column if not exists uitgesloten_reden text,
  add column if not exists aankopend_kantoor text,
  add column if not exists verkopend_kantoor_norm text;

-- Generated column ná de kolommen waar hij van afhangt (verkoopprijs en
-- woonoppervlak_m2 bestaan al sinds de eerste transacties-migratie).
alter table transacties
  add column if not exists prijs_m2 numeric generated always as (verkoopprijs::numeric / nullif(woonoppervlak_m2, 0)) stored;

-- ── 3. Unieke sleutel: adres-gebaseerd -> adres_sleutel-gebaseerd ───────────
-- (§ 3.1: "vervangt de adres-gebaseerde"). `app/admin/transacties/actions.ts`
-- moet zijn `onConflict: 'kantoor_id,adres,verkoopdatum'` in dezelfde commit
-- meeveranderen naar 'kantoor_id,adres_sleutel,verkoopdatum'.
drop index if exists transacties_natuurlijke_sleutel_idx;
create unique index if not exists transacties_natuurlijke_sleutel_idx
  on transacties (kantoor_id, adres_sleutel, verkoopdatum) nulls not distinct;

-- ── 4. Indexen uit § 3.1 (marktanalyse/concurrentie/prijsindex-RPC's, 2.2) ──
create index if not exists transacties_kantoor_verkoopdatum_idx on transacties (kantoor_id, verkoopdatum);
create index if not exists transacties_kantoor_plaats_idx on transacties (kantoor_id, plaats);
create index if not exists transacties_kantoor_woningtype_groep_idx on transacties (kantoor_id, woningtype_groep);

-- Overbodig geworden door de drie composiet-indexen hierboven (en de
-- bestaande transacties_eigen_verkoop_idx (kantoor_id, eigen_verkoop)):
-- • transacties_kantoor_id_idx (kantoor_id) — elke query op deze tabel loopt
--   via RLS altijd met kantoor_id in de where-clause (zie CLAUDE.md §
--   transactiedataset); een kantoor_id-only lookup wordt al gedekt door het
--   linkerprefix van élk van de vier kantoor_id-geleide indexen.
-- • transacties_verkoopdatum_idx (verkoopdatum, zonder kantoor_id) — nooit
--   los bevraagd om dezelfde RLS-reden; vervangen door de nieuwe
--   (kantoor_id, verkoopdatum)-index hierboven, die zowel de kantoor_id-only-
--   als de kantoor_id+verkoopdatum-vorm dekt.
drop index if exists transacties_kantoor_id_idx;
drop index if exists transacties_verkoopdatum_idx;

-- ── 5. `objecten.fase`: 'acquisitie' -> 'verkoopadvies' (besluit Quinn 17 sep) ──
-- Check MOET eerst weg: de oude check staat alleen 'acquisitie' toe (niet
-- 'verkoopadvies'), dus de update hieronder zou zonder deze drop zelf al op
-- de oude constraint stuklopen.
alter table objecten drop constraint if exists objecten_fase_check;

update objecten set fase = 'verkoopadvies' where fase = 'acquisitie';

alter table objecten alter column fase set default 'verkoopadvies';

alter table objecten add constraint objecten_fase_check
  check (fase in ('verkoopadvies', 'in_verkoop', 'verkocht'));

-- Pitch-concept vervalt volledig (item 1.9c, besluit Quinn 17 sep 2026): de
-- kolom werd al nergens meer gelezen of geschreven sinds die commit — nu ook
-- uit het schema. Het droppen van de kolom dropt automatisch de bijbehorende
-- objecten_pitch_uitslag_check.
alter table objecten drop column if exists pitch_uitslag;

-- ── 6. View `transacties_met_coordinaten` bijwerken met de nieuwe kolommen ──
-- (na de kolomtoevoegingen hierboven — de view moet ze kunnen selecteren).
-- security_invoker = true blijft staan (RLS-fix 17 sep 2026, zie
-- 20260916213323_rls_kantoor_isolatie_transacties.sql) — nooit weglaten bij
-- een nieuwe view op transacties.
drop view if exists transacties_met_coordinaten;

create view transacties_met_coordinaten
  with (security_invoker = true)
  as
  select
    id, kantoor_id, adres, postcode, plaats, wijk, buurt, geo,
    verkoopprijs, vraagprijs, verkoopdatum, looptijd_dagen, woningtype,
    woonoppervlak_m2, perceel_m2, inhoud_m3, bouwjaar, energielabel, kamers,
    garage, tuin, buitenruimte, eigen_verkoop, verkopend_kantoor, created_at,
    bron, import_id, adres_sleutel, huisnummer, toevoeging,
    woningtype_groep, woningtype_sub, geocode_status, uitgesloten_reden,
    aankopend_kantoor, verkopend_kantoor_norm, prijs_m2,
    st_y(geo::geometry) as lat,
    st_x(geo::geometry) as lng
  from transacties;

-- Alleen select nodig (view is toch niet updatable door de computed
-- lat/lng-kolommen); service-role bevraagt sowieso met bypass-rechten.
grant select on transacties_met_coordinaten to authenticated;

-- Extra slot naast RLS: Supabase geeft `anon` standaard alle rechten op nieuwe
-- relaties. Geen publieke pagina leest deze twee, dus anon eruit.
revoke all on transacties_met_coordinaten from anon;
revoke all on imports from anon;
