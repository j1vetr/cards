export type SalePriceGame = "all" | "pokemon" | "riftbound";

export interface SalePriceRow {
  listingId: string;
  cardId: string;
  name: string;
  setName: string;
  condition: string;
  finish: string;
  oldPrice: string;
  newPrice: string | null;
  marketUsd: string | null;
  sourceName?: string;
  sourceSet?: string;
  sourceUrl?: string;
  reason?: string;
  listingUpdatedAt: string;
}

export interface SalePriceRun {
  id: string;
  status: "running" | "ready" | "applied" | "failed";
  multiplier: number;
  game?: SalePriceGame;
  rate: { usdTry: number; date: string; source: string };
  rows: SalePriceRow[];
  total: number;
  processed: number;
  createdAt: string;
  expiresAt: string;
  error?: string;
  updated?: number;
}
