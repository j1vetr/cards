import type { Request } from "express";
import { renderPublicPage, notFoundResult, goneResult } from "./render";
import { injectSeo } from "./shell";
import { isKnownAppPath, isNoindexStaticPath } from "./staticRoutes";
import { CANONICAL_SITE_URL } from "../../shared/siteConfig";
import { storage } from "../storage";

export function getCanonicalBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || CANONICAL_SITE_URL).replace(/\/+$/, "");
}

// /magaza istemci tarafında zaten useEffect ile /kartlar'a yönlendiriliyor
// (client/src/pages/Store.tsx); arama motorları JS çalıştırmadan bunu
// göremez, o yüzden aynı yönlendirmeyi burada gerçek bir HTTP 301 olarak
// da uyguluyoruz ki tek bir kanonik URL indexlensin. Bunun dışındaki tüm eski
// URL kararları (301/404/410) `redirects` tablosunda tutulur — bkz.
// storage.getRedirectByFromPath — ki gelecekte slug değişikliklerinde kod
// değişikliği gerekmesin.
const LEGACY_REDIRECTS: ReadonlyArray<{ from: string; to: string }> = [
  { from: "/magaza", to: "/kartlar" },
];

function normalizeRedirectPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

/** Bilinen bir eski/alias path için hedef path'i döner, yoksa null. Sadece statik (kod içi) map'e bakar. */
export function getLegacyRedirectTarget(pathname: string): string | null {
  const clean = normalizeRedirectPath(pathname);
  const match = LEGACY_REDIRECTS.find((r) => r.from === clean);
  return match ? match.to : null;
}

export type RedirectDecision = { status: 301; to: string } | { status: 410 } | { status: 404 };

/**
 * Statik map + `redirects` tablosunu birlikte kontrol eder. 301 kararları
 * gerçek bir HTTP redirect (Location header) gerektirdiği için çağıran taraf
 * (server/static.ts, server/vite.ts) bunu `renderAppShellResponse` çağrısından
 * ÖNCE kontrol etmelidir. 404 kararı, path halen bilinen/canlı bir rotaya denk
 * gelse bile (örn. yeniden kullanılan bir slug artık kasıtlı olarak kaldırıldı)
 * gerçek 404'e zorlar.
 */
export async function resolveRedirectDecision(pathname: string): Promise<RedirectDecision | null> {
  const clean = normalizeRedirectPath(pathname);
  const staticTarget = getLegacyRedirectTarget(clean);
  if (staticTarget) return { status: 301, to: staticTarget };

  const row = await storage.getRedirectByFromPath(clean).catch(() => undefined);
  if (!row) return null;
  if (row.statusCode === 301 && row.toPath) return { status: 301, to: row.toPath };
  if (row.statusCode === 410) return { status: 410 };
  if (row.statusCode === 404) return { status: 404 };
  return null;
}

/**
 * SPA kabuğunu (index.html) verilen istek için hazırlar: içerik rotalarında
 * gerçek veriden üretilmiş SEO + görünür içerik enjekte eder, bilinmeyen
 * rotalarda gerçek 404 döndürür, bilinen statik rotalarda (sepet, giriş, admin
 * vb.) kabuğu olduğu gibi 200 ile bırakır. `redirects` tablosunda 410 kararı
 * olan yollar için gerçek 410 içerik döndürür (301 kararları çağıran tarafta
 * `resolveRedirectDecision` ile ayrıca ele alınır).
 */
export async function renderAppShellResponse(req: Request, template: string): Promise<{ status: number; html: string }> {
  const baseUrl = getCanonicalBaseUrl();
  // NOT: bu fonksiyon Express'te `app.use("*", ...)` ile mount edilen bir
  // catch-all içinde çağrılıyor. "*" bir mount path olarak davrandığı için
  // Express, middleware içindeki req.path/req.url'i mount noktasına göre
  // yeniden hesaplar (genelde "/"). Gerçek istek yolu için her zaman
  // req.originalUrl kullanılmalı.
  const pathname = req.originalUrl.split("?")[0].split("#")[0] || "/";
  const queryIndex = req.originalUrl.indexOf("?");
  const search = queryIndex >= 0 ? req.originalUrl.slice(queryIndex).split("#")[0] : "";

  const redirectDecision = await resolveRedirectDecision(pathname);
  if (redirectDecision?.status === 410) {
    const seo = goneResult(baseUrl, pathname);
    const html = injectSeo(template, seo, pathname, baseUrl);
    return { status: 410, html };
  }
  if (redirectDecision?.status === 404) {
    const seo = notFoundResult(baseUrl, pathname);
    const html = injectSeo(template, seo, pathname, baseUrl);
    return { status: 404, html };
  }

  let seo = await renderPublicPage(pathname, baseUrl, search);
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
