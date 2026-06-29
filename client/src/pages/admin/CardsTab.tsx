import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ChevronDown, ChevronUp, Plus, Trash2, Save,
  Eye, EyeOff, Star, Sparkles, Package, X,
} from 'lucide-react';

const TCG_CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10', 'PSA9', 'PSA8', 'PSA7'];

const CONDITION_LABELS: Record<string, string> = {
  NM: 'Near Mint',
  LP: 'Lightly Played',
  MP: 'Moderately Played',
  HP: 'Heavily Played',
  DMG: 'Damaged',
  PSA10: 'PSA 10',
  PSA9: 'PSA 9',
  PSA8: 'PSA 8',
  PSA7: 'PSA 7',
};

const CONDITION_COLORS: Record<string, string> = {
  NM: 'bg-emerald-100 text-emerald-800',
  LP: 'bg-blue-100 text-blue-800',
  MP: 'bg-yellow-100 text-yellow-800',
  HP: 'bg-orange-100 text-orange-800',
  DMG: 'bg-red-100 text-red-800',
  PSA10: 'bg-purple-100 text-purple-800',
  PSA9: 'bg-purple-100 text-purple-800',
  PSA8: 'bg-purple-100 text-purple-800',
  PSA7: 'bg-purple-100 text-purple-800',
};

async function adminFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface AdminCard {
  id: string;
  name: string;
  slug: string;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  set_id: string;
  set_name: string;
  game_id: string;
  game_name: string;
  active_listings: number;
  total_listings: number;
}

interface CardListing {
  id: string;
  card_id: string;
  condition: string;
  price: string;
  stock: number;
  is_active: boolean;
}

interface Game { id: string; name: string; slug: string; }
interface CardSet { id: string; name: string; game_id: string; }

