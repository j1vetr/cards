/**
 * Pokemon TCG API adapter — pokemontcg.io/v2
 * API key optional (free: 1000 req/day; with key: higher limits).
 * API key stored in site_settings as 'pokemon_tcg_api_key'.
 */

import { httpFetchWithRetry } from "./httpUtils";

const BASE_URL = "https://api.pokemontcg.io/v2";
const DEFAULT_PAGE_SIZE = 250;

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

function pokemonHeaders(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) h["X-Api-Key"] = apiKey;
  return h;
}

export async function fetchPokemonSets(apiKey?: string): Promise<PokemonSet[]> {
  const data = await httpFetchWithRetry(`${BASE_URL}/sets?pageSize=250&orderBy=releaseDate`, {
    headers: pokemonHeaders(apiKey),
  });
  return (data.data ?? []) as PokemonSet[];
}

export async function fetchPokemonCardsBySet(
  setId: string,
  apiKey?: string,
): Promise<PokemonCard[]> {
  const all: PokemonCard[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/cards?q=set.id:${encodeURIComponent(setId)}&pageSize=${DEFAULT_PAGE_SIZE}&page=${page}`;
    const data = await httpFetchWithRetry(url, { headers: pokemonHeaders(apiKey) });
    const batch = (data.data ?? []) as PokemonCard[];
    all.push(...batch);
    if (batch.length < DEFAULT_PAGE_SIZE) break;
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
