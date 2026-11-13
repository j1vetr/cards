import { sql } from "drizzle-orm";
import { db } from "../db";
import type { RiftPrinting } from "@shared/rifthunt";
import { priceFor } from "./rifthuntData";
import { getRiftConfig, riftState } from "./rifthuntStore";

export async function isRiftListingSellable(listing: { cardId: string; condition: string; finish: string }) {
  const result = await db.execute(sql`SELECT p.data,c.is_active AS active,s.is_active AS set_active,g.is_active AS game_active
    FROM rifthunt_printings p JOIN cards c ON c.id=p.card_id JOIN card_sets s ON s.id=c.set_id
    JOIN card_games g ON g.id=s.game_id WHERE p.card_id=${listing.cardId} AND g.slug='riftbound'`);
  const row = result.rows[0];
  if (!row || !row.active || !row.set_active || !row.game_active || listing.condition !== "NM") return false;
  const config = await getRiftConfig();
  const rate = await riftState<{ usdTry: number; date: string } | null>("rate", null);
  const age = rate ? Date.now() - Date.parse(rate.date + "T00:00:00Z") : Infinity;
  if (!config.enabled || !rate || !Number.isFinite(age) || age > 10 * 86400_000 || age < -86400_000) return false;
  return !!priceFor(row.data as RiftPrinting, listing.finish as any, rate.usdTry, config.multiplier).salePrice;
}
