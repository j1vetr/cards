import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { CardCard } from '@/components/CardCard';
import { useCards } from '@/hooks/useTcg';

export function OnSaleCardsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({
    ratio: 0,
    canScroll: false,
    atStart: true,
    atEnd: true,
  });
  const { data, isLoading: queryLoading, isPlaceholderData, isError, refetch } = useCards({
    game: 'riftbound',
    inStock: true,
    sort: 'newest',
    limit: 18,
  });
  const isLoading = queryLoading || isPlaceholderData;
  const cards = data?.cards ?? [];

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
  }, [cards.length, isLoading, isError]);

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
    return () => {
      observer.disconnect();
      element.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <section
      id="satista-olan-kartlar"
      data-testid="section-cards-on-sale"
      aria-labelledby="on-sale-heading"
      className="relative overflow-hidden py-12 sm:py-16"
      style={{ background: '#080e1c' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.35 }}
          className="mb-7 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-500/10">
                <img src="/icon-riftbound.svg" alt="" className="h-[18px] w-[18px] object-contain" />
              </span>
              {!isLoading && !isError && data && (
                <span className="text-xs font-medium tabular-nums text-indigo-200/75">
                  {data.total.toLocaleString('tr-TR')} Kart Stokta
                </span>
              )}
            </div>
            <h2
              id="on-sale-heading"
              className="text-3xl font-bold leading-none tracking-tight text-white sm:text-[2.65rem]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              Riftbound Kartları
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300/75 sm:text-[15px]">
              Stoktaki Riftbound Kartlarını Set Ve Kondisyon Seçenekleriyle Keşfet.
            </p>
          </div>
          <Link
            href="/kartlar?game=riftbound&inStock=true"
            data-testid="btn-on-sale-all"
            className="inline-flex shrink-0 items-center justify-center gap-2.5 self-start rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-4 py-3 text-sm font-semibold text-indigo-100 transition-colors hover:border-indigo-300/50 hover:bg-indigo-500/25 sm:self-auto"
          >
            <img
              src="/icon-riftbound.svg"
              alt=""
              data-testid="riftbound-showcase-cta-icon"
              className="h-4 w-4 object-contain"
            />
            Tüm Riftbound Kartları
            <ChevronRight className="h-4 w-4 text-indigo-200" />
          </Link>
        </motion.div>

        <div className="relative border-t border-indigo-300/10 pt-5">
          {scrollPosition.canScroll && (
            <>
              <button
                type="button"
                data-testid="btn-on-sale-prev"
                onClick={() => scrollPage(-1)}
                disabled={scrollPosition.atStart}
                aria-label="Önceki Kartlar"
                className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-200/15 bg-[#101a31] text-white/80 transition-colors hover:border-indigo-300/45 hover:bg-[#172344] disabled:cursor-default disabled:opacity-35 sm:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-testid="btn-on-sale-next"
                onClick={() => scrollPage(1)}
                disabled={scrollPosition.atEnd}
                aria-label="Sonraki Kartlar"
                className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-200/15 bg-[#101a31] text-white/80 transition-colors hover:border-indigo-300/45 hover:bg-[#172344] disabled:cursor-default disabled:opacity-35 sm:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <div
            ref={scrollRef}
            id="on-sale-card-list"
            role="region"
            aria-label="Riftbound Kartları"
            data-testid="on-sale-card-list"
            onScroll={updateScrollPosition}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 scrollbar-hide sm:gap-4 sm:snap-none"
          >
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  data-testid="skeleton-on-sale-card"
                  aria-hidden="true"
                  className="aspect-[63/88] shrink-0 animate-pulse rounded-xl border border-indigo-200/[0.08] bg-[#111b31]"
                  style={{ width: 'clamp(145px, 38vw, 190px)' }}
                />
              ))
            ) : isError ? (
              <div className="flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-rose-300/20 bg-rose-300/[0.04] px-5 text-center">
                <p className="text-sm font-semibold text-rose-100">Kartlar Şu An Yüklenemedi.</p>
                <p className="mt-1 text-xs text-slate-300/65">Bağlantıyı Kontrol Edip Yeniden Deneyin.</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-rose-200/25 px-3 py-2 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-200/10"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Yeniden Dene
                </button>
              </div>
            ) : cards.length > 0 ? (
              cards.map((card, index) => (
                <motion.article
                  key={card.id}
                  data-testid={`on-sale-card-${card.slug}`}
                  data-card-slug={card.slug}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.16) }}
                  className="w-[clamp(145px,38vw,190px)] shrink-0 snap-start"
                >
                  <CardCard card={card} />
                </motion.article>
              ))
            ) : (
              <div className="flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200/15 bg-[#0d1528] px-5 text-center">
                <img src="/icon-riftbound.svg" alt="" className="mb-3 h-8 w-8 object-contain opacity-55" />
                <p className="text-sm font-semibold text-white/80">Şu Anda Stokta Kart Yok.</p>
                <p className="mt-1 text-xs text-slate-300/55">Yeni Stok Eklendiğinde Kartlar Burada Görünecek.</p>
              </div>
            )}
          </div>
          {scrollPosition.canScroll && (
            <div className="mx-auto mt-3 h-1 w-full max-w-40 overflow-hidden rounded-full bg-indigo-100/10" aria-hidden="true">
              <div
                className="h-full w-2/5 rounded-full bg-indigo-400/75 transition-transform duration-150"
                style={{ transform: `translateX(${scrollPosition.ratio * 150}%)` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
