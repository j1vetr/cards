// Blog yazısı (blog_posts) sayfa başlığı, meta açıklama ve BlogPosting/
// FAQPage/HowTo JSON-LD şemaları için TEK kaynak. server/seo/render.ts
// (renderBlogDetail) VE client/src/pages/BlogDetail.tsx BİREBİR bu
// fonksiyonları kullanır — SSR ile SPA hydration sonrası aynı structured
// data'yı üretmelidir (parite kuralı). İçeriği değiştirmek için yalnızca bu
// dosyayı düzenleyin.
import { stripHtmlToText, truncateSeoText } from "./seoText";
import { SITE_NAME, CANONICAL_SITE_URL } from "./siteConfig";

export interface BlogPostForSchema {
  slug: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  summary?: string | null;
  content: string;
  coverImageUrl?: string | null;
  category: string;
  publishedAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  faqItems?: Array<{ question: string; answer: string }> | null;
}

const FALLBACK_IMAGE = `${CANONICAL_SITE_URL}/logo.png`;
const PUBLISHER_LOGO_URL = `${CANONICAL_SITE_URL}/gocards-logo-white.png`;

/** Sayfa <title> için: metaTitle varsa o, yoksa post.title; 70 karaktere kırpılır ve site adı eki eklenir. */
export function resolveBlogPageTitle(post: Pick<BlogPostForSchema, "title" | "metaTitle">): string {
  const base = (post.metaTitle ?? "").trim() || post.title;
  return `${truncateSeoText(base, 70)} | ${SITE_NAME}`;
}

/** Meta description / schema description için: metaDescription -> summary -> içerikten çıkarılan düz metin -> son çare. */
export function resolveBlogDescription(
  post: Pick<BlogPostForSchema, "metaDescription" | "summary" | "content" | "title">,
): string {
  const base =
    (post.metaDescription ?? "").trim() ||
    (post.summary ?? "").trim() ||
    stripHtmlToText(post.content) ||
    `Go|Cards blog: ${post.title}`;
  return truncateSeoText(base, 160);
}

function toIsoDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function resolveBlogImage(post: Pick<BlogPostForSchema, "coverImageUrl">): string {
  if (!post.coverImageUrl) return FALLBACK_IMAGE;
  return post.coverImageUrl.startsWith("http") ? post.coverImageUrl : `${CANONICAL_SITE_URL}${post.coverImageUrl}`;
}

export function buildBlogPostingSchema(post: BlogPostForSchema): Record<string, unknown> {
  const canonicalUrl = `${CANONICAL_SITE_URL}/blog/${post.slug}`;
  const datePublished = toIsoDate(post.publishedAt) ?? toIsoDate(post.createdAt);
  const dateModified = toIsoDate(post.updatedAt) ?? datePublished;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: resolveBlogDescription(post),
    image: [resolveBlogImage(post)],
    url: canonicalUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    datePublished,
    dateModified,
    author: { "@type": "Organization", name: "Go|Cards", url: CANONICAL_SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Go|Cards",
      logo: { "@type": "ImageObject", url: PUBLISHER_LOGO_URL },
    },
  };
}

export function buildBlogFaqSchema(
  post: Pick<BlogPostForSchema, "faqItems">,
): Record<string, unknown> | null {
  const items = post.faqItems ?? [];
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * Rehber (category='guide') yazılarında sıralı bir liste (<ol>) ve en az 3
 * madde varsa HowTo şeması üretir. Hem SSR hem SPA aynı algılama kuralını
 * (ol var mı + >=3 li) ve aynı adım metni çıkarımını kullanmalıdır.
 */
export function buildBlogHowToSchema(
  post: Pick<BlogPostForSchema, "category" | "content" | "title" | "metaTitle" | "metaDescription" | "summary">,
): Record<string, unknown> | null {
  if (post.category !== "guide") return null;
  const hasOrderedList = /<ol[\s>]/.test(post.content);
  const stepMatches = post.content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (!hasOrderedList || !stepMatches || stepMatches.length < 3) return null;

  const steps = stepMatches.slice(0, 10).map((li, i) => {
    const text = li.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { "@type": "HowToStep", position: i + 1, name: text.slice(0, 80) || `Adım ${i + 1}`, text };
  });

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: (post.metaTitle ?? "").trim() || post.title,
    description: resolveBlogDescription(post),
    step: steps,
  };
}
