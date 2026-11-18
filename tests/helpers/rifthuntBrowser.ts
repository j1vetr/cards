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
  const catalogRequests: URL[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", dialog => { void dialog.accept(); });
  await fs.mkdir("generated-artifacts/rifthunt-browser", { recursive: true });
  try {
    await page.route("**/api/**", async route => {
      const browserRequest = route.request();
      const url = new URL(browserRequest.url());
      const pathname = url.pathname;
      if (pathname === "/api/admin/rifthunt/catalog") catalogRequests.push(url);
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
    const panel = page.getByRole("region", { name: /Riftbound fiyat ve stok yönetimi/i });
    await page.goto(origin + "/toov-admin?tab=card-api-sync");
    expect(await panel.count()).toBe(0);
    await page.getByRole("link", { name: "Riftbound Paneli aç", exact: true }).click();
    await panel.waitFor();
    expect(page.url()).toContain("tab=riftbound-panel");
    const menuIcon = page.getByTestId("tab-riftbound-panel").locator('img[src="/icon-riftbound.svg"]');
    await menuIcon.waitFor();
    expect(await menuIcon.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await panel.getByPlaceholder("RIFTBOUND SİL").fill("RIFTBOUND SİL");
    await panel.getByRole("button", { name: /Eski Riftbound Verilerini Sil/i }).click();
    await panel.getByRole("status").waitFor();
    await panel.getByRole("button", { name: /Fiyatları Önizle/i }).click();
    const apply = panel.getByTestId("button-rift-import");
    await apply.waitFor();
    await panel.getByTestId("rift-import-required").waitFor();
    expect((await client.query("SELECT COUNT(*)::int AS count FROM cards WHERE api_source='rifthunt'")).rows[0].count).toBe(0);
    await apply.click();
    await panel.getByTestId("rift-import-complete").waitFor();
    expect(await panel.getByLabel(/Stok Filtresi/i).inputValue()).toBe("empty");
    expect(await panel.getByLabel(/Stok Filtresi/i).locator("option:checked").innerText()).toBe("Stok Yok");
    expect(await panel.getByLabel(/Set Filtresi/i).locator("option").first().innerText()).toBe("Tüm Setler");
    expect(await panel.getByLabel(/Fiyat Filtresi/i).locator("option").first().innerText()).toBe("Tüm Fiyatlar");
    await panel.getByRole("heading", { name: "Baskı Kataloğu", exact: true }).waitFor();
    expect(await panel.getByRole("heading", { name: "Baskı Kataloğu", exact: true }).evaluate(el => getComputedStyle(el).textTransform)).not.toBe("uppercase");
    await page.screenshot({ path: "generated-artifacts/rifthunt-browser/title-case-and-logo.png" });
    expect(await panel.getByLabel("Sıralama").inputValue()).toBe("price_desc");
    const expectedCatalog = (await request(app).get("/api/admin/rifthunt/catalog?stock=empty&sort=price_desc").set("x-test-admin", "test-admin")).body;
    await expect.poll(() => panel.getByTestId("rift-inventory-row").first().getAttribute("data-printing-id")).toBe(expectedCatalog.rows[0].printing.printingId);
    const format = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
    expect(await panel.getByTestId("summary-max-price").innerText()).toContain(format(expectedCatalog.summary.maxPrice));
    expect(await panel.getByTestId("rift-inventory-row").first().getByTestId("rift-site-price").getByTestId("rift-floor-original").count()).toBe(0);
    await panel.getByLabel("Sıralama").selectOption("price_asc");
    const cheapest = (await request(app).get("/api/admin/rifthunt/catalog?stock=empty&sort=price_asc").set("x-test-admin", "test-admin")).body;
    await expect.poll(() => panel.getByTestId("rift-inventory-row").first().getAttribute("data-printing-id")).toBe(cheapest.rows[0].printing.printingId);
    if (expectedCards > 1) {
      const floored = cheapest.rows.find((r: any) => r.priceBeforeMinimum !== null && Number(r.priceBeforeMinimum) < Number(r.minimumPrice) && Number(r.oldPrice) === Number(r.minimumPrice));
      expect(floored).toBeTruthy();
      await panel.getByPlaceholder(/Kart Veya Baskı Ara/i).fill(floored.printing.riftboundId);
      const floorRow = panel.locator(`[data-testid="rift-inventory-row"][data-printing-id="${floored.printing.printingId}"][data-finish="${floored.finish}"]`);
      await floorRow.waitFor();
      const siteTile = floorRow.getByTestId("rift-site-price");
      expect(await siteTile.getByTestId("rift-floor-original").innerText()).toBe(format(Number(floored.priceBeforeMinimum)));
      expect(await siteTile.getByTestId("rift-floor-original").evaluate(el => getComputedStyle(el).textDecorationLine)).toContain("line-through");
      expect(await siteTile.getByTestId("rift-floor-applied").innerText()).toBe("Alt Limit Uygulandı");
      expect(await siteTile.innerText()).toContain(format(Number(floored.oldPrice)));
      await floorRow.scrollIntoViewIfNeeded();
      await page.screenshot({ path: "generated-artifacts/rifthunt-browser/floor-price-applied.png" });

      // Only the isolated schema is changed. A pending calculation must not be
      // presented as an already saved site price.
      await client.query("UPDATE card_listings SET price=$1 WHERE id=$2", [floored.priceBeforeMinimum, floored.listingId]);
      await page.reload();
      await panel.getByPlaceholder(/Kart Veya Baskı Ara/i).fill(floored.printing.riftboundId);
      await floorRow.waitFor();
      expect(await siteTile.getByTestId("rift-floor-original").count()).toBe(0);
      expect(await siteTile.innerText()).toContain(format(Number(floored.priceBeforeMinimum)));
      expect(await floorRow.getByTestId("rift-calculated-price").innerText()).toContain("Alt Limit Önizlemesi");
      await client.query("UPDATE card_listings SET price=$1 WHERE id=$2", [floored.oldPrice, floored.listingId]);
      await page.reload();
    }
    await panel.getByLabel("Sıralama").selectOption("price_desc");
    await panel.getByRole("heading", { name: "Baskı Kataloğu", exact: true }).evaluate(el => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: "generated-artifacts/rifthunt-browser/price-explorer-desktop.png" });
    await panel.getByPlaceholder(/Kart Veya Baskı Ara/i).fill("ven-sp1-006");
    await panel.getByLabel(/Nadirlik Filtresi/i).selectOption("Showcase");
    await panel.getByLabel(/^En Düşük Fiyat$/i).fill("10000");
    await panel.getByLabel(/^En Yüksek Fiyat$/i).fill("6000");
    await panel.getByRole("alert").filter({ hasText: "En düşük fiyat, en yüksek fiyattan büyük olamaz." }).waitFor();
    await panel.getByLabel(/^En Düşük Fiyat$/i).fill("5000");
    await expect.poll(() => panel.getByTestId("rift-inventory-row").count()).toBe(1);
    await expect.poll(() => panel.getByTestId("summary-max-price").innerText()).toContain(format(5732.68));
    expect(catalogRequests.some(url => {
      const min = url.searchParams.get("minPrice"), max = url.searchParams.get("maxPrice");
      return min !== null && max !== null && Number(min) > Number(max);
    })).toBe(false);
    const stock = panel.getByRole("spinbutton", { name: /Kai'Sa, Survivor Stok Adedi/i });
    await stock.fill("3");
    expect((await client.query("SELECT COUNT(*)::int AS count FROM rifthunt_printings")).rows[0].count).toBe(expectedCards);
    const cardId = (await client.query("SELECT card_id FROM rifthunt_printings WHERE data->>'riftboundId'='ven-sp1-006'")).rows[0].card_id;
    await stock.locator("xpath=ancestor::td").getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect.poll(async () => (await client.query("SELECT stock FROM card_listings WHERE card_id=$1", [cardId])).rows[0]?.stock).toBe(3);
    await panel.getByRole("status").filter({ hasText: "Stok yok filtresinden kaldırıldı." }).waitFor();
    await expect.poll(() => stock.count()).toBe(0);
    await panel.getByLabel(/Stok Filtresi/i).selectOption("stocked");
    await expect.poll(() => stock.inputValue()).toBe("3");
    await panel.getByLabel(/Stok Filtresi/i).selectOption("all");
    await panel.getByLabel(/Set Filtresi/i).selectOption("ven");
    await page.reload();
    await panel.getByLabel(/Stok Filtresi/i).selectOption("all");
    await panel.getByPlaceholder(/Kart Veya Baskı Ara/i).fill("ven-sp1-006");
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
    await page.goto(origin + "/toov-admin?tab=riftbound-panel");
    await panel.getByLabel(/Stok Filtresi/i).selectOption("all");
    await panel.getByPlaceholder(/Kart Veya Baskı Ara/i).fill("ven-sp1-006");
    await expect.poll(() => stock.inputValue()).toBe("3");
    await panel.getByRole("button", { name: /Fiyatları Önizle/i }).click();
    await Promise.all([
      page.waitForResponse(response => response.url().includes("/api/admin/rifthunt/catalog") && response.ok()),
      apply.click(),
    ]);
    await panel.getByTestId("rift-import-complete").waitFor();
    // Wait for the refreshed catalog to commit before submitting a stock change
    // with its optimistic concurrency timestamp.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
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
