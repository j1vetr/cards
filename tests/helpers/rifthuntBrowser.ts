import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { chromium } from "playwright";
import type { Express } from "express";
import type { Client } from "pg";
import request from "supertest";
import { expect } from "vitest";

/** Browser uses real UI + real handlers in the isolated test database, never live inventory. */
export async function checkRifthuntBrowser(app: Express, client: Client, expectedCards = 1) {
  const { storage } = await import("../../server/storage");
  app.get("/api/cards", async (req, res) => {
    res.json(await storage.getCardsPublic({ gameSlug: String(req.query.game || "") || undefined, inStock: req.query.inStock === "true" }));
  });
  app.get("/api/card-sets", async (req, res) => {
    res.json(await storage.getCardSetsPublic(String(req.query.game || "") || undefined));
  });
  app.get("/api/admin/cards", async (req, res) => {
    try {
      res.json(await storage.getAdminCards({
        search: String(req.query.search || ""), gameId: String(req.query.gameId || "") || undefined,
        setId: String(req.query.setId || "") || undefined, rarity: String(req.query.rarity || "") || undefined,
        page: Number(req.query.page || 1), limit: 30,
      }));
    } catch { res.status(500).json({ error: "Test kart listesi alınamadı." }); }
  });
  app.get("/api/admin/card-games", async (_req, res) => res.json((await client.query("SELECT * FROM card_games")).rows));
  app.get("/api/admin/card-sets", async (_req, res) => res.json((await client.query("SELECT * FROM card_sets")).rows));

  const browser = await chromium.launch({
    executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", dialog => { void dialog.accept(); });
  await fs.mkdir("generated-artifacts/rifthunt-browser", { recursive: true });
  try {
    await page.route("**/api/**", async route => {
      const browserRequest = route.request();
      const url = new URL(browserRequest.url());
      const pathname = url.pathname;
      if (pathname.startsWith("/api/admin/rifthunt/") || pathname === "/api/admin/cards" ||
          pathname.startsWith("/api/admin/cards/") || ["/api/admin/card-games", "/api/admin/card-sets", "/api/cards", "/api/card-sets"].includes(pathname)) {
        const method = browserRequest.method().toLowerCase() as "get" | "post" | "put";
        const pending = request(app)[method](url.pathname + url.search).set("x-test-admin", "test-admin");
        if (browserRequest.postData()) pending.send(JSON.parse(browserRequest.postData()!));
        const response = await pending;
        await route.fulfill({ status: response.status, contentType: "application/json", body: JSON.stringify(response.body) });
        return;
      }
      const data = pathname === "/api/admin/me" ? { id: "test-admin", username: "Test yöneticisi" }
        : pathname === "/api/admin/tcg/stats" ? { totalCards: 1, totalSets: 1, totalListings: 1 }
        : pathname === "/api/admin/tcg/sale-prices/latest" ? null
        : pathname.includes("count") ? { count: 0 } : pathname.endsWith("/stats") ? {} : [];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    });
    const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const panel = page.locator('section[aria-label="Riftbound fiyat ve stok yönetimi"]');
    await page.goto(origin + "/toov-admin?tab=card-api-sync");
    await panel.getByPlaceholder("RIFTBOUND SİL").fill("RIFTBOUND SİL");
    await panel.getByRole("button", { name: "Eski Riftbound verilerini sil", exact: true }).click();
    await panel.getByRole("status").waitFor();
    await panel.getByRole("button", { name: "Fiyatları önizle", exact: true }).click();
    const apply = panel.getByTestId("button-rift-import");
    await apply.waitFor();
    await panel.getByTestId("rift-import-required").waitFor();
    expect((await client.query("SELECT COUNT(*)::int AS count FROM cards WHERE api_source='rifthunt'")).rows[0].count).toBe(0);
    await apply.click();
    await panel.getByTestId("rift-import-complete").waitFor();
    await panel.getByPlaceholder("Kart veya baskı ara").fill("ven-sp1-006");
    const stock = panel.getByRole("spinbutton", { name: "Kai'Sa, Survivor stok adedi", exact: true });
    await stock.fill("3");
    expect((await client.query("SELECT COUNT(*)::int AS count FROM rifthunt_printings")).rows[0].count).toBe(expectedCards);
    const cardId = (await client.query("SELECT card_id FROM rifthunt_printings WHERE data->>'riftboundId'='ven-sp1-006'")).rows[0].card_id;
    await stock.locator("xpath=ancestor::td").getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect.poll(async () => (await client.query("SELECT stock FROM card_listings WHERE card_id=$1", [cardId])).rows[0]?.stock).toBe(3);
    await panel.getByLabel("Set filtresi").selectOption("ven");
    await page.reload();
    await panel.getByPlaceholder("Kart veya baskı ara").fill("ven-sp1-006");
    await expect.poll(() => stock.inputValue()).toBe("3");
    await page.goto(origin + "/toov-admin?tab=cards");
    await page.getByTestId("input-search-cards").fill("Kai'Sa");
    await page.getByTestId(`button-edit-card-${cardId}`).click();
    expect(await page.getByTestId("select-edit-game").isDisabled()).toBe(true);
    expect(await page.getByTestId("select-edit-set").isDisabled()).toBe(true);
    await page.getByTestId("input-edit-rarity").fill("Legendary");
    await page.getByTestId("button-edit-card-submit").click();
    await page.getByTestId("modal-edit-card").waitFor({ state: "hidden" });
    await expect.poll(async () => (await client.query("SELECT rarity FROM cards WHERE id=$1", [cardId])).rows[0]?.rarity).toBe("Legendary");
    await page.getByTestId(`button-edit-card-${cardId}`).click();
    expect(await page.getByTestId("input-edit-rarity").inputValue()).toBe("Legendary");
    await page.screenshot({ path: "generated-artifacts/rifthunt-browser/rarity-edit.png", fullPage: true });
    await page.goto(origin + "/toov-admin?tab=card-api-sync");
    await panel.getByPlaceholder("Kart veya baskı ara").fill("ven-sp1-006");
    await expect.poll(() => stock.inputValue()).toBe("3");
    await panel.getByRole("button", { name: "Fiyatları önizle", exact: true }).click();
    await apply.click();
    await stock.fill("0");
    await stock.locator("xpath=ancestor::td").getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect.poll(async () => (await client.query("SELECT stock FROM card_listings WHERE card_id=$1", [cardId])).rows[0]?.stock).toBe(0);
    const listing = (await client.query("SELECT stock,is_active,price FROM card_listings WHERE card_id=$1", [cardId])).rows[0];
    expect(listing).toEqual({ stock: 0, is_active: false, price: "5732.68" });
    expect((await client.query("SELECT rarity FROM cards WHERE id=$1", [cardId])).rows[0].rarity).toBe("Legendary");
    expect((await client.query("SELECT stock FROM card_listings WHERE id='poke-listing'")).rows[0].stock).toBe(9);
    await page.screenshot({ path: "generated-artifacts/rifthunt-browser/stock-panel.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "generated-artifacts/rifthunt-browser/mobile-panel.png", fullPage: true });
    await page.goto(origin + "/riftbound");
    const categoryLink = page.locator('a[href^="/kart/riftbound-ven-"]').first();
    await categoryLink.waitFor();
    await categoryLink.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "generated-artifacts/rifthunt-browser/imported-category.png" });
    const catalogResult = await page.evaluate(async () => {
      const cards = await (await fetch("/api/cards?game=riftbound")).json();
      const stocked = await (await fetch("/api/cards?game=riftbound&inStock=true")).json();
      const sets = await (await fetch("/api/card-sets?game=riftbound")).json();
      return { total: cards.total, stocked: stocked.total, sets: sets.length };
    });
    expect(catalogResult).toEqual({ total: expectedCards, stocked: 0, sets: 1 });
    expect(errors).toEqual([]);
  } catch (e) {
    await page.screenshot({ path: "generated-artifacts/rifthunt-browser/failure.png", fullPage: true }).catch(() => {});
    throw e;
  } finally { await browser.close(); }
}
