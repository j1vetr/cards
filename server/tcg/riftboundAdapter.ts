/**
 * Riftbound (RiftCodex) API adapter — riftcodex.com
 * 
 * NOTE: Endpoint URLs are based on common REST API conventions for card databases.
 * Verify against https://riftcodex.com/docs/ when API access is confirmed.
 * The adapter is structured to be easily updated once endpoints are verified.
 */

const BASE_URL = "https://riftcodex.com/api";
const TIMEOUT_MS = 15_000;

export interface RiftboundSet {
  id: string;
  name: string;
  code?: string;
  releaseDate?: string;
  cardCount?: number;
  imageUrl?: string;
}

export interface RiftboundCard {
  id: string;
  name: string;
  setId?: string;
  setCode?: string;
  number?: string;
  rarity?: string;
  type?: string | string[];
  imageUrl?: string;
  imageUrlHiRes?: string;
  artist?: string;
  description?: string;
}

async function riftFetch(path: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`RiftCodex API ${res.status}: ${res.statusText}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRiftboundSets(): Promise<RiftboundSet[]> {
  try {
    const data = await riftFetch("/sets");
    if (!data) return [];
    if (Array.isArray(data)) return data as RiftboundSet[];
    if (Array.isArray(data.data)) return data.data as RiftboundSet[];
    if (Array.isArray(data.sets)) return data.sets as RiftboundSet[];
    return [];
  } catch (err) {
    console.warn("[riftbound] fetchSets failed:", (err as Error).message);
    return [];
  }
}

export async function fetchRiftboundCardsBySet(
  setId: string,
): Promise<RiftboundCard[]> {
  try {
    const data = await riftFetch(`/sets/${encodeURIComponent(setId)}/cards`);
    if (!data) return [];
    if (Array.isArray(data)) return data as RiftboundCard[];
    if (Array.isArray(data.data)) return data.data as RiftboundCard[];
    if (Array.isArray(data.cards)) return data.cards as RiftboundCard[];
    return [];
  } catch (err) {
    console.warn("[riftbound] fetchCards failed:", (err as Error).message);
    return [];
  }
}

export function mapRiftboundSetToDb(
  set: RiftboundSet,
  gameId: string,
): {
  gameId: string;
  name: string;
  slug: string;
  series: null;
  releaseDate: string | null;
  totalCards: number | null;
  logoUrl: string | null;
  symbolUrl: null;
  apiId: string;
  apiSource: string;
  isActive: boolean;
} {
  return {
    gameId,
    name: set.name,
    slug: `riftbound-${set.id ?? set.code ?? set.name.toLowerCase().replace(/\s+/g, "-")}`,
    series: null,
    releaseDate: set.releaseDate ?? null,
    totalCards: set.cardCount ?? null,
    logoUrl: set.imageUrl ?? null,
    symbolUrl: null,
    apiId: String(set.id),
    apiSource: "riftbound",
    isActive: true,
  };
}

export function mapRiftboundCardToDb(
  card: RiftboundCard,
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
  const types = Array.isArray(card.type)
    ? card.type
    : card.type
    ? [card.type]
    : [];

  return {
    setId: setDbId,
    name: card.name,
    slug: `riftbound-${card.id}`,
    cardNumber: card.number ?? null,
    rarity: card.rarity ?? null,
    cardTypes: types,
    hp: null,
    artist: card.artist ?? null,
    imageUrl: card.imageUrl ?? null,
    imageUrlHiRes: card.imageUrlHiRes ?? null,
    description: card.description ?? null,
    apiId: String(card.id),
    apiSource: "riftbound",
    isActive: true,
  };
}
