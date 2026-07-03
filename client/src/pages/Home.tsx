import { useState, useEffect, useMemo, useRef, type ElementType } from 'react';
import { Link } from 'wouter';
import { motion, MotionConfig } from 'framer-motion';
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
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Sparkles,
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
  mobile: {
    positions: [
      { rotate: -28, x: -152, y: -5,  delay: 0.06 },
      { rotate: -12, x: -68,  y: -22, delay: 0.14 },
      { rotate: 0,   x: 0,    y: -42, delay: 0.22 },
      { rotate: 12,  x: 68,   y: -22, delay: 0.30 },
      { rotate: 28,  x: 152,  y: -5,  delay: 0.38 },
    ],
    w: 118, h: 165,
    containerW: 370, containerH: 230,
  },
  desktop: {
    positions: [
      { rotate: -22, x: -242, y: -20,  delay: 0.06 },
      { rotate: -9,  x: -119, y: -50,  delay: 0.14 },
      { rotate: 0,   x: 0,    y: -75,  delay: 0.22 },
      { rotate: 9,   x: 119,  y: -50,  delay: 0.30 },
      { rotate: 22,  x: 242,  y: -20,  delay: 0.38 },
    ],
    w: 285, h: 399,
    containerW: 740, containerH: 520,
  },
};

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

  const { data: riftData } = useCards({ game: 'riftbound', limit: 20, sort: 'newest' });
  const { data: pokeData } = useCards({ game: 'pokemon', limit: 20, sort: 'newest' });

  const fanImages = useMemo(() => {
    const rift = [...(riftData?.cards ?? []).filter(c => c.image_url)].sort(() => Math.random() - 0.5);
    const poke = [...(pokeData?.cards ?? []).filter(c => c.image_url)].sort(() => Math.random() - 0.5);
    // 3 Riftbound (center + flanks) + 2 Pokemon (outer positions)
    return [rift[0], rift[1], rift[2], poke[0], poke[1]].map(c => c?.image_url ?? null);
  }, [riftData, pokeData]);

  const cfg = isDesktop ? FAN_CFG.desktop : FAN_CFG.mobile;
  const { positions, w, h, containerW, containerH } = cfg;
  const centerIdx = Math.floor(positions.length / 2);

  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none"
      style={{ width: containerW, height: containerH }}
    >
      {/* Platform glow ring */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '130%',
          height: '52%',
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
        const depthZ = 10 - Math.abs(i - centerIdx) * 2;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 80, rotate: pos.rotate }}
            animate={{ opacity: 1, y: pos.y, x: pos.x, rotate: pos.rotate }}
            transition={{ duration: 0.75, delay: pos.delay, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
            style={{ position: 'absolute', bottom: 0, zIndex: depthZ }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.8 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              className="overflow-hidden"
              style={{
                width: w,
                height: h,
                borderRadius: 12,
                border: isCenter
                  ? '1.5px solid rgba(129,140,248,0.55)'
                  : '1px solid rgba(255,255,255,0.15)',
                boxShadow: isCenter
                  ? '0 0 35px rgba(99,102,241,0.4), 0 24px 64px rgba(0,0,0,0.65)'
                  : '0 14px 44px rgba(0,0,0,0.55)',
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
                <div className={`w-full h-full bg-gradient-to-br ${CARD_BG_FALLBACK[i % CARD_BG_FALLBACK.length]}`} />
              )}
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
      className="relative bg-[#0d1427] flex flex-col"
      style={{ minHeight: 'calc(100vh - 120px)' }}
      data-testid="section-hero"
    >
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full bg-indigo-700/18 blur-[130px]" />
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] rounded-full bg-violet-800/12 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.14),transparent_58%)]" />
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
                Pokemon TCG &amp;
                <br />
                <span style={{ color: '#818cf8' }}>Riftbound</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-zinc-400 text-base lg:text-lg leading-relaxed mb-7 max-w-md mx-auto lg:mx-0">
                Aradığın kartı bul, güvenle sipariş ver.
                <br />
                Hızlı kargo, orijinal kart garantisi ve en iyi fiyatlar.
              </motion.p>

              {/* CTA buttons */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start w-full sm:w-auto">
                <Link href="/magaza">
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

        {/* Game logo row — replaces StatsBar, anchored to bottom of hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="pb-6 lg:pb-12 pt-2 lg:pt-0 flex items-center justify-center gap-8 sm:gap-14 lg:gap-20"
        >
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

          <div className="w-px h-12 lg:h-16 bg-white/10 shrink-0" />

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
                className="h-10 sm:h-12 lg:h-14 w-auto object-contain select-none"
                style={{ mixBlendMode: 'screen' }}
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
}: {
  sets: CardSetPublic[];
  accentColor: string;
  PlaceholderIcon: ElementType;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {sets.map(set => (
        <Link key={set.id} href={`/set/${set.slug}`}>
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            transition={{ duration: 0.18 }}
            className="snap-start shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-xl cursor-pointer border border-white/[0.07] hover:border-white/[0.16] transition-colors"
            style={{ width: 128, minHeight: 88, background: 'rgba(255,255,255,0.03)' }}
            data-testid={`set-card-${set.slug}`}
          >
            <div className="h-9 w-full flex items-center justify-center">
              {set.logo_url ? (
                <img
                  src={set.logo_url}
                  alt={set.name}
                  className="max-h-9 max-w-[100px] object-contain"
                  style={{ filter: 'brightness(0) invert(1)', opacity: 0.65 }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <PlaceholderIcon className="w-6 h-6 opacity-40" style={{ color: accentColor }} />
              )}
            </div>
            <p className="text-[10px] text-white/50 text-center leading-tight line-clamp-2 w-full">{set.name}</p>
            {set.listed_cards > 0 && (
              <span className="text-[9px] font-semibold" style={{ color: accentColor, opacity: 0.85 }}>
                {set.listed_cards} stokta
              </span>
            )}
          </motion.div>
        </Link>
      ))}

      {/* "Tümü" tile */}
      <Link href={`/oyun/${sets[0]?.game_slug ?? ''}`}>
        <motion.div
          whileHover={{ scale: 1.04, y: -2 }}
          transition={{ duration: 0.18 }}
          className="snap-start shrink-0 flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer border border-dashed border-white/[0.12] hover:border-white/25 transition-colors"
          style={{ width: 100, minHeight: 88, background: 'rgba(255,255,255,0.02)' }}
        >
          <ChevronRight className="w-5 h-5 text-white/25" />
          <p className="text-[10px] text-white/30 text-center">Tümünü<br/>Gör</p>
        </motion.div>
      </Link>
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
    sort: 'newest',
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
            <SetScrollRow sets={sets} accentColor={accentColor} PlaceholderIcon={PlaceholderIcon} />
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

// ── Trust ───────────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Koşul Garantisi',
    desc: 'Her kart listede belirtilen koşulda gönderilir. NM, LP, PSA — tam şeffaflık.',
    color: '#818cf8',
  },
  {
    icon: Package,
    title: 'Güvenli Paketleme',
    desc: 'Kartlar sleeve, top loader ve baloncuklu naylon ile çift korumalı paketlenir.',
    color: '#34d399',
  },
  {
    icon: Truck,
    title: 'Hızlı Kargo',
    desc: 'Siparişler 1-2 iş günü içinde kargoya verilir, takip numarası anında iletilir.',
    color: '#60a5fa',
  },
  {
    icon: RotateCcw,
    title: '30 Günlük İade',
    desc: 'Koşul uyuşmazlığında 30 gün içinde ücretsiz iade veya tam para iadesi.',
    color: '#f472b6',
  },
];

