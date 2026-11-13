import type { Express, RequestHandler, Request } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import cron from "node-cron";
import { db } from "../db";
import type { RiftAdminRow, RiftCatalog, RiftDetails, RiftHistory, RiftPrinting, RiftRun, RiftStatus } from "@shared/rifthunt";
import { fetchRifthuntJson, priceFor, type RiftSnapshot } from "./rifthuntData";
import { getRiftConfig, getRiftRun, initRifthuntStore, putRiftState, riftCounts, riftState } from "./rifthuntStore";
import { applyRiftPreview, createRiftPreview, riftStock, runRiftDaily, type RiftPayload } from "./rifthuntEngine";
import { createRiftBackup, getRiftBackup, resetRiftbound } from "./rifthuntBackup";

const owner = (req: Request) => (req as Request & { adminId: string }).adminId;
const uuid = z.string().uuid();
const options = z.object({ multiplier: z.number().finite().positive().max(100), autoDaily: z.boolean() }).strict();
function errorMessage(e: unknown) {
  return e instanceof Error && !("code" in e) && !e.cause && !(e instanceof z.ZodError) ? e.message.slice(0, 300) : "İşlem tamamlanamadı. Verileri yenileyip tekrar deneyin.";
}
async function status(admin: string): Promise<RiftStatus> {
  const config = await getRiftConfig();
  const snapshot = await riftState<RiftSnapshot | null>("snapshot", null);
  const runs = await db.execute(sql`SELECT data FROM rifthunt_runs WHERE owner_id=${admin} ORDER BY created_at DESC LIMIT 1`);
  return {
    config, counts: await riftCounts(), latestRun: runs.rows[0]?.data as RiftRun ?? null,
    snapshotAt: snapshot?.fetchedAt ?? null, sourceFetchedAt: snapshot?.sourceFetchedAt ?? null,
    warnings: [...snapshot?.warnings ?? [], ...config.lastError ? [config.lastError] : []],
  };
}
export async function riftCatalog(admin: string, query: Record<string, unknown>): Promise<RiftCatalog> {
  const parsed = z.object({
    search: z.string().max(200).default(""), set: z.string().max(30).default(""),
    finish: z.enum(["", "normal", "foil"]).default(""), stock: z.enum(["all", "stocked", "empty"]).default("all"),
    priced: z.enum(["all", "yes", "no"]).default("all"),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(30),
    previewId: uuid.optional(),
  }).parse(query);
  const state = await status(admin);
  let snapshot = await riftState<RiftSnapshot | null>("snapshot", null);
  let preview: RiftRun | null = null;
  if (parsed.previewId) {
    const result = await db.execute(sql`SELECT data,payload FROM rifthunt_runs WHERE id=${parsed.previewId}::uuid AND owner_id=${admin}`);
    preview = result.rows[0]?.data as RiftRun ?? null;
    const payload = result.rows[0]?.payload as RiftPayload;
    if (!preview) throw new Error("Önizleme bulunamadı.");
    if (payload) snapshot = payload.snapshot;
  }
  const records = await db.execute(sql`SELECT p.printing_id,p.card_id,c.slug,l.id AS listing_id,l.stock,l.price,l.updated_at,l.finish
    FROM rifthunt_printings p LEFT JOIN cards c ON c.id=p.card_id
    LEFT JOIN card_listings l ON l.card_id=c.id AND l.condition='NM'`);
  const rate = preview?.rate ?? await riftState<RiftRun["rate"]>("rate", null);
  const multiplier = preview?.multiplier ?? state.config.multiplier;
  let rows: RiftAdminRow[] = [];
  for (const printing of snapshot?.printings ?? []) {
    for (const finish of printing.finishes.length ? printing.finishes : [null]) {
      const found = records.rows.filter(r => r.printing_id === printing.printingId);
      const matches = found.filter(r => r.finish === finish);
      const listing = matches[0];
      const calculated = rate
        ? priceFor(printing, finish, rate.usdTry, multiplier)
        : { salePrice: null, reason: "TCMB kuru için fiyat önizlemesi oluşturun." };
      rows.push({
        printing, finish, cardId: (listing?.card_id || found[0]?.card_id || null) as string | null,
        slug: (listing?.slug || found[0]?.slug || null) as string | null,
        listingId: listing?.listing_id as string || null, stock: Number(listing?.stock || 0),
        updatedAt: listing?.updated_at ? new Date(listing.updated_at as string).toISOString() : null,
        oldPrice: listing?.price as string || null,
        ...calculated,
        ...(matches.length > 1 ? { salePrice: null, reason: "Birden fazla ilan var. İşlem durduruldu." } : {}),
      });
    }
  }
  const search = parsed.search.toLocaleLowerCase("tr-TR");
  rows = rows.filter(r => (!search || `${r.printing.name} ${r.printing.collector} ${r.printing.riftboundId}`.toLocaleLowerCase("tr-TR").includes(search))
    && (!parsed.set || r.printing.set === parsed.set) && (!parsed.finish || r.finish === parsed.finish)
    && (parsed.stock === "all" || (parsed.stock === "stocked" ? r.stock > 0 : r.stock === 0))
    && (parsed.priced === "all" || (parsed.priced === "yes" ? !!r.salePrice : !r.salePrice)));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / parsed.limit));
  const page = Math.min(parsed.page, pages);
  return {
    ...state, rows: rows.slice((page - 1) * parsed.limit, page * parsed.limit), total, page, pages,
    sets: snapshot?.sets.map(s => ({ code: s.code, name: s.name })) ?? [], preview,
  };
}

