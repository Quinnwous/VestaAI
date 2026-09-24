-- Item 6.1 (Marktanalyse-explorer v2, docs/roadmap.md § 5 Fase 6) — twee
-- additieve RPC's naast de bestaande 20260917_rpc_transacties.sql, zelfde
-- patroon (`transacties_gefilterd`, `language sql`, `stable`,
-- `security invoker`, `set search_path = public`). NIET toegepast door de
-- bouwende agent — vereist Quinns akkoord/toepassing door de hoofdsessie
-- (CLAUDE.md § Vangrails productiedatabase: additieve migraties mogen
-- tussendoor, maar deze wordt hier bewust alleen aangeleverd).
--
-- 1. marktanalyse_verdeling_prijsklasse: telling per prijsklasse (totaal +
--    eigen verkopen) voor de "verdeling naar prijsklasse"-staven. De zes
--    klassegrenzen zijn identiek aan `PRIJSKLASSEN` in lib/marktanalyse.ts —
--    bij een wijziging daar, hier meenemen.
-- 2. transacties_plaatsen_wijken: distincte plaats/wijk-combinaties + aantal,
--    voor de plaats/wijk-dropdown (i.p.v. een hardgecodeerde lijst zoals in
--    het ontwerp-prototype, dat een fictieve PLAATSEN-array gebruikt).

create or replace function marktanalyse_verdeling_prijsklasse(p_filters jsonb default '{}'::jsonb)
returns table (klasse text, label text, n integer, n_eigen integer)
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select
      t.verkoopprijs,
      t.eigen_verkoop,
      case
        when t.verkoopprijs is null then null
        when t.verkoopprijs < 500000 then 'k1'
        when t.verkoopprijs < 750000 then 'k2'
        when t.verkoopprijs < 1000000 then 'k3'
        when t.verkoopprijs < 1500000 then 'k4'
        when t.verkoopprijs < 2500000 then 'k5'
        else 'k6'
      end as klasse
    from transacties_gefilterd(p_filters) t
  ),
  klassen (klasse, label, volgorde) as (
    values
      ('k1', '< € 500 k', 1),
      ('k2', '€ 500 – 750 k', 2),
      ('k3', '€ 750 k – 1 mln', 3),
      ('k4', '€ 1 – 1,5 mln', 4),
      ('k5', '€ 1,5 – 2,5 mln', 5),
      ('k6', '> € 2,5 mln', 6)
  )
  select
    k.klasse,
    k.label,
    count(b.*)::int as n,
    count(b.*) filter (where b.eigen_verkoop)::int as n_eigen
  from klassen k
  left join basis b on b.klasse = k.klasse
  group by k.klasse, k.label, k.volgorde
  order by k.volgorde
$$;

revoke execute on function marktanalyse_verdeling_prijsklasse(jsonb) from public;
revoke execute on function marktanalyse_verdeling_prijsklasse(jsonb) from anon;
grant execute on function marktanalyse_verdeling_prijsklasse(jsonb) to authenticated;

create or replace function transacties_plaatsen_wijken()
returns table (plaats text, wijk text, n integer)
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(t.plaats, 'Onbekend') as plaats, t.wijk, count(*)::int as n
  from transacties t
  where t.uitgesloten_reden is null
  group by t.plaats, t.wijk
  order by t.plaats, t.wijk nulls first
$$;

revoke execute on function transacties_plaatsen_wijken() from public;
revoke execute on function transacties_plaatsen_wijken() from anon;
grant execute on function transacties_plaatsen_wijken() to authenticated;
