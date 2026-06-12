-- Task #9: Kritik DB senkronizasyonu — schema drift düzeltmesi
-- Tarih: 2026-06-12
--
-- Schema.ts'de tanımlı ama veritabanında olmayan sütunları ekler.
-- Eksik sütunlar, GET /api/admin/orders ve GET /api/admin/users uçlarında
-- Drizzle'ın SELECT * FROM tablename sorgusunun patlamasına (500) yol açıyordu.
--
-- ─── ÖNEMLI NOT: orders.address / city / district / postal_code ────────────
-- Task açıklamasında "orders tablosunda address, city, district, postal_code
-- eksik" denilmekteydi. Bu analiz HATALIDIR.
-- shared/schema.ts'e bakıldığında orders tablosunda bu dört alan AYRI KOLON
-- olarak tanımlanmamıştır; bunlar tek bir JSONB kolonunun TypeScript tip
-- tanımı içindeki özelliklerdir:
--
--   shippingAddress: jsonb("shipping_address").$type<{
--     address: string; city: string; district: string;
--     postalCode: string; country?: string;
--   }>()
--
-- Veritabanında bu tek "shipping_address" jsonb kolonu vardır ve hep var
-- olmuştur. Ayrı kolon olarak eklenmemesi doğrudur.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Gerçekten eksik olan 5 sütun:
--   1. orders.processing_at  (sipariş işleme zaman damgası)
--   2. orders.shipped_at     (kargolama zaman damgası)
--   3. orders.delivered_at   (teslim zaman damgası)
--   4. orders.cancelled_at   (iptal zaman damgası)
--   5. users.whatsapp_opt_in (KVKK WhatsApp tercihi)
--
-- ─── Zaman damgası yazımı ─────────────────────────────────────────────────
-- server/routes.ts:3210-3223 şu kodu içermektedir:
--
--   if (status === 'processing' && !existingOrder.processingAt) {
--     updateData.processingAt = now;
--   } else if (status === 'shipped' && !existingOrder.shippedAt) {
--     updateData.shippedAt = now;
--   } else if ((status === 'delivered' || status === 'completed') && !existingOrder.deliveredAt) {
--     updateData.deliveredAt = now;
--   } else if ((status === 'cancelled' || status === 'refunded') && !existingOrder.cancelledAt) {
--     updateData.cancelledAt = now;
--   }
--
-- Bu kod hali hazırda doğru şekilde zaman damgalarını yazıyordu; sütunlar DB'de
-- olmadığı için değer saklanamıyordu. Sütunlar eklendikten sonra çalışmaktadır.
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
