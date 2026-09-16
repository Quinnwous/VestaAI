-- Coördinaat van het woningadres (uit lib/verrijking.ts, al opgehaald bij elke
-- generatie) — voedt de straal-uitsnede van de verkoopkaart in het
-- woningdossier (F5, zie CLAUDE.md § Hoofdstructuur). Voorheen alleen gebruikt
-- en meteen weggegooid; nu bewaard bij het object zelf.
alter table objecten
  add column if not exists lat double precision,
  add column if not exists lng double precision;
