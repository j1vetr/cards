import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Header } from '@/components/Header';
import { SEO } from '@/components/SEO';
import { useCardDetail, useSimilarCards } from '@/hooks/useTcg';
import { useCart } from '@/hooks/useCart';
import { useCartModal } from '@/hooks/useCartModal';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronRight, ChevronLeft, ShoppingCart, Minus, Plus, Loader2,
  Shield, Zap, Package, Heart, Pencil, Calendar, Hash, CheckCircle2,
} from 'lucide-react';

const CONDITION_ORDER = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10', 'PSA9', 'PSA8', 'PSA7'];
const CONDITION_LABELS: Record<string, string> = {
  NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
  HP: 'Heavily Played', DMG: 'Damaged',
  PSA10: 'PSA 10 Gem Mint', PSA9: 'PSA 9 Mint', PSA8: 'PSA 8 NM-MT', PSA7: 'PSA 7 NM',
};
const FALLBACK = 'https://images.pokemontcg.io/sv3pt5/logo.png';

function fmtDate(raw?: string | null) {
  if (!raw) return null;
  const m = raw.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : raw;
}

/* ─── 3D HoloCard ────────────────────────────────────────────────────── */
function HoloCard({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-14, 14]);
  const springX = useSpring(rotateX, { stiffness: 130, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 130, damping: 20 });

  useEffect(() => { if (src) setImgSrc(src); }, [src]);
  useEffect(() => {
    const t = [
      setTimeout(() => { x.set(0.30);  y.set(-0.18); }, 700),
      setTimeout(() => { x.set(-0.28); y.set(0.20);  }, 1500),
      setTimeout(() => { x.set(0.20);  y.set(0.15);  }, 2300),
      setTimeout(() => { x.set(0);     y.set(0);     }, 3100),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const getXY = (cx: number, cy: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    x.set((cx - r.left) / r.width - 0.5);
    y.set((cy - r.top) / r.height - 0.5);
  };
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) =>
    getXY(e.clientX, e.clientY, e.currentTarget), []);
  const onMouseLeave = useCallback(() => { x.set(0); y.set(0); }, []);
  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (t) getXY(t.clientX, t.clientY, e.currentTarget);
  }, []);
  const onTouchEnd = useCallback(() => { x.set(0); y.set(0); }, []);

  return (
    <div className="relative flex items-center justify-center select-none touch-none"
      style={{ perspective: '1000px', padding: '20px 16px' }}
      onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 65%, rgba(99,102,241,0.55) 0%, rgba(79,70,229,0.2) 42%, transparent 70%)',
        filter: 'blur(52px)', transform: 'scale(1.6)',
      }} />
      <motion.div style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }} className="relative z-10">
        <img src={imgSrc} alt={alt} onError={() => setImgSrc(FALLBACK)} draggable={false}
          className="h-auto w-full"
          style={{
            maxWidth: 'clamp(280px, 90%, 420px)',
            borderRadius: '4.5% / 3.3%',
            filter: 'drop-shadow(0 20px 44px rgba(79,70,229,0.65)) drop-shadow(0 4px 10px rgba(0,0,0,0.95))',
          }}
        />
      </motion.div>
    </div>
  );
}

