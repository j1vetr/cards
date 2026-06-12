import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, ChevronDown, ArrowUpRight, UserPlus } from 'lucide-react';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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

const drawerStagger: { container: Variants; item: Variants } = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: {
    initial: { x: -24, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit: { x: -12, opacity: 0, transition: { duration: 0.25 } },
  },
};

export function Header() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState<Record<string, boolean>>({});
  const [announceClosed, setAnnounceClosed] = useState(false);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 10));

  // Sync initial scroll position (needed after HMR / scroll-restore)
  useEffect(() => { setScrolled(scrollY.get() > 10); }, []);

  const isHomepage = location === '/';
  const isTransparent = isHomepage && !scrolled;
  const showAnnounce = !announceClosed && !(isHomepage && scrolled);

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

  const { data: menuTree = [] } = useQuery<MenuItemData[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const res = await fetch('/api/menu');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const visibleCategories = categoriesData
    .filter(c => (c.displayOrder ?? 0) < 100)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const menuRoots = [...menuTree]
    .filter(m => m.isActive && !m.parentId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const useMenuTree = menuRoots.length > 0;

  const hrefForMenu = (item: MenuItemData): string => {
    if (item.type === 'category' && item.category) return `/kategori/${item.category.slug}`;
    if (item.type === 'link' && item.url) return item.url;
    return '#';
  };

  const navLinkCls = (active: boolean) =>
    `inline-flex items-center gap-1 text-[11.5px] font-semibold tracking-[0.14em] uppercase transition-colors whitespace-nowrap ${
      active
        ? 'text-[hsl(var(--polen-orange))]'
        : isTransparent
          ? 'text-white/80 hover:text-white'
          : 'text-black hover:text-black'
    }`;

  return (
    <>
      {/* ── Announcement bar — marquee ── */}
      <AnimatePresence initial={false}>
        {showAnnounce && (
          <motion.div
            initial={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 1, 1] }}
            className={`relative overflow-hidden bg-[hsl(var(--polen-stone))] text-white h-9${isHomepage ? ' fixed top-0 left-0 right-0 z-50' : ''}`}
            data-testid="bar-announcement"
          >
            <style>{`
              @keyframes marquee-scroll {
                0%   { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .marquee-track {
                display: flex;
                width: max-content;
                animation: marquee-scroll 28s linear infinite;
              }
              .marquee-track:hover { animation-play-state: paused; }
            `}</style>
            <div className="flex items-center h-9 overflow-hidden">
              <div className="marquee-track text-[10.5px] tracking-[0.20em] uppercase font-medium whitespace-nowrap">
                {[0, 1].map(i => (
                  <span key={i} className="flex items-center">
                    <span className="px-6">Toptan Satış Mevcut</span>
                    <span className="text-white/30">✦</span>
                    <span className="px-6">Ücretsiz Kargo — 500₺ ve Üzeri</span>
                    <span className="text-white/30">✦</span>
                    <span className="px-6">30 Gün İade Garantisi</span>
                    <span className="text-white/30">✦</span>
                    <span className="px-6">Yeni Sezon Koleksiyonu</span>
                    <span className="text-white/30">✦</span>
                    <span className="px-6">Hızlı Teslimat</span>
                    <span className="text-white/30">✦</span>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setAnnounceClosed(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white transition-colors z-10"
              aria-label="Kapat"
              data-testid="button-close-announcement"
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main header ── */}
      <header
        className={`left-0 right-0 z-40 transition-all duration-300
          ${isHomepage ? `fixed ${showAnnounce ? 'top-9' : 'top-0'}` : 'sticky top-0'}
          ${isTransparent ? 'bg-transparent border-b border-white/10' : `bg-white border-b border-black/[0.08] ${scrolled ? 'shadow-[0_4px_24px_-6px_rgba(0,0,0,0.10)]' : ''}`}
        `}
        data-testid="header"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">

          {/* ── Mobile layout ── */}
          <div className="lg:hidden flex items-center justify-between h-[64px]">
            <button
              data-testid="button-mobile-menu"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col gap-[5px] p-2 -ml-2"
              aria-label="Menü"
            >
              <span className={`block h-[1.5px] w-[22px] rounded-full ${isTransparent ? 'bg-white' : 'bg-black'}`} />
              <span className={`block h-[1.5px] w-[15px] rounded-full ${isTransparent ? 'bg-white' : 'bg-black'}`} />
              <span className={`block h-[1.5px] w-[22px] rounded-full ${isTransparent ? 'bg-white' : 'bg-black'}`} />
            </button>

            <Link href="/" data-testid="link-logo-mobile" className="absolute left-1/2 -translate-x-1/2">
              {isTransparent ? (
                <img src="/ecarte-logo-white.png" alt="Ecarte Jeans" className="h-14 w-auto object-contain" style={{ mixBlendMode: 'screen' }} data-testid="img-logo-mobile" />
              ) : (
                <img src="/ecarte-logo-dark.png" alt="Ecarte Jeans" className="h-14 w-auto object-contain" style={{ mixBlendMode: 'multiply' }} data-testid="img-logo-mobile" />
              )}
            </Link>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setSearchOpen(true)}
                className={`p-2 transition-colors ${isTransparent ? 'text-white/70 hover:text-white' : 'text-black hover:text-black'}`}
                data-testid="button-search-mobile"
                aria-label="Ara"
              >
                <Search className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
              <Link href="/sepet" data-testid="link-cart-mobile">
                <button className={`p-2 transition-colors relative ${isTransparent ? 'text-white/70 hover:text-white' : 'text-black hover:text-black'}`} aria-label="Sepet">
                  <ShoppingBag className="w-[19px] h-[19px]" strokeWidth={1.8} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge-m"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-[hsl(var(--polen-orange))] text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
                      >
                        {totalItems > 9 ? '9+' : totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </Link>
            </div>
          </div>

          {/* ── Desktop layout ── */}
          <div className="hidden lg:flex items-center h-[88px] gap-8 xl:gap-12">

            {/* Logo */}
            <Link href="/" data-testid="link-logo" className="shrink-0">
              {isTransparent ? (
                <img src="/ecarte-logo-white.png" alt="Ecarte Jeans" className="h-[68px] w-auto object-contain" style={{ mixBlendMode: 'screen' }} data-testid="img-logo" />
              ) : (
                <img src="/ecarte-logo-dark.png" alt="Ecarte Jeans" className="h-[68px] w-auto object-contain" style={{ mixBlendMode: 'multiply' }} data-testid="img-logo" />
              )}
            </Link>

            {/* Nav — grows to fill space, items centered */}
            <nav className="flex-1 flex items-center justify-center gap-6 xl:gap-8">
              {useMenuTree ? (
                menuRoots.map((root) => {
                  const children = (root.children || []).filter(c => c.isActive);
                  if (root.type === 'submenu') {
                    return (
                      <DropdownMenu key={root.id}>
                        <DropdownMenuTrigger asChild>
                          <button className={navLinkCls(false)} data-testid={`button-nav-root-${root.id}`}>
                            {root.title}
                            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="center"
                          sideOffset={14}
                          className="bg-white border-black/8 shadow-xl rounded-none p-1.5 min-w-[200px]"
                        >
                          {children.length === 0 ? (
                            <DropdownMenuItem disabled className="text-[11px] text-black/35 py-2 px-3">
                              Alt kategori yok
                            </DropdownMenuItem>
                          ) : children.map(child => (
                            <DropdownMenuItem
                              key={child.id}
                              onClick={() => navigate(hrefForMenu(child))}
                              className="text-[11.5px] tracking-[0.14em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-[hsl(var(--polen-orange))] cursor-pointer py-2.5 px-3 rounded-none font-medium"
                              data-testid={`link-mega-${child.id}`}
                            >
                              {child.title}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  const href = hrefForMenu(root);
                  const isActive =
                    (root.type === 'category' && root.category && location === `/kategori/${root.category.slug}`) ||
                    (root.type === 'link' && root.url && location === root.url) || false;
                  return (
                    <Link key={root.id} href={href} className={navLinkCls(isActive)} data-testid={`link-nav-root-${root.id}`}>
                      {root.title}
                    </Link>
                  );
                })
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={navLinkCls(location.startsWith('/kategori/'))} data-testid="button-nav-kategoriler">
                      Kategoriler <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    sideOffset={14}
                    className="bg-white border-black/8 shadow-xl rounded-none p-1.5"
                    style={{ minWidth: visibleCategories.length > 6 ? 400 : 180 }}
                  >
                    {visibleCategories.length === 0 ? (
                      <DropdownMenuItem onClick={() => navigate('/magaza')} className="text-[11px] tracking-wider uppercase cursor-pointer py-2.5 px-3">
                        Tüm Ürünler
                      </DropdownMenuItem>
                    ) : (
                      <div className="grid gap-x-1" style={{ gridTemplateColumns: visibleCategories.length > 6 ? 'repeat(2, 1fr)' : '1fr' }}>
                        {visibleCategories.map((c) => (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => navigate(`/kategori/${c.slug}`)}
                            className="text-[11.5px] tracking-[0.12em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-[hsl(var(--polen-orange))] cursor-pointer py-2.5 px-3 rounded-none font-medium"
                            data-testid={`link-cat-${c.slug}`}
                          >
                            {c.name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Link href="/magaza" className={navLinkCls(location === '/magaza')} data-testid="link-nav-magaza">
                Mağaza
              </Link>
              <Link href="/hakkimizda" className={navLinkCls(location === '/hakkimizda')} data-testid="link-nav-about">
                Hakkımızda
              </Link>
            </nav>

            {/* Right icons */}
            <div className="shrink-0 flex items-center gap-0.5">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className={`p-2.5 transition-colors ${isTransparent ? 'text-white/70 hover:text-white' : 'text-black hover:text-black'}`}
                data-testid="button-search"
                aria-label="Ara"
              >
                <Search className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>

              {/* Account */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`p-2.5 transition-colors ${isTransparent ? 'text-white/70 hover:text-white' : 'text-black hover:text-black'}`}
                    data-testid="button-account"
                    aria-label="Hesabım"
                  >
                    <User className="w-[19px] h-[19px]" strokeWidth={1.8} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="bg-white border-black/8 shadow-xl rounded-none min-w-[210px] p-0">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-black/[0.06]">
                        <p className="text-[10px] tracking-[0.22em] uppercase text-black/35 font-medium">Hesabım</p>
                        <p className="text-[13px] font-semibold text-black mt-0.5 truncate">{user.firstName || user.email}</p>
                      </div>
                      <div className="py-1.5">
                        <DropdownMenuItem
                          onClick={() => navigate('/hesabim')}
                          className="text-[12px] tracking-[0.10em] uppercase font-medium text-black hover:bg-[hsl(var(--polen-cream))] cursor-pointer py-2.5 px-4 rounded-none"
                        >
                          <User className="w-3.5 h-3.5 mr-2.5 opacity-40" /> Hesabım
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-black/[0.06]" />
                        <DropdownMenuItem
                          onClick={() => { logout(); navigate('/'); }}
                          className="text-[12px] tracking-[0.10em] uppercase font-medium text-black/50 hover:bg-[hsl(var(--polen-cream))] hover:text-black cursor-pointer py-2.5 px-4 rounded-none"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-2.5 opacity-40" /> Çıkış Yap
                        </DropdownMenuItem>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 border-b border-black/[0.06]">
                        <p className="text-[10px] tracking-[0.22em] uppercase text-black/35 font-medium">Hesabım</p>
                        <p className="text-[12px] text-black/55 mt-0.5">Giriş yapın veya üye olun</p>
                      </div>
                      <div className="py-1.5">
                        <DropdownMenuItem
                          onClick={() => navigate('/giris')}
                          className="text-[12px] tracking-[0.10em] uppercase font-medium text-black hover:bg-[hsl(var(--polen-cream))] cursor-pointer py-2.5 px-4 rounded-none"
                          data-testid="link-header-giris"
                        >
                          <User className="w-3.5 h-3.5 mr-2.5 opacity-40" /> Giriş Yap
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/kayit')}
                          className="text-[12px] tracking-[0.10em] uppercase font-semibold text-[hsl(var(--polen-orange))] hover:bg-[hsl(var(--polen-cream))] cursor-pointer py-2.5 px-4 rounded-none"
                          data-testid="link-header-kayit"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-2.5 opacity-60" /> Üye Ol
                        </DropdownMenuItem>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Cart */}
              <Link href="/sepet" data-testid="link-cart">
                <button
                  className={`p-2.5 transition-colors relative ${isTransparent ? 'text-white/70 hover:text-white' : 'text-black hover:text-black'}`}
                  aria-label="Sepet"
                  data-testid="button-cart"
                >
                  <ShoppingBag className="w-[19px] h-[19px]" strokeWidth={1.8} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-[hsl(var(--polen-orange))] text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
                      >
                        {totalItems > 9 ? '9+' : totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              data-testid="overlay-mobile-menu"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[88%] max-w-[400px] bg-[hsl(var(--polen-stone))] text-white flex flex-col shadow-2xl"
              data-testid="drawer-mobile-menu"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-mobile-logo">
                  <img
                    src="/ecarte-logo-white.png"
                    alt="Ecarte Jeans"
                    className="h-14 w-auto object-contain"
                    style={{ mixBlendMode: 'screen' }}
                    data-testid="img-logo-mobile-drawer"
                  />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                  data-testid="button-close-menu"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Nav list */}
              <nav className="flex-1 overflow-y-auto py-2">
                <motion.ul
                  variants={drawerStagger.container}
                  initial="initial"
                  animate="animate"
                  exit="initial"
                  className="px-6 flex flex-col"
                >
                  <motion.li variants={drawerStagger.item} className="border-b border-white/[0.07]">
                    <Link href="/" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-home">
                      <span className="text-[14px] font-semibold tracking-[0.10em] uppercase text-white/80 group-hover:text-white transition-colors">Ana Sayfa</span>
                      <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-[hsl(var(--polen-orange))] transition-colors" />
                    </Link>
                  </motion.li>

                  {useMenuTree ? (
                    menuRoots.map((root) => {
                      const children = (root.children || []).filter(c => c.isActive);
                      const isSubmenu = root.type === 'submenu';
                      const isOpen = !!mobileSubOpen[root.id];

                      if (isSubmenu) {
                        return (
                          <motion.li key={root.id} variants={drawerStagger.item} className="border-b border-white/[0.07]">
                            <button
                              onClick={() => setMobileSubOpen(s => ({ ...s, [root.id]: !s[root.id] }))}
                              className="group w-full flex items-center justify-between py-4"
                              data-testid={`button-mobile-group-${root.id}`}
                              aria-expanded={isOpen}
                            >
                              <span className={`text-[14px] font-semibold tracking-[0.10em] uppercase transition-colors ${isOpen ? 'text-[hsl(var(--polen-orange))]' : 'text-white/80 group-hover:text-white'}`}>
                                {root.title}
                              </span>
                              <motion.span
                                animate={{ rotate: isOpen ? 45 : 0 }}
                                transition={{ duration: 0.25 }}
                                className={isOpen ? 'text-[hsl(var(--polen-orange))]' : 'text-white/20'}
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                  className="overflow-hidden pl-4 border-l border-[hsl(var(--polen-orange))]/25 ml-1 mb-3"
                                >
                                  {children.map(child => (
                                    <li key={child.id}>
                                      <Link
                                        href={hrefForMenu(child)}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center py-2.5 text-[12.5px] tracking-[0.12em] uppercase text-white/55 hover:text-white transition-colors font-medium"
                                        data-testid={`link-mobile-mega-${child.id}`}
                                      >
                                        {child.title}
                                      </Link>
                                    </li>
                                  ))}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </motion.li>
                        );
                      }

                      const href = hrefForMenu(root);
                      return (
                        <motion.li key={root.id} variants={drawerStagger.item} className="border-b border-white/[0.07]">
                          <Link href={href} onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid={`link-mobile-root-${root.id}`}>
                            <span className="text-[14px] font-semibold tracking-[0.10em] uppercase text-white/80 group-hover:text-white transition-colors">{root.title}</span>
                            <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-[hsl(var(--polen-orange))] transition-colors" />
                          </Link>
                        </motion.li>
                      );
                    })
                  ) : (
                    visibleCategories.map((c) => (
                      <motion.li key={c.id} variants={drawerStagger.item} className="border-b border-white/[0.07]">
                        <Link href={`/kategori/${c.slug}`} onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid={`link-mobile-cat-${c.slug}`}>
                          <span className="text-[14px] font-semibold tracking-[0.10em] uppercase text-white/80 group-hover:text-white transition-colors">{c.name}</span>
                          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-[hsl(var(--Polen-orange))] transition-colors" />
                        </Link>
                      </motion.li>
                    ))
                  )}

                  <motion.li variants={drawerStagger.item} className="border-b border-white/[0.07]">
                    <Link href="/magaza" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-magaza">
                      <span className="text-[14px] font-semibold tracking-[0.10em] uppercase text-white/80 group-hover:text-white transition-colors">Mağaza</span>
                      <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-[hsl(var(--Polen-orange))] transition-colors" />
                    </Link>
                  </motion.li>

                  {user && (
                    <motion.li variants={drawerStagger.item} className="border-b border-white/[0.07]">
                      <Link href="/hesabim" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-hesabim">
                        <span className="text-[14px] font-semibold tracking-[0.10em] uppercase text-white/80 group-hover:text-white transition-colors">Hesabım</span>
                        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-[hsl(var(--Polen-orange))] transition-colors" />
                      </Link>
                    </motion.li>
                  )}
                </motion.ul>
              </nav>

              {/* Auth / CTA */}
              <div className="shrink-0 px-6 py-5 border-t border-white/10">
                {user ? (
                  <button
                    onClick={() => { logout(); setMobileOpen(false); navigate('/'); }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-[11px] tracking-[0.18em] uppercase font-medium text-white/60 hover:text-white border border-white/20 hover:border-white/50 transition-colors"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/giris"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.16em] uppercase font-semibold text-white border border-white/25 hover:border-white/60 transition-colors"
                      data-testid="link-mobile-giris"
                    >
                      Giriş Yap
                    </Link>
                    <Link
                      href="/kayit"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3.5 text-[11px] tracking-[0.16em] uppercase font-semibold text-white bg-[hsl(var(--Polen-orange))] hover:bg-[hsl(var(--Polen-orange-deep))] transition-colors"
                      data-testid="link-mobile-kayit"
                    >
                      Üye Ol
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
