-- Foto-bibliotheek per object: bewaarde verbeterde/gestagede foto's (voorheen vluchtig, alleen base64).
create table if not exists public.object_fotos (
  id uuid primary key default uuid_generate_v4(),
  object_id uuid not null references public.objecten(id) on delete cascade,
  kantoor_id uuid not null references public.kantoren(id) on delete cascade,
  url text not null,
  storage_pad text not null,
  soort text not null default 'verbeterd',
  bestandsnaam text,
  created_at timestamptz not null default now()
);

create index if not exists object_fotos_object_idx on public.object_fotos (object_id);
