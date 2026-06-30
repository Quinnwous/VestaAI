-- Content calendar: geplande social media posts per object
create table if not exists post_planning (
  id           uuid primary key default uuid_generate_v4(),
  kantoor_id   uuid not null references kantoren(id) on delete cascade,
  object_id    uuid references objecten(id) on delete set null,
  platform     text not null check (platform in ('instagram', 'linkedin', 'email', 'overig')),
  content      text not null,
  gepland_op   timestamptz not null,
  status       text not null default 'gepland' check (status in ('gepland', 'gepubliceerd', 'geannuleerd')),
  notitie      text,
  created_at   timestamptz not null default now()
);

create index if not exists post_planning_kantoor_idx on post_planning(kantoor_id);
create index if not exists post_planning_datum_idx on post_planning(gepland_op);
create index if not exists post_planning_object_idx on post_planning(object_id) where object_id is not null;

alter table post_planning enable row level security;

create policy "makelaar ziet kantoor-planning"
  on post_planning for select
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

create policy "makelaar mag planning aanmaken"
  on post_planning for insert
  with check (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

create policy "makelaar mag planning bijwerken"
  on post_planning for update
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

create policy "makelaar mag planning verwijderen"
  on post_planning for delete
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));
