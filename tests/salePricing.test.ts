import { describe, expect, it, vi, afterEach } from "vitest";
import { calculateSalePrice, marketUsdForCondition, parseTcmbUsd, selectPriceMatch } from "../server/tcg/salePricingMath";
import type { PriceChartingProduct } from "../server/tcg/priceChartingService";

const xml = (date = "08.10.2026", price = "49.2152") => `
<Tarih_Date Tarih="${date}" Date="10/08/2026">
<Currency CurrencyCode="EUR"><Unit>1</Unit><ForexSelling>57</ForexSelling></Currency>
<Currency CurrencyCode="USD"><Unit>1</Unit><ForexBuying>49.1267</ForexBuying><ForexSelling>${price}</ForexSelling><BanknoteSelling>49.2890</BanknoteSelling></Currency>
</Tarih_Date>`;
const target = { name: "Charizard ex", setName: "Obsidian Flames", gameName: "Pokemon TCG", cardNumber: "006/197", finish: "normal" };
const product: PriceChartingProduct = { id: "123", "product-name": "Charizard ex #6", "console-name": "Pokemon Obsidian Flames", "loose-price": 1000, "manual-only-price": 10000, "new-price": 90000 };

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("TCMB kur okuma", () => {
  it("uses USD ForexSelling, not buying, EUR or banknotes", () => {
    expect(parseTcmbUsd(xml(), new Date("2026-10-09T00:00:00Z"))).toMatchObject({ usdTry: 49.2152, date: "2026-10-08" });
  });
  it("accepts the last published rate on a weekend", () => {
    expect(parseTcmbUsd(xml(), new Date("2026-10-11T12:00:00Z")).usdTry).toBe(49.2152);
  });
  it.each(["", "0", "-1", "NaN", "Infinity", "bad"])("rejects invalid price %s", (price) => {
    expect(() => parseTcmbUsd(xml("08.10.2026", price), new Date("2026-10-09"))).toThrow();
  });
  it("rejects outdated, future and invalid dates", () => {
    for (const date of ["01.01.2026", "01.01.2027", "31.02.2026"]) {
      expect(() => parseTcmbUsd(xml(date), new Date("2026-10-09"))).toThrow();
    }
  });
  it("rejects missing USD and wrong units", () => {
    expect(() => parseTcmbUsd(xml().replace('CurrencyCode="USD"', 'CurrencyCode="GBP"'))).toThrow();
    expect(() => parseTcmbUsd(xml().replaceAll("<Unit>1</Unit>", "<Unit>100</Unit>"))).toThrow();
  });
  it("does not silently reuse a cached rate after the service fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { getTcmbUsdRate } = await import("../server/tcg/tcmbService");
    await expect(getTcmbUsdRate()).rejects.toThrow();
  });
});

describe("TL satış fiyatı", () => {
  it("converts USD to TRY before applying margin", () => expect(calculateSalePrice(10, 40, 1.9)).toBe("760.00"));
  it("rounds once to two decimal places using the full TCMB rate", () => expect(calculateSalePrice(10, 49.2152, 1.9)).toBe("935.09"));
  it.each([0, -1, NaN, Infinity])("rejects invalid values %s", (value) => {
    expect(() => calculateSalePrice(value, 40, 1.9)).toThrow();
    expect(() => calculateSalePrice(10, value, 1.9)).toThrow();
    expect(() => calculateSalePrice(10, 40, value)).toThrow();
  });
  it("rejects out of range or sub-cent results", () => {
    expect(() => calculateSalePrice(10, 40, 101)).toThrow();
    expect(() => calculateSalePrice(1000000, 400, 100)).toThrow();
    expect(() => calculateSalePrice(0.00001, 40, 1.9)).toThrow();
  });
});

describe("safe variant matching", () => {
  it("accepts an exact expansion, name and number, including leading zero normalization", () => {
    expect(selectPriceMatch([product], target)?.id).toBe("123");
  });
  it("rejects another set or card number and missing card number", () => {
    expect(selectPriceMatch([{ ...product, "console-name": "Pokemon Base Set" }], target)).toBeNull();
    expect(selectPriceMatch([{ ...product, "product-name": "Charizard ex #7" }], target)).toBeNull();
    expect(selectPriceMatch([product], { ...target, cardNumber: null })).toBeNull();
  });
  it("rejects incorrect name, languages, editions and reverse holo variants", () => {
    for (const name of ["Charizard #6", "Charizard ex [Reverse Holo] #6", "Charizard ex [1st Edition] #6", "Charizard ex #6 Japanese"]) {
      expect(selectPriceMatch([{ ...product, "product-name": name }], target)).toBeNull();
    }
  });
  it("does not silently choose the first hit when ambiguous", () => {
    expect(selectPriceMatch([product, { ...product, id: "456" }], target)).toBeNull();
  });
  it("requires an explicitly matched foil variant", () => {
    expect(selectPriceMatch([product], { ...target, finish: "foil" })).toBeNull();
    const foil = { ...product, "product-name": "Charizard ex [Holo] #6" };
    expect(selectPriceMatch([foil], { ...target, finish: "foil" })?.id).toBe("123");
    expect(selectPriceMatch([foil], target)).toBeNull();
  });
  it("uses ungraded for NM and PSA10's documented field instead of the maximum grade price", () => {
    expect(marketUsdForCondition(product, "NM")).toBe(10);
    expect(marketUsdForCondition(product, "PSA10")).toBe(100);
    for (const condition of ["LP", "MP", "HP", "DMG", "PSA9", "PSA8", "PSA7"]) {
      expect(marketUsdForCondition(product, condition)).toBeNull();
    }
    expect(marketUsdForCondition({ ...product, "loose-price": 0 }, "NM")).toBeNull();
  });
});
