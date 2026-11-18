import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RiftAdminRow } from "../shared/rifthunt";
import { normalizeRifthunt } from "../server/tcg/rifthuntData";
import { queryRiftRows, riftCatalogQuery } from "../server/tcg/rifthuntCatalog";

const fixture = JSON.parse(readFileSync("tests/fixtures/rift-rules-cards.json", "utf8"));
const printing = normalizeRifthunt(fixture.catalog, fixture.prices).printings[0];
function row(id: number, sale: string | null, stock = 0, market: number | null = id): RiftAdminRow {
  return {
    printing: { ...printing, printingId: String(id), name: `Kart ${id}`, collector: String(id), rarity: id % 2 ? "Rare" : "Common",
      set: id % 2 ? "ogn" : "ven", prices: { normal: { market, low: null, mid: null, high: null } } },
    finish: "normal", cardId: `card-${id}`, slug: `card-${id}`, listingId: `listing-${id}`, stock,
    updatedAt: null, oldPrice: sale, salePrice: sale, priceBeforeMinimum: sale, minimumPrice: null, reason: sale === null ? "Fiyat yok" : null,
  };
}
const rows = [row(1, "2.00", 0, 7), row(2, "10.00", 3, 3), row(3, "100.25", 0, 20), row(4, null, 0, null), row(5, "9.90", 0, 10)];
const query = (options: Record<string, unknown> = {}, source = rows) => queryRiftRows(source, riftCatalogQuery.parse(options));
const ids = (options: Record<string, unknown>) => query(options).rows.map(r => r.printing.printingId);

describe("Riftbound inventory price exploration", () => {
  it("sorts TL prices numerically instead of lexically with unknowns last in either order", () => {
    expect(ids({ sort: "price_desc" })).toEqual(["3", "2", "5", "1", "4"]);
    expect(ids({ sort: "price_asc" })).toEqual(["1", "5", "2", "3", "4"]);
  });
  it("uses the finish-specific USD market for market ordering", () => {
    expect(ids({ sort: "market_desc" })).toEqual(["3", "5", "1", "2", "4"]);
    expect(ids({ sort: "market_asc" })).toEqual(["2", "1", "5", "3", "4"]);
  });
  it("shows the most expensive out-of-stock cards across all pages", () => {
    const result = query({ stock: "empty", sort: "price_desc", limit: 1, page: 2 });
    expect(result.rows[0].printing.printingId).toBe("5");
    expect(result.total).toBe(4);
    expect(result.pages).toBe(4);
    expect(result.summary).toEqual({
      matchedPrintings: 4, matchedRows: 4, pricedRows: 3, unpricedRows: 1,
      stockedRows: 0, emptyRows: 4, totalStock: 0, minPrice: 2, maxPrice: 100.25,
    });
  });
  it("filters stocked, priced and unpriced rows independently", () => {
    expect(ids({ stock: "stocked" })).toEqual(["2"]);
    expect(ids({ stock: "empty", priced: "no" })).toEqual(["4"]);
    expect(query({ priced: "yes" }).total).toBe(4);
    expect(query({ stock: "stocked" }).summary.totalStock).toBe(3);
  });
  it("applies inclusive TL ranges, excludes unknowns and composes with rarity and set", () => {
    expect(ids({ minPrice: 2, maxPrice: 9.90, sort: "price_asc" })).toEqual(["1", "5"]);
    expect(ids({ minPrice: 9.90, maxPrice: 100.25, rarity: "rare", set: "ogn", stock: "empty" })).toEqual(["3", "5"]);
    expect(query({ minPrice: 0 }).rows.some(r => r.salePrice === null)).toBe(false);
  });
  it("reports null limits rather than zero for missing or filtered-out prices", () => {
    expect(query({ priced: "no" }).summary).toMatchObject({ minPrice: null, maxPrice: null, pricedRows: 0, unpricedRows: 1 });
    const result = query({ search: "does not exist", page: 80 });
    expect(result).toMatchObject({ rows: [], total: 0, page: 1, pages: 1 });
    expect(result.summary).toMatchObject({ matchedRows: 0, minPrice: null, maxPrice: null });
  });
  it("keeps all available rarities even when current filters match nothing", () => {
    expect(query({ search: "no match" }).rarities).toEqual(["Common", "Rare"]);
  });
  it("respects Turkish casing in searches and rarities", () => {
    const source = [{ ...rows[0], printing: { ...rows[0].printing, name: "İSTANBUL Işık", rarity: "İNCİ" } }];
    expect(query({ search: "istanbul ışık", rarity: "inci" }, source).total).toBe(1);
  });
  it("distinguishes one card with two finishes from two stock rows and sorts each finish separately", () => {
    const normal = row(1, "100.00", 3, 10);
    const foil: RiftAdminRow = { ...normal, finish: "foil", stock: 4, salePrice: "500.00",
      printing: { ...normal.printing, finishes: ["normal", "foil"], prices: { ...normal.printing.prices, foil: { market: 50, low: null, mid: null, high: null } } } };
    const result = query({ sort: "market_desc" }, [normal, foil]);
    expect(result.rows.map(r => r.finish)).toEqual(["foil", "normal"]);
    expect(result.summary).toMatchObject({ matchedPrintings: 1, matchedRows: 2, totalStock: 7, minPrice: 100, maxPrice: 500 });
    expect(query({ finish: "foil" }, [normal, foil]).total).toBe(1);
  });
  it("has stable tie breaks and never mutates the source catalog", () => {
    const source = [row(3, "10"), row(1, "10"), row(2, "10")];
    const result = query({ sort: "price_desc" }, source);
    expect(result.rows.map(r => r.printing.printingId)).toEqual(["1", "2", "3"]);
    expect(source.map(r => r.printing.printingId)).toEqual(["3", "1", "2"]);
    expect(ids({ sort: "stock_desc" })[0]).toBe("2");
  });
  it.each([
    { minPrice: -1 }, { maxPrice: "NaN" }, { minPrice: "Infinity" }, { minPrice: 100, maxPrice: 10 },
    { sort: "DROP TABLE cards" }, { rarity: ["Rare"] }, { limit: 101 }, { page: 0 },
  ])("rejects invalid query values %j", input => {
    expect(riftCatalogQuery.safeParse(input).success).toBe(false);
  });
  it("treats empty range fields as unset without accidentally limiting prices to zero", () => {
    expect(query({ minPrice: "", maxPrice: "" }).total).toBe(5);
  });
});
