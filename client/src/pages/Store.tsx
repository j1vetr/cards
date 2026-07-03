import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useLocation, useSearch } from 'wouter';
import {
  SlidersHorizontal, X, Search, ChevronLeft, ChevronRight,
  Layers, Grid3X3, LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCards, useCardSets, useCardGames, useRarities, useCardTypes } from '@/hooks/useTcg';

const LIMIT = 24;

const SORT_OPTIONS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name_asc', label: 'İsme Göre (A-Z)' },
];

const CONDITIONS = [
  { value: 'NM', label: 'Near Mint' },
  { value: 'LP', label: 'Lightly Played' },
  { value: 'MP', label: 'Moderately Played' },
  { value: 'HP', label: 'Heavily Played' },
  { value: 'DMG', label: 'Damaged' },
  { value: 'PSA10', label: 'PSA 10' },
  { value: 'PSA9', label: 'PSA 9' },
  { value: 'PSA8', label: 'PSA 8' },
  { value: 'PSA7', label: 'PSA 7' },
];

const MAX_PRICE = 5000;

export default function Store() {
  const searchStr = useSearch();
  const [, navigate] = useLocation();

  const urlParams = new URLSearchParams(searchStr);
  const selectedGame = urlParams.get('game') || '';
  const selectedSet = urlParams.get('set') || '';
  const selectedRarity = urlParams.get('rarity') || '';
  const selectedType = urlParams.get('type') || '';
  const selectedCondition = urlParams.get('condition') || '';
  const searchQuery = urlParams.get('search') || '';
  const sort = urlParams.get('sort') || 'newest';
  const page = Math.max(1, parseInt(urlParams.get('page') || '1', 10));
  const urlMinPrice = parseInt(urlParams.get('minPrice') || '0', 10);
  const urlMaxPrice = parseInt(urlParams.get('maxPrice') || String(MAX_PRICE), 10);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([urlMinPrice, urlMaxPrice]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  useEffect(() => { setLocalPriceRange([urlMinPrice, urlMaxPrice]); }, [urlMinPrice, urlMaxPrice]);
  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);

  const { data: games = [] } = useCardGames();
  const { data: sets = [] } = useCardSets(selectedGame || undefined);
  const { data: rarities = [] } = useRarities(selectedGame || undefined);
  const { data: cardTypes = [] } = useCardTypes(selectedGame || undefined);

  const { data, isLoading } = useCards({
    game: selectedGame || undefined,
    set: selectedSet || undefined,
    rarity: selectedRarity || undefined,
    type: selectedType || undefined,
    condition: selectedCondition || undefined,
    search: searchQuery || undefined,
    sort: sort as any,
    page,
    limit: LIMIT,
    minPrice: urlMinPrice > 0 ? urlMinPrice : undefined,
    maxPrice: urlMaxPrice < MAX_PRICE ? urlMaxPrice : undefined,
  });

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const setFilter = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const p = new URLSearchParams(searchStr);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') p.delete(key);
      else p.set(key, value);
    }
    if (resetPage) p.delete('page');
    navigate('/magaza' + (p.toString() ? '?' + p.toString() : ''), { replace: true });
  }, [searchStr, navigate]);

  useEffect(() => {
    if (localPriceRange[0] === urlMinPrice && localPriceRange[1] === urlMaxPrice) return;
    const t = setTimeout(() => {
      setFilter({
        minPrice: localPriceRange[0] > 0 ? String(localPriceRange[0]) : null,
        maxPrice: localPriceRange[1] < MAX_PRICE ? String(localPriceRange[1]) : null,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [localPriceRange]);

  useEffect(() => {
    if (localSearch === searchQuery) return;
    const t = setTimeout(() => {
      setFilter({ search: localSearch || null });
    }, 400);
    return () => clearTimeout(t);
  }, [localSearch]);

  const activeFilterCount = [selectedGame, selectedSet, selectedRarity, selectedType, selectedCondition,
    urlMinPrice > 0 || urlMaxPrice < MAX_PRICE ? 'price' : ''].filter(Boolean).length;

  const clearFilters = () => {
    setLocalPriceRange([0, MAX_PRICE]);
    setLocalSearch('');
    navigate('/magaza', { replace: true });
  };

  const FiltersPanel = () => (
    <div className="space-y-6">
      {games.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Oyun</p>
          <div className="space-y-0.5">
            <button
              onClick={() => setFilter({ game: null, set: null, rarity: null })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!selectedGame ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/80'}`}
            >
              Tümü
            </button>
            {games.map(g => (
              <button
                key={g.id}
                data-testid={`filter-game-${g.slug}`}
                onClick={() => setFilter({ game: g.slug, set: null, rarity: null })}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedGame === g.slug ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/80'}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {sets.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Set / Expansion</p>
          <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
            <button
              onClick={() => setFilter({ set: null })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!selectedSet ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/80'}`}
            >
              Tüm Setler
            </button>
            {sets.map(s => (
              <button
                key={s.id}
                data-testid={`filter-set-${s.slug}`}
                onClick={() => setFilter({ set: s.slug })}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${selectedSet === s.slug ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/80'}`}
              >
                {s.symbol_url && <img src={s.symbol_url} alt="" className="w-4 h-4 object-contain flex-shrink-0 opacity-70" />}
                <span className="truncate">{s.name}</span>
                {s.listed_cards > 0 && <span className="ml-auto text-xs text-white/25 flex-shrink-0">{s.listed_cards}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {rarities.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Rarity</p>
          <div className="flex flex-wrap gap-1.5">
            {rarities.map(r => (
              <button
                key={r}
                data-testid={`filter-rarity-${r}`}
                onClick={() => setFilter({ rarity: selectedRarity === r ? null : r })}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedRarity === r
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                    : 'bg-white/[0.04] text-white/50 border-white/10 hover:border-indigo-500/40 hover:text-white/70'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {cardTypes.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Tip</p>
          <div className="flex flex-wrap gap-1.5">
            {cardTypes.map(t => (
              <button
                key={t}
                data-testid={`filter-type-${t}`}
                onClick={() => setFilter({ type: selectedType === t ? null : t })}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedType === t
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                    : 'bg-white/[0.04] text-white/50 border-white/10 hover:border-indigo-500/40 hover:text-white/70'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Kondisyon</p>
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              data-testid={`filter-condition-${c.value}`}
              onClick={() => setFilter({ condition: selectedCondition === c.value ? null : c.value })}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedCondition === c.value
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                  : 'bg-white/[0.04] text-white/50 border-white/10 hover:border-indigo-500/40 hover:text-white/70'
              }`}
            >
              {c.value}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Fiyat Aralığı</p>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={25}
          value={localPriceRange}
          onValueChange={v => setLocalPriceRange(v as [number, number])}
          className="mb-3"
        />
        <div className="flex items-center justify-between text-sm text-white/45">
          <span>{localPriceRange[0].toLocaleString('tr-TR')} ₺</span>
          <span>{localPriceRange[1].toLocaleString('tr-TR')} ₺</span>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={() => { clearFilters(); setFilterOpen(false); }}
          className="w-full text-sm text-indigo-400 hover:text-indigo-300 font-medium py-2 border border-indigo-500/25 rounded-lg hover:bg-indigo-600/10 transition-colors"
        >
          Filtreleri Temizle ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#080e1c' }}>
      <SEO
        title="TCG Kart Mağazası — Go|Cards"
        description="Pokemon TCG ve Riftbound single kartlar, booster box ve sealed ürünler. Türkiye'nin TCG marketplace'i."
      />
      <Header />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start gap-8">

          {/* Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-24">
            <div
              className="rounded-2xl p-5 border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-white/80 text-sm">Filtreler</span>
                {activeFilterCount > 0 && (
                  <span className="ml-auto text-xs bg-indigo-600/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <FiltersPanel />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  data-testid="input-card-search"
                  type="text"
                  placeholder="Kart ara..."
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white/80 placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                />
                {localSearch && (
                  <button onClick={() => setLocalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-white/30 hover:text-white/60" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Mobile filter sheet */}
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                  <SheetTrigger asChild>
                    <button
                      data-testid="btn-mobile-filters"
                      className="lg:hidden flex items-center gap-2 text-sm px-3 py-2 rounded-xl text-white/60 hover:text-white/80 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Filtre
                      {activeFilterCount > 0 && (
                        <span className="bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-72 p-5 overflow-y-auto border-r"
                    style={{ background: '#0d1427', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <SheetHeader className="mb-5">
                      <SheetTitle className="text-white/80">Filtreler</SheetTitle>
                    </SheetHeader>
                    <FiltersPanel />
                  </SheetContent>
                </Sheet>

                <Select value={sort} onValueChange={v => setFilter({ sort: v })}>
                  <SelectTrigger
                    data-testid="select-sort"
                    className="w-44 text-sm text-white/70 border-white/10 focus:ring-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#0d1427', borderColor: 'rgba(255,255,255,0.12)' }}>
                    {SORT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-white/70 focus:bg-indigo-600/20 focus:text-indigo-300">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div
                  className="hidden sm:flex items-center gap-1 rounded-xl p-1"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <button
                    data-testid="btn-grid-3"
                    onClick={() => setGridCols(3)}
                    className={`p-1.5 rounded-lg transition-colors ${gridCols === 3 ? 'bg-indigo-600/30 text-indigo-300' : 'text-white/30 hover:text-white/60'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    data-testid="btn-grid-4"
                    onClick={() => setGridCols(4)}
                    className={`p-1.5 rounded-lg transition-colors ${gridCols === 4 ? 'bg-indigo-600/30 text-indigo-300' : 'text-white/30 hover:text-white/60'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedGame && (
                  <FilterChip label={games.find(g => g.slug === selectedGame)?.name ?? selectedGame} onRemove={() => setFilter({ game: null, set: null })} />
                )}
                {selectedSet && (
                  <FilterChip label={sets.find(s => s.slug === selectedSet)?.name ?? selectedSet} onRemove={() => setFilter({ set: null })} />
                )}
                {selectedRarity && (
                  <FilterChip label={selectedRarity} onRemove={() => setFilter({ rarity: null })} />
                )}
                {selectedCondition && (
                  <FilterChip label={selectedCondition} onRemove={() => setFilter({ condition: null })} />
                )}
                {(urlMinPrice > 0 || urlMaxPrice < MAX_PRICE) && (
                  <FilterChip
                    label={`${urlMinPrice.toLocaleString('tr-TR')}-${urlMaxPrice.toLocaleString('tr-TR')} ₺`}
                    onRemove={() => { setLocalPriceRange([0, MAX_PRICE]); setFilter({ minPrice: null, maxPrice: null }); }}
                  />
                )}
                <button onClick={clearFilters} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2">
                  Tümünü Temizle
                </button>
              </div>
            )}

            {/* Result count */}
            <div className="flex items-center gap-3 mb-5">
              <p className="text-sm text-white/35">
                {isLoading ? 'Yükleniyor...' : (
                  total > 0 ? <>{total.toLocaleString('tr-TR')} kart bulundu</> : 'Sonuç bulunamadı'
                )}
              </p>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: LIMIT }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="aspect-[63/88]" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="p-3 space-y-2">
                      <div className="h-3 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="h-3 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Search className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-lg font-semibold text-white/60 mb-2">Kart bulunamadı</p>
                <p className="text-sm text-white/30 mb-6">Filtreleri değiştirerek tekrar deneyin</p>
                <button
                  onClick={clearFilters}
                  className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
                >
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedGame}-${selectedSet}-${selectedRarity}-${page}-${sort}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`grid gap-4 ${
                    gridCols === 3
                      ? 'grid-cols-2 sm:grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
                  }`}
                >
                  {cards.map(card => (
                    <CardCard key={card.id} card={card} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  data-testid="btn-prev-page"
                  onClick={() => setFilter({ page: String(page - 1) }, false)}
                  disabled={page <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors disabled:opacity-30 text-white/50 hover:text-white/80"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) p = i + 1;
                  else if (page <= 4) p = i + 1;
                  else if (page >= totalPages - 3) p = totalPages - 6 + i;
                  else p = page - 3 + i;
                  return (
                    <button
                      key={p}
                      data-testid={`btn-page-${p}`}
                      onClick={() => setFilter({ page: String(p) }, false)}
                      className={`w-9 h-9 text-sm rounded-xl border transition-colors ${
                        p === page
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                      style={p !== page ? { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.09)' } : undefined}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  data-testid="btn-next-page"
                  onClick={() => setFilter({ page: String(page + 1) }, false)}
                  disabled={page >= totalPages}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors disabled:opacity-30 text-white/50 hover:text-white/80"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-indigo-300 border px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.25)' }}
    >
      {label}
      <button onClick={onRemove} className="hover:text-indigo-100 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
