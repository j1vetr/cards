import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShoppingBag } from 'lucide-react';
import type { Product, Category, WholesaleSeries } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';
import {
  PrimaryButton,
  GhostButton,
  SectionHeading,
  TextInput,
  SelectInput,
  SearchInput,
  InlineAlert,
  StatusBadge,
} from '../_ui/AdminUI';

export default function BulkWholesaleModal({
  products,
  categories,
  onClose,
  onSuccess,
  preselectedProductIds,
}: {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
  preselectedProductIds?: string[];
}) {
  const hasPreselection = (preselectedProductIds?.length ?? 0) > 0;

  const [filterMode, setFilterMode] = useState<'all' | 'category' | 'select'>(
    hasPreselection ? 'select' : 'select',
  );
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    hasPreselection ? [...preselectedProductIds!] : [],
  );

  const [wholesaleSeries, setWholesaleSeries] = useState<WholesaleSeries[]>([]);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(true);
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleSeriesId, setWholesaleSeriesId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/wholesale-series', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setWholesaleSeries(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const listProducts = useMemo(() => {
    let list = [...products];
    if (filterCategory) list = list.filter((p) => p.categoryId === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, filterCategory, searchQuery]);

  const affectedProducts = useMemo(() => {
    if (filterMode === 'select') return products.filter((p) => selectedProductIds.includes(p.id));
    if (filterMode === 'category')
      return filterCategory ? products.filter((p) => p.categoryId === filterCategory) : [];
    return products;
  }, [filterMode, filterCategory, selectedProductIds, products]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    const visibleIds = listProducts.map((p) => p.id);
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearVisible = () => {
    const visibleIds = new Set(listProducts.map((p) => p.id));
    setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const handleSubmit = async () => {
    if (affectedProducts.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const ids =
        filterMode === 'select' ? selectedProductIds : affectedProducts.map((p) => p.id);
      const body = {
        productIds: ids,
        wholesaleEnabled,
        wholesalePrice: wholesaleEnabled && wholesalePrice ? wholesalePrice : null,
        wholesaleSeriesId: wholesaleEnabled && wholesaleSeriesId ? wholesaleSeriesId : null,
      };
      const res = await fetch('/api/admin/products/bulk-wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        setResult({ success: true, message: `${data.updated} ürün güncellendi` });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    !isLoading &&
    affectedProducts.length > 0 &&
    (filterMode !== 'category' || !!filterCategory) &&
    (filterMode !== 'select' || selectedProductIds.length > 0) &&
    (!wholesaleEnabled || !!wholesalePrice);

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Toptan Satış Ayarları"
      description="Ürünleri seçin, toptan fiyat ve seri bilgilerini toplu belirleyin."
      size="lg"
      testId="modal-bulk-wholesale"
      footer={
        <>
          <p className="mr-auto text-[12px] text-neutral-500 tabular-nums">
            {affectedProducts.length > 0 ? `${affectedProducts.length} ürün etkilenecek` : '—'}
          </p>
          <GhostButton onClick={onClose}>İptal</GhostButton>
          <PrimaryButton
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="button-apply-bulk-wholesale"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uygulanıyor…
              </>
            ) : (
              `${affectedProducts.length || ''} Ürüne Uygula`.trim()
            )}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        {/* Kapsam */}
        <section>
          <SectionHeading number={1} title="Kapsam" />
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['all', 'Tüm Ürünler', `${products.length} ürün`],
                ['category', 'Kategoriye Göre', 'Kategori seç'],
                ['select', 'Tek Tek Seç', 'Manuel seçim'],
              ] as [typeof filterMode, string, string][]
            ).map(([mode, label, sub]) => (
              <button
                key={mode}
                onClick={() => {
                  setFilterMode(mode);
                  if (mode !== 'select') setSelectedProductIds([]);
                  setFilterCategory('');
                  setSearchQuery('');
                }}
                className={`p-2.5 rounded-md border text-left transition-colors ${
                  filterMode === mode
                    ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
                data-testid={`button-filter-mode-${mode}`}
              >
                <p className="text-[12px] font-semibold">{label}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        </section>

        {filterMode === 'category' && (
          <section>
            <SectionHeading title="Kategori" />
            <SelectInput
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full"
              data-testid="select-bulk-wholesale-category"
            >
              <option value="">— Kategori Seçin —</option>
              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({count} ürün)
                  </option>
                );
              })}
            </SelectInput>
          </section>
        )}

        {filterMode === 'select' && (
          <section>
            <div className="flex items-center justify-between mb-2 gap-2">
              <SectionHeading title="Ürün Seçin" />
              <div className="flex items-center gap-2 text-[11px]">
                {selectedProductIds.length > 0 && (
                  <span className="text-neutral-700 tabular-nums">
                    {selectedProductIds.length} seçili
                  </span>
                )}
                <button
                  onClick={selectAllVisible}
                  className="text-neutral-500 hover:text-neutral-900"
                >
                  Tümünü Seç
                </button>
                <span className="text-neutral-300">·</span>
                <button
                  onClick={clearVisible}
                  className="text-neutral-500 hover:text-neutral-900"
                >
                  Temizle
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ürün ara…"
                data-testid="input-wholesale-product-search"
              />
              <SelectInput
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full"
                data-testid="select-wholesale-filter-category"
              >
                <option value="">Tüm kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </SelectInput>
            </div>

            <div className="border border-neutral-200 rounded-md overflow-hidden bg-white">
              <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100">
                {listProducts.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-neutral-500">
                    Ürün bulunamadı
                  </div>
                ) : (
                  listProducts.map((p) => {
                    const checked = selectedProductIds.includes(p.id);
                    const catName = categories.find((c) => c.id === p.categoryId)?.name || '';
                    const price = parseFloat(p.basePrice || '0');
                    const currentSeries = wholesaleSeries.find(
                      (s) => s.id === p.wholesaleSeriesId,
                    );
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                          checked ? 'bg-neutral-50' : 'hover:bg-neutral-50/60'
                        }`}
                        data-testid={`label-wholesale-product-${p.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          className="w-3.5 h-3.5 accent-neutral-900 shrink-0"
                          data-testid={`checkbox-wholesale-product-${p.id}`}
                        />
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-9 h-12 object-cover bg-neutral-100 rounded shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-12 bg-neutral-100 rounded shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[12px] text-neutral-900 truncate font-medium">
                              {p.name}
                            </p>
                            {p.wholesaleEnabled && (
                              <StatusBadge tone="blue">Toptan Açık</StatusBadge>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {catName}
                            {currentSeries ? ` · ${currentSeries.name}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] font-semibold text-neutral-900 tabular-nums">
                            {price.toLocaleString('tr-TR')} ₺
                          </p>
                          {p.wholesalePrice && (
                            <p className="text-[11px] text-blue-600 tabular-nums">
                              T: {parseFloat(p.wholesalePrice).toLocaleString('tr-TR')} ₺
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {/* Toptan Ayarları */}
        <section>
          <SectionHeading number={2} title="Toptan Ayarları" />

          {/* Aç / Kapat toggle */}
          <div className="border border-neutral-200 rounded-md overflow-hidden bg-white mb-3">
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wholesaleEnabled}
                onChange={(e) => setWholesaleEnabled(e.target.checked)}
                className="w-3.5 h-3.5 accent-neutral-900 shrink-0"
                data-testid="checkbox-wholesale-enabled"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-neutral-900 font-medium flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  Toptan satışa aç
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {wholesaleEnabled
                    ? 'Seçili ürünler toptan satış için aktif edilecek.'
                    : 'Seçili ürünlerin toptan satışı kapatılacak.'}
                </p>
              </div>
              <StatusBadge tone={wholesaleEnabled ? 'blue' : 'neutral'}>
                {wholesaleEnabled ? 'Açık' : 'Kapalı'}
              </StatusBadge>
            </label>
          </div>

          {wholesaleEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Toptan fiyat */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Toptan Birim Fiyat (₺) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <TextInput
                    type="number"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="pr-6"
                    data-testid="input-wholesale-price"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[12px] pointer-events-none">
                    ₺
                  </span>
                </div>
              </div>

              {/* Seri */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Toptan Serisi (opsiyonel)
                </label>
                <SelectInput
                  value={wholesaleSeriesId}
                  onChange={(e) => setWholesaleSeriesId(e.target.value)}
                  className="w-full"
                  data-testid="select-wholesale-series"
                >
                  <option value="">— Seri Seçin —</option>
                  {wholesaleSeries
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </SelectInput>
              </div>
            </div>
          )}
        </section>

        {/* Özet önizleme */}
        {affectedProducts.length > 0 && wholesaleEnabled && wholesalePrice && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <SectionHeading title="Özet" />
              <span className="text-[11px] text-neutral-500 tabular-nums">
                {affectedProducts.length} ürün
              </span>
            </div>
            <div className="border border-neutral-200 rounded-md overflow-hidden bg-white">
              <div className="divide-y divide-neutral-100">
                {affectedProducts.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2">
                    <p className="text-[12px] text-neutral-700 truncate flex-1 mr-3">{p.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.wholesalePrice && (
                        <span className="text-[11px] text-neutral-400 line-through tabular-nums">
                          {parseFloat(p.wholesalePrice).toLocaleString('tr-TR')} ₺
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-300">→</span>
                      <span className="text-[12px] font-semibold text-blue-600 tabular-nums">
                        {parseFloat(wholesalePrice).toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>
                ))}
                {affectedProducts.length > 5 && (
                  <div className="px-3 py-2 text-center">
                    <span className="text-[11px] text-neutral-500">
                      +{affectedProducts.length - 5} ürün daha
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {result && (
          <InlineAlert tone={result.success ? 'success' : 'error'}>{result.message}</InlineAlert>
        )}
      </div>
    </AdminModal>
  );
}
