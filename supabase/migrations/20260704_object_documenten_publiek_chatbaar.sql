-- Per-document opt-in voor de publieke object-chatbot (/chat/[objectId]).
-- Default false = privé: een document verschijnt pas in de publieke chat als de makelaar het bewust aanzet.
-- Reeds toegepast op productie via Supabase op 2026-07-04.
alter table public.object_documenten
  add column if not exists publiek_chatbaar boolean not null default false;

comment on column public.object_documenten.publiek_chatbaar is
  'Als true: dit document mag als kennisbron gebruikt worden in de publieke object-chatbot (/chat/[objectId]). Default false = privé.';
