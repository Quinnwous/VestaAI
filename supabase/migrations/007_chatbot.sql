-- AI chatbot: FAQ-configuratie per kantoor + leads uit chatgesprekken

-- FAQ-items die de chatbot gebruikt als kennisbasis
create table if not exists chatbot_faq (
  id          uuid primary key default uuid_generate_v4(),
  kantoor_id  uuid not null references kantoren(id) on delete cascade,
  vraag       text not null,
  antwoord    text not null,
  volgorde    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists chatbot_faq_kantoor_idx on chatbot_faq(kantoor_id, volgorde);

alter table chatbot_faq enable row level security;

create policy "makelaar ziet kantoor-faq"
  on chatbot_faq for select
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

create policy "admin mag faq beheren"
  on chatbot_faq for all
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid() and role = 'admin'));

-- Leads (bezoekers die hun e-mail achterlaten via de chatbot)
create table if not exists chatbot_leads (
  id          uuid primary key default uuid_generate_v4(),
  kantoor_id  uuid not null references kantoren(id) on delete cascade,
  naam        text,
  email       text not null,
  bericht     text,
  created_at  timestamptz not null default now()
);

create index if not exists chatbot_leads_kantoor_idx on chatbot_leads(kantoor_id);

alter table chatbot_leads enable row level security;

create policy "makelaar ziet kantoor-leads"
  on chatbot_leads for select
  using (kantoor_id in (select kantoor_id from makelaars where id = auth.uid()));

-- Publiek: iedereen mag een lead aanmaken (widget op externe websites)
create policy "publiek mag lead aanmaken"
  on chatbot_leads for insert
  with check (true);
