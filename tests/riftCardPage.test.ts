import { readFileSync, promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium, type Page } from "playwright";
import { describe, expect, it } from "vitest";
import { normalizeRifthunt } from "../server/tcg/rifthuntData";
import { parseRiftRules } from "../shared/riftRules";
import type { RiftPrinting } from "../shared/rifthunt";

const fixture = JSON.parse(readFileSync("tests/fixtures/rift-rules-cards.json", "utf8"));
const printings = normalizeRifthunt(fixture.catalog, fixture.prices).printings;

describe("Real Riftbound descriptions", () => {
  it("retains every real symbol and list across the representative source cards", () => {
    for (const p of printings) {
      const blocks = parseRiftRules(p.text, p.rich);
      const raw = blocks.flatMap(b => b.lines.flat()).map(t => t.kind === "text" ? t.text : t.raw).join("");
      for (const token of p.text?.match(/:rb_[a-z0-9_]+:|\[(?!NO TEXT\])[^\]]+\]/gi) ?? []) {
        expect(raw, p.name).toContain(token);
      }
      const listCount = p.rich?.match(/<li>/g)?.length ?? 0;
      if (listCount) expect(blocks.filter(b => b.kind === "list").reduce((sum, b) => sum + b.lines.length, 0), p.name).toBe(listCount);
    }
  });
});

describe.skipIf(!process.env.RIFT_CARD_BROWSER_TEST)("Riftbound card page browser", () => {
  it("renders real symbols, rich choices, manual fallback and mobile without affecting Pokemon", async () => {
    const browser = await chromium.launch({
      executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    let printing = printings[0];
    let pokemon = false;
    const requests: Record<string, number> = {};
    await fs.mkdir("generated-artifacts/rift-card-page", { recursive: true });
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      requests[path] = (requests[path] || 0) + 1;
      let data: unknown = [];
      if (path.startsWith("/api/cards/") && !path.endsWith("/similar")) {
        data = {
          id: printing.printingId, slug: "rules-browser-test", name: printing.name,
          card_number: printing.collector, rarity: printing.rarity, card_types: [printing.type, ...printing.domains],
          hp: pokemon ? 120 : null, attacks: [], abilities: [],
          artist: printing.artist, image_url: printing.image, image_url_hi_res: printing.image,
          description: printing.text, api_source: pokemon ? "pokemon_tcg" : "rifthunt",
          is_featured: false, is_new: false, created_at: "2026-11-13T00:00:00Z",
          set_id: "source-set", set_name: printing.setName, set_slug: `riftbound-${printing.set}`,
          set_series: null, set_release_date: "2026-01-01", set_total_cards: 298,
          set_logo_url: null, set_symbol_url: null, game_id: pokemon ? "pokemon" : "riftbound",
          game_name: pokemon ? "Pokémon" : "Riftbound", game_slug: pokemon ? "pokemon" : "riftbound",
          listings: printing.finishes.map((finish, i) => ({ id: `test-listing-${i}`, condition: "NM", finish, price: "100.00", stock: 3 })),
        };
      } else if (path.startsWith("/api/rifthunt/cards/") && path.endsWith("/history")) {
        data = { dates: [], from: "", to: "", bucket: "day", series: {} };
      } else if (path.startsWith("/api/rifthunt/cards/")) {
        if (pokemon) return route.fulfill({ status: 404, body: "" });
        data = { printing, rulings: [], communityTags: [], warnings: [],
          rulingSource: { name: "Riftbound FAQ", url: "https://www.riftboundfaq.com", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", commit: null } };
      } else if (path.includes("settings")) data = {};
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    });
    const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const rules = () => page.locator('[data-testid="rift-card-rules"]:visible');
    const visit = async (p: RiftPrinting, mobile: boolean) => {
      printing = p;
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await page.goto(origin + "/kart/rules-browser-test", { waitUntil: "domcontentloaded" });
      await page.locator("h1:visible").first().waitFor();
      await rules().waitFor();
      const sourcePath = `/api/rifthunt/cards/${printing.printingId}`;
      await expect.poll(() => requests[sourcePath] ?? 0).toBeGreaterThan(0);
      await expect.poll(async () => (await rules().innerText()).includes(":rb_")).toBe(false);
      const hasLists = !!p.rich?.includes("<li>");
      if (hasLists) {
        await expect.poll(() => rules().locator("li").count()).toBe(p.rich!.match(/<li>/g)!.length);
      }
      // Only the visible responsive slot is presented and no repeated full rules below it.
      expect(await rules().count()).toBe(1);
      const icons = rules().locator('img[src^="/icons/riftbound/"]');
      for (let i = 0; i < await icons.count(); i++) {
        await expect.poll(() => icons.nth(i).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        expect(await icons.nth(i).locator("..").getAttribute("aria-label")).toBeTruthy();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, p.name).toBeLessThanOrEqual(1);
    };
    try {
      for (const p of printings) {
        for (const mobile of [false, true]) {
          await visit(p, mobile);
          if (p.name === "Blazing Scorcher") {
            expect(await rules().locator('[data-rift-symbol="energy"][data-rift-value="1"]').count()).toBe(1);
            expect(await rules().locator('[data-rift-symbol="fury"]').count()).toBe(1);
          }
          if (p.name === "Frostcoat Mother") expect(await rules().locator('[data-rift-symbol="energy"][data-rift-value="12"]').count()).toBe(1);
          if (p.name === "Chemtech Enforcer") expect(await rules().innerText()).toContain("\nWhen you play me");
          const cover = await page.locator('img[alt*="kart görseli"]:visible').first().boundingBox();
          expect(cover?.width, `${p.name} cover width`).toBeGreaterThanOrEqual(200);
          if (p.name === "Honeyfruit") expect(await rules().locator('[data-rift-activation="nested"]').count()).toBe(1);
          if (p.text === "[NO TEXT]") expect(await rules().innerText()).not.toContain("[NO TEXT]");
          if (["Blazing Scorcher", "Twisted Fate, Gambler"].includes(p.name)) {
            await page.screenshot({ path: `generated-artifacts/rift-card-page/${p.set}-${p.collector}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
          }
        }
      }
      const safe = { ...printings[0], text: "Safe :rb_energy_0:", rich: '<p>Safe :rb_energy_0:</p><img src=x onerror="window.__rulesXss=1"><script>window.__rulesXss=1</script>' };
      await visit(safe, false);
      expect(await rules().locator('[data-rift-symbol="energy"][data-rift-value="0"]').count()).toBe(1);
      expect(await page.evaluate(() => (window as any).__rulesXss)).toBeUndefined();
      const manual = { ...printings[0], text: "Yönetici açıklaması :rb_new_resource: [Future Keyword]", rich: null };
      await visit(manual, true);
      expect(await rules().innerText()).toContain("Yönetici açıklaması");
      expect(await rules().innerText()).toContain("new resource");
      expect(await rules().innerText()).toContain("[Future Keyword]");
      pokemon = true;
      printing = { ...printings[0], name: "Pokémon regression card", text: "Pokémon açıklaması", rich: null };
      await page.goto(origin + "/kart/rules-browser-test");
      await page.locator("h1:visible").first().waitFor();
      expect(await page.getByTestId("rift-card-rules").count()).toBe(0);
      expect(errors).toEqual([]);
    } catch (e) {
      await page.screenshot({ path: "generated-artifacts/rift-card-page/failure.png", fullPage: true }).catch(() => {});
      throw e;
    } finally { await browser.close(); }
  }, 240000);
});
