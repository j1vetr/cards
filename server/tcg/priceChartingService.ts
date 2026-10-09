/**
 * PriceCharting API service — pricecharting.com/api-documentation
 * API key stored in site_settings as 'pricecharting_api_key'.
 * Fetches market/low/high prices for TCG cards and upserts into card_prices.
 */

const BASE_URL = "https://www.pricecharting.com/api";
export const RATE_DELAY_MS = 1100; // API permits at most one request per second

let requestQueue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

// Share the quota across the legacy sync and sale-price previews.
// Do not log request URLs: the API token is a query parameter.
function requestPriceCharting(path: string, apiKey: string): Promise<any> {
  const request = requestQueue.then(async () => {
    await sleep(Math.max(0, RATE_DELAY_MS - (Date.now() - lastRequestAt)));
    lastRequestAt = Date.now();
    let response: Response;
    try {
      response = await fetch(priceChartingUrl(path, apiKey), { signal: AbortSignal.timeout(15000) });
    } catch {
      throw new Error("PriceCharting bağlantısı kurulamadı.");
    }
    if (!response.ok) throw new Error(`PriceCharting isteği başarısız (HTTP ${response.status}).`);
    const data = await response.json();
    if (data.status === "error") throw new Error("PriceCharting isteği reddedildi. API aboneliğini kontrol edin.");
    return data;
  });
  requestQueue = request.catch(() => undefined);
  return request;
}

export interface PriceChartingProduct {
  id: string | number;
  "product-name"?: string;
  "console-name"?: string;
  "loose-price"?: number;    // ungraded market price (cents)
  "cib-price"?: number;      // near-mint / complete in box (cents)
  "new-price"?: number;      // graded / sealed (cents)
  "box-only-price"?: number;
  "manual-only-price"?: number;
}

export interface CardPriceResult {
  cardId: string;
  source: "pricecharting";
  priceMarket: string | null;
  priceLow: string | null;
  priceHigh: string | null;
  currency: "USD";
  found: boolean;
}

function centsToDecimal(cents: number | undefined): string | null {
  if (cents === undefined || cents === null) return null;
  return (cents / 100).toFixed(2);
}

function priceChartingUrl(path: string, apiKey: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${BASE_URL}${path}${sep}t=${encodeURIComponent(apiKey)}`;
}

/**
 * Search PriceCharting by card name (returns first match).
 * Throws on HTTP errors so the engine can record the failure.
 */
export async function searchPriceCharting(
  cardName: string,
  apiKey: string,
): Promise<PriceChartingProduct | null> {
  const products = await searchPriceChartingProducts(cardName, apiKey);
  return products[0] ?? null;
}

export async function searchPriceChartingProducts(query: string, apiKey: string): Promise<PriceChartingProduct[]> {
  const data = await requestPriceCharting(`/products?q=${encodeURIComponent(query)}`, apiKey);
  if (!Array.isArray(data.products)) throw new Error("PriceCharting yanıtı okunamadı.");
  return data.products;
}
/**
 * Fetch price for a known PriceCharting product ID.
 * Throws on HTTP errors.
 */
export async function fetchPriceById(
  productId: string | number,
  apiKey: string,
): Promise<PriceChartingProduct> {
  return requestPriceCharting(`/product?id=${encodeURIComponent(String(productId))}`, apiKey);
}

/** Map a PriceCharting product to our card_prices shape */
export function mapPriceToDb(
  cardId: string,
  product: PriceChartingProduct,
): CardPriceResult {
  return {
    cardId,
    source: "pricecharting",
    priceMarket: centsToDecimal(product["loose-price"]),
    priceLow: centsToDecimal(product["box-only-price"] ?? product["loose-price"]),
    priceHigh: centsToDecimal(product["new-price"] ?? product["cib-price"]),
    currency: "USD",
    found: true,
  };
}

/** Sleep helper for rate limiting */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
