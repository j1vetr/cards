import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardGames, useCardSets, useCards } from '@/hooks/useTcg';
import { ChevronRight, Loader2, Layers } from 'lucide-react';
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
      <div className="min-h-screen bg-zinc-50">
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
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="text-2xl font-bold mb-4">Oyun bulunamadı</h1>
          <Link href="/magaza"><button className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">Mağazaya Dön</button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const gameName = game?.name ?? (gameSlug === 'pokemon' ? 'Pokémon TCG' : gameSlug === 'riftbound' ? 'Riftbound' : gameSlug);

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO title={`${gameName} Kartları | Ecarte TCG`} description={`${gameName} single kart, booster box ve sealed ürünleri. Ecarte TCG marketplace.`} />
      <Header />

      <div className="bg-gradient-to-br from-[hsl(220,65%,36%)] to-[hsl(220,72%,27%)] text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-1.5 text-sm text-indigo-200 mb-6">
            <Link href="/magaza" className="hover:text-white transition-colors">Mağaza</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-medium">{gameName}</span>
          </nav>
          <div className="flex items-center gap-6">
            {game?.logo_url && <img src={game.logo_url} alt={gameName} className="h-16 object-contain" />}
            <div>
              <h1 className="text-4xl font-bold mb-2">{gameName}</h1>
              <p className="text-indigo-200">
                {sets.length > 0 && `${sets.length} set · `}
                {totalCards > 0 && `${totalCards.toLocaleString('tr-TR')} kart satışta`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {sets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Setler & Expansionlar
              </h2>
              <Link href={`/magaza?game=${gameSlug}`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                Tümünü Filtrele <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sets.map(set => (
                <Link key={set.id} href={`/set/${set.slug}`}>
                  <div className="bg-white rounded-xl border border-zinc-100 p-4 hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer flex flex-col items-center text-center gap-3">
                    {set.logo_url ? (
                      <img src={set.logo_url} alt={set.name} className="h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                        <Layers className="w-5 h-5 text-zinc-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-indigo-700 transition-colors line-clamp-2">
                        {set.name}
                      </p>
                      {set.release_date && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">{set.release_date}</p>
                      )}
                      {set.listed_cards > 0 && (
                        <p className="text-[10px] text-indigo-500 font-medium mt-0.5">{set.listed_cards} kart</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {featuredCards.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Son Eklenen Kartlar</h2>
              <Link href={`/magaza?game=${gameSlug}&sort=newest`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                Tümünü Gör <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {cardsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-white border border-zinc-100 animate-pulse">
                    <div className="aspect-[63/88] bg-zinc-100 rounded-t-xl" />
                    <div className="p-3 space-y-2"><div className="h-3 bg-zinc-100 rounded w-1/2" /><div className="h-4 bg-zinc-100 rounded" /></div>
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
