import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ChevronDown, ChevronUp, Plus, Trash2, Save,
  EyeOff, Star, Sparkles, Package, X, Pencil,
} from 'lucide-react';

const TCG_CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10', 'PSA9', 'PSA8', 'PSA7'];

const CONDITION_LABELS: Record<string, string> = {
  NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
  HP: 'Heavily Played', DMG: 'Damaged',
  PSA10: 'PSA 10', PSA9: 'PSA 9', PSA8: 'PSA 8', PSA7: 'PSA 7',
};

const CONDITION_COLORS: Record<string, string> = {
  NM: 'bg-emerald-100 text-emerald-800', LP: 'bg-blue-100 text-blue-800',
  MP: 'bg-yellow-100 text-yellow-800', HP: 'bg-orange-100 text-orange-800',
  DMG: 'bg-red-100 text-red-800', PSA10: 'bg-purple-100 text-purple-800',
  PSA9: 'bg-purple-100 text-purple-800', PSA8: 'bg-purple-100 text-purple-800',
  PSA7: 'bg-purple-100 text-purple-800',
};

async function adminFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface AdminCard {
  id: string; name: string; slug: string;
  card_number: string | null; rarity: string | null; image_url: string | null;
  image_url_hi_res: string | null; card_types: string[] | null; hp: number | null;
  artist: string | null; description: string | null;
  is_active: boolean; is_featured: boolean; is_new: boolean;
  set_id: string; set_name: string; game_id: string; game_name: string;
  active_listings: number; total_listings: number;
}

interface CardListing {
  id: string; cardId: string; condition: string;
  price: string; stock: number; isActive: boolean;
}

interface Game { id: string; name: string; slug: string; }
interface CardSet { id: string; name: string; game_id: string; }

// ── Existing listing row (uses PUT /listings/:id) ──────────────────────────
function ExistingListingRow({ listing, cardId }: { listing: CardListing; cardId: string }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(listing.price);
  const [stock, setStock] = useState(String(listing.stock));
  const [isActive, setIsActive] = useState(listing.isActive);

  const saveMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/cards/${cardId}/listings/${listing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price, stock: parseInt(stock), isActive }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-card-listings', cardId] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/cards/${cardId}/listings/${listing.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-card-listings', cardId] });
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
    },
  });

  return (
    <tr className="border-t border-neutral-100">
      <td className="px-3 py-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${CONDITION_COLORS[listing.condition] ?? 'bg-neutral-100 text-neutral-700'}`}>
          {listing.condition}
        </span>
        <span className="ml-1.5 text-[10px] text-neutral-400">{CONDITION_LABELS[listing.condition]}</span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-neutral-500">₺</span>
          <input type="number" min="0" step="0.01" value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400 tabular-nums"
            data-testid={`input-price-${listing.id}`} />
        </div>
      </td>
      <td className="px-3 py-2">
        <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
          className="w-16 text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400 tabular-nums"
          data-testid={`input-stock-${listing.id}`} />
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={() => setIsActive(!isActive)}
          className={`w-8 h-4 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-neutral-300'}`}
          data-testid={`toggle-active-${listing.id}`}>
          <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </button>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50 transition-colors" title="Kaydet"
            data-testid={`button-save-${listing.id}`}>
            <Save className="w-3.5 h-3.5" />
          </button>
          <button type="button"
            onClick={() => { if (confirm(`${listing.condition} listing'ini silmek istediğinizden emin misiniz?`)) deleteMut.mutate(); }}
            disabled={deleteMut.isPending}
            className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50 transition-colors" title="Sil"
            data-testid={`button-delete-${listing.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── New listing row (uses POST /listings) ──────────────────────────────────
function NewListingRow({ cardId, onSave, onCancel }: { cardId: string; onSave: () => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const saveMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/cards/${cardId}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition, price, stock: parseInt(stock), isActive }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-card-listings', cardId] });
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
      onSave();
    },
  });

  return (
    <tr className="border-t border-neutral-100 bg-blue-50/30">
      <td className="px-3 py-2">
        <select value={condition} onChange={(e) => setCondition(e.target.value)}
          className="w-full text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400"
          data-testid="select-new-condition">
          <option value="">Koşul seçin</option>
          {TCG_CONDITIONS.map((c) => <option key={c} value={c}>{c} — {CONDITION_LABELS[c]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-neutral-500">₺</span>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-24 text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400 tabular-nums"
            placeholder="0.00" data-testid="input-new-price" />
        </div>
      </td>
      <td className="px-3 py-2">
        <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
          className="w-16 text-[12px] border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-neutral-400 tabular-nums"
          data-testid="input-new-stock" />
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={() => setIsActive(!isActive)}
          className={`w-8 h-4 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-neutral-300'}`}>
          <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </button>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !condition || !price}
            className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-50 transition-colors" title="Kaydet"
            data-testid="button-save-new-listing">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onCancel}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 transition-colors" title="İptal">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

