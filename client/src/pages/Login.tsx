import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Zap, Package } from 'lucide-react';

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: 'Başarılı', description: 'Giriş yapıldı' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message || 'Giriş başarısız', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Giriş Yap" description="GoCards hesabınıza giriş yapın." url="/giris" noIndex />
      <Header />

      <main className="flex min-h-[calc(100vh-72px)]">
        {/* Sol — marka paneli (yalnızca lg+) */}
        <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between bg-[hsl(var(--polen-stone))] px-12 py-14 relative overflow-hidden shrink-0">
          {/* Arka plan dekorasyon */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-[hsl(var(--polen-orange))]/[0.07] blur-3xl" />
            <div className="absolute -bottom-24 -left-16 w-[320px] h-[320px] rounded-full bg-[hsl(var(--polen-orange))]/[0.05] blur-2xl" />
          </div>

          <div className="relative">
            <Link href="/">
              <img
                src="/toov-logo-white.png"
                alt="GoCards"
                className="h-9 w-auto object-contain mb-14"
                style={{ mixBlendMode: 'screen' }}
              />
            </Link>

            <h2 className="text-3xl font-bold text-white leading-snug mb-4">
              Koleksiyonuna<br />
              <span className="text-[hsl(var(--polen-orange))]">hükmet.</span>
            </h2>
            <p className="text-white/50 text-[14px] leading-relaxed max-w-xs">
              Türkiye'nin TCG pazarında Pokémon ve Riftbound kartları güvenle alıp satın.
            </p>
          </div>

          <div className="relative space-y-4">
            {[
              { icon: ShieldCheck, text: 'Orijinal kart garantisi' },
              { icon: Zap, text: 'Hızlı kargo, 1–2 iş günü' },
              { icon: Package, text: 'Güvenli ödeme & 256-bit SSL' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/60 text-[13px]">
                <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[hsl(var(--polen-orange))]" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Sağ — form */}
        <div className="flex-1 flex items-center justify-center px-5 py-12 bg-white">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.33, 1, 0.68, 1] }}
            className="w-full max-w-[390px]"
          >
            {/* Logo — sadece mobilde görünür */}
            <Link href="/" className="lg:hidden block mb-8">
              <img src="/toov-logo-black.png" alt="GoCards" className="h-7 w-auto object-contain" style={{ mixBlendMode: 'multiply' }} />
            </Link>

            <h1 className="text-2xl sm:text-[28px] font-bold text-black mb-1" data-testid="text-page-title">
              Giriş Yap
            </h1>
            <p className="text-black/45 text-[13px] mb-8">
              Hesabınız yok mu?{' '}
              <Link href="/kayit" className="text-[hsl(var(--polen-orange))] font-medium hover:underline">
                Ücretsiz kaydol
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-semibold tracking-[0.2em] uppercase text-black/50">
                  E-posta
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/25" strokeWidth={1.75} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    autoComplete="email"
                    data-testid="input-email"
                    className="h-11 pl-10 bg-neutral-50 border-black/10 focus:border-[hsl(var(--polen-orange))] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-black placeholder:text-black/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[10px] font-semibold tracking-[0.2em] uppercase text-black/50">
                    Şifre
                  </Label>
                  <Link
                    href="/sifremi-unuttum"
                    className="text-[11px] text-black/40 hover:text-[hsl(var(--polen-orange))] transition-colors"
                  >
                    Şifremi unuttum
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/25" strokeWidth={1.75} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    data-testid="input-password"
                    className="h-11 pl-10 pr-10 bg-neutral-50 border-black/10 focus:border-[hsl(var(--polen-orange))] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-black placeholder:text-black/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/60 transition-colors"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 bg-[hsl(var(--polen-orange))] hover:bg-[hsl(var(--polen-orange-deep))] text-white font-semibold tracking-wide text-[13px] rounded-lg transition-colors duration-200 gap-2"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? (
                    'Giriş yapılıyor…'
                  ) : (
                    <>
                      Giriş Yap
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-[11px] text-black/35">
              Giriş yaparak{' '}
              <span className="underline underline-offset-2 cursor-pointer hover:text-black/60 transition-colors">Kullanım Koşulları</span>
              {'  '}ve{'  '}
              <span className="underline underline-offset-2 cursor-pointer hover:text-black/60 transition-colors">Gizlilik Politikası</span>
              'nı kabul etmiş olursunuz.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
