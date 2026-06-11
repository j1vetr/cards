-- Task #5: Jeans özellikleri — products.attributes kolonu
-- Tarih: 2026-06-11
--
-- Bu migration, ürünlerde jean özelliklerini (Materyal, Likra, Kumaş Tipi,
-- Paça Tipi, Bel, Kalıp, Desen, Renk, Cep) depolamak için jsonb kolonu ekler.
--
-- DEPLOY YÖNTEMİ (production):
--   psql "$DATABASE_URL" -f migrations/2026_06_11_products_attributes.sql
--
-- Yerel/staging için:
--   npm run db:push
--
-- IDEMPOTENT: IF NOT EXISTS ile güvenle defalarca çalıştırılabilir.
--
-- VERİ KORUMA: Mevcut ürünler etkilenmez; kolon DEFAULT '{}' ile eklenir.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}';

-- İndeks: attribute değerlerine göre filtreleme yapmak için (opsiyonel, performans)
CREATE INDEX IF NOT EXISTS idx_products_attributes
  ON products USING gin (attributes);
