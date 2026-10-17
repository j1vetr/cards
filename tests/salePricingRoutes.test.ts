import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SalePriceRun } from "../shared/salePricing";

const fake = vi.hoisted(() => ({
  runs: new Map<string, { owner: string; data: any }>(),
  inventory: [] as any[],
  updates: [] as any[],
  query: undefined as any,
  key: "test-only-key",
  rateFailure: false,
  sourceFailure: false,
  clearCache: vi.fn(),
}));

vi.mock("../server/db", () => {
  const db: any = {
    execute: vi.fn(async (sql: any) => {
      const { sql: text, params } = fake.query(sql);
      if (text.includes("CREATE TABLE") || text.includes("WHERE status = 'running'")) return { rows: [] };
      if (text.includes("INSERT INTO tcg_sale_price_runs")) {
        if (Array.from(fake.runs.values()).some((run) => run.data.status === "running")) throw { code: "23505" };
        fake.runs.set(params[0], { owner: params[1], data: JSON.parse(params[3]) });
        return { rows: [] };
      }
      if (text.includes("UPDATE tcg_sale_price_runs")) {
        const applied = text.includes("status = 'applied'");
        const json = params[applied ? 0 : 1];
        const id = params[applied ? 1 : 2];
        fake.runs.get(id)!.data = JSON.parse(json);
        return { rows: [] };
      }
      if (text.includes("FROM card_listings cl")) {
        const row = fake.inventory.find((item) => item.listingId === params[0]);
        return { rows: row ? [{
          price: row.oldPrice, updated_at: row.updatedAt, stock: row.stock, active: row.active,
          condition: row.condition, finish: row.finish, card_id: row.cardId, name: row.name, set_name: row.setName, game_slug: row.gameSlug,
        }] : [] };
      }
      const record = fake.runs.get(params[0]);
      if (text.includes("ORDER BY created_at")) {
        const values = Array.from(fake.runs.values()).filter((run) => run.owner === params[0]);
        return { rows: values.length ? [{ data: structuredClone(values[values.length - 1].data) }] : [] };
      }
      return { rows: record && record.owner === params[1] ? [{ data: structuredClone(record.data) }] : [] };
    }),
    select: () => {
      const chain: any = {};
      let selectedGames: string[] = [];
      for (const method of ["from", "innerJoin"]) chain[method] = () => chain;
      chain.where = (clause: any) => {
        selectedGames = fake.query(clause).params.filter((value: unknown) => value === "pokemon" || value === "riftbound");
        return chain;
      };
      chain.orderBy = async () => fake.inventory.filter((row) => selectedGames.includes(row.gameSlug));
      return chain;
    },
    update: () => ({ set: (values: any) => ({ where: async () => { fake.updates.push(values); } }) }),
  };
  db.transaction = async (callback: any) => {
    const before = structuredClone(fake.runs);
    const updates = fake.updates.length;
    try { return await callback(db); }
    catch (error) { fake.runs = before; fake.updates.splice(updates); throw error; }
  };
  return { db };
});
vi.mock("../server/storage", () => ({ storage: { getSiteSetting: async () => fake.key } }));
vi.mock("../server/cache", () => ({ cache: { clear: fake.clearCache } }));
vi.mock("../server/tcg/tcmbService", () => ({
  getTcmbUsdRate: async () => {
    if (fake.rateFailure) throw new Error("offline");
    return { usdTry: 40, date: "2026-10-09", source: "https://www.tcmb.gov.tr/kurlar/today.xml" };
  },
}));
vi.mock("../server/tcg/priceChartingService", () => ({
  searchPriceChartingProducts: async () => {
    if (fake.sourceFailure) throw new Error("HTTP 401");
    return [{ id: "123", "product-name": "Pikachu #25", "console-name": "Pokemon Base Set" }];
  },
  fetchPriceById: async () => ({
    id: "123", "product-name": "Pikachu #25", "console-name": "Pokemon Base Set", "loose-price": 1000,
  }),
}));

import { registerSalePricingRoutes } from "../server/tcg/salePricingRoutes";

