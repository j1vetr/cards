import type { PriceChartingProduct } from "./priceChartingService";

export const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";

export function parseTcmbUsd(xml: string, now = new Date()) {
  const dateParts = xml.match(/<Tarih_Date\b[^>]*\bTarih="(\d{2})\.(\d{2})\.(\d{4})"/);
  const currency = xml.match(/<Currency\b[^>]*\bCurrencyCode="USD"[^>]*>([\s\S]*?)<\/Currency>/)?.[1];
  const rateText = currency?.match(/<ForexSelling>\s*(\d+(?:\.\d+)?)\s*<\/ForexSelling>/)?.[1];
  const unit = currency?.match(/<Unit>\s*(\d+)\s*<\/Unit>/)?.[1];
  if (!dateParts || !rateText || unit !== "1") throw new Error("TCMB USD döviz satış kuru okunamadı.");
  const date = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  const age = now.getTime() - timestamp;
  const usdTry = Number(rateText);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date
    || age > 10 * 86400000 || age < -86400000 || !Number.isFinite(usdTry) || usdTry <= 0) {
    throw new Error("TCMB kuru geçersiz veya 10 günden eski. Fiyatlar değiştirilmedi.");
  }
  return { usdTry, date, source: TCMB_URL };
}

export function calculateSalePrice(usd: number, rate: number, multiplier: number): string {
  if (![usd, rate, multiplier].every((value) => Number.isFinite(value) && value > 0) || multiplier > 100) {
    throw new Error("Fiyat, kur veya çarpan geçersiz.");
  }
  const price = Math.round((usd * rate * multiplier + Number.EPSILON) * 100) / 100;
  if (price < 0.01 || price > 99999999.99) throw new Error("Hesaplanan fiyat desteklenen aralık dışında.");
  return price.toFixed(2);
}

const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normalizeNumber = (value: string) => value.toUpperCase().replace(/^0+(?=\d)/, "");

export interface MatchTarget {
  name: string;
  setName: string;
  gameName: string;
  cardNumber: string | null;
  finish: string;
}

// Only an unambiguous exact name + expansion + number + finish is eligible.
// Never use the first search hit or a graded high price as an ungraded value.
export function selectPriceMatch(products: PriceChartingProduct[], target: MatchTarget): PriceChartingProduct | null {
  const number = target.cardNumber?.split("/")[0].trim();
  if (!number || !["normal", "foil"].includes(target.finish)) return null;
  const game = normalize(target.gameName).replace(/\btc[g]?\b/g, "").trim().replace(/^pokemon.*$/, "pokemon");
  const matches = products.filter((product) => {
    const consoleName = normalize(product["console-name"] || "");
    const expectedConsole = normalize(`${game} ${target.setName}`);
    if (consoleName !== expectedConsole) return false;
    const title = product["product-name"] || "";
    const titleNumber = title.match(/#([A-Za-z]*\d+[A-Za-z]*)\b/);
    if (!titleNumber || normalizeNumber(titleNumber[1]) !== normalizeNumber(number)) return false;
    const titleName = title.slice(0, titleNumber.index).replace(/\[[^\]]*\]/g, "").trim();
    if (normalize(titleName) !== normalize(target.name)) return false;
    // Exclude editions/languages/finishes that the inventory cannot distinguish.
    const labels = title.match(/\[[^\]]*\]/g) || [];
    const suffix = title.slice((titleNumber.index || 0) + titleNumber[0].length).replace(/\[[^\]]*\]/g, "").trim();
    if (suffix || labels.some((label) => !/^\[(foil|holo|holofoil)\]$/i.test(label))) return false;
    const foil = labels.length > 0;
    return foil === (target.finish === "foil");
  });
  const unique = Array.from(new Map(matches.map((product) => [String(product.id), product])).values());
  return unique.length === 1 ? unique[0] : null;
}

export function marketUsdForCondition(product: PriceChartingProduct, condition: string): number | null {
  // PriceCharting does not provide LP/MP/HP/DMG-specific values.
  // Only its documented PSA10 field is explicitly PSA-specific.
  const cents = condition === "NM" ? product["loose-price"]
    : condition === "PSA10" ? product["manual-only-price"] : undefined;
  return typeof cents === "number" && Number.isFinite(cents) && cents > 0 ? cents / 100 : null;
}
