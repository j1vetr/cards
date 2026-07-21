import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  noIndex?: boolean;
  product?: {
    name: string;
    price: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    sku?: string;
    brand?: string;
    category?: string;
    images?: string[];
    /** TCG card condition, e.g. 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' | 'PSA10' */
    condition?: string;
  };
  breadcrumbs?: Array<{ name: string; url: string }>;
}

const DEFAULT_TITLE = 'Go|Cards — Pokémon TCG & Riftbound Kart Oyunları';
const DEFAULT_DESCRIPTION = 'Go|Cards — Türkiye\'nin TCG mağazası. Pokémon TCG ve Riftbound booster pack, kapalı kutu, tekli kart satışı. Hızlı kargo, güvenli alışveriş.';
const SITE_NAME = 'Go|Cards';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const CANONICAL_SITE_URL = 'https://gocards.toov.com.tr';

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
  product,
  breadcrumbs
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullUrl = url ? `${BASE_URL}${url}` : (typeof window !== 'undefined' ? window.location.href : '');
  const imageUrl = image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : `${BASE_URL}/og-image.png`;

  useEffect(() => {
    document.title = fullTitle;
    
    const updateMetaTag = (selector: string, content: string, attr = 'content') => {
      let element = document.querySelector(selector);
      if (element) {
        element.setAttribute(attr, content);
      }
    };

    updateMetaTag('meta[name="description"]', description);
    updateMetaTag('meta[name="robots"]', noIndex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('data-managed', 'seo');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[property="og:url"]', fullUrl);
    updateMetaTag('meta[property="og:type"]', type);
    updateMetaTag('meta[property="og:image"]', imageUrl);
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', description);
    updateMetaTag('meta[name="twitter:image"]', imageUrl);

    const existingSchema = document.querySelector('script[data-schema="seo"]');
    if (existingSchema) {
      existingSchema.remove();
    }

    const schemas: any[] = [];

    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Go|Cards',
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
      const productSchema: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: description,
        image: productImages,
        brand: {
          '@type': 'Brand',
          name: product.brand || 'Go|Cards'
        },
        offers: {
          '@type': 'Offer',
          url: fullUrl,
          priceCurrency: product.currency || 'TRY',
          price: product.price,
          availability: `https://schema.org/${product.availability || 'InStock'}`,
          seller: {
            '@type': 'Organization',
            name: 'Go|Cards',
            url: CANONICAL_SITE_URL
          },
          ...(schemaCondition ? { itemCondition: schemaCondition } : {}),
        }
      };
      if (product.sku) productSchema.sku = product.sku;
      if (product.category) productSchema.category = product.category;
      schemas.push(productSchema);
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
        name: 'Go|Cards',
        url: BASE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/arama?q={search_term_string}`,
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
  }, [fullTitle, description, fullUrl, type, imageUrl, noIndex, product, breadcrumbs]);

  return null;
}
