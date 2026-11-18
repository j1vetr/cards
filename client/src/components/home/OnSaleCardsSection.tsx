import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LayoutGrid, RotateCw, Sparkles } from 'lucide-react';
import { CardCard } from '@/components/CardCard';
import { useCards } from '@/hooks/useTcg';

type OnSaleTabKey = 'all' | 'riftbound' | 'pokemon';

const TABS: Array<{ key: OnSaleTabKey; label: string; logo?: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'riftbound', label: 'Riftbound', logo: '/logo-riftbound.png' },
  { key: 'pokemon', label: 'Pokémon TCG', logo: '/logo-pokemon-tcg.webp' },
];

export function OnSaleCardsSection() {
  const [activeTab, setActiveTab] = useState<OnSaleTabKey>('riftbound');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({ ratio: 0, canScroll: false, atStart: true, atEnd: false });
  const activeGame = activeTab === 'all' ? undefined : activeTab;
  const { data, isLoading: queryLoading, isPlaceholderData, isError, refetch } = useCards({
    game: activeGame,
    inStock: true,
    sort: 'newest',
    limit: 18,
  });
  const isLoading = queryLoading || isPlaceholderData;
  const cards = data?.cards ?? [];

  const { data: allCount } = useCards({ inStock: true, limit: 1 });
  const { data: riftboundCount } = useCards({ game: 'riftbound', inStock: true, limit: 1 });
  const { data: pokemonCount } = useCards({ game: 'pokemon', inStock: true, limit: 1 });
  const counts: Record<OnSaleTabKey, number | undefined> = {
    all: allCount?.total,
    riftbound: riftboundCount?.total,
    pokemon: pokemonCount?.total,
  };

  const updateScrollPosition = () => {
    const element = scrollRef.current;
    if (!element) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    setScrollPosition(maxScroll <= 4
      ? { ratio: 0, canScroll: false, atStart: true, atEnd: true }
      : {
          ratio: element.scrollLeft / maxScroll,
          canScroll: true,
          atStart: element.scrollLeft <= 4,
          atEnd: element.scrollLeft >= maxScroll - 4,
        });
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ left: 0 });
    const frame = requestAnimationFrame(updateScrollPosition);
    return () => cancelAnimationFrame(frame);
  }, [activeTab, cards.length, isLoading, isError]);

  const scrollPage = (direction: 1 | -1) => {
    const element = scrollRef.current;
    element?.scrollBy({ left: element.clientWidth * 0.82 * direction, behavior: 'smooth' });
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const before = element.scrollLeft;
      element.scrollLeft += event.deltaY;
      if (element.scrollLeft !== before) event.preventDefault();
    };
    const observer = new ResizeObserver(updateScrollPosition);
    observer.observe(element);
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => { observer.disconnect(); element.removeEventListener('wheel', handleWheel); };
  }, []);

  return (
    <section
      id="satista-olan-kartlar"
      data-testid="section-cards-on-sale"
      aria-labelledby="on-sale-heading"
      className="relative overflow-hidden py-14 sm:py-20"
      style={{ background: '#101820' }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-48 right-[8%] h-[28rem] w-[28rem] rounded-full bg-[#d7a75b]/[0.08] blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#d7a75b]/30 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
          className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-[#e9bc72]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e9bc72]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Go Cards · Koleksiyonluk kartlar</span>
            </div>
            <h2 id="on-sale-heading" className="text-3xl font-bold leading-none text-[#f2eee5] sm:text-5xl" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {activeTab === 'riftbound' ? 'Riftbound kartları' : activeTab === 'pokemon' ? 'Pokémon TCG kartları' : 'Satıştaki kartlar'}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#b7c0c4]">
              Gerçek stoktaki kartları keşfet. Kartı seç, setini ve mevcut kondisyon seçeneklerini incele.
            </p>
          </div>
          <Link
            href={`/kartlar?inStock=true${activeGame ? `&game=${activeGame}` : ''}`}
            data-testid="btn-on-sale-all"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#d7a75b]/45 bg-[#d7a75b]/10 px-4 py-3 text-sm font-semibold text-[#f0ca8b] transition-colors hover:bg-[#d7a75b]/20 sm:self-auto"
          >
            <Sparkles className="h-4 w-4" />
            Bu seçkideki tüm kartlar
            <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="mb-6 flex gap-2 overflow-x-auto px-0.5 py-1 scrollbar-hide" role="tablist" aria-label="Kart oyunları">
          {TABS.map(tab => {
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-on-sale-${tab.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="on-sale-card-list"
                data-testid={`tab-on-sale-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                  selected ? 'border-[#d7a75b]/60 bg-[#d7a75b]/[0.12]' : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.06]'
                }`}
              >
                {tab.logo ? (
                  <span className="flex h-7 w-10 items-center justify-center rounded bg-[#091116]">
                    <img src={tab.logo} alt="" className="max-h-5 max-w-9 object-contain" />
                  </span>
                ) : (
                  <span className="flex h-7 w-10 items-center justify-center rounded bg-white/[0.06]">
                    <LayoutGrid className={`h-4 w-4 ${selected ? 'text-[#e9bc72]' : 'text-white/45'}`} />
                  </span>
                )}
                <span>
                  <span className={`block text-sm font-semibold ${selected ? 'text-[#f4ead7]' : 'text-white/70'}`}>{tab.label}</span>
                  <span className="block text-[10px] tabular-nums text-white/40">
                    {counts[tab.key] == null ? '\u00a0' : `${counts[tab.key]!.toLocaleString('tr-TR')} kart stokta`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          {scrollPosition.canScroll && (
            <>
              <button
                type="button"
                data-testid="btn-on-sale-prev"
                onClick={() => scrollPage(-1)}
                disabled={scrollPosition.atStart}
                aria-label="Önceki kartlar"
                className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#101820] text-white/80 transition hover:border-[#d7a75b]/60 hover:text-[#f0ca8b] disabled:pointer-events-none disabled:opacity-0 sm:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-testid="btn-on-sale-next"
                onClick={() => scrollPage(1)}
                disabled={scrollPosition.atEnd}
                aria-label="Sonraki kartlar"
                className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#101820] text-white/80 transition hover:border-[#d7a75b]/60 hover:text-[#f0ca8b] disabled:pointer-events-none disabled:opacity-0 sm:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <div
            ref={scrollRef}
            id="on-sale-card-list"
            role="tabpanel"
            aria-labelledby={`tab-on-sale-${activeTab}`}
            data-testid="on-sale-card-list"
            onScroll={updateScrollPosition}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 scrollbar-hide sm:gap-4 sm:snap-none"
          >
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  data-testid="skeleton-on-sale-card"
                  className="aspect-[63/88] shrink-0 animate-pulse rounded-xl border border-white/[0.07] bg-white/[0.045]"
                  style={{ width: 'clamp(145px, 38vw, 190px)' }}
                />
              ))
            ) : isError ? (
              <div className="flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-[#bd786c]/30 bg-[#bd786c]/[0.06] px-5 text-center">
                <p className="text-sm font-semibold text-[#f0d4cb]">Kartlar şu an yüklenemedi</p>
                <p className="mt-1 text-xs text-white/50">Bağlantıyı kontrol edip yeniden deneyebilirsin.</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#bd786c]/40 px-3 py-2 text-xs font-semibold text-[#f0d4cb] transition hover:bg-[#bd786c]/10"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Yeniden dene
                </button>
              </div>
            ) : cards.length > 0 ? (
              cards.map((card, index) => (
                <motion.article
                  key={card.id}
                  data-testid={`on-sale-card-${card.slug}`}
                  data-card-slug={card.slug}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.025, 0.2) }}
                  className="w-[clamp(145px,38vw,190px)] shrink-0 snap-start"
                >
                  <CardCard card={card} />
                </motion.article>
              ))
            ) : (
              <div className="flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 text-center">
                <img src={activeTab === 'pokemon' ? '/icon-pokemon.svg' : '/icon-riftbound.svg'} alt="" className="mb-3 h-8 w-8 object-contain opacity-50" />
                <p className="text-sm font-semibold text-white/75">{activeTab === 'pokemon' ? 'Pokémon kartı şu an stokta yok' : 'Bu seçkide stokta kart yok'}</p>
                <p className="mt-1 text-xs text-white/45">Yeni stok eklendiğinde kartlar burada görünecek.</p>
              </div>
            )}
          </div>
          {scrollPosition.canScroll && (
            <div className="mx-auto mt-4 h-1 w-full max-w-40 overflow-hidden rounded-full bg-white/10" aria-label="Vitrin ilerlemesi">
              <div
                className="h-full w-2/5 rounded-full bg-[#d7a75b] transition-transform duration-150"
                style={{ transform: `translateX(${scrollPosition.ratio * 150}%)` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
