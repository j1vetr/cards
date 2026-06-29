import { Link } from 'wouter';
import { Instagram, MapPin, Phone, Mail } from 'lucide-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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
              Pokemon TCG, Riftbound ve koleksiyon kartları için Türkiye'nin güvenilir marketplace'i. Booster, single kart ve aksesuar çeşitliliğiyle hizmetinizdeyiz.
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
                  Şeker Ahmet Paşa Sk. Maşallah Han No: 7<br />
                  Mercan Fatih / İstanbul
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-[hsl(var(--polen-orange))]/70 shrink-0" strokeWidth={1.75} />
                <a href="tel:+905312171130" className="hover:text-white transition-colors" data-testid="link-footer-phone">
                  0531 217 11 30
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <WhatsAppIcon className="w-3.5 h-3.5 text-[hsl(var(--polen-orange))]/70 shrink-0" />
                <a href="https://wa.me/905312171130" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" data-testid="link-footer-whatsapp">
                  WhatsApp
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

        {/* Payment logos */}
        <div className="mt-10 lg:mt-14 pt-6 border-t border-white/[0.07]">
          <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/25 mb-4">Güvenli Ödeme</p>
          <img
            src="/logo-band-white.png"
            alt="iyzico ile Öde — Mastercard, Visa, American Express, Troy"
            className="h-7 w-auto object-contain opacity-55"
            loading="lazy"
          />
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/30">
            © 2026 Ecarte Jeans. Tüm Hakları Saklıdır.
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
