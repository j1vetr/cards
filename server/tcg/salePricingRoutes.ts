import type { Express, RequestHandler, Request } from "express";
import { randomUUID } from "crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { storage } from "../storage";
import { cache } from "../cache";
import { cards, cardListings, cardSets, cardGames } from "@shared/schema";
import type { SalePriceRow, SalePriceRun } from "@shared/salePricing";
import { getTcmbUsdRate } from "./tcmbService";
import { calculateSalePrice, marketUsdForCondition, selectPriceMatch } from "./salePricingMath";
import { fetchPriceById, searchPriceChartingProducts, type PriceChartingProduct } from "./priceChartingService";

const adminId = (req: Request) => (req as Request & { adminId: string }).adminId;
const optionsSchema = z.object({
  multiplier: z.number().finite().positive().max(100).default(1.9),
  game: z.enum(["all", "pokemon", "riftbound"]).default("all"),
}).strict();
const ENDPOINT = "/api/admin/tcg/sale-prices";

async function readRun(id: string, owner: string): Promise<SalePriceRun | null> {
  const result = await db.execute(sql`SELECT data FROM tcg_sale_price_runs WHERE id = ${id} AND admin_id = ${owner}`);
  return (result.rows[0]?.data as SalePriceRun) || null;
}

async function saveRun(run: SalePriceRun) {
  await db.execute(sql`UPDATE tcg_sale_price_runs SET status = ${run.status}, data = ${JSON.stringify(run)}::jsonb WHERE id = ${run.id}`);
}

async function generatePreview(run: SalePriceRun, apiKey: string) {
  try {
    const inventory = await db.select({
      listingId: cardListings.id, cardId: cards.id, name: cards.name, cardNumber: cards.cardNumber,
      setName: cardSets.name, gameName: cardGames.name, condition: cardListings.condition,
      finish: cardListings.finish, oldPrice: cardListings.price, updatedAt: cardListings.updatedAt,
    }).from(cardListings)
      .innerJoin(cards, eq(cards.id, cardListings.cardId))
      .innerJoin(cardSets, eq(cardSets.id, cards.setId))
      .innerJoin(cardGames, eq(cardGames.id, cardSets.gameId))
      .where(and(gt(cardListings.stock, 0), eq(cardListings.isActive, true), eq(cards.isActive, true),
        eq(cardSets.isActive, true), eq(cardGames.isActive, true),
        inArray(cardGames.slug, run.game && run.game !== "all" ? [run.game] : ["pokemon", "riftbound"])))
      .orderBy(cards.name, cardListings.id);
    run.total = inventory.length;
    await saveRun(run);
    const matches = new Map<string, PriceChartingProduct | null>();
    for (const listing of inventory) {
      const row: SalePriceRow = {
        listingId: listing.listingId, cardId: listing.cardId, name: listing.name, setName: listing.setName,
        condition: listing.condition, finish: listing.finish, oldPrice: listing.oldPrice,
        listingUpdatedAt: listing.updatedAt.toISOString(), marketUsd: null, newPrice: null,
      };
      if (!["NM", "PSA10"].includes(listing.condition)) {
        row.reason = "Bu kondisyon için güvenilir ayrı piyasa fiyatı yok.";
      } else if (!listing.cardNumber) {
        row.reason = "Kart numarası eksik olduğu için eşleştirilemedi.";
      } else {
        const matchKey = `${listing.cardId}:${listing.finish}`;
        if (!matches.has(matchKey)) {
          const number = listing.cardNumber.split("/")[0];
          const products = await searchPriceChartingProducts(`${listing.gameName} ${listing.setName} ${listing.name} #${number}`, apiKey);
          const match = selectPriceMatch(products, listing);
          // /products may omit price fields. Fetch the full matched product by ID.
          const detail = match ? await fetchPriceById(match.id, apiKey) : null;
          matches.set(matchKey, detail && selectPriceMatch([detail], listing) ? detail : null);
        }
        const product = matches.get(matchKey);
        if (!product) {
          row.reason = "Ad, set, numara ve kart yüzeyi için tek bir kesin eşleşme bulunamadı.";
        } else {
          row.sourceName = product["product-name"];
          row.sourceSet = product["console-name"];
          row.sourceUrl = `https://www.pricecharting.com/game/${encodeURIComponent(String(product.id))}`;
          const usd = marketUsdForCondition(product, listing.condition);
          if (usd === null) row.reason = "Bu varyant için pozitif USD piyasa fiyatı bulunamadı.";
          else {
            row.marketUsd = usd.toFixed(2);
            try {
              row.newPrice = calculateSalePrice(usd, run.rate.usdTry, run.multiplier);
            } catch {
              row.reason = "Hesaplanan fiyat desteklenen aralık dışında.";
            }
          }
        }
      }
      run.rows.push(row);
      run.processed++;
      if (run.processed % 5 === 0 || run.processed === run.total) await saveRun(run);
    }
    run.status = "ready";
    run.expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    await saveRun(run);
  } catch {
    // A service/auth failure invalidates the whole preview. Never apply partial output.
    run.status = "failed";
    run.error = "Fiyatlar alınamadı. PriceCharting API anahtarını, aboneliğini ve bağlantıyı kontrol edip yeniden deneyin. Satış fiyatları değişmedi.";
    await saveRun(run);
  }
}

