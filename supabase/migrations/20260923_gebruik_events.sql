-- Item 10.4 (docs/roadmap.md § Fase 10): gebruikslogboek per makelaar, voedt
-- "Recent bekeken" op /dashboard (lib/gebruik.ts). Puur additief — nieuwe
-- tabel, raakt geen bestaande kolom of waarde (zie CLAUDE.md ⚠️ "Eén
-- database, twee codeversies"), dus los van een codepush toe te passen.
--
-- RLS-grens is per kantoor (net als transacties, migratie
-- 20260916213323_rls_kantoor_isolatie_transacties.sql): select levert alle
-- events van het eigen kantoor, niet automatisch beperkt tot de ingelogde
-- makelaar zelf — lib/gebruik.ts filtert voor "Recent bekeken" bovendien op
-- makelaar_id, zodat je nooit de kijkgeschiedenis van een collega ziet. Dat
-- extra filter is een applicatiefilter, geen RLS-grens (net zoals bij
-- transacties de rij-voor-rij scheiding binnen één kantoor ook niet via RLS
-- afgedwongen wordt). Insert is wél hard aan de eigen makelaar gebonden: je
-- kunt nooit een event namens een collega of een ander kantoor loggen.
--
-- ⚠️ Deze migratie is NIET toegepast door de subagent die haar schreef — de
-- hoofdsessie past hem toe via apply_migration. lib/gebruik.ts faalt intussen
-- stil (console.warn) zolang de tabel nog niet bestaat: logGebruik() logt
-- niets, haalRecentBekekenOp() geeft een lege lijst, "Recent bekeken" toont
-- gewoon zijn lege staat.

create table if not exists public.gebruik_events (
  id          uuid primary key default gen_random_uuid(),
  kantoor_id  uuid not null references public.kantoren(id) on delete cascade,
  makelaar_id uuid not null references public.makelaars(id) on delete cascade,
  object_id   uuid references public.objecten(id) on delete set null,
  -- Vaste set — zie GEBRUIK_EVENT_TYPES in lib/gebruik.ts. Vooralsnog alleen
  -- het openen van een dossier; een nieuw event-type breidt zowel deze
  -- check-constraint als de TypeScript-union uit.
  type        text not null check (type in ('dossier_bekeken')),
  created_at  timestamptz not null default now()
);

-- "Recent bekeken" (per makelaar, nieuwste eerst) en een eventueel toekomstig
-- kantoorbreed gebruiksoverzicht draaien allebei op deze volgorde.
create index if not exists gebruik_events_kantoor_makelaar_idx
  on public.gebruik_events (kantoor_id, makelaar_id, created_at desc);

alter table public.gebruik_events enable row level security;

create policy "makelaar leest events van eigen kantoor"
  on public.gebruik_events for select
  to authenticated
  using (kantoor_id = my_kantoor_id());

create policy "makelaar logt alleen eigen events"
  on public.gebruik_events for insert
  to authenticated
  with check (kantoor_id = my_kantoor_id() and makelaar_id = auth.uid());