interface PriceReference {
  id: string;
  priceMarket: string | null;
  priceLow: string | null;
  priceHigh: string | null;
  currency: string;
  fetchedAt: string;
}

function CardListingsPanel({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const [showNewRow, setShowNewRow] = useState(false);

  const { data: listings = [], isLoading } = useQuery<CardListing[]>({
    queryKey: ['admin-card-listings', cardId],
    queryFn: () => adminFetch(`/api/admin/cards/${cardId}/listings`),
  });

  const { data: priceRef } = useQuery<PriceReference | null>({
    queryKey: ['admin-card-price-ref', cardId],
    queryFn: () => adminFetch(`/api/admin/cards/${cardId}/price-reference`),
    staleTime: 60_000,
  });

  return (
    <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded-lg p-3" data-testid="panel-listings">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-neutral-700">Koşul & Fiyat Listesi</span>
          {priceRef && (
            <span className="text-[11px] text-neutral-500 bg-white border border-neutral-200 rounded px-2 py-0.5">
              PriceCharting: piyasa <strong className="text-neutral-800">${priceRef.priceMarket ?? '—'}</strong>
              {priceRef.priceLow && <> · düşük <strong className="text-neutral-800">${priceRef.priceLow}</strong></>}
              {priceRef.priceHigh && <> · yüksek <strong className="text-neutral-800">${priceRef.priceHigh}</strong></>}
              <span className="ml-1.5 text-neutral-400">
                ({new Date(priceRef.fetchedAt).toLocaleDateString('tr-TR')})
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowNewRow(true)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
            data-testid="button-add-listing">
            <Plus className="w-3 h-3" /> Koşul Ekle
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
              <ExistingListingRow key={l.id} listing={l} cardId={cardId} />
            ))}
            {showNewRow && (
              <NewListingRow cardId={cardId} onSave={() => setShowNewRow(false)} onCancel={() => setShowNewRow(false)} />
            )}
            {listings.length === 0 && !showNewRow && (
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

// ── Create Card Modal ──────────────────────────────────────────────────────
const CONDITION_OPTIONS = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10'];

interface InitialListing { condition: string; price: string; stock: string; }

function CreateCardModal({ games, allSets, onClose, onCreated }: {
  games: Game[];
  allSets: CardSet[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const [gameId, setGameId] = useState('');
  const [setId, setSetId] = useState('');
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [rarity, setRarity] = useState('');
  const [typesStr, setTypesStr] = useState('');
  const [hp, setHp] = useState('');
  const [artist, setArtist] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [listings, setListings] = useState<InitialListing[]>([{ condition: 'NM', price: '', stock: '1' }]);
  const [error, setError] = useState('');

  const filteredSets = gameId ? allSets.filter((s) => s.game_id === gameId) : allSets;

  const addRow = () => setListings((prev) => [...prev, { condition: 'NM', price: '', stock: '1' }]);
  const removeRow = (i: number) => setListings((prev) => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof InitialListing, val: string) =>
    setListings((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const createMut = useMutation({
    mutationFn: async () => {
      const card = await adminFetch('/api/admin/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId, name,
          cardNumber: cardNumber || null,
          rarity: rarity || null,
          cardTypes: typesStr ? typesStr.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined,
          hp: hp ? parseInt(hp) : null,
          artist: artist || null,
          imageUrl: imageUrl || null,
          description: description || null,
          isFeatured,
          isNew,
          isActive: true,
        }),
      });
      const validListings = listings.filter((l) => l.price && parseFloat(l.price) > 0);
      await Promise.all(validListings.map((l) =>
        adminFetch(`/api/admin/cards/${card.id}/listings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            condition: l.condition,
            price: parseFloat(l.price),
            stock: parseInt(l.stock) || 1,
            isActive: true,
          }),
        })
      ));
      return card;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
      onCreated();
    },
    onError: (err: Error) => setError(err.message),
  });

  const Toggle2 = ({ label, value, onChange, testId }: { label: string; value: boolean; onChange: (v: boolean) => void; testId: string }) => (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-neutral-200 bg-white text-neutral-500'}`}
      data-testid={testId}>
      <span className={`w-3 h-3 rounded-full border-2 ${value ? 'border-blue-500 bg-blue-500' : 'border-neutral-300'}`} />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="modal-create-card">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-neutral-900">Yeni Kart Ekle</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          {/* Game / Set */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Oyun</label>
              <select value={gameId} onChange={(e) => { setGameId(e.target.value); setSetId(''); }}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                data-testid="select-create-game">
                <option value="">Tüm oyunlar</option>
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Set *</label>
              <select value={setId} onChange={(e) => setSetId(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                data-testid="select-create-set">
                <option value="">Set seçin</option>
                {filteredSets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Kart Adı *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="Charizard" data-testid="input-create-name" />
          </div>
          {/* Number / Rarity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Kart No</label>
              <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="006/165" data-testid="input-create-number" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Rarity</label>
              <input type="text" value={rarity} onChange={(e) => setRarity(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="Rare Holo" data-testid="input-create-rarity" />
            </div>
          </div>
          {/* Types / HP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Tipler (virgülle)</label>
              <input type="text" value={typesStr} onChange={(e) => setTypesStr(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="Fire, Fighting" data-testid="input-create-types" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">HP</label>
              <input type="number" min="0" value={hp} onChange={(e) => setHp(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="120" data-testid="input-create-hp" />
            </div>
          </div>
          {/* Artist */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Sanatçı</label>
            <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="Ken Sugimori" data-testid="input-create-artist" />
          </div>
          {/* Image URL */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Görsel URL</label>
            <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="https://..." data-testid="input-create-image" />
          </div>
          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Açıklama</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 resize-none"
              placeholder="Kart açıklaması..." data-testid="textarea-create-description" />
          </div>
          {/* Featured / New */}
          <div className="flex items-center gap-2">
            <Toggle2 label="Öne Çıkar" value={isFeatured} onChange={setIsFeatured} testId="toggle-create-featured" />
            <Toggle2 label="Yeni" value={isNew} onChange={setIsNew} testId="toggle-create-new" />
          </div>

          {/* Initial Listings */}
          <div className="pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Koşul & Fiyat (opsiyonel)</p>
              <button type="button" onClick={addRow}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                data-testid="button-create-add-listing-row">
                <Plus className="w-3 h-3" /> Satır Ekle
              </button>
            </div>
            <div className="space-y-2">
              {listings.map((row, i) => (
                <div key={i} className="grid grid-cols-[120px_1fr_80px_24px] gap-2 items-center">
                  <select value={row.condition} onChange={(e) => updateRow(i, 'condition', e.target.value)}
                    className="text-[12px] border border-neutral-200 rounded-md px-2 py-1.5 focus:outline-none"
                    data-testid={`select-listing-condition-${i}`}>
                    {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" min="0" step="0.01" placeholder="Fiyat (₺)" value={row.price}
                    onChange={(e) => updateRow(i, 'price', e.target.value)}
                    className="text-[12px] border border-neutral-200 rounded-md px-2 py-1.5 focus:outline-none"
                    data-testid={`input-listing-price-${i}`} />
                  <input type="number" min="0" step="1" placeholder="Stok" value={row.stock}
                    onChange={(e) => updateRow(i, 'stock', e.target.value)}
                    className="text-[12px] border border-neutral-200 rounded-md px-2 py-1.5 focus:outline-none"
                    data-testid={`input-listing-stock-${i}`} />
                  {listings.length > 1 ? (
                    <button type="button" onClick={() => removeRow(i)} className="text-neutral-300 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">Fiyat girilmemiş satırlar atlanır.</p>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[13px] border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 transition-colors">
            İptal
          </button>
          <button type="button" onClick={() => createMut.mutate()} disabled={createMut.isPending || !setId || !name}
            className="px-4 py-2 text-[13px] bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-create-card-submit">
            {createMut.isPending ? 'Oluşturuluyor...' : 'Kartı Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Card Modal ────────────────────────────────────────────────────────
function EditCardModal({ card, games, allSets, onClose }: {
  card: AdminCard;
  games: Game[];
  allSets: CardSet[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [gameId, setGameId] = useState(card.game_id);
  const [setId, setSetId] = useState(card.set_id);
  const [name, setName] = useState(card.name);
  const [cardNumber, setCardNumber] = useState(card.card_number ?? '');
  const [rarity, setRarity] = useState(card.rarity ?? '');
  const [typesStr, setTypesStr] = useState(card.card_types?.join(', ') ?? '');
  const [hp, setHp] = useState(String(card.hp ?? ''));
  const [artist, setArtist] = useState(card.artist ?? '');
  const [imageUrl, setImageUrl] = useState(card.image_url ?? '');
  const [imageUrlHiRes, setImageUrlHiRes] = useState(card.image_url_hi_res ?? '');
  const [description, setDescription] = useState(card.description ?? '');
  const [error, setError] = useState('');

  const filteredSets = gameId ? allSets.filter((s) => s.game_id === gameId) : allSets;

  const saveMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/cards/${card.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || undefined,
        setId: setId || undefined,
        cardNumber: cardNumber || null,
        rarity: rarity || null,
        cardTypes: typesStr ? typesStr.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined,
        hp: hp ? parseInt(hp) : null,
        artist: artist || null,
        imageUrl: imageUrl || null,
        imageUrlHiRes: imageUrlHiRes || null,
        description: description || null,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="modal-edit-card">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-neutral-900">Kartı Düzenle</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Oyun</label>
            <select value={gameId} onChange={(e) => { setGameId(e.target.value); setSetId(''); }}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              data-testid="select-edit-game">
              <option value="">Oyun seçin</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Set</label>
            <select value={setId} onChange={(e) => setSetId(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              data-testid="select-edit-set">
              <option value="">Set seçin</option>
              {filteredSets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Kart Adı</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              data-testid="input-edit-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Kart No</label>
              <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="006/165" data-testid="input-edit-number" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Rarity</label>
              <input type="text" value={rarity} onChange={(e) => setRarity(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="Rare Holo" data-testid="input-edit-rarity" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Tipler (virgülle)</label>
              <input type="text" value={typesStr} onChange={(e) => setTypesStr(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="Fire, Fighting" data-testid="input-edit-types" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">HP</label>
              <input type="number" min="0" value={hp} onChange={(e) => setHp(e.target.value)}
                className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
                placeholder="120" data-testid="input-edit-hp" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Sanatçı</label>
            <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="Ken Sugimori" data-testid="input-edit-artist" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Görsel URL</label>
            <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="https://..." data-testid="input-edit-image" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Görsel URL (HiRes)</label>
            <input type="text" value={imageUrlHiRes} onChange={(e) => setImageUrlHiRes(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400"
              placeholder="https://..." data-testid="input-edit-image-hires" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">Açıklama</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 resize-none"
              data-testid="textarea-edit-description" />
          </div>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-[13px] border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 transition-colors">
            İptal
          </button>
          <button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !name}
            className="px-4 py-2 text-[13px] bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-edit-card-submit">
            {saveMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardRow({ card, games, allSets }: { card: AdminCard; games: Game[]; allSets: CardSet[] }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const updateMut = useMutation({
    mutationFn: (patch: { isActive?: boolean; isFeatured?: boolean; isNew?: boolean }) =>
      adminFetch(`/api/admin/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cards'] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/cards/${card.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cards'] }),
  });

  const Toggle = ({ value, onChange, testId }: { value: boolean; onChange: (v: boolean) => void; testId: string }) => (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-8 h-4 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-neutral-200'}`}
      data-testid={testId}>
      <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <>
      <tr className={`border-t border-neutral-100 hover:bg-neutral-50/50 transition-colors ${!card.is_active ? 'opacity-60' : ''}`}
        data-testid={`row-card-${card.id}`}>
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
          <Toggle value={card.is_active} onChange={(v) => updateMut.mutate({ isActive: v })} testId={`toggle-active-${card.id}`} />
        </td>
        <td className="px-4 py-3">
          <Toggle value={card.is_featured} onChange={(v) => updateMut.mutate({ isFeatured: v })} testId={`toggle-featured-${card.id}`} />
        </td>
        <td className="px-4 py-3">
          <Toggle value={card.is_new} onChange={(v) => updateMut.mutate({ isNew: v })} testId={`toggle-new-${card.id}`} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setExpanded((x) => !x)}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
              data-testid={`button-expand-${card.id}`}>
              Listingler {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button type="button" onClick={() => setShowEdit(true)}
              className="p-1.5 rounded-md hover:bg-blue-50 text-neutral-400 hover:text-blue-500 transition-colors"
              title="Kartı Düzenle" data-testid={`button-edit-card-${card.id}`}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button"
              onClick={() => { if (confirm(`"${card.name}" kartını ve tüm listinglerini silmek istediğinizden emin misiniz?`)) deleteMut.mutate(); }}
              disabled={deleteMut.isPending}
              className="p-1.5 rounded-md hover:bg-red-50 text-neutral-400 hover:text-red-500 disabled:opacity-50 transition-colors"
              title="Kartı Sil" data-testid={`button-delete-card-${card.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 pb-3">
            <CardListingsPanel cardId={card.id} onClose={() => setExpanded(false)} />
          </td>
        </tr>
      )}
      {showEdit && (
        <EditCardModal
          card={card}
          games={games}
          allSets={allSets}
          onClose={() => setShowEdit(false)}
        />
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
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);

  return (
    <div data-testid="tab-cards">
      {/* Header row with create button */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder="Kart ara..." value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
            data-testid="input-search-cards" />
        </div>
        <select value={gameId} onChange={(e) => { setGameId(e.target.value); setSetId(''); setPage(1); }}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="select-filter-game">
          <option value="">Tüm Oyunlar</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={setId} onChange={(e) => { setSetId(e.target.value); setPage(1); }}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="select-filter-set">
          <option value="">Tüm Setler</option>
          {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="text" placeholder="Rarity" value={rarity}
          onChange={(e) => { setRarity(e.target.value); setPage(1); }}
          className="text-[13px] border border-neutral-200 rounded-lg px-3 py-2 w-36 bg-white focus:outline-none focus:border-neutral-400"
          data-testid="input-filter-rarity" />
        <span className="text-[12px] text-neutral-500 ml-auto">{total.toLocaleString('tr-TR')} kart</span>
        <button type="button" onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors shrink-0"
          data-testid="button-new-card">
          <Plus className="w-3.5 h-3.5" /> Yeni Kart
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Kart</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Set</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Oyun</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500" title="Aktif / Toplam">Listing</th>
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
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-neutral-400">Yükleniyor...</td></tr>
            )}
            {isError && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-red-500">Kartlar yüklenemedi</td></tr>
            )}
            {!isLoading && !isError && cards.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-neutral-400">
                  Kart bulunamadı. Kart API Sync ile import edin ya da Yeni Kart ekleyin.
                </td>
              </tr>
            )}
            {cards.map((card) => <CardRow key={card.id} card={card} games={games} allSets={sets} />)}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-[12px] border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Önceki
          </button>
          <span className="text-[12px] text-neutral-600">{page} / {totalPages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-[12px] border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Sonraki →
          </button>
        </div>
      )}

      {/* Create Card Modal */}
      {showCreateModal && (
        <CreateCardModal
          games={games}
          allSets={sets}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
