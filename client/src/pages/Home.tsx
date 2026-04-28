import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link } from 'wouter';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  MotionConfig,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useProducts, type Product } from '@/hooks/useProducts';
import heroPosterImage from '@assets/generated_images/polen-hero-dark-1.png';

const HERO_VIDEO_DESKTOP = '/videos/polen-hero.mp4';
const HERO_VIDEO_MOBILE = '/videos/polen-hero-mobile.mp4';

// UTILITIES

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

function formatPrice(p: string | number) {
  const n = typeof p === 'string' ? parseFloat(p || '0') : p;
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

// REVEAL WORD — text reveal animation

function RevealWord({
  text,
  delay = 0,
  className = '',
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`inline-block overflow-hidden align-bottom ${className}`}>
      <motion.span
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1.05, delay, ease: [0.16, 1, 0.3, 1] }}
        className="inline-block"
      >
        {text}
      </motion.span>
    </span>
  );
}

// Gate that defers children until after first paint so framer-motion's useScroll can safely attach to DOM refs.
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(true);
  }, []);
  return m;
}

// SCENE 01 — HERO (cinematic)

function HeroScene() {
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  if (!mounted || prefersReduced) return <HeroSceneStatic />;
  return <HeroSceneInner />;
}

function HeroSceneStatic() {
  return (
    <section
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black flex items-center justify-center"
      aria-label="Polen Stone tanıtım"
    >
      <img
        src={heroPosterImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/80" />
      <div className="relative z-10 text-center px-5">
        <h1
          className="font-display text-white leading-[0.86] uppercase"
          style={{
            fontSize: 'clamp(72px, 13vw, 220px)',
            letterSpacing: '-0.04em',
            fontWeight: 700,
          }}
          data-testid="text-hero-title"
        >
          <span className="block">POLEN</span>
          <span className="block text-polen-orange" style={{ marginTop: '-0.18em' }}>
            STONE
          </span>
        </h1>
        <p className="mt-5 lg:mt-7 max-w-[520px] mx-auto text-[12px] lg:text-[13px] tracking-[0.18em] uppercase text-white/65 font-mono">
          Mermer · Granit · Traverten · Oniks
        </p>
      </div>
    </section>
  );
}

function HeroVideoLazy() {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    const id = window.setTimeout(() => setShow(true), mql.matches ? 450 : 900);
    return () => {
      window.clearTimeout(id);
      mql.removeEventListener('change', onChange);
    };
  }, []);
  if (!show || isMobile === null) return null;
  const src = isMobile ? HERO_VIDEO_MOBILE : HERO_VIDEO_DESKTOP;
  return (
    <video
      key={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={heroPosterImage}
      className="absolute inset-0 w-full h-full object-cover"
      aria-hidden="true"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

function HeroSceneInner() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse), (max-width: 1023px)');
    const update = () => setIsTouch(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', isTouch ? '0%' : '20%']);
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', isTouch ? '0%' : '-30%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, isTouch ? 1 : 0]);

  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} GMT+3`,
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black text-white"
      data-testid="scene-hero"
    >
      <motion.div className="absolute inset-0 z-0" style={{ y: videoY }}>
        <img
          src={heroPosterImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <HeroVideoLazy />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />
      </motion.div>

      <div className="absolute top-0 left-0 right-0 z-20 px-5 lg:px-10 pt-24 lg:pt-12 flex items-center justify-between text-white/65 text-[10px] font-mono tracking-[0.28em] uppercase">
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          ◢ Anadolu — Doğal Taş Atölyesi
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="hidden md:inline"
        >
          {time || '—'}
        </motion.span>
      </div>

      <motion.div
        className="absolute inset-0 z-10 flex items-center justify-center px-5"
        style={{ y: titleY, opacity: titleOpacity }}
      >
        <div className="text-center">
          <h1
            className="font-display text-white leading-[0.86] uppercase"
            style={{
              fontSize: 'clamp(72px, 13vw, 220px)',
              letterSpacing: '-0.04em',
              fontWeight: 700,
            }}
            data-testid="text-hero-title"
          >
            <span className="block">
              <RevealWord text="POLEN" delay={0.2} />
            </span>
            <span
              className="block text-polen-orange"
              style={{ marginTop: '-0.18em' }}
            >
              <RevealWord text="STONE" delay={0.4} />
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 lg:mt-7 max-w-[520px] mx-auto text-[12px] lg:text-[13px] tracking-[0.18em] uppercase text-white/65 font-mono"
          >
            Mermer · Granit · Traverten · Oniks
          </motion.p>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 lg:px-10 pb-8 lg:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="flex items-end justify-end"
        >
          <div className="hidden lg:flex items-center gap-3 text-white/55 text-[10px] tracking-[0.28em] uppercase font-mono">
            <motion.span
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block w-px h-10 bg-white/40"
            />
            <span>Aşağı Kaydır</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// SCENE 02 — AUTO-SLIDE SHOWCASE (yatay otomatik kayan vitrin)

function PinnedShowcaseScene({ products }: { products: Product[] }) {
  const items = useMemo(() => {
    if (!products?.length) return [];
    const featured = products.filter((p) => p.isFeatured && p.images?.length);
    const news = products.filter((p) => p.isNew && !p.isFeatured && p.images?.length);
    const rest = products.filter((p) => !p.isFeatured && !p.isNew && p.images?.length);
    return [...featured, ...news, ...rest].slice(0, 16);
  }, [products]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <section
      className="relative bg-[#0c0a09] text-white py-14 lg:py-20 overflow-hidden border-y border-white/10"
      data-testid="scene-showcase"
      aria-label="Vitrin — öne çıkan ürünler"
    >
      <div className="px-5 lg:px-10 mb-8 lg:mb-10 flex items-center justify-between text-[10px] font-mono tracking-[0.28em] uppercase text-white/55">
        <span>— 02 / Vitrin</span>
        <Link
          href="/magaza"
          data-testid="link-showcase-all"
          className="hover:text-polen-orange transition-colors inline-flex items-center gap-2"
          aria-label="Tüm ürünleri gör"
        >
          Tümü <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="relative">
        <div className="flex gap-5 lg:gap-8 animate-marquee-hero will-change-transform">
          {doubled.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href={`/urun/${p.slug}`}
              data-testid={`link-showcase-product-${p.id}-${i}`}
              data-cursor="hover"
              data-cursor-label="İncele"
              aria-label={`${p.name} ürün sayfası`}
              className="group shrink-0 w-[260px] lg:w-[340px]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                <img
                  src={p.images?.[0] || ''}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                {p.discountBadge && (
                  <div className="absolute top-3 right-3 bg-polen-orange text-white text-[10px] font-bold tracking-[0.2em] px-2 py-1 uppercase">
                    {p.discountBadge}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/55 mb-1">
                      Doğal Taş
                    </div>
                    <div className="text-sm lg:text-base font-medium text-white truncate">
                      {p.name}
                    </div>
                  </div>
                  <div className="text-sm lg:text-base font-semibold text-polen-orange whitespace-nowrap">
                    {formatPrice(p.basePrice)} ₺
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// SCENE 03 — PRODUCTS GRID (sade ürün listesi)

function ProductGridScene({ products }: { products: Product[] }) {
  const items = useMemo(() => {
    if (!products?.length) return [];
    const pool = products.filter((p) => p.images?.length);
    const seed = 1729;
    const shuffled = [...pool]
      .map((p, i) => ({ p, key: hashStr(`${p.id}:${seed}:${i}`) }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.p);
    return shuffled.slice(0, 12);
  }, [products]);

  if (items.length === 0) return null;

  return (
    <section
      className="relative bg-[hsl(var(--polen-cream))] text-black py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-product-grid"
      aria-label="Ürünler"
    >
      <div className="max-w-[1320px] mx-auto flex items-end justify-between mb-8 lg:mb-12 gap-6">
        <div>
          <div className="text-[10px] font-mono tracking-[0.28em] uppercase text-black/45 mb-3">
            — 03 / Ürünler
          </div>
          <h2
            className="font-display uppercase text-black leading-[0.95]"
            style={{
              fontSize: 'clamp(28px, 4vw, 56px)',
              letterSpacing: '-0.02em',
            }}
          >
            Polen Stone Koleksiyonu
          </h2>
        </div>
        <Link
          href="/magaza"
          data-testid="link-grid-all"
          className="shrink-0 inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.24em] uppercase text-black/70 hover:text-polen-orange transition-colors"
          aria-label="Tüm ürünleri gör"
        >
          Tümünü Gör <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="max-w-[1320px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

// SCENE 04 — STATEMENT MARQUEE STRIP

function StatementMarqueeScene() {
  const items = [
    'POLEN STONE',
    '◆',
    'ANADOLU\'DAN MEKÂNINIZA',
    '✦',
    'TÜRKİYE GENELİ KARGO',
    '◆',
    'KAPIDAN TESLİMAT',
    '✦',
    'GÜVENLİ ÖDEME',
    '◆',
    'MERMER · GRANİT · TRAVERTEN · ONİKS',
    '✦',
  ];
  const doubled = [...items, ...items, ...items];

  return (
    <section
      className="relative bg-[hsl(var(--polen-stone))] text-white overflow-hidden border-y border-white/10"
      data-testid="scene-statement-marquee"
      aria-label="Marka bilgi şeridi"
    >
      <div className="py-10 lg:py-12 overflow-hidden">
        <div className="flex items-center gap-12 lg:gap-16 animate-marquee-slow whitespace-nowrap">
          {doubled.map((t, i) => (
            <span
              key={i}
              className={`font-display uppercase ${
                t.length === 1
                  ? 'text-polen-orange text-2xl lg:text-3xl'
                  : 'text-3xl lg:text-4xl tracking-[0.02em]'
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// SCENE 05 — FINAL CTA (footer-preceding)

function FinalCtaScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <section
      ref={ref}
      className="relative bg-[hsl(var(--polen-cream))] text-black py-24 lg:py-36 px-5 lg:px-10 overflow-hidden"
      data-testid="scene-final-cta"
    >
      <div className="max-w-[1320px] mx-auto">
        <div className="text-[10px] font-mono tracking-[0.28em] uppercase text-black/45 mb-8">
          — 04 / Davet
        </div>
        <h2
          className="font-display uppercase text-black leading-[0.92]"
          style={{
            fontSize: 'clamp(40px, 6vw, 110px)',
            letterSpacing: '-0.03em',
          }}
        >
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            Mekânınıza
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            doğanın ihtişamını
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="block text-polen-orange"
          >
            taşıyalım.
          </motion.span>
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="mt-12 lg:mt-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8"
        >
          <p className="max-w-[560px] text-base lg:text-lg text-black/65 leading-relaxed">
            Anadolu'nun zengin doğal taş mirasını mekânınıza taşıyoruz.
            Mermer, granit, traverten ve oniks koleksiyonumuzu keşfedin.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
            <Link
              href="/magaza"
              data-testid="link-final-cta-shop"
              data-cursor="cta"
              data-cursor-label="Keşfet"
              aria-label="Tüm koleksiyonu keşfet"
              className="group inline-flex items-center gap-4"
            >
              <span className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-black text-white group-hover:bg-polen-orange transition-colors">
                <ArrowUpRight className="w-6 h-6 lg:w-7 lg:h-7" />
              </span>
              <span className="text-sm lg:text-base font-medium tracking-[0.18em] uppercase text-black group-hover:text-polen-orange transition-colors">
                Koleksiyonu Keşfet
              </span>
            </Link>
            <a
              href="https://wa.me/905000000000"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-final-cta-whatsapp"
              data-cursor="cta"
              data-cursor-label="WhatsApp"
              aria-label="WhatsApp üzerinden iletişime geç"
              className="group inline-flex items-center gap-4"
            >
              <span className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full border border-black/25 text-black group-hover:bg-black group-hover:text-white transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 lg:w-7 lg:h-7 fill-current"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M19.05 4.91A10 10 0 0 0 12 2a10 10 0 0 0-8.66 14.95L2 22l5.21-1.34A10 10 0 0 0 22 12a9.93 9.93 0 0 0-2.95-7.09Zm-7.05 15A8.07 8.07 0 0 1 7.9 18.7l-.28-.17-3.09.79.83-3-.18-.3a8 8 0 1 1 6.82 3.86Zm4.41-5.96c-.24-.12-1.42-.7-1.64-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.6 6.6 0 0 1-1.95-1.2 7.32 7.32 0 0 1-1.35-1.68c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.65 1.65 0 0 0 .24-.4.44.44 0 0 0 0-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.89.89 0 0 0-.64.3 2.7 2.7 0 0 0-.84 2c0 1.18.86 2.32.98 2.48s1.69 2.59 4.1 3.63a13.8 13.8 0 0 0 1.37.51 3.31 3.31 0 0 0 1.51.1 2.48 2.48 0 0 0 1.62-1.14 2 2 0 0 0 .14-1.14c-.06-.12-.22-.18-.46-.3Z" />
                </svg>
              </span>
              <span className="text-sm lg:text-base font-medium tracking-[0.18em] uppercase text-black group-hover:text-polen-orange transition-colors">
                WhatsApp
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// MAIN — Home page

export default function Home() {
  const { data: products = [] } = useProducts({});

  return (
    <>
      <SEO
        title="Polen Stone — Doğal Taş & Mermer"
        description="Polen Stone — Premium doğal taş ve mermer markası. Mermer, granit, traverten ve oniks koleksiyonu ile mekânlarınıza doğanın ihtişamını taşıyın."
      />
      <Header />
      <MotionConfig reducedMotion="user">
        <main className="bg-black">
          <HeroScene />
          <PinnedShowcaseScene products={products} />
          <ProductGridScene products={products} />
          <StatementMarqueeScene />
          <FinalCtaScene />
        </main>
      </MotionConfig>
      <Footer />
    </>
  );
}
