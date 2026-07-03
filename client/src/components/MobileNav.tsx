import { Link, useLocation } from 'wouter';
import { Home, User } from 'lucide-react';

const NAV = [
  { href: '/',               label: 'Ana Sayfa', type: 'icon' as const,  Icon: Home },
  { href: '/oyun/pokemon',   label: 'Pokémon',   type: 'img'  as const,  src: '/icon-pokemon.svg' },
  { href: '/oyun/riftbound', label: 'Riftbound',  type: 'img'  as const,  src: '/icon-riftbound.svg' },
  { href: '/hesabim',        label: 'Hesabım',   type: 'icon' as const,  Icon: User },
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
        {NAV.map((item) => {
          const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1" data-testid={`nav-tab-${item.label.toLowerCase().replace(/[^a-z]/g, '')}`}>
              <div className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? 'text-indigo-400' : 'text-zinc-600 active:text-zinc-400'
              }`}>
                {item.type === 'img' ? (
                  <img
                    src={item.src}
                    alt={item.label}
                    className="w-5 h-5 object-contain"
                    style={{
                      opacity: active ? 1 : 0.45,
                      filter: active ? 'none' : 'grayscale(0.3)',
                    }}
                  />
                ) : (
                  <item.Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
                )}
                <span className="text-[9.5px] font-medium tracking-wide">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
