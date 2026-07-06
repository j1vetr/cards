import { Link } from 'wouter';
import { Instagram, Phone, Mail } from 'lucide-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const LEGAL_LINKS = [
  { label: 'Teslimat Koşulları', href: '/teslimat-kosullari' },
  { label: 'Mesafeli Satış Sözleşmesi', href: '/mesafeli-satis-sozlesmesi' },
  { label: 'İptal ve İade', href: '/iptal-ve-iade' },
  { label: 'KVKK Aydınlatma Metni', href: '/kvkk' },
];

export function Footer() {
  return (
    <footer data-testid="footer" style={{ background: '#0c1220', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">

        {/* Three-column main row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">

          {/* Left: logo + tagline + socials */}
          <div className="flex flex-col gap-4">
            <Link href="/" data-testid="link-footer-logo">
              <img
                src="/gocards-logo-white.png"
                alt="Go|Cards TCG"
                className="h-9 w-auto object-contain"
                style={{ mixBlendMode: 'screen' }}
              />
            </Link>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-[240px]">
              Pokémon TCG &amp; Riftbound için Türkiye'nin kart marketplace'i.
            </p>

            {/* Contact channels */}
            <div className="flex flex-col gap-2 mt-1">
              <a
                href="tel:+905389216780"
                className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-[13px]"
                data-testid="link-footer-phone"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                0538 921 67 80
              </a>
              <a
                href="https://wa.me/905389216780"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/40 hover:text-[#25D366] transition-colors text-[13px]"
                data-testid="link-footer-whatsapp"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                WhatsApp
              </a>
              <a
                href="mailto:gocardshub@gmail.com"
                className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-[13px]"
                data-testid="link-footer-email"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                gocardshub@gmail.com
              </a>
              <a
                href="https://instagram.com/gocardstcg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-[13px]"
                data-testid="link-footer-instagram"
              >
                <Instagram className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                @gocardstcg
              </a>
            </div>
          </div>

          {/* Middle: Legal links */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-white/25 mb-1">Yasal</span>
            {LEGAL_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-[13px] text-white/40 hover:text-white/70 transition-colors"
                data-testid={`link-footer-legal-${label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right: Company info */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-white/25 mb-1">Şirket</span>
            <p className="text-[12px] text-white/40 leading-relaxed max-w-[200px]">
              GO CARDS TCG İÇ VE DIŞ TİC. LTD. ŞTİ.
            </p>
            <p className="text-[11px] text-white/25">Beykoz V.D.</p>
            <p className="text-[11px] text-white/25">Vergi No: 396 175 96 05</p>
            <Link
              href="/iletisim"
              className="mt-1 text-[12px] text-white/40 hover:text-white/70 transition-colors"
              data-testid="link-footer-contact"
            >
              İletişim →
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.06]">
          <p className="text-[11px] text-white/25">
            © 2026 Go|Cards TCG. Tüm Hakları Saklıdır.
          </p>
        </div>

      </div>
    </footer>
  );
}