/* ─── Set cards row ──────────────────────────────────────────────────── */
function SetCardsRow({ cards, setSlug }: { cards: any[]; setSlug?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dotIdx, setDotIdx] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  const recalcDots = useCallback(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    setDotIdx(Math.round(el.scrollLeft / el.clientWidth));
    setDotCount(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)));
  }, []);

  useEffect(() => {
    recalcDots();
    const ro = new ResizeObserver(recalcDots);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [cards, recalcDots]);

  const scroll = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.85), behavior: 'smooth' });

  if (!cards.length) return null;

  return (
    <section className="border-t border-white/[0.07] pt-4 pb-4">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-sm font-semibold text-white">Bu Setten Diğer Kartlar</span>
          </div>
          <div className="flex items-center gap-2">
            {setSlug && (
              <Link href={`/set/${setSlug}`}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5">
                Tümünü Gör <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={() => scroll(-1)}
                className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => scroll(1)}
                className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div ref={ref} onScroll={recalcDots}
          className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
          {cards.map((c: any) => (
            <Link key={c.id} href={`/kart/${c.slug}`}>
              <div className="group cursor-pointer shrink-0" style={{ width: '110px' }}>
                <div className="rounded-xl overflow-hidden" style={{ height: '154px', background: 'rgba(255,255,255,0.025)' }}>
                  <img src={c.image_url || FALLBACK} alt={c.name} loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.06]"
                    style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.7))' }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 font-medium text-center truncate px-0.5 group-hover:text-white transition-colors">{c.name}</p>
                {c.min_price && (
                  <p className="text-[10px] text-indigo-400 font-semibold text-center">
                    {parseFloat(c.min_price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {dotCount > 1 && (
          <div className="flex sm:hidden items-center justify-center gap-1.5 mt-2.5">
            {Array.from({ length: Math.min(dotCount, 8) }).map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${i === dotIdx ? 'w-3 h-1.5 bg-indigo-400' : 'w-1.5 h-1.5 bg-zinc-700'}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function CardDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? '';

  const { data: card, isLoading, isError } = useCardDetail(slug);
  const { data: similar = [] } = useSimilarCards(slug);
  const { addToCart } = useCart();
  const { showModal } = useCartModal();
  const { toast } = useToast();

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const sortedListings: any[] = card?.listings
    ? [...card.listings].sort((a: any, b: any) =>
        CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition))
    : [];

  useEffect(() => {
    if (sortedListings.length && !selectedListingId)
      setSelectedListingId(sortedListings[0]?.id ?? null);
  }, [card?.id]);

  const selectedListing = sortedListings.find((l: any) => l.id === selectedListingId) ?? sortedListings[0] ?? null;
  const price = selectedListing ? parseFloat(selectedListing.price) : null;
  const stock: number | null = selectedListing?.stock ?? null;
  const lowStock = stock !== null && stock <= 10 && stock > 0;

  const cardTypes: string[] = Array.isArray(card?.card_types)
    ? card.card_types
    : typeof card?.card_types === 'string'
    ? (() => { try { return JSON.parse(card.card_types); } catch { return []; } })()
    : [];

  const imgSrc = card?.image_url_hi_res ?? card?.image_url ?? FALLBACK;

  const handleAddToCart = async () => {
    if (!selectedListing) return;
    setIsAdding(true);
    try {
      await addToCart(undefined, undefined, quantity, { cardListingId: selectedListing.id });
      showModal({ name: card.name, image: imgSrc, price: price ?? 0, quantity });
      toast({
        title: 'Sepete eklendi',
        description: `${card.name} — ${CONDITION_LABELS[selectedListing.condition] ?? selectedListing.condition}`,
      });
    } catch (err: any) {
      toast({ title: 'Hata', description: err?.message ?? 'Sepete eklenemedi', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <Header />
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    </div>
  );

  if (isError || !card) return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <Header />
      <div className="max-w-md mx-auto px-6 py-40 text-center">
        <p className="text-5xl mb-5">🃏</p>
        <h1 className="text-xl font-bold text-white mb-2">Kart bulunamadı</h1>
        <p className="text-zinc-500 text-sm mb-7">Bu kart mevcut değil veya kaldırılmış.</p>
        <Link href="/magaza">
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Mağazaya Dön
          </button>
        </Link>
      </div>
    </div>
  );

  const statItems = [
    card.hp               ? { Icon: Heart,    label: 'HP',             val: String(card.hp) } : null,
    cardTypes.length      ? { Icon: Zap,      label: 'Tür',            val: cardTypes.join(', ') } : null,
    card.artist           ? { Icon: Pencil,   label: 'Sanatçı',        val: card.artist } : null,
    card.set_release_date ? { Icon: Calendar, label: 'Çıkış Tarihi',   val: fmtDate(card.set_release_date) ?? '' } : null,
    (card.card_number && card.set_total_cards)
      ? { Icon: Hash, label: 'Sıra', val: `${card.card_number}/${card.set_total_cards}` } : null,
  ].filter(Boolean) as { Icon: any; label: string; val: string }[];

  return (
    <div style={{ background: '#09090f' }} className="min-h-screen">
      <SEO
        title={`${card.name} — ${card.set_name} | Ecarte TCG`}
        description={`${card.name}${card.rarity ? ' (' + card.rarity + ')' : ''} — ${card.set_name}. Ecarte'de satın al.`}
      />
      <Header />

      <main>

        {/* ── Breadcrumb ── */}
        <nav className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-3 pb-1">
          <ol className="flex items-center gap-1 text-[11px] text-zinc-600 flex-wrap">
            <li><Link href="/magaza" className="hover:text-zinc-300 transition-colors">Ana Sayfa</Link></li>
            {card.set_slug && (<>
              <ChevronRight className="w-2.5 h-2.5 shrink-0" />
              <li><Link href={`/set/${card.set_slug}`} className="hover:text-zinc-300 transition-colors">{card.set_name}</Link></li>
            </>)}
            <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            <li className="text-zinc-400 truncate max-w-[160px] sm:max-w-[260px] lg:max-w-none">{card.name}</li>
          </ol>
        </nav>

        {/* ── Desktop: viewport-height flex container ─── Mobile: normal flow ── */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-3
          lg:flex lg:gap-10 lg:items-start lg:overflow-hidden lg:h-[calc(100vh-108px)]">

          {/* ── LEFT: card (sticky on desktop) ── */}
          <div className="lg:w-[420px] xl:w-[480px] lg:shrink-0 lg:sticky lg:top-0 lg:self-start flex flex-col items-center">

            {/* Mobile: header info above card */}
            <div className="lg:hidden w-full mb-2 space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {card.rarity && (
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide">
                    {card.rarity}
                  </span>
                )}
                {card.card_number && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10">
                    #{card.card_number}
                  </span>
                )}
              </div>
              <h1 className="text-[26px] font-bold text-white leading-[1.08] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}>
                {card.name}
              </h1>
              <p className="text-xs text-zinc-500 leading-tight">
                {card.set_name}{card.set_series ? ` · ${card.set_series}` : ''}
              </p>
            </div>

            {/* Card image */}
            <div className="w-full">
              <HoloCard src={imgSrc} alt={card.name} />
            </div>

            {/* Set logo */}
            {(card.set_logo_url || card.set_symbol_url) && (
              <div className="flex items-center gap-3 mt-2 opacity-50 hover:opacity-75 transition-opacity">
                {card.set_logo_url && <img src={card.set_logo_url} alt={card.set_name} className="h-7 object-contain" />}
                {card.set_symbol_url && <img src={card.set_symbol_url} alt="" className="h-5 object-contain" />}
              </div>
            )}
          </div>

          {/* ── RIGHT: info panel (scrollable on desktop) ── */}
          <div className="mt-4 lg:mt-0 lg:flex-1 lg:min-w-0 lg:overflow-y-auto lg:h-full lg:pr-1 space-y-3.5 pb-6">

            {/* Desktop-only: badges + name */}
            <div className="hidden lg:block space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {card.rarity && (
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide">
                    {card.rarity}
                  </span>
                )}
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10">
                  {card.set_name}
                </span>
                {card.card_number && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10">
                    #{card.card_number}
                  </span>
                )}
              </div>
              <h1 className="text-[34px] xl:text-[40px] font-bold text-white leading-[1.05] tracking-[-0.025em]"
                style={{ fontFamily: 'var(--font-display)' }}>
                {card.name}
              </h1>
              <p className="text-sm text-zinc-500">
                <Link href={`/set/${card.set_slug}`} className="hover:text-zinc-300 transition-colors">{card.set_name}</Link>
                {card.set_series && <span> · {card.set_series}</span>}
              </p>
            </div>

            {/* Desktop stat grid (5 cols) */}
            {statItems.length > 0 && (
              <div className="hidden lg:grid grid-cols-5 gap-3 py-3 border-y border-white/[0.07]">
                {statItems.map(({ Icon, label, val }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest">{label}</span>
                    <span className="text-sm font-semibold text-zinc-200 truncate">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile stat rows */}
            {statItems.length > 0 && (
              <div className="lg:hidden rounded-xl border border-white/[0.07] overflow-hidden">
                {statItems.map(({ Icon, label, val }, i) => (
                  <div key={label} className={`flex items-center justify-between px-3.5 py-2.5 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <span className="text-xs text-zinc-500">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-200 truncate max-w-[140px] text-right">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile: Orijinal Kart Garantisi badge */}
            <div className="lg:hidden flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/[0.07]">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-sm font-medium text-zinc-300">Orijinal Kart Garantisi</span>
            </div>

            {/* ── Condition + Price box ── */}
            <div className="rounded-2xl border border-white/[0.1] overflow-hidden" style={{ background: 'rgba(255,255,255,0.035)' }}>
              {sortedListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2">

                  {/* Left: condition list */}
                  <div className="sm:border-r border-b sm:border-b-0 border-white/[0.08]">
                    <div className="px-4 py-2.5 border-b border-white/[0.08]">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Kart Durumu</span>
                    </div>
                    {sortedListings.map((listing: any) => {
                      const isSel = (selectedListingId ?? sortedListings[0]?.id) === listing.id;
                      return (
                        <button key={listing.id}
                          data-testid={`btn-condition-${listing.condition}`}
                          onClick={() => { setSelectedListingId(listing.id); setQuantity(1); }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] last:border-0 transition-all duration-150 text-left ${
                            isSel ? 'bg-indigo-600/25' : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className={`text-sm ${isSel ? 'text-white font-medium' : 'text-zinc-400'}`}>
                            {CONDITION_LABELS[listing.condition] ?? listing.condition}
                          </span>
                          <span className={`text-sm font-semibold tabular-nums ${isSel ? 'text-indigo-300' : 'text-zinc-400'}`}>
                            ₺{parseFloat(listing.price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: price + buy */}
                  <div className="flex flex-col p-4 gap-3">
                    <div className="border-b border-white/[0.08] pb-3">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Fiyat</span>
                    </div>

                    {price != null ? (
                      <div className="text-[36px] sm:text-[40px] font-bold leading-none tracking-tight"
                        style={{ color: '#8b7cf8', fontFamily: 'var(--font-display)' }}>
                        ₺{price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 py-2">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" style={{ animationDelay: `${d}ms` }} />
                        ))}
                        <span className="text-sm text-zinc-600 ml-1">Fiyat yakında</span>
                      </div>
                    )}

                    {lowStock && stock !== null && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-400">Stokta son {stock} ürün kaldı!</span>
                      </div>
                    )}

                    {selectedListing && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg overflow-hidden border border-white/10">
                          <button data-testid="btn-qty-dec"
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-25">
                            <Minus className="w-3 h-3" />
                          </button>
                          <div className="w-10 h-8 bg-white/[0.03] flex items-center justify-center border-x border-white/10">
                            <span className="text-sm font-bold text-white">{quantity}</span>
                          </div>
                          <button data-testid="btn-qty-inc"
                            onClick={() => setQuantity(q => Math.min(q + 1, 99))}
                            disabled={quantity >= 99}
                            className="w-8 h-8 flex items-center justify-center bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-25">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <button data-testid="btn-addtocart"
                      onClick={handleAddToCart}
                      disabled={isAdding || !selectedListing}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-950/50">
                      {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                      {isAdding ? 'Ekleniyor…' : selectedListing ? 'Sepete Ekle' : 'Fiyat Bekleniyor'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500">Fiyat yakında güncelleniyor</p>
                </div>
              )}
            </div>

            {/* ── Trust row (subtitles shown on all breakpoints) ── */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] p-3">
              {[
                { Icon: Shield,  title: 'Güvenli Alışveriş', sub: '256-Bit SSL ile korunur' },
                { Icon: Zap,     title: 'Hızlı Kargo',       sub: '1-2 iş günü içinde kargoda' },
                { Icon: Package, title: 'İade Garantisi',     sub: '14 gün koşulsuz iade' },
              ].map(({ Icon, title, sub }) => (
                <div key={title} className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300 leading-tight">{title}</span>
                  <span className="text-[9px] text-zinc-600 leading-tight">{sub}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── Set cards (always below the viewport-constrained area) ── */}
        <SetCardsRow cards={similar} setSlug={card.set_slug} />

      </main>
    </div>
  );
}
