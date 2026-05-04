import { useState, useMemo } from 'react';
import { Download, Percent, ImageIcon, Loader2, Search } from 'lucide-react';
import type { Product, Category } from './_shared/types';
import {
  PageHeader,
  Card,
  LoadingState,
  PrimaryButton,
  SelectInput,
} from './_ui/AdminUI';

interface WholesaleTabProps {
  products: Product[];
  categories: Category[];
  productsLoading?: boolean;
}

const PRESET_RATES = [10, 15, 20, 25, 30, 40, 50];

function formatPrice(value: string | number): string {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WholesaleTab({
  products,
  categories,
  productsLoading,
}: WholesaleTabProps) {
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.isActive);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = activeProducts;
    if (categoryFilter !== 'all') {
      list = list.filter(
        (p) =>
          p.categoryId === categoryFilter ||
          (p.categoryIds || []).includes(categoryFilter),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeProducts, categoryFilter, search]);

  const calcDiscounted = (basePrice: string) => {
    const base = parseFloat(basePrice);
    if (Number.isNaN(base) || discountRate <= 0) return base;
    return base * (1 - discountRate / 100);
  };

  const handleDownloadPdf = async () => {
    if (filteredProducts.length === 0) return;
    setDownloading(true);
    try {
      const productIds = filteredProducts.map((p) => p.id);
      const res = await fetch('/api/admin/wholesale/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          discountRate,
          categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
          productIds,
        }),
      });
      if (!res.ok) throw new Error('PDF indirilemedi');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Toptan-Fiyat-Listesi-${discountRate}%-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF indirme hatası: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setDownloading(false);
    }
  };

  if (productsLoading) {
    return <LoadingState message="Ürünler yükleniyor..." />;
  }

  const categoryName =
    categoryFilter !== 'all'
      ? categories.find((c) => c.id === categoryFilter)?.name || ''
      : 'Tüm Kategoriler';

  return (
    <div data-testid="tab-wholesale" className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Toptan Satış"
        description={`${filteredProducts.length} ürün listeleniyor`}
        actions={
          <PrimaryButton
            onClick={handleDownloadPdf}
            disabled={downloading || filteredProducts.length === 0}
            data-testid="button-download-wholesale-pdf"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloading ? 'Hazırlanıyor...' : 'PDF İndir'}
          </PrimaryButton>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-neutral-700 mb-2">
              <Percent className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              İndirim Oranı (%)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={99}
                value={discountRate || ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setDiscountRate(Number.isNaN(v) ? 0 : Math.min(99, Math.max(0, v)));
                }}
                placeholder="0"
                className="w-20 h-9 px-3 border border-neutral-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                data-testid="input-discount-rate"
              />
              {PRESET_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setDiscountRate(rate)}
                  className={`h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                    discountRate === rate
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                  data-testid={`button-preset-${rate}`}
                >
                  %{rate}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Ürün adı veya SKU ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 border border-neutral-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                data-testid="input-wholesale-search"
              />
            </div>
            <SelectInput
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              data-testid="select-wholesale-category"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
      </Card>

      {discountRate > 0 && (
        <Card className="p-3 sm:p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-[13px] text-amber-800">
            <Percent className="w-4 h-4 shrink-0" />
            <span>
              <strong>%{discountRate}</strong> indirim uygulanıyor
              {categoryFilter !== 'all' && (
                <> · <strong>{categoryName}</strong> kategorisi</>
              )}
              {' · '}
              {filteredProducts.length} ürün
            </span>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Ürün</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden sm:table-cell">Kategori</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-500">Liste Fiyatı</th>
                {discountRate > 0 && (
                  <>
                    <th className="text-right px-4 py-3 font-medium text-neutral-500">İndirimli</th>
                    <th className="text-center px-4 py-3 font-medium text-neutral-500">Tasarruf</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, idx) => {
                const base = parseFloat(product.basePrice);
                const discounted = calcDiscounted(product.basePrice);
                const saving = base - discounted;
                const catNames = (product.categoryIds?.length
                  ? product.categoryIds
                  : product.categoryId
                  ? [product.categoryId]
                  : []
                )
                  .map((id) => categories.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(', ');

                return (
                  <tr
                    key={product.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                    data-testid={`row-wholesale-product-${product.id}`}
                  >
                    <td className="px-4 py-3 text-neutral-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-md border border-neutral-200 bg-neutral-50 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md border border-neutral-200 bg-neutral-50 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4 text-neutral-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 truncate max-w-[200px] sm:max-w-[300px]">
                            {product.name}
                          </p>
                          {product.sku && (
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 hidden sm:table-cell">
                      {catNames || '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={
                          discountRate > 0
                            ? 'line-through text-neutral-400'
                            : 'font-medium text-neutral-900'
                        }
                      >
                        {formatPrice(base)} ₺
                      </span>
                    </td>
                    {discountRate > 0 && (
                      <>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-emerald-700">
                          {formatPrice(discounted)} ₺
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                            -{formatPrice(saving)} ₺
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={discountRate > 0 ? 6 : 4}
                    className="px-4 py-12 text-center text-neutral-400"
                  >
                    Gösterilecek ürün bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
