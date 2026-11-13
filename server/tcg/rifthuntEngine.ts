import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { cache } from "../cache";
import type { RiftRun } from "@shared/rifthunt";
import { priceFor, type RiftSnapshot } from "./rifthuntData";
import { getTcmbUsdRate } from "./tcmbService";
import { getRiftConfig, loadRiftSnapshot, putRiftState } from "./rifthuntStore";

export interface RiftPayload {
  snapshot: RiftSnapshot;
  baselineAppliedAt: string | null;
}
export async function createRiftPreview(owner: string, multiplier: number, autoDaily: boolean, scheduled = false) {
  const config = await getRiftConfig();
  const run: RiftRun = {
    id: randomUUID(), status: "running", multiplier, autoDaily, rate: null,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    total: 0, priced: 0,
  };
  await db.execute(sql`INSERT INTO rifthunt_runs(id,owner_id,status,data)
    VALUES(${run.id},${owner},'running',${JSON.stringify(run)}::jsonb)`);
  const work = async () => {
    try {
      const snapshot = await loadRiftSnapshot(scheduled);
      run.rate = await getTcmbUsdRate();
      run.total = snapshot.printings.length;
      run.priced = snapshot.printings.filter(p => p.finishes.some(f => priceFor(p, f, run.rate!.usdTry, multiplier).salePrice)).length;
      run.status = "ready";
      run.expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
      const payload: RiftPayload = { snapshot, baselineAppliedAt: config.lastAppliedAt ?? null };
      await db.execute(sql`UPDATE rifthunt_runs SET status='ready',data=${JSON.stringify(run)}::jsonb,
        payload=${JSON.stringify(payload)}::jsonb WHERE id=${run.id}`);
    } catch (e) {
      run.status = "failed";
      run.error = e instanceof Error && !("code" in e) ? e.message.slice(0, 240) : "RiftHunt önizlemesi hazırlanamadı. Fiyatlar ve stoklar değişmedi.";
      await db.execute(sql`UPDATE rifthunt_runs SET status='failed',data=${JSON.stringify(run)}::jsonb WHERE id=${run.id}`);
    }
  };
  void work().catch(() => console.error("[rifthunt] Preview persistence failed"));
  return run.id;
}

