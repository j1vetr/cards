/**
 * Pazaryerinden bağımsız adapter sözleşmesi.
 * Yeni bir pazaryeri (N11, Hepsiburada, Amazon) eklemek için yalnız bu interface'i
 * implement eden bir factory yazıp registry'ye kaydetmek yeterlidir.
 *
 * Tek yön: pazaryeri → site (read-only). Sipariş/push fonksiyonu yok.
 */

export type MarketplaceType = "trendyol" | "n11" | "hepsiburada" | "amazon";

/** Adapter constructor'ına geçilen, çözülmüş kredensiyeller + non-secret config. */
export interface MarketplaceCredentials {
  [key: string]: string | number | boolean | undefined;
}

export interface MarketplaceConfig {
  sandbox?: boolean;
  [key: string]: unknown;
}

/** Normalize edilmiş kategori — pazaryerinden bağımsız. */
export interface NormalizedCategory {
  externalId: string;
  name: string;
  parentExternalId?: string | null;
}

/** Normalize edilmiş ürün görseli. */
export interface NormalizedImage {
  url: string;
  /** Trendyol'dan gelen sıralama (0 = ana görsel). */
  order: number;
}

/** Normalize edilmiş varyant (beden, renk, fiyat, stok). */
export interface NormalizedVariant {
  externalVariantId?: string | null;
  size?: string | null;
  color?: { name: string; hex?: string | null } | null;
  price: number;
  stock: number;
  sku?: string | null;
  barcode?: string | null;
}

/** Normalize edilmiş ürün. Sync engine bunu okur, IStorage'a yazar. */
export interface NormalizedProduct {
  /** Pazaryerine has tekil id (Trendyol contentId / barcode). */
  externalId: string;
  /** Pazaryerindeki müşteri-görünür ürün kodu (slug deterministliği için kullanılır). */
  externalProductCode?: string | null;
  /** Pazaryeri kategorisi external id — registry sonra eşleştirir. */
  externalCategoryId: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  basePrice: number;
  /** Toplam stok (varyantların toplamı veya tek stok). */
  totalStock: number;
  images: NormalizedImage[];
  variants: NormalizedVariant[];
  /** Pazaryerinden gelen ürün durumu — `false` ise site'da gizlenir. */
  isActive: boolean;
}

/** Bir tek ürünün stok+fiyat snapshot'ı (delta sync için). */
export interface NormalizedStockPrice {
  externalId: string;
  basePrice: number;
  totalStock: number;
  isActive: boolean;
  /** Varyant düzeyinde değişim varsa. */
  variants?: Array<{
    externalVariantId?: string | null;
    sku?: string | null;
    barcode?: string | null;
    price: number;
    stock: number;
  }>;
}

/** Sayfalama cursor — adapter'a opaque. */
export type PageCursor = string | number | null;

export interface ProductsPage {
  products: NormalizedProduct[];
  /** null ise sayfa biter. */
  nextCursor: PageCursor;
  /** Bilgi amaçlı — toplam kayıt sayısı (varsa). */
  total?: number;
}

/** Bağlantı testi sonucu. */
export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Pazaryeri adapter sözleşmesi — minimum okuma yüzeyi.
 * Breaking change: ekleme yapmadan önce iki kere düşün.
 */
export interface MarketplaceAdapter {
  /** Saf bilgi — log/telemetri için. */
  readonly type: MarketplaceType;

  /** Kredensiyellerin geçerli olup olmadığını doğrular. */
  testConnection(): Promise<ConnectionTestResult>;

  /** Tüm kategori ağacını döndürür (genelde küçük). */
  fetchCategoryTree(): Promise<NormalizedCategory[]>;

  /** Onaylı ürünleri sayfa sayfa çeker. */
  fetchProductsPage(cursor: PageCursor): Promise<ProductsPage>;

  /**
   * Bir grup ürünün güncel stok+fiyatını döner (delta için).
   * externalId listesi ile çağrılır. Boş döndürülmüşler için sync motoru
   * detayını korur.
   */
  fetchStockAndPrice(externalIds: string[]): Promise<NormalizedStockPrice[]>;
}

/**
 * Adapter factory — registry tarafından çağrılır, her marketplace satırı için
 * ayrı instance üretir.
 */
export type MarketplaceAdapterFactory = (
  credentials: MarketplaceCredentials,
  config: MarketplaceConfig,
) => MarketplaceAdapter;

/** Adapter düzeyinde fırlatılan ortak hata. */
export class MarketplaceError extends Error {
  readonly statusCode?: number;
  readonly retryable: boolean;
  constructor(message: string, opts: { statusCode?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "MarketplaceError";
    this.statusCode = opts.statusCode;
    this.retryable = opts.retryable ?? false;
  }
}
