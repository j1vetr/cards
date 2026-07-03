import { Link, useLocation } from 'wouter';
import { Home, User, Layers, Zap } from 'lucide-react';

const NAV = [
  { href: '/',               label: 'Ana Sayfa', Icon: Home },
  { href: '/oyun/pokemon',   label: 'Pokémon',   Icon: Zap },
  { href: '/oyun/riftbound', label: 'Riftbound',  Icon: Layers },
  { href: '/hesabim',        label: 'Hesabım',   Icon: User },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{ background: '#0c1220', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      data-testid="nav-mobile-bottom"
    >
      <div className="flex items-stretch justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = location === href || (href !== '/' && location.startsWith(href));
          return (
            <Link key={href} href={href} className="flex-1" data-testid={`nav-tab-${label.toLowerCase().replace(/[^a-z]/g, '')}`}>
              <div className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? 'text-indigo-400' : 'text-zinc-600 active:text-zinc-400'
              }`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
                <span className="text-[9.5px] font-medium tracking-wide">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
