-- Publieke object-chatbot per woning aan/uit + optionele cover-foto voor de chatpagina.
-- chat_publiek default true = huidig gedrag (bereikbaar via de gedeelde link) blijft behouden;
-- de makelaar kan het per woning uitzetten.
-- Reeds toegepast op productie via Supabase op 2026-07-04.
alter table public.objecten
  add column if not exists chat_publiek boolean not null default true,
  add column if not exists chat_foto_url text;

comment on column public.objecten.chat_publiek is
  'Als false: de publieke object-chatpagina (/chat/[id]) toont "niet beschikbaar". Default true.';
comment on column public.objecten.chat_foto_url is
  'Optionele cover-foto (Storage public URL) die bovenaan de publieke chatpagina getoond wordt.';
