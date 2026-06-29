import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Search, Plus, Trash2, X } from 'lucide-react';

async function adminFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface AdminCardSet {
  id: string; name: string; slug: string;
  series: string | null; release_date: string | null;
  total_cards: number | null; logo_url: string | null;
  symbol_url: string | null; is_active: boolean;
  game_id: string; game_name: string; game_slug: string;
  card_count: number; active_listings: number;
}

interface Game { id: string; name: string; slug: string; }

// ── Create Set Modal ──────────────────────────────────────────────────────
function CreateSetModal({ games, onClose, onCreated }: {
  games: Game[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const [gameId, setGameId] = useState('');
  const [name, setName] = useState('');
  const [series, setSeries] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [symbolUrl, setSymbolUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => adminFetch('/api/admin/card-sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId, name,
        series: series || null,
        logoUrl: logoUrl || null,
        symbolUrl: symbolUrl || null,
        releaseDate: releaseDate || null,
        isActive: true,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-card-sets'] });
      onCreated();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="modal-create-set">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-neutral-900">Yeni Set Ekle</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Oyun *</label>
            <select value={gameId} onChange={(e) => setGameId(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              data-testid="select-create-set-game">
              <option value="">Oyun seçin</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Set Adı *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="Scarlet & Violet - 151" data-testid="input-create-set-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Seri</label>
              <input type="text" value={series} onChange={(e) => setSeries(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="Scarlet & Violet" data-testid="input-create-set-series" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Çıkış Tarihi</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                data-testid="input-create-set-date" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Logo URL</label>
            <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="https://..." data-testid="input-create-set-logo" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Sembol URL</label>
            <input type="text" value={symbolUrl} onChange={(e) => setSymbolUrl(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="https://..." data-testid="input-create-set-symbol" />
          </div>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[13px] border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 transition-colors">
            İptal
          </button>
          <button type="button" onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !gameId || !name}
            className="px-4 py-2 text-[13px] bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-create-set-submit">
            {createMut.isPending ? 'Oluşturuluyor...' : 'Seti Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CardSetsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [gameId, setGameId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminFetch(`/api/admin/card-sets/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-card-sets'] }),
  });

  const filtered = sets.filter((s) => {
    if (!search) return true;
    return s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.series ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div data-testid="tab-card-sets">
      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder="Set ara..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
            data-testid="input-search-sets" />
        </div>
        <select value={gameId} onChange={(e) => setGameId(e.target.value)}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="select-filter-game-sets">
          <option value="">Tüm Oyunlar</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <span className="text-[12px] text-neutral-500 ml-auto">{filtered.length} set</span>
        <button type="button" onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors shrink-0"
          data-testid="button-new-set">
          <Plus className="w-3.5 h-3.5" /> Yeni Set
        </button>
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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-neutral-400">Yükleniyor...</td></tr>
            )}
            {isError && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-red-500">Setler yüklenemedi</td></tr>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-neutral-400">
                  Set bulunamadı. Kart API Sync ile import edin ya da Yeni Set ekleyin.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id}
                className={`border-t border-neutral-100 hover:bg-neutral-50/50 transition-colors ${!s.is_active ? 'opacity-60' : ''}`}
                data-testid={`row-set-${s.id}`}>
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
                  <button type="button"
                    onClick={() => toggleMut.mutate({ id: s.id, isActive: !s.is_active })}
                    disabled={toggleMut.isPending}
                    className={`w-8 h-4 rounded-full transition-colors disabled:opacity-50 ${s.is_active ? 'bg-emerald-500' : 'bg-neutral-200'}`}
                    data-testid={`toggle-set-active-${s.id}`}>
                    <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${s.is_active ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button type="button"
                    onClick={() => { if (confirm(`"${s.name}" setini ve tüm kartlarını silmek istediğinizden emin misiniz?`)) deleteMut.mutate(s.id); }}
                    disabled={deleteMut.isPending}
                    className="p-1.5 rounded-md hover:bg-red-50 text-neutral-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                    title="Seti Sil" data-testid={`button-delete-set-${s.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateSetModal
          games={games}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
