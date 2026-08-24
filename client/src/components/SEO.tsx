import { useEffect } from 'react';
import { CANONICAL_SITE_URL, SITE_NAME } from '@shared/siteConfig';
import { truncateSeoText } from '@shared/seoText';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  noIndex?: boolean;
  /** noIndex true iken 'noindex, follow' üretir (varsayılan 'noindex, nofollow' yerine) —
   * filtre/arama sonucu listeleme sayfaları gibi indexlenmemesi ama linkleri takip
   * edilmesi gereken sayfalar için kullanılır. */
  noIndexFollow?: boolean;
  /** true: canonical etiketi hiç basılmaz, varsa kaldırılır. Yalnızca 404 gibi
   * gerçek hata sayfaları için kullanılır. Normal noindex listeleme/filtre
   * sayfaları self-canonical'larını korur (SSR paritesi). */
  suppressCanonical?: boolean;
  product?: {
    name: string;
    /** null/undefined = gerçek bir fiyat verisi yok (ör. hiç aktif liste yok); alan şemadan tamamen çıkarılır */
    price?: number | null;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    sku?: string;
    /** Sadece gerçek bir üretici/marka verisi varsa doldurulur — mağaza adı marka olarak kullanılmaz */
    brand?: string;
    category?: string;
    images?: string[];
    /** TCG card condition, e.g. 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' | 'PSA10' */
    condition?: string;
    /** Gerçek onaylı değerlendirme verisi varsa doldurulur (sahte veri üretilmez) */
    rating?: { average: number; count: number };
  };
  breadcrumbs?: Array<{ name: string; url: string }>;
  /** Sayfada görünür SSS bölümü varsa FAQPage şeması üretir — SSR (server/seo/render.ts)
   * ile aynı soru/cevap içeriği kullanılmalıdır (parite kuralı). */
  faqItems?: Array<{ q: string; a: string }>;
}

const DEFAULT_TITLE = 'Go|Cards — Riftbound & Pokémon TCG Kart Oyunları';
const DEFAULT_DESCRIPTION = 'Go|Cards — Türkiye\'nin TCG mağazası. Pokémon TCG ve Riftbound booster pack, kapalı kutu, tekli kart satışı. Hızlı kargo, güvenli alışveriş.';
// NOT: window.location.origin KULLANILMAZ — eski domain (gocards.toov.com.tr),
// www ön eki veya bir replit.dev önizleme host'undan JS mount olduğunda
// canonical/OG URL'lerin yanlış host'u reklam etmesini önlemek için sabit
// canonical domain kullanılır. Sunucu tarafı prerender de aynı sabiti kullanır
// (server/seo/render.ts), böylece ilk yanıt ile client mount sonrası tutarlı kalır.
const BASE_URL = CANONICAL_SITE_URL;

/** Map TCG condition codes to schema.org itemCondition values */
function toSchemaCondition(condition?: string): string | undefined {
  if (!condition) return undefined;
  const c = condition.toUpperCase();
  if (c === 'NM' || c === 'LP') return 'https://schema.org/NewCondition';
  if (c === 'DMG') return 'https://schema.org/DamagedCondition';
  return 'https://schema.org/UsedCondition';
}

