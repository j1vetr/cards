import { useState, useMemo } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import type { Category, Product } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';

export default function BulkBadgeModal({
  products,
  categories,
  onClose,
  onSuccess,
}: {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [badgeText, setBadgeText] = useState('%20');
  const [filterMode, setFilterMode] = useState<'all' | 'category' | 'select'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const filteredProducts = filterMode === 'category' && selectedCategoryId
    ? products.filter(p => p.categoryId === selectedCategoryId || p.categoryIds?.includes(selectedCategoryId))
    : products;

  const targetIds = filterMode === 'select'
    ? selectedProductIds
    : filterMode === 'category'
      ? (selectedCategoryId ? filteredProducts.map(p => p.id) : [])
      : products.map(p => p.id);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApply = async () => {
    if (targetIds.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/products/bulk-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds: targetIds, badge: badgeText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        setResult({ success: true, message: `${data.updated} ürüne etiket eklendi` });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (targetIds.length === 0) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/products/bulk-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds: targetIds, badge: '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Hata oluştu' });
      } else {
        setResult({ success: true, message: `${data.updated} üründen etiket kaldırıldı` });
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setIsLoading(false);
    }
  };

  const presets = ['%10', '%15', '%20', '%25', '%30', '%40', '%50', 'KAMPANYA', 'SON FIRSAT', 'YENİ SEZON'];

  return (
    <AdminModal
      open
      onClose={onClose}
      title={
        <>
          <Tag className="w-4 h-4 text-orange-500" />
          Toplu Etiket Yönetimi
        </>
      }
      size="md"
      testId="modal-bulk-badge"
    >

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Etiket Metni</label>
            <input
              type="text"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="%20"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2 text-neutral-900"
              data-testid="input-badge-text"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBadgeText(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    badgeText === preset
                      ? 'bg-orange-500 text-white'
                      : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                  }`}
                  data-testid={`button-preset-${preset}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Önizleme</label>
            <div className="bg-neutral-50 rounded-lg p-4 flex items-center justify-center">
              <div className="relative w-32 h-40 bg-neutral-200 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-xs">Ürün</div>
                {badgeText && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg transform -rotate-2">
                    {badgeText}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Uygulama Kapsamı</label>
            <div className="flex gap-2">
              {[
                { key: 'all' as const, label: 'Tüm Ürünler' },
                { key: 'category' as const, label: 'Kategoriye Göre' },
                { key: 'select' as const, label: 'Seçim Yap' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilterMode(opt.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${
                    filterMode === opt.key
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'bg-neutral-50 text-neutral-500 border border-neutral-200 hover:bg-neutral-200'
                  }`}
                  data-testid={`button-filter-${opt.key}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filterMode === 'category' && (
            <div>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2 text-neutral-900"
                data-testid="select-badge-category"
              >
                <option value="">Kategori seçin...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {filterMode === 'select' && (
            <div className="max-h-48 overflow-y-auto space-y-1 bg-neutral-50 border border-neutral-200 rounded-lg p-2">
              {products.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedProductIds.includes(p.id) ? 'bg-orange-500/10' : 'hover:bg-neutral-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded border-zinc-600 text-orange-500 focus:ring-orange-500"
                  />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {p.images?.[0] && (
                      <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                    )}
                    <span className="text-sm text-neutral-900 truncate">{p.name}</span>
                    {p.discountBadge && (
                      <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">{p.discountBadge}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="text-sm text-neutral-500">
            {targetIds.length} ürün seçildi
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.success
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              {result.message}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-200 flex justify-between">
          <button
            onClick={handleRemove}
            disabled={isLoading || targetIds.length === 0}
            className="px-4 py-2 bg-neutral-50 text-red-400 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 border border-neutral-200 text-sm font-medium"
            data-testid="button-remove-badge"
          >
            Etiketleri Kaldır
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-50 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleApply}
              disabled={isLoading || targetIds.length === 0 || !badgeText}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-500 hover:to-red-500 transition-colors disabled:opacity-50 font-medium"
              data-testid="button-apply-badge"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Etiketi Uygula'}
            </button>
          </div>
        </div>
    </AdminModal>
  );
}
