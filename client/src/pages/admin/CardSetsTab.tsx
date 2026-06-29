import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Search } from 'lucide-react';

async function adminFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface AdminCardSet {
  id: string;
  name: string;
  slug: string;
  series: string | null;
  release_date: string | null;
  total_cards: number | null;
  logo_url: string | null;
  symbol_url: string | null;
  is_active: boolean;
  game_id: string;
  game_name: string;
  game_slug: string;
  card_count: number;
  active_listings: number;
}

interface Game { id: string; name: string; slug: string; }

export default function CardSetsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [gameId, setGameId] = useState('');

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ['admin-card-games'],
    queryFn: () => adminFetch('/api/admin/card-games'),
  });

  const { data: sets = [], isLoading, isError } = useQuery<AdminCardSet[]>({
    queryKey: ['admin-card-sets', gameId],
    queryFn: () => adminFetch(`/api/admin/card-sets${gameId ? `?gameId=${gameId}` : ''}`),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminFetch(`/api/admin/card-sets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-card-sets'] }),
  });

  const filtered = sets.filter((s) => {
    if (!search) return true;
    return s.name.toLowerCase().includes(search.toLowerCase()) || (s.series ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div data-testid="tab-card-sets">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Set ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
            data-testid="input-search-sets"
          />
        </div>
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="select-filter-game-sets"
        >
          <option value="">Tüm Oyunlar</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <span className="text-[12px] text-neutral-500 ml-auto">{filtered.length} set</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Set</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Oyun</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Seri</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Çıkış</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Kart</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Listing</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Aktif</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-neutral-400">Yükleniyor...</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-red-500">Setler yüklenemedi</td>
              </tr>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-neutral-400">
                  Set bulunamadı. Kart API Sync ile import edin.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr
                key={s.id}
                className={`border-t border-neutral-100 hover:bg-neutral-50/50 transition-colors ${!s.is_active ? 'opacity-60' : ''}`}
                data-testid={`row-set-${s.id}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="h-8 w-auto object-contain shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-neutral-900 leading-tight">{s.name}</p>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{s.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[12px] text-neutral-600">{s.game_name}</td>
                <td className="px-4 py-3 text-[12px] text-neutral-500">{s.series ?? '—'}</td>
                <td className="px-4 py-3 text-[12px] text-neutral-500 tabular-nums">{s.release_date ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-[12px] font-medium text-neutral-700 tabular-nums">
                    {s.card_count}
                    {s.total_cards ? <span className="text-neutral-400 font-normal">/{s.total_cards}</span> : null}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${s.active_listings > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {s.active_listings} aktif
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleMut.mutate({ id: s.id, isActive: !s.is_active })}
                    disabled={toggleMut.isPending}
                    className={`w-8 h-4 rounded-full transition-colors disabled:opacity-50 ${s.is_active ? 'bg-emerald-500' : 'bg-neutral-200'}`}
                    data-testid={`toggle-set-active-${s.id}`}
                  >
                    <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${s.is_active ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