export function SEO({ 
  title, 
  description = DEFAULT_DESCRIPTION, 
  image,
  url,
  type = 'website',
  noIndex = false,
  noIndexFollow = false,
  suppressCanonical = false,
  product,
  breadcrumbs,
  faqItems
}: SEOProps) {
  // SSR (server/seo/seoDefaults.ts) ile birebir aynı kırpma sözleşmesi:
  // sayfaya özgü başlık/açıklama 70/160 karaktere kırpılır, site adı eki
  // (" | SITE_NAME") bundan SONRA ve yalnızca burada eklenir — admin SEO
  // override alanlarına site adını dahil etmek gerekmez.
  const clampedTitle = title ? truncateSeoText(title, 70) : undefined;
  const clampedDescription = truncateSeoText(description, 160);
  const fullTitle = clampedTitle ? `${clampedTitle} | ${SITE_NAME}` : DEFAULT_TITLE;
  // `url` verilmediğinde de mevcut host yerine canonical domain + gerçek
  // pathname kullanılır (window.location.href asla host kaynağı olarak
  // kullanılmaz — bkz. BASE_URL notu).
  const fullUrl = `${BASE_URL}${url ?? (typeof window !== 'undefined' ? window.location.pathname : '')}`;
  const imageUrl = image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}/og-image.png`;

  useEffect(() => {
    document.title = fullTitle;
    
    const updateMetaTag = (selector: string, content: string, attr = 'content') => {
      let element = document.querySelector(selector);
      if (element) {
        element.setAttribute(attr, content);
      }
    };

    updateMetaTag('meta[name="description"]', clampedDescription);
    updateMetaTag('meta[name="robots"]', noIndex ? (noIndexFollow ? 'noindex, follow' : 'noindex, nofollow') : 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (suppressCanonical) {
      // 404 gibi gerçek hata sayfaları kendine canonical vermez: var olmayan
      // bir URL'yi canonical işaretlemek arama motorlarına çelişkili sinyaldir.
      canonical?.remove();
    } else {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        canonical.setAttribute('data-managed', 'seo');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', fullUrl);
    }

    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', clampedDescription);
    updateMetaTag('meta[property="og:url"]', fullUrl);
    updateMetaTag('meta[property="og:type"]', type);
    updateMetaTag('meta[property="og:image"]', imageUrl);
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', clampedDescription);
    updateMetaTag('meta[name="twitter:image"]', imageUrl);

    const existingSchema = document.querySelector('script[data-schema="seo"]');
    if (existingSchema) {
      existingSchema.remove();
    }

    const schemas: any[] = [];

    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${CANONICAL_SITE_URL}/#organization`,
      name: 'GoCards TCG',
      legalName: 'GO CARDS TCG İÇ VE DIŞ TİC. LTD. ŞTİ.',
      url: CANONICAL_SITE_URL,
      logo: `${CANONICAL_SITE_URL}/gocards-logo-white.png`,
      sameAs: [
        'https://instagram.com/gocardstcg',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'gocardshub@gmail.com',
        telephone: '+905389216780',
        contactType: 'customer service',
        areaServed: 'TR',
        availableLanguage: 'Turkish'
      }
    });

    if (product) {
      const normalizeImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
      };
      
      const productImages = product.images 
        ? product.images.map(normalizeImageUrl) 
        : [imageUrl];
      
      const schemaCondition = toSchemaCondition(product.condition);
      // Offer yalnızca gerçek pozitif bir fiyat varsa üretilir (SSR renderCard
      // ile aynı kural): fiyatsız Offer + availability gibi yarım şema veya
      // sıfır/uydurma fiyat asla basılmaz. Satış yoksa temiz Product kalır.
      const hasPrice = typeof product.price === 'number' && Number.isFinite(product.price) && product.price > 0;
      const productSchema: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: clampedDescription,
        image: productImages,
      };
      if (hasPrice) {
        productSchema.offers = {
          '@type': 'Offer',
          url: fullUrl,
          priceCurrency: product.currency || 'TRY',
          price: product.price,
          availability: `https://schema.org/${product.availability || 'InStock'}`,
          seller: {
            '@type': 'Organization',
            name: 'GoCards TCG',
            url: CANONICAL_SITE_URL
          },
          ...(schemaCondition ? { itemCondition: schemaCondition } : {}),
        };
      }
      // Marka sadece gerçek bir üretici/yayıncı verisi varsa eklenir — mağaza adı marka olarak kullanılmaz
      if (product.brand) {
        productSchema.brand = { '@type': 'Brand', name: product.brand };
      }
      if (product.sku) productSchema.sku = product.sku;
      if (product.category) productSchema.category = product.category;
      // Sahte/varsayılan puan üretilmez — sadece gerçek onaylı değerlendirme verisi varsa eklenir
      if (product.rating && product.rating.count > 0) {
        productSchema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: product.rating.average,
          reviewCount: product.rating.count,
        };
      }
      schemas.push(productSchema);
    }

    if (faqItems && faqItems.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      });
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${BASE_URL}${item.url}`
        }))
      });
    }

    if (type === 'website' && !product) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        name: 'Go|Cards',
        url: BASE_URL,
        publisher: { '@id': `${BASE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/kartlar?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      });
    }

    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.setAttribute('data-schema', 'seo');
    schemaScript.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
    document.head.appendChild(schemaScript);

    return () => {
      const script = document.querySelector('script[data-schema="seo"]');
      if (script) script.remove();
      const managedCanonical = document.querySelector('link[rel="canonical"][data-managed="seo"]');
      if (managedCanonical) managedCanonical.remove();
    };
  }, [fullTitle, description, fullUrl, type, imageUrl, noIndex, noIndexFollow, product, breadcrumbs, faqItems]);

  return null;
}
