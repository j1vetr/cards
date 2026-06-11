/**
 * Trendyol Integration API adapter — pazaryeri tipi 'trendyol'.
 *
 * API kökü: https://apigw.trendyol.com/integration/
 * Auth: Basic ${apiKey}:${apiSecret}
 * User-Agent zorunlu format: `${supplierId} - SelfIntegration`.
 *
 * --------------------------------------------------------------------
 * Servis limitleri (https://developers.trendyol.com/docs/1-servis-limitleri)
 *   - Ürün Filtreleme (/products) ......... 2000 req/min   ← bizim hot path
 *   - Stok ve Fiyat Güncelleme ............ NO LIMIT
 *   - TY Kategori Listesi ................. 50   req/min   (artık çağırmıyoruz)
 *   - İade/Sevkiyat Adres Bilgileri ....... 1    req/HOUR  (sadece debug)
 *   - Ürün Silme .......................... 100  req/min
 * Biz default 1500 req/min ile çalışıyoruz (limitin %75'i, headroom için).
 * --------------------------------------------------------------------
 *
 * Yalnız okuma fonksiyonları:
 *   - testConnection: /products?page=0&size=1
 *   - fetchCategoryTree: /product/product-categories (engine artık çağırmıyor)
 *   - fetchProductsPage: /product/sellers/{sellerId}/products?page=N&size=50
 *   - fetchStockAndPrice: aynı listing endpoint'ten yalnız barkode/stok/price alanları
 *
 * Sayfalama: cursor = page numarası (string). null → sayfa biter.
 */

import { MarketplaceHttpClient } from "../http";
import { registerAdapter } from "../registry";
import {
  MarketplaceAdapter,
  MarketplaceConfig,
  MarketplaceCredentials,
  MarketplaceError,
  NormalizedCategory,
  NormalizedProduct,
  NormalizedStockPrice,
  NormalizedVariant,
  PageCursor,
  ProductsPage,
  ConnectionTestResult,
} from "../types";

interface TrendyolCreds extends MarketplaceCredentials {
  supplierId: string | number;
  apiKey: string;
  apiSecret: string;
}

const DEFAULT_BASE = "https://apigw.trendyol.com/integration";
// Trendyol Cloudflare/LB katmanı büyük sayfalarda HTTP 556 (upstream overload)
// dönmeye eğilimli. 50, gateway'in stabil kabul ettiği güvenli üst sınır.
const DEFAULT_PAGE_SIZE = 50;

interface TrendyolCategory {
  id: number;
  name: string;
  parentId?: number | null;
  subCategories?: TrendyolCategory[];
}

interface TrendyolImage {
  url: string;
}

interface TrendyolVideo {
  url: string;
}

interface TrendyolAttribute {
  attributeName?: string;
  attributeValue?: string;
}

interface TrendyolProduct {
  id?: number;
  productMainId?: string;
  contentId?: number | string;
  barcode: string;
  productCode?: string;
  stockCode?: string;
  title: string;
  description?: string;
  brand?: string;
  categoryId?: number;
  /** Trendyol Listings API'da gerçek leaf categoryId burada gelir. */
  pimCategoryId?: number;
  categoryName?: string;
  listPrice?: number;
  salePrice: number;
  quantity: number;
  approved?: boolean;
  archived?: boolean;
  onSale?: boolean;
  rejected?: boolean;
  images: TrendyolImage[];
  videos?: TrendyolVideo[];
  attributes?: TrendyolAttribute[];
  size?: string;
  color?: string;
}

interface TrendyolListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: TrendyolProduct[];
}

class TrendyolAdapter implements MarketplaceAdapter {
  readonly type = "trendyol" as const;
  private readonly client: MarketplaceHttpClient;
  private readonly supplierId: string;

