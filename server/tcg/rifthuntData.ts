import { z } from "zod";
import type { RiftFinish, RiftPrinting } from "@shared/rifthunt";
import { calculateSalePrice } from "./salePricingMath";

export const RIFTHUNT_BASE = "https://api.rifthunt.com";
export const MAX_PRICE_AGE = 72 * 3600_000;
const amount = z.number().finite().nonnegative().nullable();
const finishSchema = z.enum(["normal", "foil"]);
const marketSchema = z.object({
  market: amount, low: amount, mid: amount, high: amount, directLow: amount.optional(),
});
const marketRowSchema = z.object({
  printing_id: z.string().uuid(), collector: z.string().min(1), slug: z.string(),
  updatedAt: z.string(), purchaseUri: z.string().nullable().optional(),
  finishes: z.record(marketSchema),
});
const cardSchema = z.object({
  printing_id: z.string().uuid(), oracle_id: z.string().uuid(),
  riftboundId: z.string().min(1), name: z.string().min(1), cleanName: z.string().optional(),
  set: z.string().min(1), setName: z.string().min(1), num: z.number().nullable().optional(),
  rarity: z.string(), type: z.string(), domains: z.array(z.string()),
  energy: z.number().nullable(), power: z.number().nullable(), might: z.number().nullable(),
  text: z.string().nullable(), flavour: z.string().nullable().optional(),
  artist: z.string().nullable(), imgUrl: z.string().nullable(),
  alt: z.boolean(), sig: z.boolean(), over: z.boolean(),
  finishes: z.array(finishSchema).nullable(),
  tags: z.array(z.string()).optional(),
  cardmarketUrl: z.string().nullable().optional(),
});
export interface RiftSnapshot {
  fetchedAt: string;
  sourceFetchedAt: string;
  sets: { code: string; name: string; count: number; released: string | null }[];
  printings: RiftPrinting[];
  tags: any;
  rulings: any;
  warnings: string[];
}
export function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; }
  catch { return null; }
}
export function normalizeRifthunt(catalog: unknown, prices: unknown): RiftSnapshot {
  const c = z.object({
    fetched: z.string(), source: z.literal("riotgames.com"),
    sets: z.array(z.object({ id: z.string(), name: z.string(), count: z.number(), released: z.string().nullable() })).min(1),
    cards: z.array(cardSchema).min(1),
  }).parse(catalog);
  const p = z.object({
    currency: z.literal("USD"), source: z.literal("tcgplayer"),
    prices: z.array(marketRowSchema),
    cardmarket: z.object({
      currency: z.literal("EUR"), source: z.literal("cardmarket"),
      prices: z.array(z.object({
        printing_id: z.string().uuid(), updatedAt: z.string(), purchaseUri: z.string().nullable().optional(),
        finishes: z.record(z.object({ trend: amount, low: amount })),
      })),
    }).optional(),
  }).parse(prices);
  const ids = new Set(c.cards.map(x => x.printing_id));
  if (ids.size !== c.cards.length) throw new Error("RiftHunt baskı kimlikleri tekrarlanıyor.");
  for (const rows of [p.prices, p.cardmarket?.prices ?? []]) {
    if (new Set(rows.map(x => x.printing_id)).size !== rows.length || rows.some(x => !ids.has(x.printing_id))) {
      throw new Error("RiftHunt katalog ve fiyat kimlikleri tutarsız.");
    }
  }
  const usd = new Map(p.prices.map(x => [x.printing_id, x]));
  const eur = new Map(p.cardmarket?.prices.map(x => [x.printing_id, x]) ?? []);
  const sets = new Map(c.sets.map(s => [s.id.toLowerCase(), s]));
  const printings: RiftPrinting[] = c.cards.map(card => {
    const price = usd.get(card.printing_id);
    const cm = eur.get(card.printing_id);
    if (!sets.has(card.set.toLowerCase())) throw new Error("RiftHunt kartının seti bulunamadı.");
    // Never use numeric num: SP1 and 039a must remain complete identifiers.
    const collector = price?.collector || card.riftboundId.match(/^[^-]+-(.+)-\d+$/)?.[1]
      || card.riftboundId.match(/^[^-]+-([a-zA-Z0-9]+)$/)?.[1];
    if (!collector) throw new Error("Tam kart numarası okunamadı.");
    const finishes = card.finishes ?? [];
    return {
      printingId: card.printing_id, oracleId: card.oracle_id, riftboundId: card.riftboundId,
      collector, name: card.name, baseName: card.cleanName || card.name,
      set: card.set.toLowerCase(), setName: card.setName, rarity: card.rarity, type: card.type,
      domains: card.domains, energy: card.energy, power: card.power, might: card.might,
      text: card.text, flavour: card.flavour ?? null, artist: card.artist, image: httpsUrl(card.imgUrl),
      alternate: card.alt, signature: card.sig, overnumbered: card.over, finishes,
      tags: card.tags ?? [],
      sourceUrl: `https://rifthunt.com/cards/${encodeURIComponent(card.set.toLowerCase())}/${encodeURIComponent(collector.toLowerCase())}/${encodeURIComponent(price?.slug || card.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}/`,
      tcgplayerUrl: httpsUrl(price?.purchaseUri), cardmarketUrl: httpsUrl(cm?.purchaseUri || card.cardmarketUrl),
      updatedAt: price?.updatedAt ?? null, cardmarketUpdatedAt: cm?.updatedAt ?? null,
      // Only source-supported finishes may be used, even if price export has more.
      ...{
        prices: Object.fromEntries(finishes.filter(f => price?.finishes[f]).map(f => [f, price!.finishes[f]])),
        cardmarket: Object.fromEntries(finishes.filter(f => cm?.finishes[f]).map(f => [f, cm!.finishes[f]])),
      },
    };
  });
  return {
    fetchedAt: new Date().toISOString(), sourceFetchedAt: c.fetched,
    sets: c.sets.map(s => ({ code: s.id.toLowerCase(), name: s.name, count: s.count, released: s.released })),
    printings, tags: { tags: [], taggings: [] }, rulings: { cards: [] }, warnings: [],
  };
}
export function priceFor(printing: RiftPrinting, finish: RiftFinish | null, rate: number, multiplier: number, now = Date.now()) {
  if (!finish || !printing.finishes.includes(finish)) return { salePrice: null, reason: "Kart yüzeyi bilinmiyor veya bu baskıda üretilmiyor." };
  const age = now - Date.parse(printing.updatedAt || "");
  if (!Number.isFinite(age) || age > MAX_PRICE_AGE || age < -86400_000) return { salePrice: null, reason: "Piyasa fiyatı eksik veya 72 saatten eski." };
  const usd = printing.prices[finish]?.market;
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) return { salePrice: null, reason: "Bu baskı ve yüzey için pozitif TCGplayer piyasa fiyatı yok." };
  try { return { salePrice: calculateSalePrice(usd, rate, multiplier), reason: null }; }
  catch { return { salePrice: null, reason: "Hesaplanan fiyat geçersiz. Kur ve çarpanı kontrol edin." }; }
}
export async function fetchRifthuntJson(path: string) {
  const response = await fetch(`${RIFTHUNT_BASE}${path}`, {
    headers: { "User-Agent": "GoCardsTCG/1.0 (+https://gocardstcg.com)", Accept: "application/json" },
    signal: AbortSignal.timeout(25000), redirect: "error",
  });
  if (!response.ok) throw new Error(`RiftHunt HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 12_000_000) throw new Error("RiftHunt yanıtı beklenenden büyük.");
  return JSON.parse(text);
}
