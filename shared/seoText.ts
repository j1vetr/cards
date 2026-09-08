/**
 * SEO metin çözümleme kuralları — hem sunucu (SSR/sitemap) hem istemci (SPA
 * hydration sonrası) tarafından aynı sözleşmeyle kullanılır, böylece admin
 * panelinden girilen bir SEO override her iki render yolunda da birebir aynı
 * sonucu üretir (kırpma uzunluğu, boşsa otomatik değere düşme davranışı).
 *
 * Admin panelindeki başlık/açıklama alanları YALNIZCA sayfaya özgü kısmı
 * içermelidir (site adı eki değil) — site adı eki (" | GoCards") hem
 * SSR hem SPA tarafında ayrıca ve tek seferde eklenir.
 */

/**
 * Zengin metin (HTML) alanlarından (ürün açıklaması gibi) düz metin SEO
 * açıklaması üretir. Sunucu ve tarayıcı ortamında aynı sonucu verir (DOM'a
 * bağımlı değildir), böylece SSR ile SPA hydration sonrası aynı metni üretir.
 */
export const stripHtmlToText = (html: string | null | undefined): string =>
  String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const truncateSeoText = (str: string, max: number): string => {
  const clean = str.trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
};

export function resolveSeoTitle(override: string | null | undefined, fallback: string): string {
  const value = (override ?? "").trim() || fallback;
  return truncateSeoText(value, 70);
}

export function resolveSeoDescription(override: string | null | undefined, fallback: string): string {
  const value = (override ?? "").trim() || fallback;
  return truncateSeoText(value, 160);
}

export function resolveSeoH1(override: string | null | undefined, fallback: string): string {
  const value = (override ?? "").trim();
  return value || fallback;
}

export function resolveSeoIntro(override: string | null | undefined, fallback: string): string {
  const value = (override ?? "").trim();
  return value || fallback;
}
