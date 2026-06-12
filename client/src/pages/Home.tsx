import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { ProductCard } from '@/components/ProductCard';
import { Link } from 'wouter';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  MotionConfig,
  AnimatePresence,
} from 'framer-motion';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useQuery } from '@tanstack/react-query';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  image?: string | null;
}

function formatPrice(p: string | number) {
  const n = typeof p === 'string' ? parseFloat(p || '0') : p;
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ─────────────────────────────────────────────
// SCENE 01 — HERO (typographic editorial)
// ─────────────────────────────────────────────

const heroCategories = [
  { label: 'Erkek Jean', href: '/magaza?kategori=erkek-jean' },
  { label: 'Çocuk Jean', href: '/magaza?kategori=cocuk-jean' },
  { label: 'Toptan Satış', href: '/hakkimizda' },
];

function HeroScene() {
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  if (!mounted || prefersReduced) return <HeroSceneStatic />;
  return <HeroSceneInner />;
}

function HeroVideo() {
  return (
    <video
      src="/hero-video.mp4"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover"
      aria-hidden
    />
  );
}

function HeroSceneStatic() {
  return (
    <section
      className="relative bg-[hsl(var(--polen-stone))] text-white overflow-hidden"
      style={{ minHeight: 'calc(100svh - 96px)' }}
      aria-label="Ecarte Jeans denim koleksiyonu"
      data-testid="scene-hero"
    >
      <HeroVideo />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />
      <HeroContent />
    </section>
  );
}

function HeroSceneInner() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative bg-[hsl(var(--polen-stone))] text-white overflow-hidden"
      style={{ minHeight: 'calc(100svh - 96px)' }}
      data-testid="scene-hero"
    >
      {/* Parallax video wrapper */}
      <motion.div style={{ y }} className="absolute inset-0 w-full h-full">
        <HeroVideo />
      </motion.div>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />
      <motion.div style={{ opacity }} className="relative h-full w-full">
        <HeroContent animated />
      </motion.div>
    </section>
  );
}

