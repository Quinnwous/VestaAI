-- Object-gebonden leads (deel-chatbot) + telefoonnummer.
-- object_id nullable: de kantoorbrede widget-chatbot blijft leads zonder object aanleveren.
alter table public.chatbot_leads
  add column if not exists object_id uuid references public.objecten(id) on delete set null,
  add column if not exists telefoon text;

create index if not exists chatbot_leads_object_id_idx on public.chatbot_leads(object_id);
