-- VestaAI initieel schema

create extension if not exists "uuid-ossp";

-- Makelaarskantoren
create table kantoren (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  plan          text check (plan in ('solo', 'kantoor', 'franchise')),
  logo_url      text,
  huisstijl_json jsonb,
  stripe_id     text,
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Makelaars (gekoppeld aan Supabase Auth users)
create table makelaars (
  id          uuid primary key references auth.users(id) on delete cascade,
  kantoor_id  uuid not null references kantoren(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'makelaar' check (role in ('admin', 'makelaar')),
  created_at  timestamptz not null default now()
);

-- Gegenereerde objecten
create table objecten (
  id           uuid primary key default uuid_generate_v4(),
  kantoor_id   uuid not null references kantoren(id) on delete cascade,
  makelaar_id  uuid not null references makelaars(id) on delete cascade,
  address      text not null,
  input_json   jsonb not null,
  outputs_json jsonb not null,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  created_at   timestamptz not null default now()
);

-- Indexen
create index objecten_kantoor_id_idx on objecten(kantoor_id);
create index objecten_created_at_idx on objecten(created_at desc);
create index makelaars_kantoor_id_idx on makelaars(kantoor_id);

-- Row Level Security
alter table kantoren enable row level security;
alter table makelaars enable row level security;
alter table objecten enable row level security;

-- Makelaars mogen hun eigen kantoor zien/bijwerken
create policy "makelaar ziet eigen kantoor"
  on kantoren for select
  using (
    id in (select kantoor_id from makelaars where id = auth.uid())
  );

create policy "admin mag kantoor bijwerken"
  on kantoren for update
  using (
    id in (select kantoor_id from makelaars where id = auth.uid() and role = 'admin')
  );

-- Makelaars mogen hun eigen profiel zien; admins zien het hele kantoor
create policy "makelaar ziet zichzelf"
  on makelaars for select
  using (id = auth.uid());

create policy "makelaar ziet kantoorgenoten"
  on makelaars for select
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

-- Objecten: alle kantoorgenoten mogen lezen; makelaar mag eigen objecten schrijven
create policy "makelaar ziet kantoor-objecten"
  on objecten for select
  using (
    kantoor_id in (select kantoor_id from makelaars where id = auth.uid())
  );

create policy "makelaar mag object aanmaken"
  on objecten for insert
  with check (makelaar_id = auth.uid());

create policy "makelaar mag eigen object wijzigen"
  on objecten for update
  using (makelaar_id = auth.uid());
