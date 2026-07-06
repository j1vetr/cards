import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface SearchCard {
  id: string;
  name: string;
  slug: string;
  min_price: string | null;
  market_price: string | null;
  image_url: string | null;
  rarity: string;
  set_name: string;
  game_name: string;
  game_slug: string;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const rarityColor = (rarity: string) => {
  const r = rarity?.toLowerCase() ?? '';
  if (r.includes('secret') || r.includes('rainbow') || r.includes('full art')) return 'text-amber-400';
  if (r.includes('ultra') || r.includes('rare holo') || r.includes('legend')) return 'text-indigo-400';
  if (r.includes('rare')) return 'text-blue-400';
  return 'text-white/35';
};

const QUICK_LINKS = [
  { label: 'Pokémon TCG', href: '/pokemon' },
  { label: 'Riftbound', href: '/riftbound' },
  { label: 'Tüm Kartlar', href: '/magaza' },
];

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  const hasQuery = debouncedQuery.length >= 2;

  const { data: searchData, isLoading: searching } = useQuery<{ cards: SearchCard[] }>({
    queryKey: ['search-cards', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/cards?search=${encodeURIComponent(debouncedQuery)}&limit=12`);
      if (!res.ok) throw new Error('Arama başarısız');
      return res.json();
    },
    enabled: isOpen && hasQuery,
    staleTime: 30_000,
  });
  const searchResults = searchData?.cards ?? [];

  const { data: latestData } = useQuery<{ cards: SearchCard[] }>({
    queryKey: ['search-latest-cards'],
    queryFn: async () => {
      const res = await fetch('/api/cards?limit=8');
      if (!res.ok) return { cards: [] };
      return res.json();
    },
    enabled: isOpen,
    staleTime: 60_000,
  });
  const latestCards = latestData?.cards ?? [];

  const displayedCards = hasQuery ? searchResults : latestCards.slice(0, 8);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/magaza?search=${encodeURIComponent(q)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Arka plan overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[6px]"
            data-testid="overlay-search"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: '#0c1220', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            className="fixed top-0 left-0 right-0 z-[101] flex flex-col max-h-[92vh] shadow-[0_24px_60px_-10px_rgba(0,0,0,0.6)]"
            data-testid="panel-search"
          >
            {/* Arama input satırı */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-4 lg:py-6 flex items-center gap-3">
                <Search className="w-5 h-5 text-white/35 shrink-0" strokeWidth={1.6} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                  placeholder="Kart adı, set, nadir ara… (örn: Charizard, Pikachu)"
                  className="flex-1 bg-transparent outline-none border-none text-[16px] lg:text-[19px] font-light text-white placeholder:text-white/25 tracking-tight"
                  data-testid="input-search"
                  autoComplete="off"
                  spellCheck={false}
                />
                {query.length > 0 && (
                  <button
                    onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); }}
                    className="text-[10px] tracking-[0.18em] uppercase text-white/30 hover:text-[hsl(var(--polen-orange))] transition-colors px-2 shrink-0"
                    data-testid="button-clear-search"
                  >
                    Temizle
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="group flex items-center justify-center w-9 h-9 rounded-full transition-colors shrink-0"
                  style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                  data-testid="button-close-search"
                  aria-label="Kapat"
                >
                  <X className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* İçerik */}
            <div className="overflow-y-auto flex-1">
              <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-5 lg:py-8">

                {/* Hızlı erişim linkler */}
                <div className="mb-6 flex flex-wrap gap-2">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] tracking-[0.12em] uppercase font-medium text-white/45 hover:border-[hsl(var(--polen-orange))] hover:text-[hsl(var(--polen-orange))] transition-colors rounded-sm"
                      style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                      data-testid={`link-search-quick-${link.label}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Yükleniyor */}
                {hasQuery && searching && (
                  <div className="flex items-center justify-center py-14 text-white/25">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {/* Sonuç yok */}
                {hasQuery && !searching && searchResults.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="text-[11px] tracking-[0.2em] uppercase text-white/30 mb-2">Kart Bulunamadı</div>
                    <p className="text-[15px] text-white/55">
                      "<span className="font-semibold text-white">{debouncedQuery}</span>" ile eşleşen kart yok.
                    </p>
                    <p className="text-[13px] text-white/35 mt-1.5">Farklı bir isim veya set adı deneyin.</p>
                    <Link
                      href="/magaza"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-[11px] tracking-[0.18em] uppercase font-semibold text-white hover:bg-[hsl(var(--polen-orange))] transition-colors rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                      Tüm Kartlara Bak <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Kart grid */}
                {!searching && displayedCards.length > 0 && (
                  <div>
                    <div className="flex items-end justify-between mb-4">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-white/30 font-mono">
                        {hasQuery ? `${searchResults.length} Kart Bulundu` : 'Son Eklenen Kartlar'}
                      </div>
                      {hasQuery && searchResults.length > 0 && (
                        <button
                          onClick={submitSearch}
                          className="text-[10px] tracking-[0.18em] uppercase font-semibold text-[hsl(var(--polen-orange))] hover:opacity-75 transition-opacity inline-flex items-center gap-1"
                        >
                          Tümünü Gör <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {displayedCards.map((card, index) => (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.2) }}
                        >
                          <Link
                            href={`/kart/${card.slug}`}
                            onClick={onClose}
                            data-testid={`link-search-card-${card.id}`}
                            className="group block"
                          >
                            <div
                              className="relative aspect-[5/7] overflow-hidden rounded-lg mb-2 shadow-sm group-hover:shadow-md transition-shadow"
                              style={{ background: 'rgba(255,255,255,0.07)' }}
                            >
                              {card.image_url ? (
                                <img
                                  src={card.image_url}
                                  alt={card.name}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/15">
                                  <Sparkles className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <h4
                              className="text-[11px] font-medium text-white leading-tight line-clamp-2 group-hover:text-[hsl(var(--polen-orange))] transition-colors"
                              data-testid={`text-search-name-${card.id}`}
                            >
                              {card.name}
                            </h4>
                            <p className={`text-[10px] mt-0.5 truncate ${rarityColor(card.rarity)}`}>
                              {card.rarity}
                            </p>
                            {card.min_price && (
                              <p className="text-[11px] font-semibold text-white mt-0.5" data-testid={`text-search-price-${card.id}`}>
                                {parseFloat(card.min_price).toLocaleString('tr-TR')} ₺
                              </p>
                            )}
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boş — sorgu yok, kart yok */}
                {!hasQuery && latestCards.length === 0 && (
                  <div className="text-center py-14 text-[13px] text-white/30">
                    Aramaya başlamak için kart adı veya set yazın.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