export async function registerRifthuntRoutes(app: Express, requireAdmin: RequestHandler) {
  await initRifthuntStore();
  const root = "/api/admin/rifthunt";
  app.get(`${root}/status`, requireAdmin, async (req, res) => {
    try { res.json(await status(owner(req))); } catch (e) { res.status(500).json({ error: errorMessage(e) }); }
  });
  app.get(`${root}/catalog`, requireAdmin, async (req, res) => {
    try { res.json(await riftCatalog(owner(req), req.query)); } catch (e) { res.status(400).json({ error: errorMessage(e) }); }
  });
  app.post(`${root}/preview`, requireAdmin, async (req, res) => {
    const input = options.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Geçerli çarpan ve günlük güncelleme tercihi gerekli." });
    try { res.status(202).json({ id: await createRiftPreview(owner(req), input.data.multiplier, input.data.autoDaily) }); }
    catch (e: any) { res.status(e.code === "23505" ? 409 : 503).json({ error: e.code === "23505" ? "Bir RiftHunt önizlemesi zaten hazırlanıyor." : errorMessage(e) }); }
  });
  app.get(`${root}/runs/:id`, requireAdmin, async (req, res) => {
    if (!uuid.safeParse(req.params.id).success) return res.sendStatus(400);
    try {
      const run = await getRiftRun(req.params.id, owner(req));
      if (!run) return res.status(404).json({ error: "Önizleme bulunamadı." });
      res.json(run);
    } catch (e) { res.status(500).json({ error: errorMessage(e) }); }
  });
  app.post(`${root}/runs/:id/apply`, requireAdmin, async (req, res) => {
    if (!uuid.safeParse(req.params.id).success) return res.sendStatus(400);
    try { res.json(await applyRiftPreview(req.params.id, owner(req))); }
    catch (e: any) {
      if (e.code || e.cause) console.error("[rifthunt] Apply database error", e.cause?.code ?? e.code, e.cause?.message ?? e.message);
      res.status(409).json({ error: errorMessage(e) });
    }
  });
  app.post(`${root}/stock`, requireAdmin, async (req, res) => {
    const input = z.object({
      printingId: uuid, finish: z.enum(["normal", "foil"]), stock: z.number().int().min(0).max(1_000_000),
      expectedStock: z.number().int().min(0), expectedUpdatedAt: z.string().datetime().nullable(),
    }).strict().safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Stok ve güncellik bilgisi geçersiz." });
    try { res.json(await riftStock(input.data)); }
    catch (e) { res.status(409).json({ error: errorMessage(e) }); }
  });
  app.post(`${root}/backup`, requireAdmin, async (req, res) => {
    try { res.json(await createRiftBackup(owner(req))); }
    catch (e) { res.status(409).json({ error: errorMessage(e) }); }
  });
  app.get(`${root}/backups/:id/download`, requireAdmin, async (req, res) => {
    if (!uuid.safeParse(req.params.id).success) return res.sendStatus(400);
    try {
      const backup = await getRiftBackup(req.params.id, owner(req));
      if (!backup) return res.sendStatus(404);
      res.setHeader("Cache-Control", "no-store");
      res.download(backup.filePath, `riftbound-yedek-${backup.id}.tar.gz`, async error => {
        if (error) { if (!res.headersSent) res.status(500).end(); return; }
        try { await db.execute(sql`UPDATE rifthunt_backups SET downloaded_at=NOW() WHERE id=${backup.id}`); }
        catch { console.error("[rifthunt] Backup download acknowledgment failed"); }
      });
    } catch (e) { res.status(500).json({ error: errorMessage(e) }); }
  });
  app.post(`${root}/reset`, requireAdmin, async (req, res) => {
    const input = z.object({ confirmation: z.literal("RIFTBOUND SİL") }).strict().safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Silmek için RIFTBOUND SİL yazılmalı." });
    try { res.json(await resetRiftbound()); }
    catch (e) { res.status(409).json({ error: errorMessage(e) }); }
  });
  await registerRiftPublicRoutes(app);

  // Legacy import/deletion cannot bypass the scoped, explicitly confirmed cleanup.
  app.post("/api/admin/tcg/sync", requireAdmin, (req, res, next) => {
    if (req.body?.game !== "riftbound") return next();
    res.status(410).json({ error: "Riftbound için RiftHunt panelini kullanın." });
  });
  app.delete("/api/admin/tcg/data", requireAdmin, (req, res, next) => {
    if (req.query.game === "pokemon") return next();
    res.status(409).json({ error: "Riftbound silme işlemi yalnızca RiftHunt temiz kurulum ekranından yapılabilir." });
  });
  // Existing general inventory forms must not override automatic RiftHunt prices.
  app.use("/api/admin/cards/:cardId", requireAdmin, async (req, res, next) => {
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();
    try {
      const cardId = req.params.cardId;
      const record = await db.execute(sql`SELECT api_source FROM cards WHERE id=${cardId}`);
      if (record.rows[0]?.api_source === "rifthunt") return res.status(409).json({ error: "RiftHunt kartlarında stok ve fiyat yönetimi için RiftHunt panelini kullanın." });
      next();
    } catch (e) { res.status(500).json({ error: errorMessage(e) }); }
  });
  app.delete("/api/admin/card-sets/:setId", requireAdmin, async (req, res, next) => {
    try {
      const record = await db.execute(sql`SELECT api_source FROM card_sets WHERE id=${req.params.setId}`);
      if (record.rows[0]?.api_source === "rifthunt") return res.status(409).json({ error: "RiftHunt setleri toplu aktarım tarafından yönetiliyor. Stokları RiftHunt panelinden düzenleyin." });
      next();
    } catch (e) { res.status(500).json({ error: errorMessage(e) }); }
  });
}

