import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, UserPlus, ArrowUpRight, ChevronDown, ChevronRight, ChevronLeft, Layers, Zap, ShieldCheck, Lock, Gift } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { SearchOverlay } from '@/components/SearchOverlay';
import { useCardSets, type CardSetPublic } from '@/hooks/useTcg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const HEADER_BG = '#0c1220';
const ANNOUNCE_BG = '#09090f';

const drawerStagger: { container: Variants; item: Variants } = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: {
    initial: { x: -24, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit: { x: -12, opacity: 0, transition: { duration: 0.22 } },
  },
};

/* ── Mega menu panel ──────────────────────────────────────────────────── */
function MegaMenuPanel({
  sets,
  game,
  onMouseEnter,
  onMouseLeave,
}: {
  sets: CardSetPublic[];
  game: 'pokemon' | 'riftbound';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const accent = game === 'pokemon' ? '#f59e0b' : '#818cf8';
  const displaySets = game === 'pokemon' ? sets.slice(0, 18) : sets;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 right-0 z-50 shadow-2xl"
      style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="max-w-[1440px] mx-auto px-10 py-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
            <span className="text-sm font-bold text-white tracking-wide">
              {game === 'pokemon' ? 'Pokémon TCG Setleri' : 'Riftbound Setleri'}
            </span>
            <span className="text-xs text-white/30 ml-1">({sets.length} set)</span>
          </div>
          <Link
            href={`/oyun/${game}`}
            className="text-xs font-medium transition-colors flex items-center gap-1"
            style={{ color: accent }}
          >
            Tümünü Gör <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
          {displaySets.map(set => (
            <Link key={set.id} href={`/set/${set.slug}`} className="flex">
              <div
                className="group flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-150 w-full"
                style={{ background: 'rgba(255,255,255,0.03)', minHeight: 100 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              >
                <div className="h-10 w-full flex items-center justify-center">
                  {set.logo_url ? (
                    <img
                      src={set.logo_url}
                      alt={set.name}
                      className="max-h-10 max-w-[110px] object-contain"
                      onError={e => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = 'none';
                        const fallback = el.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {/* Fallback icon — shown when no logo or on img error */}
                  <div
                    className="items-center justify-center w-full h-full"
                    style={{ display: set.logo_url ? 'none' : 'flex' }}
                  >
                    {game === 'pokemon'
                      ? <img src="/icon-pokemon.svg" alt="" className="w-8 h-8 object-contain" style={{ opacity: 0.55 }} />
                      : <img src="/icon-riftbound.svg" alt="" className="w-8 h-8 object-contain" style={{ opacity: 0.55 }} />
                    }
                  </div>
                </div>
                <span className="text-[10px] text-white/55 text-center leading-tight line-clamp-2 group-hover:text-white/80 transition-colors w-full" style={{ minHeight: '2.4em' }}>
                  {set.name}
                </span>
                <span className="text-[9px] font-medium" style={{ color: accent, opacity: set.listed_cards > 0 ? 0.8 : 0, minHeight: '1em' }}>
                  {set.listed_cards > 0 ? `${set.listed_cards} stokta` : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {game === 'pokemon' && sets.length > 18 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
            <Link
              href="/oyun/pokemon"
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: accent }}
            >
              +{sets.length - 18} Set Daha VAR! &nbsp;Tümü Gör <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main Header ──────────────────────────────────────────────────────── */
export function Header() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [announceClosed, setAnnounceClosed] = useState(false);
  const [activeAnnounce, setActiveAnnounce] = useState(0);
  const [megaMenu, setMegaMenu] = useState<'pokemon' | 'riftbound' | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<'pokemon' | 'riftbound' | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { totalItems } = useCart();
  const { user, logout } = useAuth();

  const { data: pokemonSets = [] } = useCardSets('pokemon');
  const { data: riftboundSets = [] } = useCardSets('riftbound');

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const openMega = (game: 'pokemon' | 'riftbound') => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaMenu(game);
  };
  const delayClose = () => {
    closeTimer.current = setTimeout(() => setMegaMenu(null), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const navCls = (active: boolean) =>
    `inline-flex items-center gap-1 text-[13.5px] font-medium tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
      active ? 'text-white' : 'text-white/55 hover:text-white'
    }`;

  const isActive = (path: string) =>
    path === '/' ? location === '/' : location.startsWith(path);

  return (
    <>
      <div className="sticky top-0 z-50">
      {/* ── Announcement bar ── */}
      <AnimatePresence initial={false}>
        {!announceClosed && (
          <motion.div
            initial={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 1, 1] }}
            className="relative overflow-hidden text-white"
            style={{ height: 40, background: ANNOUNCE_BG, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            data-testid="bar-announcement"
          >
            {(() => {
              const ITEMS = [
                { icon: Zap,         text: '500₺+ Siparişlerde Kargo Bedava', highlight: true },
                { icon: ShieldCheck, text: 'Orijinal Kart Garantisi',          highlight: false },
                { icon: Lock,        text: 'Hızlı ve Güvenli Alışveriş',       highlight: false },
                { icon: Gift,        text: 'Yeni Setler Stokta!',              highlight: false },
              ];
              const prev = () => setActiveAnnounce(i => (i - 1 + ITEMS.length) % ITEMS.length);
              const next = () => setActiveAnnounce(i => (i + 1) % ITEMS.length);
              return (
                <div className="flex items-center h-full px-4 lg:px-2">
                  {/* Desktop: 4 items with dividers + arrows */}
                  <div className="hidden lg:flex items-center w-full">
                    <button
                      onClick={prev}
                      className="p-1 text-white/25 hover:text-white/60 transition-colors shrink-0"
                      aria-label="Önceki duyuru"
                      data-testid="button-announce-prev"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center justify-center gap-0 flex-1">
                      {ITEMS.map((item, i) => {
                        const isActive = i === activeAnnounce;
                        return (
                          <div key={i} className="flex items-center">
                            {i > 0 && <div className="w-px h-4 bg-white/10 mx-5" />}
                            <div className="flex items-center gap-1.5">
                              <item.icon
                                className="w-3 h-3 shrink-0 transition-colors"
                                style={{ color: isActive ? '#818cf8' : 'rgba(255,255,255,0.25)' }}
                              />
                              <span
                                className="text-[11px] font-medium tracking-wide whitespace-nowrap transition-colors"
                                style={{ color: isActive ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.38)' }}
                              >
                                {item.text}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={next}
                      className="p-1 text-white/25 hover:text-white/60 transition-colors shrink-0"
                      aria-label="Sonraki duyuru"
                      data-testid="button-announce-next"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Mobile: single cycling item */}
                  <div className="lg:hidden flex items-center justify-center gap-2 flex-1">
                    <Zap className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-medium text-white/55 tracking-wide">
                      500₺ ve üzeri siparişlerde{' '}
                      <span className="text-indigo-400 font-semibold">KARGO BEDAVA</span>
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />
                  </div>
                </div>
              );
            })()}
            <button
              onClick={() => setAnnounceClosed(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/25 hover:text-white/70 transition-colors z-10"
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
        className="relative z-40"
        style={{ background: HEADER_BG, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        data-testid="header"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">

          {/* ── Mobile layout ── */}
          <div className="lg:hidden flex items-center justify-between h-[60px]">
            <button
              data-testid="button-mobile-menu"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col gap-[5px] p-2 -ml-2"
              aria-label="Menü"
            >
              <span className="block h-[1.5px] w-[22px] rounded-full bg-white/70" />
              <span className="block h-[1.5px] w-[15px] rounded-full bg-white/70" />
              <span className="block h-[1.5px] w-[22px] rounded-full bg-white/70" />
            </button>

            <Link href="/" data-testid="link-logo-mobile" className="absolute left-1/2 -translate-x-1/2">
              <img
                src="/gocards-logo-white.png"
                alt="Go|Cards"
                className="h-11 w-auto object-contain"
                data-testid="img-logo-mobile"
              />
            </Link>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-white/60 hover:text-white transition-colors"
                data-testid="button-search-mobile"
                aria-label="Ara"
              >
                <Search className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
              <Link href="/sepet" data-testid="link-cart-mobile">
                <button className="p-2 transition-colors relative text-white/60 hover:text-white" aria-label="Sepet">
                  <ShoppingBag className="w-[19px] h-[19px]" strokeWidth={1.8} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge-m"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
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
          <div className="hidden lg:flex items-center h-[80px] relative">

            {/* Logo — left */}
            <Link href="/" data-testid="link-logo" className="shrink-0 z-10">
              <img
                src="/gocards-logo-white.png"
                alt="Go|Cards"
                className="h-14 w-auto object-contain"
                data-testid="img-logo"
              />
            </Link>

            {/* Nav — absolutely centered */}
            <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8 xl:gap-10">
              <Link href="/" className={navCls(isActive('/'))} data-testid="link-nav-home">
                Ana Sayfa
              </Link>

              {/* Pokémon with mega menu */}
              <div
                className="relative"
                onMouseEnter={() => openMega('pokemon')}
                onMouseLeave={delayClose}
              >
                <button
                  className={`${navCls(isActive('/oyun/pokemon'))} flex items-center gap-1`}
                  data-testid="button-nav-pokemon"
                >
                  Pokémon
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${megaMenu === 'pokemon' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Riftbound with mega menu */}
              <div
                className="relative"
                onMouseEnter={() => openMega('riftbound')}
                onMouseLeave={delayClose}
              >
                <button
                  className={`${navCls(isActive('/oyun/riftbound'))} flex items-center gap-1`}
                  data-testid="button-nav-riftbound"
                >
                  Riftbound
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${megaMenu === 'riftbound' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <Link href="/iletisim" className={navCls(isActive('/iletisim'))} data-testid="link-nav-iletisim">
                İletişim
              </Link>
            </nav>

            {/* Right icons — pushed to far right */}
            <div className="ml-auto shrink-0 flex items-center gap-1 z-10">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-white/55 hover:text-white transition-colors"
                data-testid="button-search"
                aria-label="Ara"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>

              <Link href="/sepet" data-testid="link-cart">
                <button className="p-2.5 transition-colors relative text-white/55 hover:text-white" aria-label="Sepet" data-testid="button-cart">
                  <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none"
                      >
                        {totalItems > 9 ? '9+' : totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </Link>

              {/* Account */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2.5 text-white/55 hover:text-white transition-colors"
                    data-testid="button-account"
                    aria-label="Hesabım"
                  >
                    <User className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="min-w-[210px] p-0"
                  style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                >
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-white/[0.08]">
                        <p className="text-[10px] tracking-[0.22em] uppercase text-white/30 font-medium">Hesabım</p>
                        <p className="text-[13px] font-semibold text-white mt-0.5 truncate">{user.firstName || user.email}</p>
                      </div>
                      <div className="py-1.5">
                        <DropdownMenuItem
                          onClick={() => navigate('/hesabim')}
                          className="text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] cursor-pointer py-2.5 px-4"
                        >
                          <User className="w-3.5 h-3.5 mr-2.5 opacity-40" /> Hesabım
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-white/[0.07]" />
                        <DropdownMenuItem
                          onClick={() => { logout(); navigate('/'); }}
                          className="text-[12px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.06] cursor-pointer py-2.5 px-4"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-2.5 opacity-40" /> Çıkış Yap
                        </DropdownMenuItem>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 border-b border-white/[0.08]">
                        <p className="text-[10px] tracking-[0.22em] uppercase text-white/30 font-medium">Hesap</p>
                        <p className="text-[12px] text-white/45 mt-0.5">Giriş yapın veya üye olun</p>
                      </div>
                      <div className="py-1.5">
                        <DropdownMenuItem
                          onClick={() => navigate('/giris')}
                          className="text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] cursor-pointer py-2.5 px-4"
                          data-testid="link-header-giris"
                        >
                          <User className="w-3.5 h-3.5 mr-2.5 opacity-40" /> Giriş Yap
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/kayit')}
                          className="text-[12px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-white/[0.06] cursor-pointer py-2.5 px-4"
                          data-testid="link-header-kayit"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-2.5 opacity-60" /> Üye Ol
                        </DropdownMenuItem>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Giriş Yap button (shown when not logged in) */}
              {!user && (
                <Link href="/giris" data-testid="link-giris-btn">
                  <button className="ml-2 px-4 py-2 text-[12.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
                    Giriş Yap
                  </button>
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* ── Mega menus (absolutely positioned below header) ── */}
        <AnimatePresence>
          {megaMenu === 'pokemon' && pokemonSets.length > 0 && (
            <MegaMenuPanel
              key="pokemon-mega"
              sets={pokemonSets}
              game="pokemon"
              onMouseEnter={cancelClose}
              onMouseLeave={delayClose}
            />
          )}
          {megaMenu === 'riftbound' && riftboundSets.length > 0 && (
            <MegaMenuPanel
              key="riftbound-mega"
              sets={riftboundSets}
              game="riftbound"
              onMouseEnter={cancelClose}
              onMouseLeave={delayClose}
            />
          )}
        </AnimatePresence>
      </header>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              data-testid="overlay-mobile-menu"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[88%] max-w-[380px] flex flex-col shadow-2xl overflow-hidden"
              style={{ background: '#0d1427' }}
              data-testid="drawer-mobile-menu"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-mobile-logo">
                  <img src="/gocards-logo-white.png" alt="Go|Cards" className="h-10 w-auto object-contain" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-white/40 hover:text-white transition-colors"
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
                  className="px-5 flex flex-col"
                >
                  {/* Ana Sayfa */}
                  <motion.li variants={drawerStagger.item} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Link href="/" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-home">
                      <span className="text-[14px] font-semibold text-white transition-colors">Ana Sayfa</span>
                      <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-indigo-400 transition-colors" />
                    </Link>
                  </motion.li>

                  {/* Pokémon accordion */}
                  <motion.li variants={drawerStagger.item} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => setMobileAccordion(a => a === 'pokemon' ? null : 'pokemon')}
                      className="group w-full flex items-center justify-between py-4"
                      data-testid="button-mobile-pokemon"
                    >
                      <span className="flex items-center gap-2.5">
                        <img
                          src="/icon-pokemon.svg"
                          alt=""
                          className="w-5 h-5 object-contain shrink-0"
                          style={{ opacity: mobileAccordion === 'pokemon' ? 1 : 0.85 }}
                        />
                        <span className={`text-[14px] font-semibold transition-colors ${mobileAccordion === 'pokemon' ? 'text-[#CC0000]' : 'text-white'}`}>
                          Pokémon
                        </span>
                      </span>
                      <motion.div
                        animate={{ rotate: mobileAccordion === 'pokemon' ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                        className="text-white/40"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileAccordion === 'pokemon' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pl-3 pb-3 border-l border-red-800/30 ml-1">
                            <Link
                              href="/oyun/pokemon"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center py-2 text-[12px] font-semibold text-[#CC0000] hover:text-red-400 transition-colors"
                            >
                              Tümünü Gör →
                            </Link>
                            {pokemonSets.slice(0, 12).map(set => (
                              <Link key={set.id} href={`/set/${set.slug}`} onClick={() => setMobileOpen(false)}
                                className="flex items-center py-2 text-[12px] text-white/65 hover:text-white transition-colors">
                                {set.name}
                              </Link>
                            ))}
                            {pokemonSets.length > 12 && (
                              <Link href="/oyun/pokemon" onClick={() => setMobileOpen(false)}
                                className="flex items-center py-2 text-[11px] text-white/35 hover:text-white/60 transition-colors">
                                +{pokemonSets.length - 12} set daha
                              </Link>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>

                  {/* Riftbound accordion */}
                  <motion.li variants={drawerStagger.item} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => setMobileAccordion(a => a === 'riftbound' ? null : 'riftbound')}
                      className="group w-full flex items-center justify-between py-4"
                      data-testid="button-mobile-riftbound"
                    >
                      <span className="flex items-center gap-2.5">
                        <img
                          src="/icon-riftbound.svg"
                          alt=""
                          className="w-5 h-5 object-contain shrink-0"
                          style={{ opacity: mobileAccordion === 'riftbound' ? 1 : 0.85 }}
                        />
                        <span className={`text-[14px] font-semibold transition-colors ${mobileAccordion === 'riftbound' ? 'text-[#EF7D00]' : 'text-white'}`}>
                          Riftbound
                        </span>
                      </span>
                      <motion.div
                        animate={{ rotate: mobileAccordion === 'riftbound' ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                        className="text-white/40"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileAccordion === 'riftbound' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pl-3 pb-3 border-l border-orange-700/30 ml-1">
                            <Link
                              href="/oyun/riftbound"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center py-2 text-[12px] font-semibold text-[#EF7D00] hover:text-orange-400 transition-colors"
                            >
                              Tümünü Gör →
                            </Link>
                            {riftboundSets.map(set => (
                              <Link key={set.id} href={`/set/${set.slug}`} onClick={() => setMobileOpen(false)}
                                className="flex items-center py-2 text-[12px] text-white/65 hover:text-white transition-colors">
                                {set.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>

                  {/* İletişim */}
                  <motion.li variants={drawerStagger.item} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Link href="/iletisim" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-iletisim">
                      <span className="text-[14px] font-semibold text-white transition-colors">İletişim</span>
                      <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-indigo-400 transition-colors" />
                    </Link>
                  </motion.li>

                  {user && (
                    <motion.li variants={drawerStagger.item} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <Link href="/hesabim" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-hesabim">
                        <span className="text-[14px] font-semibold text-white/75 group-hover:text-white transition-colors">Hesabım</span>
                        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
                      </Link>
                    </motion.li>
                  )}
                </motion.ul>
              </nav>

              {/* Auth CTA */}
              <div className="shrink-0 px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                {user ? (
                  <button
                    onClick={() => { logout(); setMobileOpen(false); navigate('/'); }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-medium text-white/50 hover:text-white border border-white/15 hover:border-white/40 rounded-xl transition-colors"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/giris" onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3 text-[12px] font-semibold text-white/75 border border-white/15 hover:border-white/40 rounded-xl transition-colors"
                      data-testid="link-mobile-giris">
                      Giriş Yap
                    </Link>
                    <Link href="/kayit" onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3 text-[12px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
                      data-testid="link-mobile-kayit">
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
