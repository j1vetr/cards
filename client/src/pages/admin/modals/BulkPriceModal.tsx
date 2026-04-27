import { useState, useMemo } from 'react';
import type { Product, BulkPriceAction } from '../_shared/types';
import { Loader2 } from 'lucide-react';
import type { Category } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';

export default function BulkPriceModal({ 
  categories,
  products,
  onClose, 
  onSuccess 
}: { 
  categories: Category[];
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [filterMode, setFilterMode] = useState<'all' | 'category' | 'select'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name_asc' | 'price_asc' | 'price_desc'>('newest');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [priceAction, setPriceAction] = useState<'set' | 'increase' | 'decrease' | 'percent_increase' | 'percent_decrease'>('percent_decrease');
  const [priceValue, setPriceValue] = useState('');
  const [autoBadge, setAutoBadge] = useState(true);
  const [customBadgeText, setCustomBadgeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; updated?: number } | null>(null);

  const numericValue = parseFloat(priceValue) || 0;
  const isPercent = priceAction.includes('percent');
  const isDecrease = priceAction.includes('decrease');

  // Auto-badge text: computed from action+value, overridable
  const autoBadgeTextComputed = useMemo(() => {
    if (priceAction === 'percent_decrease' && numericValue > 0) {
      return `%${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1)}`;
    }
    return '';
  }, [priceAction, numericValue]);

  const badgeTextToSend = customBadgeText.trim() || autoBadgeTextComputed;

  // Show auto-badge toggle only for percent_decrease (makes semantic sense)
  const canAutoBadge = priceAction === 'percent_decrease';

  // Products visible in the list (for 'select' mode)
  const listProducts = useMemo(() => {
    let list = [...products];
    if (filterCategory) list = list.filter(p => p.categoryId === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    // Sort
    list.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name, 'tr');
        case 'price_asc':
          return parseFloat(a.basePrice) - parseFloat(b.basePrice);
        case 'price_desc':
          return parseFloat(b.basePrice) - parseFloat(a.basePrice);
        default:
          return 0;
      }
    });
    return list;
  }, [products, filterCategory, searchQuery, sortOrder]);

  // Products that will actually be updated
  const affectedProducts = useMemo(() => {
    if (filterMode === 'select') return products.filter(p => selectedProductIds.includes(p.id));
    if (filterMode === 'category') return filterCategory ? products.filter(p => p.categoryId === filterCategory) : [];
    return products;
  }, [filterMode, filterCategory, selectedProductIds, products]);

  const calcNewPrice = (currentPriceStr: string): number => {
    const current = parseFloat(currentPriceStr);
    if (isNaN(current)) return 0;
    let newPrice: number;
    switch (priceAction) {
      case 'set': newPrice = numericValue; break;
      case 'increase': newPrice = current + numericValue; break;
      case 'decrease': newPrice = Math.max(0, current - numericValue); break;
      case 'percent_increase': newPrice = current * (1 + numericValue / 100); break;
      case 'percent_decrease': newPrice = current * (1 - numericValue / 100); break;
      default: newPrice = current;
    }
    return Math.round(newPrice * 100) / 100;
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllVisible = () => {
    const visibleIds = listProducts.map(p => p.id);
    setSelectedProductIds(prev => {
      const existing = new Set(prev);
      visibleIds.forEach(id => existing.add(id));
      return Array.from(existing);
    });
  };

  const clearVisible = () => {
    const visibleIds = new Set(listProducts.map(p => p.id));
    setSelectedProductIds(prev => prev.filter(id => !visibleIds.has(id)));
  };

  const previewSamples = useMemo(() => {
    if (!priceValue || numericValue <= 0 || affectedProducts.length === 0) return [];
    return affectedProducts.slice(0, 5).map(p => ({
      name: p.name,
      before: parseFloat(p.basePrice),
      after: calcNewPrice(p.basePrice),
    }));
  }, [affectedProducts, priceAction, priceValue]);

  const handleSubmit = async () => {
    if (!priceValue || numericValue <= 0 || affectedProducts.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const body: { action: BulkPriceAction; value: number; categoryId?: string; productIds?: string[]; autoBadge?: boolean; badgeText?: string; discountBadge?: string | null } = { action: priceAction, value: numericValue };
      if (filterMode === 'select') {
        body.productIds = selectedProductIds;
      } else if (filterMode === 'category' && filterCategory) {
        body.categoryId = filterCategory;
      }
      // filterMode === 'all' → no filter, backend applies to all
      if (canAutoBadge && autoBadge && badgeTextToSend) {
        body.autoBadge = true;
        body.badgeText = badgeTextToSend;
      }

      const res = await fetch('/api/admin/products/bulk-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        const badgeInfo = (canAutoBadge && autoBadge && badgeTextToSend) ? ` · "${badgeTextToSend}" etiketi eklendi` : '';
        setResult({ success: true, message: `${data.updated} ürün güncellendi${badgeInfo}`, updated: data.updated });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = !isLoading && !!priceValue && numericValue > 0 && affectedProducts.length > 0 &&
    (filterMode !== 'category' || !!filterCategory) &&
    (filterMode !== 'select' || selectedProductIds.length > 0);

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Toplu Fiyat Düzenleme"
      description="Ürün seçin ve fiyat işlemi uygulayın"
      size="lg"
      testId="modal-bulk-price"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-neutral-500">
            {affectedProducts.length > 0 ? `${affectedProducts.length} ürün etkilenecek` : '—'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-neutral-100 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center gap-2"
              data-testid="button-apply-bulk-price"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Uygulanıyor...</>
              ) : (
                `${affectedProducts.length > 0 ? affectedProducts.length : ''} Ürüne Uygula`
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">

          {/* Step 1: Scope */}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              1 — Kapsam Seçin
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['all', 'Tüm Ürünler', `${products.length} ürün`],
                ['category', 'Kategoriye Göre', 'Kategori seç'],
                ['select', 'Tek Tek Seç', 'Manuel seçim'],
              ] as [typeof filterMode, string, string][]).map(([mode, label, sub]) => (
                <button
                  key={mode}
                  onClick={() => { setFilterMode(mode); setSelectedProductIds([]); setFilterCategory(''); setSearchQuery(''); }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    filterMode === mode
                      ? 'border-white/30 bg-white/8 text-neutral-900'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-zinc-600 hover:text-neutral-800'
                  }`}
                  data-testid={`button-filter-mode-${mode}`}
                >
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{mode === 'all' ? sub : sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Category filter (for 'category' mode) */}
          {filterMode === 'category' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Kategori</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-zinc-500"
                data-testid="select-bulk-price-category"
              >
                <option value="">— Kategori Seçin —</option>
                {categories.map(cat => {
                  const count = products.filter(p => p.categoryId === cat.id).length;
                  return <option key={cat.id} value={cat.id}>{cat.name} ({count} ürün)</option>;
                })}
              </select>
            </div>
          )}

          {/* Product selection list (for 'select' mode) */}
          {filterMode === 'select' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Ürün Seçin
                  {selectedProductIds.length > 0 && (
                    <span className="ml-2 text-neutral-900 bg-white/10 px-1.5 py-0.5 rounded text-[10px] normal-case">
                      {selectedProductIds.length} seçili
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={selectAllVisible} className="text-[10px] text-neutral-500 hover:text-neutral-900 transition-colors">
                    Tümünü Seç
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button onClick={clearVisible} className="text-[10px] text-neutral-500 hover:text-neutral-900 transition-colors">
                    Temizle
                  </button>
                </div>
              </div>

              {/* Filters row */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ürün ara..."
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-zinc-500"
                  data-testid="input-product-search"
                />
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-zinc-500 max-w-[150px]"
                  data-testid="select-filter-category"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-zinc-500 max-w-[145px]"
                  data-testid="select-sort-order"
                >
                  <option value="newest">↓ En Yeni</option>
                  <option value="oldest">↑ En Eski</option>
                  <option value="name_asc">A → Z</option>
                  <option value="price_asc">Fiyat ↑</option>
                  <option value="price_desc">Fiyat ↓</option>
                </select>
              </div>

              {/* Scrollable product list */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="max-h-52 overflow-y-auto divide-y divide-zinc-700/50">
                  {listProducts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-500">Ürün bulunamadı</div>
                  ) : listProducts.map((p) => {
                    const checked = selectedProductIds.includes(p.id);
                    const catName = categories.find(c => c.id === p.categoryId)?.name || '';
                    const price = parseFloat(p.basePrice);
                    const addedDate = p.createdAt ? new Date(p.createdAt) : null;
                    const isRecentlyAdded = addedDate && (Date.now() - addedDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
                    const dateLabel = addedDate ? addedDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-white/5' : 'hover:bg-neutral-50/60'}`}
                        data-testid={`label-product-${p.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          className="w-3.5 h-3.5 accent-white shrink-0"
                          data-testid={`checkbox-product-${p.id}`}
                        />
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-9 h-12 object-cover bg-neutral-200 rounded shrink-0" />
                        ) : (
                          <div className="w-9 h-12 bg-neutral-200 rounded shrink-0 flex items-center justify-center text-neutral-500 text-[9px]">IMG</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-neutral-900 truncate font-medium">{p.name}</p>
                            {isRecentlyAdded && (
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold shrink-0">YENİ</span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-0.5">{catName}{dateLabel ? ` · ${dateLabel}` : ''}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-neutral-900">{price.toLocaleString('tr-TR')} ₺</p>
                          {p.discountBadge && (
                            <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded">{p.discountBadge}</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Action + Value */}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              2 — Fiyat İşlemi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={priceAction}
                onChange={e => { setPriceAction(e.target.value as BulkPriceAction); setPriceValue(''); }}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-zinc-500"
                data-testid="select-price-action"
              >
                <option value="percent_decrease">% İndirim uygula</option>
                <option value="percent_increase">% Zam uygula</option>
                <option value="set">Sabit fiyat belirle</option>
                <option value="increase">TL artır</option>
                <option value="decrease">TL azalt</option>
              </select>
              <div className="relative">
                <input
                  type="number"
                  value={priceValue}
                  onChange={e => setPriceValue(e.target.value)}
                  placeholder={isPercent ? '20' : priceAction === 'set' ? '999' : '50'}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-zinc-500"
                  min="0"
                  max={isPercent ? '100' : undefined}
                  step={isPercent ? '1' : '0.01'}
                  data-testid="input-price-value"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs pointer-events-none">
                  {isPercent ? '%' : '₺'}
                </span>
              </div>
            </div>
          </div>

          {/* Auto-badge option — only for percent_decrease */}
          {canAutoBadge && (
            <div className={`rounded-lg border transition-colors ${autoBadge ? 'border-white/20 bg-white/4' : 'border-neutral-200 bg-neutral-50/40'}`}>
              <label className="flex items-center gap-3 px-3 py-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBadge}
                  onChange={e => { setAutoBadge(e.target.checked); setCustomBadgeText(''); }}
                  className="w-4 h-4 accent-white shrink-0"
                  data-testid="checkbox-auto-badge"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-900 font-medium">Otomatik indirim etiketi ekle</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Seçilen ürünlere uygulanan indirim oranını etiket olarak bassın</p>
                </div>
                {autoBadge && badgeTextToSend && (
                  <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shrink-0 rotate-[-2deg]">
                    {badgeTextToSend}
                  </div>
                )}
              </label>
              {autoBadge && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 shrink-0">Etiket metni:</span>
                  <input
                    type="text"
                    value={customBadgeText}
                    onChange={e => setCustomBadgeText(e.target.value)}
                    placeholder={autoBadgeTextComputed || '%20'}
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs text-neutral-900 focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
                    data-testid="input-badge-custom-text"
                  />
                  {customBadgeText && (
                    <button onClick={() => setCustomBadgeText('')} className="text-[10px] text-neutral-500 hover:text-neutral-900 shrink-0">
                      Sıfırla
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {previewSamples.length > 0 && (
            <div className="bg-neutral-50/60 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-neutral-200/50 flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Önizleme
                </p>
                <span className="text-[10px] text-neutral-500">{affectedProducts.length} ürün etkilenecek</span>
              </div>
              <div className="divide-y divide-zinc-700/40">
                {previewSamples.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <p className="text-xs text-neutral-700 truncate flex-1 mr-3">{s.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-neutral-500 line-through">{s.before.toLocaleString('tr-TR')} ₺</span>
                      <span className="text-[10px] text-neutral-400">→</span>
                      <span className={`text-xs font-semibold ${isDecrease ? 'text-emerald-400' : priceAction.includes('increase') ? 'text-blue-400' : 'text-neutral-900'}`}>
                        {s.after.toLocaleString('tr-TR')} ₺
                      </span>
                      {s.before > 0 && s.before !== s.after && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDecrease ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'}`}>
                          {isDecrease ? '-' : '+'}{Math.abs(((s.after - s.before) / s.before) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {affectedProducts.length > 5 && (
                  <div className="px-3 py-2 text-center">
                    <span className="text-xs text-neutral-400">+{affectedProducts.length - 5} ürün daha</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Roundtrip warning */}
          {isPercent && priceValue && numericValue > 0 && (
            <div className="flex items-start gap-2 p-3 bg-neutral-900/5 border border-neutral-900/20 rounded-lg">
              <span className="text-neutral-900 text-xs mt-0.5">⚠</span>
              <p className="text-xs text-neutral-900/80">
                %{numericValue} {isDecrease ? 'indirim' : 'zam'} sonrası geri almak için{' '}
                {isDecrease
                  ? `%${(numericValue / (100 - numericValue) * 100).toFixed(2)} zam`
                  : `%${(numericValue / (100 + numericValue) * 100).toFixed(2)} indirim`} gerekir.
              </p>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {result.message}
            </div>
          )}
      </div>
    </AdminModal>
  );
}
