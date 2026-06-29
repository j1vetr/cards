import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ShoppingCart, Eye } from 'lucide-react';
import { CardQuickViewModal } from './CardQuickViewModal';

export interface CardPublic {
  id: string;
  name: string;
  slug: string;
  card_number: string | null;
  rarity: string | null;
  card_types: string[];
  image_url: string | null;
  is_featured: boolean;
  is_new: boolean;
  set_id: string;
  set_name: string;
  set_slug: string;
  set_logo_url: string | null;
  set_symbol_url: string | null;
  game_id: string;
  game_name: string;
  game_slug: string;
  min_price: string | null;
  listing_count: number;
  available_conditions: string[];
  market_price?: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  'Common': 'bg-zinc-100 text-zinc-600',
  'Uncommon': 'bg-green-100 text-green-700',
  'Rare': 'bg-blue-100 text-blue-700',
  'Rare Holo': 'bg-indigo-100 text-indigo-700',
  'Rare Holo V': 'bg-violet-100 text-violet-700',
  'Rare Holo VMAX': 'bg-purple-100 text-purple-700',
  'Rare Holo VSTAR': 'bg-yellow-100 text-yellow-700',
  'Ultra Rare': 'bg-orange-100 text-orange-700',
  'Illustration Rare': 'bg-pink-100 text-pink-700',
  'Special Illustration Rare': 'bg-rose-100 text-rose-700',
  'Hyper Rare': 'bg-amber-100 text-amber-700',
  'Double Rare': 'bg-cyan-100 text-cyan-700',
  'Shiny Rare': 'bg-teal-100 text-teal-700',
  'Shiny Ultra Rare': 'bg-emerald-100 text-emerald-700',
  'Promo': 'bg-red-100 text-red-700',
  'Hero': 'bg-blue-100 text-blue-700',
  'Champion': 'bg-yellow-100 text-yellow-700',
  'Legendary': 'bg-purple-100 text-purple-700',
};

const CONDITION_ORDER = ['NM', 'LP', 'MP', 'HP', 'DMG', 'PSA10', 'PSA9', 'PSA8', 'PSA7'];
const CONDITION_LABELS: Record<string, string> = {
  NM: 'NM', LP: 'LP', MP: 'MP', HP: 'HP', DMG: 'DMG',
  PSA10: 'PSA 10', PSA9: 'PSA 9', PSA8: 'PSA 8', PSA7: 'PSA 7',
};

function rarityClass(rarity: string | null) {
  if (!rarity) return 'bg-zinc-100 text-zinc-600';
  return RARITY_COLORS[rarity] ?? 'bg-zinc-100 text-zinc-600';
}

const FALLBACK_IMG = 'https://images.pokemontcg.io/sv3pt5/logo.png';

interface CardCardProps {
  card: CardPublic;
}

export const CardCard = memo(function CardCard({ card }: CardCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(card.image_url || FALLBACK_IMG);
  const price = card.min_price ? parseFloat(card.min_price) : null;

  const sortedConditions = card.available_conditions
    .slice()
    .sort((a, b) => CONDITION_ORDER.indexOf(a) - CONDITION_ORDER.indexOf(b));

  return (
    <>
      <motion.div
        data-testid={`card-tcg-${card.id}`}
        className="group relative cursor-pointer"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Link href={`/kart/${card.slug}`}>
          <div className="relative bg-white rounded-xl overflow-hidden shadow-sm border border-zinc-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300">
            <div className="relative aspect-[63/88] overflow-hidden bg-gradient-to-b from-zinc-50 to-zinc-100">
              <motion.img
                src={imgSrc}
                alt={card.name}
                className="w-full h-full object-contain p-1"
                loading="lazy"
                decoding="async"
                onError={() => setImgSrc(FALLBACK_IMG)}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.3 }}
              />

              {card.is_new && (
                <div className="absolute top-2 left-2">
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Yeni
                  </span>
                </div>
              )}

              {card.is_featured && (
                <div className="absolute top-2 right-2">
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    ★
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  data-testid={`btn-quickview-${card.id}`}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true); }}
                  className="bg-white rounded-full p-2.5 shadow-lg hover:bg-indigo-50 transition-colors"
                  title="Hızlı Görüntüle"
                >
                  <Eye className="w-4 h-4 text-indigo-700" />
                </button>
                <button
                  data-testid={`btn-addtocart-${card.id}`}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true); }}
                  className="bg-indigo-600 rounded-full p-2.5 shadow-lg hover:bg-indigo-700 transition-colors"
                  title="Sepete Ekle"
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-1.5">
              {card.rarity && (
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${rarityClass(card.rarity)}`}>
                  {card.rarity}
                </span>
              )}

              <p className="text-sm font-semibold text-zinc-900 leading-tight line-clamp-2">
                {card.name}
              </p>

              <div className="flex items-center gap-1">
                {card.set_symbol_url && (
                  <img src={card.set_symbol_url} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                )}
                {!card.set_symbol_url && card.set_logo_url && (
                  <img src={card.set_logo_url} alt="" className="h-3 object-contain flex-shrink-0 max-w-[40px]" />
                )}
                <p className="text-[11px] text-zinc-400 truncate">
                  {card.set_name}
                  {card.card_number && ` · ${card.card_number}`}
                </p>
              </div>

              {sortedConditions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sortedConditions.slice(0, 3).map(c => (
                    <span key={c} className="text-[10px] bg-zinc-50 border border-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded">
                      {CONDITION_LABELS[c] ?? c}
                    </span>
                  ))}
                  {sortedConditions.length > 3 && (
                    <span className="text-[10px] text-zinc-400">+{sortedConditions.length - 3}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {price != null ? (
                  <div>
                    <p className="text-base font-bold text-indigo-700">
                      {price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                    </p>
                    {card.market_price && (
                      <p className="text-[10px] text-zinc-400">
                        Piyasa: ${parseFloat(card.market_price).toFixed(2)}
                      </p>
                    )}
                  </div>
                ) : card.market_price ? (
                  <div>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">Referans fiyat</p>
                    <p className="text-sm font-semibold text-zinc-500">
                      ${parseFloat(card.market_price).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">Stok yok</p>
                )}
                <span className="text-[10px] text-zinc-400">
                  {card.listing_count} koşul
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      <CardQuickViewModal
        card={card}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
});
