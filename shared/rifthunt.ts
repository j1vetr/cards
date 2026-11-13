export type RiftFinish = "normal" | "foil";
export interface RiftPrice {
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  directLow?: number | null;
}
export interface RiftPrinting {
  printingId: string;
  oracleId: string;
  riftboundId: string;
  collector: string;
  name: string;
  baseName: string;
  set: string;
  setName: string;
  rarity: string;
  type: string;
  domains: string[];
  energy: number | null;
  power: number | null;
  might: number | null;
  text: string | null;
  rich?: string | null;
  flavour: string | null;
  artist: string | null;
  image: string | null;
  alternate: boolean;
  signature: boolean;
  overnumbered: boolean;
  finishes: RiftFinish[];
  tags: string[];
  sourceUrl: string;
  tcgplayerUrl: string | null;
  cardmarketUrl: string | null;
  updatedAt: string | null;
  prices: Partial<Record<RiftFinish, RiftPrice>>;
  cardmarketUpdatedAt: string | null;
  cardmarket: Partial<Record<RiftFinish, { trend: number | null; low: number | null }>>;
}
export interface RiftConfig {
  enabled: boolean;
  multiplier: number;
  autoDaily: boolean;
  resetAt?: string;
  lastAppliedAt?: string;
  lastError?: string | null;
}
export interface RiftAdminRow {
  printing: RiftPrinting;
  cardId: string | null;
  slug: string | null;
  finish: RiftFinish | null;
  listingId: string | null;
  stock: number;
  updatedAt: string | null;
  oldPrice: string | null;
  salePrice: string | null;
  reason: string | null;
}
export interface RiftRun {
  id: string;
  status: "running" | "ready" | "applied" | "failed";
  multiplier: number;
  autoDaily: boolean;
  rate: { usdTry: number; date: string; source: string } | null;
  createdAt: string;
  expiresAt: string;
  total: number;
  priced: number;
  error?: string;
  appliedAt?: string;
}
export interface RiftStatus {
  config: RiftConfig;
  counts: { cards: number; sets: number; listings: number; stock: number };
  latestRun: RiftRun | null;
  snapshotAt: string | null;
  sourceFetchedAt: string | null;
  warnings: string[];
}
export interface RiftCatalog extends RiftStatus {
  rows: RiftAdminRow[];
  total: number;
  page: number;
  pages: number;
  sets: { code: string; name: string }[];
  preview: RiftRun | null;
}
export interface RiftHistory {
  dates: string[];
  from: string;
  to: string;
  bucket: string;
  series: Record<string, {
    currency: string;
    field: string;
    normal?: (number | null)[];
    foil?: (number | null)[];
  }>;
}
export interface RiftDetails {
  printing: RiftPrinting;
  rulings: { question: string; answer: string }[];
  rulingSource: { name: string; url: string; license: string; licenseUrl: string; commit: string | null };
  communityTags: { kind: string; name: string; slug: string }[];
  warnings: string[];
}
