/**
 * Tek canonical domain kaynağı (source-of-truth).
 *
 * Bu değer hem client bundle'ına hem server koduna aynı sabiti sağlar, böylece
 * eski "gocards.toov.com.tr" gibi domain referansları tek yerden yönetilir.
 * Server tarafında PUBLIC_BASE_URL environment değişkeni ile geçici olarak
 * override edilebilir (örn. staging ortamı), client bundle'ı env değişkeni
 * okuyamayacağı için her zaman bu sabiti kullanır.
 */
export const CANONICAL_SITE_URL = "https://gocardstcg.com";
export const CANONICAL_SITE_HOST = "gocardstcg.com";
export const SITE_NAME = "GoCards";

/**
 * Emekliye ayrılmış eski üretim host'ları. Bunlara gelen istekler HTTPS
 * canonical apex'e 301 ile yönlendirilir (bkz. server/index.ts). Yeni bir
 * eski domain emekliye ayrıldığında buraya eklenmesi yeterlidir.
 */
export const LEGACY_SITE_HOSTS: ReadonlyArray<string> = ["gocards.toov.com.tr"];
