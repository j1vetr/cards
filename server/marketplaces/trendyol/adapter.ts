/**
 * Trendyol Integration API adapter — pazaryeri tipi 'trendyol'.
 *
 * API kökü: https://apigw.trendyol.com/integration/
 * Auth: Basic ${apiKey}:${apiSecret}
 * User-Agent zorunlu (Trendyol denetler).
 *
 * Yalnız okuma fonksiyonları:
 *   - testConnection: brands endpoint'iyle hafif bir GET
 *   - fetchCategoryTree: /product/product-categories
 *   - fetchProductsPage: /suppliers/{supplierId}/products?page=N&size=200&approved=true
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
const DEFAULT_PAGE_SIZE = 200;

interface TrendyolCategory {
  id: number;
  name: string;
  parentId?: number | null;
  subCategories?: TrendyolCategory[];
}

interface TrendyolImage {
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
  categoryId: number;
  categoryName?: string;
  listPrice?: number;
  salePrice: number;
  quantity: number;
  approved?: boolean;
  archived?: boolean;
  onSale?: boolean;
  rejected?: boolean;
  images: TrendyolImage[];
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
      rateLimitPerMinute: typeof config.rateLimit === "number" ? (config.rateLimit as number) : 600,
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
    const url =
      `/suppliers/${encodeURIComponent(this.supplierId)}/products` +
      `?page=${page}&size=${DEFAULT_PAGE_SIZE}&approved=true`;
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
        `/suppliers/${encodeURIComponent(this.supplierId)}/products` +
        `?page=${page}&size=${DEFAULT_PAGE_SIZE}`;
      const resp = await this.client.request<TrendyolListResponse>(url);
      for (const p of resp.content ?? []) {
        const id = String(p.contentId ?? p.barcode);
        if (!wanted.has(id)) continue;
        out.push({
          externalId: id,
          basePrice: Number(p.salePrice ?? 0),
          totalStock: Number(p.quantity ?? 0),
          isActive: !!p.approved && !p.archived && !p.rejected,
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
        `/suppliers/${encodeURIComponent(this.supplierId)}/products` +
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

function normalize(p: TrendyolProduct): NormalizedProduct {
  const externalId = String(p.contentId ?? p.barcode);
  const code = p.productMainId || p.productCode || p.stockCode || p.barcode;

  // Renk attribute'sini bul
  const colorAttr = (p.attributes ?? []).find(
    (a) => a.attributeName && /renk|color/i.test(a.attributeName),
  );
  const sizeAttr = (p.attributes ?? []).find(
    (a) => a.attributeName && /(beden|size)/i.test(a.attributeName),
  );

  const variant: NormalizedVariant = {
    externalVariantId: String(p.barcode),
    sku: p.stockCode ?? p.productCode ?? null,
    barcode: p.barcode,
    size: p.size ?? sizeAttr?.attributeValue ?? null,
    color: p.color
      ? { name: p.color, hex: null }
      : colorAttr?.attributeValue
        ? { name: colorAttr.attributeValue, hex: null }
        : null,
    price: Number(p.salePrice ?? 0),
    stock: Number(p.quantity ?? 0),
  };

  const isActive =
    (p.approved === undefined || p.approved === true) && !p.archived && !p.rejected;

  return {
    externalId,
    externalProductCode: code ?? null,
    externalCategoryId: String(p.categoryId),
    name: p.title,
    description: p.description ?? null,
    brand: p.brand ?? null,
    basePrice: Number(p.salePrice ?? 0),
    totalStock: Number(p.quantity ?? 0),
    images: (p.images ?? [])
      .filter((i) => i && i.url)
      .map((i, idx) => ({ url: i.url, order: idx })),
    variants: [variant],
    isActive,
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
