import { useState, useEffect, useMemo, useRef, type ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion, MotionConfig, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardSets, useCards, type CardSetPublic } from '@/hooks/useTcg';
import type { CardPublic } from '@/components/CardCard';
import {
  ShieldCheck,
  Truck,
  Package,
  ChevronRight,
  ChevronDown,
  Layers,
  Zap,
} from 'lucide-react';

// ── Animations ─────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const staggerFast = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// ── Card fan decoration ─────────────────────────────────────────────────────

const FAN_CFG = {
  mobile:  { w: 118, h: 165, containerW: 370, containerH: 230 },
  desktop: { w: 285, h: 399, containerW: 740, containerH: 520 },
};

type FanPos = { rotate: number; x: number; y: number; delay: number };
const FAN_POSITIONS: Record<number, { mobile: FanPos[]; desktop: FanPos[] }> = {
  3: {
    mobile: [
      { rotate: -28, x: -130, y: -5,   delay: 0.06 },
      { rotate: 0,   x: 0,    y: -42,  delay: 0.22 },
      { rotate: 28,  x: 130,  y: -5,   delay: 0.38 },
    ],
    desktop: [
      { rotate: -22, x: -220, y: -65,  delay: 0.06 },
      { rotate: 0,   x: 0,    y: -120, delay: 0.22 },
      { rotate: 22,  x: 220,  y: -65,  delay: 0.38 },
    ],
  },
  4: {
    mobile: [
      { rotate: -22, x: -140, y: -5,   delay: 0.06 },
      { rotate: -8,  x: -55,  y: -25,  delay: 0.14 },
      { rotate: 8,   x: 55,   y: -25,  delay: 0.30 },
      { rotate: 22,  x: 140,  y: -5,   delay: 0.38 },
    ],
    desktop: [
      { rotate: -18, x: -225, y: -65,  delay: 0.06 },
      { rotate: -6,  x: -90,  y: -105, delay: 0.14 },
      { rotate: 6,   x: 90,   y: -105, delay: 0.30 },
      { rotate: 18,  x: 225,  y: -65,  delay: 0.38 },
    ],
  },
  5: {
    mobile: [
      { rotate: -28, x: -152, y: -5,   delay: 0.06 },
      { rotate: -12, x: -68,  y: -22,  delay: 0.14 },
      { rotate: 0,   x: 0,    y: -42,  delay: 0.22 },
      { rotate: 12,  x: 68,   y: -22,  delay: 0.30 },
      { rotate: 28,  x: 152,  y: -5,   delay: 0.38 },
    ],
    desktop: [
      { rotate: -22, x: -242, y: -65,  delay: 0.06 },
      { rotate: -9,  x: -119, y: -95,  delay: 0.14 },
      { rotate: 0,   x: 0,    y: -120, delay: 0.22 },
      { rotate: 9,   x: 119,  y: -95,  delay: 0.30 },
      { rotate: 22,  x: 242,  y: -65,  delay: 0.38 },
    ],
  },
};

type HeroConfig = { mode: 'random' | 'manual'; count: 3 | 4 | 5; game: 'riftbound' | 'pokemon' | 'all'; cardIds: string[] };

