import type { Request } from "express";
import { renderPublicPage, notFoundResult } from "./render";
import { injectSeo } from "./shell";
import { isKnownAppPath, isNoindexStaticPath } from "./staticRoutes";
import { CANONICAL_SITE_URL } from "../../shared/siteConfig";

export function getCanonicalBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || CANONICAL_SITE_URL).replace(/\/+$/, "");
}

// /magaza istemci tarafında zaten useEffect ile /kartlar'a yönlendiriliyor
// (client/src/pages/Store.tsx); arama motorları JS çalıştırmadan bunu
// göremez, o yüzden aynı yönlendirmeyi burada gerçek bir HTTP 301 olarak
// da uyguluyoruz ki tek bir kanonik URL indexlensin.
const LEGACY_REDIRECTS: ReadonlyArray<{ from: string; to: string }> = [
  { from: "/magaza", to: "/kartlar" },
];

/** Bilinen bir eski/alias path için hedef path'i döner, yoksa null. */
export function getLegacyRedirectTarget(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const match = LEGACY_REDIRECTS.find((r) => r.from === clean);
  return match ? match.to : null;
}

/**
 * SPA kabuğunu (index.html) verilen istek için hazırlar: içerik rotalarında
 * gerçek veriden üretilmiş SEO + görünür içerik enjekte eder, bilinmeyen
 * rotalarda gerçek 404 döndürür, bilinen statik rotalarda (sepet, giriş, admin
 * vb.) kabuğu olduğu gibi 200 ile bırakır.
 */
export async function renderAppShellResponse(req: Request, template: string): Promise<{ status: number; html: string }> {
  const baseUrl = getCanonicalBaseUrl();
  // NOT: bu fonksiyon Express'te `app.use("*", ...)` ile mount edilen bir
  // catch-all içinde çağrılıyor. "*" bir mount path olarak davrandığı için
  // Express, middleware içindeki req.path/req.url'i mount noktasına göre
  // yeniden hesaplar (genelde "/"). Gerçek istek yolu için her zaman
  // req.originalUrl kullanılmalı.
  const pathname = req.originalUrl.split("?")[0].split("#")[0] || "/";

  let seo = await renderPublicPage(pathname, baseUrl);
  let status = 200;

  if (seo) {
    status = seo.status;
  } else if (!isKnownAppPath(pathname)) {
    seo = notFoundResult(baseUrl, pathname);
    status = 404;
  } else if (isNoindexStaticPath(pathname)) {
    // Kimlik doğrulama, ödeme, hesap ve admin gibi kullanıcıya özel rotalar
    // gerçek sayfa içeriği render etmez (kullanıcıya/duruma göre değişir),
    // ama arama motorları JS çalıştırmadan varsayılan kabuğu göreceği için
    // en azından noindex,nofollow direktifini burada, ilk yanıtta vermeliyiz.
    seo = {
      status: 200,
      title: "",
      description: "",
      canonical: `${baseUrl}${pathname}`,
      robots: "noindex, nofollow",
      ogType: "website",
      ogImage: "",
      jsonLd: [],
      bodyHtml: "",
    };
  }

  const html = injectSeo(template, seo, pathname, baseUrl);
  return { status, html };
}
