-- Task #43: Add attacks and abilities JSONB columns to cards table
-- These columns hold Pokemon card combat data (moves, abilities, poké-powers, etc.)
-- They were defined in shared/schema.ts but may be missing in older DB instances
-- that were created before these columns were added to the schema.
--
-- IDEMPOTENT: Safe to run multiple times (IF NOT EXISTS guards).
-- DATA SAFETY: Existing card rows are unaffected; new columns default to NULL.
--              After running, trigger a "Kart Import" sync in the admin TCG panel
--              to populate these columns for all existing Pokémon cards.
--
-- DEPLOY:
--   psql "$DATABASE_URL" -f migrations/2026_07_03_cards_attacks_abilities.sql

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS attacks  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS abilities jsonb DEFAULT '[]'::jsonb;
