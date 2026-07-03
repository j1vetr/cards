import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardGames, useCardSets, useCards } from '@/hooks/useTcg';
import { ChevronRight, ChevronLeft, Loader2, Search, X } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CARD_LIMIT = 24;

const SORT_OPTIONS = [
  { value: 'newest',     label: 'En Yeni' },
  { value: 'price_asc',  label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name_asc',   label: 'İsme Göre (A–Z)' },
];

const GAME_CONFIG: Record<string, {
  logo: string;
  logoStyle?: React.CSSProperties;
  logoH: string;
  iconFallback: string;
  accent: string;
  accentDim: string;
  heroBg: string;
  glows: string;
  setsLabel: string;
}> = {
  pokemon: {
    logo: '/logo-pokemon-tcg.webp',
    logoH: 'h-20 sm:h-28',
    iconFallback: '/icon-pokemon.svg',
    accent: '#f59e0b',
    accentDim: 'rgba(245,158,11,0.15)',
    heroBg: 'linear-gradient(135deg, #0d0b00 0%, #1a1200 40%, #0a0800 100%)',
    glows: 'radial-gradient(ellipse at 20% 50%, rgba(245,158,11,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.10) 0%, transparent 55%)',
    setsLabel: 'Setler & Expansionlar',
  },
  riftbound: {
    logo: '/logo-riftbound.png',
    logoStyle: { mixBlendMode: 'screen' },
    logoH: 'h-16 sm:h-20',
    iconFallback: '/icon-riftbound.svg',
    accent: '#818cf8',
    accentDim: 'rgba(129,140,248,0.15)',
    heroBg: 'linear-gradient(135deg, #06040f 0%, #0d0a1f 40%, #080514 100%)',
    glows: 'radial-gradient(ellipse at 20% 50%, rgba(129,140,248,0.20) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.13) 0%, transparent 55%)',
    setsLabel: 'Setler',
  },
};

const FALLBACK_CONFIG = GAME_CONFIG.pokemon;

function formatReleaseDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw.replace(/\//g, '-') + 'T00:00:00');
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

export default function GamePage() {
  const params = useParams<{ game: string }>();
  const gameSlug = params.game;

  const [cardPage, setCardPage]     = useState(1);
  const [cardSort, setCardSort]     = useState('newest');
  const [cardSearch, setCardSearch] = useState('');
  const [localSearch, setLocalSearch] = useState('');

  const { data: games = [] } = useCardGames();
  const { data: sets = [], isLoading: setsLoading } = useCardSets(gameSlug);
  const { data: cardsData, isLoading: cardsLoading } = useCards({
    game: gameSlug,
    sort: cardSort,
    page: cardPage,
    limit: CARD_LIMIT,
    search: cardSearch || undefined,
  });

  const game = useMemo(() => games.find(g => g.slug === gameSlug), [games, gameSlug]);
  const featuredCards = cardsData?.cards ?? [];
  const totalCards    = cardsData?.total ?? 0;
  const totalPages    = Math.ceil(totalCards / CARD_LIMIT);

  const cfg = GAME_CONFIG[gameSlug] ?? FALLBACK_CONFIG;
  const isLoading = setsLoading || (!games.length && !game);

  const applySearch = useCallback((val: string) => {
    setCardSearch(val);
    setCardPage(1);
  }, []);

  // Pagination pages to show
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (cardPage <= 4) return [1, 2, 3, 4, 5, -1, totalPages];
    if (cardPage >= totalPages - 3) return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, cardPage - 1, cardPage, cardPage + 1, -2, totalPages];
  }, [totalPages, cardPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: cfg.accent }} />
        </div>
        <Footer />
      </div>
    );
  }

  if (!game && games.length > 0) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Oyun Bulunamadı</h1>
          <Link href="/magaza">
            <button className="text-white px-6 py-3 rounded-xl transition-colors" style={{ background: cfg.accent }}>
              Mağazaya Dön
            </button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const gameName = game?.name ?? (gameSlug === 'pokemon' ? 'Pokémon TCG' : gameSlug === 'riftbound' ? 'Riftbound' : gameSlug);

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <SEO
        title={`${gameName} Kartları | Go|Cards`}
        description={`${gameName} single kart ve koleksiyon ürünleri. Go|Cards TCG marketplace.`}
      />
      <Header />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: cfg.heroBg }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.glows }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${cfg.accent}40, transparent)` }} />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500 mb-10">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Ana Sayfa</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="font-semibold" style={{ color: cfg.accent }}>{gameName}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <div className="shrink-0">
              <img
                src={cfg.logo}
                alt={gameName}
                className={`${cfg.logoH} w-auto object-contain`}
                style={{ filter: `drop-shadow(0 0 40px ${cfg.accent}70)`, ...(cfg.logoStyle ?? {}) }}
              />
            </div>
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}>
                {gameName}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                {sets.length > 0 && (
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: cfg.accentDim, color: cfg.accent, border: `1px solid ${cfg.accent}40` }}>
                    {sets.length} Set
                  </span>
                )}
                {totalCards > 0 && (
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    {totalCards.toLocaleString('tr-TR')} Kart Satışta
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">

        {/* ── Sets Grid ── */}
        {sets.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 rounded-full" style={{ background: cfg.accent }} />
              <h2 className="text-lg font-bold text-white">{cfg.setsLabel}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sets.map(set => (
                <Link key={set.id} href={`/set/${set.slug}`}>
                  <div
                    className="group cursor-pointer rounded-xl p-3 flex flex-col items-center text-center transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      height: 148,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = `${cfg.accent}50`;
                      el.style.background = cfg.accentDim;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'rgba(255,255,255,0.07)';
                      el.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    {/* Logo area — fixed height 44px */}
                    <div className="flex items-center justify-center shrink-0 mb-2" style={{ height: 44 }}>
                      {set.logo_url ? (
                        <img src={set.logo_url} alt={set.name}
                          className="max-h-10 max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <img src={cfg.iconFallback} alt="" className="w-8 h-8 object-contain opacity-50" />
                      )}
                    </div>
                    {/* Text area — fills remaining space */}
                    <div className="flex flex-col items-center gap-1 flex-1 justify-start w-full">
                      <p className="text-xs font-semibold text-zinc-200 leading-tight group-hover:text-white transition-colors line-clamp-2 w-full">
                        {set.name}
                      </p>
                      {set.release_date && (
                        <p className="text-[10px] text-zinc-600">{formatReleaseDate(set.release_date)}</p>
                      )}
                      {set.listed_cards > 0 && (
                        <p className="text-[10px] font-semibold" style={{ color: cfg.accent }}>
                          {set.listed_cards} Kart
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── All Cards (paginated) ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-5 rounded-full" style={{ background: cfg.accent }} />
            <h2 className="text-lg font-bold text-white">Tüm Kartlar</h2>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Kart ara..."
                value={localSearch}
                onChange={e => {
                  setLocalSearch(e.target.value);
                  clearTimeout((window as any).__gp_search);
                  (window as any).__gp_search = setTimeout(() => applySearch(e.target.value), 400);
                }}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-white/10 focus:outline-none focus:border-transparent focus:ring-1 text-zinc-200 placeholder-zinc-600 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', '--tw-ring-color': cfg.accent } as React.CSSProperties}
              />
              {localSearch && (
                <button onClick={() => { setLocalSearch(''); applySearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-zinc-500" />
                </button>
              )}
            </div>

            <Select value={cardSort} onValueChange={v => { setCardSort(v); setCardPage(1); }}>
              <SelectTrigger className="w-48 text-sm border-white/10 text-zinc-200" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {totalCards > 0 && (
              <span className="text-xs text-zinc-500 ml-auto tabular-nums">
                {totalCards.toLocaleString('tr-TR')} kart
              </span>
            )}
          </div>

          {/* Grid */}
          {cardsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: CARD_LIMIT }).map((_, i) => (
                <div key={i} className="rounded-xl border border-white/[0.07] animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="aspect-[63/88] rounded-t-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredCards.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🃏</div>
              <p className="text-base font-semibold text-zinc-300 mb-1">
                {cardSearch ? 'Arama Sonucu Bulunamadı' : 'Henüz Satışta Kart Yok'}
              </p>
              <p className="text-sm text-zinc-600">
                {cardSearch ? `"${cardSearch}" için eşleşen kart bulunamadı` : 'Listeleme yapılmamış'}
              </p>
              {cardSearch && (
                <button onClick={() => { setLocalSearch(''); applySearch(''); }}
                  className="mt-5 text-sm transition-colors hover:opacity-80" style={{ color: cfg.accent }}>
                  Aramayı Temizle
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {featuredCards.map(card => <CardCard key={card.id} card={card} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setCardPage(p => Math.max(1, p - 1))}
                disabled={cardPage <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl border transition-all disabled:opacity-30"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {pageNumbers.map((p, idx) =>
                p < 0 ? (
                  <span key={`dot-${idx}`} className="w-10 h-10 flex items-center justify-center text-zinc-600 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCardPage(p)}
                    className="w-10 h-10 text-sm font-semibold rounded-xl border transition-all"
                    style={p === cardPage ? {
                      background: cfg.accent,
                      borderColor: cfg.accent,
                      color: '#000',
                    } : {
                      background: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setCardPage(p => Math.min(totalPages, p + 1))}
                disabled={cardPage >= totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl border transition-all disabled:opacity-30"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

      </div>

      <Footer />
    </div>
  );
}
