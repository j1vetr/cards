import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { useCardDetail, useSimilarCards } from '@/hooks/useTcg';
import { useCart } from '@/hooks/useCart';
import { useCartModal } from '@/hooks/useCartModal';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronRight, ShoppingCart, Minus, Plus, Loader2, Shield, Zap, Package,
} from 'lucide-react';

const CONDITION_ORDER = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10', 'PSA9', 'PSA8', 'PSA7'];
const CONDITION_LABELS: Record<string, string> = {
  NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
  HP: 'Heavily Played', DMG: 'Damaged',
  PSA10: 'PSA 10 Gem Mint', PSA9: 'PSA 9 Mint', PSA8: 'PSA 8 NM-MT', PSA7: 'PSA 7 NM',
};

const FALLBACK = 'https://images.pokemontcg.io/sv3pt5/logo.png';

/* ─── 3D Tilt Card with auto-demo on mount ──────────────────────────── */
function HoloCard({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-14, 14]);
  const springX = useSpring(rotateX, { stiffness: 130, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 130, damping: 20 });

  useEffect(() => { if (src) setImgSrc(src); }, [src]);

  /* Auto-demo tilt sequence on mount */
  useEffect(() => {
    const timers = [
      setTimeout(() => { x.set(0.30);  y.set(-0.18); }, 700),
      setTimeout(() => { x.set(-0.28); y.set(0.20);  }, 1500),
      setTimeout(() => { x.set(0.20);  y.set(0.15);  }, 2300),
      setTimeout(() => { x.set(0);     y.set(0);     }, 3100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const getXY = (clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    x.set((clientX - r.left) / r.width - 0.5);
    y.set((clientY - r.top) / r.height - 0.5);
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
    <div
      className="relative flex items-center justify-center select-none touch-none"
      style={{ perspective: '1000px', padding: '24px 16px' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 65%, rgba(99,102,241,0.55) 0%, rgba(79,70,229,0.2) 42%, transparent 70%)',
        filter: 'blur(52px)',
        transform: 'scale(1.6)',
      }} />
      <motion.div
        style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }}
        className="relative z-10"
      >
        <img
          src={imgSrc}
          alt={alt}
          onError={() => setImgSrc(FALLBACK)}
          draggable={false}
          className="h-auto w-full"
          style={{
            maxWidth: 'clamp(200px, 52vw, 300px)',
            borderRadius: '4.5% / 3.3%',
            filter: 'drop-shadow(0 24px 48px rgba(79,70,229,0.65)) drop-shadow(0 4px 12px rgba(0,0,0,0.95))',
          }}
        />
      </motion.div>
    </div>
  );
}

