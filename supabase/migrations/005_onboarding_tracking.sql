-- Onboarding-meting: bijhouden wanneer een makelaar voor het eerst content genereerde
-- Doel: meten of sign-up → eerste generatie in <5 minuten lukt

alter table makelaars
  add column if not exists first_generated_at timestamptz;

-- Index voor snelle rapportage
create index if not exists makelaars_first_generated_at_idx
  on makelaars(first_generated_at)
  where first_generated_at is not null;