let app: express.Express;
beforeEach(async () => {
  fake.query = (sql: any) => new PgDialect().sqlToQuery(sql);
  fake.runs.clear();
  fake.updates.length = 0;
  fake.key = "test-only-key";
  fake.rateFailure = false;
  fake.sourceFailure = false;
  fake.clearCache.mockClear();
  fake.inventory = [{
    listingId: "listing-1", cardId: "card-1", name: "Pikachu", cardNumber: "025/102",
    setName: "Base Set", gameName: "Pokemon", gameSlug: "pokemon", condition: "NM", finish: "normal",
    oldPrice: "100.00", updatedAt: new Date("2026-10-09T00:00:00Z"), stock: 7, active: true,
  }];
  app = express();
  app.use(express.json());
  await registerSalePricingRoutes(app, (req, res, next) => {
    const id = req.headers["x-test-admin"];
    if (!id) { res.status(401).json({ error: "Unauthorized" }); return; }
    (req as any).adminId = id;
    next();
  });
});

async function readyPreview(game?: string): Promise<SalePriceRun> {
  const response = await request(app).post("/api/admin/tcg/sale-prices/preview").set("x-test-admin", "owner").send({ multiplier: 1.9, ...(game ? { game } : {}) });
  expect(response.status).toBe(202);
  for (let attempt = 0; attempt < 50; attempt++) {
    const run = fake.runs.get(response.body.id)!.data;
    if (run.status !== "running") return run;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("Preview did not finish");
}

describe("admin repricing endpoints", () => {
  it.each(["pokemon", "riftbound", "all"])("limits the preview to category %s", async (game) => {
    fake.inventory.push({
      ...fake.inventory[0], listingId: "rift-listing", cardId: "rift-card",
      gameName: "Riftbound", gameSlug: "riftbound", condition: "LP",
    });
    const run = await readyPreview(game);
    expect(run.game).toBe(game);
    expect(run.total).toBe(game === "all" ? 2 : 1);
    expect(run.rows.map((row) => row.listingId)).toEqual(
      game === "all" ? ["listing-1", "rift-listing"] : game === "pokemon" ? ["listing-1"] : ["rift-listing"],
    );
  });

  it("defaults to both categories and rejects unknown selections", async () => {
    expect((await readyPreview()).game).toBe("all");
    const response = await request(app).post("/api/admin/tcg/sale-prices/preview")
      .set("x-test-admin", "owner").send({ game: "unknown", multiplier: 1.9 });
    expect(response.status).toBe(400);
  });

  it("applies a selected-category preview and rejects a changed category", async () => {
    const run = await readyPreview("pokemon");
    fake.inventory[0].gameSlug = "riftbound";
    const rejected = await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner");
    expect(rejected.status).toBe(409);
    expect(fake.updates).toHaveLength(0);
    fake.inventory[0].gameSlug = "pokemon";
    const applied = await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner");
    expect(applied.status).toBe(200);
    expect(fake.updates).toHaveLength(1);
  });

  it("permanently disables all legacy pricing entry points without changing inventory", async () => {
    const autoList = await request(app).post("/api/admin/tcg/auto-list").set("x-test-admin", "owner").send({ multiplier: 1.9, stock: 999 });
    const sync = await request(app).post("/api/admin/tcg/sync").set("x-test-admin", "owner").send({ game: "pokemon_tcg", mode: "prices" });
    const reference = await request(app).get("/api/admin/cards/card-1/price-reference").set("x-test-admin", "owner");
    expect(autoList.status).toBe(410);
    expect(sync.status).toBe(410);
    expect(reference.status).toBe(410);
    expect(fake.updates).toEqual([]);
    expect(fake.runs.size).toBe(0);
    expect(fake.inventory[0].stock).toBe(7);
  });
  it("retains normal card metadata sync routing", async () => {
    app.post("/api/admin/tcg/sync", (_req, res) => res.json({ metadata: true }));
    for (const mode of ["cards", "sets", "full"]) {
      const response = await request(app).post("/api/admin/tcg/sync").set("x-test-admin", "owner").send({ game: "pokemon_tcg", mode });
      expect(response.body).toEqual({ metadata: true });
    }
  });
  it("requires authentication on preview, retrieval and apply", async () => {
    expect((await request(app).post("/api/admin/tcg/sale-prices/preview").send({ multiplier: 1.9 })).status).toBe(401);
    expect((await request(app).get("/api/admin/tcg/sale-prices/latest")).status).toBe(401);
    expect((await request(app).post("/api/admin/tcg/sale-prices/any/apply")).status).toBe(401);
  });
  it.each([0, -1, 101, "1.9", null])("rejects invalid multiplier %s", async (multiplier) => {
    expect((await request(app).post("/api/admin/tcg/sale-prices/preview").set("x-test-admin", "owner").send({ multiplier })).status).toBe(400);
    expect(fake.runs.size).toBe(0);
  });
  it("previews and applies TRY prices without updating stock or creating listings", async () => {
    const run = await readyPreview();
    expect(run.status).toBe("ready");
    expect(run.rows[0]).toMatchObject({ oldPrice: "100.00", newPrice: "760.00", marketUsd: "10.00" });
    expect(fake.updates).toEqual([]);
    const response = await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner").send({});
    expect(response.body.updated).toBe(1);
    expect(fake.updates).toHaveLength(1);
    expect(Object.keys(fake.updates[0]).sort()).toEqual(["price", "updatedAt"]);
    expect(fake.inventory[0].stock).toBe(7);
    expect(fake.clearCache).toHaveBeenCalled();
    const replay = await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner").send({});
    expect(replay.body.updated).toBe(1);
    expect(fake.updates).toHaveLength(1);
  });
  it("does not expose or apply another admin's preview", async () => {
    const run = await readyPreview();
    expect((await request(app).get(`/api/admin/tcg/sale-prices/${run.id}`).set("x-test-admin", "other")).status).toBe(404);
    expect((await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "other")).status).toBe(409);
    expect(fake.updates).toEqual([]);
  });
  it("fails safely on missing API key or missing TCMB rate", async () => {
    fake.key = "";
    expect((await request(app).post("/api/admin/tcg/sale-prices/preview").set("x-test-admin", "owner").send({ multiplier: 1.9 })).status).toBe(400);
    fake.key = "test-only-key";
    fake.rateFailure = true;
    expect((await request(app).post("/api/admin/tcg/sale-prices/preview").set("x-test-admin", "owner").send({ multiplier: 1.9 })).status).toBe(503);
    expect(fake.updates).toEqual([]);
    expect(fake.runs.size).toBe(0);
  });
  it("cannot apply a failed PriceCharting preview", async () => {
    fake.sourceFailure = true;
    const run = await readyPreview();
    expect(run.status).toBe("failed");
    expect((await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner")).status).toBe(409);
    expect(fake.updates).toEqual([]);
  });
  it("rejects expired previews", async () => {
    const run = await readyPreview();
    run.expiresAt = new Date(Date.now() - 1000).toISOString();
    expect((await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner")).status).toBe(409);
    expect(fake.updates).toEqual([]);
  });
  it("rejects stale inventory and rolls back an entire batch", async () => {
    fake.inventory.push({ ...fake.inventory[0], listingId: "listing-2", stock: 3 });
    const run = await readyPreview();
    fake.inventory[1].oldPrice = "105.00";
    const response = await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner");
    expect(response.status).toBe(409);
    expect(response.body.error).toContain("Hiçbir fiyat");
    expect(fake.updates).toEqual([]);
    expect(fake.runs.get(run.id)!.data.status).toBe("ready");
  });
  it("skips unsupported condition and unmatched foil, leaving their prices intact", async () => {
    fake.inventory.push({ ...fake.inventory[0], listingId: "lp", condition: "LP" });
    fake.inventory.push({ ...fake.inventory[0], listingId: "foil", finish: "foil" });
    const run = await readyPreview();
    expect(run.rows.filter((row) => row.reason)).toHaveLength(2);
    const response = await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner");
    expect(response.body.updated).toBe(1);
    expect(fake.updates).toHaveLength(1);
  });
  it("rejects inventory that was deactivated or sold out after preview", async () => {
    const run = await readyPreview();
    fake.inventory[0].stock = 0;
    expect((await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner")).status).toBe(409);
    fake.inventory[0].stock = 7;
    fake.inventory[0].active = false;
    expect((await request(app).post(`/api/admin/tcg/sale-prices/${run.id}/apply`).set("x-test-admin", "owner")).status).toBe(409);
    expect(fake.updates).toEqual([]);
  });
});
