import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardGames, useCardSets, useCards } from '@/hooks/useTcg';
import { ChevronRight, Loader2, Layers, Package } from 'lucide-react';
import { useMemo } from 'react';

export default function GamePage() {
  const params = useParams<{ game: string }>();
  const gameSlug = params.game;

  const { data: games = [] } = useCardGames();
  const { data: sets = [], isLoading: setsLoading } = useCardSets(gameSlug);
  const { data: featuredData, isLoading: cardsLoading } = useCards({
    game: gameSlug,
    sort: 'newest',
    limit: 8,
  });

  const game = useMemo(() => games.find(g => g.slug === gameSlug), [games, gameSlug]);
  const featuredCards = featuredData?.cards ?? [];
  const totalCards = featuredData?.total ?? 0;

  const isLoading = setsLoading || (!games.length && !game);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
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
          <Link href="/magaza"><button className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">Mağazaya Dön</button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const gameName = game?.name ?? (gameSlug === 'pokemon' ? 'Pokémon TCG' : gameSlug === 'riftbound' ? 'Riftbound' : gameSlug);

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <SEO title={`${gameName} Kartları | Ecarte TCG`} description={`${gameName} single kart, booster box ve sealed ürünleri. Ecarte TCG marketplace.`} />
      <Header />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1020 0%, #151530 40%, #0d0d1a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 55%)',
        }} />
        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500 mb-8">
            <Link href="/magaza" className="hover:text-zinc-300 transition-colors">Mağaza</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-zinc-300">{gameName}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            {game?.logo_url ? (
              <img src={game.logo_url} alt={gameName}
                className="h-16 sm:h-20 object-contain self-start sm:self-center"
                style={{ filter: 'drop-shadow(0 0 32px rgba(99,102,241,0.5)) brightness(1.1)' }}
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Package className="w-8 h-8 text-indigo-400" />
              </div>
            )}
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-3"
                style={{ fontFamily: 'var(--font-display)' }}>
                {gameName}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                {sets.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04]">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-sm text-zinc-300">{sets.length} set</span>
                  </div>
                )}
                {totalCards > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04]">
                    <Package className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-sm text-zinc-300">{totalCards.toLocaleString('tr-TR')} kart satışta</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* ── Sets Grid ── */}
        {sets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h2 className="text-lg font-bold text-white">Setler & Expansionlar</h2>
              </div>
              <Link href={`/magaza?game=${gameSlug}`}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors">
                Tümünü Filtrele <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sets.map(set => (
                <Link key={set.id} href={`/set/${set.slug}`}>
                  <div className="group cursor-pointer rounded-xl border border-white/[0.07] p-4 flex flex-col items-center text-center gap-3 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/[0.06]"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {set.logo_url ? (
                      <img src={set.logo_url} alt={set.name}
                        className="h-10 object-contain transition-all duration-200 group-hover:scale-105"
                        style={{ filter: 'brightness(0.9) group-hover:brightness(1.1)' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-indigo-400" />
                      </div>
                    )}
                    <div className="w-full">
                      <p className="text-xs font-semibold text-zinc-200 leading-tight group-hover:text-white transition-colors line-clamp-2 mb-1">
                        {set.name}
                      </p>
                      {set.release_date && (
                        <p className="text-[10px] text-zinc-600">{set.release_date}</p>
                      )}
                      {set.listed_cards > 0 && (
                        <p className="text-[10px] text-indigo-400 font-medium mt-0.5">{set.listed_cards} kart</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured Cards ── */}
        {(featuredCards.length > 0 || cardsLoading) && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h2 className="text-lg font-bold text-white">Son Eklenen Kartlar</h2>
              </div>
              <Link href={`/magaza?game=${gameSlug}&sort=newest`}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors">
                Tümünü Gör <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {cardsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.07] animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }}>
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
                {featuredCards.slice(0, 8).map(card => <CardCard key={card.id} card={card} />)}
              </div>
            )}
          </section>
        )}

      </div>

      <Footer />
    </div>
  );
}
