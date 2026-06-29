import { useState, useEffect } from 'react';
import { X, ShoppingCart, Loader2, Minus, Plus, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { useCart } from '@/hooks/useCart';
import { useCartModal } from '@/hooks/useCartModal';
import type { CardPublic } from './CardCard';

interface CardListing {
  id: string;
  condition: string;
  price: string;
  stock: number;
}

interface CardQuickViewModalProps {
  card: CardPublic;
  isOpen: boolean;
  onClose: () => void;
  listings?: CardListing[];
}

const CONDITION_ORDER = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10', 'PSA9', 'PSA8', 'PSA7'];
const CONDITION_LABELS: Record<string, string> = {
  NM: 'Near Mint (NM)', LP: 'Lightly Played (LP)', MP: 'Moderately Played (MP)',
  HP: 'Heavily Played (HP)', DMG: 'Damaged (DMG)',
  PSA10: 'PSA 10 Gem Mint', PSA9: 'PSA 9 Mint', PSA8: 'PSA 8 NM-MT', PSA7: 'PSA 7 NM',
};
const CONDITION_SHORT: Record<string, string> = {
  NM: 'NM', LP: 'LP', MP: 'MP', HP: 'HP', DMG: 'DMG',
  PSA10: 'PSA 10', PSA9: 'PSA 9', PSA8: 'PSA 8', PSA7: 'PSA 7',
};

const FALLBACK_IMG = 'https://images.pokemontcg.io/sv3pt5/logo.png';

export function CardQuickViewModal({ card, isOpen, onClose, listings: propListings }: CardQuickViewModalProps) {
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [listings, setListings] = useState<CardListing[]>(propListings ?? []);
  const [loadingListings, setLoadingListings] = useState(false);
  const [imgSrc, setImgSrc] = useState(card.image_url || FALLBACK_IMG);
  const { addToCart } = useCart();
  const { showModal } = useCartModal();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQuantity(1);
      if (!propListings) {
        setLoadingListings(true);
        fetch(`/api/cards/${card.slug}`)
          .then(r => r.json())
          .then(data => {
            const l: CardListing[] = (data.listings ?? [])
              .slice()
              .sort((a: any, b: any) => CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition));
            setListings(l);
            const firstInStock = l.find(x => x.stock > 0);
            setSelectedListingId(firstInStock?.id ?? l[0]?.id ?? null);
          })
          .catch(() => {})
          .finally(() => setLoadingListings(false));
      } else {
        const sorted = propListings.slice().sort(
          (a, b) => CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition)
        );
        setListings(sorted);
        const first = sorted.find(x => x.stock > 0);
        setSelectedListingId(first?.id ?? sorted[0]?.id ?? null);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, card.slug, propListings]);

  const selectedListing = listings.find(l => l.id === selectedListingId) ?? null;
  const price = selectedListing ? parseFloat(selectedListing.price) : null;
  const stockOk = selectedListing ? selectedListing.stock > 0 : false;

  const handleAddToCart = async () => {
    if (!selectedListing || !stockOk) return;
    setIsAdding(true);
    try {
      await addToCart(undefined, undefined, quantity, { cardListingId: selectedListing.id });
      showModal({
        name: card.name,
        image: card.image_url ?? '',
        price: price ?? 0,
        quantity,
      });
      onClose();
    } catch (err: any) {
      console.error('Add to cart error', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden z-10"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-zinc-100 transition-colors"
              data-testid="btn-close-quickview"
            >
              <X className="w-4 h-4 text-zinc-600" />
            </button>

            <div className="flex gap-4 p-5">
              <div className="flex-shrink-0 w-32">
                <div className="aspect-[63/88] bg-zinc-50 rounded-lg overflow-hidden border border-zinc-100">
                  <img
                    src={imgSrc}
                    alt={card.name}
                    className="w-full h-full object-contain p-1"
                    onError={() => setImgSrc(FALLBACK_IMG)}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 mb-1">{card.set_name}</p>
                <h3 className="font-semibold text-zinc-900 text-base leading-tight mb-1">
                  {card.name}
                </h3>
                {card.rarity && (
                  <span className="inline-block text-[11px] text-indigo-600 font-medium mb-3">
                    {card.rarity}
                  </span>
                )}

                {loadingListings ? (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Yükleniyor...
                  </div>
                ) : listings.length === 0 ? (
                  <p className="text-sm text-zinc-400">Stokta ürün yok</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Kondisyon Seçin</p>
                    <div className="flex flex-wrap gap-1.5">
                      {listings.map(l => (
                        <button
                          key={l.id}
                          data-testid={`btn-condition-${l.condition}`}
                          onClick={() => { setSelectedListingId(l.id); setQuantity(1); }}
                          disabled={l.stock === 0}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                            selectedListingId === l.id
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : l.stock === 0
                              ? 'bg-zinc-50 text-zinc-300 border-zinc-200 cursor-not-allowed line-through'
                              : 'bg-white text-zinc-700 border-zinc-200 hover:border-indigo-300 hover:text-indigo-700'
                          }`}
                        >
                          {CONDITION_SHORT[l.condition] ?? l.condition}
                          <span className="ml-1 opacity-60">
                            {parseFloat(l.price).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}₺
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedListing && (
              <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-zinc-500">{CONDITION_LABELS[selectedListing.condition] ?? selectedListing.condition}</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {price?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      data-testid="btn-qty-dec"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                    <button
                      data-testid="btn-qty-inc"
                      onClick={() => setQuantity(q => Math.min(q + 1, selectedListing.stock))}
                      disabled={quantity >= selectedListing.stock}
                      className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    data-testid="btn-addtocart-confirm"
                    onClick={handleAddToCart}
                    disabled={isAdding || !stockOk}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    {!stockOk ? 'Stok Yok' : 'Sepete Ekle'}
                  </button>
                  <Link href={`/kart/${card.slug}`} onClick={onClose}>
                    <button
                      data-testid="btn-goto-detail"
                      className="px-3 py-2.5 border border-zinc-200 rounded-xl hover:bg-white transition-colors"
                      title="Detay Sayfası"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-500" />
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
