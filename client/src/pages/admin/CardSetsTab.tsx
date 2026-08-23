import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Search, Plus, Trash2, X, Pencil } from 'lucide-react';

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
  seo_title: string | null; seo_description: string | null;
  seo_h1: string | null; seo_intro: string | null; seo_no_index: boolean;
}

interface Game {
  id: string; name: string; slug: string;
  seoTitle?: string | null; seoDescription?: string | null;
  seoH1?: string | null; seoIntro?: string | null; seoNoIndex?: boolean;
}

// ── SEO Modal (kart seti veya oyun için ortak) ────────────────────────────
function SeoEditModal({ title, initial, hasIntroFields, onClose, onSave, isSaving, error }: {
  title: string;
  initial: { seoTitle: string; seoDescription: string; seoH1: string; seoIntro: string; seoNoIndex: boolean };
  hasIntroFields: boolean;
  onClose: () => void;
  onSave: (data: { seoTitle: string; seoDescription: string; seoH1: string; seoIntro: string; seoNoIndex: boolean }) => void;
  isSaving: boolean;
  error: string;
}) {
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [seoH1, setSeoH1] = useState(initial.seoH1);
  const [seoIntro, setSeoIntro] = useState(initial.seoIntro);
  const [seoNoIndex, setSeoNoIndex] = useState(initial.seoNoIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="modal-seo-edit">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-neutral-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">SEO Başlığı</label>
            <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="Boşsa otomatik üretilir" data-testid="input-seo-title" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Meta Açıklama</label>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 resize-none"
              placeholder="Boşsa otomatik üretilir" data-testid="input-seo-description" />
          </div>
          {hasIntroFields && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">H1 Başlığı</label>
                <input type="text" value={seoH1} onChange={(e) => setSeoH1(e.target.value)}
                  className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                  placeholder="Boşsa ad kullanılır" data-testid="input-seo-h1" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">Giriş Metni</label>
                <textarea value={seoIntro} onChange={(e) => setSeoIntro(e.target.value)} rows={2}
                  className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 resize-none"
                  placeholder="Sayfa üstünde H1 altında gösterilir" data-testid="input-seo-intro" />
              </div>
            </>
          )}
          <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50">
            <div>
              <p className="text-[12.5px] font-medium text-neutral-900">Arama Motorlarından Gizle</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Açıksa indexlenmez.</p>
            </div>
            <button type="button" onClick={() => setSeoNoIndex(!seoNoIndex)}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${seoNoIndex ? 'bg-emerald-500' : 'bg-neutral-300'}`}
              aria-pressed={seoNoIndex} data-testid="toggle-seo-noindex">
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${seoNoIndex ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </label>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[13px] border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 transition-colors">
            İptal
          </button>
          <button type="button"
            onClick={() => onSave({ seoTitle, seoDescription, seoH1, seoIntro, seoNoIndex })}
            disabled={isSaving}
            className="px-4 py-2 text-[13px] bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-save-seo">
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [editingSet, setEditingSet] = useState<AdminCardSet | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [seoError, setSeoError] = useState('');

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

  const setSeoMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminFetch(`/api/admin/card-sets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-card-sets'] });
      setEditingSet(null);
      setSeoError('');
    },
    onError: (err: Error) => setSeoError(err.message),
  });

  const gameSeoMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminFetch(`/api/admin/card-games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-card-games'] });
      setEditingGame(null);
      setSeoError('');
    },
    onError: (err: Error) => setSeoError(err.message),
  });

  const filtered = sets.filter((s) => {
    if (!search) return true;
    return s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.series ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div data-testid="tab-card-sets">
      {/* Oyun SEO */}
      {games.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[11px] text-neutral-500 mr-1">Oyun SEO:</span>
          {games.map((g) => (
            <button key={g.id} type="button"
              onClick={() => setEditingGame(g)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 transition-colors"
              data-testid={`button-edit-game-seo-${g.slug}`}>
              <Pencil className="w-3 h-3" /> {g.name}
            </button>
          ))}
        </div>
      )}

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
                  <div className="flex items-center gap-1">
                    <button type="button"
                      onClick={() => { setSeoError(''); setEditingSet(s); }}
                      className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                      title="SEO Düzenle" data-testid={`button-edit-set-seo-${s.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button"
                      onClick={() => { if (confirm(`"${s.name}" setini ve tüm kartlarını silmek istediğinizden emin misiniz?`)) deleteMut.mutate(s.id); }}
                      disabled={deleteMut.isPending}
                      className="p-1.5 rounded-md hover:bg-red-50 text-neutral-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                      title="Seti Sil" data-testid={`button-delete-set-${s.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {editingSet && (
        <SeoEditModal
          title={`"${editingSet.name}" SEO`}
          hasIntroFields
          initial={{
            seoTitle: editingSet.seo_title || '',
            seoDescription: editingSet.seo_description || '',
            seoH1: editingSet.seo_h1 || '',
            seoIntro: editingSet.seo_intro || '',
            seoNoIndex: editingSet.seo_no_index || false,
          }}
          isSaving={setSeoMut.isPending}
          error={seoError}
          onClose={() => { setEditingSet(null); setSeoError(''); }}
          onSave={(data) => setSeoMut.mutate({
            id: editingSet.id,
            data: {
              seoTitle: data.seoTitle || null,
              seoDescription: data.seoDescription || null,
              seoH1: data.seoH1 || null,
              seoIntro: data.seoIntro || null,
              seoNoIndex: data.seoNoIndex,
            },
          })}
        />
      )}

      {editingGame && (
        <SeoEditModal
          title={`"${editingGame.name}" SEO`}
          hasIntroFields
          initial={{
            seoTitle: editingGame.seoTitle || '',
            seoDescription: editingGame.seoDescription || '',
            seoH1: editingGame.seoH1 || '',
            seoIntro: editingGame.seoIntro || '',
            seoNoIndex: editingGame.seoNoIndex || false,
          }}
          isSaving={gameSeoMut.isPending}
          error={seoError}
          onClose={() => { setEditingGame(null); setSeoError(''); }}
          onSave={(data) => gameSeoMut.mutate({
            id: editingGame.id,
            data: {
              seoTitle: data.seoTitle || null,
              seoDescription: data.seoDescription || null,
              seoH1: data.seoH1 || null,
              seoIntro: data.seoIntro || null,
              seoNoIndex: data.seoNoIndex,
            },
          })}
        />
      )}
    </div>
  );
}
