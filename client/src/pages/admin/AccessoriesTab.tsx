import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Package, ImageIcon, Search } from 'lucide-react';
import type { Product, Category, ProductDraft } from './_shared/types';
import {
  PageHeader,
  Card,
  EmptyState,
  LoadingState,
  InlineAlert,
  SearchInput,
  PrimaryButton,
  StatusBadge,
} from './_ui/AdminUI';
import ProductModal from './modals/ProductModal';

const ACCESSORY_SLUGS = ['binder', 'sleeve', 'playmat'];

const CATEGORY_LABELS: Record<string, string> = {
  binder: 'Binder',
  sleeve: 'Sleeve',
  playmat: 'Playmat',
};

function formatPrice(val: string | number): string {
  const n = typeof val === 'number' ? val : parseFloat(val as string);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
}

async function adminFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AccessoriesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | ProductDraft | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminFetch('/api/categories'),
  });

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: () => adminFetch('/api/admin/products'),
  });

  const accessoryCategories = allCategories.filter((c) => ACCESSORY_SLUGS.includes(c.slug));
  const accessoryCategoryIds = new Set(accessoryCategories.map((c) => c.id));

  const products = allProducts.filter((p) => {
    if (p.categoryIds && p.categoryIds.length > 0) {
      return p.categoryIds.some((id) => accessoryCategoryIds.has(id));
    }
    return accessoryCategoryIds.has(p.categoryId);
  });

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      if (product.id) {
        return adminFetch(`/api/admin/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        });
      }
      return adminFetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      setShowModal(false);
      setEditingProduct(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const getCategoryName = (product: Product) => {
    const ids = product.categoryIds && product.categoryIds.length > 0
      ? product.categoryIds
      : product.categoryId ? [product.categoryId] : [];
    const names = ids
      .map((id) => {
        const cat = allCategories.find((c) => c.id === id);
        return cat ? (CATEGORY_LABELS[cat.slug] || cat.name) : null;
      })
      .filter(Boolean);
    return names.join(', ') || '—';
  };

  const openNew = () => {
    const defaultCat = accessoryCategories.find((c) => c.slug === 'binder') || accessoryCategories[0];
    setEditingProduct({
      name: '',
      slug: '',
      description: '',
      sku: '',
      basePrice: '',
      categoryId: defaultCat?.id || '',
      categoryIds: defaultCat ? [defaultCat.id] : [],
      images: [],
      attributes: {},
      isActive: true,
      isFeatured: false,
      isNew: false,
    } as ProductDraft);
    setShowModal(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aksesuarlar"
        description="Binder, sleeve ve playmat ürünlerini yönetin."
        actions={
          <PrimaryButton onClick={openNew} data-testid="button-new-accessory">
            <Plus className="w-3.5 h-3.5" />
            Yeni Ürün
          </PrimaryButton>
        }
      />

      {error && (
        <InlineAlert tone="error" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ürün adı veya SKU ara…"
          data-testid="input-search-accessories"
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aksesuar ürün yok"
            description={search ? 'Aramanızla eşleşen ürün bulunamadı.' : 'İlk aksesuar ürününü eklemek için "Yeni Ürün" butonuna tıklayın.'}
            action={!search ? { label: 'Yeni Ürün Ekle', onClick: openNew } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Ürün</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Kategori</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">SKU</th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Fiyat</th>
                  <th className="text-center py-3 px-4 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Durum</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-neutral-50 transition-colors" data-testid={`row-accessory-${product.id}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0 flex items-center justify-center">
                          {product.images && product.images[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-neutral-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-neutral-900 leading-tight">{product.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-[12px] text-neutral-600">{getCategoryName(product)}</span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="text-[11px] text-neutral-400 font-mono">{product.sku || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[13px] font-semibold text-neutral-900">{formatPrice(product.basePrice)}</span>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <StatusBadge tone={product.isActive ? 'green' : 'neutral'}>
                        {product.isActive ? 'Aktif' : 'Pasif'}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingProduct(product); setShowModal(true); }}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
                          data-testid={`button-edit-accessory-${product.id}`}
                          title="Düzenle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`"${product.name}" ürününü silmek istediğinizden emin misiniz?`)) {
                              deleteMutation.mutate(product.id);
                            }
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          data-testid={`button-delete-accessory-${product.id}`}
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <ProductModal
          product={editingProduct}
          categories={accessoryCategories}
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
          onSave={(product) => saveMutation.mutate(product)}
          isSaving={saveMutation.isPending}
        />
      )}
    </div>
  );
}
