-- RPC's voor de transactiedataset (item 2.2, docs/roadmap.md § 3.1).
-- Doel: `lib/transactiesQuery.ts` wordt de enige plek die `transacties`
-- bevraagt; alles wat over de hele regio gaat (duizenden tot tienduizenden
-- rijen) loopt via deze RPC's i.p.v. een kale `select('*')` die op de
-- PostgREST-limiet van 1.000 rijen strandt.
--
-- Elke RPC: `language sql`, `stable`, `security invoker`,
-- `set search_path = public` — RLS doet de kantoorscheiding (invoker-context,
-- zie CLAUDE.md § transactiedataset). Alles filtert altijd
-- `uitgesloten_reden is null` via de gedeelde helper `transacties_gefilterd`.
--
-- Alleen functies, geen DDL op tabellen en geen DML — mag zelf toegepast
-- worden (zie de item-opdracht).

-- ── Helper: één gedeelde filterlogica op basis van TransactieFilterSchema ───
-- (lib/schemas.ts). `p_filters` is een jsonb-object met optionele velden;
-- ontbrekende/lege velden filteren niet. ⚠️ `makelaars` wordt bewust genegeerd
-- — er is geen makelaar-kolom op `transacties` (zie lib/schemas.ts-commentaar
-- bij TransactieFilterSchema).
create or replace function transacties_gefilterd(p_filters jsonb default '{}'::jsonb)
returns setof transacties
language sql
stable
security invoker
set search_path = public
as $$
  select t.*
  from transacties t
  where t.uitgesloten_reden is null
    and (
      p_filters->'plaatsen' is null or jsonb_array_length(p_filters->'plaatsen') = 0
      or t.plaats = any (select jsonb_array_elements_text(p_filters->'plaatsen'))
    )
    and (
      p_filters->'wijken' is null or jsonb_array_length(p_filters->'wijken') = 0
      or (coalesce(t.plaats, '') || '|' || coalesce(t.wijk, '')) = any (select jsonb_array_elements_text(p_filters->'wijken'))
    )
    and (
      p_filters->'typen' is null or jsonb_array_length(p_filters->'typen') = 0
      or t.woningtype_sub = any (select jsonb_array_elements_text(p_filters->'typen'))
    )
    and (p_filters->>'datum_van' is null or t.verkoopdatum >= (p_filters->>'datum_van')::date)
    and (p_filters->>'datum_tot' is null or t.verkoopdatum <= (p_filters->>'datum_tot')::date)
    and (p_filters->>'prijs_min' is null or t.verkoopprijs >= (p_filters->>'prijs_min')::numeric)
    and (p_filters->>'prijs_max' is null or t.verkoopprijs <= (p_filters->>'prijs_max')::numeric)
    and (p_filters->>'opp_min' is null or t.woonoppervlak_m2 >= (p_filters->>'opp_min')::numeric)
    and (p_filters->>'opp_max' is null or t.woonoppervlak_m2 <= (p_filters->>'opp_max')::numeric)
    and (p_filters->>'perceel_min' is null or t.perceel_m2 >= (p_filters->>'perceel_min')::numeric)
    and (p_filters->>'perceel_max' is null or t.perceel_m2 <= (p_filters->>'perceel_max')::numeric)
    and (p_filters->>'bouwjaar_min' is null or t.bouwjaar >= (p_filters->>'bouwjaar_min')::int)
    and (p_filters->>'bouwjaar_max' is null or t.bouwjaar <= (p_filters->>'bouwjaar_max')::int)
    and (
      p_filters->'energielabels' is null or jsonb_array_length(p_filters->'energielabels') = 0
      or t.energielabel = any (select jsonb_array_elements_text(p_filters->'energielabels'))
    )
    and (p_filters->>'kamers_min' is null or t.kamers >= (p_filters->>'kamers_min')::int)
    and (p_filters->>'tuin' is null or t.tuin = (p_filters->>'tuin')::boolean)
    and (p_filters->>'garage' is null or t.garage = (p_filters->>'garage')::boolean)
    and (
      p_filters->>'tov_vraagprijs' is null or p_filters->>'tov_vraagprijs' = 'alle'
      or (p_filters->>'tov_vraagprijs' = 'boven' and t.verkoopprijs is not null and t.vraagprijs is not null and t.verkoopprijs > t.vraagprijs)
      or (p_filters->>'tov_vraagprijs' = 'op_of_onder' and t.verkoopprijs is not null and t.vraagprijs is not null and t.verkoopprijs <= t.vraagprijs)
    )
    and (p_filters->>'looptijd_max' is null or t.looptijd_dagen <= (p_filters->>'looptijd_max')::int)
    and (
      p_filters->'kantoren' is null or jsonb_array_length(p_filters->'kantoren') = 0
      or t.verkopend_kantoor = any (select jsonb_array_elements_text(p_filters->'kantoren'))
    )
    and (p_filters->>'alleen_eigen' is null or t.eigen_verkoop = (p_filters->>'alleen_eigen')::boolean)
