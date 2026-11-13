import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import express from "express";
import request from "supertest";

const holder = vi.hoisted(() => ({ db: null as any }));
vi.mock("../server/db", () => ({
  db: {
    execute: (...args: any[]) => holder.db.execute(...args),
    transaction: (...args: any[]) => holder.db.transaction(...args),
  },
}));
vi.mock("../server/cache", () => ({ cache: { clear: vi.fn() } }));
vi.mock("../server/tcg/tcmbService", () => ({
  getTcmbUsdRate: async () => ({ usdTry: 40, date: new Date().toISOString().slice(0, 10), source: "https://www.tcmb.gov.tr/kurlar/today.xml" }),
}));
import { registerRifthuntRoutes } from "../server/tcg/rifthuntRoutes";
import { runRiftDaily } from "../server/tcg/rifthuntEngine";

const printingId = "00000000-0000-4000-8000-000000000001";
const oracleId = "00000000-0000-4000-8000-000000000002";
let app: express.Express;
let client: Client;
let schema: string;
let market: number | null = 75.43;
let sourceFails = false;
const base = "/api/admin/rifthunt";
const owner = "test-admin";
const post = (url: string, data: unknown = {}) => request(app).post(url).set("x-test-admin", owner).send(data);
const get = (url: string) => request(app).get(url).set("x-test-admin", owner);

