-- Referral-code per kantoor (8-karakter code, uniek)
ALTER TABLE kantoren
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE;

-- Genereer automatisch een code voor bestaande kantoren die er nog geen hebben
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE kantoren
SET referral_code = upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8))
WHERE referral_code IS NULL;

-- Trigger: nieuwe kantoren krijgen automatisch een code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(8);
  collision BOOLEAN := TRUE;
BEGIN
  WHILE collision LOOP
    new_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
    collision := EXISTS (SELECT 1 FROM kantoren WHERE referral_code = new_code);
  END LOOP;
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_referral_code ON kantoren;
CREATE TRIGGER trg_referral_code
  BEFORE INSERT ON kantoren
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();

-- Referrals tabel: wie heeft wie doorverwezen
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_kantoor_id UUID NOT NULL REFERENCES kantoren(id) ON DELETE CASCADE,
  referee_kantoor_id  UUID NOT NULL REFERENCES kantoren(id) ON DELETE CASCADE,
  reward_applied      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referee_kantoor_id)  -- één referral per ingeschreven kantoor
);

-- Index voor snel opzoeken per referrer
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_kantoor_id);

-- RLS: alleen service role mag schrijven; leesrechten via service role in API routes
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
