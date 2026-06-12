import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link, useParams, useLocation, useSearch } from 'wouter';
import { ChevronRight, ChevronLeft, X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts, useCategories, useFacets, type ProductFilters } from '@/hooks/useProducts';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LIMIT = 24;

const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşük → Yüksek' },
  { value: 'price_desc', label: 'Fiyat: Yüksek → Düşük' },
  { value: 'popular', label: 'En Popüler' },
];

export default function Category() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || '';
  const searchStr = useSearch();
  const [, navigate] = useLocation();

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const category = categories.find(c => c.slug === slug);

  const urlParams = new URLSearchParams(searchStr);
  const sort = (urlParams.get('sort') as ProductFilters['sort']) || 'newest';
  const page = Math.max(1, parseInt(urlParams.get('page') || '1', 10));
  const urlMinPrice = parseInt(urlParams.get('minPrice') || '0', 10);
  const urlMaxPrice = parseInt(urlParams.get('maxPrice') || '10000', 10);
  const selectedSizes = urlParams.get('sizes')?.split(',').filter(Boolean) || [];
  const selectedColors = urlParams.get('colors')?.split(',').filter(Boolean) || [];
  const selectedFits = urlParams.get('fits')?.split(',').filter(Boolean) || [];
  const showOnlyNew = urlParams.get('new') === '1';
  const showOnlyDiscounted = urlParams.get('discounted') === '1';

  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([urlMinPrice, urlMaxPrice]);
  const [filterOpen, setFilterOpen] = useState(false);

  const basePath = `/kategori/${slug}`;

  // Sync slider with URL changes (back/forward)
  useEffect(() => {
    setLocalPriceRange([urlMinPrice, urlMaxPrice]);
  }, [urlMinPrice, urlMaxPrice]);

  // Debounce price slider → URL
  useEffect(() => {
    if (localPriceRange[0] === urlMinPrice && localPriceRange[1] === urlMaxPrice) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchStr);
      if (localPriceRange[0] > 0) p.set('minPrice', String(localPriceRange[0]));
      else p.delete('minPrice');
      if (localPriceRange[1] < 10000) p.set('maxPrice', String(localPriceRange[1]));
      else p.delete('maxPrice');
      p.delete('page');
      const qs = p.toString();
      navigate(basePath + (qs ? '?' + qs : ''), { replace: true });
    }, 500);
    return () => clearTimeout(t);
  }, [localPriceRange]);

  const setFilter = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const p = new URLSearchParams(searchStr);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') p.delete(key);
      else p.set(key, value);
    }
    if (resetPage) p.delete('page');
    const qs = p.toString();
    navigate(basePath + (qs ? '?' + qs : ''), { replace: true });
  }, [searchStr, navigate, basePath]);

  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    setFilter({ sizes: next.length ? next.join(',') : null });
  };

  const toggleColor = (colorName: string) => {
    const next = selectedColors.includes(colorName)
      ? selectedColors.filter(c => c !== colorName)
      : [...selectedColors, colorName];
    setFilter({ colors: next.length ? next.join(',') : null });
  };

  const toggleFit = (fit: string) => {
    const next = selectedFits.includes(fit)
      ? selectedFits.filter(f => f !== fit)
      : [...selectedFits, fit];
    setFilter({ fits: next.length ? next.join(',') : null });
  };

  const clearFilters = () => {
    setLocalPriceRange([0, 10000]);
    navigate(basePath, { replace: true });
  };

  const filters: ProductFilters = {
    categoryId: category?.id,
    sort,
    minPrice: urlMinPrice > 0 ? urlMinPrice : undefined,
    maxPrice: urlMaxPrice < 10000 ? urlMaxPrice : undefined,
    sizes: selectedSizes.length ? selectedSizes : undefined,
    colors: selectedColors.length ? selectedColors : undefined,
    fits: selectedFits.length ? selectedFits : undefined,
    discounted: showOnlyDiscounted || undefined,
    isNew: showOnlyNew || undefined,
    page,
    limit: LIMIT,
  };

  const { data: result, isLoading: productsLoading } = useProducts(filters);
  const products = result?.products ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const { data: facets } = useFacets({
    categoryId: category?.id,
    minPrice: urlMinPrice > 0 ? urlMinPrice : undefined,
    maxPrice: urlMaxPrice < 10000 ? urlMaxPrice : undefined,
  });

  const displayedProducts = products;

  const isLoading = categoriesLoading || (!!category && productsLoading);

  const priceActive = urlMinPrice > 0 || urlMaxPrice < 10000;
  const hasActiveFilters =
    priceActive || showOnlyNew || showOnlyDiscounted ||
    selectedSizes.length > 0 || selectedColors.length > 0 || selectedFits.length > 0;

  const activeFilterCount =
    (showOnlyNew ? 1 : 0) +
    (showOnlyDiscounted ? 1 : 0) +
    (priceActive ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    selectedFits.length;

  if (!category && !isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-20 lg:pt-8 pb-12 px-6">
          <div className="max-w-[1400px] mx-auto text-center">
            <h1 className="font-display text-5xl mb-4 text-black">Kategori Bulunamadı</h1>
            <Link href="/">
              <span className="text-sm text-black/40 hover:text-black transition-colors underline underline-offset-4">
                Ana Sayfaya Dön
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEO
        title={category?.name || 'Kategori'}
        description={`${category?.name || 'Ürünler'} — Ecarte Jeans güncel giyim koleksiyonu`}
        url={`/kategori/${slug}`}
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: category?.name || 'Kategori', url: `/kategori/${slug}` },
        ]}
      />
      <Header />

      {/* Category hero */}
      <section className="relative overflow-hidden bg-black" style={{ height: '18vh', minHeight: 140, maxHeight: 200 }}>
        <motion.div
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {category?.image && (
            <img
              src={category.image}
              alt={category.name || 'Kategori'}
              className="w-full h-full object-cover opacity-45"
              data-testid="img-category-hero"
            />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-4 lg:pb-5 w-full">
            <motion.nav
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2 text-[10px] text-white/45 tracking-wider uppercase mb-1.5"
              data-testid="breadcrumb"
            >
              <Link href="/"><span className="hover:text-white transition-colors">Ana Sayfa</span></Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/75">{category?.name}</span>
            </motion.nav>
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide leading-[1.1]"
                data-testid="text-category-title"
              >
                {category?.name?.toUpperCase()}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/45 text-[10px] tracking-[0.2em] uppercase"
              >
                {isLoading ? '—' : total} ürün
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="border-b border-black/8 sticky top-16 lg:top-0 bg-white z-30">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase font-medium text-black shrink-0 hover:text-black/60 transition-colors"
                data-testid="button-open-filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtrele
                {hasActiveFilters && (
                  <span className="w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Active filter chips */}
              {showOnlyNew && (
                <button
                  onClick={() => setFilter({ new: null })}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-black text-black px-2.5 py-1 shrink-0 hover:bg-black hover:text-white transition-colors"
                  data-testid="button-remove-filter-new"
                >
                  Yeni<X className="w-2.5 h-2.5" />
                </button>
              )}
              {showOnlyDiscounted && (
                <button
                  onClick={() => setFilter({ discounted: null })}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-polen-orange text-polen-orange px-2.5 py-1 shrink-0 hover:bg-polen-orange hover:text-white transition-colors"
                  data-testid="button-remove-filter-discount"
                >
                  İndirimli<X className="w-2.5 h-2.5" />
                </button>
              )}
              {selectedSizes.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-black text-black px-2.5 py-1 shrink-0 hover:bg-black hover:text-white transition-colors"
                >
                  {s}<X className="w-2.5 h-2.5" />
                </button>
              ))}
              {selectedColors.map(c => (
                <button
                  key={c}
                  onClick={() => toggleColor(c)}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-polen-orange text-polen-orange px-2.5 py-1 shrink-0 hover:bg-polen-orange hover:text-white transition-colors"
                >
                  {c}<X className="w-2.5 h-2.5" />
                </button>
              ))}
              {selectedFits.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFit(f)}
                  className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase border border-black text-black px-2.5 py-1 shrink-0 hover:bg-black hover:text-white transition-colors"
                >
                  {f}<X className="w-2.5 h-2.5" />
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] tracking-[0.1em] uppercase text-black/35 hover:text-black transition-colors shrink-0 underline underline-offset-2"
                  data-testid="button-clear-filters"
                >
                  Temizle
                </button>
              )}
            </div>

            <div className="shrink-0">
              <Select value={sort} onValueChange={(v) => setFilter({ sort: v })}>
                <SelectTrigger
                  className="h-8 border-0 bg-transparent text-[11px] tracking-[0.12em] uppercase font-medium text-black/50 hover:text-black focus:ring-0 focus:ring-offset-0 gap-1 pr-0 shadow-none"
                  data-testid="select-sort"
                >
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent className="bg-white border-black/10 shadow-lg">
                  {sortOptions.map(opt => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs text-black focus:bg-black/5 cursor-pointer"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Filter panel (slide down) */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
            className="overflow-hidden border-b border-black/8 bg-white"
          >
            <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Price */}
                <div>
                  <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-black/40 mb-5">Fiyat Aralığı</h4>
                  <Slider
                    value={localPriceRange}
                    onValueChange={(v) => setLocalPriceRange(v as [number, number])}
                    min={0}
                    max={10000}
                    step={100}
                    className="mb-3"
                    data-testid="slider-price-range"
                  />
                  <div className="flex justify-between text-xs text-black/50">
                    <span>{localPriceRange[0].toLocaleString('tr-TR')} ₺</span>
                    <span>{localPriceRange[1].toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>

                {/* Sizes */}
                {facets?.sizes && facets.sizes.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-black/40 mb-5">Beden</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {facets.sizes.map(size => (
                        <button
                          key={size}
                          onClick={() => toggleSize(size)}
                          className={`px-3 py-1.5 text-[11px] font-medium border transition-all ${
                            selectedSizes.includes(size)
                              ? 'bg-black text-white border-black'
                              : 'border-black/15 text-black/65 hover:border-black hover:text-black'
                          }`}
                          data-testid={`filter-size-${size}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {facets?.colors && facets.colors.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-black/40 mb-5">Renk</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {facets.colors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => toggleColor(color.name)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border transition-all ${
                            selectedColors.includes(color.name)
                              ? 'border-black bg-stone-50 font-medium text-black'
                              : 'border-black/15 text-black/65 hover:border-black/40'
                          }`}
                          data-testid={`filter-color-${color.name}`}
                        >
                          {color.hex && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: color.hex }}
                            />
                          )}
                          <span className="leading-none">{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fits */}
                {facets?.fits && facets.fits.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-black/40 mb-5">Kesim</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {facets.fits.map(fit => (
                        <button
                          key={fit}
                          onClick={() => toggleFit(fit)}
                          className={`px-3 py-1.5 text-[11px] font-medium border transition-all ${
                            selectedFits.includes(fit)
                              ? 'bg-black text-white border-black'
                              : 'border-black/15 text-black/65 hover:border-black hover:text-black'
                          }`}
                          data-testid={`filter-fit-${fit}`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick filters */}
                <div>
                  <h4 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-black/40 mb-5">Hızlı Filtre</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilter({ new: showOnlyNew ? null : '1' })}
                      className={`px-4 h-11 border text-[11px] tracking-[0.12em] uppercase font-medium transition-all ${
                        showOnlyNew
                          ? 'bg-black text-white border-black'
                          : 'border-black/20 text-black hover:border-black'
                      }`}
                      data-testid="button-filter-new"
                    >
                      Yeni Gelenler
                    </button>
                    <button
                      onClick={() => setFilter({ discounted: showOnlyDiscounted ? null : '1' })}
                      className={`px-4 h-11 border text-[11px] tracking-[0.12em] uppercase font-medium transition-all ${
                        showOnlyDiscounted
                          ? 'bg-polen-orange text-white border-polen-orange'
                          : 'border-black/20 text-black hover:border-polen-orange hover:text-polen-orange'
                      }`}
                      data-testid="button-filter-discounted"
                    >
                      İndirimli
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product grid */}
      <main className="py-10 lg:py-14 px-5 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="font-display text-3xl text-black mb-2">Ürün Bulunamadı</p>
              <p className="text-sm text-black/40 mb-8">
                {hasActiveFilters ? 'Filtreleri değiştirerek tekrar deneyin.' : 'Bu kategoride henüz ürün bulunmuyor.'}
              </p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="text-[11px] tracking-[0.15em] uppercase border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors">
                  Filtreleri Temizle
                </button>
              ) : (
                <Link href="/">
                  <span className="text-[11px] tracking-[0.15em] uppercase border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors cursor-pointer">
                    Alışverişe Devam Et
                  </span>
                </Link>
              )}
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {displayedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, delay: (index % 4) * 0.06 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-2" data-testid="pagination">
                  <button
                    onClick={() => setFilter({ page: String(page - 1) }, false)}
                    disabled={page <= 1}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-black/12 text-[11px] tracking-[0.15em] uppercase font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white hover:border-black transition-colors"
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Önceki
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="px-2 text-black/30 text-sm">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setFilter({ page: String(item) }, false)}
                            className={`w-9 h-9 text-[12px] font-semibold transition-colors border ${
                              page === item
                                ? 'bg-black text-white border-black'
                                : 'border-black/12 text-black hover:border-black'
                            }`}
                            data-testid={`button-page-${item}`}
                          >
                            {item}
                          </button>
                        )
                      )
                    }
                  </div>

                  <button
                    onClick={() => setFilter({ page: String(page + 1) }, false)}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-black/12 text-[11px] tracking-[0.15em] uppercase font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white hover:border-black transition-colors"
                    data-testid="button-next-page"
                  >
                    Sonraki
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Other categories */}
      {categories.length > 1 && (
        <section className="py-12 px-5 lg:px-8 border-t border-black/8">
          <div className="max-w-[1400px] mx-auto">
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-black/35 font-medium mb-6">Diğer Kategoriler</h3>
            <div className="flex flex-wrap gap-2">
              {categories.filter(c => c.slug !== slug).map(cat => (
                <Link key={cat.id} href={`/kategori/${cat.slug}`}>
                  <motion.span
                    whileHover={{ backgroundColor: '#000', color: '#fff' }}
                    transition={{ duration: 0.2 }}
                    className="inline-block border border-black/20 text-black text-[11px] tracking-[0.12em] uppercase px-4 py-2.5 cursor-pointer transition-colors hover:border-black"
                    data-testid={`button-other-category-${cat.slug}`}
                  >
                    {cat.name}
                  </motion.span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
