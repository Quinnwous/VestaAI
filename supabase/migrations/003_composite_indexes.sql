-- Dashboard query: filter by kantoor_id, order by created_at DESC
CREATE INDEX IF NOT EXISTS objecten_kantoor_created_idx
  ON objecten (kantoor_id, created_at DESC);

-- Status filter on top of kantoor query
CREATE INDEX IF NOT EXISTS objecten_kantoor_status_created_idx
  ON objecten (kantoor_id, status, created_at DESC);

-- Address search (ILIKE uses this when prefix-matching)
CREATE INDEX IF NOT EXISTS objecten_address_trgm_idx
  ON objecten USING gin (address gin_trgm_ops);

-- Enable pg_trgm if not already enabled (required for gin_trgm_ops)
-- Run separately if this migration fails: CREATE EXTENSION IF NOT EXISTS pg_trgm;
