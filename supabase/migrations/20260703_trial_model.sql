-- Proefperiode-model: elke nieuwe gebruiker start met 14 dagen proef (5 objecten
-- totaal, afgedwongen in de app). 'gratis' wordt een echt planniveau (5/maand,
-- geen einddatum), toegewezen door de platform-admin.
alter table public.kantoren drop constraint if exists kantoren_plan_check;
alter table public.kantoren add constraint kantoren_plan_check
  check (plan = any (array['starter'::text, 'pro'::text, 'kantoor'::text, 'gratis'::text]));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_kantoor_id uuid;
begin
  if exists (select 1 from public.makelaars where id = new.id) then
    return new;
  end if;
  insert into public.kantoren (name, trial_ends_at)   -- proef: 14 dagen, plan blijft null
    values (coalesce(nullif(initcap(split_part(split_part(new.email,'@',2),'.',1)),''),'Kantoor'),
            now() + interval '14 days')
    returning id into v_kantoor_id;
  insert into public.makelaars (id, kantoor_id, name, email, role)
    values (new.id, v_kantoor_id,
            coalesce(nullif(initcap(split_part(new.email,'@',1)),''),'Makelaar'),
            new.email, 'admin');
  return new;
exception when others then
  return new; -- signup nooit blokkeren
end $function$;
