-- Inline-bewerkingen van makelaars vastleggen als gratis trainingsdata voor de huisstijl.
-- Per bewerking het origineel + de bewerkte versie; na destillatie + review markeren als verwerkt.
create table if not exists public.stijl_bewerkingen (
  id uuid primary key default uuid_generate_v4(),
  kantoor_id uuid not null references public.kantoren(id) on delete cascade,
  object_id uuid references public.objecten(id) on delete set null,
  sleutel text not null,
  origineel text not null,
  bewerkt text not null,
  verwerkt boolean not null default false,
  created_at timestamptz not null default now()
);

-- Snel de onverwerkte bewerkingen per kantoor opvragen.
create index if not exists stijl_bewerkingen_kantoor_onverwerkt_idx
  on public.stijl_bewerkingen (kantoor_id) where verwerkt = false;
