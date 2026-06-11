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
    `inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.10em] uppercase transition-colors whitespace-nowrap ${
      active ? 'text-black' : 'text-black/55 hover:text-black'
    }`;

  return (
    <>
      {/* ── Announcement bar ── */}
      <AnimatePresence initial={false}>
        {!announceClosed && (
          <motion.div
            initial={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 1, 1] }}
            className="relative overflow-hidden bg-[hsl(var(--polen-stone))] text-white"
            data-testid="bar-announcement"
          >
            <div className="flex items-center justify-center gap-6 px-10 h-9 text-[11px] tracking-[0.18em] uppercase font-medium">
              <span className="hidden sm:inline">Toptan Satış Mevcut</span>
              <span className="text-white/40">·</span>
              <span>Ücretsiz Kargo · 500₺ ve üzeri</span>
              <span className="text-white/40 hidden sm:inline">·</span>
              <span className="hidden sm:inline">Kolay İade Garantisi</span>
            </div>
            <button
              onClick={() => setAnnounceClosed(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/50 hover:text-white transition-colors"
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
        className={`sticky top-0 left-0 right-0 z-40 bg-white border-b border-black/[0.07] transition-shadow duration-300 ${scrolled ? 'shadow-[0_2px_20px_-4px_rgba(0,0,0,0.12)]' : ''}`}
        data-testid="header"
      >
        <div className="h-[60px] max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center">

          {/* ── Mobile layout ── */}
          <div className="lg:hidden flex items-center justify-between w-full">
            <button
              data-testid="button-mobile-menu"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col gap-[5.5px] p-2 -ml-2"
              aria-label="Menü"
            >
              <span className="block h-[1.5px] w-5 bg-black rounded-full" />
              <span className="block h-[1.5px] w-3.5 bg-black rounded-full" />
              <span className="block h-[1.5px] w-5 bg-black rounded-full" />
            </button>

            <Link href="/" data-testid="link-logo-mobile" className="block absolute left-1/2 -translate-x-1/2">
              <img
                src="/ecarte-logo.webp"
                alt="Ecarte Jeans"
                className="h-11 w-11 object-contain rounded-sm"
                data-testid="img-logo-mobile"
              />
            </Link>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-black/60 hover:text-black transition-colors"
                data-testid="button-search-mobile"
                aria-label="Ara"
              >
                <Search className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
              <Link href="/sepet" data-testid="link-cart-mobile">
                <button
                  className="p-2 text-black/60 hover:text-black transition-colors relative"
                  aria-label="Sepet"
                >
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
          <div className="hidden lg:grid grid-cols-[220px_1fr_220px] items-center w-full gap-6">

            {/* Logo */}
            <Link href="/" data-testid="link-logo" className="block">
              <img
                src="/ecarte-logo.webp"
                alt="Ecarte Jeans"
                className="h-12 w-12 object-contain rounded-sm"
                data-testid="img-logo"
              />
            </Link>

            {/* Nav */}
            <nav className="flex items-center justify-center gap-5 xl:gap-7">
              {useMenuTree ? (
                menuRoots.map((root) => {
                  const children = (root.children || []).filter(c => c.isActive);
                  if (root.type === 'submenu') {
                    return (
                      <DropdownMenu key={root.id}>
                        <DropdownMenuTrigger asChild>
                          <button className={navLinkCls(false)} data-testid={`button-nav-root-${root.id}`}>
                            {root.title}
                            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="center"
                          sideOffset={16}
                          className="bg-white border-black/8 shadow-xl rounded-none p-2 min-w-[220px]"
                        >
                          {children.length === 0 ? (
                            <DropdownMenuItem disabled className="text-[11px] text-black/35 py-2 px-3">
                              Henüz alt kategori yok
                            </DropdownMenuItem>
                          ) : children.map(child => {
                            const href = hrefForMenu(child);
                            return (
                              <DropdownMenuItem
                                key={child.id}
                                onClick={() => navigate(href)}
                                className="text-[11px] tracking-[0.12em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-[hsl(var(--polen-orange))] cursor-pointer py-2.5 px-3 rounded-none"
                                data-testid={`link-mega-${child.id}`}
                              >
                                {child.title}
                              </DropdownMenuItem>
                            );
                          })}
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
                      Kategoriler <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    sideOffset={16}
                    className="bg-white border-black/8 shadow-xl rounded-none p-2"
                    style={{ minWidth: visibleCategories.length > 6 ? 440 : 200 }}
                  >
                    {visibleCategories.length === 0 ? (
                      <DropdownMenuItem onClick={() => navigate('/magaza')} className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5 px-3">
                        Tüm Ürünler
                      </DropdownMenuItem>
                    ) : (
                      <div
                        className="grid gap-x-1 gap-y-0"
                        style={{ gridTemplateColumns: visibleCategories.length > 6 ? 'repeat(2, 1fr)' : '1fr' }}
                      >
                        {visibleCategories.map((c) => (
                          <DropdownMenuItem
                            key={c.id}
                            onClick={() => navigate(`/kategori/${c.slug}`)}
                            className="text-[11px] tracking-[0.12em] uppercase text-black hover:bg-[hsl(var(--polen-cream))] hover:text-[hsl(var(--polen-orange))] cursor-pointer py-2.5 px-3 rounded-none"
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

            {/* Icons */}
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-black/55 hover:text-black transition-colors"
                data-testid="button-search"
                aria-label="Ara"
              >
                <Search className="w-[20px] h-[20px]" strokeWidth={1.8} />
              </button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2.5 text-black/55 hover:text-black transition-colors" data-testid="button-account" aria-label="Hesabım">
                      <User className="w-[20px] h-[20px]" strokeWidth={1.8} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-black/8 shadow-lg rounded-none min-w-[180px]">
                    <DropdownMenuItem disabled className="text-[10px] tracking-widest text-black/30 uppercase">{user.firstName || user.email}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/hesabim')} className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5">
                      <User className="w-4 h-4 mr-2" />Hesabım
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { logout(); navigate('/'); }} className="text-[11px] tracking-wider uppercase text-black hover:bg-black/5 cursor-pointer py-2.5">
                      <LogOut className="w-4 h-4 mr-2" />Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-black/10">
                  <Link href="/giris" data-testid="link-header-giris">
                    <span className="text-[11px] tracking-[0.12em] uppercase font-medium text-black/60 hover:text-black transition-colors cursor-pointer px-2 py-1">
                      Giriş
                    </span>
                  </Link>
                  <Link href="/kayit" data-testid="link-header-kayit">
                    <span className="inline-flex items-center px-4 py-2 text-[11px] tracking-[0.12em] uppercase font-semibold text-white bg-[hsl(var(--polen-stone))] hover:bg-[hsl(var(--polen-orange))] transition-colors cursor-pointer">
                      Kayıt Ol
                    </span>
                  </Link>
                </div>
              )}

              <Link href="/sepet" data-testid="link-cart">
                <button className="p-2.5 text-black/55 hover:text-black transition-colors relative ml-1" aria-label="Sepet" data-testid="button-cart">
                  <ShoppingBag className="w-[20px] h-[20px]" strokeWidth={1.8} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 bg-[hsl(var(--polen-orange))] text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
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
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-mobile-logo">
                  <img
                    src="/ecarte-logo.webp"
                    alt="Ecarte Jeans"
                    className="h-11 w-11 object-contain rounded-sm"
                    data-testid="img-logo-mobile-drawer"
                  />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                  data-testid="button-close-menu"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Nav list */}
              <nav className="flex-1 overflow-y-auto py-4">
                <motion.ul
                  variants={drawerStagger.container}
                  initial="initial"
                  animate="animate"
                  exit="initial"
                  className="px-6 flex flex-col"
                >
                  <motion.li variants={drawerStagger.item} className="border-b border-white/[0.08]">
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="group flex items-center justify-between py-4"
                      data-testid="link-mobile-home"
                    >
                      <span className="text-[15px] font-medium tracking-[0.06em] uppercase text-white/90 group-hover:text-white transition-colors">Ana Sayfa</span>
                      <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[hsl(var(--polen-orange))] transition-colors" />
                    </Link>
                  </motion.li>

                  {useMenuTree ? (
                    menuRoots.map((root, idx) => {
                      const children = (root.children || []).filter(c => c.isActive);
                      const isSubmenu = root.type === 'submenu';
                      const isOpen = !!mobileSubOpen[root.id];

                      if (isSubmenu) {
                        return (
                          <motion.li key={root.id} variants={drawerStagger.item} className="border-b border-white/[0.08]">
                            <button
                              onClick={() => setMobileSubOpen(s => ({ ...s, [root.id]: !s[root.id] }))}
                              className="group w-full flex items-center justify-between py-4"
                              data-testid={`button-mobile-group-${root.id}`}
                              aria-expanded={isOpen}
                            >
                              <span className={`text-[15px] font-medium tracking-[0.06em] uppercase transition-colors ${isOpen ? 'text-[hsl(var(--polen-orange))]' : 'text-white/90 group-hover:text-white'}`}>
                                {root.title}
                              </span>
                              <motion.span
                                animate={{ rotate: isOpen ? 45 : 0 }}
                                transition={{ duration: 0.25 }}
                                className={`transition-colors ${isOpen ? 'text-[hsl(var(--polen-orange))]' : 'text-white/30'}`}
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
                                  className="overflow-hidden pl-4 border-l border-[hsl(var(--polen-orange))]/30 ml-1 mb-3"
                                >
                                  {children.map(child => {
                                    const href = hrefForMenu(child);
                                    return (
                                      <li key={child.id}>
                                        <Link
                                          href={href}
                                          onClick={() => setMobileOpen(false)}
                                          className="flex items-center py-2 text-[13px] tracking-[0.10em] uppercase text-white/60 hover:text-white transition-colors"
                                          data-testid={`link-mobile-mega-${child.id}`}
                                        >
                                          {child.title}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </motion.li>
                        );
                      }

                      const href = hrefForMenu(root);
                      return (
                        <motion.li key={root.id} variants={drawerStagger.item} className="border-b border-white/[0.08]">
                          <Link
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className="group flex items-center justify-between py-4"
                            data-testid={`link-mobile-root-${root.id}`}
                          >
                            <span className="text-[15px] font-medium tracking-[0.06em] uppercase text-white/90 group-hover:text-white transition-colors">{root.title}</span>
                            <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[hsl(var(--polen-orange))] transition-colors" />
                          </Link>
                        </motion.li>
                      );
                    })
                  ) : (
                    visibleCategories.map((c) => (
                      <motion.li key={c.id} variants={drawerStagger.item} className="border-b border-white/[0.08]">
                        <Link
                          href={`/kategori/${c.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="group flex items-center justify-between py-4"
                          data-testid={`link-mobile-cat-${c.slug}`}
                        >
                          <span className="text-[15px] font-medium tracking-[0.06em] uppercase text-white/90 group-hover:text-white transition-colors">{c.name}</span>
                          <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[hsl(var(--polen-orange))] transition-colors" />
                        </Link>
                      </motion.li>
                    ))
                  )}

                  <motion.li variants={drawerStagger.item} className="border-b border-white/[0.08]">
                    <Link href="/magaza" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-magaza">
                      <span className="text-[15px] font-medium tracking-[0.06em] uppercase text-white/90 group-hover:text-white transition-colors">Mağaza</span>
                      <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[hsl(var(--polen-orange))] transition-colors" />
                    </Link>
                  </motion.li>

                  {user && (
                    <motion.li variants={drawerStagger.item} className="border-b border-white/[0.08]">
                      <Link href="/hesabim" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-hesabim">
                        <span className="text-[15px] font-medium tracking-[0.06em] uppercase text-white/90 group-hover:text-white transition-colors">Hesabım</span>
                        <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[hsl(var(--polen-orange))] transition-colors" />
                      </Link>
                    </motion.li>
                  )}
                </motion.ul>
              </nav>

              {/* Auth / CTA */}
              <div className="shrink-0 p-6 border-t border-white/10">
                {user ? (
                  <button
                    onClick={() => { logout(); setMobileOpen(false); navigate('/'); }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[11px] tracking-[0.16em] uppercase font-medium text-white/60 hover:text-white border border-white/20 hover:border-white/50 transition-colors"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/giris"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3 text-[11px] tracking-[0.14em] uppercase font-medium text-white border border-white/25 hover:border-white/60 transition-colors"
                      data-testid="link-mobile-giris"
                    >
                      Giriş Yap
                    </Link>
                    <Link
                      href="/kayit"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3 text-[11px] tracking-[0.14em] uppercase font-semibold text-white bg-[hsl(var(--polen-orange))] hover:bg-[hsl(var(--polen-orange-deep))] transition-colors"
                      data-testid="link-mobile-kayit"
                    >
                      Kayıt Ol
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
