import { describe, it, expect } from "vitest";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readFileSync, promises as fs } from "node:fs";
import { normalizeRifthunt } from "../server/tcg/rifthuntData";
import { getRiftboundSetAssets } from "../shared/riftboundSets";

describe.skipIf(process.env.STOREFRONT_BROWSER_TEST !== "1")("Storefront card and set navigation", () => {
  it("opens cards by mouse, keyboard and touch and shows current set logos in both menus", async () => {
    const fixture = JSON.parse(readFileSync("tests/fixtures/rift-rules-cards.json", "utf8"));
    const snapshot = normalizeRifthunt(fixture.catalog, fixture.prices);
    const sets = snapshot.sets.map(s => ({
      id: s.code, name: s.name, slug: `riftbound-${s.code}`, game_slug: "riftbound", game_name: "Riftbound",
      game_id: "riftbound", logo_url: getRiftboundSetAssets(s.code)?.logo, symbol_url: "/icon-riftbound.svg",
      listed_cards: 1, total_cards: s.count, release_date: s.released,
    }));
    const cards = Array.from({ length: 14 }, (_, i) => {
      const p = snapshot.printings[i % snapshot.printings.length];
      return {
        id: `test-${i}`, slug: `riftbound-test-${i}`, name: p.name, card_number: p.collector, rarity: p.rarity,
        card_types: [p.type, ...p.domains], image_url: p.image, image_url_hi_res: p.image, description: p.text,
        is_featured: false, is_new: false, set_id: p.set, set_name: p.setName, set_slug: `riftbound-${p.set}`,
        set_logo_url: null, set_symbol_url: null, game_id: "riftbound", game_name: "Riftbound", game_slug: "riftbound",
        min_price: "100.00", listing_count: 1, available_conditions: ["NM"], lowest_condition: "NM",
        lowest_listing_id: `listing-${i}`, api_source: "rifthunt", attacks: [], abilities: [],
        listings: [{ id: `listing-${i}`, condition: "NM", finish: "normal", price: "100.00", stock: 3 }],
      };
    });
    const pokemon = { ...cards[0], id: "test-pokemon", slug: "pokemon-test", name: "Pikachu", game_slug: "pokemon", game_name: "Pokémon" };
    const browser = await chromium.launch({
      executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
    const errors: string[] = [];
    let empty = false, fail = false, cartWrites = 0;
    page.on("pageerror", error => errors.push(error.message));
    await fs.mkdir("generated-artifacts/storefront", { recursive: true });
    try {
      // Only test responses are used. No inventory or real customer cart is modified.
      await page.route("**/api/**", async route => {
        const url = new URL(route.request().url()), path = url.pathname;
        let data: unknown = [];
        if (path === "/api/cards") {
          if (fail && url.searchParams.get("inStock") === "true") return route.fulfill({ status: 503, json: { error: "Test outage" } });
          const game = url.searchParams.get("game");
          const filtered = empty ? [] : game === "pokemon" ? [pokemon] : game === "riftbound" ? cards : [...cards, pokemon];
          data = { cards: filtered.slice(0, Number(url.searchParams.get("limit") || 20)), total: filtered.length };
        } else if (path.startsWith("/api/cards/") && !path.endsWith("/similar")) {
          data = [...cards, pokemon].find(c => path.endsWith(c.slug)) ?? cards[0];
        } else if (path === "/api/card-sets") {
          data = url.searchParams.get("game") === "pokemon" ? [] : sets;
        } else if (path.startsWith("/api/card-sets/")) {
          data = sets.find(s => path.endsWith(s.slug));
        } else if (path.startsWith("/api/rifthunt/cards/")) {
          return route.fulfill({ status: 404, json: { error: "not found" } });
        } else if (path.includes("settings")) data = {};
        else if (path === "/api/cart" && route.request().method() === "POST") { cartWrites++; data = { success: true }; }
        await route.fulfill({ status: 200, json: data });
      });
      const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      const home = async () => { await page.goto(origin); await page.getByTestId("section-cards-on-sale").scrollIntoViewIfNeeded(); };
      const showcase = page.getByTestId("section-cards-on-sale");
      const first = showcase.locator('a[href="/kart/riftbound-test-0"]').first();
      await home();
      expect(await page.getByTestId("tab-on-sale-riftbound").getAttribute("aria-selected")).toBe("true");
      await first.waitFor();
      await page.screenshot({ path: "generated-artifacts/storefront/showcase-desktop.jpg" });
      await first.click({ position: { x: 30, y: 40 } });
      await page.waitForURL("**/kart/riftbound-test-0");
      await home();
      await first.focus(); await page.keyboard.press("Enter");
      await page.waitForURL("**/kart/riftbound-test-0");
      await home();
      await showcase.getByTestId("btn-addtocart-test-0").click();
      await expect.poll(() => cartWrites).toBe(1);
      expect(new URL(page.url()).pathname).toBe("/");
      await page.getByTestId("tab-on-sale-pokemon").click();
      await showcase.locator('a[href="/kart/pokemon-test"]').waitFor();
      await page.getByTestId("tab-on-sale-all").click();
      await expect.poll(() => showcase.locator("article").count()).toBe(15);
      await page.getByTestId("tab-on-sale-riftbound").click();
      const rail = page.getByTestId("on-sale-card-list");
      await page.getByTestId("btn-on-sale-next").click();
      await expect.poll(() => rail.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
      await page.getByTestId("button-nav-riftbound").click();
      const setLink = page.getByTestId("link-mega-set-riftbound-ven");
      await setLink.waitFor();
      await expect.poll(() => setLink.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await page.screenshot({ path: "generated-artifacts/storefront/set-menu-desktop.jpg" });
      await setLink.click();
      await page.waitForURL("**/set/riftbound-ven");
      await page.setViewportSize({ width: 390, height: 844 });
      await home();
      await page.screenshot({ path: "generated-artifacts/storefront/showcase-mobile.jpg" });
      await first.tap({ position: { x: 30, y: 40 } }); await page.waitForURL("**/kart/riftbound-test-0");
      await home();
      await page.getByTestId("button-mobile-menu").click();
      await page.getByTestId("button-mobile-riftbound").click();
      const mobileSet = page.getByTestId("link-mobile-riftbound-set-riftbound-ven");
      await mobileSet.waitFor();
      await expect.poll(() => mobileSet.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await page.screenshot({ path: "generated-artifacts/storefront/set-menu-mobile.jpg" });
      await mobileSet.click(); await page.waitForURL("**/set/riftbound-ven");
      empty = true;
      await home();
      await showcase.getByText("Bu seçkide stokta kart yok").waitFor();
      empty = false; fail = true;
      await home();
      await showcase.getByRole("button", { name: "Yeniden dene" }).waitFor({ timeout: 15000 });
      fail = false;
      await showcase.getByRole("button", { name: "Yeniden dene" }).click();
      await first.waitFor();
      expect(errors).toEqual([]);
    } catch (error) {
      await page.screenshot({ path: "generated-artifacts/storefront/test-failure.jpg" });
      throw error;
    } finally { await browser.close(); }
  }, 180_000);
});
