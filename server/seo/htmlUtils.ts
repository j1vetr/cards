import sanitizeHtml from "sanitize-html";

export const escapeHtml = (str: string): string =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Blog gövdesi gibi admin tarafından üretilen zengin HTML alanları, prerender
 * edilen HTML'e (ilk yanıt) ham olarak enjekte edilmeden önce bu fonksiyondan
 * geçmelidir. İstemci tarafında DOMPurify ile ayrıca temizleniyor olması tek
 * başına yeterli değildir çünkü tarayıcı ilk yanıtı parse ederken (ve arama
 * motoru botları için hiçbir zaman) o adım henüz çalışmamış olur.
 */
export const sanitizeRichHtml = (html: string | null | undefined): string =>
  sanitizeHtml(html || "", {
    allowedTags: [
      "p", "br", "b", "strong", "i", "em", "u", "s", "strike", "blockquote",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a", "img",
      "figure", "figcaption", "code", "pre", "hr", "span", "div", "table",
      "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });

// SPA (client/src/pages) ile SSR arasında birebir aynı sonucu garanti etmek
// için tek kaynak shared/seoText.ts'tir — burayı değil onu güncelleyin.
export { stripHtmlToText as stripHtml } from "../../shared/seoText";

export const truncate = (str: string, max: number): string => {
  const clean = str.trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
};

export const normalizeImageUrl = (baseUrl: string, imageUrl?: string | null): string => {
  if (!imageUrl) return `${baseUrl}/logo.png`;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return `${baseUrl}${imageUrl.startsWith("/") ? imageUrl : "/" + imageUrl}`;
};

export const formatTRY = (value: number | string | null | undefined): string => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return "";
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
};