  constructor(creds: TrendyolCreds, config: MarketplaceConfig) {
    if (!creds.supplierId || !creds.apiKey || !creds.apiSecret) {
      throw new MarketplaceError(
        "Trendyol adapter requires supplierId, apiKey and apiSecret",
        { retryable: false },
      );
    }
    this.supplierId = String(creds.supplierId);
    const base =
      (config.sandbox && (process.env.TRENDYOL_SANDBOX_BASE_URL || ""))
        ? String(process.env.TRENDYOL_SANDBOX_BASE_URL)
        : DEFAULT_BASE;
    this.client = new MarketplaceHttpClient({
      baseUrl: base,
      basicAuthUser: String(creds.apiKey),
      basicAuthPass: String(creds.apiSecret),
      userAgent: `${this.supplierId} - SelfIntegration`,
      // Trendyol "Ürün Filtreleme" 2000 req/min — biz 1500 ile %75 headroom bırakıyoruz.
      // Diğer endpoint'lere bu adapter çağrı yapmadığından tek bir bucket yeterli.
      rateLimitPerMinute:
        typeof config.rateLimit === "number" ? (config.rateLimit as number) : 1500,
    });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Hafif bir endpoint: ilk sayfa, size=1
      await this.client.request<TrendyolListResponse>(
        `/suppliers/${encodeURIComponent(this.supplierId)}/products?page=0&size=1`,
      );
      return { ok: true, message: "Trendyol bağlantısı başarılı." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        message: `Trendyol bağlantı hatası: ${msg}`,
        details: { statusCode: (err as MarketplaceError)?.statusCode },
      };
    }
  }

  async fetchCategoryTree(): Promise<NormalizedCategory[]> {
    const resp = await this.client.request<{ categories: TrendyolCategory[] }>(
      `/product/product-categories`,
    );
    const out: NormalizedCategory[] = [];
    const walk = (nodes: TrendyolCategory[] | undefined, parentId: string | null) => {
      if (!nodes) return;
      for (const n of nodes) {
        out.push({
          externalId: String(n.id),
          name: n.name,
          parentExternalId: parentId,
        });
        if (n.subCategories?.length) walk(n.subCategories, String(n.id));
      }
    };
    walk(resp.categories, null);
    return out;
  }

  async fetchProductsPage(cursor: PageCursor): Promise<ProductsPage> {
    const page = cursor == null ? 0 : Number(cursor);
    // approved=true parametresi Trendyol gateway'inde sıkça 556 tetikliyor;
    // tüm ürünleri çekip site tarafında p.approved/archived/rejected üzerinden
    // isActive hesaplıyoruz (bkz. normalize()).
    const url =
      `/product/sellers/${encodeURIComponent(this.supplierId)}/products` +
      `?page=${page}&size=${DEFAULT_PAGE_SIZE}`;
    const resp = await this.client.request<TrendyolListResponse>(url);

    const products = (resp.content ?? []).map((p) => normalize(p));
    const next = page + 1;
    const hasMore = resp.totalPages != null ? next < resp.totalPages : products.length > 0;

    return {
      products,
      nextCursor: hasMore ? next : null,
      total: resp.totalElements,
    };
  }

  async fetchStockAndPrice(externalIds: string[]): Promise<NormalizedStockPrice[]> {
    if (externalIds.length === 0) return [];
    // Trendyol'da hızlı tek-istek yolu yok; barcode'ları batch'leyelim (size=200).
    // Burada güvenli/genel yaklaşım: ürünleri sayfa sayfa tara, istenenleri filtre et.
    const wanted = new Set(externalIds.map(String));
    const out: NormalizedStockPrice[] = [];
    let page = 0;
    while (true) {
      const url =
        `/product/sellers/${encodeURIComponent(this.supplierId)}/products` +
        `?page=${page}&size=${DEFAULT_PAGE_SIZE}`;
      const resp = await this.client.request<TrendyolListResponse>(url);
      for (const p of resp.content ?? []) {
        const id = String(p.contentId ?? p.barcode);
        if (!wanted.has(id)) continue;
        const price = Number(p.salePrice ?? 0);
        const stock = Number(p.quantity ?? 0);
        // Trendyol her satırı bir barcode/SKU olarak döndürür → tek varyant.
        // sku alanı productVariants.sku ile eşleşir; barcode da yedek anahtardır.
        out.push({
          externalId: id,
          basePrice: price,
          totalStock: stock,
          isActive:
            (p.approved === undefined || p.approved === true) && !p.archived && !p.rejected,
          variants: [
            {
              externalVariantId: p.barcode ? String(p.barcode) : null,
              sku: p.stockCode ?? p.productCode ?? null,
              barcode: p.barcode ?? null,
              price,
              stock,
            },
          ],
        });
      }
      page += 1;
      if (resp.totalPages != null && page >= resp.totalPages) break;
      if (!resp.content || resp.content.length === 0) break;
      // Maksimum sayfa koruması
      if (page > 1000) break;
    }
    return out;
  }

  /**
   * Tek ürünün detayını döner. Trendyol'un dedike "GET product" endpoint'i
   * /products/{barcode} olabiliyor; biz güvenli şekilde liste filtresine
   * düşüyoruz: barcode ile sayfa sayfa tarayıp eşleşeni dönüyoruz.
   * Ağır endpoint kullanan yeni adapter'lar bu metodu daha verimli yazabilir.
   */
  async fetchProductDetails(externalId: string): Promise<NormalizedProduct | null> {
    const wanted = String(externalId);
    let page = 0;
    while (true) {
      const url =
        `/product/sellers/${encodeURIComponent(this.supplierId)}/products` +
        `?page=${page}&size=${DEFAULT_PAGE_SIZE}`;
      const resp = await this.client.request<TrendyolListResponse>(url);
      for (const p of resp.content ?? []) {
        const id = String(p.contentId ?? p.barcode);
        if (id === wanted) return normalize(p);
      }
      page += 1;
      if (resp.totalPages != null && page >= resp.totalPages) return null;
      if (!resp.content || resp.content.length === 0) return null;
      if (page > 1000) return null;
    }
  }
}

