import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Home, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';

const QUICK_LINKS = [
  { href: '/oyun/pokemon',    label: 'Pokémon TCG' },
  { href: '/oyun/riftbound',  label: 'Riftbound' },
  { href: '/kartlar',         label: 'Tüm Kartlar' },
];

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090f' }}>
      <SEO title="Sayfa Bulunamadı | Go|Cards TCG" description="Aradığınız sayfa mevcut değil." noIndex />
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg w-full"
        >
          {/* Big ghost number */}
          <div className="relative select-none mb-2">
            <p
              className="text-[180px] sm:text-[220px] font-black leading-none"
              style={{
                background: 'linear-gradient(180deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.04) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              404
            </p>

            {/* Icon centered over number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
                className="rounded-2xl flex items-center justify-center"
                style={{
                  width: 72, height: 72,
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <Search className="w-8 h-8" style={{ color: '#818cf8' }} />
              </motion.div>
            </div>
          </div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Kart Bulunamadı
            </h1>
            <p className="text-[15px] text-white/40 leading-relaxed mb-10">
              Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
          >
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                data-testid="button-go-home"
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm text-white transition-colors"
                style={{ background: 'rgba(99,102,241,0.85)', border: '1px solid rgba(99,102,241,0.5)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,1)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.85)')}
              >
                <Home className="w-4 h-4" />
                Ana Sayfaya Dön
              </motion.button>
            </Link>

            <Link href="/kartlar">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                data-testid="button-browse-cards"
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <Search className="w-4 h-4" />
                Kartlara Göz At
              </motion.button>
            </Link>
          </motion.div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/20 mb-3">
              Hızlı Erişim
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {QUICK_LINKS.map(link => (
                <Link key={link.href} href={link.href}>
                  <span
                    className="inline-block text-[12px] px-4 py-1.5 rounded-full transition-colors cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.45)',
                    }}
                    data-testid={`link-404-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
