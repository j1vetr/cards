import { describe, expect, it } from "vitest";
import { normalizeRifthunt, priceFor } from "../server/tcg/rifthuntData";
const printingId = "00000000-0000-4000-8000-000000000001";
const oracleId = "00000000-0000-4000-8000-000000000002";
export function fixture() {
  return {
    catalog: {
      fetched: new Date().toISOString(), source: "riotgames.com",
      sets: [{ id: "VEN", name: "Vendetta", count: 1, released: "2026-07-31" }],
      cards: [{
        printing_id: printingId, oracle_id: oracleId, riftboundId: "ven-sp1-006", name: "Kai'Sa, Survivor",
        set: "VEN", setName: "Vendetta", num: 1, rarity: "Showcase", type: "Unit", domains: ["Fury"],
        energy: 4, power: null, might: 4, text: "When I conquer, draw 1.", flavour: null,
        artist: "Wild Rift", imgUrl: "https://images.rifthunt.com/test.webp", alt: false, sig: false, over: false, finishes: ["foil"],
      }],
    },
    prices: {
      source: "tcgplayer", currency: "USD",
      prices: [{
        printing_id: printingId, collector: "sp1", slug: "kaisa-survivor", updatedAt: new Date().toISOString(),
        finishes: {
          foil: { market: 75.43, low: 72.07, mid: 85, high: 300 },
          normal: { market: 0.07, low: 0.01, mid: 1, high: 2 },
        },
      }],
      cardmarket: { currency: "EUR", source: "cardmarket", prices: [{
        printing_id: printingId, updatedAt: new Date().toISOString(),
        finishes: { foil: { trend: 64.4, low: 51.97 }, normal: { trend: 71.07, low: 51.97 } },
      }] },
    },
  };
}
describe("RiftHunt printing and money contract", () => {
  it("preserves SP1, printing UUID, foil-only identity and separate market currencies", () => {
    const f = fixture();
    const p = normalizeRifthunt(f.catalog, f.prices).printings[0];
    expect(p.collector).toBe("sp1");
    expect(p.printingId).toBe(printingId);
    expect(p.prices.normal).toBeUndefined();
    expect(p.cardmarket.normal).toBeUndefined();
    expect(p.prices.foil?.market).toBe(75.43);
    expect(p.cardmarket.foil?.trend).toBe(64.4);
    expect(priceFor(p, "foil", 40, 1.9)).toEqual({ salePrice: "5732.68", reason: null });
    expect(priceFor(p, "normal", 40, 1.9).salePrice).toBeNull();
  });
  it("does not join by shared Riot identifiers", () => {
    const f = fixture();
    const other = "00000000-0000-4000-8000-000000000003";
    f.catalog.cards.push({ ...f.catalog.cards[0], printing_id: other });
    f.prices.prices.push({ ...f.prices.prices[0], printing_id: other, finishes: { ...f.prices.prices[0].finishes, foil: { market: 1, low: 1, mid: 1, high: 1 } } });
    const p = normalizeRifthunt(f.catalog, f.prices).printings;
    expect(p.map(x => x.prices.foil?.market)).toEqual([75.43, 1]);
  });
  it("recovers special identifiers even without a source price", () => {
    const f = fixture(); f.prices.prices = [];
    const p = normalizeRifthunt(f.catalog, f.prices).printings[0];
    expect(p.collector).toBe("sp1");
    expect(priceFor(p, "foil", 40, 1.9).salePrice).toBeNull();
  });
  it("rejects wrong currencies and duplicate or orphan price identities", () => {
    const f = fixture();
    expect(() => normalizeRifthunt(f.catalog, { ...f.prices, currency: "TRY" })).toThrow();
    expect(() => normalizeRifthunt(f.catalog, { ...f.prices, prices: [...f.prices.prices, ...f.prices.prices] })).toThrow();
    expect(() => normalizeRifthunt(f.catalog, { ...f.prices, prices: [{ ...f.prices.prices[0], printing_id: oracleId }] })).toThrow();
    expect(() => normalizeRifthunt({ ...f.catalog, cards: [...f.catalog.cards, ...f.catalog.cards] }, f.prices)).toThrow();
  });
  it.each([null, 0, -1, NaN, Infinity])("does not invent market prices for %s", market => {
    const f = fixture();
    if (market !== null && (market < 0 || !Number.isFinite(market))) {
      expect(() => normalizeRifthunt(f.catalog, { ...f.prices, prices: [{ ...f.prices.prices[0], finishes: { foil: { market, low: 0, mid: 0, high: 0 } } }] })).toThrow();
      return;
    }
    const p = normalizeRifthunt(f.catalog, f.prices).printings[0];
    p.prices.foil!.market = market;
    expect(priceFor(p, "foil", 40, 1.9).salePrice).toBeNull();
  });
  it("refuses stale, future or invalid timestamps and invalid multipliers", () => {
    const f = fixture(); const p = normalizeRifthunt(f.catalog, f.prices).printings[0];
    for (const date of ["invalid", new Date(Date.now() - 73 * 3600_000).toISOString(), new Date(Date.now() + 48 * 3600_000).toISOString()]) {
      expect(priceFor({ ...p, updatedAt: date }, "foil", 40, 1.9).salePrice).toBeNull();
    }
    expect(priceFor(p, "foil", 40, 0).salePrice).toBeNull();
  });
});