describe.skipIf(!process.env.DATABASE_URL)("RiftHunt actual PostgreSQL routes in an isolated schema", () => {
  beforeAll(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  });
  beforeEach(async () => {
    schema = "rh_test_" + randomUUID().replaceAll("-", "");
    // Every original table is explicitly created in our private schema. No real app tables are used.
    await client.query(`CREATE SCHEMA "${schema}"; SET search_path TO "${schema}", public;
      CREATE TABLE card_games(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),name text,slug text UNIQUE,is_active boolean DEFAULT true);
      CREATE TABLE card_sets(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),game_id varchar REFERENCES card_games(id),
        name text,slug text UNIQUE,release_date text,total_cards int,api_id text,api_source text,is_active boolean DEFAULT true,
        logo_url text,symbol_url text,updated_at timestamp DEFAULT now());
      CREATE TABLE cards(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),set_id varchar REFERENCES card_sets(id) ON DELETE CASCADE,
        name text,slug text UNIQUE,card_number text,rarity text,card_types jsonb,artist text,image_url text,image_url_hi_res text,
        description text,api_id text,api_source text,is_active boolean DEFAULT true,is_manually_edited boolean DEFAULT false,
        updated_at timestamp DEFAULT now(),UNIQUE(api_source,api_id));
      CREATE TABLE card_listings(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),card_id varchar REFERENCES cards(id) ON DELETE CASCADE,
        condition text,finish text,price numeric(10,2),stock int,is_active boolean,updated_at timestamp DEFAULT now());
      CREATE TABLE card_prices(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),card_id varchar REFERENCES cards(id) ON DELETE CASCADE);
      CREATE TABLE tcg_sync_runs(id varchar PRIMARY KEY DEFAULT gen_random_uuid(),game text);
      CREATE TABLE products(id varchar PRIMARY KEY,images jsonb);
      CREATE TABLE order_items(id varchar PRIMARY KEY,card_listing_id varchar REFERENCES card_listings(id) ON DELETE SET NULL,
        product_name text,price numeric,quantity int);
      CREATE TABLE cart_items(id varchar PRIMARY KEY,card_listing_id varchar REFERENCES card_listings(id) ON DELETE CASCADE);
      INSERT INTO card_games(id,name,slug) VALUES('rift','Riftbound','riftbound'),('poke','Pokemon','pokemon');
      INSERT INTO card_sets(id,game_id,name,slug) VALUES('old-set','rift','Old Rift','old-rift'),('poke-set','poke','Base','pokemon-base');
      INSERT INTO cards(id,set_id,name,slug,api_source) VALUES('old-card','old-set','Old Card','old-card','riftbound'),('poke-card','poke-set','Pikachu','pikachu','pokemon_tcg');
      INSERT INTO card_listings(id,card_id,condition,finish,price,stock,is_active) VALUES('old-listing','old-card','NM','normal',181.66,5,true),('poke-listing','poke-card','NM','normal',100,9,true);
      INSERT INTO card_prices(id,card_id) VALUES('old-price','old-card');
      INSERT INTO tcg_sync_runs(id,game) VALUES('old-sync','riftbound'),('poke-sync','pokemon_tcg');
      INSERT INTO order_items VALUES('order-line','old-listing','Old Card',181.66,2);
      INSERT INTO cart_items VALUES('old-cart','old-listing');`);
    holder.db = drizzle(client);
    market = 75.43; sourceFails = false;
    const originalLstat = fs.lstat.bind(fs);
    vi.spyOn(fs, "lstat").mockImplementation(((file: any, ...args: any[]) => {
      if (String(file).includes("/cards/")) return Promise.reject(Object.assign(new Error("test image root absent"), { code: "ENOENT" }));
      return (originalLstat as any)(file, ...args);
    }) as any);
    // Hide only managed image roots. Never scan or remove workspace card assets in these tests.
    const originalReaddir = fs.readdir.bind(fs);
    vi.spyOn(fs, "readdir").mockImplementation(((file: any, ...args: any[]) => {
      if (String(file).includes("/cards/")) return Promise.reject(Object.assign(new Error("test image root absent"), { code: "ENOENT" }));
      return (originalReaddir as any)(file, ...args);
    }) as any);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (sourceFails) return new Response("upstream unavailable", { status: 503 });
      const now = new Date().toISOString();
      const data = url.endsWith("/bulk/cards") ? {
        fetched: now, source: "riotgames.com", sets: [{ id: "VEN", name: "Vendetta", count: 1, released: "2026-07-31" }],
        cards: [{ printing_id: printingId, oracle_id: oracleId, riftboundId: "ven-sp1-006", name: "Kai'Sa, Survivor",
          set: "VEN", setName: "Vendetta", rarity: "Showcase", type: "Unit", domains: ["Fury"], energy: 4, power: null, might: 4,
          text: "Draw 1.", flavour: null, artist: "Artist", imgUrl: "https://images.rifthunt.com/test.webp",
          alt: false, sig: false, over: false, finishes: ["foil"] }],
      } : url.endsWith("/bulk/prices") ? {
        source: "tcgplayer", currency: "USD", prices: [{ printing_id: printingId, collector: "sp1", slug: "kaisa-survivor", updatedAt: now,
          finishes: { foil: { market, low: 72, mid: 85, high: 300 } } }],
      } : url.endsWith("/bulk/tags") ? { tags: [], taggings: [] } : url.endsWith("/bulk/rulings") ? {
        cards: [{ card: "Kai'Sa, Survivor", rulings: [{ question: "Rule?", html: "<p>Safe answer</p><script>unsafe()</script>" }] }],
        license: "CC BY-SA 4.0", commit: "test-source",
      } : { printing_id: printingId, from: now.slice(0,10), to: now.slice(0,10), bucket: "day", dates: [now.slice(0,10)],
        series: { tcgplayer: { currency: "USD", field: "market", foil: [75.43], normal: [0.01] } } };
      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    }));
    app = express(); app.use(express.json());
    await registerRifthuntRoutes(app, (req, res, next) => {
      const id = req.headers["x-test-admin"];
      if (!id) { res.sendStatus(401); return; }
      (req as any).adminId = id; next();
    });
  }, 30000);
  afterEach(async () => {
    const files = await client.query(`SELECT filename FROM "${schema}".rifthunt_backups`);
    for (const row of files.rows) {
      if (/^[a-f0-9-]+\.tar\.gz$/.test(row.filename)) await fs.unlink("generated-artifacts/rifthunt-backups/" + row.filename).catch(() => {});
    }
    await client.query(`DROP SCHEMA "${schema}" CASCADE; SET search_path TO public`);
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  afterAll(async () => { await client?.end(); });
  async function backup(download = true) {
    const b = await post(base + "/backup");
    expect(b.status, JSON.stringify(b.body)).toBe(200);
    if (download) {
      expect((await get(b.body.downloadUrl)).status).toBe(200);
      for (let i = 0; i < 20; i++) {
        if ((await client.query("SELECT downloaded_at FROM rifthunt_backups WHERE id=$1", [b.body.id])).rows[0].downloaded_at) break;
        await new Promise(r => setTimeout(r, 5));
      }
    }
    return b.body;
  }
  async function reset() {
    const response = await post(base + "/reset", { confirmation: "RIFTBOUND SİL" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  }
  async function preview(multiplier = 1.9) {
    const p = await post(base + "/preview", { multiplier, autoDaily: true });
    expect(p.status, JSON.stringify(p.body)).toBe(202);
    for (let i = 0; i < 100; i++) {
      const r = await get(base + "/runs/" + p.body.id);
      if (r.body.status !== "running") return r.body;
      await new Promise(r => setTimeout(r, 10));
    }
    throw new Error("preview timeout");
  }
  async function activate() {
    await reset();
    const p = await preview();
    expect(p.status, p.error).toBe("ready");
    const applied = await post(`${base}/runs/${p.id}/apply`);
    expect(applied.status, JSON.stringify(applied.body)).toBe(200);
    return p;
  }
  it("requires authentication, owner access and validated reset confirmation", async () => {
    expect((await request(app).get(base + "/status")).status).toBe(401);
    expect((await request(app).post(base + "/reset").send({ confirmation: "RIFTBOUND SİL" })).status).toBe(401);
    expect((await post(base + "/reset", { confirmation: "wrong" })).status).toBe(400);
    expect((await post(base + "/reset")).status).toBe(400);
    const b = await backup(false);
    expect((await request(app).get(b.downloadUrl).set("x-test-admin", "other")).status).toBe(404);
    expect((await client.query("SELECT stock FROM card_listings WHERE id='old-listing'")).rows[0].stock).toBe(5);
  });
  it("deletes Riftbound directly without creating a backup and preserves Pokemon and orders", async () => {
    expect((await client.query("SELECT * FROM rifthunt_backups")).rows).toHaveLength(0);
    const changed = await post(base + "/reset", { confirmation: "RIFTBOUND SİL" });
    expect(changed.status, JSON.stringify(changed.body)).toBe(200);
    expect((await client.query("SELECT id FROM cards")).rows).toEqual([{ id: "poke-card" }]);
    expect((await client.query("SELECT stock FROM card_listings")).rows).toEqual([{ stock: 9 }]);
    expect((await client.query("SELECT * FROM order_items")).rows[0]).toMatchObject({ product_name: "Old Card", price: "181.66", quantity: 2, card_listing_id: null });
    expect((await client.query("SELECT * FROM cart_items")).rows).toHaveLength(0);
    expect((await client.query("SELECT * FROM card_prices")).rows).toHaveLength(0);
    expect((await client.query("SELECT id FROM tcg_sync_runs")).rows).toEqual([{ id: "poke-sync" }]);
    expect((await client.query("SELECT * FROM rifthunt_backups")).rows).toHaveLength(0);
    const state = (await get(base + "/status")).body;
    expect(state.config.enabled).toBe(false);
    expect(state.config.resetAt).toBeTruthy();
    expect(state.counts).toMatchObject({ cards: 0, sets: 0, listings: 0, stock: 0 });
  });
  it("invalidates old previews on direct cleanup and requires a new explicit import", async () => {
    const p = await preview();
    await reset();
    expect((await get(`${base}/runs/${p.id}`)).status).toBe(404);
    expect((await post(`${base}/runs/${p.id}/apply`)).status).toBe(409);
    expect((await client.query("SELECT id FROM cards")).rows).toEqual([{ id: "poke-card" }]);
  });
  it("shows every printing in previews but prevents apply without clean installation", async () => {
    const p = await preview();
    const cat = await get(`${base}/catalog?previewId=${p.id}`);
    expect(cat.body.rows[0]).toMatchObject({ finish: "foil", stock: 0, salePrice: "5732.68", printing: { collector: "sp1" } });
    expect((await post(`${base}/runs/${p.id}/apply`)).status).toBe(409);
    expect((await client.query("SELECT stock FROM card_listings WHERE id='old-listing'")).rows[0].stock).toBe(5);
  });
  it("imports at zero stock, lists by stock only, reprices without changing stock and rejects stale writes", async () => {
    const p = await activate();
    let cat = (await get(base + "/catalog")).body;
    let row = cat.rows[0];
    expect(row).toMatchObject({ stock: 0, oldPrice: "5732.68", finish: "foil", printing: { collector: "sp1" } });
    const body = { printingId, finish: "foil", stock: 3, expectedStock: row.stock, expectedUpdatedAt: row.updatedAt };
    expect((await post(base + "/stock", body)).status).toBe(200);
    expect((await post(base + "/stock", body)).status).toBe(409);
    expect((await post(base + "/stock", { ...body, finish: "normal" })).status).toBe(409);
    let listings = await client.query("SELECT * FROM card_listings WHERE card_id=$1", [row.cardId]);
    expect(listings.rows[0]).toMatchObject({ stock: 3, is_active: true });
    const next = await preview(2);
    expect((await post(`${base}/runs/${next.id}/apply`)).status).toBe(200);
    listings = await client.query("SELECT * FROM card_listings WHERE card_id=$1", [row.cardId]);
    expect(listings.rows[0]).toMatchObject({ stock: 3, price: "6034.40" });
    expect((await post(`${base}/runs/${next.id}/apply`)).status).toBe(200);
    expect((await post(base + "/backup")).status).toBe(409);
    expect((await post(base + "/reset", { confirmation: "RIFTBOUND SİL" })).status).toBe(409);
    expect((await client.query("SELECT stock FROM card_listings WHERE id='poke-listing'")).rows[0].stock).toBe(9);
  });
  it("does not import fake zero prices and fails explicitly on upstream errors", async () => {
    await reset(); market = null;
    let p = await preview();
    expect(p.priced).toBe(0);
    expect((await post(`${base}/runs/${p.id}/apply`)).status).toBe(200);
    const cat = (await get(base + "/catalog")).body;
    expect(cat.rows[0]).toMatchObject({ stock: 0, listingId: null, salePrice: null });
    expect((await post(base + "/stock", { printingId, finish: "foil", stock: 1, expectedStock: 0, expectedUpdatedAt: null })).status).toBe(409);
    await client.query("DELETE FROM rifthunt_state WHERE key='snapshot'");
    sourceFails = true;
    p = await preview();
    expect(p.status).toBe("failed");
    expect((await post(`${base}/runs/${p.id}/apply`)).status).toBe(409);
  });
  it("enforces preview ownership, expiry and superseded configuration", async () => {
    await reset(); const p = await preview();
    expect((await request(app).get(`${base}/runs/${p.id}`).set("x-test-admin", "other")).status).toBe(404);
    expect((await request(app).post(`${base}/runs/${p.id}/apply`).set("x-test-admin", "other")).status).toBe(409);
    await client.query("UPDATE rifthunt_runs SET data=jsonb_set(data,'{expiresAt}',to_jsonb('2000-01-01T00:00:00Z'::text)) WHERE id=$1", [p.id]);
    expect((await post(`${base}/runs/${p.id}/apply`)).status).toBe(409);
    const a = await preview(); const b = await preview(2);
    expect((await post(`${base}/runs/${a.id}/apply`)).status).toBe(200);
    expect((await post(`${base}/runs/${b.id}/apply`)).status).toBe(409);
  });
  it("serves real metadata, safe rules and only supported price history finishes", async () => {
    await activate();
    const row = (await get(base + "/catalog")).body.rows[0];
    const details = await request(app).get(`/api/rifthunt/cards/${row.cardId}`);
    expect(details.status).toBe(200);
    expect(details.body.rulings).toEqual([{ question: "Rule?", answer: "Safe answer" }]);
    const history = await request(app).get(`/api/rifthunt/cards/${row.cardId}/history?range=1m`);
    expect(history.body.series.tcgplayer.foil).toEqual([75.43]);
    expect(history.body.series.tcgplayer.normal).toBeUndefined();
    expect((await request(app).get("/api/rifthunt/cards/poke-card")).status).toBe(404);
  });
  it("keeps legacy Riftbound writes out while allowing Pokemon routing", async () => {
    app.post("/api/admin/tcg/sync", (_req,res) => res.json({ pokemon: true }));
    expect((await post("/api/admin/tcg/sync", { game: "riftbound", mode: "full" })).status).toBe(410);
    expect((await post("/api/admin/tcg/sync", { game: "pokemon_tcg", mode: "full" })).body).toEqual({ pokemon: true });
    await activate();
    const row = (await get(base + "/catalog")).body.rows[0];
    expect((await post(`/api/admin/cards/${row.cardId}/listings`, { price: "1", stock: 99 })).status).toBe(409);
  });
  it("runs automatic daily repricing through the same stock-preserving pipeline", async () => {
    await activate();
    const row = (await get(base + "/catalog")).body.rows[0];
    expect((await post(base + "/stock", { printingId, finish: "foil", stock: 2, expectedStock: row.stock, expectedUpdatedAt: row.updatedAt })).status).toBe(200);
    await client.query("DELETE FROM rifthunt_state WHERE key='snapshot'");
    market = 80;
    await runRiftDaily();
    const record = (await client.query("SELECT price,stock FROM card_listings WHERE card_id=$1", [row.cardId])).rows[0];
    expect(record).toEqual({ price: "6080.00", stock: 2 });
  }, 15000);
});