async function publicPrinting(cardId: string): Promise<RiftPrinting | null> {
  const result = await db.execute(sql`SELECT p.data FROM rifthunt_printings p JOIN cards c ON c.id=p.card_id
    JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id
    WHERE p.card_id=${cardId} AND c.is_active=true AND g.slug='riftbound'`);
  return result.rows[0]?.data as RiftPrinting ?? null;
}
async function registerRiftPublicRoutes(app: Express) {
  app.get("/api/rifthunt/cards/:cardId", async (req, res) => {
    try {
      const printing = await publicPrinting(req.params.cardId);
      if (!printing) return res.sendStatus(404);
      const snapshot = await riftState<RiftSnapshot | null>("snapshot", null);
      const source = snapshot?.rulings;
      const ruling = source?.cards?.find((x: any) => x.card === printing.baseName || x.title === printing.baseName);
      const taggings = snapshot?.tags?.taggings ?? [];
      const tags = snapshot?.tags?.tags ?? [];
      const tagIds = taggings.filter((x: any) => x.printing_id === printing.printingId || x.oracle_id === printing.oracleId).map((x: any) => x.tag_id);
      const body: RiftDetails = {
        printing, warnings: snapshot?.warnings ?? [],
        rulings: (ruling?.rulings ?? []).map((x: any) => ({
          question: String(x.question ?? ""), answer: sanitizeHtml(String(x.comment ?? x.html ?? ""), { allowedTags: [], allowedAttributes: {} }),
        })),
        rulingSource: {
          name: "Riftbound FAQ", url: "https://www.riftboundfaq.com",
          license: source?.license || "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
          commit: source?.commit ?? null,
        },
        communityTags: tags.filter((x: any) => tagIds.includes(x.id)).map((x: any) => ({ name: String(x.name), kind: String(x.kind), slug: String(x.slug) })),
      };
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(body);
    } catch (e) { res.status(503).json({ error: "RiftHunt kart bilgileri alınamadı." }); }
  });
  const historyInFlight = new Map<string, Promise<RiftHistory>>();
  app.get("/api/rifthunt/cards/:cardId/history", async (req, res) => {
    const range = z.enum(["1m", "3m", "6m", "1y", "all"]).safeParse(req.query.range || "3m");
    if (!range.success) return res.status(400).json({ error: "Geçersiz tarih aralığı." });
    try {
      const printing = await publicPrinting(req.params.cardId);
      if (!printing) return res.sendStatus(404);
      const key = `history:${printing.printingId}:${range.data}`;
      const cached = await riftState<{ until: number; data: RiftHistory } | null>(key, null);
      if (cached && cached.until > Date.now()) return res.json(cached.data);
      if (!historyInFlight.has(key)) {
        const pending = (async () => {
          const url = new URL(printing.sourceUrl);
          const slug = url.pathname.split("/").filter(Boolean).at(-1)!;
          const data = await fetchRifthuntJson(`/prices/${encodeURIComponent(printing.riftboundId)}/history?range=${range.data}&collector=${encodeURIComponent(printing.collector)}&slug=${encodeURIComponent(slug)}`);
          if (data.printing_id !== printing.printingId || !Array.isArray(data.dates) || !data.series) throw new Error("Fiyat geçmişi başka baskıya ait.");
          for (const series of Object.values(data.series) as any[]) {
            for (const finish of ["normal", "foil"]) if (!printing.finishes.includes(finish as any)) delete series[finish];
          }
          await putRiftState(key, { until: Date.now() + 3600_000, data });
          return data as RiftHistory;
        })().finally(() => { historyInFlight.delete(key); });
        historyInFlight.set(key, pending);
      }
      res.json(await historyInFlight.get(key));
    } catch { res.status(503).json({ error: "Fiyat geçmişi alınamadı. Daha sonra tekrar deneyin." }); }
  });
}
export function startRifthuntScheduler() {
  if (process.env.NODE_ENV === "test") return;
  cron.schedule("20 4 * * *", () => { void runRiftDaily(); }, { timezone: "Europe/Istanbul" });
  // Catch up after a server outage. Disabled configurations never start importing.
  void getRiftConfig().then(config => {
    if (config.enabled && config.autoDaily && (!config.lastAppliedAt || Date.now() - Date.parse(config.lastAppliedAt) >= 24 * 3600_000)) {
      void runRiftDaily();
    }
  }).catch(() => console.error("[rifthunt] Could not check missed daily update"));
  console.log("[rifthunt] Daily pricing scheduled at 04:20 Europe/Istanbul");
}
