import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Package, Search, Box } from 'lucide-react';
import type { Product, ProductDraft, Category } from './_shared/types';
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

interface CardGame {
  id: string;
  name: string;
  slug: string;
}

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

export default function BoxesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | ProductDraft | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNewGame, setSelectedNewGame] = useState<string>('');

  const { data: games = [] } = useQuery<CardGame[]>({
    queryKey: ['card-games'],
    queryFn: () => adminFetch('/api/card-games'),
  });

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminFetch('/api/categories'),
  });

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: () => adminFetch('/api/admin/products'),
  });

  const boxes = allProducts.filter((p) => p.productType === 'box');

  const filtered = boxes.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()),
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

  const getGameName = (product: Product) => {
    if (!product.gameId) return null;
    return games.find((g) => g.id === product.gameId)?.name ?? null;
  };

  const openNew = () => {
    const defaultGameId = selectedNewGame || games[0]?.id || '';
    setEditingProduct({
      name: '',
      slug: '',
      description: '',
      sku: '',
      basePrice: '',
      categoryId: '',
      categoryIds: [],
      images: [],
      attributes: {},
      isActive: true,
      isFeatured: false,
      isNew: false,
      productType: 'box',
      gameId: defaultGameId,
    } as ProductDraft);
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  return (
    <>
      <PageHeader
        title="Box & Sealed Ürünler"
        description="Booster box, Elite Trainer Box ve diğer sealed ürünleri yönetin."
        actions={
          <PrimaryButton
            onClick={openNew}
            data-testid="btn-add-box"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni Box Ekle
          </PrimaryButton>
        }
      />

      {error && (
        <div className="mb-4">
          <InlineAlert tone="error">{error}</InlineAlert>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-neutral-100">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Box ara..."
            data-testid="input-box-search"
          />
          <span className="text-[12px] text-neutral-400 whitespace-nowrap">
            {filtered.length} ürün
          </span>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Box}
            title={search ? 'Arama sonucu bulunamadı' : 'Henüz box ürünü eklenmemiş'}
            description={search ? undefined : 'Yeni Box Ekle butonuna tıklayarak başlayın.'}
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((product) => {
              const gameName = getGameName(product);
              const img = product.images?.[0];
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                  data-testid={`row-box-${product.id}`}
                >
                  <div className="w-10 h-10 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
                    {img ? (
                      <img src={img} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-neutral-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-neutral-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {gameName && (
                        <span className="text-[11px] text-indigo-600 font-medium">{gameName}</span>
                      )}
                      {product.sku && (
                        <span className="text-[11px] text-neutral-400">{product.sku}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[13px] font-semibold text-neutral-900 tabular-nums">
                      {formatPrice(product.basePrice)}
                    </span>
                    {product.stock === 0 ? (
                      <span
                        data-testid={`badge-stock-${product.id}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700"
                      >
                        Tükendi
                      </span>
                    ) : (
                      <span
                        data-testid={`badge-stock-${product.id}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                          product.stock <= 5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {product.stock} adet
                      </span>
                    )}
                    <StatusBadge tone={product.isActive ? 'emerald' : 'neutral'}>
                      {product.isActive ? 'Aktif' : 'Pasif'}
                    </StatusBadge>
                    <button
                      data-testid={`btn-edit-box-${product.id}`}
                      onClick={() => openEdit(product)}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                      title="Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      data-testid={`btn-delete-box-${product.id}`}
                      onClick={() => {
                        if (confirm(`"${product.name}" silinsin mi?`)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showModal && editingProduct !== null && (
        <ProductModal
          product={editingProduct}
          categories={allCategories}
          games={games}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSave={(product) => {
            saveMutation.mutate({ ...product, productType: 'box' });
          }}
          isSaving={saveMutation.isPending}
        />
      )}
    </>
  );
}
