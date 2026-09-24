-- Database-hardening (roadmap § 9 "Database-hardening", security-advisor 17 sep 2026).
--
-- ⚠️ NOG NIET TOEGEPAST — niet additief (trekt rechten in, dropt een trigger),
-- dus akkoord-plichtig (CLAUDE.md § Vangrails). Eerst `scripts/backup-data.mjs`.
--
-- Waarom introspectie i.p.v. vaste namen: de documentatie spreekt zichzelf tegen
-- (schema-baseline.sql: "geen trigger meer op auth.users, geverifieerd 17 sep";
-- roadmap § 9: de trigger maakte op 17 sep nog een proefkantoor aan bij de
-- demo-fixture) en de argumentlijsten van de functies staan nergens vast. Deze
-- migratie zoekt beide zelf op in de catalogus, en is daardoor idempotent en
-- correct in beide gevallen.
--
-- Veilig voor de app:
-- • Accounts ontstaan alleen via /admin: `plaatsInKantoor()` (app/admin/actions.ts)
--   werkt met én zonder de makelaars-rij die de trigger aanmaakte; hetzelfde
--   geldt voor `plaatsDemoMakelaar()` in scripts/seed-demo-kantoor.mjs.
-- • `my_kantoor_id()`/`is_kantoor_admin()` worden alleen in policies "to
--   authenticated" gebruikt; anon bevraagt geen van die tabellen (de kantoorlogin
--   gebruikt de RPC `kantoor_branding_publiek`). service_role omzeilt RLS.
-- • Trigger- en event-triggerfuncties worden bij het afgaan niet op EXECUTE
--   gecontroleerd, dus `rls_auto_enable()` blijft werken als event trigger.

-- 1. Elke trigger op auth.users die handle_new_user() aanroept: weg.
do $$
declare
  t record;
begin
  for t in
    select tg.tgname
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    where tg.tgrelid = 'auth.users'::regclass
      and p.proname = 'handle_new_user'
      and not tg.tgisinternal
  loop
    execute format('drop trigger %I on auth.users', t.tgname);
    raise notice 'trigger % op auth.users verwijderd', t.tgname;
  end loop;
end $$;

-- 2. EXECUTE intrekken voor anon (en via PUBLIC); de twee dode functies ook
--    voor authenticated. De twee RLS-hulpfuncties expliciet terug naar
--    authenticated en service_role, want die erfden het via PUBLIC.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('handle_new_user', 'rls_auto_enable', 'my_kantoor_id', 'is_kantoor_admin')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname in ('handle_new_user', 'rls_auto_enable') then
      execute format('revoke execute on function %s from authenticated', f.sig);
    else
      execute format('grant execute on function %s to authenticated, service_role', f.sig);
    end if;
    raise notice 'rechten aangescherpt: %', f.sig;
  end loop;
end $$;

-- Controle na toepassen (verwacht: geen rijen bij 1, alleen authenticated/
-- service_role/postgres bij 2):
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
--   select p.proname, r.rolname
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   cross join pg_roles r
--   where n.nspname = 'public'
--     and p.proname in ('handle_new_user','rls_auto_enable','my_kantoor_id','is_kantoor_admin')
--     and r.rolname in ('anon','authenticated','service_role')
--     and has_function_privilege(r.oid, p.oid, 'execute');
