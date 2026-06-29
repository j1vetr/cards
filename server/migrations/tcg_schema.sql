-- TCG Platform Migration
-- Run this once to add TCG tables and update existing tables.
-- Idempotent: uses IF NOT EXISTS and IF EXISTS guards.

-- ============================================================
-- 1. New TCG tables
-- ============================================================

CREATE TABLE IF NOT EXISTS card_games (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_sets (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      VARCHAR NOT NULL REFERENCES card_games(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  series       TEXT,
  release_date TEXT,
  total_cards  INTEGER,
  logo_url     TEXT,
  symbol_url   TEXT,
  api_id       TEXT,
  api_source   TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id           VARCHAR NOT NULL REFERENCES card_sets(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  card_number      TEXT,
  rarity           TEXT,
  card_types       JSONB NOT NULL DEFAULT '[]',
  hp               INTEGER,
  artist           TEXT,
  image_url        TEXT,
  image_url_hi_res TEXT,
  description      TEXT,
  api_id           TEXT,
  api_source       TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_featured      BOOLEAN NOT NULL DEFAULT false,
  is_new           BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_api ON cards(api_source, api_id)
  WHERE api_source IS NOT NULL AND api_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS card_listings (
  id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    VARCHAR NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  condition  TEXT NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  stock      INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_prices (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      VARCHAR NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  source       TEXT NOT NULL DEFAULT 'pricecharting',
  price_market DECIMAL(10,2),
  price_low    DECIMAL(10,2),
  price_high   DECIMAL(10,2),
  currency     TEXT NOT NULL DEFAULT 'USD',
  fetched_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_price_source ON card_prices(card_id, source);

-- ============================================================
-- 2. Update cart_items: add card_listing_id, make product_id optional
-- ============================================================

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS card_listing_id VARCHAR REFERENCES card_listings(id) ON DELETE CASCADE;
ALTER TABLE cart_items ALTER COLUMN product_id DROP NOT NULL;

-- ============================================================
-- 3. Update order_items: add card_listing_id
-- ============================================================

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS card_listing_id VARCHAR REFERENCES card_listings(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Update favorites: add card_id, make product_id optional
-- ============================================================

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS card_id VARCHAR REFERENCES cards(id) ON DELETE CASCADE;
ALTER TABLE favorites ALTER COLUMN product_id DROP NOT NULL;

-- ============================================================
-- 5. Update stock_adjustments: add card_listing_id, make variant_id optional
-- ============================================================

ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS card_listing_id VARCHAR REFERENCES card_listings(id) ON DELETE CASCADE;
ALTER TABLE stock_adjustments ALTER COLUMN variant_id DROP NOT NULL;

-- ============================================================
-- 6. Update low_stock_alerts: add card_listing_id, make variant_id optional
-- ============================================================

ALTER TABLE low_stock_alerts ADD COLUMN IF NOT EXISTS card_listing_id VARCHAR REFERENCES card_listings(id) ON DELETE CASCADE;
ALTER TABLE low_stock_alerts ALTER COLUMN variant_id DROP NOT NULL;

-- ============================================================
-- 7. Drop legacy wholesale/clothing columns (idempotent)
-- ============================================================

DROP TABLE IF EXISTS wholesale_series CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS customer_type;
ALTER TABLE users DROP COLUMN IF EXISTS company_name;
ALTER TABLE users DROP COLUMN IF EXISTS tax_number;
ALTER TABLE users DROP COLUMN IF EXISTS tax_office;

-- Drop legacy product_variants table (clothing size/color model replaced by card_listings).
-- CASCADE removes FK constraints on variantId columns in order_items, stock_adjustments,
-- low_stock_alerts, and cart_items (those variantId columns become plain varchar after drop).
DROP TABLE IF EXISTS product_variants CASCADE;

-- ============================================================
-- 8. TCG Sync Runs table
-- ============================================================

CREATE TABLE IF NOT EXISTS tcg_sync_runs (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  game        TEXT NOT NULL,
  mode        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'running',
  set_api_id  TEXT,
  stats       JSONB NOT NULL DEFAULT '{}',
  errors      JSONB NOT NULL DEFAULT '[]',
  started_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tcg_sync_runs_started ON tcg_sync_runs (started_at DESC);

-- ============================================================
-- 9. Seed default games
-- ============================================================

INSERT INTO card_games (name, slug, is_active) VALUES
  ('Pokemon TCG', 'pokemon', true),
  ('Riftbound', 'riftbound', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Done
-- ============================================================
