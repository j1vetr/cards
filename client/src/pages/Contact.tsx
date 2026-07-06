import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, Phone, Mail } from 'lucide-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const contactItems = [
  {
    icon: Phone,
    label: 'Telefon',
    value: '0538 921 67 80',
    href: 'tel:+905389216780',
    testId: 'link-contact-phone',
    whatsapp: false,
  },
  {
    icon: WhatsAppIcon,
    label: 'WhatsApp',
    value: '0538 921 67 80',
    href: 'https://wa.me/905389216780',
    testId: 'link-contact-whatsapp',
    whatsapp: true,
  },
  {
    icon: Mail,
    label: 'E-posta',
    value: 'gocardshub@gmail.com',
    href: 'mailto:gocardshub@gmail.com',
    testId: 'link-contact-email',
    whatsapp: false,
  },
];

export default function Contact() {
  return (
    <div className="min-h-screen" style={{ background: '#0c1220' }}>
      <SEO
        title="İletişim"
        description="Go Cards TCG ile iletişime geçin. Telefon, WhatsApp ve e-posta ile bize ulaşabilirsiniz."
      />
      <Header />

      <main className="pt-20 lg:pt-6 pb-16">
        {/* Hero */}
        <section className="px-4 sm:px-6 py-12 lg:py-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-3xl mx-auto">
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-white/35 mb-8"
            >
              <Link href="/" data-testid="link-home" className="hover:text-[hsl(var(--polen-orange))] transition-colors">
                Ana Sayfa
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/60">İletişim</span>
            </motion.nav>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">İletişim</h1>
              <p className="text-white/40 text-base leading-relaxed">
                Sorularınız için bize aşağıdaki kanallardan ulaşabilirsiniz.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact cards */}
        <section className="px-4 sm:px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="grid gap-4 sm:grid-cols-3">
              {contactItems.map((item, i) => (
                <motion.a
                  key={item.testId}
                  href={item.href}
                  target={item.whatsapp ? '_blank' : undefined}
                  rel={item.whatsapp ? 'noopener noreferrer' : undefined}
                  data-testid={item.testId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                  className="group flex flex-col items-center text-center gap-4 rounded-2xl p-8 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.18)')}
                  onMouseLeave={(e) => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)')}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      item.whatsapp ? 'bg-[#25D366]/10' : 'bg-[hsl(var(--polen-orange))]/10'
                    }`}
                  >
                    <item.icon
                      className={`w-7 h-7 ${item.whatsapp ? 'text-[#25D366]' : 'text-[hsl(var(--polen-orange))]'}`}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-1">{item.label}</p>
                    <p className="text-[15px] font-semibold text-white group-hover:text-[hsl(var(--polen-orange))] transition-colors">
                      {item.value}
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Company info */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-6 rounded-2xl p-8"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/25 mb-4">Şirket Bilgileri</h2>
              <div className="space-y-1.5">
                <p className="text-[15px] font-semibold text-white">GO CARDS TCG İÇ VE DIŞ TİC. LTD. ŞTİ.</p>
                <p className="text-[13px] text-white/40">Beykoz V.D. — Vergi No: 396 175 96 05</p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
