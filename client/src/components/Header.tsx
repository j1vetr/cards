import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, ChevronDown, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { SearchOverlay } from '@/components/SearchOverlay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import polenLogo from '@assets/Polen-Sticker-1.pdf_1777239312980.png';

interface MenuItemData {
  id: string;
  title: string;
  type: 'category' | 'link' | 'submenu';
  categoryId: string | null;
  url: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  category?: { id: string; name: string; slug: string } | null;
  children?: MenuItemData[];
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  image?: string | null;
}

const stagger: { container: Variants; item: Variants } = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: {
    initial: { y: 60, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit: { y: -40, opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
  },
};

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 48));

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const { data: categoriesData = [] } = useQuery<CategoryData[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  // Hide legacy fitness categories (display_order >= 100); show only stone categories
  const visibleCategories = categoriesData
    .filter(c => (c.displayOrder ?? 0) < 100)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  // Static nav links (always visible)
  const staticLinks = [
    { href: '/magaza', label: 'Mağaza', testId: 'link-nav-magaza' },
    { href: '/hakkimizda', label: 'Hakkımızda', testId: 'link-nav-hakkimizda' },
  ];

  const navLinkCls = (active: boolean) =>
    `relative inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] uppercase transition-colors nav-link-hover ${active ? 'text-black' : 'text-black/70 hover:text-black'}`;

  return (
    <>
      {/* ── Announcement bar ── */}
      <div className="hidden lg:flex bg-[hsl(var(--polen-stone))] h-9 items-center justify-center gap-0">
        <div className="flex items-center gap-8 px-10">
          <div className="flex items-center gap-2.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-polen-orange shrink-0">
              <path d="M12 2 4 7v10l8 5 8-5V7l-8-5z"/><path d="M4 7l8 5 8-5"/><path d="M12 12v10"/>
            </svg>
            <span className="text-[10px] tracking-[0.28em] uppercase text-white/75 font-medium">Türkiye Geneli Kargo</span>
          </div>
          <span className="w-px h-3 bg-white/15" />
          <div className="flex items-center gap-2.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-polen-orange shrink-0">
              <circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>
            </svg>
            <span className="text-[10px] tracking-[0.28em] uppercase text-white/75 font-medium">2.500 TL Üzeri Ücretsiz Kargo</span>
          </div>
        </div>
      </div>

      {/* ── Main header ── */}
      <motion.header
        initial={false}
        animate={{ height: scrolled ? 80 : 110 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
        className="fixed lg:static top-0 left-0 right-0 z-40 bg-white border-b border-black/8 flex items-center"
        style={{ willChange: 'height' }}
      >
        <div className="w-full max-w-[1400px] mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between gap-6">

            {/* Left: Logo + mobile hamburger */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                data-testid="button-mobile-menu"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden flex flex-col gap-[5px] p-1 -ml-1 group"
                aria-label="Menü"
              >
                <span className="block h-px w-5 bg-black transition-all group-hover:w-6" />
                <span className="block h-px w-4 bg-black transition-all group-hover:w-6" />
                <span className="block h-px w-6 bg-black" />
              </button>

              <Link href="/" data-testid="link-logo" className="shrink-0 block">
                <motion.img
                  src={polenLogo}
                  alt="Polen Stone — Doğal Taş & Mermer"
                  whileHover={{ opacity: 0.85 }}
                  transition={{ duration: 0.2 }}
                  animate={{ height: scrolled ? 60 : 88 }}
                  className="w-auto object-contain"
                  data-testid="img-logo"
                  style={{ willChange: 'height' }}
                />
              </Link>
            </div>

            {/* Center: Desktop nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {/* Categories mega-dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={navLinkCls(location.startsWith('/kategori/'))}
                    data-testid="button-nav-kategoriler"
                  >
                    Kategoriler
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={20}
                  className="bg-white border-black/8 shadow-xl rounded-none p-3"
                  style={{ minWidth: visibleCategories.length > 6 ? 520 : 240 }}
                >
                  {visibleCategories.length === 0 ? (
                    <DropdownMenuItem
                      onClick={() => navigate('/magaza')}
                      className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5"
                    >
                      Tüm Ürünler
                    </DropdownMenuItem>
                  ) : (
                    <div
                      className="grid gap-x-2 gap-y-0.5"
                      style={{ gridTemplateColumns: visibleCategories.length > 6 ? 'repeat(2, minmax(0, 1fr))' : '1fr' }}
                    >
                      {visibleCategories.map((c) => {
                        const href = `/kategori/${c.slug}`;
                        return (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => navigate(href)}
                            className="text-[11px] tracking-[0.16em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-polen-orange cursor-pointer py-2.5 px-3 rounded-none transition-colors"
                            data-testid={`link-cat-${c.slug}`}
                          >
                            {c.name}
                          </DropdownMenuItem>
                        );
                      })}
                      <div
                        className="border-t border-black/10 mt-2 pt-2"
                        style={{ gridColumn: visibleCategories.length > 6 ? '1 / -1' : 'auto' }}
                      >
                        <DropdownMenuItem
                          onClick={() => navigate('/magaza')}
                          className="text-[11px] tracking-[0.16em] uppercase text-polen-orange font-semibold hover:bg-[hsl(var(--polen-cream))] cursor-pointer py-2.5 px-3 rounded-none"
                          data-testid="link-cat-tum-urunler"
                        >
                          Tüm Ürünler →
                        </DropdownMenuItem>
                      </div>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {staticLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={navLinkCls(location === link.href)}
                  data-testid={link.testId}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: Icons */}
            <div className="flex items-center gap-0.5 shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-black/45 hover:text-black transition-colors"
                data-testid="button-search"
              >
                <Search className="w-4 h-4" />
              </motion.button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button whileTap={{ scale: 0.9 }} className="p-2.5 text-black/45 hover:text-black transition-colors" data-testid="button-account">
                      <User className="w-4 h-4" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-black/8 shadow-lg rounded-none min-w-[160px]">
                    <DropdownMenuItem disabled className="text-[10px] tracking-widest text-black/30 uppercase">{user.firstName || user.email}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/hesabim')} className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5">
                      <User className="w-3.5 h-3.5 mr-2" />Hesabım
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { logout(); navigate('/'); }} className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5">
                      <LogOut className="w-3.5 h-3.5 mr-2" />Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/giris">
                  <motion.button whileTap={{ scale: 0.9 }} className="p-2.5 text-black/45 hover:text-black transition-colors" data-testid="button-account">
                    <User className="w-4 h-4" />
                  </motion.button>
                </Link>
              )}

              <Link href="/sepet">
                <motion.button whileTap={{ scale: 0.9 }} className="p-2.5 text-black/45 hover:text-black transition-colors relative" data-testid="button-cart">
                  <ShoppingBag className="w-4 h-4" />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-black text-white text-[8px] font-bold flex items-center justify-center rounded-full"
                      >
                        {totalItems > 9 ? '9+' : totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile fullscreen menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden"
          >
            {/* Background watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <span className="font-display text-[180px] leading-none text-white/[0.025] tracking-tighter">
                POLEN
              </span>
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-6 border-b border-white/8">
              <Link href="/" onClick={() => setMobileOpen(false)} className="block">
                <img
                  src={polenLogo}
                  alt="Polen Stone"
                  className="h-16 w-auto object-contain"
                  data-testid="img-logo-mobile"
                />
              </Link>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileOpen(false)}
                className="p-2 text-white/40 hover:text-white transition-colors"
                data-testid="button-close-menu"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Nav links */}
            <nav className="relative z-10 flex-1 overflow-y-auto px-6 py-8">
              <motion.div
                variants={stagger.container}
                initial="initial"
                animate="animate"
                exit="initial"
                className="flex flex-col"
              >
                <motion.div variants={stagger.item}>
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="block py-5 border-b border-white/8 group"
                    data-testid="link-mobile-home"
                  >
                    <span className="font-display text-[40px] leading-none text-white/70 group-hover:text-white transition-colors tracking-wide">
                      ANA SAYFA
                    </span>
                  </Link>
                </motion.div>

                <motion.div variants={stagger.item}>
                  <Link
                    href="/magaza"
                    onClick={() => setMobileOpen(false)}
                    className="block py-5 border-b border-white/8 group"
                    data-testid="link-mobile-magaza"
                  >
                    <span className="font-display text-[40px] leading-none text-white/70 group-hover:text-white transition-colors tracking-wide">
                      MAĞAZA
                    </span>
                  </Link>
                </motion.div>

                {/* Categories accordion */}
                <motion.div variants={stagger.item}>
                  <button
                    onClick={() => setMobileCatOpen(v => !v)}
                    className="w-full flex items-center justify-between py-5 border-b border-white/8 group"
                    data-testid="button-mobile-kategoriler"
                  >
                    <span className="font-display text-[40px] leading-none text-white/70 group-hover:text-white transition-colors tracking-wide">
                      KATEGORİLER
                    </span>
                    <motion.span
                      animate={{ rotate: mobileCatOpen ? 45 : 0 }}
                      className="text-white/30 text-3xl font-light leading-none"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {mobileCatOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 bg-white/[0.02]"
                      >
                        {visibleCategories.length === 0 ? (
                          <Link
                            href="/magaza"
                            onClick={() => setMobileOpen(false)}
                            className="block py-3.5 text-sm text-polen-orange tracking-[0.15em] uppercase font-semibold transition-colors border-b border-white/5"
                            data-testid="link-mobile-cat-tum-urunler"
                          >
                            Tüm Ürünler →
                          </Link>
                        ) : (
                          visibleCategories.map(c => (
                            <Link
                              key={c.id}
                              href={`/kategori/${c.slug}`}
                              onClick={() => setMobileOpen(false)}
                              className="block py-3.5 text-sm text-white/40 hover:text-polen-orange tracking-[0.15em] uppercase transition-colors border-b border-white/5"
                              data-testid={`link-mobile-cat-${c.slug}`}
                            >
                              {c.name}
                            </Link>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={stagger.item}>
                  <Link
                    href="/hakkimizda"
                    onClick={() => setMobileOpen(false)}
                    className="block py-5 border-b border-white/8 group"
                    data-testid="link-mobile-hakkimizda"
                  >
                    <span className="font-display text-[40px] leading-none text-white/70 group-hover:text-white transition-colors tracking-wide">
                      HAKKIMIZDA
                    </span>
                  </Link>
                </motion.div>

                <motion.div variants={stagger.item}>
                  <Link
                    href="/iletisim"
                    onClick={() => setMobileOpen(false)}
                    className="block py-5 border-b border-white/8 group"
                    data-testid="link-mobile-iletisim"
                  >
                    <span className="font-display text-[40px] leading-none text-white/70 group-hover:text-white transition-colors tracking-wide">
                      İLETİŞİM
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            </nav>

            {/* Bottom: account + cart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative z-10 flex items-center justify-between px-6 py-6 border-t border-white/8"
            >
              <div className="flex items-center gap-5">
                {user ? (
                  <>
                    <Link href="/hesabim" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/40 hover:text-white transition-colors">
                      <User className="w-3.5 h-3.5" />
                      Hesabım
                    </Link>
                    <button onClick={() => { logout(); navigate('/'); setMobileOpen(false); }} className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/40 hover:text-white transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      Çıkış
                    </button>
                  </>
                ) : (
                  <Link href="/giris" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/40 hover:text-white transition-colors">
                    <User className="w-3.5 h-3.5" />
                    Giriş Yap
                  </Link>
                )}
              </div>

              <Link href="/sepet" onClick={() => setMobileOpen(false)}>
                <div className="relative flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/40 hover:text-white transition-colors">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Sepet
                  {totalItems > 0 && (
                    <span className="w-4 h-4 bg-white text-black text-[9px] font-bold flex items-center justify-center rounded-full">
                      {totalItems}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
