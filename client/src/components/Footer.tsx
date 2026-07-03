import { Link } from 'wouter';
import { Instagram } from 'lucide-react';

const LEGAL_LINKS = [
  { href: '/teslimat-kosullari',        label: 'Teslimat Koşulları',          testId: 'link-footer-delivery' },
  { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi',   testId: 'link-footer-distance-sales' },
  { href: '/iptal-ve-iade',             label: 'İptal ve İade',               testId: 'link-footer-returns' },
  { href: '/kvkk',                      label: 'KVKK Aydınlatma Metni',       testId: 'link-footer-kvkk' },
];

export function Footer() {
  return (
    <footer data-testid="footer" style={{ background: '#0c1220', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">

        {/* Two-column main row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">

          {/* Left: logo + tagline + instagram */}
          <div className="flex flex-col gap-4">
            <Link href="/" data-testid="link-footer-logo">
              <img
                src="/gocards-logo-white.png"
                alt="Go|Cards"
                className="h-9 w-auto object-contain"
                style={{ mixBlendMode: 'screen' }}
              />
            </Link>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-[260px]">
              Pokémon TCG &amp; Riftbound için Türkiye'nin kart marketplace'i.
            </p>
            <a
              href="https://www.instagram.com/ecarte/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-[13px]"
              data-testid="link-instagram-footer"
            >
              <Instagram className="w-3.5 h-3.5" strokeWidth={1.75} />
              @ecarte
            </a>
          </div>

          {/* Right: legal links */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-white/25 mb-1">Yasal</span>
            {LEGAL_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-white/40 hover:text-white/70 transition-colors"
                data-testid={link.testId}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.06]">
          <p className="text-[11px] text-white/25">
            © 2026 Go|Cards. Tüm Hakları Saklıdır.
          </p>
        </div>

      </div>
    </footer>
  );
}
