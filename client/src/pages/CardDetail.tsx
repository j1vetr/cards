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

/* ── 3D Tilt Card ──────────────────────────────────────────────────── */
function HoloCard({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-14, 14]);
  const springX = useSpring(rotateX, { stiffness: 160, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 160, damping: 22 });

  useEffect(() => { if (src) setImgSrc(src); }, [src]);

  const getRelative = (clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    x.set((clientX - r.left) / r.width - 0.5);
    y.set((clientY - r.top) / r.height - 0.5);
  };

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    getRelative(e.clientX, e.clientY, e.currentTarget);
  }, []);

  const onMouseLeave = useCallback(() => { x.set(0); y.set(0); }, []);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (t) getRelative(t.clientX, t.clientY, e.currentTarget);
  }, []);

  const onTouchEnd = useCallback(() => { x.set(0); y.set(0); }, []);

  return (
    <div
      className="relative flex items-center justify-center select-none py-6 sm:py-8 touch-none"
      style={{ perspective: '1100px' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 65%, rgba(99,102,241,0.6) 0%, rgba(79,70,229,0.25) 40%, transparent 70%)',
          filter: 'blur(50px)',
          transform: 'scale(1.5)',
        }}
      />
      <motion.div
        style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }}
        className="relative z-10"
      >
        <img
          src={imgSrc}
          alt={alt}
          onError={() => setImgSrc(FALLBACK)}
          draggable={false}
          className="w-full max-w-[190px] sm:max-w-[240px] lg:max-w-[290px] xl:max-w-[310px] h-auto"
          style={{
            borderRadius: '4.5% / 3.3%',
            filter: 'drop-shadow(0 28px 50px rgba(79,70,229,0.65)) drop-shadow(0 4px 14px rgba(0,0,0,0.95))',
          }}
        />
      </motion.div>
    </div>
  );
}