$$;

revoke execute on function transacties_gefilterd(jsonb) from public;
revoke execute on function transacties_gefilterd(jsonb) from anon;
grant execute on function transacties_gefilterd(jsonb) to authenticated;

-- ── marktanalyse_reeks: kwartaalrijen (n, mediaan prijs, mediaan €/m², ─────
-- mediaan looptijd, mediaan % t.o.v. vraagprijs) — lib/marktanalyse.ts
-- naarKwartaalReeks() is de referentie-implementatie voor de vergelijkingstest.
create or replace function marktanalyse_reeks(p_filters jsonb default '{}'::jsonb)
returns table (
  kwartaal text,
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
  select
    (extract(year from t.verkoopdatum))::text || '-Q' || (extract(quarter from t.verkoopdatum))::text as kwartaal,
    count(*)::int as n,
    percentile_cont(0.5) within group (order by t.verkoopprijs) as mediaan_prijs,
    percentile_cont(0.5) within group (order by t.prijs_m2) as mediaan_m2,
    percentile_cont(0.5) within group (order by t.looptijd_dagen) as mediaan_looptijd,
    percentile_cont(0.5) within group (
      order by (case when t.verkoopprijs is not null and t.vraagprijs is not null and t.vraagprijs != 0
                 then (t.verkoopprijs - t.vraagprijs)::numeric / t.vraagprijs * 100 end)
    ) as pct_tov_vraag
  from transacties_gefilterd(p_filters) t
  where t.verkoopdatum is not null
  group by 1
  order by 1
$$;

revoke execute on function marktanalyse_reeks(jsonb) from public;
revoke execute on function marktanalyse_reeks(jsonb) from anon;
grant execute on function marktanalyse_reeks(jsonb) to authenticated;

-- ── marktanalyse_samenvatting: dezelfde cijfers voor de gevraagde periode ──
-- (p_filters.datum_van/datum_tot, of de volledige gefilterde dataset zonder
-- die twee) én voor de even lange, direct voorafgaande periode (voor de
-- delta in de UI).
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
    select * from transacties_gefilterd(p_filters)
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

-- ── concurrentie_marktaandeel: aandeel per kantoor — referentie-implementatie
-- is lib/concurrentie.ts marktaandeel() (eigen_verkoop -> "Eigen kantoor",
-- anders verkopend_kantoor getrimd of "Onbekend").
create or replace function concurrentie_marktaandeel(p_filters jsonb default '{}'::jsonb)
returns table (kantoor text, aantal integer, aandeel_pct numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor), ''), 'Onbekend')
      end as kantoor
    from transacties_gefilterd(p_filters) t
  ),
  totaal as (select count(*)::numeric as n from basis)
  select
    b.kantoor,
    count(*)::int as aantal,
    round((count(*)::numeric / nullif((select n from totaal), 0)) * 100, 1) as aandeel_pct
  from basis b
  group by b.kantoor
  order by count(*) desc
$$;

revoke execute on function concurrentie_marktaandeel(jsonb) from public;
revoke execute on function concurrentie_marktaandeel(jsonb) from anon;
grant execute on function concurrentie_marktaandeel(jsonb) to authenticated;

-- ── concurrentie_segmenten: per woningtype het kantoor met de meeste
-- verkopen — referentie-implementatie is lib/concurrentie.ts
-- wieWintWelkSegment().
create or replace function concurrentie_segmenten(p_filters jsonb default '{}'::jsonb)
returns table (segment text, winnaar text, aantal integer)
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select
      coalesce(t.woningtype, 'Onbekend') as segment,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor), ''), 'Onbekend')
      end as kantoor
    from transacties_gefilterd(p_filters) t
  ),
  per_segment_kantoor as (
    select segment, kantoor, count(*)::int as aantal
    from basis
    group by segment, kantoor
  ),
  gerangschikt as (
    select segment, kantoor, aantal,
      row_number() over (partition by segment order by aantal desc, kantoor asc) as rn
    from per_segment_kantoor
  )
  select segment, kantoor as winnaar, aantal
  from gerangschikt
  where rn = 1
  order by segment
$$;

revoke execute on function concurrentie_segmenten(jsonb) from public;
revoke execute on function concurrentie_segmenten(jsonb) from anon;
grant execute on function concurrentie_segmenten(jsonb) to authenticated;

