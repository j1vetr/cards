/**
 * Riftbound adapter — RiftCodex API (api.riftcodex.com)
 * Endpoint reference: https://riftcodex.com/docs/
 *
 * Base URL : https://api.riftcodex.com
 * No API key required.
 *
 * Key endpoints verified (2026-06-29):
 *   GET /sets            — list all sets (paginated)
 *   GET /cards?set_id=X  — list cards for a set (paginated, limit/page params)
 */

import { httpFetchWithRetry } from "./httpUtils";

const BASE_URL = "https://api.riftcodex.com";
const PAGE_SIZE = 50;

// ── API response types ────────────────────────────────────────────────────────

interface RiftCodexSet {
  id: string;           // MongoDB ObjectID
  name: string;
  set_id: string;       // short code, e.g. "OGN", "UNL"
  card_count: number;
  published_on: string; // ISO date string
  tcgplayer_id?: string | null;
  cardmarket_id?: string | string[] | null;
}

interface RiftCodexCard {
  id: string;           // MongoDB ObjectID
  name: string;
  riftbound_id: string; // e.g. "unl-060a-219"
  tcgplayer_id?: string | null;
  collector_number: number;
  attributes?: {
    energy?: number;
    might?: number;
    power?: number;
  };
  classification?: {
    type?: string;
    supertype?: string | null;
    rarity?: string;
    domain?: string[];
  };
  text?: {
    plain?: string;
    rich?: string;
    flavour?: string;
  };
  set: {
    set_id: string;
    label: string;
  };
  media?: {
    image_url?: string;
    artist?: string;
    accessibility_text?: string;
  };
  tags?: string[];
  metadata?: {
    clean_name?: string;
    alternate_art?: boolean;
  };
}

interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function riftFetch<T>(path: string): Promise<PagedResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const data = await httpFetchWithRetry(url, {});
  if (!data || !Array.isArray(data.items)) {
    throw new Error(`RiftCodex API beklenmeyen yanıt: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data as PagedResponse<T>;
}

export async function fetchRiftboundSets(): Promise<RiftCodexSet[]> {
  const all: RiftCodexSet[] = [];
  let page = 1;

  while (true) {
    const data = await riftFetch<RiftCodexSet>(`/sets?limit=${PAGE_SIZE}&page=${page}`);
    all.push(...data.items);
    if (page >= data.pages || data.items.length === 0) break;
    page++;
  }
  return all;
}

export async function fetchRiftboundCardsBySet(setId: string): Promise<RiftCodexCard[]> {
  const all: RiftCodexCard[] = [];
  let page = 1;

  while (true) {
    const data = await riftFetch<RiftCodexCard>(
      `/cards?set_id=${encodeURIComponent(setId)}&limit=${PAGE_SIZE}&page=${page}`,
    );
    all.push(...data.items);
    if (page >= data.pages || data.items.length === 0) break;
    page++;
  }
  return all;
}

// ── DB mappers ────────────────────────────────────────────────────────────────

export function mapRiftboundSetToDb(
  set: RiftCodexSet,
  gameId: string,
): {
  gameId: string;
  name: string;
  slug: string;
  series: null;
  releaseDate: string | null;
  totalCards: number | null;
  logoUrl: null;
  symbolUrl: null;
  apiId: string;
  apiSource: string;
  isActive: boolean;
} {
  return {
    gameId,
    name: set.name,
    slug: `riftbound-${set.set_id.toLowerCase()}`,
    series: null,
    releaseDate: set.published_on ? set.published_on.split("T")[0] : null,
    totalCards: set.card_count ?? null,
    logoUrl: null,
    symbolUrl: null,
    // Use the short set_id as apiId so card queries can use it
    apiId: set.set_id,
    apiSource: "riftbound",
    isActive: true,
  };
}

export function mapRiftboundCardToDb(
  card: RiftCodexCard,
  setDbId: string,
): {
  setId: string;
  name: string;
  slug: string;
  cardNumber: string | null;
  rarity: string | null;
  cardTypes: string[];
  hp: null;
  artist: string | null;
  imageUrl: string | null;
  imageUrlHiRes: string | null;
  description: string | null;
  apiId: string;
  apiSource: string;
  isActive: boolean;
} {
  const domain = card.classification?.domain ?? [];
  const cardType = card.classification?.type ? [card.classification.type] : [];
  const allTypes = [...cardType, ...domain];

  return {
    setId: setDbId,
    name: card.name,
    // Use riftbound_id (e.g. "unl-060a-219") for a stable, unique slug
    slug: `riftbound-${card.riftbound_id}`,
    cardNumber: card.collector_number != null ? String(card.collector_number) : null,
    rarity: card.classification?.rarity ?? null,
    cardTypes: allTypes,
    hp: null,
    artist: card.media?.artist ?? null,
    imageUrl: card.media?.image_url ?? null,
    imageUrlHiRes: card.media?.image_url ?? null,
    description: card.text?.plain ?? null,
    // Use MongoDB _id as apiId (globally unique)
    apiId: card.id,
    apiSource: "riftbound",
    isActive: true,
  };
}
