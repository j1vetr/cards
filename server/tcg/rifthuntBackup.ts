import { randomUUID, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { cache } from "../cache";
import { defaultRiftConfig, getRiftConfig, putRiftState, riftCounts } from "./rifthuntStore";

const execFileAsync = promisify(execFile);
const BACKUPS = path.resolve("generated-artifacts/rifthunt-backups");
const ROOTS = ["client/public", "dist/public", "public"];
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
async function inventorySnapshot(executor: any = db) {
  const sets = await executor.execute(sql`SELECT s.* FROM card_sets s JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound' ORDER BY s.id`);
  const cards = await executor.execute(sql`SELECT c.* FROM cards c JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound' ORDER BY c.id`);
  const listings = await executor.execute(sql`SELECT l.* FROM card_listings l JOIN cards c ON c.id=l.card_id JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound' ORDER BY l.id`);
  const prices = await executor.execute(sql`SELECT p.* FROM card_prices p JOIN cards c ON c.id=p.card_id JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound' ORDER BY p.id`);
  const sync = await executor.execute(sql`SELECT * FROM tcg_sync_runs WHERE game='riftbound' ORDER BY id`);
  return { sets: sets.rows, cards: cards.rows, listings: listings.rows, prices: prices.rows, sync: sync.rows };
}
async function managedImages() {
  const files: { relative: string; sha256: string }[] = [];
  async function visit(relative: string) {
    let stat;
    try { stat = await fs.lstat(relative); } catch (e: any) { if (e.code === "ENOENT") return; throw e; }
    // Never follow a symlink, including directory symlinks, outside the managed roots.
    if (stat.isSymbolicLink()) throw new Error("Riftbound görsel yolunda sembolik bağlantı var. Güvenli temizlik için kaldırılmalı.");
    if (stat.isDirectory()) {
      for (const name of (await fs.readdir(relative)).sort()) await visit(path.join(relative, name));
    } else if (stat.isFile()) files.push({ relative, sha256: hash(await fs.readFile(relative)) });
  }
  for (const root of ROOTS) {
    await visit(path.join(root, "cards/riftbound"));
    const setDir = path.join(root, "cards/sets");
    let names: string[] = [];
    try { names = await fs.readdir(setDir); } catch (e: any) { if (e.code !== "ENOENT") throw e; }
    for (const name of names.sort()) if (name.startsWith("riftbound-")) await visit(path.join(setDir, name));
  }
  return files.sort((a, b) => a.relative.localeCompare(b.relative));
}
export async function createRiftBackup(owner: string) {
  if ((await getRiftConfig()).enabled) throw new Error("Temiz kurulum tamamlandı. Mevcut katalog yeniden silinemez.");
  const id = randomUUID();
  const snapshot = await inventorySnapshot();
  const images = await managedImages();
  const fingerprint = hash(JSON.stringify({ snapshot, images }));
  const counts = { ...await riftCounts(), images: images.length };
  const createdAt = new Date().toISOString();
  const dir = path.join(BACKUPS, id);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await fs.writeFile(path.join(dir, "data.json"), JSON.stringify({
      version: 1, scope: "riftbound-only", createdAt, fingerprint, counts, snapshot, images,
      restoreNotice: "Restore only after reviewing foreign keys and current orders. This is a Riftbound catalog and stock backup, not a full database backup.",
    }, null, 2), { mode: 0o600 });
    for (const file of images) {
      const target = path.join(dir, "images", file.relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(file.relative, target);
    }
    const filename = `${id}.tar.gz`;
    await execFileAsync("tar", ["-czf", path.join(BACKUPS, filename), "-C", dir, "."], { timeout: 180_000 });
    await fs.chmod(path.join(BACKUPS, filename), 0o600);
    await db.execute(sql`INSERT INTO rifthunt_backups(id,owner_id,filename,fingerprint,counts)
      VALUES(${id},${owner},${filename},${fingerprint},${JSON.stringify(counts)}::jsonb)`);
    return { id, createdAt, counts, downloadUrl: `/api/admin/rifthunt/backups/${id}/download` };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
export async function getRiftBackup(id: string, owner: string) {
  const result = await db.execute(sql`SELECT * FROM rifthunt_backups WHERE id=${id}::uuid AND owner_id=${owner}`);
  const backup = result.rows[0] as any;
  if (!backup || !/^[a-f0-9-]+\.tar\.gz$/.test(backup.filename)) return null;
  return { ...backup, filePath: path.join(BACKUPS, backup.filename) };
}
export async function resetRiftbound(backupId: string, owner: string) {
  const backup = await getRiftBackup(backupId, owner);
  if (!backup?.downloaded_at || backup.used_at) throw new Error("Önce yeni bir yedek oluşturup tamamen indirin.");
  await fs.access(backup.filePath);
  const images = await managedImages();
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(71842102)`);
    if ((await getRiftConfig(tx)).enabled) throw new Error("Temiz kurulum zaten tamamlandı.");
    // Lock existing catalog and stock before checking backup freshness.
    await tx.execute(sql`SELECT s.id FROM card_sets s JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound' FOR UPDATE OF s`);
    await tx.execute(sql`SELECT c.id FROM cards c JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound' FOR UPDATE OF c`);
    await tx.execute(sql`SELECT l.id FROM card_listings l JOIN cards c ON c.id=l.card_id JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound' FOR UPDATE OF l`);
    const snapshot = await inventorySnapshot(tx);
    if (hash(JSON.stringify({ snapshot, images })) !== backup.fingerprint) throw new Error("Yedekten sonra stok veya katalog değişti. Hiçbir kayıt silinmedi. Yeni yedek alıp indirin.");
    // order_items.card_listing_id is SET NULL by its FK. Names, totals and orders remain.
    await tx.execute(sql`DELETE FROM card_listings WHERE card_id IN
      (SELECT c.id FROM cards c JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound')`);
    await tx.execute(sql`DELETE FROM card_prices WHERE card_id IN
      (SELECT c.id FROM cards c JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound')`);
    await tx.execute(sql`DELETE FROM cards WHERE set_id IN
      (SELECT s.id FROM card_sets s JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound')`);
    await tx.execute(sql`DELETE FROM card_sets WHERE game_id IN (SELECT id FROM card_games WHERE slug='riftbound')`);
    await tx.execute(sql`DELETE FROM tcg_sync_runs WHERE game='riftbound'`);
    await tx.execute(sql`DELETE FROM rifthunt_printings`);
    await tx.execute(sql`DELETE FROM rifthunt_runs`);
    await putRiftState("config", { ...defaultRiftConfig, resetAt: new Date().toISOString() }, tx);
    await tx.execute(sql`UPDATE rifthunt_backups SET used_at=NOW() WHERE id=${backupId}`);
  });
  const warnings: string[] = [];
  // Never touch shared images. Files are removed only after a successful DB commit.
  for (const file of images) {
    const publicUrl = "/" + file.relative.split("/public/")[1];
    const used = await db.execute(sql`SELECT EXISTS(
      SELECT 1 FROM cards WHERE image_url=${publicUrl} OR image_url_hi_res=${publicUrl}
      UNION ALL SELECT 1 FROM card_sets WHERE logo_url=${publicUrl} OR symbol_url=${publicUrl}
      UNION ALL SELECT 1 FROM products WHERE images::text LIKE ${"%" + publicUrl + "%"}
    ) AS used`);
    if (used.rows[0]?.used) { warnings.push(`Paylaşılan görsel korundu: ${publicUrl}`); continue; }
    try { await fs.unlink(file.relative); } catch { warnings.push(`Görsel silinemedi: ${publicUrl}`); }
  }
  cache.clear();
  return { success: true, warnings };
}