export async function registerSalePricingRoutes(app: Express, requireAdmin: RequestHandler) {
  // Explicit tombstones prevent old browser tabs or API callers from reviving
  // the removed USD-only/stale-reference pricing paths.
  const removed: RequestHandler = (_req, res) => {
    res.status(410).json({ error: "Bu fiyatlama işlemi kaldırıldı. Satış fiyatlarını TCMB kurlu önizleme ve onay akışından güncelleyin." });
  };
  app.post("/api/admin/tcg/auto-list", requireAdmin, removed);
  app.get("/api/admin/cards/:id/price-reference", requireAdmin, removed);
  app.post("/api/admin/tcg/sync", requireAdmin, (req, res, next) => {
    if (req.body?.mode === "prices") return removed(req, res, next);
    next();
  });

  // Additive, idempotent DDL also runs on the user's external VPS.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tcg_sale_price_runs (
      id VARCHAR PRIMARY KEY,
      admin_id VARCHAR NOT NULL,
      status TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tcg_sale_price_one_running
      ON tcg_sale_price_runs (status) WHERE status = 'running';
  `);
  // Previews interrupted by a server restart cannot be completed or applied.
  await db.execute(sql`
    UPDATE tcg_sale_price_runs SET status = 'failed',
      data = data || '{"status":"failed","error":"Sunucu yeniden başladı. Önizlemeyi yeniden oluşturun. Satış fiyatları değişmedi."}'::jsonb
    WHERE status = 'running'
  `);

  app.get(`${ENDPOINT}/latest`, requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT data FROM tcg_sale_price_runs WHERE admin_id = ${adminId(req)}
        ORDER BY created_at DESC LIMIT 1
      `);
      res.json(result.rows[0]?.data || null);
    } catch {
      res.status(500).json({ error: "Son fiyat önizlemesi okunamadı." });
    }
  });

  app.post(`${ENDPOINT}/preview`, requireAdmin, async (req, res) => {
    const parsed = optionsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Geçerli bir kategori ve 0 ile 100 arasında pozitif bir çarpan seçin." });
    try {
      const key = await storage.getSiteSetting("pricecharting_api_key");
      if (!key || key === "••••••••") return res.status(400).json({ error: "Ayarlar bölümünde PriceCharting API anahtarını tanımlayın." });
      const rate = await getTcmbUsdRate();
      const run: SalePriceRun = {
        id: randomUUID(), status: "running", multiplier: parsed.data.multiplier, game: parsed.data.game, rate,
        rows: [], total: 0, processed: 0, createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
      };
      await db.execute(sql`
        INSERT INTO tcg_sale_price_runs (id, admin_id, status, data)
        VALUES (${run.id}, ${adminId(req)}, ${run.status}, ${JSON.stringify(run)}::jsonb)
      `);
      void generatePreview(run, key).catch(() => console.error("[sale-pricing] Preview could not be saved."));
      res.status(202).json({ id: run.id });
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        return res.status(409).json({ error: "Bir fiyat önizlemesi zaten hazırlanıyor. Tamamlanmasını bekleyin." });
      }
      res.status(503).json({ error: "TCMB kuru alınamadı veya önizleme başlatılamadı. Fiyatlar değiştirilmedi." });
    }
  });

  app.get(`${ENDPOINT}/:id`, requireAdmin, async (req, res) => {
    try {
      const run = await readRun(req.params.id, adminId(req));
      if (!run) return res.status(404).json({ error: "Fiyat önizlemesi bulunamadı." });
      res.json(run);
    } catch {
      res.status(500).json({ error: "Fiyat önizlemesi okunamadı." });
    }
  });

  app.post(`${ENDPOINT}/:id/apply`, requireAdmin, async (req, res) => {
    try {
      const result = await db.transaction(async (tx) => {
        const query = await tx.execute(sql`
          SELECT data FROM tcg_sale_price_runs
          WHERE id = ${req.params.id} AND admin_id = ${adminId(req)} FOR UPDATE
        `);
        const run = query.rows[0]?.data as SalePriceRun | undefined;
        if (!run) throw new Error("Fiyat önizlemesi bulunamadı.");
        // Idempotent replay of a completed request never rewrites inventory.
        if (run.status === "applied") return { updated: run.updated || 0 };
        if (run.status !== "ready" || Date.parse(run.expiresAt) <= Date.now()) {
          throw new Error("Önizleme hazır değil veya süresi doldu. Yeniden oluşturun.");
        }
        const eligible = run.rows.filter((row) => row.newPrice !== null);
        if (!eligible.length) throw new Error("Güncellenebilecek fiyat bulunamadı.");
        for (const row of eligible) {
          const current = await tx.execute(sql`
            SELECT cl.price, cl.updated_at, cl.condition, cl.finish, cl.stock,
              c.id AS card_id, c.name, cs.name AS set_name, cg.slug AS game_slug,
              cl.is_active AND c.is_active AND cs.is_active AND cg.is_active AS active
            FROM card_listings cl JOIN cards c ON c.id = cl.card_id
              JOIN card_sets cs ON cs.id = c.set_id JOIN card_games cg ON cg.id = cs.game_id
            WHERE cl.id = ${row.listingId} FOR UPDATE OF cl, c, cs, cg
          `);
          const value = current.rows[0];
          if (!value || !value.active || Number(value.stock) <= 0
            || Number(value.price) !== Number(row.oldPrice)
            || new Date(value.updated_at as string).toISOString() !== row.listingUpdatedAt
            || value.condition !== row.condition || value.finish !== row.finish
            || value.card_id !== row.cardId || value.name !== row.name || value.set_name !== row.setName
            || (run.game && run.game !== "all" && value.game_slug !== run.game)) {
            throw new Error("Önizlemeden sonra bir kartın fiyatı, stoğu veya bilgileri değişti. Hiçbir fiyat güncellenmedi. Yeniden önizleyin.");
          }
          await tx.update(cardListings).set({ price: row.newPrice!, updatedAt: new Date() })
            .where(eq(cardListings.id, row.listingId));
        }
        run.status = "applied";
        run.updated = eligible.length;
        await tx.execute(sql`UPDATE tcg_sale_price_runs SET status = 'applied', data = ${JSON.stringify(run)}::jsonb WHERE id = ${run.id}`);
        return { updated: eligible.length };
      });
      cache.clear();
      res.json(result);
    } catch (err) {
      const error = err instanceof Error && !("code" in err) ? err.message : "Fiyatlar güncellenemedi. Hiçbir değişiklik yapılmadı.";
      res.status(409).json({ error });
    }
  });
}