const CARD_BG_FALLBACK = [
  'from-violet-700 to-indigo-800',
  'from-indigo-700 to-blue-800',
  'from-indigo-600 to-violet-700',
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

  // Hero config from backend
  const { data: heroConfig } = useQuery<HeroConfig>({
    queryKey: ['hero-config'],
    queryFn: () => fetch('/api/settings/hero-config').then(r => r.json()),
    staleTime: 60_000,
  });

  const mode    = heroConfig?.mode    ?? 'random';
  const count   = (heroConfig?.count  ?? 5) as 3 | 4 | 5;
  const game    = heroConfig?.game    ?? 'riftbound';
  const cardIds = heroConfig?.cardIds ?? [];

  // Positions for current count
  const fanPositionSet = FAN_POSITIONS[count] ?? FAN_POSITIONS[5];
  const positions = isDesktop ? fanPositionSet.desktop : fanPositionSet.mobile;
  const cfg = isDesktop ? FAN_CFG.desktop : FAN_CFG.mobile;
  const { w, h, containerW, containerH } = cfg;
  const centerIdx = Math.floor(positions.length / 2);

  // Random mode — fetch card pool from configured game
  const { data: poolData } = useQuery<{ cards: CardPublic[] }>({
    queryKey: ['hero-pool', game],
    queryFn: () => {
      const qs = game === 'all' ? '' : `game=${game}&`;
      return fetch(`/api/cards?${qs}limit=30&sort=newest`).then(r => r.json());
    },
    enabled: mode === 'random',
    staleTime: 120_000,
  });

  // Manual mode — fetch specific cards by IDs
  const { data: manualCards } = useQuery<any[]>({
    queryKey: ['hero-manual', cardIds.join(',')],
    queryFn: () => {
      if (!cardIds.length) return Promise.resolve([]);
      return fetch(`/api/cards/by-ids?ids=${cardIds.join(',')}`).then(r => r.json());
    },
    enabled: mode === 'manual' && cardIds.length > 0,
    staleTime: 120_000,
  });

  const imagePool = useMemo<string[]>(() => {
    if (mode === 'manual') {
      return (manualCards ?? []).map((c: any) => c.image_url).filter(Boolean);
    }
    return (poolData?.cards ?? []).filter(c => c.image_url).map(c => c.image_url!);
  }, [mode, poolData, manualCards]);

  // 5 slots internally — only positions.length are rendered
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const poolIdxRef   = useRef(count);
  const slotIdxRef   = useRef(0);
  const initializedRef = useRef(false);
  const prevModeRef    = useRef(mode);
  const prevGameRef    = useRef(game);
  const prevCountRef   = useRef(count);

  // Reset when config changes
  useEffect(() => {
    if (prevModeRef.current !== mode || prevGameRef.current !== game || prevCountRef.current !== count) {
      prevModeRef.current  = mode;
      prevGameRef.current  = game;
      prevCountRef.current = count;
      initializedRef.current = false;
      slotIdxRef.current   = 0;
      poolIdxRef.current   = count;
      setSlots([null, null, null, null, null]);
    }
  }, [mode, game, count]);

  // Seed slots once
  useEffect(() => {
    if (initializedRef.current) return;
    if (mode === 'manual') {
      if (imagePool.length > 0) {
        initializedRef.current = true;
        setSlots(prev => {
          const next = [...prev];
          imagePool.slice(0, 5).forEach((url, i) => { next[i] = url; });
          return next;
        });
      }
    } else {
      if (imagePool.length >= count) {
        initializedRef.current = true;
        setSlots(prev => {
          const next = [...prev];
          for (let i = 0; i < count; i++) next[i] = imagePool[i];
          return next;
        });
        poolIdxRef.current = count;
      }
    }
  }, [imagePool, mode, count]);

  // Cycle one card every 3 s (random mode only)
  useEffect(() => {
    if (mode !== 'random' || imagePool.length === 0) return;
    const id = setInterval(() => {
      setSlots(prev => {
        const next = [...prev];
        const slot = slotIdxRef.current % count;
        next[slot] = imagePool[poolIdxRef.current % imagePool.length];
        slotIdxRef.current++;
        poolIdxRef.current++;
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [imagePool, mode, count]);

  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none"
      style={{ width: containerW, height: containerH }}
    >
      {/* Platform glow ring */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '130%', height: '52%',
          background: 'radial-gradient(ellipse 100% 65% at 50% 100%, rgba(99,102,241,0.6) 0%, rgba(124,58,237,0.32) 38%, rgba(79,70,229,0.1) 68%, transparent 82%)',
          filter: 'blur(26px)',
        }}
      />
      {/* Ambient outer glow */}
      <div
        className="absolute -inset-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 85%, rgba(79,70,229,0.22), transparent 68%)',
          filter: 'blur(48px)',
        }}
      />

      {positions.map((pos, i) => {
        const isCenter = i === centerIdx;
        const depthZ   = 10 - Math.abs(i - centerIdx) * 2;
        const imgSrc   = slots[i];

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: pos.y + 80, rotate: pos.rotate }}
            animate={{ opacity: 1, y: pos.y, x: pos.x, rotate: pos.rotate }}
            transition={{ duration: 0.75, delay: pos.delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            style={{ position: 'absolute', bottom: 0, zIndex: depthZ }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.8 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              style={{
                width: w, height: h, borderRadius: 12, overflow: 'hidden',
                border: isCenter ? '1.5px solid rgba(129,140,248,0.55)' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: isCenter
                  ? '0 0 35px rgba(99,102,241,0.4), 0 24px 64px rgba(0,0,0,0.65)'
                  : '0 14px 44px rgba(0,0,0,0.55)',
              }}
            >
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={imgSrc ?? `empty-${i}`}
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 28 }}
                  transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{ position: 'absolute', inset: 0 }}
                >
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#1a1a3e', display: 'block' }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${CARD_BG_FALLBACK[i % CARD_BG_FALLBACK.length]}`} />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

const HERO_TRUST_ITEMS = [
  { icon: ShieldCheck, title: '%100 Orijinal', sub: 'Kart Garantisi' },
  { icon: Truck,       title: 'Hızlı Kargo',   sub: '1–2 İş Günü' },
  { icon: Package,     title: 'Güvenli Ödeme', sub: '256-bit SSL' },
];

function HeroSection() {
  return (
    <section
      className="relative bg-[#0d1427] flex flex-col overflow-hidden"
      style={{ minHeight: 'calc(100vh - 120px)' }}
      data-testid="section-hero"
    >
      {/* YouTube video background — all screens */}
      <div className="absolute inset-0 pointer-events-none">
        <iframe
          src="https://www.youtube-nocookie.com/embed/zF5Ddo9JdpY?autoplay=1&mute=1&loop=1&playlist=zF5Ddo9JdpY&start=10&controls=0&showinfo=0&rel=0&playsinline=1&disablekb=1&iv_load_policy=3&modestbranding=1&enablejsapi=0&cc_load_policy=0&origin=https://gocards.toov.com.tr"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          title=""
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '56.25vw',
            minHeight: '100%',
            minWidth: '177.78vh',
            transform: 'translate(-50%, -50%)',
            border: 'none',
            opacity: 0.45,
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(13,20,39,0.82) 0%, rgba(13,20,39,0.55) 50%, rgba(13,20,39,0.75) 100%)' }} />
        {/* Bottom fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to bottom, transparent, #0d1427)' }} />
      </div>

      {/* Background orbs (mobile + subtle desktop accent) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full bg-indigo-700/18 blur-[130px] lg:opacity-40" />
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] rounded-full bg-violet-800/12 blur-[110px] lg:opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.14),transparent_58%)] lg:opacity-50" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 w-full flex-1 flex flex-col">

        {/* Main content grid */}
        <div className="flex-1 flex items-center pt-2 pb-0 lg:py-4">
          <div className="flex flex-col lg:grid lg:gap-4 lg:items-start w-full"
            style={{ gridTemplateColumns: '44% 56%' }}
          >
            {/* Card fan — top on mobile, right col on desktop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.04 }}
              className="flex justify-center lg:justify-end order-1 lg:order-2 mb-1 lg:mb-0 overflow-visible"
            >
              <CardFan />
            </motion.div>

            {/* Text — below on mobile, left col on desktop */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="text-center lg:text-left order-2 lg:order-1 flex flex-col items-center lg:items-start"
            >
              {/* Filled badge */}
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
                style={{ background: 'rgba(79,70,229,0.85)', backdropFilter: 'blur(4px)' }}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" />
                <span className="text-[11px] text-indigo-100 font-semibold tracking-wider uppercase">Güvenle Alışveriş Yap</span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-white leading-[1.08] mb-5"
                style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
              >
                Türkiye'de
                <br />
                <span className="riftbound-shimmer">Riftbound</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-zinc-400 text-base lg:text-lg leading-relaxed mb-7 max-w-md mx-auto lg:mx-0">
                Aradığın kartı bul, güvenle sipariş ver.
                <br />
                Hızlı kargo, orijinal kart garantisi ve en iyi fiyatlar.
              </motion.p>

              {/* CTA buttons */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start w-full sm:w-auto">
                <Link href="/magaza?game=riftbound">
                  <motion.button
                    data-testid="btn-hero-magaza"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-900/40 w-full sm:w-auto justify-center"
                  >
                    Kartlara Bak
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </motion.div>

              {/* Game logos — mobile only, inline after CTA */}
              <motion.div
                variants={fadeUp}
                className="flex lg:hidden items-center justify-center gap-6 mt-5"
              >
                <Link href="/oyun/riftbound">
                  <img src="/logo-riftbound.png" alt="Riftbound"
                    className="h-10 w-auto object-contain select-none"
                    style={{ mixBlendMode: 'screen' }} draggable={false} />
                </Link>
                <div className="w-px h-10 bg-white/12 shrink-0" />
                <Link href="/oyun/pokemon">
                  <img src="/logo-pokemon-tcg.webp" alt="Pokémon TCG"
                    className="h-10 w-auto object-contain select-none" draggable={false} />
                </Link>
              </motion.div>

              {/* Trust badges row — desktop only */}
              <motion.div
                variants={fadeUp}
                className="hidden lg:flex items-center mt-6 justify-center lg:justify-start"
              >
                {HERO_TRUST_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center">
                    {i > 0 && <div className="w-px h-8 bg-white/10 mx-4 sm:mx-5 shrink-0" />}
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <div className="text-left">
                        <div className="text-[11px] font-semibold text-white/80 leading-tight whitespace-nowrap">{item.title}</div>
                        <div className="text-[10px] text-white/36 leading-tight whitespace-nowrap">{item.sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Game logo row — desktop only, anchored to bottom */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex pb-12 items-center justify-center gap-20"
        >
          <Link href="/oyun/riftbound" data-testid="link-hero-riftbound-logo">
            <motion.div
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="cursor-pointer"
            >
              <img
                src="/logo-riftbound.png"
                alt="Riftbound"
                className="h-10 sm:h-12 lg:h-24 w-auto object-contain select-none"
                style={{ mixBlendMode: 'screen' }}
                draggable={false}
              />
            </motion.div>
          </Link>

          <div className="w-px h-12 lg:h-16 bg-white/10 shrink-0" />

          <Link href="/oyun/pokemon" data-testid="link-hero-pokemon-logo">
            <motion.div
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="cursor-pointer"
            >
              <img
                src="/logo-pokemon-tcg.webp"
                alt="Pokémon TCG"
                className="h-14 sm:h-16 lg:h-20 w-auto object-contain select-none"
                draggable={false}
              />
            </motion.div>
          </Link>
        </motion.div>

      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #080e1c)' }} />
    </section>
  );
}


// ── Set scroll row ──────────────────────────────────────────────────────────

function SetScrollRow({
  sets,
  accentColor,
  PlaceholderIcon,
  placeholderSrc,
  bgColor = '#0a0f1e',
  game,
}: {
  sets: CardSetPublic[];
  accentColor: string;
  PlaceholderIcon: ElementType;
  placeholderSrc?: string;
  bgColor?: string;
  game?: 'pokemon' | 'riftbound';
}) {
  // Duplicate for seamless marquee loop
  const doubled = [...sets, ...sets];

  const SetCard = ({ set, idx }: { set: CardSetPublic; idx: number }) => (
    <Link key={`${set.id}-${idx}`} href={`/set/${set.slug}`}>
      <motion.div
        whileHover={{ scale: 1.04, y: -2 }}
        transition={{ duration: 0.18 }}
        className="shrink-0 flex flex-col items-center px-4 py-3 rounded-xl cursor-pointer border border-white/[0.07] hover:border-white/[0.16] transition-colors"
        style={{ width: 128, height: 104, background: 'rgba(255,255,255,0.03)' }}
        data-testid={`set-card-${set.slug}`}
      >
        {/* Logo — fixed slot */}
        <div className="h-9 w-full flex items-center justify-center shrink-0">
          {set.logo_url ? (
            <img
              src={set.logo_url}
              alt={set.name}
              className="max-h-9 max-w-[100px] object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : placeholderSrc ? (
            <img src={placeholderSrc} alt="" className="w-7 h-7 object-contain" style={{ opacity: 0.5 }} />
          ) : (
            <PlaceholderIcon className="w-6 h-6 opacity-40" style={{ color: accentColor }} />
          )}
        </div>
        {/* Name — fixed 2-line slot */}
        <p className={`text-center leading-tight line-clamp-2 w-full mt-2 flex-1 ${game === 'riftbound' ? 'text-[11px] font-bold text-white/80' : 'text-[10px] font-normal text-white/50'}`}>
          {set.name}
        </p>
        {/* Stock badge — always takes space, invisible when 0 */}
        <span
          className="text-[9px] font-semibold mt-1 h-4 flex items-center"
          style={{ color: accentColor, opacity: set.listed_cards > 0 ? 0.85 : 0 }}
        >
          {set.listed_cards > 0 ? `${set.listed_cards} stokta` : '·'}
        </span>
      </motion.div>
    </Link>
  );

  return (
    <div className="relative overflow-hidden">
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to right, ${bgColor}, transparent)` }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-14 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to left, ${bgColor}, transparent)` }}
      />

      {/* Marquee track */}
      <div
        className="flex gap-3 pb-2 w-max"
        style={{ animation: 'marquee 55s linear infinite' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.animationPlayState = 'paused')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.animationPlayState = 'running')}
      >
        {doubled.map((set, idx) => (
          <SetCard key={`${set.id}-${idx}`} set={set} idx={idx} />
        ))}
      </div>
    </div>
  );
}

// ── Game Section ────────────────────────────────────────────────────────────

interface GameSectionProps {
  game: 'pokemon' | 'riftbound';
  title: string;
  accentColor: string;
  accentClass: string;
  bgColor: string;
  PlaceholderIcon: ElementType;
  testId: string;
}

function GameSection({ game, title, accentColor, accentClass, bgColor, PlaceholderIcon, testId }: GameSectionProps) {
  const { data: allSets = [], isLoading: setsLoading } = useCardSets(game);
  const { data: cardsData, isLoading: cardsLoading } = useCards({
    game,
    limit: 6,
    featured: true,
  });

  const sets = game === 'pokemon' ? allSets.slice(0, 14) : allSets;
  const cards = cardsData?.cards ?? [];

  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ background: bgColor }}
      data-testid={testId}
    >
      {/* subtle background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-60 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{ background: accentColor }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="flex items-end justify-between mb-8"
        >
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 rounded-full" style={{ background: accentColor }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
                {game === 'pokemon' ? 'Koleksiyon Kartları' : 'Yeni Evren'}
              </span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-white"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {title}
            </h2>
          </motion.div>

          <motion.div variants={fadeUp} className="hidden sm:block">
            <Link href={`/oyun/${game}`}>
              <button
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors border rounded-lg px-4 py-2"
                style={{ color: accentColor, borderColor: `${accentColor}40` }}
                data-testid={`btn-${game}-tumu`}
              >
                Tümünü Gör <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Sets horizontal scroll */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          {setsLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="shrink-0 w-32 h-22 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', height: 88 }} />
              ))}
            </div>
          ) : sets.length > 0 ? (
            <SetScrollRow sets={sets} accentColor={accentColor} PlaceholderIcon={PlaceholderIcon} placeholderSrc={game === 'riftbound' ? '/icon-riftbound.svg' : undefined} bgColor={bgColor} game={game} />
          ) : null}
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/25">Öne Çıkan Kartlar</span>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Cards grid */}
        {cardsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl animate-pulse aspect-[63/88]" style={{ background: 'rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : cards.length > 0 ? (
          <motion.div
            variants={staggerFast}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {cards.map(card => (
              <motion.div
                key={card.id}
                variants={fadeUp}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <CardCard card={card} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-white/25 text-sm">
            Yakında stok eklenecek
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link href={`/oyun/${game}`}>
            <button
              className="inline-flex items-center gap-1.5 text-sm font-medium border rounded-lg px-5 py-2.5 transition-colors"
              style={{ color: accentColor, borderColor: `${accentColor}40` }}
            >
              Tümünü Gör <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

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
        description="Go|Cards — Türkiye'nin en geniş TCG kart seçkisi. Pokemon TCG, Riftbound single kartlar, booster paketler ve PSA gradlenmiş koleksiyonlar."
        url="/"
      />
      <Header />
      <MotionConfig reducedMotion="user">
        <main style={{ background: '#080e1c' }}>
          <HeroSection />

          <GameSection
            game="riftbound"
            title="Riftbound"
            accentColor="#818cf8"
            accentClass="text-indigo-400"
            bgColor="#060d1f"
            PlaceholderIcon={Layers}
            testId="section-riftbound"
          />

          <GameSection
            game="pokemon"
            title="Pokémon TCG"
            accentColor="#f59e0b"
            accentClass="text-amber-400"
            bgColor="#0a0f1e"
            PlaceholderIcon={Zap}
            testId="section-pokemon"
          />

        </main>
      </MotionConfig>
      <Footer />
    </>
  );
}