function TrustSection() {
  return (
    <section
      className="py-20 relative"
      style={{ background: '#060a14', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      data-testid="section-trust"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mb-12 text-center"
        >
          <motion.span variants={fadeUp} className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3 h-3" />
            Neden Biz?
          </motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Güvenle Alışveriş
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {TRUST_ITEMS.map(item => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              className="flex flex-col p-6 rounded-2xl border border-white/[0.07]"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shrink-0"
                style={{ background: `${item.color}18` }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
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
                className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
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
        description="Go|Cards — Türkiye'nin en geniş TCG kart seçkisi. Pokemon TCG, Riftbound single kartlar, booster paketler ve PSA gradlenmiş koleksiyonlar."
        url="/"
      />
      <Header />
      <MotionConfig reducedMotion="user">
        <main style={{ background: '#080e1c' }}>
          <HeroSection />

          <GameSection
            game="pokemon"
            title="Pokémon TCG"
            accentColor="#f59e0b"
            accentClass="text-amber-400"
            bgColor="#0a0f1e"
            PlaceholderIcon={Zap}
            testId="section-pokemon"
          />

          <GameSection
            game="riftbound"
            title="Riftbound"
            accentColor="#818cf8"
            accentClass="text-indigo-400"
            bgColor="#060d1f"
            PlaceholderIcon={Layers}
            testId="section-riftbound"
          />

          <TrustSection />
          <FinalCTASection />
        </main>
      </MotionConfig>
      <Footer />
    </>
  );
}
