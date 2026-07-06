import { useState } from 'react';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Hata',
        description: 'Lütfen e-posta adresinizi girin',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'İşlem başarısız');
      }

      setSubmitted(true);
    } catch {
      toast({
        title: 'Bilgi',
        description: 'Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderilecektir.',
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0c1220' }}>
        <SEO title="Şifremi Unuttum" description="Şifre sıfırlama bağlantısı gönderildi." url="/sifremi-unuttum" noIndex />
        <Header />

        <main className="pt-20 min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md"
          >
            {/* Kart paneli */}
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--polen-orange)), hsl(var(--polen-orange-deep)))' }}
              >
                <CheckCircle2 className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-3" data-testid="text-email-sent">
                E-posta Gönderildi
              </h1>
              <p className="text-white/45 mb-7 leading-relaxed text-sm">
                Eğer <strong className="text-white">{email}</strong> adresi sistemimizde kayıtlıysa,
                şifre sıfırlama bağlantısı içeren bir e-posta gönderdik.
              </p>

              {/* Sonraki adımlar */}
              <div
                className="rounded-xl p-5 mb-7 text-left space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <h3 className="font-semibold text-white text-sm mb-1">Sonraki Adımlar</h3>
                {[
                  'E-posta kutunuzu kontrol edin',
                  'Spam / gereksiz klasörünü de kontrol etmeyi unutmayın',
                  'E-postadaki bağlantıya tıklayarak yeni şifrenizi oluşturun',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ background: 'hsl(var(--polen-orange))' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-white/45 text-sm">{step}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSubmitted(false)}
                className="text-sm text-white/30 hover:text-[hsl(var(--polen-orange))] transition-colors"
              >
                Farklı bir e-posta adresi dene
              </button>
            </div>

            {/* Giriş linki */}
            <div className="mt-6 text-center">
              <Link
                href="/giris"
                className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Giriş Sayfasına Dön
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c1220' }}>
      <SEO title="Şifremi Unuttum" description="Şifre sıfırlama bağlantısı talep edin." url="/sifremi-unuttum" noIndex />
      <Header />

      <main className="pt-20 min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Kart paneli */}
          <div
            className="rounded-2xl p-8"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* İkon + başlık */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="w-14 h-14 mx-auto mb-5 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <KeyRound className="w-7 h-7 text-[hsl(var(--polen-orange))]" strokeWidth={1.75} />
              </motion.div>
              <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-page-title">
                Şifremi Unuttum
              </h1>
              <p className="text-white/40 text-sm leading-relaxed">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold tracking-[0.10em] uppercase text-white/40">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25"
                    strokeWidth={1.75}
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    data-testid="input-email"
                    className="w-full h-12 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--polen-orange))')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                    autoComplete="email"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                style={{ background: 'hsl(var(--polen-orange))' }}
                data-testid="button-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    Sıfırlama Bağlantısı Gönder
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Güvenlik notu */}
            <div
              className="mt-5 rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[11px] text-white/30 text-center leading-relaxed">
                Güvenliğiniz için bağlantı yalnızca <strong className="text-white/50">15 dakika</strong> geçerlidir.
                Süresi dolarsa tekrar talep edebilirsiniz.
              </p>
            </div>
          </div>

          {/* Giriş linki */}
          <div className="mt-6 text-center">
            <Link
              href="/giris"
              className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Giriş Sayfasına Dön
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
