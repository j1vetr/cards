/**
 * Client tarafındaki wouter rotalarının (client/src/App.tsx) statik/parametresiz
 * eşleniği. Bu liste, sunucunun hangi yolların "gerçek" bir sayfa olduğunu
 * (dolayısıyla 200 dönmesi gerektiğini) bilebilmesi için tutulur; burada
 * olmayan ve renderPublicPage tarafından da tanınmayan her yol gerçek 404 alır.
 *
 * NOT: Bu dosya client/src/App.tsx ile senkron tutulmalı — yeni statik bir
 * rota eklendiğinde buraya da eklenmesi gerekir.
 */
export const STATIC_TOP_LEVEL_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/magaza",
  "/kartlar",
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/sepet",
  "/odeme",
  "/odeme-basarili",
  "/odeme-basarisiz",
  "/siparis-takip",
  "/hesabim",
  "/hesabim/siparislerim",
  "/hakkimizda",
  "/teslimat-kosullari",
  "/mesafeli-satis-sozlesmesi",
  "/iptal-ve-iade",
  "/kvkk",
  "/koleksiyon",
  "/favoriler",
  "/iletisim",
  "/aksesuarlar",
  "/riftbound",
  "/blog",
]);

/** /toov-admin, /toov-admin/login, /toov-admin/orders/:id gibi admin rotaları. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/toov-admin" || pathname.startsWith("/toov-admin/");
}

/**
 * Kimlik doğrulama, ödeme ve hesap gibi kullanıcıya özel/işlevsel rotalar.
 * Bunlar indexlenmemeli (`noindex, nofollow`) — arayan kullanıcı için değil,
 * yalnızca giriş yapmış/işlem yapan kullanıcı için anlamlıdır ve içerikleri
 * kullanıcıya göre değişir. Admin rotaları ayrıca isAdminPath ile kapsanır.
 */
export const NOINDEX_STATIC_PATHS: ReadonlySet<string> = new Set([
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/sepet",
  "/odeme",
  "/odeme-basarili",
  "/odeme-basarisiz",
  "/siparis-takip",
  "/hesabim",
  "/hesabim/siparislerim",
  "/koleksiyon",
  "/favoriler",
]);

export function isNoindexStaticPath(pathname: string): boolean {
  return NOINDEX_STATIC_PATHS.has(pathname) || isAdminPath(pathname);
}

/** Dinamik :slug/:game parametreli client rotaları — renderPublicPage bunları ele alır. */
export const DYNAMIC_ROUTE_PREFIXES: ReadonlyArray<string> = [
  "/kart/",
  "/set/",
  "/oyun/",
  "/kategori/",
  "/urun/",
  "/blog/",
];

export function isKnownAppPath(pathname: string): boolean {
  if (STATIC_TOP_LEVEL_PATHS.has(pathname)) return true;
  if (isAdminPath(pathname)) return true;
  return DYNAMIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length);
}
