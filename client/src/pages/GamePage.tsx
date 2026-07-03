import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardGames, useCardSets, useCards } from '@/hooks/useTcg';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

// ── Per-game config ──────────────────────────────────────────────────────────
const GAME_CONFIG: Record<string, {
  logo: string;
  logoStyle?: React.CSSProperties;
  logoH: string;
  accent: string;
  accentDim: string;
  heroBg: string;
  glows: string;
  setsLabel: string;
}> = {
  pokemon: {
    logo: '/logo-pokemon-tcg.webp',
    logoH: 'h-20 sm:h-28',
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
    accent: '#818cf8',
    accentDim: 'rgba(129,140,248,0.15)',
    heroBg: 'linear-gradient(135deg, #06040f 0%, #0d0a1f 40%, #080514 100%)',
    glows: 'radial-gradient(ellipse at 20% 50%, rgba(129,140,248,0.20) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.13) 0%, transparent 55%)',
    setsLabel: 'Setler',
  },
};

const FALLBACK_CONFIG = GAME_CONFIG.pokemon;

// Format "2026/05/22" or "2026-05-22" → "Mayıs 2026"
function formatReleaseDate(raw?: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.replace(/\//g, '-');
  const d = new Date(normalized + 'T00:00:00');
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

export default function GamePage() {
  const params = useParams<{ game: string }>();
  const gameSlug = params.game;

  const { data: games = [] } = useCardGames();
  const { data: sets = [], isLoading: setsLoading } = useCardSets(gameSlug);
  const { data: featuredData, isLoading: cardsLoading } = useCards({
    game: gameSlug,
    sort: 'newest',
    limit: 12,
  });

  const game = useMemo(() => games.find(g => g.slug === gameSlug), [games, gameSlug]);
  const featuredCards = featuredData?.cards ?? [];
  const totalCards = featuredData?.total ?? 0;

  const isLoading = setsLoading || (!games.length && !game);
  const cfg = GAME_CONFIG[gameSlug] ?? FALLBACK_CONFIG;

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
          <h1 className="text-2xl font-bold text-white mb-4">Oyun bulunamadı</h1>
          <Link href="/magaza">
            <button className="text-white px-6 py-3 rounded-xl transition-colors"
              style={{ background: cfg.accent }}>
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
        {/* Glows */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.glows }} />
        {/* Bottom separator line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${cfg.accent}40, transparent)` }} />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500 mb-10">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Ana Sayfa</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium" style={{ color: cfg.accent }}>{gameName}</span>
          </nav>

          {/* Logo + info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            {/* Game logo */}
            <div className="shrink-0">
              <img
                src={cfg.logo}
                alt={gameName}
                className={`${cfg.logoH} w-auto object-contain`}
                style={{
                  filter: `drop-shadow(0 0 40px ${cfg.accent}70)`,
                  ...(cfg.logoStyle ?? {}),
                }}
              />
            </div>

            {/* Text + badges */}
            <div className="flex flex-col gap-4">
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {gameName}
              </h1>

              <div className="flex items-center gap-3 flex-wrap">
                {sets.length > 0 && (
                  <span
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: cfg.accentDim, color: cfg.accent, border: `1px solid ${cfg.accent}40` }}
                  >
                    {sets.length} Set
                  </span>
                )}
                {totalCards > 0 && (
                  <span
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {totalCards.toLocaleString('tr-TR')} Kart Satışta
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">

        {/* Sets Grid */}
        {sets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full" style={{ background: cfg.accent }} />
                <h2 className="text-lg font-bold text-white">{cfg.setsLabel}</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sets.map(set => (
                <Link key={set.id} href={`/set/${set.slug}`}>
                  <div
                    className="group cursor-pointer rounded-xl p-4 flex flex-col items-center text-center gap-3 transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${cfg.accent}50`;
                      (e.currentTarget as HTMLElement).style.background = cfg.accentDim;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    {set.logo_url ? (
                      <img
                        src={set.logo_url}
                        alt={set.name}
                        className="h-10 object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: cfg.accentDim }}>
                        <span className="text-lg font-bold" style={{ color: cfg.accent }}>
                          {set.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="w-full">
                      <p className="text-xs font-semibold text-zinc-200 leading-tight group-hover:text-white transition-colors line-clamp-2 mb-1">
                        {set.name}
                      </p>
                      {set.release_date && (
                        <p className="text-[10px] text-zinc-600">{formatReleaseDate(set.release_date)}</p>
                      )}
                      {set.listed_cards > 0 && (
                        <p className="text-[10px] font-semibold mt-0.5" style={{ color: cfg.accent }}>
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

        {/* Featured Cards */}
        {(featuredCards.length > 0 || cardsLoading) && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full" style={{ background: cfg.accent }} />
                <h2 className="text-lg font-bold text-white">Son Eklenen Kartlar</h2>
              </div>
              <Link
                href={`/magaza?game=${gameSlug}&sort=newest`}
                className="text-xs font-medium flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: cfg.accent }}
              >
                Tümünü Gör <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {cardsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.07] animate-pulse"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="aspect-[63/88] rounded-t-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="p-3 space-y-2">
                      <div className="h-3 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {featuredCards.map(card => <CardCard key={card.id} card={card} />)}
              </div>
            )}
          </section>
        )}

      </div>

      <Footer />
    </div>
  );
}
