-- Transactiedataset voor waardering, marktinzichten en de verkoopkaart (F4,
-- zie CLAUDE.md § Hoofdstructuur en docs/roadmap.md § Blokkades). Gevuld door
-- de platform-admin via een importscherm in /admin — het kantoor importeert
-- zelf niets (concierge-model). Schema is een eerste opzet op basis van het
-- besproken kolommenplan; wordt scherpgesteld zodra de echte Realworks-export
-- er is.
create extension if not exists postgis;

create table if not exists transacties (
  id uuid primary key default gen_random_uuid(),
  kantoor_id uuid not null references kantoren(id) on delete cascade,

  adres text not null,
  postcode text,
  plaats text,
  wijk text,
  buurt text,
  -- WGS84 punt — voedt de straal-query (ST_DWithin) voor de verkoopkaart en
  -- de referentieselectie in de waardering.
  geo geography(Point, 4326),

  verkoopprijs integer,
  vraagprijs integer,
  verkoopdatum date,
  looptijd_dagen integer,

  woningtype text,
  woonoppervlak_m2 integer,
  perceel_m2 integer,
  inhoud_m3 integer,
  bouwjaar integer,
  energielabel text,
  kamers integer,
  garage boolean,
  tuin boolean,
  buitenruimte text,

  -- Bepaalt wat op de verkoopkaart een vlaggetje krijgt (besluit 16 sep 2026:
  -- alleen eigen verkopen van het kantoor, niet de hele regio). De rest van
  -- de dataset (grotere referentiebasis, ook van andere kantoren) voedt wél
  -- de waardering en marktanalyse.
  eigen_verkoop boolean not null default true,
  -- Optioneel: alleen gevuld als de bron dit meegeeft. Voedt de
  -- concurrentieanalyse zonder aparte Brainbay-import, zodra bevestigd dat
  -- de Realworks-export dit veld bevat.
  verkopend_kantoor text,

  created_at timestamptz not null default now()
);

create index if not exists transacties_kantoor_id_idx on transacties (kantoor_id);
create index if not exists transacties_geo_idx on transacties using gist (geo);
create index if not exists transacties_verkoopdatum_idx on transacties (verkoopdatum);
create index if not exists transacties_eigen_verkoop_idx on transacties (kantoor_id, eigen_verkoop);

-- Natuurlijke sleutel voor herhaalbare (maandelijkse) herimport: dezelfde
-- transactie opnieuw aanleveren werkt als upsert i.p.v. een dubbele rij.
create unique index if not exists transacties_natuurlijke_sleutel_idx
  on transacties (kantoor_id, adres, coalesce(verkoopdatum, '1900-01-01'::date));
