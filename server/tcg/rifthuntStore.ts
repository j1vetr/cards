import { sql } from "drizzle-orm";
import { db } from "../db";
import { fetchRifthuntJson, normalizeRifthunt, type RiftSnapshot } from "./rifthuntData";
import type { RiftConfig, RiftRun } from "@shared/rifthunt";

export const defaultRiftConfig: RiftConfig = { enabled: false, multiplier: 1.9, autoDaily: true };
export async function initRifthuntStore() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rifthunt_state (key TEXT PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS rifthunt_printings (
      printing_id UUID PRIMARY KEY, card_id VARCHAR UNIQUE REFERENCES cards(id) ON DELETE SET NULL,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rifthunt_runs (
      id UUID PRIMARY KEY, owner_id VARCHAR NOT NULL, status TEXT NOT NULL,
      data JSONB NOT NULL, payload JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS rifthunt_one_running ON rifthunt_runs(status) WHERE status='running';
    CREATE TABLE IF NOT EXISTS rifthunt_backups (
      id UUID PRIMARY KEY, owner_id VARCHAR NOT NULL, filename TEXT NOT NULL,
      fingerprint TEXT NOT NULL, counts JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      downloaded_at TIMESTAMPTZ, used_at TIMESTAMPTZ
    );
  `);
  await db.execute(sql`UPDATE rifthunt_runs SET status='failed',
    data=data || '{"status":"failed","error":"Sunucu yeniden başladı. Önizlemeyi yeniden oluşturun."}'::jsonb
    WHERE status='running'`);
}
export async function riftState<T>(key: string, fallback: T, executor: any = db): Promise<T> {
  const result = await executor.execute(sql`SELECT data FROM rifthunt_state WHERE key=${key}`);
  return result.rows[0]?.data as T ?? fallback;
}
export async function putRiftState(key: string, data: unknown, executor: any = db) {
  await executor.execute(sql`INSERT INTO rifthunt_state(key,data) VALUES(${key},${JSON.stringify(data)}::jsonb)
    ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data`);
}
export const getRiftConfig = (executor: any = db) => riftState("config", defaultRiftConfig, executor);
let loading: Promise<RiftSnapshot> | null = null;
export async function loadRiftSnapshot(scheduled = false): Promise<RiftSnapshot> {
  if (loading) return loading;
  loading = db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(71842101)`);
    const cached = await riftState<RiftSnapshot | null>("snapshot", null, tx);
    const day = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(date);
    const age = cached ? Date.now() - Date.parse(cached.fetchedAt) : Infinity;
    // A daily run must not reuse yesterday's export just because the previous
    // request finished milliseconds after 04:20. Manual previews retain the cache.
    if (cached?.version === 2 && age >= 0 && age < 24 * 3600_000 && (!scheduled || day(new Date(cached.fetchedAt)) === day(new Date()))) return cached;
    // One fetch per bulk endpoint per day, reused by previews and scheduled runs.
    const catalog = await fetchRifthuntJson("/bulk/cards");
    const prices = await fetchRifthuntJson("/bulk/prices");
    const snapshot = normalizeRifthunt(catalog, prices);
    for (const [field, path] of [["tags", "/bulk/tags"], ["rulings", "/bulk/rulings"]] as const) {
      try {
        const value = await fetchRifthuntJson(path);
        if (field === "tags" && (!Array.isArray(value.tags) || !Array.isArray(value.taggings))) throw new Error("shape");
        if (field === "rulings" && !Array.isArray(value.cards)) throw new Error("shape");
        snapshot[field] = value;
      } catch {
        snapshot.warnings.push(field === "tags" ? "Topluluk etiketleri alınamadı." : "Kural açıklamaları alınamadı.");
      }
    }
    await putRiftState("snapshot", snapshot, tx);
    return snapshot;
  }).finally(() => { loading = null; });
  return loading;
}
export async function riftCounts(executor: any = db) {
  const result = await executor.execute(sql`SELECT
    (SELECT COUNT(*)::int FROM cards c JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound') AS cards,
    (SELECT COUNT(*)::int FROM card_sets s JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound') AS sets,
    COUNT(l.id)::int AS listings, COALESCE(SUM(l.stock),0)::int AS stock
    FROM card_listings l JOIN cards c ON c.id=l.card_id JOIN card_sets s ON s.id=c.set_id JOIN card_games g ON g.id=s.game_id WHERE g.slug='riftbound'`);
  return result.rows[0] as { cards: number; sets: number; listings: number; stock: number };
}
export async function getRiftRun(id: string, owner?: string) {
  const result = await db.execute(sql`SELECT data FROM rifthunt_runs WHERE id=${id}::uuid ${owner ? sql`AND owner_id=${owner}` : sql``}`);
  return (result.rows[0]?.data as RiftRun) ?? null;
}
