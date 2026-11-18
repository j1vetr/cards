import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Search, X, User, LogOut, UserPlus, ArrowUpRight, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { SearchOverlay } from '@/components/SearchOverlay';
import { useCardSets, type CardSetPublic } from '@/hooks/useTcg';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { SetLogo } from '@/components/home/SetLogo';
import { AnnouncementBar } from '@/components/home/AnnouncementBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const HEADER_BG = '#0c1220';

interface BoxMini {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
}

function useBoxesMini(game: 'pokemon' | 'riftbound') {
  return useQuery<BoxMini[]>({
    queryKey: ['boxes-mini', game],
    queryFn: () => fetch(`/api/products/boxes?game=${game}`).then(r => r.json()),
    staleTime: 120_000,
  });
}

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
  boxes = [],
  game,
  onMouseEnter,
  onMouseLeave,
}: {
  sets: CardSetPublic[];
  boxes?: BoxMini[];
  game: 'pokemon' | 'riftbound';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const accent = game === 'pokemon' ? '#f59e0b' : '#818cf8';
  const displaySets = game === 'pokemon' ? sets.slice(0, 18) : sets;
  const displayBoxes = boxes.slice(0, 10);

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

        {/* ── Booster Kutu & Paketler ── */}
        {displayBoxes.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
                <span className="text-xs font-bold text-white/70 tracking-widest uppercase">
                  Booster Kutu &amp; Paketler
                </span>
              </div>
              <Link href={`/kartlar?game=${game}`} className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-75" style={{ color: accent }}>
                Tüm Kartlar <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {displayBoxes.map(box => (
                <Link key={box.id} href={`/urun/${box.slug}`} className="shrink-0">
                  <div
                    className="group flex flex-col gap-2 p-2.5 rounded-xl cursor-pointer transition-all duration-150 w-[108px]"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  >
                    <div className="h-16 w-full rounded-lg overflow-hidden bg-white/[0.03]">
                      {box.images?.[0] ? (
                        <img src={box.images[0]} alt={box.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-white/55 leading-tight line-clamp-2 group-hover:text-white/80 transition-colors" style={{ minHeight: '2.2em' }}>
                      {box.name}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: accent }}>
                      {parseFloat(box.basePrice).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {sets.length > 0 && <div className="border-t border-white/[0.06] mt-5 mb-5" />}
          </div>
        )}

        {/* ── Kart Setleri ── */}
        {sets.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
                <span className="flex items-center gap-2 text-sm font-bold text-white tracking-wide">
                  <img
                    src={game === 'pokemon' ? '/logo-pokemon-tcg.webp' : '/logo-riftbound.png'}
                    alt=""
                    className="h-6 max-w-16 object-contain"
                  />
                  {game === 'pokemon' ? 'Pokémon TCG Setleri' : 'Riftbound Setleri'}
                </span>
                <span className="text-xs text-white/30 ml-1">({sets.length} set)</span>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/kartlar?game=${game}`}
                  className="text-xs font-medium transition-colors flex items-center gap-1"
                  style={{ color: accent }}
                >
                  Tüm Kartlar <ArrowUpRight className="w-3 h-3" />
                </Link>
                <Link
                  href={game === 'riftbound' ? '/riftbound' : '/pokemon'}
                  className="text-xs font-medium transition-colors flex items-center gap-1 text-white/40 hover:text-white/70"
                >
                  Oyun Sayfası <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {displaySets.map(set => (
                <Link key={set.id} href={`/set/${set.slug}`} className="flex" data-testid={`link-mega-set-${set.slug}`}>
                  <div
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-150 w-full"
                    style={{ background: 'rgba(255,255,255,0.03)', minHeight: 100 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  >
                    <SetLogo
                      set={set}
                      game={game}
                      className="min-h-16 w-full flex-col justify-center gap-2"
                      imageClassName="max-h-7 max-w-[110px]"
                      nameClassName="w-full text-center text-[10px] leading-tight text-white/55 transition-colors group-hover:text-white/80"
                    />
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
          </>
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
  const [megaMenu, setMegaMenu] = useState<'pokemon' | 'riftbound' | 'accessories' | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<'pokemon' | 'riftbound' | 'accessories' | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { totalItems } = useCart();
  const { user, logout } = useAuth();

  const { data: pokemonSets = [] } = useCardSets('pokemon');
  const { data: riftboundSets = [] } = useCardSets('riftbound');
  const { data: pokemonBoxes = [] } = useBoxesMini('pokemon');
  const { data: riftboundBoxes = [] } = useBoxesMini('riftbound');

  const mobileDrawerRef = useFocusTrap<HTMLDivElement>(mobileOpen);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const openMega = (game: 'pokemon' | 'riftbound' | 'accessories') => {
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
    `relative inline-flex items-center gap-1 text-[13.5px] font-medium tracking-wide transition-colors whitespace-nowrap cursor-pointer ${
      active ? 'text-white' : 'text-white/55 hover:text-white'
    } ${active ? 'after:absolute after:-bottom-[19px] after:left-0 after:right-0 after:h-[2px] after:bg-[#e33442]' : ''}`;

  const isActive = (path: string) =>
    path === '/' ? location === '/' : location.startsWith(path);

  return (
    <>
      <div className="sticky top-0 z-50">
      <AnnouncementBar />

      {/* ── Main header ── */}
      <header
        className="relative z-40"
        style={{ background: HEADER_BG, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        data-testid="header"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">

          {/* ── Mobile layout ── */}
          <div className="lg:hidden flex items-center justify-between h-[60px]">
            <Link href="/" data-testid="link-logo-mobile" className="shrink-0">
              <img
                src="/gocards-logo-white.png"
                alt="GoCards"
                className="h-10 w-auto object-contain"
                data-testid="img-logo-mobile"
              />
            </Link>

            <div className="flex items-center gap-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-white/65 hover:text-white transition-colors"
                data-testid="button-search-mobile"
                aria-label="Ara"
              >
                <Search className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
              <Link
                href="/sepet"
                data-testid="link-cart-mobile"
                aria-label="Sepet"
                className="p-2 inline-flex transition-colors relative text-white/65 hover:text-white"
              >
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
              </Link>
              <Link href={user ? '/hesabim' : '/giris'} data-testid="link-account-mobile" className="p-2 inline-flex text-white/65 hover:text-white" aria-label="Hesabım">
                <User className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </Link>
              <button
                data-testid="button-mobile-menu"
                onClick={() => setMobileOpen(true)}
                className="flex flex-col justify-center gap-[5px] p-2 -mr-2"
                aria-label="Menü"
                aria-expanded={mobileOpen}
              >
                <span className="block h-[1.5px] w-[21px] rounded-full bg-white/75" />
                <span className="block h-[1.5px] w-[14px] rounded-full bg-white/75" />
                <span className="block h-[1.5px] w-[21px] rounded-full bg-white/75" />
              </button>
            </div>
          </div>

          {/* ── Desktop layout ── */}
          <div className="hidden lg:flex items-center h-[58px] relative">

            {/* Logo — left */}
            <Link href="/" data-testid="link-logo" className="shrink-0 z-10">
              <img
                src="/gocards-logo-white.png"
                alt="GoCards"
                className="h-9 w-auto object-contain"
                data-testid="img-logo"
              />
            </Link>

            {/* Nav — absolutely centered */}
            <nav aria-label="Ana menü" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 xl:gap-8">
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
                  className={`${navCls(isActive('/riftbound') || isActive('/oyun/riftbound'))} flex items-center gap-1`}
                  data-testid="button-nav-riftbound"
                  type="button"
                  onClick={() => openMega('riftbound')}
                  onFocus={() => openMega('riftbound')}
                  onKeyDown={event => { if (event.key === 'Escape') setMegaMenu(null); }}
                  aria-expanded={megaMenu === 'riftbound'}
                >
                  Riftbound
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${megaMenu === 'riftbound' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Aksesuarlar with simple dropdown */}
              <div
                className="relative"
                onMouseEnter={() => openMega('accessories')}
                onMouseLeave={delayClose}
              >
                <Link
                  href="/aksesuarlar"
                  className={`${navCls(isActive('/aksesuarlar'))} flex items-center gap-1`}
                  data-testid="link-nav-aksesuarlar"
                >
                  Aksesuarlar
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${megaMenu === 'accessories' ? 'rotate-180' : ''}`} />
                </Link>
              </div>

              <Link href="/blog" className={navCls(isActive('/blog'))} data-testid="link-nav-blog">
                Blog
              </Link>

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

              <Link
                href="/sepet"
                data-testid="link-cart"
                aria-label="Sepet"
                className="p-2.5 inline-flex transition-colors relative text-white/55 hover:text-white"
              >
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
                <Link href="/giris" data-testid="link-giris-btn" className="ml-2 inline-flex items-center rounded-md border border-white/35 px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:border-white/70 hover:bg-white/[0.06]">
                  {location === '/' && <User aria-hidden="true" className="h-[1.35vw] w-[1.35vw]" />}
                  Giriş Yap
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* ── Mega menus (absolutely positioned below header) ── */}
        <AnimatePresence>
          {megaMenu === 'pokemon' && (pokemonSets.length > 0 || pokemonBoxes.length > 0) && (
            <MegaMenuPanel
              key="pokemon-mega"
              sets={pokemonSets}
              boxes={pokemonBoxes}
              game="pokemon"
              onMouseEnter={cancelClose}
              onMouseLeave={delayClose}
            />
          )}
          {megaMenu === 'riftbound' && (riftboundSets.length > 0 || riftboundBoxes.length > 0) && (
            <MegaMenuPanel
              key="riftbound-mega"
              sets={riftboundSets}
              boxes={riftboundBoxes}
              game="riftbound"
              onMouseEnter={cancelClose}
              onMouseLeave={delayClose}
            />
          )}
          {megaMenu === 'accessories' && (
            <motion.div
              key="accessories-mega"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onMouseEnter={cancelClose}
              onMouseLeave={delayClose}
              className="absolute top-full left-0 right-0 z-50 shadow-2xl"
              style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="max-w-[1440px] mx-auto px-10 py-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-5 rounded-full" style={{ background: '#818cf8' }} />
                    <span className="text-sm font-bold text-white tracking-wide">Aksesuarlar</span>
                  </div>
                  <Link
                    href="/aksesuarlar"
                    className="text-xs font-medium transition-colors flex items-center gap-1"
                    style={{ color: '#818cf8' }}
                  >
                    Tümünü Gör <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex gap-4">
                  {[
                    { slug: 'binder', label: 'Binder', sublabel: 'Kart Albümü', color: '#4f46e5' },
                    { slug: 'sleeve', label: 'Sleeve', sublabel: 'Kart Koruyucu', color: '#0891b2' },
                    { slug: 'playmat', label: 'Playmat', sublabel: 'Oyun Matı', color: '#059669' },
                  ].map((item) => (
                    <Link
                      key={item.slug}
                      href={`/aksesuarlar?cat=${item.slug}`}
                      className="flex-1 max-w-[200px]"
                    >
                      <div
                        className="group flex flex-col gap-2 p-4 rounded-xl cursor-pointer transition-all duration-150"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}22` }}>
                          <div className="w-3.5 h-3.5 rounded-sm" style={{ background: item.color }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-white group-hover:text-white transition-colors">{item.label}</p>
                          <p className="text-[11px] text-white/40 mt-0.5">{item.sublabel}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
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
              ref={mobileDrawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobil menü"
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
                  <img src="/gocards-logo-white.png" alt="GoCards" className="h-10 w-auto object-contain" />
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
                          src="/logo-pokemon-tcg.webp"
                          alt=""
                          className="h-6 max-w-12 object-contain shrink-0"
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
                            <Link
                              href="/kartlar?game=pokemon"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center py-2 text-[12px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                              data-testid="link-mobile-pokemon-kartlar"
                            >
                              Tüm Kartlar →
                            </Link>
                            {pokemonBoxes.length > 0 && (
                              <>
                                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest pt-1 pb-1">Ürünler</p>
                                {pokemonBoxes.slice(0, 5).map(box => (
                                  <Link key={box.id} href={`/urun/${box.slug}`} onClick={() => setMobileOpen(false)}
                                    className="flex items-center py-1.5 text-[12px] text-amber-400/80 hover:text-amber-300 transition-colors">
                                    {box.name}
                                  </Link>
                                ))}
                                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest pt-2 pb-1">Setler</p>
                              </>
                            )}
                            {pokemonSets.slice(0, 12).map(set => (
                              <Link key={set.id} href={`/set/${set.slug}`} onClick={() => setMobileOpen(false)}
                                data-testid={`link-mobile-pokemon-set-${set.slug}`}
                                className="flex items-center py-2 text-[12px] text-white/65 hover:text-white transition-colors">
                                <SetLogo set={set} game="pokemon" imageClassName="h-5 w-7" />
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
                          src="/logo-riftbound.png"
                          alt=""
                          className="h-6 max-w-12 object-contain shrink-0"
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
                              href="/riftbound"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center py-2 text-[12px] font-semibold text-[#818cf8] hover:text-indigo-400 transition-colors"
                            >
                              Tümünü Gör →
                            </Link>
                            <Link
                              href="/kartlar?game=riftbound"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center py-2 text-[12px] font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                              data-testid="link-mobile-riftbound-kartlar"
                            >
                              Tüm Kartlar →
                            </Link>
                            {riftboundBoxes.length > 0 && (
                              <>
                                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest pt-1 pb-1">Ürünler</p>
                                {riftboundBoxes.slice(0, 5).map(box => (
                                  <Link key={box.id} href={`/urun/${box.slug}`} onClick={() => setMobileOpen(false)}
                                    className="flex items-center py-1.5 text-[12px] text-indigo-300/80 hover:text-indigo-200 transition-colors">
                                    {box.name}
                                  </Link>
                                ))}
                                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest pt-2 pb-1">Setler</p>
                              </>
                            )}
                            {riftboundSets.map(set => (
                              <Link key={set.id} href={`/set/${set.slug}`} onClick={() => setMobileOpen(false)}
                                data-testid={`link-mobile-riftbound-set-${set.slug}`}
                                className="flex items-center py-2 text-[12px] text-white/65 hover:text-white transition-colors">
                                <SetLogo set={set} game="riftbound" imageClassName="h-5 w-7" />
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>

                  {/* Aksesuarlar accordion */}
                  <motion.li variants={drawerStagger.item} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => setMobileAccordion(a => a === 'accessories' ? null : 'accessories')}
                      className="group w-full flex items-center justify-between py-4"
                      data-testid="button-mobile-aksesuarlar"
                    >
                      <span className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(129,140,248,0.2)' }}>
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#818cf8', opacity: mobileAccordion === 'accessories' ? 1 : 0.7 }} />
                        </div>
                        <span className={`text-[14px] font-semibold transition-colors ${mobileAccordion === 'accessories' ? 'text-indigo-400' : 'text-white'}`}>
                          Aksesuarlar
                        </span>
                      </span>
                      <motion.div
                        animate={{ rotate: mobileAccordion === 'accessories' ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                        className="text-white/40"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileAccordion === 'accessories' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pl-3 pb-3 border-l border-indigo-700/30 ml-1">
                            <Link
                              href="/aksesuarlar"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center py-2 text-[12px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              Tümünü Gör →
                            </Link>
                            {[
                              { slug: 'binder', label: 'Binder (Kart Albümü)' },
                              { slug: 'sleeve', label: 'Sleeve (Kart Koruyucu)' },
                              { slug: 'playmat', label: 'Playmat (Oyun Matı)' },
                            ].map((item) => (
                              <Link
                                key={item.slug}
                                href={`/aksesuarlar?cat=${item.slug}`}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center py-2 text-[12px] text-white/65 hover:text-white transition-colors"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>

                  {/* Blog */}
                  <motion.li variants={drawerStagger.item} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Link href="/blog" onClick={() => setMobileOpen(false)} className="group flex items-center justify-between py-4" data-testid="link-mobile-blog">
                      <span className="text-[14px] font-semibold text-white transition-colors">Blog &amp; Rehber</span>
                      <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-indigo-400 transition-colors" />
                    </Link>
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