/* ── Same-Set Marquee ──────────────────────────────────────────────── */
function Marquee({ cards, setSlug, setName }: {
  cards: any[];
  setSlug?: string;
  setName?: string;
}) {
  if (!cards.length) return null;
  const copies = cards.length < 8 ? 4 : 2;
  const items = Array.from({ length: copies }, () => cards).flat();

  return (
    <section className="border-t border-white/[0.08] py-10 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-5 sm:px-8 mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.15em]">
          Bu Setteki Diğer Kartlar
        </h2>
        {setSlug && (
          <Link
            href={`/set/${setSlug}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            {setName} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div
        className="flex marquee-scroll"
        style={{ width: 'max-content', gap: '14px', paddingLeft: '16px' }}
      >
        {items.map((c: any, i: number) => (
          <Link key={`${c.id}-${i}`} href={`/kart/${c.slug}`}>
            <div className="shrink-0 group cursor-pointer" style={{ width: '160px' }}>
              {/* Card image */}
              <div className="rounded-xl overflow-hidden" style={{ height: '224px', background: 'rgba(255,255,255,0.03)' }}>
                <img
                  src={c.image_url || FALLBACK}
                  alt={c.name}
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.7))' }}
                />
              </div>
              {/* Name */}
              <p className="text-xs text-zinc-300 mt-2 leading-tight font-medium text-center truncate group-hover:text-white transition-colors px-1">
                {c.name}
              </p>
              {/* Rarity */}
              {c.rarity && (
                <p className="text-[10px] text-zinc-600 text-center truncate px-1">{c.rarity}</p>
              )}
              {/* Price */}
              {c.min_price && (
                <p className="text-xs text-indigo-400 font-semibold text-center mt-0.5">
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

/* ── Main Page ─────────────────────────────────────────────────────── */
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

  /* Loading */
  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  /* Error */
  if (isError || !card) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="max-w-xl mx-auto px-6 py-40 text-center">
          <p className="text-6xl mb-6">🃏</p>
          <h1 className="text-2xl font-bold text-white mb-3">Kart bulunamadı</h1>
          <p className="text-zinc-400 mb-8">Bu kart mevcut değil veya kaldırılmış.</p>
          <Link href="/magaza">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-medium transition-colors">
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
        {/* Breadcrumb */}
        <nav className="max-w-screen-xl mx-auto px-5 sm:px-8 pt-5 pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-zinc-500 flex-wrap">
            <li>
              <Link href="/magaza" className="hover:text-zinc-300 transition-colors">Mağaza</Link>
            </li>
            {card.game_slug && (
              <>
                <ChevronRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                <li>
                  <Link href={`/magaza?game=${card.game_slug}`} className="hover:text-zinc-300 transition-colors">
                    {card.game_name}
                  </Link>
                </li>
              </>
            )}
            {card.set_slug && (
              <>
                <ChevronRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                <li>
                  <Link href={`/set/${card.set_slug}`} className="hover:text-zinc-300 transition-colors">
                    {card.set_name}
                  </Link>
                </li>
              </>
            )}
            <ChevronRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
            <li className="text-zinc-300 truncate max-w-[160px] sm:max-w-[240px]">{card.name}</li>
          </ol>
        </nav>

        {/* Hero grid */}
        <div className="max-w-screen-xl mx-auto px-5 sm:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] gap-6 sm:gap-10 lg:gap-16 items-start">

            {/* LEFT — card visual */}
            <div className="flex flex-col items-center gap-4 sm:sticky sm:top-6">
              <HoloCard src={imgSrc} alt={card.name} />

              {/* Set logos */}
              {(card.set_logo_url || card.set_symbol_url) && (
                <div className="flex items-center gap-3 opacity-40 hover:opacity-70 transition-opacity">
                  {card.set_logo_url && (
                    <img src={card.set_logo_url} alt={card.set_name} className="h-6 sm:h-7 object-contain" />
                  )}
                  {card.set_symbol_url && (
                    <img src={card.set_symbol_url} alt="" className="h-4 sm:h-5 object-contain" />
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — details */}
            <div className="space-y-5 sm:space-y-6">

              {/* ── Rarity & badges ── */}
              <div className="flex flex-wrap gap-2">
                {card.rarity && (
                  <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide">
                    {card.rarity}
                  </span>
                )}
                <span className="text-[11px] px-3 py-1 rounded-full bg-white/[0.07] text-zinc-400 border border-white/10">
                  {card.game_name}
                </span>
                {card.card_number && (
                  <span className="text-[11px] px-3 py-1 rounded-full bg-white/[0.07] text-zinc-400 border border-white/10">
                    #{card.card_number}
                  </span>
                )}
              </div>

              {/* ── Card name ── */}
              <div>
                <h1
                  className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-white leading-[1.05] tracking-[-0.02em]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {card.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm text-zinc-400">
                  <Link href={`/set/${card.set_slug}`} className="hover:text-zinc-200 transition-colors">
                    {card.set_name}
                  </Link>
                  {card.hp && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span>{card.hp} HP</span>
                    </>
                  )}
                  {card.artist && (
                    <>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500">{card.artist}</span>
                    </>
                  )}
                </div>
              </div>

              {/* ── Types ── */}
              {cardTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cardTypes.map((t: string) => (
                    <span
                      key={t}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/[0.07] text-zinc-300 border border-white/10"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10" />

              {/* ── PriceCharting reference ── */}
              {marketPrice && (
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="text-zinc-500 uppercase tracking-widest font-medium">PriceCharting</span>
                  {marketPrice.price_market && (
                    <span className="text-zinc-400">
                      Ort: <span className="text-zinc-300">${parseFloat(marketPrice.price_market).toFixed(2)}</span>
                    </span>
                  )}
                  {marketPrice.price_high && (
                    <span className="text-zinc-400">
                      Maks: <span className="text-zinc-300">${parseFloat(marketPrice.price_high).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              )}

              {/* ── Condition picker ── */}
              {sortedListings.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-3">
                    Kondisyon Seç
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sortedListings.map((listing: any) => {
                      const isSelected =
                        (selectedListingId ?? sortedListings[0]?.id) === listing.id;
                      return (
                        <button
                          key={listing.id}
                          data-testid={`btn-condition-${listing.condition}`}
                          onClick={() => { setSelectedListingId(listing.id); setQuantity(1); }}
                          className={`flex flex-col items-start px-3 sm:px-4 py-2.5 rounded-xl border transition-all duration-150 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/40'
                              : 'bg-white/[0.05] border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className={`text-[10px] font-bold tracking-wide uppercase ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`}>
                            {listing.condition}
                          </span>
                          <span className={`text-sm font-semibold mt-0.5 ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                            {parseFloat(listing.price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedListing && (
                    <p className="text-[11px] text-zinc-500 mt-2">
                      {CONDITION_LABELS[selectedListing.condition] ?? selectedListing.condition}
                    </p>
                  )}
                </div>
              )}

              {/* ── Price + Qty + CTA ── */}
              <div className="space-y-4">
                {/* Price display */}
                {price != null ? (
                  <div>
                    <p
                      className="text-[46px] sm:text-[54px] leading-none font-bold text-white tracking-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-2xl sm:text-3xl text-zinc-500 ml-2 font-normal">₺</span>
                    </p>
                    {quantity > 1 && (
                      <p className="text-sm text-zinc-400 mt-1.5">
                        Toplam: {(price * quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-3 px-4 rounded-xl bg-white/[0.04] border border-white/10">
                    <p className="text-sm text-zinc-400">Bu kart henüz fiyatlanmamış.</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Admin panelinden otomatik listeleme yapabilirsiniz.</p>
                  </div>
                )}

                {/* Qty selector */}
                {selectedListing && (
                  <div className="inline-flex items-center rounded-xl overflow-hidden border border-white/10">
                    <button
                      data-testid="btn-qty-dec"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center bg-white/[0.05] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-12 h-10 bg-white/[0.03] flex items-center justify-center border-x border-white/10">
                      <span className="text-sm font-bold text-white">{quantity}</span>
                    </div>
                    <button
                      data-testid="btn-qty-inc"
                      onClick={() => setQuantity(q => Math.min(q + 1, 99))}
                      disabled={quantity >= 99}
                      className="w-10 h-10 flex items-center justify-center bg-white/[0.05] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Add to cart button */}
                <button
                  data-testid="btn-addtocart"
                  onClick={handleAddToCart}
                  disabled={isAdding || !selectedListing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold py-3.5 sm:py-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 text-sm sm:text-[15px] disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-indigo-950/60"
                >
                  {isAdding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-5 h-5" />
                  )}
                  {isAdding
                    ? 'Ekleniyor…'
                    : selectedListing
                    ? `Sepete Ekle${price && quantity ? ` — ${(price * quantity).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺` : ''}`
                    : 'Sepete Ekle'}
                </button>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { Icon: Shield, label: 'Güvenli Ödeme' },
                    { Icon: Zap, label: 'Hızlı Teslimat' },
                    { Icon: Package, label: 'Orijinal Kart' },
                  ].map(({ Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]"
                    >
                      <Icon className="w-4 h-4 text-zinc-400" />
                      <span className="text-[10px] text-zinc-400 text-center leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Card meta ── */}
              {(card.set_series || card.set_release_date || card.set_total_cards) && (
                <div className="border-t border-white/10 pt-5 grid grid-cols-3 gap-3">
                  {card.set_series && (
                    <div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Seri</p>
                      <p className="text-xs text-zinc-300 truncate">{card.set_series}</p>
                    </div>
                  )}
                  {card.set_release_date && (
                    <div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Çıkış</p>
                      <p className="text-xs text-zinc-300">{card.set_release_date}</p>
                    </div>
                  )}
                  {card.set_total_cards && (
                    <div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Set</p>
                      <p className="text-xs text-zinc-300">{card.set_total_cards} kart</p>
                    </div>
                  )}
                </div>
              )}
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
