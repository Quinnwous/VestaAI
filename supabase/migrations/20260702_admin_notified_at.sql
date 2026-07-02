-- Eénmalige melding aan de platform-admin per kantoor ("nieuwe klant wacht op
-- activering"). Null = nog niet gemeld. Backfill: bestaande kantoren zijn al
-- bekend bij de admin en mogen nooit alsnog een melding veroorzaken.
alter table public.kantoren add column if not exists admin_notified_at timestamptz;

update public.kantoren set admin_notified_at = now() where admin_notified_at is null;
