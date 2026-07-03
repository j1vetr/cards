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
import { useQuery } from '@tanstack/react-query';

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
            style={{ width: w, height: h, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {fanImages[i] ? (
              <img src={fanImages[i]!} alt="" className="w-full h-full object-contain" style={{ background: '#1a1a3e' }} />
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
      className="relative overflow-hidden bg-[#0d1427] min-h-[620px] flex flex-col items-center"
      data-testid="section-hero"
    >
      {/* background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-700/20 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-violet-700/15 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.12),transparent_60%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 lg:py-24 w-full flex-1 flex items-center">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center w-full">

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
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-3 py-1 mb-5">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span className="text-xs text-indigo-300 font-medium tracking-wide">Türkiye'nin TCG Pazaryeri</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5"
              style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
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
                  className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors"
                >
                  Pokemon TCG
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* scroll indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-5 h-5 text-white/25" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
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
