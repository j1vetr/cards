/**
 * PriceCharting API service — pricecharting.com/api-documentation
 * API key stored in site_settings as 'pricecharting_api_key'.
 * Fetches market/low/high prices for TCG cards and upserts into card_prices.
 */

import { httpFetchWithRetry } from "./httpUtils";

const BASE_URL = "https://www.pricecharting.com/api";
export const RATE_DELAY_MS = 300; // conservative rate limiting

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
  const url = priceChartingUrl(
    `/products?q=${encodeURIComponent(cardName)}&status=price`,
    apiKey,
  );
  const data = await httpFetchWithRetry(url, {});
  const products: PriceChartingProduct[] = data.products ?? [];
  return products[0] ?? null;
}

/**
 * Fetch price for a known PriceCharting product ID.
 * Throws on HTTP errors.
 */
export async function fetchPriceById(
  productId: string | number,
  apiKey: string,
): Promise<PriceChartingProduct> {
  const url = priceChartingUrl(`/product?id=${productId}&status=price`, apiKey);
  return httpFetchWithRetry(url, {}) as Promise<PriceChartingProduct>;
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