/* ─── Set-marquee (scrolling strip) ────────────────────────────────── */
function Marquee({ cards, setSlug, setName }: {
  cards: any[]; setSlug?: string; setName?: string;
}) {
  if (!cards.length) return null;
  const copies = cards.length < 8 ? 4 : 2;
  const items = Array.from({ length: copies }, () => cards).flat();

  return (
    <section className="border-t border-white/[0.07] py-10 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-5 sm:px-8 mb-5 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.16em]">
          Bu Setteki Diğer Kartlar
        </p>
        {setSlug && (
          <Link href={`/set/${setSlug}`}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
            {setName} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="flex marquee-scroll" style={{ width: 'max-content', gap: '12px', paddingLeft: '16px' }}>
        {items.map((c: any, i: number) => (
          <Link key={`${c.id}-${i}`} href={`/kart/${c.slug}`}>
            <div className="group cursor-pointer shrink-0" style={{ width: '148px' }}>
              <div className="rounded-xl overflow-hidden" style={{ height: '207px', background: 'rgba(255,255,255,0.025)' }}>
                <img
                  src={c.image_url || FALLBACK} alt={c.name} loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.06]"
                  style={{ filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.7))' }}
                />
              </div>
              <p className="text-[11px] text-zinc-300 mt-1.5 font-medium text-center truncate px-1 leading-tight group-hover:text-white transition-colors">
                {c.name}
              </p>
              {c.rarity && (
                <p className="text-[10px] text-zinc-600 text-center truncate px-1">{c.rarity}</p>
              )}
              {c.min_price && (
                <p className="text-[11px] text-indigo-400 font-semibold text-center mt-0.5">
                  {parseFloat(c.min_price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */
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
    ? [...card.listings].sort(
        (a: any, b: any) => CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition)
      )
    : [];

  useEffect(() => {
    if (sortedListings.length && !selectedListingId) {
      setSelectedListingId(sortedListings[0]?.id ?? null);
    }
  }, [card?.id]);

  const selectedListing =
    sortedListings.find((l: any) => l.id === selectedListingId) ??
    sortedListings[0] ??
    null;
  const price = selectedListing ? parseFloat(selectedListing.price) : null;
  const marketPrice = card?.marketPrice;

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

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  if (isError || !card) {
    return (
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
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ background: '#09090f' }} className="min-h-screen">
      <SEO
        title={`${card.name} — ${card.set_name} | Ecarte TCG`}
        description={`${card.name}${card.rarity ? ' (' + card.rarity + ')' : ''} — ${card.set_name}. Ecarte'de satın al.`}
      />
      <Header />

      <main>
        {/* ── Breadcrumb ── */}
        <nav className="max-w-screen-xl mx-auto px-5 sm:px-8 pt-5">
          <ol className="flex items-center gap-1 text-[11px] text-zinc-600 flex-wrap">
            <li><Link href="/magaza" className="hover:text-zinc-300 transition-colors">Mağaza</Link></li>
            {card.game_slug && (<>
              <ChevronRight className="w-2.5 h-2.5 shrink-0" />
              <li><Link href={`/magaza?game=${card.game_slug}`} className="hover:text-zinc-300 transition-colors">{card.game_name}</Link></li>
            </>)}
            {card.set_slug && (<>
              <ChevronRight className="w-2.5 h-2.5 shrink-0" />
              <li><Link href={`/set/${card.set_slug}`} className="hover:text-zinc-300 transition-colors">{card.set_name}</Link></li>
            </>)}
            <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            <li className="text-zinc-400 truncate max-w-[140px] sm:max-w-[220px]">{card.name}</li>
          </ol>
        </nav>

        {/* ── Hero ── */}
        <div className="max-w-screen-xl mx-auto px-5 sm:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] gap-6 sm:gap-8 lg:gap-14 items-start">

            {/* LEFT: card */}
            <div className="flex flex-col items-center gap-3 sm:sticky sm:top-6">
              <HoloCard src={imgSrc} alt={card.name} />
              {(card.set_logo_url || card.set_symbol_url) && (
                <div className="flex items-center gap-3 opacity-50 hover:opacity-75 transition-opacity">
                  {card.set_logo_url && <img src={card.set_logo_url} alt={card.set_name} className="h-7 object-contain" />}
                  {card.set_symbol_url && <img src={card.set_symbol_url} alt="" className="h-5 object-contain" />}
                </div>
              )}
            </div>

            {/* RIGHT: details */}
            <div className="space-y-5">

              {/* Rarity + game badges */}
              <div className="flex flex-wrap gap-1.5">
                {card.rarity && (
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide">
                    {card.rarity}
                  </span>
                )}
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10">
                  {card.game_name}
                </span>
                {card.card_number && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10">
                    #{card.card_number}
                  </span>
                )}
              </div>

              {/* Name */}
              <div>
                <h1
                  className="text-[28px] sm:text-[34px] lg:text-[40px] font-bold text-white leading-[1.05] tracking-[-0.025em]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {card.name}
                </h1>
                <p className="text-sm text-zinc-500 mt-1.5">
                  <Link href={`/set/${card.set_slug}`} className="hover:text-zinc-300 transition-colors">
                    {card.set_name}
                  </Link>
                  {card.set_series && <span className="text-zinc-500"> · {card.set_series}</span>}
                </p>
              </div>

              {/* Stat row: HP · types · artist · number */}
              {(card.hp || cardTypes.length || card.artist || card.card_number) && (
                <div className="grid grid-cols-3 gap-x-4 gap-y-3 py-3 border-y border-white/[0.07]">
                  {card.hp && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest">HP</span>
                      <span className="text-sm font-semibold text-zinc-200">{card.hp}</span>
                    </div>
                  )}
                  {cardTypes.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Tür</span>
                      <span className="text-sm font-semibold text-zinc-200">{cardTypes.join(' · ')}</span>
                    </div>
                  )}
                  {card.artist && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Artist</span>
                      <span className="text-sm font-semibold text-zinc-200 truncate max-w-[140px]">{card.artist}</span>
                    </div>
                  )}
                  {card.set_release_date && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Çıkış</span>
                      <span className="text-sm font-semibold text-zinc-200">{card.set_release_date}</span>
                    </div>
                  )}
                  {card.set_total_cards && card.card_number && (
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Sıra</span>
                      <span className="text-sm font-semibold text-zinc-200">{card.card_number}/{card.set_total_cards}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Card description */}
              {card.description && (
                <p className="text-sm text-zinc-500 leading-relaxed italic">
                  "{card.description}"
                </p>
              )}

              {/* PriceCharting ref */}
              {marketPrice && (
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="text-zinc-600 uppercase tracking-widest font-medium">Piyasa ref</span>
                  {marketPrice.price_market && (
                    <span className="text-zinc-500">Ort: <span className="text-zinc-300">${parseFloat(marketPrice.price_market).toFixed(2)}</span></span>
                  )}
                  {marketPrice.price_high && (
                    <span className="text-zinc-500">Maks: <span className="text-zinc-300">${parseFloat(marketPrice.price_high).toFixed(2)}</span></span>
                  )}
                </div>
              )}

              {/* Condition picker */}
              {sortedListings.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.14em] font-semibold mb-2.5">
                    Kondisyon
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sortedListings.map((listing: any) => {
                      const isSel = (selectedListingId ?? sortedListings[0]?.id) === listing.id;
                      return (
                        <button
                          key={listing.id}
                          data-testid={`btn-condition-${listing.condition}`}
                          onClick={() => { setSelectedListingId(listing.id); setQuantity(1); }}
                          className={`flex flex-col items-start px-3 py-2 rounded-xl border transition-all duration-150 ${
                            isSel
                              ? 'bg-indigo-600 border-indigo-500 shadow-md shadow-indigo-900/40'
                              : 'bg-white/[0.04] border-white/[0.09] hover:border-indigo-500/40 hover:bg-white/[0.07]'
                          }`}
                        >
                          <span className={`text-[9px] font-bold tracking-widest uppercase ${isSel ? 'text-indigo-200' : 'text-zinc-500'}`}>
                            {listing.condition}
                          </span>
                          <span className={`text-sm font-semibold mt-0.5 ${isSel ? 'text-white' : 'text-zinc-200'}`}>
                            {parseFloat(listing.price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedListing && (
                    <p className="text-[11px] text-zinc-600 mt-1.5">
                      {CONDITION_LABELS[selectedListing.condition] ?? selectedListing.condition}
                    </p>
                  )}
                </div>
              )}

              {/* Price + qty + CTA */}
              <div className="space-y-3.5">

                {/* Price */}
                {price != null ? (
                  <div>
                    <p
                      className="text-[38px] sm:text-[44px] leading-none font-bold text-white tracking-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xl text-zinc-500 ml-2 font-normal">₺</span>
                    </p>
                    {quantity > 1 && (
                      <p className="text-xs text-zinc-500 mt-1">
                        {quantity} adet toplam: {(price * quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="text-sm text-zinc-600 ml-1">Fiyat yakında</span>
                  </div>
                )}

                {/* Qty */}
                {selectedListing && (
                  <div className="inline-flex items-center rounded-xl overflow-hidden border border-white/10">
                    <button
                      data-testid="btn-qty-dec"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-9 h-9 flex items-center justify-center bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-25"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="w-11 h-9 bg-white/[0.03] flex items-center justify-center border-x border-white/10">
                      <span className="text-sm font-bold text-white">{quantity}</span>
                    </div>
                    <button
                      data-testid="btn-qty-inc"
                      onClick={() => setQuantity(q => Math.min(q + 1, 99))}
                      disabled={quantity >= 99}
                      className="w-9 h-9 flex items-center justify-center bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-25"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Add to cart */}
                <button
                  data-testid="btn-addtocart"
                  onClick={handleAddToCart}
                  disabled={isAdding || !selectedListing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-950/50"
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {isAdding
                    ? 'Ekleniyor…'
                    : selectedListing
                    ? `Sepete Ekle${price && quantity ? ` — ${(price * quantity).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺` : ''}`
                    : 'Fiyat Bekleniyor'}
                </button>

                {/* Trust */}
                <div className="flex items-center justify-center gap-6 pt-1">
                  {[
                    { Icon: Shield, label: 'Güvenli Ödeme' },
                    { Icon: Zap, label: 'Hızlı Teslimat' },
                    { Icon: Package, label: 'Orijinal Kart' },
                  ].map(({ Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <Icon className="w-3 h-3 text-zinc-600" />
                      <span className="text-[10px] text-zinc-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Marquee */}
        <Marquee cards={similar} setSlug={card.set_slug} setName={card.set_name} />
      </main>

      <Footer />
    </div>
  );
}
