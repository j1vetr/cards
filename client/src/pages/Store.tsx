import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link, useLocation, useSearch } from 'wouter';
import { ChevronRight, ChevronLeft, X, SlidersHorizontal, Grid3X3, LayoutGrid, ArrowUpRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProducts, useCategories, useFacets, type ProductFilters } from '@/hooks/useProducts';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const LIMIT = 24;

const sortOptions = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'popular', label: 'En Popüler' },
];

export default function Store() {
  const { data: categories = [] } = useCategories();
  const searchStr = useSearch();
  const [, navigate] = useLocation();

  const urlParams = new URLSearchParams(searchStr);
  const sort = (urlParams.get('sort') as ProductFilters['sort']) || 'newest';
  const page = Math.max(1, parseInt(urlParams.get('page') || '1', 10));
  const urlMinPrice = parseInt(urlParams.get('minPrice') || '0', 10);
  const urlMaxPrice = parseInt(urlParams.get('maxPrice') || '10000', 10);
  const selectedSizes = urlParams.get('sizes')?.split(',').filter(Boolean) || [];
  const selectedColors = urlParams.get('colors')?.split(',').filter(Boolean) || [];
  const selectedFits = urlParams.get('fits')?.split(',').filter(Boolean) || [];
  const showOnlyDiscounted = urlParams.get('discounted') === 'true';
  const searchQuery = urlParams.get('search') || '';
  const selectedCategory = urlParams.get('categoryId') || undefined;

  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([urlMinPrice, urlMaxPrice]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);

  // Keep local price slider in sync when URL changes (e.g. back/forward)
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
      navigate('/magaza' + (qs ? '?' + qs : ''), { replace: true });
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
    navigate('/magaza' + (qs ? '?' + qs : ''), { replace: true });
  }, [searchStr, navigate]);

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
    navigate('/magaza', { replace: true });
  };

  const filters: ProductFilters = {
    categoryId: selectedCategory,
    sort,
    minPrice: urlMinPrice > 0 ? urlMinPrice : undefined,
    maxPrice: urlMaxPrice < 10000 ? urlMaxPrice : undefined,
    sizes: selectedSizes.length ? selectedSizes : undefined,
    colors: selectedColors.length ? selectedColors : undefined,
    fits: selectedFits.length ? selectedFits : undefined,
    discounted: showOnlyDiscounted || undefined,
    search: searchQuery || undefined,
    page,
    limit: LIMIT,
  };

  const { data: result, isLoading } = useProducts(filters);
  const products = result?.products ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const { data: facets } = useFacets({
    categoryId: selectedCategory,
    search: searchQuery || undefined,
    minPrice: urlMinPrice > 0 ? urlMinPrice : undefined,
    maxPrice: urlMaxPrice < 10000 ? urlMaxPrice : undefined,
  });

  const hasActiveFilters =
    urlMinPrice > 0 || urlMaxPrice < 10000 || !!selectedCategory ||
    selectedSizes.length > 0 || selectedColors.length > 0 || selectedFits.length > 0 ||
    showOnlyDiscounted || !!searchQuery;

  const FilterContent = () => (
    <div className="space-y-8">
      {searchQuery && (
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">00</span>
            <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Arama</h4>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-black/8">
            <Search className="w-3 h-3 text-black/40 shrink-0" />
            <span className="text-[13px] text-black flex-1 truncate">{searchQuery}</span>
            <button onClick={() => setFilter({ search: null })} className="text-black/40 hover:text-black transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01</span>
          <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Kategori</h4>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => setFilter({ categoryId: null })}
            className={`group block w-full text-left px-3 py-2.5 text-[13px] tracking-wide transition-all border-l-2 ${
              !selectedCategory
                ? 'border-polen-orange text-black font-semibold bg-polen-cream'
                : 'border-transparent text-black/55 hover:text-black hover:border-black/20'
            }`}
            data-testid="filter-category-all"
          >
            Tüm Ürünler
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter({ categoryId: cat.id })}
              className={`group block w-full text-left px-3 py-2.5 text-[13px] tracking-wide transition-all border-l-2 ${
                selectedCategory === cat.id
                  ? 'border-polen-orange text-black font-semibold bg-polen-cream'
                  : 'border-transparent text-black/55 hover:text-black hover:border-black/20'
              }`}
              data-testid={`filter-category-${cat.slug}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">02</span>
          <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Fiyat Aralığı</h4>
        </div>
        <Slider
          value={localPriceRange}
          min={0}
          max={10000}
          step={100}
          onValueChange={(value) => setLocalPriceRange(value as [number, number])}
          className="mb-4"
          data-testid="slider-price-range"
        />
        <div className="flex justify-between text-xs text-black/45 font-mono tabular-nums">
          <span>₺{localPriceRange[0].toLocaleString('tr-TR')}</span>
          <span>₺{localPriceRange[1].toLocaleString('tr-TR')}</span>
        </div>
      </div>

      {facets?.sizes && facets.sizes.length > 0 && (
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">03</span>
            <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Beden</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map(size => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`px-3 py-1.5 text-[11px] font-medium tracking-wide border transition-all ${
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

      {facets?.colors && facets.colors.length > 0 && (
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">04</span>
            <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Renk</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map(color => (
              <button
                key={color.name}
                onClick={() => toggleColor(color.name)}
                title={color.name}
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

      {facets?.fits && facets.fits.length > 0 && (
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">05</span>
            <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Kesim</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {facets.fits.map(fit => (
              <button
                key={fit}
                onClick={() => toggleFit(fit)}
                className={`px-3 py-1.5 text-[11px] font-medium tracking-wide border transition-all ${
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

      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">06</span>
          <h4 className="font-display text-sm tracking-[0.18em] uppercase text-black">Hızlı Filtre</h4>
        </div>
        <button
          onClick={() => setFilter({ discounted: showOnlyDiscounted ? null : 'true' })}
          className={`px-4 py-2.5 border text-[11px] tracking-[0.12em] uppercase font-medium transition-all ${
            showOnlyDiscounted
              ? 'bg-polen-orange text-white border-polen-orange'
              : 'border-black/20 text-black hover:border-polen-orange hover:text-polen-orange'
          }`}
          data-testid="button-filter-discounted"
        >
          İndirimli Ürünler
        </button>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-3 border border-black/12 text-black text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-black hover:text-white transition-colors"
          data-testid="button-clear-filters"
        >
          <X className="w-3.5 h-3.5" />
          Filtreleri Temizle
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SEO
        title="Mağaza"
        description="Ecarte Jeans güncel giyim koleksiyonu. Kadın, erkek ve çocuk giyiminde tüm ürünleri keşfedin."
        url="/magaza"
        breadcrumbs={[
          { name: 'Ana Sayfa', url: '/' },
          { name: 'Mağaza', url: '/magaza' }
        ]}
      />
      <Header />

      {/* Editorial hero */}
      <section className="relative bg-polen-cream border-b border-black/8 pt-20 lg:pt-10 pb-12 lg:pb-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.nav
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-black/45 mb-8"
            data-testid="breadcrumb"
          >
            <Link href="/"><span className="hover:text-polen-orange transition-colors cursor-pointer">Ana Sayfa</span></Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-black font-semibold">Mağaza</span>
          </motion.nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-baseline gap-4 mb-4"
              >
                <span className="text-[11px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01 / Koleksiyon</span>
                <span className="h-px w-10 bg-polen-orange/40" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-[0.01em] text-black leading-[0.95]"
                data-testid="text-store-title"
              >
                MAĞAZA
              </motion.h1>
              {searchQuery && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-black/55 mt-3 text-[14px]"
                >
                  "<span className="text-black font-medium">{searchQuery}</span>" araması
                </motion.p>
              )}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-baseline gap-2"
            >
              <span
                className="font-display text-4xl text-polen-orange tabular-nums"
                data-testid="text-product-count"
              >
                {isLoading ? '—' : total.toString().padStart(2, '0')}
              </span>
              <span className="text-[11px] tracking-[0.22em] uppercase text-black/55">Ürün</span>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-10 lg:py-14 px-6">
        <div className="max-w-[1400px] mx-auto">
          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-black/10"
          >
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mobile filter sheet */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <button
                    className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 border border-black/12 text-[11px] tracking-[0.18em] uppercase font-semibold text-black hover:bg-black hover:text-white transition-colors"
                    data-testid="button-mobile-filter"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filtrele
                    {hasActiveFilters && (
                      <span className="w-1.5 h-1.5 rounded-full bg-polen-orange" />
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] bg-white border-r border-black/10 p-6 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="font-display text-lg tracking-[0.18em] uppercase text-left text-black">Filtrele</SheetTitle>
                  </SheetHeader>
                  <div className="mt-8">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Grid toggle */}
              <div className="hidden sm:flex items-center gap-1 border border-black/12 p-1">
                <button
                  onClick={() => setGridCols(2)}
                  className={`p-2 transition-colors ${gridCols === 2 ? 'bg-black text-white' : 'text-black/55 hover:text-black'}`}
                  aria-label="2 sütun"
                  data-testid="button-grid-2"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridCols(3)}
                  className={`p-2 transition-colors ${gridCols === 3 ? 'bg-black text-white' : 'text-black/55 hover:text-black'}`}
                  aria-label="3 sütun"
                  data-testid="button-grid-3"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Active filter chips */}
              {selectedSizes.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase border border-black text-black hover:bg-black hover:text-white transition-colors"
                >
                  {s}<X className="w-2.5 h-2.5" />
                </button>
              ))}
              {selectedColors.map(c => (
                <button
                  key={c}
                  onClick={() => toggleColor(c)}
                  className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase border border-polen-orange text-polen-orange hover:bg-polen-orange hover:text-white transition-colors"
                >
                  {c}<X className="w-2.5 h-2.5" />
                </button>
              ))}
              {selectedFits.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFit(f)}
                  className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase border border-black text-black hover:bg-black hover:text-white transition-colors"
                >
                  {f}<X className="w-2.5 h-2.5" />
                </button>
              ))}
              {showOnlyDiscounted && (
                <button
                  onClick={() => setFilter({ discounted: null })}
                  className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase border border-polen-orange text-polen-orange hover:bg-polen-orange hover:text-white transition-colors"
                >
                  İndirimli<X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {!isLoading && total > 0 && (
                <span className="hidden md:block text-[11px] text-black/35 tabular-nums">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total} ürün
                </span>
              )}
              <Select value={sort} onValueChange={(v) => setFilter({ sort: v })}>
                <SelectTrigger className="w-[220px] border-black/12 text-black bg-white rounded-none h-10 text-[12px] tracking-wide" data-testid="select-sort">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-black/12">
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-[13px]">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <div className="flex gap-12">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-32">
                <div className="flex items-baseline gap-3 mb-8 pb-5 border-b border-black/10">
                  <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">—</span>
                  <h3 className="font-display text-base tracking-[0.18em] uppercase text-black">Filtrele</h3>
                </div>
                <FilterContent />
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className={`grid gap-6 ${
                  gridCols === 2 ? 'grid-cols-2' :
                  gridCols === 3 ? 'grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-2 lg:grid-cols-4'
                }`}>
                  {[...Array(LIMIT)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] bg-stone-100" />
                      <div className="mt-4 h-3 bg-stone-100 w-3/4" />
                      <div className="mt-2 h-3 bg-stone-100 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24 border border-black/8 bg-stone-50"
                >
                  <p className="text-black/55 text-[15px] mb-6">
                    Bu kriterlere uygun ürün bulunamadı.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-polen-orange transition-colors"
                    data-testid="button-clear-empty"
                  >
                    Filtreleri Temizle
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`grid gap-x-4 gap-y-10 sm:gap-x-6 ${
                      gridCols === 2 ? 'grid-cols-2' :
                      gridCols === 3 ? 'grid-cols-2 lg:grid-cols-3' :
                      'grid-cols-2 lg:grid-cols-4'
                    }`}
                  >
                    {products.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </motion.div>

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
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
