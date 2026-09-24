-- RPC's voor de concurrentieanalyse v2 (item 6.3, docs/roadmap.md § 5 Fase 6
-- — port van docs/ontwerp/concurrentie.html). Additief, alleen nieuwe
-- functies, geen DDL op tabellen en geen DML.
--
-- ⚠️ NOG NIET TOEGEPAST — is met opzet niet via apply_migration uitgevoerd
-- (agent-opdracht 6.3: "niet toepassen, melden"). Handmatig valideren
-- (SQL is al logisch getest tegen echte, RLS-gescopede productiedata via
-- ad-hoc SELECT's — geen schemawijziging, alleen leesqueries) en toepassen
-- zodra Quinn akkoord geeft. Tot die tijd geeft de app een nette
-- "nog niet beschikbaar"-staat (zie ConcurrentieExplorer.tsx `.catch()`).
--
-- Werkt op `verkopend_kantoor_norm` (kleine letters, gedeeld met de import-
-- normalisatie) i.p.v. het rauwe `verkopend_kantoor` dat de oudere
-- `concurrentie_marktaandeel`/`concurrentie_segmenten` (migratie
-- 20260917_rpc_transacties.sql) gebruiken — twee schrijfwijzen van dezelfde
-- naam ("Wassenaar Makelaars" vs "wassenaar makelaars") mogen niet als twee
-- aparte concurrenten tellen. Referentie-implementatie + vergelijkingstests:
-- lib/concurrentie.ts (ranglijstPerKantoor/wijVsMarkt/aandeelPerJaar/
-- matrixWieWintWaar/concurrentProfielV2) en lib/transactiesQuery.rpc.test.ts.
--
-- Elke RPC: `language sql`, `stable`, `security invoker`,
-- `set search_path = public`, filtert via de al bestaande gedeelde helper
-- `transacties_gefilterd()` (migratie 20260917_rpc_transacties.sql) — RLS
-- doet de kantoorscheiding (invoker-context).

-- ── concurrentie_ranglijst: aandeel + mediaan looptijd per kantoor ─────────
-- (superset van concurrentie_marktaandeel, + looptijd, + normalisatie).
-- Referentie: lib/concurrentie.ts ranglijstPerKantoor().
create or replace function concurrentie_ranglijst(p_filters jsonb default '{}'::jsonb)
returns table (kantoor text, aantal integer, aandeel_pct numeric, mediaan_looptijd numeric)
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
      end as kantoor,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor_norm), ''), '__onbekend__')
      end as sleutel,
      t.looptijd_dagen
    from transacties_gefilterd(p_filters) t
  ),
  totaal as (select count(*)::numeric as n from basis),
  per_sleutel as (
    select
      sleutel,
      (array_agg(kantoor))[1] as kantoor,
      count(*)::int as aantal,
      percentile_cont(0.5) within group (order by looptijd_dagen) as mediaan_looptijd
    from basis
    group by sleutel
  )
  select
    kantoor,
    aantal,
    round((aantal::numeric / nullif((select n from totaal), 0)) * 100, 1) as aandeel_pct,
    mediaan_looptijd
  from per_sleutel
  order by aantal desc
$$;

revoke execute on function concurrentie_ranglijst(jsonb) from public;
revoke execute on function concurrentie_ranglijst(jsonb) from anon;
grant execute on function concurrentie_ranglijst(jsonb) to authenticated;

-- ── concurrentie_wij_vs_markt: eigen kantoor vs. de rest, binnen de huidige
-- selectie. Looptijd/€-per-m² zijn mediaan, t.o.v. vraagprijs is een
-- gemiddelde — zelfde statistiek per veld als het prototype. Referentie:
-- lib/concurrentie.ts wijVsMarkt().
create or replace function concurrentie_wij_vs_markt(p_filters jsonb default '{}'::jsonb)
returns table (
  looptijd_wij numeric,
  looptijd_markt numeric,
  ratio_wij numeric,
  ratio_markt numeric,
  m2_wij numeric,
  m2_markt numeric,
  n_wij integer,
  n_markt integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select
      t.eigen_verkoop,
      t.looptijd_dagen,
      t.prijs_m2,
      case
        when t.verkoopprijs is not null and t.vraagprijs is not null and t.vraagprijs != 0
        then (t.verkoopprijs - t.vraagprijs)::numeric / t.vraagprijs * 100
      end as ratio
    from transacties_gefilterd(p_filters) t
  )
  select
    percentile_cont(0.5) within group (order by looptijd_dagen) filter (where eigen_verkoop) as looptijd_wij,
    percentile_cont(0.5) within group (order by looptijd_dagen) filter (where not eigen_verkoop) as looptijd_markt,
    round(avg(ratio) filter (where eigen_verkoop), 1) as ratio_wij,
    round(avg(ratio) filter (where not eigen_verkoop), 1) as ratio_markt,
    percentile_cont(0.5) within group (order by prijs_m2) filter (where eigen_verkoop) as m2_wij,
    percentile_cont(0.5) within group (order by prijs_m2) filter (where not eigen_verkoop) as m2_markt,
    count(*) filter (where eigen_verkoop)::int as n_wij,
    count(*) filter (where not eigen_verkoop)::int as n_markt
  from basis
