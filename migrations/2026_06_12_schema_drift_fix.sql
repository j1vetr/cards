-- Task #9: Kritik DB senkronizasyonu — schema drift düzeltmesi
-- Tarih: 2026-06-12
--
-- Schema.ts'de tanımlı ama veritabanında olmayan sütunları ekler.
-- Eksik sütunlar, GET /api/admin/orders ve GET /api/admin/users uçlarında
-- Drizzle'ın SELECT * FROM tablename sorgusunun patlamasına (500) yol açıyordu.
--
-- DEPLOY YÖNTEMİ (production):
--   psql "$DATABASE_URL" -f migrations/2026_06_12_schema_drift_fix.sql
--
-- Yerel/staging için:
--   npm run db:push
--
-- IDEMPOTENT: IF NOT EXISTS ile güvenle defalarca çalıştırılabilir.
-- VERİ KORUMA: Mevcut kayıtlar etkilenmez; yeni sütunlar NULL/default ile eklenir.

-- ─── orders tablosu ──────────────────────────────────────────────────────────
-- Sipariş takip zaman çizelgesi sütunları: kod bunları her zaman bekliyordu ama
-- DB'de hiç oluşturulmamıştı, bu yüzden tüm SELECT * FROM orders sorguları patladı.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS processing_at timestamp,
  ADD COLUMN IF NOT EXISTS shipped_at    timestamp,
  ADD COLUMN IF NOT EXISTS delivered_at  timestamp,
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamp;

-- ─── users tablosu ───────────────────────────────────────────────────────────
-- WhatsApp iletişim tercihi (KVKK opt-out): schema bunu tanımlıyordu ama DB'de yoktu.
-- Varsayılan true → mevcut tüm kullanıcılar opt-in sayılır (önceki davranışı korur).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT true;
