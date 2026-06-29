/**
 * Pokemon TCG API adapter — pokemontcg.io/v2
 * API key optional (free: 1000 req/day; with key: higher limits).
 * API key stored in site_settings as 'pokemon_tcg_api_key'.
 */

const BASE_URL = "https://api.pokemontcg.io/v2";
const DEFAULT_PAGE_SIZE = 250;
const TIMEOUT_MS = 15_000;

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  printedTotal?: number;
  images: { symbol: string; logo: string };
}

export interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  hp?: string;
  artist?: string;
  images: { small: string; large: string };
  set: { id: string; name: string };
}

async function pokemonFetch(path: string, apiKey?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`Pokemon TCG API ${res.status}: ${res.statusText}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPokemonSets(apiKey?: string): Promise<PokemonSet[]> {
  const data = await pokemonFetch("/sets?pageSize=250&orderBy=releaseDate", apiKey);
  return (data.data ?? []) as PokemonSet[];
}

export async function fetchPokemonCardsBySet(
  setId: string,
  apiKey?: string,
): Promise<PokemonCard[]> {
  const all: PokemonCard[] = [];
  let page = 1;

  while (true) {
    const data = await pokemonFetch(
      `/cards?q=set.id:${encodeURIComponent(setId)}&pageSize=${DEFAULT_PAGE_SIZE}&page=${page}`,
      apiKey,
    );
    const cards = (data.data ?? []) as PokemonCard[];
    all.push(...cards);
    if (cards.length < DEFAULT_PAGE_SIZE) break;
    page++;
  }
  return all;
}

export function mapPokemonSetToDb(
  set: PokemonSet,
  gameId: string,
): {
  gameId: string;
  name: string;
  slug: string;
  series: string | null;
  releaseDate: string | null;
  totalCards: number | null;
  logoUrl: string | null;
  symbolUrl: string | null;
  apiId: string;
  apiSource: string;
  isActive: boolean;
} {
  return {
    gameId,
    name: set.name,
    slug: `pokemon-${set.id}`,
    series: set.series ?? null,
    releaseDate: set.releaseDate ?? null,
    totalCards: set.total ?? null,
    logoUrl: set.images?.logo ?? null,
    symbolUrl: set.images?.symbol ?? null,
    apiId: set.id,
    apiSource: "pokemon_tcg",
    isActive: true,
  };
}

export function mapPokemonCardToDb(
  card: PokemonCard,
  setDbId: string,
): {
  setId: string;
  name: string;
  slug: string;
  cardNumber: string | null;
  rarity: string | null;
  cardTypes: string[];
  hp: number | null;
  artist: string | null;
  imageUrl: string | null;
  imageUrlHiRes: string | null;
  apiId: string;
  apiSource: string;
  isActive: boolean;
} {
  return {
    setId: setDbId,
    name: card.name,
    slug: `pokemon-${card.id}`,
    cardNumber: card.number ?? null,
    rarity: card.rarity ?? null,
    cardTypes: card.types ?? [],
    hp: card.hp ? parseInt(card.hp, 10) || null : null,
    artist: card.artist ?? null,
    imageUrl: card.images?.small ?? null,
    imageUrlHiRes: card.images?.large ?? null,
    apiId: card.id,
    apiSource: "pokemon_tcg",
    isActive: true,
  };
}
