-- Fix: trg_referral_code faalde binnen handle_new_user omdat gen_random_bytes in
-- het extensions-schema leeft en de aanroep ongekwalificeerd was onder search_path
-- 'public'. Gevolg: sinds 1 juli maakte de signup-trigger stil géén kantoor/
-- makelaar-records aan (het self-heal-vangnet ving dit op bij het eerste
-- dashboard-bezoek). Twee reparaties:
-- 1. generate_referral_code: gekwalificeerde aanroep + eigen search_path.
create or replace function public.generate_referral_code()
returns trigger
language plpgsql
set search_path to 'public', 'extensions'
as $function$
declare
  new_code varchar(8);
  collision boolean := true;
begin
  while collision loop
    new_code := upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8));
    collision := exists (select 1 from public.kantoren where referral_code = new_code);
  end loop;
  new.referral_code := new_code;
  return new;
end;
$function$;

-- 2. handle_new_user: fouten voortaan als warning loggen i.p.v. stil inslikken.
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
  insert into public.kantoren (name, trial_ends_at)   -- proef: 30 dagen, plan blijft null
    values (coalesce(nullif(initcap(split_part(split_part(new.email,'@',2),'.',1)),''),'Kantoor'),
            now() + interval '30 days')
    returning id into v_kantoor_id;
  insert into public.makelaars (id, kantoor_id, name, email, role)
    values (new.id, v_kantoor_id,
            coalesce(nullif(initcap(split_part(new.email,'@',1)),''),'Makelaar'),
            new.email, 'admin');
  return new;
exception when others then
  raise warning 'handle_new_user faalde voor %: % (%)', new.email, sqlerrm, sqlstate;
  return new; -- signup nooit blokkeren
end $function$;
