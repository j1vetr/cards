import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion, MotionConfig } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard, CardPublic } from '@/components/CardCard';
import {
  ShieldCheck,
  Truck,
  Star,
  Headphones,
  ChevronRight,
  Sparkles,
  Layers,
  Package,
  RotateCcw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface CardSetPublic {
  id: string;
  name: string;
  slug: string;
  series: string | null;
  release_date: string | null;
  total_cards: number | null;
  logo_url: string | null;
  symbol_url: string | null;
  game_id: string;
  game_name: string;
  game_slug: string;
  listed_cards: number;
}

interface CardGame {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
}

// ── Animations ─────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.09 } },
};

// ── Card fan decoration ─────────────────────────────────────────────────────

const FAN_CFG = {
  mobile: {
    positions: [
      { rotate: -26, x: -115, y: 20, delay: 0.08 },
      { rotate: -9,  x: -38,  y: -8, delay: 0.16 },
      { rotate: 9,   x: 38,   y: -8, delay: 0.24 },
      { rotate: 26,  x: 115,  y: 20, delay: 0.32 },
    ],
    w: 105, h: 147,
    containerW: 310, containerH: 230,
  },
  desktop: {
    positions: [
      { rotate: -26, x: -195, y: 36, delay: 0.08 },
      { rotate: -9,  x: -65,  y: -14, delay: 0.18 },
      { rotate: 9,   x: 65,   y: -14, delay: 0.28 },
      { rotate: 26,  x: 195,  y: 36, delay: 0.38 },
    ],
    w: 175, h: 245,
    containerW: 540, containerH: 400,
  },
};

const CARD_BG_FALLBACK = [
  'from-violet-700 to-indigo-800',
  'from-indigo-700 to-blue-800',
  'from-sky-600 to-indigo-700',
  'from-blue-700 to-violet-800',
];

