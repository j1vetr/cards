import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { ShoppingCart } from 'lucide-react';
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

/* ─── Rarity badge colors (dark theme) ───────────────────────────────── */
const RARITY_BADGE: Record<string, { bg: string; text: string }> = {
  'Common':                     { bg: 'rgba(113,113,122,0.2)',  text: '#a1a1aa' },
  'Uncommon':                   { bg: 'rgba(34,197,94,0.15)',   text: '#86efac' },
  'Rare':                       { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd' },
  'Rare Holo':                  { bg: 'rgba(99,102,241,0.18)',  text: '#a5b4fc' },
  'Rare Holo V':                { bg: 'rgba(139,92,246,0.18)',  text: '#c4b5fd' },
  'Rare Holo VMAX':             { bg: 'rgba(168,85,247,0.18)',  text: '#d8b4fe' },
  'Rare Holo VSTAR':            { bg: 'rgba(234,179,8,0.18)',   text: '#fde047' },
  'Rare Rainbow':               { bg: 'rgba(236,72,153,0.18)',  text: '#f9a8d4' },
  'Rare Secret':                { bg: 'rgba(245,158,11,0.2)',   text: '#fcd34d' },
  'Ultra Rare':                 { bg: 'rgba(249,115,22,0.18)',  text: '#fdba74' },
  'Illustration Rare':          { bg: 'rgba(236,72,153,0.18)',  text: '#f9a8d4' },
  'Special Illustration Rare':  { bg: 'rgba(244,63,94,0.18)',   text: '#fda4af' },
  'Hyper Rare':                 { bg: 'rgba(245,158,11,0.22)',  text: '#fcd34d' },
  'Double Rare':                { bg: 'rgba(6,182,212,0.18)',   text: '#67e8f9' },
  'Shiny Rare':                 { bg: 'rgba(20,184,166,0.18)',  text: '#5eead4' },
  'Shiny Ultra Rare':           { bg: 'rgba(16,185,129,0.18)',  text: '#6ee7b7' },
  'Promo':                      { bg: 'rgba(239,68,68,0.18)',   text: '#fca5a5' },
  'Hero':                       { bg: 'rgba(59,130,246,0.18)',  text: '#93c5fd' },
  'Champion':                   { bg: 'rgba(234,179,8,0.2)',    text: '#fde047' },
  'Legendary':                  { bg: 'rgba(168,85,247,0.2)',   text: '#d8b4fe' },
};
const DEFAULT_RARITY = { bg: 'rgba(113,113,122,0.15)', text: '#a1a1aa' };

const FALLBACK_IMG = 'https://images.pokemontcg.io/sv3pt5/logo.png';

interface CardCardProps {
  card: CardPublic;
}

export const CardCard = memo(function CardCard({ card }: CardCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(card.image_url || FALLBACK_IMG);
  const [, navigate] = useLocation();

  const price = card.min_price ? parseFloat(card.min_price) : null;
  const hasStock = card.listing_count > 0;
  const rarityStyle = card.rarity ? (RARITY_BADGE[card.rarity] ?? DEFAULT_RARITY) : null;

  return (
    <>
      <motion.div
        data-testid={`card-tcg-${card.id}`}
        className="group relative cursor-pointer h-full"
        whileHover={{ y: -3 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <Link href={`/kart/${card.slug}`} className="h-full block">

          {/* Card shell */}
          <div className="relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-250"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.border = '1px solid rgba(99,102,241,0.35)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >

            {/* ── Image ── */}
            <div className="relative aspect-[63/88] overflow-hidden shrink-0"
              style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)' }}>

              <motion.img
                src={imgSrc}
                alt={card.name}
                className="w-full h-full object-contain p-1.5"
                loading="lazy"
                decoding="async"
                onError={() => setImgSrc(FALLBACK_IMG)}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />

              {/* Stok Yok overlay */}
              {!hasStock && (
                <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.72)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                    Stok Yok
                  </span>
                </div>
              )}

              {/* Yeni badge */}
              {card.is_new && (
                <div className="absolute top-2 left-2">
                  <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                    Yeni
                  </span>
                </div>
              )}

              {/* Öne çıkan star */}
              {card.is_featured && (
                <div className="absolute top-2 right-2">
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                    ★
                  </span>
                </div>
              )}

              {/* Hover: sepete ekle butonu */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-250 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  data-testid={`btn-addtocart-${card.id}`}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true); }}
                  className="bg-indigo-600 hover:bg-indigo-500 rounded-full p-2.5 shadow-xl transition-colors scale-90 group-hover:scale-100"
                  title="Hızlı Bakış"
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* ── Info area — flex-col so price stays at bottom ── */}
            <div className="flex flex-col flex-1 p-3 gap-1.5">

              {/* Rarity badge — always takes a fixed slot */}
              <div className="h-5 flex items-center">
                {rarityStyle && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: rarityStyle.bg, color: rarityStyle.text }}>
                    {card.rarity}
                  </span>
                )}
              </div>

              {/* Card name — always 2 lines */}
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 min-h-[2.5rem]">
                {card.name}
              </p>

              {/* Set row */}
              <div className="flex items-center gap-1 min-h-[1rem]">
                {card.set_symbol_url ? (
                  <img src={card.set_symbol_url} alt="" className="w-3 h-3 object-contain shrink-0 opacity-60" />
                ) : card.set_logo_url ? (
                  <img src={card.set_logo_url} alt="" className="h-2.5 object-contain shrink-0 max-w-[32px] opacity-50" />
                ) : null}
                <p className="text-[10px] text-zinc-500 truncate">
                  {card.set_name}{card.card_number ? ` · ${card.card_number}` : ''}
                </p>
              </div>

              {/* Type chips — always one line slot */}
              <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
                {card.card_types?.slice(0, 2).map(t => (
                  <button
                    key={t}
                    data-testid={`badge-type-${card.id}-${t}`}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/oyun/${card.game_slug}?type=${encodeURIComponent(t)}`);
                    }}
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.22)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.12)'; }}
                    title={`${t} tipindeki tüm kartları gör`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Spacer pushes price to bottom */}
              <div className="flex-1" />

              {/* Price row — always at bottom */}
              <div className="pt-1.5 border-t border-white/[0.06]">
                {price != null ? (
                  <p className="text-base font-bold"
                    style={{ color: '#818cf8', fontFamily: 'var(--font-display)' }}>
                    {price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                  </p>
                ) : (
                  <p className="text-[11px] font-semibold text-red-400/70 uppercase tracking-wide">
                    Stok Yok
                  </p>
                )}
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
