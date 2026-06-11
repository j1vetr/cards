import { Link } from 'wouter';
import { Instagram, MapPin, Phone, Mail } from 'lucide-react';

const legalLinks = [
  { href: '/teslimat-kosullari', label: 'Teslimat Koşulları', testId: 'link-footer-delivery' },
  { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi', testId: 'link-footer-distance-sales' },
  { href: '/iptal-ve-iade', label: 'İptal ve İade', testId: 'link-footer-returns' },
  { href: '/kvkk', label: 'KVKK Aydınlatma Metni', testId: 'link-footer-kvkk' },
];

const shopLinks = [
  { href: '/magaza', label: 'Tüm Ürünler' },
  { href: '/magaza?yeni=1', label: 'Yeni Gelenler' },
  { href: '/magaza?kampanya=1', label: 'Kampanyalar' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
];

export function Footer() {
  return (
    <footer
      className="bg-[hsl(var(--polen-stone))] text-white"
      data-testid="footer"
    >
      {/* Top accent line */}
      <div className="h-px bg-[hsl(var(--polen-orange))]/60" />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 pt-14 lg:pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-16">

          {/* Brand column */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-block mb-6" data-testid="link-footer-logo">
              <img
                src="/ecarte-logo-white.png"
                alt="Ecarte Jeans"
                className="h-12 w-auto object-contain"
                style={{ mixBlendMode: 'screen' }}
              />
            </Link>
            <p className="text-white/50 text-[13.5px] leading-[1.75] max-w-sm mb-6">
              Kadın, erkek ve çocuk için premium denim koleksiyonu. Toptan ve bireysel sipariş imkânıyla Türkiye'nin kaliteli jean markası.
            </p>
            <a
              href="https://www.instagram.com/ecartejeans/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-white/60 hover:text-[hsl(var(--polen-orange))] transition-colors text-[13px] font-medium group"
              data-testid="link-instagram-footer"
            >
              <span className="w-8 h-8 rounded-full border border-white/15 group-hover:border-[hsl(var(--polen-orange))]/60 flex items-center justify-center transition-colors">
                <Instagram className="w-3.5 h-3.5" strokeWidth={1.75} />
              </span>
              @ecartejeans
            </a>
          </div>

          {/* Shop links */}
          <div className="lg:col-span-3">
            <h4 className="text-[10px] font-semibold tracking-[0.26em] uppercase text-white/35 mb-5">
              Mağaza
            </h4>
            <ul className="space-y-3">
              {shopLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-2">
            <h4 className="text-[10px] font-semibold tracking-[0.26em] uppercase text-white/35 mb-5">
              İletişim
            </h4>
            <ul className="space-y-3.5 text-[13.5px] text-white/60">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-[hsl(var(--polen-orange))]/70 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span data-testid="text-footer-address" className="leading-[1.6]">
                  Sancaktepe / İstanbul
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-[hsl(var(--polen-orange))]/70 shrink-0" strokeWidth={1.75} />
                <a href="tel:+905326956183" className="hover:text-white transition-colors" data-testid="link-footer-phone">
                  0532 695 61 83
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-[hsl(var(--polen-orange))]/70 shrink-0" strokeWidth={1.75} />
                <a href="mailto:info@ecartejeans.com" className="hover:text-white transition-colors" data-testid="link-footer-email">
                  info@ecartejeans.com
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h4 className="text-[10px] font-semibold tracking-[0.26em] uppercase text-white/35 mb-5">
              Yasal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] text-white/60 hover:text-white transition-colors"
                    data-testid={link.testId}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 lg:mt-16 pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/30">
            © 2026 Ecarte Jeans. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-white/25">
            <span>Tasarım & Geliştirme</span>
            <a
              href="https://toov.com.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="https://toov.com.tr/assets/toov_logo-DODYNPrj.png"
                alt="TOOV"
                className="h-3.5 brightness-0 invert opacity-40 hover:opacity-70 transition-opacity"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
