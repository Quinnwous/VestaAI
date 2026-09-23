-- Item 9.1 (docs/roadmap.md, fase 9): kantoorspecifieke inlogpagina
-- (/login/[slug]). Additief — deze migratie wordt NIET door de subagent
-- toegepast, alleen klaargezet; de hoofdsessie past hem toe (zie
-- CLAUDE.md § vangrails productiedatabase en "één database, twee
-- codeversies"). De app-code werkt ook zolang deze kolom/functie nog niet
-- bestaan: een onbekende/ontbrekende slug valt overal terug op de
-- generieke /login (zie lib/kantoorLoginBranding.ts).
--
-- ⚠️ De regex hieronder is een letterlijke kopie van SLUG_REGEX in
-- lib/slug.ts (een DB-constraint kan geen TS-module importeren) — bij een
-- wijziging aan de slugvorm daar, hier ook aanpassen.

alter table kantoren add column if not exists slug text;

alter table kantoren
  add constraint kantoren_slug_formaat
  check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table kantoren
  add constraint kantoren_slug_lengte
  check (slug is null or (char_length(slug) between 2 and 60));

create unique index if not exists kantoren_slug_uniek on kantoren (slug);

-- ── Backfill van de twee bestaande kantoren ─────────────────────────────
-- Id's geverifieerd read-only via Supabase REST met de service-role key
-- (23 sep 2026): "i4 Housing" (het pilotkantoor) en "Demo Makelaardij" (het
-- interne demo-/testkantoor, zie CLAUDE.md § Transactiedataset). Op naam
-- i.p.v. hardgecodeerd id, zodat dit ook op een schone/andere omgeving werkt
-- zonder de migratie aan te passen.
update kantoren set slug = 'i4housing' where lower(trim(name)) = 'i4 housing' and slug is null;
update kantoren set slug = 'demo' where lower(trim(name)) = 'demo makelaardij' and slug is null;

-- ── kantoor_branding_publiek: minimale, veilige RPC voor de inlogpagina ──
-- Draait vóór er een sessie bestaat (`/login/[slug]`), dus `security invoker`
-- (het patroon van 20260917_rpc_transacties.sql) werkt hier niet — er is nog
-- geen ingelogde rol om de RLS-policy "makelaar ziet eigen kantoor" tegen te
-- laten slagen. Vandaar `security definer`, met een strikte projectie: alleen
-- de acht kolommen die de kantoorlogin nodig heeft (logo, kleuren,
-- lettertype/vorm, favicon, sfeerbeeld) — nooit id, e-mail, instellingen_json,
-- courtage of iets uit huisstijl_json dat niet voor het publiek is bedoeld
-- (voorbeelden/stijlprofiel/geleerde_regels/brochure_stijl blijven binnen).
create or replace function kantoor_branding_publiek(p_slug text)
returns table (
  naam text,
  logo_url text,
  primaire_kleur text,
  accent_kleur text,
  lettertype text,
  vorm text,
  favicon_url text,
  achtergrond_url text,
  achtergrond_secundair_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    k.name,
    k.logo_url,
    k.huisstijl_json->>'primaire_kleur',
    k.huisstijl_json->>'accent_kleur',
    k.huisstijl_json->>'lettertype',
    k.huisstijl_json->>'vorm',
    k.huisstijl_json->>'favicon_url',
    k.huisstijl_json->>'achtergrond_url',
    k.huisstijl_json->>'achtergrond_secundair_url'
  from kantoren k
  where k.slug = lower(trim(p_slug))
  limit 1
$$;

revoke all on function kantoor_branding_publiek(text) from public;
grant execute on function kantoor_branding_publiek(text) to anon, authenticated;
