-- Fix (review item 6.1, 24 sep 2026): `marktanalyse_samenvatting` gaf altijd
-- `vorig.n = 0` zodra `p_filters` een expliciete `datum_van`/`datum_tot` bevat
-- (elke periode-preset behalve "Alles") — StatTiles toonden daardoor overal
-- "geen vergelijking" i.p.v. een echte delta, ook al is er ruim voldoende
-- historische data.
--
-- Oorzaak: `basis` in de oorspronkelijke functie
-- (20260917_rpc_transacties.sql) was `select * from
-- transacties_gefilterd(p_filters)` — en `transacties_gefilterd()` past
-- `datum_van`/`datum_tot` uit datzelfde `p_filters` ZELF ook al toe (zie de
-- helper). Zodra je een periode meegeeft, bevat `basis` dus al uitsluitend
-- rijen uit de huidige periode, en de `left join ... on b.verkoopdatum
-- between v.van and v.tot` voor de vorige periode kan dan nooit meer iets
-- vinden — `basis` bevat simpelweg geen rijen van vóór de huidige periode.
-- Bevestigd met een read-only query op productie (24 sep): dezelfde
-- rijenset zonder de datumsleutels bevat wél 1.198 transacties in de
-- "vorige periode"-vensters van het demo-kantoor.
--
-- Fix: bouw `basis` op `p_filters` MINUS `datum_van`/`datum_tot` (jsonb
-- `-`-operator strip die twee sleutels), zodat de basis alle overige
-- filters (plaats/type/prijs/…) toepast maar over de volledige tijdreeks
-- blijft — de datumfilter voor "huidig" en "vorig" gebeurt uitsluitend via
-- de bestaande `between`-joins hieronder, ongewijzigd. Bij "Alles" (geen
-- datum_van/datum_tot in de filter) verandert er niets: `grenzen` valt dan
-- nog steeds terug op min/max van diezelfde (nu ongedateerde, maar dat was
-- hij toen ook al) basis.
--
-- Puur een `create or replace function` — geen schema-wijziging, dus veilig
-- additief toe te passen (CLAUDE.md § Eén database, twee codeversies).

create or replace function marktanalyse_samenvatting(p_filters jsonb default '{}'::jsonb)
returns table (
  periode text,
  van date,
  tot date,
  n integer,
  mediaan_prijs numeric,
  mediaan_m2 numeric,
  mediaan_looptijd numeric,
  pct_tov_vraag numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select * from transacties_gefilterd(p_filters - 'datum_van' - 'datum_tot')
  ),
  grenzen as (
    select
      coalesce((p_filters->>'datum_van')::date, (select min(verkoopdatum) from basis)) as van,
      coalesce((p_filters->>'datum_tot')::date, (select max(verkoopdatum) from basis)) as tot
  ),
  huidig_span as (
    select van, tot from grenzen where van is not null and tot is not null
  ),
  vorig_span as (
    select (van - ((tot - van) + 1))::date as van, (van - 1)::date as tot from huidig_span
  )
  select
    'huidig'::text as periode, h.van, h.tot,
    count(b.*)::int as n,
    percentile_cont(0.5) within group (order by b.verkoopprijs) as mediaan_prijs,
    percentile_cont(0.5) within group (order by b.prijs_m2) as mediaan_m2,
    percentile_cont(0.5) within group (order by b.looptijd_dagen) as mediaan_looptijd,
    percentile_cont(0.5) within group (
      order by (case when b.verkoopprijs is not null and b.vraagprijs is not null and b.vraagprijs != 0
                 then (b.verkoopprijs - b.vraagprijs)::numeric / b.vraagprijs * 100 end)
    ) as pct_tov_vraag
  from huidig_span h
  left join basis b on b.verkoopdatum between h.van and h.tot
  group by h.van, h.tot
  union all
  select
    'vorig'::text as periode, v.van, v.tot,
    count(b.*)::int as n,
    percentile_cont(0.5) within group (order by b.verkoopprijs) as mediaan_prijs,
    percentile_cont(0.5) within group (order by b.prijs_m2) as mediaan_m2,
    percentile_cont(0.5) within group (order by b.looptijd_dagen) as mediaan_looptijd,
    percentile_cont(0.5) within group (
      order by (case when b.verkoopprijs is not null and b.vraagprijs is not null and b.vraagprijs != 0
                 then (b.verkoopprijs - b.vraagprijs)::numeric / b.vraagprijs * 100 end)
    ) as pct_tov_vraag
  from vorig_span v
  left join basis b on b.verkoopdatum between v.van and v.tot
  group by v.van, v.tot
$$;

revoke execute on function marktanalyse_samenvatting(jsonb) from public;
revoke execute on function marktanalyse_samenvatting(jsonb) from anon;
grant execute on function marktanalyse_samenvatting(jsonb) to authenticated;
