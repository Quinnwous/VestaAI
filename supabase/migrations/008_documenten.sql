-- Juridische documenten per object (VVE-notulen, leveringsakte, etc.)
create table if not exists object_documenten (
  id           uuid primary key default uuid_generate_v4(),
  object_id    uuid references objecten(id) on delete cascade,
  kantoor_id   uuid not null references kantoren(id) on delete cascade,
  bestandsnaam text not null,
  storage_pad  text not null,
  mime_type    text not null,
  grootte_bytes bigint not null,
  -- Anthropic Files API file_id voor hergebruik in Claude-calls
  anthropic_file_id text,
  created_at   timestamptz not null default now()
);

create index if not exists obj_doc_object_idx on object_documenten(object_id) where object_id is not null;
create index if not exists obj_doc_kantoor_idx on object_documenten(kantoor_id);

alter table object_documenten enable row level security;

create policy "makelaar ziet kantoor-documenten"
  on object_documenten for select
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

create policy "makelaar mag document toevoegen"
  on object_documenten for insert
  with check (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

create policy "makelaar mag eigen document verwijderen"
  on object_documenten for delete
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));
