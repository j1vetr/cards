import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardDetail, useSimilarCards } from '@/hooks/useTcg';
import { useCart } from '@/hooks/useCart';
import { useCartModal } from '@/hooks/useCartModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, ChevronRight, Minus, Plus, Loader2,
  Tag, Info, BarChart2, ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CONDITION_ORDER = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10', 'PSA9', 'PSA8', 'PSA7'];
const CONDITION_LABELS: Record<string, string> = {
  NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
  HP: 'Heavily Played', DMG: 'Damaged',
  PSA10: 'PSA 10 Gem Mint', PSA9: 'PSA 9 Mint', PSA8: 'PSA 8 NM-MT', PSA7: 'PSA 7 NM',
};
const CONDITION_DESC: Record<string, string> = {
  NM: 'Neredeyse yeni, minimal kullanım izi.',
  LP: 'Hafif kullanım izleri, kart hâlâ oynanabilir.',
  MP: 'Belirgin kullanım izleri, oynanabilir.',
  HP: 'Yoğun kullanım izleri.',
  DMG: 'Ciddi hasar var.',
  PSA10: 'PSA tarafından Gem Mint 10 notu almış.',
  PSA9: 'PSA tarafından Mint 9 notu almış.',
  PSA8: 'PSA tarafından NM-MT 8 notu almış.',
  PSA7: 'PSA tarafından NM 7 notu almış.',
};

const FALLBACK_IMG = 'https://images.pokemontcg.io/sv3pt5/logo.png';