/**
 * Trendyol attribute array'inden belirtilen regex ile eşleşen ilk değeri döner.
 * Hem attributeName hem attributeValue alanları dolu olmalıdır.
 */
function findAttr(attrs: TrendyolAttribute[], namePattern: RegExp): string | undefined {
  return attrs.find(
    (a) => a.attributeName && namePattern.test(a.attributeName) && a.attributeValue,
  )?.attributeValue;
}

/** Trendyol beden değerini normalize et: "32", "W32", "W32L30" → "32" */
function normalizeDenimSize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Sadece rakam içeriyorsa, 28-44 arası denim beden aralığında ise doğrudan döndür
  const trimmed = raw.trim();
  const numMatch = trimmed.match(/^W?(\d+)/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 28 && num <= 44) return String(num);
  }
  return trimmed;
}

function normalize(p: TrendyolProduct): NormalizedProduct {
  const externalId = String(p.contentId ?? p.barcode);
  const code = p.productMainId || p.productCode || p.stockCode || p.barcode;

  const attrs = p.attributes ?? [];

  // Renk attribute'sini bul
  const colorAttr = findAttr(attrs, /renk|color/i);
  const sizeAttr = findAttr(attrs, /beden|size/i);

  // 9 jeans attribute — Trendyol'da "Materyal", "Likra Oranı", "Kumaş Tipi", vb.
  const attributes: Record<string, string> = {};
  const materyal = findAttr(attrs, /materyal|malzeme|material/i);
  if (materyal) attributes["Materyal"] = materyal;
  const likra = findAttr(attrs, /likra|elastan|elastane/i);
  if (likra) attributes["Likra"] = likra;
  const kumasTipi = findAttr(attrs, /kumaş\s*tip|fabric\s*type|dokuma/i);
  if (kumasTipi) attributes["Kumaş Tipi"] = kumasTipi;
  const pacaTipi = findAttr(attrs, /paça|paca|bacak\s*tip|leg\s*type|kesim\s*tip/i);
  if (pacaTipi) attributes["Paça Tipi"] = pacaTipi;
  const bel = findAttr(attrs, /bel\s*(yüksekl|tipi?|hizası?|seviye)|waist/i);
  if (bel) attributes["Bel"] = bel;
  const kalip = findAttr(attrs, /kalıp|kalip|fit\s*tip|kesim/i);
  if (kalip) attributes["Kalıp"] = kalip;
  const desen = findAttr(attrs, /desen|pattern|baskı/i);
  if (desen) attributes["Desen"] = desen;
  const renk = colorAttr ?? findAttr(attrs, /renk|color/i);
  if (renk) attributes["Renk"] = renk;
  const cep = findAttr(attrs, /cep\s*(say|tip|model|özellik)|pocket/i);
  if (cep) attributes["Cep"] = cep;

  const variant: NormalizedVariant = {
    externalVariantId: String(p.barcode),
    sku: p.stockCode ?? p.productCode ?? null,
    barcode: p.barcode,
    size: normalizeDenimSize(p.size ?? sizeAttr ?? null),
    color: p.color
      ? { name: p.color, hex: null }
      : colorAttr
        ? { name: colorAttr, hex: null }
        : null,
    price: Number(p.salePrice ?? 0),
    stock: Number(p.quantity ?? 0),
  };

  const isActive =
    (p.approved === undefined || p.approved === true) && !p.archived && !p.rejected;

  return {
    externalId,
    externalProductCode: code ?? null,
    // Trendyol Listings API'da leaf kategori ID'si `pimCategoryId` alanında
    // gelir; eski/bazı yanıtlarda `categoryId`. İkisi de yoksa string("undefined")
    // basmamak için boş bırakıyoruz; engine bu durumda ürünü skip edecek.
    externalCategoryId:
      p.pimCategoryId != null
        ? String(p.pimCategoryId)
        : p.categoryId != null
          ? String(p.categoryId)
          : "",
    externalCategoryName: p.categoryName ?? null,
    name: p.title,
    description: p.description ?? null,
    brand: p.brand ?? null,
    basePrice: Number(p.salePrice ?? 0),
    totalStock: Number(p.quantity ?? 0),
    images: (p.images ?? [])
      .filter((i) => i && i.url)
      .map((i, idx) => ({ url: i.url, order: idx })),
    videoUrl: p.videos?.[0]?.url ?? null,
    variants: [variant],
    isActive,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };
}

// === Registry kaydı (modül import edilince çalışır) ===
registerAdapter("trendyol", {
  displayName: "Trendyol",
  factory: (creds, cfg) => new TrendyolAdapter(creds as TrendyolCreds, cfg),
  credentialFields: [
    {
      key: "supplierId",
      label: "Supplier ID (Cari)",
      type: "text",
      required: true,
      helpText: "Trendyol satıcı paneliniz > Hesap > Entegrasyon Bilgileri",
    },
    { key: "apiKey", label: "API Key", type: "text", required: true },
    { key: "apiSecret", label: "API Secret", type: "password", required: true },
  ],
});

export { TrendyolAdapter };
