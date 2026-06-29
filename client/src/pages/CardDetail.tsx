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

function HoloCard({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-14, 14]);
  const springX = useSpring(rotateX, { stiffness: 160, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 160, damping: 22 });

  useEffect(() => { if (src) setImgSrc(src); }, [src]);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }, [x, y]);

  const onLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <div
      className="relative flex items-center justify-center select-none py-8"
      style={{ perspective: '1100px' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.55) 0%, rgba(79,70,229,0.22) 38%, transparent 68%)',
          filter: 'blur(48px)',
          transform: 'scale(1.4)',
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
          className="w-full max-w-[230px] sm:max-w-[270px] lg:max-w-[300px] xl:max-w-[320px] h-auto"
          style={{
            borderRadius: '4.5% / 3.3%',
            filter: 'drop-shadow(0 32px 56px rgba(79,70,229,0.6)) drop-shadow(0 4px 16px rgba(0,0,0,0.9))',
          }}
        />
      </motion.div>
    </div>
  );
}

function Marquee({ cards, setSlug, setName }: {
  cards: any[];
  setSlug?: string;
  setName?: string;
}) {
  if (!cards.length) return null;
  const items = cards.length < 6 ? [...cards, ...cards, ...cards, ...cards] : [...cards, ...cards];

  return (
    <section className="border-t border-white/[0.06] py-10 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6 sm:px-10 mb-7 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.14em]">
          Bu Setteki Diğer Kartlar
        </h2>
        {setSlug && (
          <Link
            href={`/set/${setSlug}`}
            className="text-[11px] text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            {setName} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="flex gap-4 marquee-scroll" style={{ width: 'max-content', paddingLeft: '1rem' }}>
        {items.map((c: any, i: number) => (
          <Link key={`${c.id}-${i}`} href={`/kart/${c.slug}`}>
            <div className="w-[96px] shrink-0 group cursor-pointer">
              <div className="rounded-xl overflow-hidden bg-white/[0.03]">
                <img
                  src={c.image_url || FALLBACK}
                  alt={c.name}
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }}
                  className="w-full h-[132px] object-contain transition-transform duration-300 group-hover:scale-105"
                  style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}
                />
              </div>
              <p className="text-[10px] text-zinc-700 mt-1.5 truncate group-hover:text-zinc-400 transition-colors text-center">
                {c.name}
              </p>
              {c.min_price && (
                <p className="text-[10px] text-indigo-500 font-semibold text-center">
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

  const selectedListing = sortedListings.find((l: any) => l.id === selectedListingId)
    ?? sortedListings[0]
    ?? null;
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
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  if (isError || !card) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="max-w-xl mx-auto px-6 py-40 text-center">
          <p className="text-6xl mb-6">🃏</p>
          <h1 className="text-2xl font-bold text-white mb-3">Kart bulunamadı</h1>
          <p className="text-zinc-500 mb-8">Bu kart mevcut değil veya kaldırılmış.</p>
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
        description={`${card.name}${card.rarity ? ' (' + card.rarity + ')' : ''} — ${card.set_name}. Ecarte TCG Marketplace'de satın al.`}
      />
      <Header />

      <main>
        {/* Breadcrumb */}
        <nav className="max-w-screen-xl mx-auto px-6 sm:px-10 pt-7 pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-zinc-700 flex-wrap">
            <li><Link href="/magaza" className="hover:text-zinc-400 transition-colors">Mağaza</Link></li>
            {card.game_slug && (
              <>
                <ChevronRight className="w-2.5 h-2.5 text-zinc-800" />
                <li>
                  <Link href={`/magaza?game=${card.game_slug}`} className="hover:text-zinc-400 transition-colors">
                    {card.game_name}
                  </Link>
                </li>
              </>
            )}
            {card.set_slug && (
              <>
                <ChevronRight className="w-2.5 h-2.5 text-zinc-800" />
                <li>
                  <Link href={`/set/${card.set_slug}`} className="hover:text-zinc-400 transition-colors">
                    {card.set_name}
                  </Link>
                </li>
              </>
            )}
            <ChevronRight className="w-2.5 h-2.5 text-zinc-800" />
            <li className="text-zinc-500 truncate max-w-[180px]">{card.name}</li>
          </ol>
        </nav>

        {/* Hero grid */}
        <div className="max-w-screen-xl mx-auto px-6 sm:px-10 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr] gap-10 lg:gap-20 items-start">

            {/* LEFT — card visual */}
            <div className="flex flex-col items-center gap-5 lg:sticky lg:top-8">
              <HoloCard src={imgSrc} alt={card.name} />

              {(card.set_logo_url || card.set_symbol_url) && (
                <div className="flex items-center gap-4 opacity-50 hover:opacity-80 transition-opacity">
                  {card.set_logo_url && (
                    <img src={card.set_logo_url} alt={card.set_name} className="h-7 object-contain" />
                  )}
                  {card.set_symbol_url && (
                    <img src={card.set_symbol_url} alt="" className="h-5 object-contain" />
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — details */}
            <div className="space-y-7 pt-2">

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {card.rarity && (
                  <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-indigo-500/[0.15] text-indigo-300 border border-indigo-500/[0.25] tracking-wide">
                    {card.rarity}
                  </span>
                )}
                <span className="text-[11px] px-3 py-1 rounded-full bg-white/[0.05] text-zinc-500 border border-white/[0.08]">
                  {card.game_name}
                </span>
                {card.card_number && (
                  <span className="text-[11px] px-3 py-1 rounded-full bg-white/[0.05] text-zinc-500 border border-white/[0.08]">
                    #{card.card_number}
                  </span>
                )}
              </div>

              {/* Name */}
              <div>
                <h1
                  className="text-[40px] sm:text-[50px] font-bold text-white leading-[1.03] tracking-[-0.02em]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {card.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-3 text-sm text-zinc-500">
                  <Link href={`/set/${card.set_slug}`} className="hover:text-zinc-300 transition-colors">
                    {card.set_name}
                  </Link>
                  {card.hp && <><span className="text-zinc-800">·</span><span>{card.hp} HP</span></>}
                  {card.artist && <><span className="text-zinc-800">·</span><span className="text-zinc-600">{card.artist}</span></>}
                </div>
              </div>

              {/* Types */}
              {cardTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {cardTypes.map((t: string) => (
                    <span
                      key={t}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.07]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-white/[0.07]" />

              {/* Market price reference */}
              {marketPrice && (
                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                  <span className="text-zinc-700 uppercase tracking-widest">PriceCharting ref</span>
                  {marketPrice.price_market && (
                    <span className="text-zinc-600">
                      Ort: <span className="text-zinc-400">${parseFloat(marketPrice.price_market).toFixed(2)}</span>
                    </span>
                  )}
                  {marketPrice.price_high && (
                    <span className="text-zinc-600">
                      Maks: <span className="text-zinc-400">${parseFloat(marketPrice.price_high).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Condition pills */}
              {sortedListings.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-700 uppercase tracking-[0.14em] mb-3">Kondisyon</p>
                  <div className="flex flex-wrap gap-2">
                    {sortedListings.map((listing: any) => {
                      const isSelected = (selectedListingId ?? sortedListings[0]?.id) === listing.id;
                      return (
                        <button
                          key={listing.id}
                          data-testid={`btn-condition-${listing.condition}`}
                          onClick={() => { setSelectedListingId(listing.id); setQuantity(1); }}
                          className={`flex flex-col items-start px-4 py-2.5 rounded-xl border transition-all duration-150 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/30'
                              : 'bg-white/[0.04] border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className={`text-[10px] font-bold tracking-wide ${isSelected ? 'text-indigo-200' : 'text-zinc-600'}`}>
                            {listing.condition}
                          </span>
                          <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                            {parseFloat(listing.price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedListing && (
                    <p className="text-[11px] text-zinc-600 mt-2">
                      {CONDITION_LABELS[selectedListing.condition] ?? selectedListing.condition}
                    </p>
                  )}
                </div>
              )}

              {/* Price + qty + CTA */}
              <div className="space-y-5">
                {price != null ? (
                  <div>
                    <p
                      className="text-[52px] sm:text-[58px] leading-none font-bold text-white tracking-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-3xl text-zinc-600 ml-2.5 font-normal">₺</span>
                    </p>
                    {quantity > 1 && (
                      <p className="text-sm text-zinc-500 mt-1.5">
                        Toplam: {(price * quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xl text-zinc-600 italic">Fiyat bilgisi yok</p>
                )}

                {/* Qty selector */}
                {selectedListing && (
                  <div className="inline-flex items-center">
                    <button
                      data-testid="btn-qty-dec"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-l-xl bg-white/[0.06] border border-white/[0.09] border-r-0 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-12 h-10 border-y border-white/[0.09] bg-white/[0.03] flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{quantity}</span>
                    </div>
                    <button
                      data-testid="btn-qty-inc"
                      onClick={() => setQuantity(q => Math.min(q + 1, 99))}
                      disabled={quantity >= 99}
                      className="w-10 h-10 rounded-r-xl bg-white/[0.06] border border-white/[0.09] border-l-0 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Add to cart */}
                <button
                  data-testid="btn-addtocart"
                  onClick={handleAddToCart}
                  disabled={isAdding || !selectedListing}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 text-[15px] disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-indigo-950/60"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {isAdding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-5 h-5" />
                  )}
                  {isAdding
                    ? 'Ekleniyor…'
                    : `Sepete Ekle${price && quantity ? ` — ${(price * quantity).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺` : ''}`}
                </button>

                {/* Trust row */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { Icon: Shield, label: 'Güvenli Ödeme' },
                    { Icon: Zap, label: 'Hızlı Teslimat' },
                    { Icon: Package, label: 'Orijinal Kart' },
                  ].map(({ Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <Icon className="w-4 h-4 text-zinc-600" />
                      <span className="text-[10px] text-zinc-700 text-center leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta grid */}
              {(card.set_series || card.set_release_date || card.set_total_cards) && (
                <div className="border-t border-white/[0.07] pt-5 grid grid-cols-3 gap-4">
                  {card.set_series && (
                    <div>
                      <p className="text-[9px] text-zinc-800 uppercase tracking-widest mb-1">Seri</p>
                      <p className="text-xs text-zinc-400 truncate">{card.set_series}</p>
                    </div>
                  )}
                  {card.set_release_date && (
                    <div>
                      <p className="text-[9px] text-zinc-800 uppercase tracking-widest mb-1">Çıkış</p>
                      <p className="text-xs text-zinc-400">{card.set_release_date}</p>
                    </div>
                  )}
                  {card.set_total_cards && (
                    <div>
                      <p className="text-[9px] text-zinc-800 uppercase tracking-widest mb-1">Set</p>
                      <p className="text-xs text-zinc-400">{card.set_total_cards} kart</p>
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