$$;

revoke execute on function concurrentie_wij_vs_markt(jsonb) from public;
revoke execute on function concurrentie_wij_vs_markt(jsonb) from anon;
grant execute on function concurrentie_wij_vs_markt(jsonb) to authenticated;

-- ── concurrentie_aandeel_jaar: marktaandeel per jaar, voor de gevraagde
-- kantoor-weergavenamen (of alle kantoren zonder p_kantoren) — `totaal` is
-- per jaar altijd het totaal over ALLE kantoren, ook als de output tot een
-- subset beperkt is. Bewust ONAFHANKELIJK van datum_van/datum_tot in
-- p_filters (roadmap 6.3: de trendgrafiek negeert het periodefilter, plaats/
-- type/prijsklasse gelden wel) — vandaar `p_filters - 'datum_van' - 'datum_tot'`.
-- Referentie: lib/concurrentie.ts aandeelPerJaar().
create or replace function concurrentie_aandeel_jaar(p_filters jsonb default '{}'::jsonb, p_kantoren text[] default null)
returns table (jaar integer, kantoor text, aantal integer, totaal integer)
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select
      extract(year from t.verkoopdatum)::int as jaar,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor), ''), 'Onbekend')
      end as kantoor,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor_norm), ''), '__onbekend__')
      end as sleutel
    from transacties_gefilterd(p_filters - 'datum_van' - 'datum_tot') t
    where t.verkoopdatum is not null
  ),
  jaartotaal as (
    select jaar, count(*)::int as totaal from basis group by jaar
  ),
  per_sleutel as (
    select jaar, sleutel, (array_agg(kantoor))[1] as kantoor, count(*)::int as aantal
    from basis
    group by jaar, sleutel
  )
  select p.jaar, p.kantoor, p.aantal, j.totaal
  from per_sleutel p
  join jaartotaal j on j.jaar = p.jaar
  where p_kantoren is null or p.kantoor = any(p_kantoren)
  order by p.jaar, p.aantal desc
$$;

revoke execute on function concurrentie_aandeel_jaar(jsonb, text[]) from public;
revoke execute on function concurrentie_aandeel_jaar(jsonb, text[]) from anon;
grant execute on function concurrentie_aandeel_jaar(jsonb, text[]) to authenticated;

-- ── concurrentie_matrix: "wie wint waar" — top-kantoor + top 3 (jsonb, voor
-- de tooltip) per rij × woningtype_groep. `p_op_wijkniveau = true` splitst
-- naar wijk (rij_sleutel = "plaats|wijk"), anders naar plaats — de explorer
-- kiest dit zodra precies één plaats geselecteerd is. Referentie:
-- lib/concurrentie.ts matrixWieWintWaar().
create or replace function concurrentie_matrix(p_filters jsonb default '{}'::jsonb, p_op_wijkniveau boolean default false)
returns table (rij_sleutel text, rij_label text, woningtype_groep text, n integer, top3 jsonb)
language sql
stable
security invoker
set search_path = public
as $$
  with basis as (
    select
      case when p_op_wijkniveau then t.plaats || '|' || t.wijk else t.plaats end as rij_sleutel,
      case when p_op_wijkniveau then t.wijk else t.plaats end as rij_label,
      t.woningtype_groep,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor), ''), 'Onbekend')
      end as kantoor,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor_norm), ''), '__onbekend__')
      end as sleutel
    from transacties_gefilterd(p_filters) t
    where t.plaats is not null and t.woningtype_groep is not null
      and (not p_op_wijkniveau or t.wijk is not null)
  ),
  per_cel as (
    select rij_sleutel, rij_label, woningtype_groep, count(*)::int as n
    from basis
    group by rij_sleutel, rij_label, woningtype_groep
  ),
  per_cel_kantoor as (
    select rij_sleutel, woningtype_groep, sleutel, (array_agg(kantoor))[1] as kantoor, count(*)::int as aantal
    from basis
    group by rij_sleutel, woningtype_groep, sleutel
  ),
  gerangschikt as (
    select
      k.rij_sleutel, k.woningtype_groep, k.kantoor, k.aantal, c.n as cel_n,
      row_number() over (partition by k.rij_sleutel, k.woningtype_groep order by k.aantal desc) as rn
    from per_cel_kantoor k
    join per_cel c on c.rij_sleutel = k.rij_sleutel and c.woningtype_groep = k.woningtype_groep
  ),
  top3 as (
    select
      rij_sleutel, woningtype_groep,
      jsonb_agg(
        jsonb_build_object('kantoor', kantoor, 'aantal', aantal, 'aandeelPct', round((aantal::numeric / cel_n) * 100, 1))
        order by rn
      ) as top3
    from gerangschikt
    where rn <= 3
    group by rij_sleutel, woningtype_groep
  )
  select c.rij_sleutel, c.rij_label, c.woningtype_groep, c.n, t.top3
  from per_cel c
  join top3 t on t.rij_sleutel = c.rij_sleutel and t.woningtype_groep = c.woningtype_groep
