-- SEO-pagina's per wijk
create table if not exists wijken (
  slug text primary key,
  naam text not null,
  stad text not null,
  seo_tekst text not null default '',
  actief boolean not null default true,
  bijgewerkt_op timestamptz not null default now()
);

-- Publiek leesbaar (voor de SEO-pagina's en sitemap)
alter table wijken enable row level security;

create policy "Publiek leesbaar" on wijken
  for select using (actief = true);

create policy "Service role kan alles" on wijken
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
