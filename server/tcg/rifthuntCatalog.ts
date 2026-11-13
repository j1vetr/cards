import { z } from "zod";
import type { RiftAdminRow, RiftCatalog } from "@shared/rifthunt";

const optionalPrice = z.preprocess(value => value === "" ? undefined : value, z.coerce.number().finite().nonnegative().optional());
export const riftCatalogQuery = z.object({
  search: z.string().max(200).default(""),
  set: z.string().max(30).default(""),
  rarity: z.string().max(100).default(""),
  finish: z.enum(["", "normal", "foil"]).default(""),
  stock: z.enum(["all", "stocked", "empty"]).default("all"),
  priced: z.enum(["all", "yes", "no"]).default("all"),
  sort: z.enum(["price_desc", "price_asc", "market_desc", "market_asc", "name_asc", "stock_desc"]).default("name_asc"),
  minPrice: optionalPrice,
  maxPrice: optionalPrice,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  previewId: z.string().uuid().optional(),
}).refine(q => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
  message: "En düşük fiyat, en yüksek fiyattan büyük olamaz.",
  path: ["minPrice"],
});

export type RiftCatalogQuery = z.infer<typeof riftCatalogQuery>;
const positive = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const price = (r: RiftAdminRow) => positive(r.salePrice);
const market = (r: RiftAdminRow) => r.finish ? positive(r.printing.prices[r.finish]?.market) : null;
const nullableCompare = (a: number | null, b: number | null, direction: number) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : direction * (a - b);
const byName = (a: RiftAdminRow, b: RiftAdminRow) =>
  a.printing.name.localeCompare(b.printing.name, "tr-TR")
  || a.printing.printingId.localeCompare(b.printing.printingId)
  || String(a.finish).localeCompare(String(b.finish));

/** All filtering, numeric ordering and summaries happen before pagination. */
export function queryRiftRows(allRows: RiftAdminRow[], q: RiftCatalogQuery): Pick<RiftCatalog, "rows" | "total" | "pages" | "page" | "summary" | "rarities"> {
  const rarities = Array.from(new Set(allRows.map(r => r.printing.rarity).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "tr-TR"));
  const search = q.search.trim().toLocaleLowerCase("tr-TR");
  const rarity = q.rarity.toLocaleLowerCase("tr-TR");
  const rows = allRows.filter(r => {
    const value = price(r);
    return (!search || `${r.printing.name} ${r.printing.collector} ${r.printing.riftboundId}`.toLocaleLowerCase("tr-TR").includes(search))
      && (!q.set || r.printing.set === q.set)
      && (!rarity || r.printing.rarity.toLocaleLowerCase("tr-TR") === rarity)
      && (!q.finish || r.finish === q.finish)
      && (q.stock === "all" || (q.stock === "stocked" ? r.stock > 0 : r.stock === 0))
      && (q.priced === "all" || (q.priced === "yes" ? value !== null : value === null))
      && (q.minPrice === undefined || (value !== null && value >= q.minPrice))
      && (q.maxPrice === undefined || (value !== null && value <= q.maxPrice));
  });
  rows.sort((a, b) => {
    const primary = q.sort === "stock_desc" ? b.stock - a.stock
      : q.sort === "price_desc" || q.sort === "price_asc" ? nullableCompare(price(a), price(b), q.sort === "price_desc" ? -1 : 1)
      : q.sort === "market_desc" || q.sort === "market_asc" ? nullableCompare(market(a), market(b), q.sort === "market_desc" ? -1 : 1)
      : 0;
    return primary || byName(a, b);
  });
  const prices = rows.map(price).filter((p): p is number => p !== null);
  const summary: RiftCatalog["summary"] = {
    matchedPrintings: new Set(rows.map(r => r.printing.printingId)).size,
    matchedRows: rows.length,
    pricedRows: prices.length,
    unpricedRows: rows.length - prices.length,
    stockedRows: rows.filter(r => r.stock > 0).length,
    emptyRows: rows.filter(r => r.stock === 0).length,
    totalStock: rows.reduce((sum, r) => sum + r.stock, 0),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  };
  const pages = Math.max(1, Math.ceil(rows.length / q.limit));
  const page = Math.min(q.page, pages);
  return { rows: rows.slice((page - 1) * q.limit, page * q.limit), total: rows.length, pages, page, summary, rarities };
}
