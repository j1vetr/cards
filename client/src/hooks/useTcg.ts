import { useQuery } from '@tanstack/react-query';
import type { CardPublic } from '@/components/CardCard';

export interface CardSetPublic {
  id: string;
  name: string;
  slug: string;
  series: string | null;
  release_date: string | null;
  total_cards: number | null;
  logo_url: string | null;
  symbol_url: string | null;
  game_id: string;
  game_name: string;
  game_slug: string;
  listed_cards: number;
}

export interface CardGame {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface CardFilters {
  game?: string;
  set?: string;
  rarity?: string;
  type?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

function buildQuery(filters: CardFilters) {
  const p = new URLSearchParams();
  if (filters.game) p.set('game', filters.game);
  if (filters.set) p.set('set', filters.set);
  if (filters.rarity) p.set('rarity', filters.rarity);
  if (filters.type) p.set('type', filters.type);
  if (filters.condition) p.set('condition', filters.condition);
  if (filters.search) p.set('search', filters.search);
  if (filters.sort) p.set('sort', filters.sort);
  if (filters.page) p.set('page', String(filters.page));
  if (filters.limit) p.set('limit', String(filters.limit));
  if (filters.minPrice != null && filters.minPrice > 0) p.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) p.set('maxPrice', String(filters.maxPrice));
  return p.toString();
}

export function useCards(filters: CardFilters) {
  const qs = buildQuery(filters);
  return useQuery<{ cards: CardPublic[]; total: number }>({
    queryKey: ['cards', qs],
    queryFn: async () => {
      const res = await fetch(`/api/cards${qs ? '?' + qs : ''}`);
      if (!res.ok) throw new Error('Kartlar yüklenemedi');
      return res.json();
    },
    placeholderData: prev => prev,
  });
}

export function useCardSets(gameSlug?: string) {
  return useQuery<CardSetPublic[]>({
    queryKey: ['card-sets', gameSlug],
    queryFn: async () => {
      const qs = gameSlug ? `?game=${gameSlug}` : '';
      const res = await fetch(`/api/card-sets${qs}`);
      if (!res.ok) throw new Error('Setler yüklenemedi');
      return res.json();
    },
  });
}

export function useCardSet(slug: string) {
  return useQuery<CardSetPublic>({
    queryKey: ['card-set', slug],
    queryFn: async () => {
      const res = await fetch(`/api/card-sets/${slug}`);
      if (!res.ok) throw new Error('Set yüklenemedi');
      return res.json();
    },
    enabled: !!slug,
  });
}

export function useCardGames() {
  return useQuery<CardGame[]>({
    queryKey: ['card-games'],
    queryFn: async () => {
      const res = await fetch('/api/card-games');
      if (!res.ok) throw new Error('Oyunlar yüklenemedi');
      return res.json();
    },
  });
}

export function useCardDetail(slug: string) {
  return useQuery<any>({
    queryKey: ['card', slug],
    queryFn: async () => {
      const res = await fetch(`/api/cards/${slug}`);
      if (!res.ok) throw new Error('Kart yüklenemedi');
      return res.json();
    },
    enabled: !!slug,
  });
}

export function useRarities(gameSlug?: string) {
  return useQuery<string[]>({
    queryKey: ['card-rarities', gameSlug],
    queryFn: async () => {
      const qs = gameSlug ? `?game=${gameSlug}` : '';
      const res = await fetch(`/api/cards/rarities${qs}`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useSimilarCards(slug: string) {
  return useQuery<CardPublic[]>({
    queryKey: ['card-similar', slug],
    queryFn: async () => {
      const res = await fetch(`/api/cards/${slug}/similar`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!slug,
  });
}
