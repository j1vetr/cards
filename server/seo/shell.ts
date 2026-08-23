import type { RenderResult } from "./render";
import { escapeHtml } from "./htmlUtils";

/**
 * Verilen HTML kabuğu (client/index.html tabanlı) üzerine SEO verisini basar:
 * title, meta description, robots, canonical, Open Graph/Twitter etiketleri,
 * JSON-LD ve #root içine gerçek (JS'siz de görünür) içerik.
 */
export function injectSeo(template: string, seo: RenderResult | null, reqPath: string, baseUrl: string): string {
  let html = template;

  const canonical = seo?.canonical || `${baseUrl}${reqPath}`;
  const robots = seo?.robots || "index, follow";

  if (seo?.title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  }

  if (seo?.description) {
    html = replaceMetaContent(html, 'name="description"', seo.description);
  }

  html = replaceMetaContent(html, 'name="robots"', robots);

  html = replaceOrInsertCanonical(html, canonical);

  if (seo?.title) {
    html = replaceMetaContent(html, 'property="og:title"', seo.title);
    html = replaceMetaContent(html, 'name="twitter:title"', seo.title);
  }
  if (seo?.description) {
    html = replaceMetaContent(html, 'property="og:description"', seo.description);
    html = replaceMetaContent(html, 'name="twitter:description"', seo.description);
  }
  html = replaceMetaContent(html, 'property="og:url"', canonical);
  if (seo?.ogType) {
    html = replaceMetaContent(html, 'property="og:type"', seo.ogType);
  }
  if (seo?.ogImage) {
    html = replaceMetaContent(html, 'property="og:image"', seo.ogImage);
    html = replaceMetaContent(html, 'name="twitter:image"', seo.ogImage);
  }

  if (seo?.jsonLd?.length) {
    const scripts = seo.jsonLd
      .filter(Boolean)
      .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`)
      .join("\n    ");
    html = html.replace("</head>", `    ${scripts}\n  </head>`);
  }

  if (seo?.bodyHtml) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${seo.bodyHtml}</div>`
    );
  }

  return html;
}

function replaceMetaContent(html: string, attrMatch: string, content: string): string {
  const escaped = escapeHtml(content);
  const re = new RegExp(`(<meta[^>]*${attrMatch}[^>]*content=")[^"]*(")`, "i");
  if (re.test(html)) {
    return html.replace(re, `$1${escaped}$2`);
  }
  return html;
}

function replaceOrInsertCanonical(html: string, canonical: string): string {
  // canonical, bilinmeyen bir isteğin ham req.originalUrl'inden türeyebilir
  // (bkz. render.ts notFoundResult); saldırgan kontrollü bir yol segmenti
  // (örn. `"><script>...`) attribute'u kırıp HTML enjeksiyonuna yol açmasın
  // diye burada mutlaka escape edilir.
  const escaped = escapeHtml(canonical);
  const re = /(<link rel="canonical" href=")[^"]*(")/i;
  if (re.test(html)) {
    return html.replace(re, `$1${escaped}$2`);
  }
  return html.replace("</head>", `  <link rel="canonical" href="${escaped}">\n  </head>`);
}