function ListingRow({
  listing,
  cardId,
  onSave,
  onDelete,
}: {
  listing: Partial<CardListing> & { _new?: boolean };
  cardId: string;
  onSave: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [condition, setCondition] = useState(listing.condition ?? '');
  const [price, setPrice] = useState(listing.price ?? '');
  const [stock, setStock] = useState(String(listing.stock ?? 0));
  const [isActive, setIsActive] = useState(listing.is_active !== false);

  const saveMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/cards/${cardId}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition, price, stock: parseInt(stock), isActive }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-card-listings', cardId] });
      onSave();
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/cards/${cardId}/listings/${listing.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-card-listings', cardId] });
      onDelete();
    },
  });

  const isNew = listing._new;

  return (
    <tr className="border-t border-neutral-100">
      <td className="px-3 py-2">
        {isNew ? (
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400"
            data-testid="select-listing-condition"
          >
            <option value="">Seçin</option>
            {TCG_CONDITIONS.map((c) => (
              <option key={c} value={c}>{c} — {CONDITION_LABELS[c]}</option>
            ))}
          </select>
        ) : (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${CONDITION_COLORS[condition] ?? 'bg-neutral-100 text-neutral-700'}`}>
            {condition}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-neutral-500">₺</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400 tabular-nums"
            data-testid="input-listing-price"
          />
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-16 text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400 tabular-nums"
          data-testid="input-listing-stock"
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`w-8 h-4 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-neutral-300'}`}
          data-testid="toggle-listing-active"
        >
          <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.25 ${isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </button>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !condition || !price}
            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Kaydet"
            data-testid="button-save-listing"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (isNew) {
                onDelete();
              } else if (confirm('Bu listing\'i silmek istediğinizden emin misiniz?')) {
                deleteMut.mutate();
              }
            }}
            disabled={deleteMut.isPending}
            className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Sil"
            data-testid="button-delete-listing"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CardListingsPanel({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [newRows, setNewRows] = useState<{ _key: number; _new: true }[]>([]);
  const keyRef = { current: 0 };

  const { data: listings = [], isLoading } = useQuery<CardListing[]>({
    queryKey: ['admin-card-listings', cardId],
    queryFn: () => adminFetch(`/api/admin/cards/${cardId}/listings`),
  });

  const addRow = () => {
    keyRef.current += 1;
    setNewRows((prev) => [...prev, { _key: Date.now(), _new: true }]);
  };

  return (
    <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded-lg p-3" data-testid="panel-listings">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-neutral-700">Koşul & Fiyat Listesi</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
            data-testid="button-add-listing"
          >
            <Plus className="w-3 h-3" />
            Koşul Ekle
          </button>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-neutral-400 py-2">Yükleniyor...</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-1.5 font-medium">Koşul</th>
              <th className="px-3 py-1.5 font-medium">Fiyat</th>
              <th className="px-3 py-1.5 font-medium">Stok</th>
              <th className="px-3 py-1.5 font-medium">Aktif</th>
              <th className="px-3 py-1.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <ListingRow
                key={l.id}
                listing={l}
                cardId={cardId}
                onSave={() => {}}
                onDelete={() => {}}
              />
            ))}
            {newRows.map((r) => (
              <ListingRow
                key={r._key}
                listing={{ _new: true }}
                cardId={cardId}
                onSave={() => {
                  setNewRows((prev) => prev.filter((x) => x._key !== r._key));
                  qc.invalidateQueries({ queryKey: ['admin-cards'] });
                }}
                onDelete={() => setNewRows((prev) => prev.filter((x) => x._key !== r._key))}
              />
            ))}
            {listings.length === 0 && newRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-[12px] text-neutral-400">
                  Henüz listing yok — Koşul Ekle ile başlayın
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CardRow({ card }: { card: AdminCard }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const updateMut = useMutation({
    mutationFn: (patch: { isActive?: boolean; isFeatured?: boolean; isNew?: boolean }) =>
      adminFetch(`/api/admin/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cards'] }),
  });

  const Toggle = ({
    value,
    onChange,
    testId,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
    testId: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-8 h-4 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-neutral-200'}`}
      data-testid={testId}
    >
      <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <>
      <tr
        className={`border-t border-neutral-100 hover:bg-neutral-50/50 transition-colors ${!card.is_active ? 'opacity-60' : ''}`}
        data-testid={`row-card-${card.id}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {card.image_url ? (
              <img src={card.image_url} alt={card.name} className="w-8 h-11 object-cover rounded border border-neutral-100 shrink-0" />
            ) : (
              <div className="w-8 h-11 rounded border border-neutral-100 bg-neutral-100 flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-neutral-900 leading-tight truncate">{card.name}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {card.card_number && <span className="mr-2">#{card.card_number}</span>}
                {card.rarity && <span>{card.rarity}</span>}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-[12px] text-neutral-600">{card.set_name}</td>
        <td className="px-4 py-3 text-[12px] text-neutral-500">{card.game_name}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${card.active_listings > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
            {card.active_listings}/{card.total_listings}
          </span>
        </td>
        <td className="px-4 py-3">
          <Toggle
            value={card.is_active}
            onChange={(v) => updateMut.mutate({ isActive: v })}
            testId={`toggle-card-active-${card.id}`}
          />
        </td>
        <td className="px-4 py-3">
          <Toggle
            value={card.is_featured}
            onChange={(v) => updateMut.mutate({ isFeatured: v })}
            testId={`toggle-card-featured-${card.id}`}
          />
        </td>
        <td className="px-4 py-3">
          <Toggle
            value={card.is_new}
            onChange={(v) => updateMut.mutate({ isNew: v })}
            testId={`toggle-card-new-${card.id}`}
          />
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
            data-testid={`button-expand-card-${card.id}`}
          >
            Listingler
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 pb-3">
            <CardListingsPanel cardId={card.id} onClose={() => setExpanded(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function CardsTab() {
  const [search, setSearch] = useState('');
  const [gameId, setGameId] = useState('');
  const [setId, setSetId] = useState('');
  const [rarity, setRarity] = useState('');
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ['admin-card-games'],
    queryFn: () => adminFetch('/api/admin/card-games'),
  });

  const { data: sets = [] } = useQuery<CardSet[]>({
    queryKey: ['admin-card-sets-list', gameId],
    queryFn: () => adminFetch(`/api/admin/card-sets${gameId ? `?gameId=${gameId}` : ''}`),
  });

  const { data, isLoading, isError } = useQuery<{ cards: AdminCard[]; total: number }>({
    queryKey: ['admin-cards', search, gameId, setId, rarity, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (gameId) params.set('gameId', gameId);
      if (setId) params.set('setId', setId);
      if (rarity) params.set('rarity', rarity);
      params.set('page', String(page));
      params.set('limit', String(limit));
      return adminFetch(`/api/admin/cards?${params}`);
    },
  });

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  return (
    <div data-testid="tab-cards">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Kart ara..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
            data-testid="input-search-cards"
          />
        </div>
        <select
          value={gameId}
          onChange={(e) => { setGameId(e.target.value); setSetId(''); setPage(1); }}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="select-filter-game"
        >
          <option value="">Tüm Oyunlar</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select
          value={setId}
          onChange={(e) => { setSetId(e.target.value); setPage(1); }}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="select-filter-set"
        >
          <option value="">Tüm Setler</option>
          {sets
            .filter((s) => !gameId || s.game_id === gameId)
            .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          type="text"
          placeholder="Rarity"
          value={rarity}
          onChange={(e) => { setRarity(e.target.value); setPage(1); }}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 w-36 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="input-filter-rarity"
        />
        <span className="text-[12px] text-neutral-500 ml-auto">{total.toLocaleString('tr-TR')} kart</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Kart</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Set</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Oyun</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                <span title="Aktif Listing / Toplam">Listing</span>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                <EyeOff className="w-3.5 h-3.5 inline mr-1" />Aktif
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                <Star className="w-3.5 h-3.5 inline mr-1" />Öne Çıkar
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />Yeni
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-neutral-400">Yükleniyor...</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-red-500">Kartlar yüklenemedi</td>
              </tr>
            )}
            {!isLoading && !isError && cards.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-neutral-400">
                  Kart bulunamadı. Kart API Sync ile import edin.
                </td>
              </tr>
            )}
            {cards.map((card) => <CardRow key={card.id} card={card} />)}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-[12px] border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Önceki
          </button>
          <span className="text-[12px] text-neutral-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[12px] border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}