function HeroContent({ animated = false }: { animated?: boolean }) {
  const W: any = animated ? motion.div : 'div';
  const props = animated
    ? { initial: { opacity: 0, y: 32 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } }
    : {};

  return (
    <div className="relative flex flex-col items-center justify-center text-center px-6 py-24 lg:py-32" style={{ minHeight: 'inherit' }}>
      {/* Decorative background text */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display uppercase leading-none text-white/[0.03] overflow-hidden"
        style={{ fontSize: 'clamp(120px, 20vw, 300px)' }}
      >
        FASHION
      </span>

      <W {...props} className="relative z-10 flex flex-col items-center">
        {/* Eyebrow */}
        <span className="block text-[10px] font-mono tracking-[0.36em] uppercase text-white/50 mb-8 lg:mb-10">
          Ecarte Jeans · 2026 · Yeni Sezon
        </span>

        {/* Main headline */}
        <h1
          className="font-display uppercase text-white leading-[0.92] text-center"
          style={{ fontSize: 'clamp(52px, 9.5vw, 148px)', letterSpacing: '-0.025em' }}
          data-testid="text-hero-title"
        >
          <span className="block">Tarzını</span>
          <span className="block text-[hsl(var(--polen-orange))]">Keşfet</span>
        </h1>

        {/* Sub copy */}
        <p className="mt-6 lg:mt-8 max-w-[480px] text-[13px] lg:text-[15px] leading-relaxed text-white/60 font-light">
          Erkek ve çocuk için premium denim koleksiyonu. Toptan ve bireysel sipariş imkânı.
        </p>

        {/* Category pills */}
        <div className="mt-8 lg:mt-10 flex flex-wrap items-center justify-center gap-2">
          {heroCategories.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="px-4 py-2 text-[11px] tracking-[0.18em] uppercase font-medium text-white/70 border border-white/20 hover:border-white/60 hover:text-white transition-all duration-200"
              data-testid={`link-hero-pill-${cat.label.toLowerCase()}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 lg:mt-12 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/magaza"
            data-testid="link-hero-cta"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[hsl(var(--polen-orange))] text-white text-[12px] tracking-[0.22em] uppercase font-semibold hover:bg-[hsl(var(--polen-orange-deep))] transition-colors"
          >
            Koleksiyonu Keşfet
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/hakkimizda"
            data-testid="link-hero-about"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/55 hover:text-white transition-colors"
          >
            Hakkımızda <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 lg:mt-20 flex flex-col items-center gap-2 text-white/30" aria-hidden>
          <span className="text-[9px] font-mono tracking-[0.28em] uppercase">Keşfet</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="block w-px h-8 bg-white/20 rounded-full"
          />
        </div>
      </W>
    </div>
  );
}

// ─────────────────────────────────────────────
// SCENE 02 — CATEGORIES (bold 2x2 grid)
// ─────────────────────────────────────────────

function CategoryScene({ categories, products }: { categories: CategoryData[]; products: Product[] }) {
  const fashionCats = categories
    .filter(c => (c.displayOrder ?? 0) >= 100)
    .slice(0, 4);

  if (fashionCats.length === 0) return null;

  // Find first product image per category (used as tile background if no category image)
  const catImgMap = useMemo(() => {
    const map: Record<string, string> = {};
    fashionCats.forEach(cat => {
      if (cat.image) { map[cat.id] = cat.image; return; }
      const prod = products.find(p =>
        Array.isArray((p as any).categoryIds)
          ? (p as any).categoryIds.includes(cat.id)
          : (p as any).categoryId === cat.id
      );
      if (prod?.images?.[0]) map[cat.id] = prod.images[0];
    });
    return map;
  }, [fashionCats, products]);

  return (
    <section
      className="bg-white py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-categories"
      aria-label="Kategoriler"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8 lg:mb-12 gap-4">
          <div>
            <span className="block text-[10px] font-mono tracking-[0.30em] uppercase text-black/35 mb-3">— Koleksiyonlar</span>
            <h2
              className="font-display uppercase text-black leading-[0.94]"
              style={{ fontSize: 'clamp(24px, 3.5vw, 48px)', letterSpacing: '-0.02em' }}
            >
              Kategori Keşfi
            </h2>
          </div>
          <Link
            href="/magaza"
            className="shrink-0 inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] uppercase text-black/50 hover:text-black transition-colors"
            data-testid="link-categories-all"
          >
            Tümü <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Grid: 2 cols on mobile, 4 on lg */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {fashionCats.map((cat, i) => {
            const bg = catImgMap[cat.id];
            return (
              <Link
                key={cat.id}
                href={`/kategori/${cat.slug}`}
                data-testid={`link-category-tile-${cat.slug}`}
                className="group relative overflow-hidden aspect-[3/4] block"
              >
                {/* Background */}
                {bg ? (
                  <img
                    src={bg}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: [
                        'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)',
                        'linear-gradient(135deg,#0f0c29 0%,#302b63 100%)',
                        'linear-gradient(135deg,#141e30 0%,#243b55 100%)',
                        'linear-gradient(135deg,#200122 0%,#6f0000 100%)',
                      ][i % 4]
                    }}
                  />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
                  <div className="text-[9px] font-mono tracking-[0.24em] uppercase text-white/50 mb-1.5">
                    Koleksiyon
                  </div>
                  <div
                    className="font-display uppercase text-white leading-none"
                    style={{ fontSize: 'clamp(16px, 2.2vw, 26px)' }}
                  >
                    {cat.name}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] tracking-[0.20em] uppercase text-white/60 group-hover:text-white transition-colors">
                    Keşfet <ArrowUpRight className="w-3 h-3 translate-y-[-1px] group-hover:translate-x-0.5 group-hover:-translate-y-[2px] transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SCENE 03 — FEATURED PRODUCTS (clean grid)
// ─────────────────────────────────────────────

function ProductScene({ products }: { products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  const items = useMemo(() => {
    if (!products?.length) return [];
    const featured = products.filter(p => p.isFeatured && p.images?.length);
    const rest = products.filter(p => !p.isFeatured && p.images?.length);
    return [...featured, ...rest].slice(0, 8);
  }, [products]);

  if (items.length === 0) return null;

  return (
    <section
      ref={ref}
      className="bg-[hsl(var(--polen-cream))] py-16 lg:py-24 px-5 lg:px-10"
      data-testid="scene-products"
      aria-label="Öne çıkan ürünler"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-8 lg:mb-12 gap-4">
          <div>
            <span className="block text-[10px] font-mono tracking-[0.30em] uppercase text-black/35 mb-3">— Öne Çıkanlar</span>
            <h2
              className="font-display uppercase text-black leading-[0.94]"
              style={{ fontSize: 'clamp(24px, 3.5vw, 48px)', letterSpacing: '-0.02em' }}
            >
              Yeni Gelenler
            </h2>
          </div>
          <Link
            href="/magaza"
            data-testid="link-products-all"
            className="shrink-0 inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] uppercase text-black/50 hover:text-black transition-colors"
          >
            Tümünü Gör <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-5"
          initial={false}
          animate={inView ? 'visible' : 'hidden'}
          variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
        >
          {items.map((p) => (
            <motion.div
              key={p.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 lg:mt-14 flex justify-center">
          <Link
            href="/magaza"
            data-testid="link-products-cta"
            className="inline-flex items-center gap-3 px-10 py-4 border border-black/20 text-[12px] tracking-[0.22em] uppercase font-medium text-black hover:bg-black hover:text-white hover:border-black transition-all duration-300"
          >
            Tüm Koleksiyonu Gör
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SCENE 04 — MARQUEE STRIP
// ─────────────────────────────────────────────

const LOOKBOOK = [
  {
    src: '/ecarte-denim.png',
    label: 'Modern Kesim',
    sub: 'Ergonomik kalıp, özgür hareket',
  },
  {
    src: '/ecarte-light-denim.png',
    label: 'Kaliteli Kumaş',
    sub: 'Premium denim, uzun ömürlü kullanım',
  },
  {
    src: '/ecarte-dark-denim.png',
    label: 'Şık Duruş',
    sub: 'Her kombinle öne çıkan tasarım',
  },
];

function LookbookScene() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="py-16 lg:py-24 bg-[hsl(var(--polen-stone))]"
      data-testid="scene-lookbook"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          {LOOKBOOK.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.7, delay: i * 0.13, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden cursor-pointer"
            >
              {/* Image */}
              <img
                src={item.src}
                alt={item.label}
                className="w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                loading="lazy"
              />

              {/* Bottom gradient overlay — always visible, label slides up on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
                <h3
                  className="font-display text-white uppercase leading-none tracking-wide"
                  style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 700 }}
                >
                  {item.label}
                </h3>
                <div className="shrink-0 w-10 h-10 border border-white/30 flex items-center justify-center text-white/60 group-hover:bg-white group-hover:text-black transition-all duration-300 rounded-sm ml-4">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarqueeScene_UNUSED() {
  const tags = [
    'YENİ SEZON', '✦', 'KADIN', '·', 'ERKEK', '·', 'ÇOCUK',
    '✦', 'HIZLI KARGO', '·', 'KOLAY İADE', '✦', 'GÜVENLİ ÖDEME',
    '·', 'ÜCRETSİZ KARGO 500₺+', '✦',
  ];
  const doubled = [...tags, ...tags, ...tags];

  return (
    <section
      className="bg-[hsl(var(--polen-stone))] text-white overflow-hidden border-y border-white/[0.06]"
      data-testid="scene-marquee"
      aria-label="Bilgi şeridi"
    >
      <div className="py-5 lg:py-7">
        <div className="flex items-center gap-7 lg:gap-10 animate-marquee whitespace-nowrap" style={{ animationDuration: '22s' }}>
          {doubled.map((t, i) => (
            <span
              key={i}
              className={`font-display uppercase ${
                t === '✦'
                  ? 'text-[hsl(var(--polen-orange))] text-sm'
                  : t === '·'
                  ? 'text-white/25 text-lg'
                  : 'text-[13px] lg:text-[15px] tracking-[0.06em] text-white/80'
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

// ─────────────────────────────────────────────
// SCENE 05 — EDITORIAL SPLIT CTA
// ─────────────────────────────────────────────

function CtaScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  return (
    <section
      ref={ref}
      className="bg-white py-20 lg:py-32 px-5 lg:px-10"
      data-testid="scene-cta"
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: text */}
          <div>
            <motion.span
              initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="block text-[10px] font-mono tracking-[0.32em] uppercase text-black/35 mb-6"
            >
              — Giyim & Aksesuar
            </motion.span>

            <h2
              className="font-display uppercase text-black leading-[0.92]"
              style={{ fontSize: 'clamp(36px, 5.5vw, 88px)', letterSpacing: '-0.025em' }}
            >
              {['Stilinizi', 'yansıtan'].map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  {word}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="block text-[hsl(var(--polen-orange))]"
              >
                koleksiyon.
              </motion.span>
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 max-w-[440px] text-[15px] leading-[1.7] text-black/55"
            >
              Trendyol ile senkronize güncel koleksiyonumuzdan seçim yapın.
              Yüzlerce marka ve binlerce model, kapınıza hızlı teslimat.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            >
              <Link
                href="/magaza"
                data-testid="link-cta-shop"
                className="inline-flex items-center gap-3 px-8 py-4 bg-[hsl(var(--polen-stone))] text-white text-[12px] tracking-[0.22em] uppercase font-semibold hover:bg-[hsl(var(--polen-orange))] transition-colors"
              >
                Alışverişe Başla
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://wa.me/905326956183"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-cta-whatsapp"
                className="inline-flex items-center gap-2 px-6 py-4 border border-black/20 text-[12px] tracking-[0.18em] uppercase font-medium text-black hover:bg-black hover:text-white hover:border-black transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                  <path d="M19.05 4.91A10 10 0 0 0 12 2a10 10 0 0 0-8.66 14.95L2 22l5.21-1.34A10 10 0 0 0 22 12a9.93 9.93 0 0 0-2.95-7.09Zm-7.05 15A8.07 8.07 0 0 1 7.9 18.7l-.28-.17-3.09.79.83-3-.18-.3a8 8 0 1 1 6.82 3.86Zm4.41-5.96c-.24-.12-1.42-.7-1.64-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.6 6.6 0 0 1-1.95-1.2 7.32 7.32 0 0 1-1.35-1.68c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.65 1.65 0 0 0 .24-.4.44.44 0 0 0 0-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.89.89 0 0 0-.64.3 2.7 2.7 0 0 0-.84 2c0 1.18.86 2.32.98 2.48s1.69 2.59 4.1 3.63a13.8 13.8 0 0 0 1.37.51 3.31 3.31 0 0 0 1.51.1 2.48 2.48 0 0 0 1.62-1.14 2 2 0 0 0 .14-1.14c-.06-.12-.22-.18-.46-.3Z" />
                </svg>
                WhatsApp
              </a>
            </motion.div>
          </div>

          {/* Right: stats */}
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {[
              { n: '10K+', label: 'Ürün Çeşidi', desc: 'Güncel koleksiyon' },
              { n: '500+', label: 'Marka', desc: 'Türkiye ve dünyadan' },
              { n: '25', label: 'Yıl', desc: 'Sektör deneyimi' },
              { n: '48h', label: 'Teslimat', desc: 'Türkiye geneli' },
            ].map(({ n, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 lg:p-8 border border-black/8 hover:border-[hsl(var(--polen-orange))]/40 transition-colors"
                data-testid={`stat-${label.toLowerCase()}`}
              >
                <div
                  className="font-display text-black leading-none mb-1"
                  style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', letterSpacing: '-0.02em' }}
                >
                  {n}
                </div>
                <div className="text-[12px] font-semibold tracking-[0.12em] uppercase text-black mb-1">{label}</div>
                <div className="text-[11px] text-black/40">{desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

export default function Home() {
  const { data: products = [] } = useProducts({});
  const { data: categories = [] } = useQuery<CategoryData[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  return (
    <>
      <SEO
        title="Giyim & Moda Koleksiyonu"
        description="Marka — Türkiye'nin güncel giyim koleksiyonu. Kadın, erkek ve çocuk giyiminde yüzlerce marka ve binlerce model."
        url="/"
      />
      <Header />
      <MotionConfig reducedMotion="user">
        <main>
          <HeroScene />
          <LookbookScene />
          <CategoryScene categories={categories} products={products} />
          <ProductScene products={products} />
          <CtaScene />
        </main>
      </MotionConfig>
      <Footer />
    </>
  );
}
