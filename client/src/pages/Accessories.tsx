import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';

interface AccessoryProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  categoryId: string;
  categoryIds?: string[];
  sku?: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const ACCESSORY_SLUGS = ['binder', 'sleeve', 'playmat'];

const CATEGORY_INFO: Record<string, { label: string; description: string; color: string }> = {
  binder: {
    label: 'Binder (Kart Albümü)',
    description: 'Kartlarınızı güvenle saklayın ve sergileyin.',
    color: '#4f46e5',
  },
  sleeve: {
    label: 'Sleeve (Kart Koruyucu)',
    description: 'Kartlarınızı oyun masasında koruyun.',
    color: '#0891b2',
  },
  playmat: {
    label: 'Playmat (Oyun Matı)',
    description: 'Rahat ve şık bir oyun alanı oluşturun.',
    color: '#059669',
  },
};

function formatPrice(val: string): string {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
}

function ProductCard({ product }: { product: AccessoryProduct }) {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await addToCart(product.id, undefined, 1);
      toast({ title: 'Sepete eklendi', description: product.name });
    } catch {
      toast({ title: 'Hata', description: 'Ürün sepete eklenemedi.', variant: 'destructive' });
    }
  };

  return (
    <Link href={`/urun/${product.slug}`} data-testid={`card-accessory-${product.id}`}>
      <div className="group rounded-xl overflow-hidden border transition-all duration-200 hover:border-indigo-500/40"
        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="relative aspect-square overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {product.images && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.15)' }} />
            </div>
          )}
          {product.isNew && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-indigo-500 text-white rounded-full">
              Yeni
            </span>
          )}
        </div>
        <div className="p-4">
          <p className="text-[13px] font-semibold text-white leading-tight line-clamp-2 mb-2">{product.name}</p>
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold text-indigo-400">{formatPrice(product.basePrice)}</span>
            <button
              onClick={handleAdd}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-indigo-500/20 transition-colors"
              data-testid={`button-add-cart-${product.id}`}
              title="Sepete Ekle"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Accessories() {
  const [activeFilter, setActiveFilter] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('cat');
    }
    return null;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    if (cat && ACCESSORY_SLUGS.includes(cat)) setActiveFilter(cat);
  }, []);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const accessoryCategories = categories.filter((c) => ACCESSORY_SLUGS.includes(c.slug));

  const { data: allProducts = [], isLoading } = useQuery<AccessoryProduct[]>({
    queryKey: ['products', 'accessories'],
    queryFn: async () => {
      const ids = accessoryCategories.map((c) => c.id);
      if (ids.length === 0) return [];
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/products?categoryId=${id}&limit=100`)
            .then((r) => r.json())
            .then((d) => (d.products || []) as AccessoryProduct[])
        )
      );
      const seen = new Set<string>();
      return results.flat().filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return p.isActive;
      });
    },
    enabled: accessoryCategories.length > 0,
  });

  const getCategorySlug = (product: AccessoryProduct): string | null => {
    const ids = product.categoryIds && product.categoryIds.length > 0
      ? product.categoryIds
      : product.categoryId ? [product.categoryId] : [];
    for (const id of ids) {
      const cat = accessoryCategories.find((c) => c.id === id);
      if (cat) return cat.slug;
    }
    return null;
  };

  const filteredProducts = activeFilter
    ? allProducts.filter((p) => getCategorySlug(p) === activeFilter)
    : allProducts;

  const groupedByCategory = ACCESSORY_SLUGS.map((slug) => {
    const cat = accessoryCategories.find((c) => c.slug === slug);
    const info = CATEGORY_INFO[slug];
    const products = activeFilter
      ? filteredProducts.filter((p) => getCategorySlug(p) === slug)
      : allProducts.filter((p) => getCategorySlug(p) === slug);
    return { slug, cat, info, products };
  }).filter((g) => g.cat);

  return (
    <div className="min-h-screen" style={{ background: '#0c1220' }}>
      <Header />

      <main className="max-w-[1440px] mx-auto px-5 lg:px-10 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Aksesuarlar</h1>
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Kart albümleri, koruyucular ve oyun matları
          </p>
        </div>

        {/* Filter tabs */}
        {accessoryCategories.length > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-colors ${
                activeFilter === null
                  ? 'bg-indigo-500 text-white'
                  : 'text-white/60 hover:text-white border border-white/10 hover:border-white/20'
              }`}
              data-testid="filter-all"
            >
              Tümü
            </button>
            {ACCESSORY_SLUGS.map((slug) => {
              const info = CATEGORY_INFO[slug];
              if (!info) return null;
              return (
                <button
                  key={slug}
                  onClick={() => setActiveFilter(activeFilter === slug ? null : slug)}
                  className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-colors ${
                    activeFilter === slug
                      ? 'bg-indigo-500 text-white'
                      : 'text-white/60 hover:text-white border border-white/10 hover:border-white/20'
                  }`}
                  data-testid={`filter-${slug}`}
                >
                  {info.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="w-12 h-12 mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-[15px] font-semibold text-white/60 mb-1">Henüz ürün yok</p>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Yakında aksesuar ürünleri eklenecek.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedByCategory.map(({ slug, info, products }) => {
              if (activeFilter && activeFilter !== slug) return null;
              if (products.length === 0 && !activeFilter) return null;
              if (products.length === 0) return (
                <div key={slug} className="text-center py-10">
                  <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Bu kategoride ürün bulunamadı.</p>
                </div>
              );
              return (
                <section key={slug} data-testid={`section-${slug}`}>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-1 h-8 rounded-full shrink-0 mt-1" style={{ background: info?.color || '#4f46e5' }} />
                    <div>
                      <h2 className="text-[17px] font-bold text-white">{info?.label}</h2>
                      <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{info?.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
