import { Link } from 'wouter';
import { Instagram, MapPin, Phone, Mail } from 'lucide-react';
import polenLogo from '@assets/Polen-Sticker-1.pdf_1777239312980.png';

const legalLinks = [
  { href: '/teslimat-kosullari', label: 'Teslimat Koşulları', testId: 'link-footer-delivery' },
  { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi', testId: 'link-footer-distance-sales' },
  { href: '/iptal-ve-iade', label: 'İptal ve İade', testId: 'link-footer-returns' },
  { href: '/kvkk', label: 'KVKK Aydınlatma Metni', testId: 'link-footer-kvkk' },
];

export function Footer() {
  return (
    <footer
      className="relative bg-[#1a1612] text-white overflow-hidden"
      data-testid="footer"
    >
      {/* subtle warm gradient accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 0%, rgba(217,127,42,0.5), transparent 55%), radial-gradient(circle at 90% 100%, rgba(217,127,42,0.35), transparent 50%)',
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 pt-14 lg:pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          {/* ── Sol: Brand ── */}
          <div className="md:col-span-12 lg:col-span-5">
            <Link href="/" className="inline-block mb-5" data-testid="link-footer-logo">
              <img
                src={polenLogo}
                alt="Polen Stone — Doğal Taş & Mermer"
                className="h-[88px] w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-white/55 text-[14px] leading-[1.7] max-w-md mb-6">
              Doğal mermerden el işçiliğiyle üretilen banyo setleri, mermer lavabolar, servis tabakları ve dekoratif objeler.
              Her parça, atölyemizde tek tek şekillendirilir; taşın damarına ve karakterine saygılı tasarımlarla evlerinize zamansız bir zarafet taşır.
            </p>

            <a
              href="https://www.instagram.com/polenstonecom/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-white/75 hover:text-polen-orange transition-colors text-sm font-medium group"
              data-testid="link-instagram-footer"
            >
              <span className="w-9 h-9 rounded-full border border-white/15 group-hover:border-polen-orange flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" strokeWidth={1.75} />
              </span>
              @polenstonecom
            </a>
          </div>

          {/* ── Orta: İletişim ── */}
          <div className="md:col-span-7 lg:col-span-4">
            <h4 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-5">
              İletişim
            </h4>
            <ul className="space-y-4 text-[14px] text-white/70">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-polen-orange shrink-0 mt-0.5" strokeWidth={1.75} />
                <span data-testid="text-footer-address" className="leading-[1.65]">
                  Yunus Emre, Barbaros Blv. 42 d,<br />
                  34791 Sancaktepe / İstanbul
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-polen-orange shrink-0" strokeWidth={1.75} />
                <a
                  href="tel:+905326956183"
                  className="hover:text-polen-orange transition-colors"
                  data-testid="link-footer-phone"
                >
                  0532 695 61 83
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-polen-orange shrink-0" strokeWidth={1.75} />
                <a
                  href="mailto:info@polenstone.com"
                  className="hover:text-polen-orange transition-colors"
                  data-testid="link-footer-email"
                >
                  info@polenstone.com
                </a>
              </li>
            </ul>
          </div>

          {/* ── Sağ: Yasal ── */}
          <div className="md:col-span-5 lg:col-span-3">
            <h4 className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-5">
              Yasal
            </h4>
            <ul className="space-y-3 text-[14px] text-white/70">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 hover:text-polen-orange transition-colors group"
                    data-testid={link.testId}
                  >
                    <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-polen-orange transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Alt çizgi: copyright + geliştirici ── */}
        <div className="mt-12 lg:mt-16 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/40">
            © 2026 Polen Stone. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-white/35">
            <span>Geliştirici & Tasarım</span>
            <a
              href="https://toov.com.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 opacity-70 transition-opacity"
            >
              <img
                src="https://toov.com.tr/assets/toov_logo-DODYNPrj.png"
                alt="TOOV"
                className="h-4"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
