-- Uitbreiding van de transactie-RPC's voor "Transacties opzoeken v2"
-- (item 6.2, docs/roadmap.md § 5 Fase 6 — port van
-- docs/ontwerp/transacties.html). ADDITIEF: beide functies bestaan al
-- (migratie 20260917_rpc_transacties.sql, toegepast) en worden hier alleen
-- met `create or replace function` uitgebreid — bestaande aanroepers
-- (marktanalyse_*, concurrentie_*) blijven ongewijzigd werken, want de nieuwe
-- velden/sorteersleutels zijn optioneel en vallen terug op het oude gedrag
-- als ze ontbreken.
--
-- ⚠️ Nog NIET toegepast — zie de opleverrapportage van item 6.2. Zonder deze
-- migratie werkt de DataTable in `components/TransactiesZoeken.tsx` gewoon
-- (sorteren op verkoopdatum/prijs/looptijd, zoeken via het zoekveld doet dan
-- niets), maar de extra kolomsorteringen (adres, plaats/wijk, type, m²,
-- t.o.v. vraagprijs, verkocht door) en het adres-zoekveld hebben geen effect
-- op de servervolgorde/resultaten totdat dit bestand is toegepast — de RPC
-- valt dan stil terug op de standaardsortering (`verkoopdatum_desc`) resp.
-- geen filter, zonder foutmelding (zie de `case when`-opbouw hieronder).

-- ── transacties_gefilterd: + `zoek` (ILIKE op adres) ────────────────────────
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
    -- Nieuw (item 6.2): vrij zoekveld op adres, case-insensitive.
    and (p_filters->>'zoek' is null or t.adres ilike '%' || (p_filters->>'zoek') || '%')
$$;

-- ── transacties_zoeken: + kolomsortering voor de DataTable ──────────────────
-- (adres, plaats/wijk, type, oppervlak, €/m², t.o.v. vraagprijs, verkocht
-- door) naast de bestaande verkoopdatum/prijs/looptijd. "Verkocht door"
-- sorteert alfabetisch op de getoonde naam: de externe kantoornaam
-- (verkopend_kantoor_norm, met verkopend_kantoor als terugval) voor niet-eigen
-- verkopen, of een vaste placeholder voor eigen verkopen (de UI toont daar de
-- eigen kantoornaam, die niet in deze tabel staat — zie lib/transactiesZoeken.ts).
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
      case when p_sortering = 'adres_asc' then adres end asc nulls last,
      case when p_sortering = 'adres_desc' then adres end desc nulls last,
      case when p_sortering = 'plaats_asc' then (coalesce(plaats, '') || '|' || coalesce(wijk, '')) end asc nulls last,
      case when p_sortering = 'plaats_desc' then (coalesce(plaats, '') || '|' || coalesce(wijk, '')) end desc nulls last,
      case when p_sortering = 'type_asc' then woningtype_sub end asc nulls last,
      case when p_sortering = 'type_desc' then woningtype_sub end desc nulls last,
      case when p_sortering = 'opp_asc' then woonoppervlak_m2 end asc nulls last,
      case when p_sortering = 'opp_desc' then woonoppervlak_m2 end desc nulls last,
      case when p_sortering = 'm2_asc' then prijs_m2 end asc nulls last,
      case when p_sortering = 'm2_desc' then prijs_m2 end desc nulls last,
      case when p_sortering = 'ratio_asc' then (case when verkoopprijs is not null and vraagprijs is not null and vraagprijs != 0 then (verkoopprijs - vraagprijs) / vraagprijs * 100 end) end asc nulls last,
      case when p_sortering = 'ratio_desc' then (case when verkoopprijs is not null and vraagprijs is not null and vraagprijs != 0 then (verkoopprijs - vraagprijs) / vraagprijs * 100 end) end desc nulls last,
      case when p_sortering = 'verkochtdoor_asc' then (case when eigen_verkoop then '' else coalesce(verkopend_kantoor_norm, verkopend_kantoor, '') end) end asc nulls last,
      case when p_sortering = 'verkochtdoor_desc' then (case when eigen_verkoop then '' else coalesce(verkopend_kantoor_norm, verkopend_kantoor, '') end) end desc nulls last,
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