$$;

revoke execute on function concurrentie_matrix(jsonb, boolean) from public;
revoke execute on function concurrentie_matrix(jsonb, boolean) from anon;
grant execute on function concurrentie_matrix(jsonb, boolean) to authenticated;

-- ── concurrentie_profiel: concurrentprofiel voor de drawer. n/aandeel/
-- mediaan looptijd/gem. t.o.v.-vraagprijs/verdeling-per-woningtype komen uit
-- de huidige paginaselectie (`p_filters`); sterkste plaats + trend per jaar
-- komen bewust uit de VOLLEDIGE (RLS-gescopede) kantoordataset, niet uit
-- `p_filters` — zie de opleverrapportage van 6.3 voor de afweging t.o.v. het
-- prototype (dat een middenweg-verbreding gebruikt). `p_kantoor` is de
-- weergavenaam ("Wassenaar Makelaars") of exact "Eigen kantoor". Referentie:
-- lib/concurrentie.ts concurrentProfielV2().
create or replace function concurrentie_profiel(p_filters jsonb default '{}'::jsonb, p_kantoor text default '')
returns table (
  n integer,
  aandeel_pct numeric,
  mediaan_looptijd numeric,
  gem_ratio numeric,
  verdeling jsonb,
  sterkste_plaats text,
  sterkste_aandeel_pct numeric,
  trend jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  -- De sleutel komt uit de data zelf: `verkopend_kantoor_norm` strip ook
  -- leestekens/diakrieten ("Huys & Partners" → "huys partners"), dus
  -- lower(trim(naam)) zou zo'n kantoor missen. lower(trim()) is alleen terugval.
  with doel as (
    select case
      when p_kantoor = 'Eigen kantoor' then 'Eigen kantoor'
      else coalesce(
        (select t.verkopend_kantoor_norm from transacties t
          where trim(t.verkopend_kantoor) = trim(p_kantoor) and t.verkopend_kantoor_norm is not null
          limit 1),
        lower(trim(p_kantoor))
      )
    end as sleutel
  ),
  selectie as (
    select
      t.*,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor_norm), ''), '__onbekend__')
      end as sleutel
    from transacties_gefilterd(p_filters) t
  ),
  selectie_doel as (
    select s.* from selectie s, doel d where s.sleutel = d.sleutel
  ),
  totaal_selectie as (select count(*)::numeric as n from selectie),
  verdeling_cte as (
    select jsonb_agg(jsonb_build_object('woningtypeGroep', coalesce(woningtype_groep, 'onbekend'), 'n', n)) as verdeling
    from (select woningtype_groep, count(*)::int as n from selectie_doel group by woningtype_groep) v
  ),
  -- Bewust ONGEFILTERD (op uitgesloten_reden na) — sterkste plaats en trend
  -- gelden voor de volledige regio, niet voor de huidige paginaselectie.
  regio as (
    select
      t.plaats, t.verkoopdatum,
      case
        when t.eigen_verkoop then 'Eigen kantoor'
        else coalesce(nullif(trim(t.verkopend_kantoor_norm), ''), '__onbekend__')
      end as sleutel
    from transacties t
    where t.uitgesloten_reden is null
  ),
  per_plaats as (
    select
      plaats,
      count(*)::numeric as totaal,
      count(*) filter (where sleutel = (select sleutel from doel))::numeric as eigen
    from regio
    where plaats is not null
    group by plaats
  ),
  sterkste as (
    select plaats, round((eigen / totaal) * 100, 1) as pct
    from per_plaats
    where eigen > 0
    order by (eigen / totaal) desc
    limit 1
  ),
  trend_cte as (
    select jsonb_agg(jsonb_build_object('jaar', jaar, 'aantal', aantal) order by jaar) as trend
    from (
      select extract(year from verkoopdatum)::int as jaar, count(*)::int as aantal
      from regio r, doel d
      where r.sleutel = d.sleutel and r.verkoopdatum is not null
      group by 1
    ) tr
  )
  select
    (select count(*)::int from selectie_doel) as n,
    round(((select count(*) from selectie_doel)::numeric / nullif((select n from totaal_selectie), 0)) * 100, 1) as aandeel_pct,
    (select percentile_cont(0.5) within group (order by looptijd_dagen) from selectie_doel) as mediaan_looptijd,
    round((select avg(
      case when verkoopprijs is not null and vraagprijs is not null and vraagprijs != 0
      then (verkoopprijs - vraagprijs)::numeric / vraagprijs * 100 end
    ) from selectie_doel), 1) as gem_ratio,
    (select verdeling from verdeling_cte) as verdeling,
    (select plaats from sterkste) as sterkste_plaats,
    (select pct from sterkste) as sterkste_aandeel_pct,
    (select coalesce(trend, '[]'::jsonb) from trend_cte) as trend
$$;

revoke execute on function concurrentie_profiel(jsonb, text) from public;
revoke execute on function concurrentie_profiel(jsonb, text) from anon;
grant execute on function concurrentie_profiel(jsonb, text) to authenticated;
