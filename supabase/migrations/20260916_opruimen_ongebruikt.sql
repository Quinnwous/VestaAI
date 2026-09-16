-- Opruimen van restanten uit de tijd vóór de koerswijziging van 15 sep 2026
-- (contentkalender/chatbot, self-signup/trial-model) — nergens meer gelezen
-- of geschreven in de applicatiecode, zie CLAUDE.md/docs/roadmap.md § Laag.

drop table if exists post_planning;
drop table if exists chatbot_leads;
drop table if exists chatbot_faq;
drop table if exists referrals;

alter table objecten
  drop column if exists chat_publiek,
  drop column if exists chat_foto_url;

alter table object_documenten
  drop column if exists publiek_chatbaar;

alter table kantoren
  drop column if exists plan,
  drop column if exists trial_ends_at,
  drop column if exists stripe_id,
  drop column if exists referral_code;