function CardFan() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const { data } = useQuery<{ cards: CardPublic[]; total: number }>({
    queryKey: ['/api/cards', 'fan'],
    queryFn: async () => {
      const r = await fetch('/api/cards?limit=40&sort=newest');
      if (!r.ok) throw new Error();
      return r.json();
    },
    staleTime: 300_000,
  });

  const fanImages = useMemo(() => {
    const all = (data?.cards ?? []).filter(c => c.image_url);
    const pokemon   = [...all.filter(c => c.game_slug === 'pokemon')].sort(() => Math.random() - 0.5);
    const riftbound = [...all.filter(c => c.game_slug === 'riftbound')].sort(() => Math.random() - 0.5);
    // 2 pokemon + 2 riftbound; fallback to any card if one game is empty
    const picks = [pokemon[0], pokemon[1], riftbound[0], riftbound[1]];
    const anyFallback = [...all].sort(() => Math.random() - 0.5);
    return picks.map((c, i) => c?.image_url ?? anyFallback[i]?.image_url ?? null);
  }, [data]);

  const cfg = isDesktop ? FAN_CFG.desktop : FAN_CFG.mobile;
  const { positions, w, h, containerW, containerH } = cfg;

  return (
    <div
      className="relative flex items-end justify-center select-none pointer-events-none"
      style={{ width: containerW, height: containerH }}
    >
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 60, rotate: pos.rotate }}
          animate={{ opacity: 1, y: pos.y, x: pos.x, rotate: pos.rotate }}
          transition={{ duration: 0.7, delay: pos.delay, ease: 'easeOut' }}
          style={{ position: 'absolute', bottom: 0 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.6 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}
            className="overflow-hidden shadow-2xl"
            style={{
              width: w, height: h,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {fanImages[i] ? (
              <img
                src={fanImages[i]!}
                alt=""
                className="w-full h-full object-contain"
                style={{ background: '#1a1a3e' }}
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${CARD_BG_FALLBACK[i]}`} />
            )}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#0d1427] min-h-[620px] flex items-center"
      data-testid="section-hero"
    >
      {/* background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-700/20 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-violet-700/15 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.12),transparent_60%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:py-24 w-full">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">

          {/* card fan — top on mobile, right on desktop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex justify-center lg:justify-end order-1 lg:order-2 mb-6 lg:mb-0"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-600/15 blur-[100px] rounded-full scale-125" />
              <CardFan />
            </div>
          </motion.div>

          {/* text — below on mobile, left on desktop */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="text-center lg:text-left order-2 lg:order-1"
          >
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5"
              style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600 }}
            >
              Pokemon TCG &amp;
              <br />
              <span className="text-indigo-400">Riftbound</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Aradığın kartı bul, güvenle sipariş ver.
              <br />
              Hızlı kargo, orijinal kart garantisi.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/magaza">
                <motion.button
                  data-testid="btn-hero-magaza"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-900/40"
                >
                  Kartlara Bak
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link href="/oyun/pokemon">
                <motion.button
                  data-testid="btn-hero-pokemon"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors"
                >
                  Pokemon TCG
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ── Featured Cards ─────────────────────────────────────────────────────────

function FeaturedCardsSection() {
  const { data, isLoading } = useQuery<{ cards: CardPublic[]; total: number }>({
    queryKey: ['/api/cards', 'featured'],
    queryFn: async () => {
      const r = await fetch('/api/cards?featured=true&limit=8&sort=newest');
      if (!r.ok) throw new Error('Kartlar yüklenemedi');
      return r.json();
    },
    staleTime: 60_000,
  });

  const cards = data?.cards ?? [];

  if (!isLoading && cards.length === 0) return null;

  return (
    <section className="py-20 bg-white" data-testid="section-featured-cards">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mb-10"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-2">
                <Star className="w-3.5 h-3.5 fill-indigo-600" />
                Öne Çıkan Kartlar
              </span>
              <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Koleksiyoner Seçimi
              </h2>
            </div>
            <Link href="/magaza?featured=true">
              <button
                data-testid="btn-featured-tumu"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Tümünü Gör <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-zinc-100 animate-pulse aspect-[63/110]" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {cards.map(card => (
              <motion.div key={card.id} variants={fadeUp}>
                <CardCard card={card} />
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link href="/magaza?featured=true">
            <button
              data-testid="btn-featured-tumu-mobile"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-5 py-2.5 rounded-full transition-colors"
            >
              Tümünü Gör <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── New Sets (Bento) ────────────────────────────────────────────────────────

function NewSetsSection() {
  const { data: sets = [], isLoading } = useQuery<CardSetPublic[]>({
    queryKey: ['/api/card-sets', 'home'],
    queryFn: async () => {
      const r = await fetch('/api/card-sets');
      if (!r.ok) throw new Error('Setler yüklenemedi');
      return r.json();
    },
    staleTime: 300_000,
    select: (all) => all.slice(0, 6),
  });

  if (!isLoading && sets.length === 0) return null;

  return (
    <section className="py-20 bg-[#f4f6fb]" data-testid="section-new-sets">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mb-10"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-2">
                <Layers className="w-3.5 h-3.5" />
                Setler
              </span>
              <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Son Çıkan Setler
              </h2>
            </div>
            <Link href="/magaza">
              <button
                data-testid="btn-sets-tumu"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Tüm Setler <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-zinc-200 animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {sets.map((set, i) => (
              <motion.div key={set.id} variants={fadeUp}>
                <Link href={`/set/${set.slug}`}>
                  <motion.div
                    data-testid={`card-set-${set.id}`}
                    whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(99,102,241,0.18)' }}
                    transition={{ duration: 0.2 }}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer bg-white border border-zinc-200 hover:border-indigo-200 transition-colors ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                  >
                    <div className={`${i === 0 ? 'h-56 md:h-full md:min-h-[280px]' : 'h-32'} flex flex-col items-center justify-center p-5 relative`}>
                      {/* subtle gradient bg */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-60" />

                      {set.logo_url ? (
                        <div className="relative z-10 mb-3 w-28 h-14 flex items-center justify-center">
                          <div className="absolute inset-0 bg-zinc-200/60 animate-pulse rounded" />
                          <img
                            src={set.logo_url}
                            alt={set.name}
                            className="relative max-h-14 w-auto object-contain transition-opacity duration-300"
                            loading="lazy"
                            decoding="async"
                            onLoad={e => (e.currentTarget.previousElementSibling as HTMLElement | null)?.remove()}
                          />
                        </div>
                      ) : (
                        <div className="relative z-10 mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100">
                          <Layers className="w-6 h-6 text-indigo-600" />
                        </div>
                      )}

                      <p className="relative z-10 text-sm font-semibold text-zinc-800 text-center leading-tight line-clamp-2">
                        {set.name}
                      </p>

                      <div className="relative z-10 flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-1.5">
                        {set.listed_cards > 0 && (
                          <span className="text-[11px] text-indigo-500 font-medium">
                            {set.listed_cards} stokta
                          </span>
                        )}
                        {set.total_cards != null && (
                          <span className="text-[11px] text-zinc-400">
                            {set.total_cards} kart toplam
                          </span>
                        )}
                        {set.release_date && (
                          <span className="text-[11px] text-zinc-400">
                            {new Date(set.release_date).getFullYear()}
                          </span>
                        )}
                      </div>

                      {set.game_slug && (
                        <span className="relative z-10 mt-2 text-[10px] text-zinc-400 uppercase tracking-widest">
                          {set.game_name}
                        </span>
                      )}

                      <span className="relative z-10 mt-2 inline-flex items-center gap-1 text-[11px] text-indigo-500 font-medium hover:text-indigo-700 transition-colors">
                        İncele <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

// ── Browse by Game ──────────────────────────────────────────────────────────

const GAME_CARDS = [
  {
    slug: 'pokemon',
    name: 'Pokemon TCG',
    label: "Klasik koleksiyon. Charizard'dan Pikachu'ya tüm nesiller.",
    gradient: 'from-yellow-500/90 to-red-600/90',
    bgColor: '#1a0a00',
    accent: '#f59e0b',
    emoji: '⚡',
  },
  {
    slug: 'riftbound',
    name: 'Riftbound',
    label: "Disney Lorcana'dan ilham alan sürükleyici yeni TCG dünyası.",
    gradient: 'from-indigo-600/90 to-violet-700/90',
    bgColor: '#080d1f',
    accent: '#818cf8',
    emoji: '🌀',
  },
];

interface GameStats {
  cardCount: number;
  setCount: number;
}

function useGameStats(slug: string): GameStats {
  const { data: cardsData } = useQuery<{ cards: CardPublic[]; total: number }>({
    queryKey: ['/api/cards', 'stats', slug],
    queryFn: async () => {
      const r = await fetch(`/api/cards?game=${slug}&limit=1`);
      if (!r.ok) throw new Error('');
      return r.json();
    },
    staleTime: 300_000,
  });

  const { data: sets = [] } = useQuery<CardSetPublic[]>({
    queryKey: ['/api/card-sets', 'game', slug],
    queryFn: async () => {
      const r = await fetch(`/api/card-sets?game=${slug}`);
      if (!r.ok) throw new Error('');
      return r.json();
    },
    staleTime: 300_000,
  });

  return {
    cardCount: cardsData?.total ?? 0,
    setCount: sets.length,
  };
}

function GameTile({ game }: { game: typeof GAME_CARDS[number] }) {
  const stats = useGameStats(game.slug);

  return (
    <Link href={`/oyun/${game.slug}`}>
      <motion.div
        data-testid={`card-game-${game.slug}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative rounded-3xl overflow-hidden cursor-pointer h-56 sm:h-72 flex items-end"
        style={{ background: game.bgColor }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-80`} />

        {/* decorative circles */}
        <div className="absolute top-6 right-6 w-24 h-24 rounded-full border-2 border-white/10" />
        <div className="absolute top-10 right-10 w-14 h-14 rounded-full border border-white/10" />

        <div className="absolute top-6 left-6 text-4xl select-none">{game.emoji}</div>

        <div className="relative z-10 p-7 w-full">
          <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {game.name}
          </h3>
          <p className="text-white/75 text-sm leading-snug max-w-xs mb-3">{game.label}</p>

          {/* API-backed stats */}
          {(stats.cardCount > 0 || stats.setCount > 0) && (
            <div className="flex gap-4 mb-4">
              {stats.cardCount > 0 && (
                <div>
                  <p className="text-white font-bold text-sm">{stats.cardCount.toLocaleString('tr-TR')}</p>
                  <p className="text-white/60 text-[10px] uppercase tracking-widest">Kart</p>
                </div>
              )}
              {stats.setCount > 0 && (
                <div>
                  <p className="text-white font-bold text-sm">{stats.setCount}</p>
                  <p className="text-white/60 text-[10px] uppercase tracking-widest">Set</p>
                </div>
              )}
            </div>
          )}

          <span className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors border border-white/20">
            Kartları Gör <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

function BrowseByGameSection() {
  return (
    <section className="py-20 bg-white" data-testid="section-browse-game">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mb-10 text-center"
        >
          <motion.span variants={fadeUp} className="inline-block text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-2">
            Oyuna Göre Keşfet
          </motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-zinc-900" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Hangi Evrende Oynuyorsun?
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 gap-6"
        >
          {GAME_CARDS.map(game => (
            <motion.div key={game.slug} variants={fadeUp}>
              <GameTile game={game} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Trust ───────────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Koşul Garantisi',
    desc: 'Her kart listede belirtilen koşulda gönderilir. NM, LP, PSA — tam şeffaflık.',
  },
  {
    icon: Package,
    title: 'Güvenli Paketleme',
    desc: 'Kartlar sleeve, top loader ve baloncuklu naylon ile çift korumalı paketlenir.',
  },
  {
    icon: Truck,
    title: 'Hızlı Kargo',
    desc: 'Siparişler 1-2 iş günü içinde kargoya verilir, takip numarası anında iletilir.',
  },
  {
    icon: RotateCcw,
    title: '30 Günlük İade',
    desc: 'Koşul uyuşmazlığında 30 gün içinde ücretsiz iade veya tam para iadesi.',
  },
];

function TrustSection() {
  return (
    <section className="py-16 bg-[#f4f6fb] border-t border-zinc-100" data-testid="section-trust">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {TRUST_ITEMS.map(item => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              className="flex flex-col items-center text-center p-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4 flex-shrink-0">
                <item.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-1">{item.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="py-24 bg-[#0d1427] relative overflow-hidden" data-testid="section-final-cta">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-indigo-700/20 blur-[120px] rounded-full" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.span variants={fadeUp} className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Koleksiyonunu Büyüt
          </motion.span>

          <motion.h2
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Bir Sonraki Favori Kartın
            <br />
            <span className="text-indigo-400">Seni Bekliyor</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
            10.000'den fazla single kart, PSA gradlenmiş özel koleksiyonlar ve sürekli güncellenen stok.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/magaza">
              <motion.button
                data-testid="btn-cta-magaza"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-indigo-900/50"
              >
                Mağazaya Git
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <Link href="/hakkimizda">
              <motion.button
                data-testid="btn-cta-hakkimizda"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
              >
                Biz Kimiz?
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Home ────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <SEO
        title="Pokemon TCG & Riftbound Kart Pazaryeri"
        description="Ecarte Cards — Türkiye'nin en geniş TCG kart seçkisi. Pokemon TCG, Riftbound single kartlar, booster paketler ve PSA gradlenmiş koleksiyonlar."
        url="/"
      />
      <Header />
      <MotionConfig reducedMotion="user">
        <main>
          <HeroSection />
          <FeaturedCardsSection />
          <NewSetsSection />
          <BrowseByGameSection />
          <TrustSection />
          <FinalCTASection />
        </main>
      </MotionConfig>
      <Footer />
    </>
  );
}
