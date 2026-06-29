/**
 * PriceCharting API service — pricecharting.com/api-documentation
 * API key stored in site_settings as 'pricecharting_api_key'.
 * Fetches market/low/high prices for TCG cards and upserts into card_prices.
 */

const BASE_URL = "https://www.pricecharting.com/api";
const TIMEOUT_MS = 10_000;
const RATE_DELAY_MS = 300; // conservative rate limiting

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

async function priceChartingFetch(path: string, apiKey: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}t=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 401) throw new Error("PriceCharting API key geçersiz");
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`PriceCharting API ${res.status}: ${res.statusText}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Search PriceCharting by card name (returns first match) */
export async function searchPriceCharting(
  cardName: string,
  apiKey: string,
): Promise<PriceChartingProduct | null> {
  try {
    const data = await priceChartingFetch(
      `/products?q=${encodeURIComponent(cardName)}&status=price`,
      apiKey,
    );
    if (!data) return null;
    const products: PriceChartingProduct[] = data.products ?? [];
    return products[0] ?? null;
  } catch {
    return null;
  }
}

/** Fetch price for a known PriceCharting product ID */
export async function fetchPriceById(
  productId: string | number,
  apiKey: string,
): Promise<PriceChartingProduct | null> {
  try {
    const data = await priceChartingFetch(`/product?id=${productId}&status=price`, apiKey);
    return data ?? null;
  } catch {
    return null;
  }
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

export { RATE_DELAY_MS };