-- ── transacties_zoeken: gepagineerd + gesorteerd, geeft ook het totaal mee
-- (in één trip, als jsonb: { totaal, rijen[] }) — zodat de "transacties
-- opzoeken"-pagina niet langer aan de PostgREST-limiet van 1.000 rijen vastzit.
create or replace function transacties_zoeken(
  p_filters jsonb default '{}'::jsonb,
  p_sortering text default 'verkoopdatum_desc',
  p_limiet integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select * from transacties_gefilterd(p_filters)
  ),
  geteld as (
    select count(*) as totaal from basis
  ),
  pagina as (
    select *
    from basis
    order by
      case when p_sortering = 'verkoopdatum_asc' then verkoopdatum end asc nulls last,
      case when p_sortering = 'prijs_desc' then verkoopprijs end desc nulls last,
      case when p_sortering = 'prijs_asc' then verkoopprijs end asc nulls last,
      case when p_sortering = 'looptijd_desc' then looptijd_dagen end desc nulls last,
      case when p_sortering = 'looptijd_asc' then looptijd_dagen end asc nulls last,
      case when p_sortering is null or p_sortering = 'verkoopdatum_desc' then verkoopdatum end desc nulls last,
      id asc
    limit greatest(coalesce(p_limiet, 50), 0)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'totaal', (select totaal from geteld),
    'rijen', coalesce((select jsonb_agg(to_jsonb(p)) from pagina p), '[]'::jsonb)
  )
$$;

revoke execute on function transacties_zoeken(jsonb, text, integer, integer) from public;
revoke execute on function transacties_zoeken(jsonb, text, integer, integer) from anon;
grant execute on function transacties_zoeken(jsonb, text, integer, integer) to authenticated;

-- ── prijsindex_kwartaal: mediaan €/m² per kwartaal, vóór het gladstrijken
-- (dat blijft client-side, lib/prijsindex.ts glad()) — vorm gelijk aan de
-- `ruw`-array die bouwIndex() intern opbouwt (kwartaal, n, mediaanM2).
create or replace function prijsindex_kwartaal(p_filters jsonb default '{}'::jsonb)
returns table (kwartaal text, n integer, mediaan_m2 numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (extract(year from t.verkoopdatum))::text || '-Q' || (extract(quarter from t.verkoopdatum))::text as kwartaal,
    count(*)::int as n,
    percentile_cont(0.5) within group (order by t.prijs_m2) as mediaan_m2
  from transacties_gefilterd(p_filters) t
  where t.verkoopdatum is not null and t.woonoppervlak_m2 is not null and t.woonoppervlak_m2 > 0
  group by 1
  order by 1
$$;

revoke execute on function prijsindex_kwartaal(jsonb) from public;
revoke execute on function prijsindex_kwartaal(jsonb) from anon;
grant execute on function prijsindex_kwartaal(jsonb) to authenticated;

-- ── referenties_in_straal: kandidaten voor de waardering (§ 3.3) — vorm
-- gelijk aan `Kandidaat` in lib/waardering.ts, met `afstand_m` via
-- ST_Distance en de straalfilter via ST_DWithin op `geo`.
create or replace function referenties_in_straal(
  p_lat double precision,
  p_lng double precision,
  p_straal_m double precision,
  p_filters jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  adres text,
  plaats text,
  woningtype_groep text,
  woningtype_sub text,
  verkoopprijs integer,
  woonoppervlak_m2 integer,
  bouwjaar integer,
  verkoopdatum date,
  afstand_m double precision,
  lat double precision,
  lng double precision,
  garage boolean,
  tuin boolean,
  energielabel text,
  verkopend_kantoor text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.id, t.adres, t.plaats, t.woningtype_groep, t.woningtype_sub,
    t.verkoopprijs, t.woonoppervlak_m2, t.bouwjaar, t.verkoopdatum,
    st_distance(t.geo, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as afstand_m,
    st_y(t.geo::geometry) as lat,
    st_x(t.geo::geometry) as lng,
    t.garage, t.tuin, t.energielabel, t.verkopend_kantoor
  from transacties_gefilterd(p_filters) t
  where t.geo is not null
    and st_dwithin(t.geo, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_straal_m)
  order by afstand_m asc
$$;

revoke execute on function referenties_in_straal(double precision, double precision, double precision, jsonb) from public;
revoke execute on function referenties_in_straal(double precision, double precision, double precision, jsonb) from anon;
grant execute on function referenties_in_straal(double precision, double precision, double precision, jsonb) to authenticated;