/** No stock writes. Existing stock changes only through the stock endpoint or orders. */
export async function applyRiftPreview(id: string, owner: string) {
  const result = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(71842102)`);
    const query = await tx.execute(sql`SELECT data,payload FROM rifthunt_runs WHERE id=${id}::uuid AND owner_id=${owner} FOR UPDATE`);
    const run = query.rows[0]?.data as RiftRun;
    const payload = query.rows[0]?.payload as RiftPayload;
    if (!run) throw new Error("Önizleme bulunamadı.");
    if (run.status === "applied") return { success: true, updated: run.priced, importedCards: run.importedCards, importedSets: run.importedSets };
    if (run.status !== "ready" || Date.parse(run.expiresAt) <= Date.now() || !run.rate || !payload) throw new Error("Önizleme hazır değil veya süresi doldu.");
    const config = await getRiftConfig(tx);
    if (!config.resetAt) throw new Error("Önce eski Riftbound kataloğunu temizleyin.");
    if ((config.lastAppliedAt ?? null) !== payload.baselineAppliedAt) throw new Error("Ayarlar başka bir işlemde değişti. Yeni önizleme oluşturun.");
    const freshRate = await getTcmbUsdRate();
    if (freshRate.date !== run.rate.date || freshRate.usdTry !== run.rate.usdTry) throw new Error("TCMB kuru değişti. Yeni önizleme oluşturun.");
    const { snapshot } = payload;
    const game = await tx.execute(sql`SELECT id FROM card_games WHERE slug='riftbound' FOR UPDATE`);
    if (!game.rows[0]) throw new Error("Riftbound oyun kaydı bulunamadı.");
    const gameId = game.rows[0].id as string;
    const legacy = await tx.execute(sql`SELECT c.id FROM cards c JOIN card_sets s ON s.id=c.set_id
      WHERE s.game_id=${gameId} AND COALESCE(c.api_source,'')<>'rifthunt' LIMIT 1`);
    if (legacy.rows.length) throw new Error("Eski Riftbound kartları hâlâ var. Temiz kurulumu tamamlayın.");

    const setRows = snapshot.sets.map(s => ({ id: randomUUID(), code: s.code, name: s.name, slug: `riftbound-${s.code}`, released: s.released, count: s.count }));
    await tx.execute(sql`INSERT INTO card_sets(id,game_id,name,slug,release_date,total_cards,api_id,api_source,is_active)
      SELECT x.id,${gameId},x.name,x.slug,x.released,x.count,x.code,'rifthunt',true
      FROM jsonb_to_recordset(${JSON.stringify(setRows)}::jsonb) AS x(id TEXT,code TEXT,name TEXT,slug TEXT,released TEXT,count INT)
      ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,release_date=EXCLUDED.release_date,total_cards=EXCLUDED.total_cards,
        api_source='rifthunt',api_id=EXCLUDED.api_id,updated_at=NOW()
      WHERE card_sets.game_id=${gameId}`);
    const known = await tx.execute(sql`SELECT printing_id,card_id FROM rifthunt_printings`);
    const knownIds = new Map(known.rows.map(r => [String(r.printing_id), r.card_id as string]));
    const entries = snapshot.printings.map(p => ({
      ...p, cardId: knownIds.get(p.printingId) || randomUUID(),
      slug: `riftbound-${p.set}-${p.collector.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${p.printingId.slice(0, 8)}`,
    }));
    await tx.execute(sql`INSERT INTO cards(id,set_id,name,slug,card_number,rarity,card_types,artist,image_url,image_url_hi_res,description,api_id,api_source,is_active)
      SELECT x."cardId",s.id,x.name,x.slug,x.collector,x.rarity,
        jsonb_build_array(x.type) || x.domains,x.artist,x.image,x.image,x.text,x."printingId",'rifthunt',true
      FROM jsonb_to_recordset(${JSON.stringify(entries)}::jsonb)
        AS x("cardId" TEXT,"printingId" TEXT,name TEXT,slug TEXT,collector TEXT,rarity TEXT,type TEXT,domains JSONB,artist TEXT,image TEXT,text TEXT,set TEXT)
      JOIN card_sets s ON s.game_id=${gameId} AND s.api_id=x.set AND s.api_source='rifthunt'
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,card_number=EXCLUDED.card_number,rarity=EXCLUDED.rarity,
        card_types=EXCLUDED.card_types,artist=EXCLUDED.artist,image_url=EXCLUDED.image_url,image_url_hi_res=EXCLUDED.image_url_hi_res,
        description=EXCLUDED.description,updated_at=NOW()
      WHERE cards.api_source='rifthunt' AND cards.is_manually_edited=false`);
    await tx.execute(sql`INSERT INTO rifthunt_printings(printing_id,card_id,data)
      SELECT (x->>'printingId')::uuid,x->>'cardId',x-'cardId'-'slug'
      FROM jsonb_array_elements(${JSON.stringify(entries)}::jsonb) x
      ON CONFLICT(printing_id) DO UPDATE SET card_id=EXCLUDED.card_id,data=EXCLUDED.data`);
    // Reading a source snapshot is not an import. Verify local catalog records
    // inside the same transaction before reporting success or changing prices.
    const verified = await tx.execute(sql`SELECT
      (SELECT COUNT(*)::int FROM rifthunt_printings p
        JOIN cards c ON c.id=p.card_id JOIN card_sets s ON s.id=c.set_id
        JOIN jsonb_array_elements_text(${JSON.stringify(entries.map(p => p.printingId))}::jsonb) wanted ON wanted.value=p.printing_id::text
        WHERE s.game_id=${gameId} AND c.api_source='rifthunt') AS cards,
      (SELECT COUNT(*)::int FROM card_sets s
        JOIN jsonb_array_elements_text(${JSON.stringify(snapshot.sets.map(s => s.code))}::jsonb) wanted ON wanted.value=s.api_id
        WHERE s.game_id=${gameId} AND s.api_source='rifthunt') AS sets`);
    const imported = verified.rows[0] as { cards: number; sets: number };
    if (imported.cards !== entries.length || imported.sets !== snapshot.sets.length) {
      throw new Error("Kartlar ve setler site kataloğuna tam aktarılamadı. İşlem geri alındı. Yeni önizleme oluşturup tekrar deneyin.");
    }
    // Missing printings are retired, not deleted. Their stock and order links survive.
    await tx.execute(sql`UPDATE card_listings SET is_active=false,updated_at=NOW()
      WHERE card_id IN (SELECT card_id FROM rifthunt_printings WHERE NOT EXISTS
        (SELECT 1 FROM jsonb_array_elements_text(${JSON.stringify(entries.map(p => p.printingId))}::jsonb) ids WHERE ids=printing_id::text))`);
    await tx.execute(sql`UPDATE rifthunt_printings SET data=jsonb_set(data,'{finishes}','[]'::jsonb)
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(${JSON.stringify(entries.map(p => p.printingId))}::jsonb) ids WHERE ids=printing_id::text)`);
    const saleRows = entries.flatMap(p => p.finishes.map(finish => ({
      cardId: p.cardId, finish, price: priceFor(p, finish, run.rate!.usdTry, run.multiplier).salePrice,
    })));
    if (saleRows.length) {
      await tx.execute(sql`INSERT INTO card_listings(card_id,condition,finish,price,stock,is_active)
        SELECT x."cardId",'NM',x.finish,x.price::numeric,0,false
        FROM jsonb_to_recordset(${JSON.stringify(saleRows)}::jsonb) AS x("cardId" TEXT,finish TEXT,price TEXT)
        WHERE x.price IS NOT NULL AND NOT EXISTS(SELECT 1 FROM card_listings l WHERE l.card_id=x."cardId" AND l.condition='NM' AND l.finish=x.finish)`);
      await tx.execute(sql`UPDATE card_listings l SET price=COALESCE(x.price::numeric,l.price),
          is_active=(x.price IS NOT NULL AND l.stock>0),updated_at=NOW()
        FROM jsonb_to_recordset(${JSON.stringify(saleRows)}::jsonb) AS x("cardId" TEXT,finish TEXT,price TEXT)
        WHERE l.card_id=x."cardId" AND l.finish=x.finish AND l.condition='NM'`);
    }
    const enabledAt = new Date().toISOString();
    await putRiftState("rate", run.rate, tx);
    await putRiftState("config", { ...config, enabled: true, multiplier: run.multiplier, autoDaily: run.autoDaily, lastAppliedAt: enabledAt, lastError: null }, tx);
    run.status = "applied";
    run.appliedAt = enabledAt;
    run.importedCards = imported.cards;
    run.importedSets = imported.sets;
    await tx.execute(sql`UPDATE rifthunt_runs SET status='applied',data=${JSON.stringify(run)}::jsonb,payload=NULL WHERE id=${id}`);
    return { success: true, updated: run.priced, importedCards: imported.cards, importedSets: imported.sets };
  });
  cache.clear();
  return result;
}

export async function riftStock(input: {
  printingId: string; finish: "normal" | "foil"; stock: number; expectedStock: number; expectedUpdatedAt: string | null;
}) {
  const rate = await getTcmbUsdRate();
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(71842102)`);
    const config = await getRiftConfig(tx);
    if (!config.enabled) throw new Error("Önce kataloğu ve fiyat önizlemesini uygulayın.");
    const result = await tx.execute(sql`SELECT p.card_id,p.data,c.is_active AS card_active,s.is_active AS set_active,g.is_active AS game_active
      FROM rifthunt_printings p JOIN cards c ON c.id=p.card_id JOIN card_sets s ON s.id=c.set_id
      JOIN card_games g ON g.id=s.game_id WHERE p.printing_id=${input.printingId}::uuid AND g.slug='riftbound' FOR UPDATE OF p,c`);
    const row = result.rows[0];
    if (!row) throw new Error("RiftHunt kartı bulunamadı.");
    const printing = row.data as RiftSnapshot["printings"][number];
    const price = priceFor(printing, input.finish, rate.usdTry, config.multiplier);
    if (!price.salePrice && input.stock > 0) throw new Error(price.reason!);
    if (input.stock > 0 && (!row.card_active || !row.set_active || !row.game_active)) throw new Error("Kart veya set satışa kapalı.");
    const current = await tx.execute(sql`SELECT id,stock,updated_at FROM card_listings WHERE card_id=${row.card_id}
      AND condition='NM' AND finish=${input.finish} FOR UPDATE`);
    if (current.rows.length > 1) throw new Error("Aynı baskı için birden fazla ilan var. İşlem durduruldu.");
    const listing = current.rows[0];
    const stamp = listing ? new Date(listing.updated_at as string).toISOString() : null;
    if (Number(listing?.stock || 0) !== input.expectedStock || stamp !== input.expectedUpdatedAt) throw new Error("Stok başka bir işlemde değişti. Listeyi yenileyip tekrar deneyin.");
    if (listing) {
      await tx.execute(sql`UPDATE card_listings SET stock=${input.stock},price=COALESCE(${price.salePrice}::numeric,price),
        is_active=${input.stock > 0 && !!price.salePrice},updated_at=NOW() WHERE id=${listing.id}`);
    } else if (input.stock > 0 && price.salePrice) {
      await tx.execute(sql`INSERT INTO card_listings(card_id,condition,finish,price,stock,is_active)
        VALUES(${row.card_id},'NM',${input.finish},${price.salePrice},${input.stock},true)`);
    }
  });
  cache.clear();
  return { success: true };
}

let dailyBusy = false;
export async function runRiftDaily() {
  if (dailyBusy) return;
  dailyBusy = true;
  try {
    const config = await getRiftConfig();
    if (!config.enabled || !config.autoDaily) return;
    const id = await createRiftPreview("rifthunt-scheduler", config.multiplier, true, true);
    // Wait for the same persisted preview pipeline rather than a second pricing implementation.
    for (let n = 0; n < 150; n++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await db.execute(sql`SELECT data FROM rifthunt_runs WHERE id=${id}`);
      const run = result.rows[0]?.data as RiftRun;
      if (run?.status === "ready") { await applyRiftPreview(id, "rifthunt-scheduler"); return; }
      if (run?.status === "failed") throw new Error(run.error);
    }
    throw new Error("Günlük güncelleme zaman aşımına uğradı.");
  } catch (e) {
    const config = await getRiftConfig();
    await putRiftState("config", { ...config, lastError: e instanceof Error ? e.message.slice(0, 240) : "Günlük fiyat güncellemesi başarısız." });
    console.error("[rifthunt] Daily update failed");
  } finally { dailyBusy = false; }
}
