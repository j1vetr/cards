/**
 * PriceCharting API service — pricecharting.com/api-documentation
 * API key stored in site_settings as 'pricecharting_api_key'.
 * Returns USD-cent prices to the single TCMB preview/confirm workflow.
 */

const BASE_URL = "https://www.pricecharting.com/api";
export const RATE_DELAY_MS = 1100; // API permits at most one request per second

let requestQueue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

// Share the quota across all requests made by sale-price previews.
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
  "cib-price"?: number;      // cards: graded 7/7.5 (cents)
  "new-price"?: number;      // cards: graded 8/8.5 (cents)
  "box-only-price"?: number; // cards: graded 9.5 (cents)
  "manual-only-price"?: number;
}

function priceChartingUrl(path: string, apiKey: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${BASE_URL}${path}${sep}t=${encodeURIComponent(apiKey)}`;
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

/** Sleep helper for rate limiting */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