export default function CardDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: card, isLoading, isError } = useCardDetail(slug);
  const { data: similar = [] } = useSimilarCards(slug);
  const { addToCart } = useCart();
  const { showModal } = useCartModal();
  const { toast } = useToast();

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_IMG);
  const [imgZoomed, setImgZoomed] = useState(false);

  useEffect(() => {
    if (card?.image_url_hi_res || card?.image_url) {
      setImgSrc(card.image_url_hi_res ?? card.image_url);
    }
  }, [card]);

  useEffect(() => {
    if (card?.listings?.length) {
      const sorted = [...card.listings].sort(
        (a: any, b: any) => CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition)
      );
      const first = sorted.find((l: any) => l.stock > 0);
      setSelectedListingId(first?.id ?? sorted[0]?.id ?? null);
    }
  }, [card]);

  const sortedListings = card?.listings
    ? [...card.listings].sort((a: any, b: any) =>
        CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition)
      )
    : [];

  const selectedListing = sortedListings.find((l: any) => l.id === selectedListingId) ?? null;
  const price = selectedListing ? parseFloat(selectedListing.price) : null;
  const stockOk = selectedListing ? selectedListing.stock > 0 : false;
  const marketPrice = card?.marketPrice;

  const handleAddToCart = async () => {
    if (!selectedListing || !stockOk) return;
    setIsAdding(true);
    try {
      await addToCart(undefined, undefined, quantity, { cardListingId: selectedListing.id });
      showModal({
        name: card.name,
        image: imgSrc,
        price: price ?? 0,
        quantity,
      });
      toast({ title: 'Sepete eklendi', description: `${card.name} (${CONDITION_LABELS[selectedListing.condition] ?? selectedListing.condition})` });
    } catch (err: any) {
      toast({ title: 'Hata', description: err.message ?? 'Sepete eklenemedi', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

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

  if (isError || !card) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <p className="text-5xl mb-4">🃏</p>
          <h1 className="text-2xl font-bold mb-2">Kart bulunamadı</h1>
          <p className="text-zinc-500 mb-6">Bu kart mevcut değil veya kaldırılmış.</p>
          <Link href="/magaza">
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
              Mağazaya Dön
            </button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const cardTypes: string[] = Array.isArray(card.card_types)
    ? card.card_types
    : (typeof card.card_types === 'string' ? JSON.parse(card.card_types) : []);

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO
        title={`${card.name} — ${card.set_name} | Ecarte TCG`}
        description={`${card.name} ${card.rarity ? '(' + card.rarity + ')' : ''} — ${card.set_name}. Ecarte'de satın al.`}
      />
      <Header />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex items-center gap-1.5 text-sm text-zinc-400 mb-6 flex-wrap">
          <Link href="/magaza" className="hover:text-indigo-600 transition-colors">Mağaza</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          {card.game_slug && (
            <>
              <Link href={`/magaza?game=${card.game_slug}`} className="hover:text-indigo-600 transition-colors">
                {card.game_name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
          {card.set_slug && (
            <>
              <Link href={`/set/${card.set_slug}`} className="hover:text-indigo-600 transition-colors">
                {card.set_name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
          <span className="text-zinc-600 font-medium truncate max-w-48">{card.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="flex flex-col items-center">
            <motion.div
              className={`relative cursor-zoom-in max-w-sm w-full ${imgZoomed ? 'cursor-zoom-out' : ''}`}
              onClick={() => setImgZoomed(v => !v)}
              layoutId={`card-img-${card.id}`}
            >
              <div className="aspect-[63/88] bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-100">
                <motion.img
                  src={imgSrc}
                  alt={card.name}
                  className="w-full h-full object-contain p-2"
                  onError={() => setImgSrc(FALLBACK_IMG)}
                  animate={{ scale: imgZoomed ? 1.08 : 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {card.api_source === 'pokemon_tcg' && card.image_url_hi_res && !imgZoomed && (
                <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-zinc-500 flex items-center gap-1 shadow">
                  <ExternalLink className="w-3 h-3" />
                  Büyüt
                </div>
              )}
            </motion.div>

            {card.set_logo_url && (
              <div className="flex items-center gap-3 mt-6">
                <img src={card.set_logo_url} alt={card.set_name} className="h-8 object-contain" />
                {card.set_symbol_url && <img src={card.set_symbol_url} alt="" className="h-6 object-contain" />}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              {card.rarity && (
                <span className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-2">
                  {card.rarity}
                </span>
              )}
              <h1 className="text-3xl font-bold text-zinc-900 mb-1">{card.name}</h1>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <Link href={`/set/${card.set_slug}`} className="hover:text-indigo-600 transition-colors">
                  {card.set_name}
                </Link>
                {card.card_number && <span>· {card.card_number}</span>}
                {card.hp && <span>· {card.hp} HP</span>}
              </div>
            </div>

            {cardTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cardTypes.map((t: string) => (
                  <span key={t} className="text-xs px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {card.description && (
              <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                {card.description}
              </p>
            )}

            {marketPrice && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <BarChart2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 mb-1">Piyasa Fiyatı (USD)</p>
                  <div className="flex gap-4 text-amber-700">
                    {marketPrice.price_market && <span>Ort: ${parseFloat(marketPrice.price_market).toFixed(2)}</span>}
                    {marketPrice.price_low && <span>Min: ${parseFloat(marketPrice.price_low).toFixed(2)}</span>}
                    {marketPrice.price_high && <span>Max: ${parseFloat(marketPrice.price_high).toFixed(2)}</span>}
                  </div>
                </div>
              </div>
            )}

            {sortedListings.length === 0 ? (
              <div className="bg-zinc-100 rounded-xl p-6 text-center">
                <p className="text-zinc-500 font-medium">Bu kart şu anda stokta yok</p>
                <p className="text-sm text-zinc-400 mt-1">Yakında tekrar stoklanacak</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" />
                    Kondisyon Seçin
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sortedListings.map((listing: any) => {
                      const listingPrice = parseFloat(listing.price);
                      const inStock = listing.stock > 0;
                      const isSelected = selectedListingId === listing.id;
                      return (
                        <button
                          key={listing.id}
                          data-testid={`btn-condition-${listing.condition}`}
                          onClick={() => { if (inStock) { setSelectedListingId(listing.id); setQuantity(1); } }}
                          disabled={!inStock}
                          className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50'
                              : inStock
                              ? 'border-zinc-200 bg-white hover:border-indigo-300'
                              : 'border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <p className={`text-xs font-bold mb-0.5 ${isSelected ? 'text-indigo-700' : 'text-zinc-700'}`}>
                            {listing.condition}
                          </p>
                          <p className={`text-sm font-semibold ${isSelected ? 'text-indigo-900' : 'text-zinc-900'}`}>
                            {listingPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2, minimumFractionDigits: 0 })} ₺
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {inStock ? `${listing.stock} stok` : 'Stok yok'}
                          </p>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedListing && (
                    <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {CONDITION_DESC[selectedListing.condition] ?? ''}
                    </p>
                  )}
                </div>

                {selectedListing && (
                  <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">
                          {CONDITION_LABELS[selectedListing.condition] ?? selectedListing.condition}
                        </p>
                        <p className="text-3xl font-bold text-indigo-700">
                          {price?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-50 rounded-xl border border-zinc-100 p-1">
                        <button
                          data-testid="btn-qty-dec"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-semibold text-sm">{quantity}</span>
                        <button
                          data-testid="btn-qty-inc"
                          onClick={() => setQuantity(q => Math.min(q + 1, selectedListing.stock))}
                          disabled={quantity >= selectedListing.stock}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      data-testid="btn-addtocart"
                      onClick={handleAddToCart}
                      disabled={isAdding || !stockOk}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                      {!stockOk ? 'Stok Yok' : `Sepete Ekle — ${((price ?? 0) * quantity).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {card.artist && (
                <div className="bg-white rounded-xl p-3 border border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-0.5">Artist</p>
                  <p className="font-medium text-zinc-700">{card.artist}</p>
                </div>
              )}
              {card.set_series && (
                <div className="bg-white rounded-xl p-3 border border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-0.5">Seri</p>
                  <p className="font-medium text-zinc-700">{card.set_series}</p>
                </div>
              )}
              {card.set_release_date && (
                <div className="bg-white rounded-xl p-3 border border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-0.5">Çıkış Tarihi</p>
                  <p className="font-medium text-zinc-700">{card.set_release_date}</p>
                </div>
              )}
              {card.api_source && (
                <div className="bg-white rounded-xl p-3 border border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-0.5">Kaynak</p>
                  <p className="font-medium text-zinc-700 capitalize">{card.api_source.replace('_', ' ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Aynı Setteki Kartlar</h2>
              <Link href={`/set/${card.set_slug}`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                Tümünü Gör <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {similar.map((c: any) => (
                <CardCard key={c.id} card={{
                  ...c,
                  card_types: Array.isArray(c.card_types) ? c.card_types : [],
                  is_featured: c.is_featured ?? false,
                  is_new: c.is_new ?? false,
                  listing_count: c.listing_count ?? 0,
                  available_conditions: c.available_conditions ?? [],
                  game_id: card.game_id,
                  game_name: card.game_name,
                  game_slug: card.game_slug,
                  set_id: card.set_id,
                  set_logo_url: card.set_logo_url,
                  set_symbol_url: card.set_symbol_url,
                }} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}
