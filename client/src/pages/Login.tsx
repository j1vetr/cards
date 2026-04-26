import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowUpRight } from 'lucide-react';
import { AuthCrossLinkCTA } from '@/components/AuthCrossLinkCTA';
import polenLogo from '@assets/Polen-Sticker-1.pdf_1777239312980.png';
import heroImg from '@assets/hero-2.webp';

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
      toast({
        title: 'Hata',
        description: error.message || 'Giriş başarısız',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] min-h-[calc(100vh-5rem)]">
          {/* LEFT — Editorial brand panel */}
          <aside className="relative hidden lg:flex flex-col justify-between bg-polen-cream overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.18] pointer-events-none"
              style={{
                backgroundImage: `url(${heroImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-br from-polen-cream via-polen-cream/80 to-transparent" aria-hidden />

            <div className="relative z-10 flex items-center justify-between px-12 py-10">
              <Link href="/" className="flex items-center gap-3" data-testid="link-logo-login-aside">
                <img src={polenLogo} alt="Polen Stone" className="h-12 w-auto" />
              </Link>
              <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01 / Giriş</span>
            </div>

            <div className="relative z-10 px-12 pb-16 max-w-xl">
              <span className="block text-[10px] font-mono tracking-[0.32em] uppercase text-black/45 mb-6">— Üyelere Özel</span>
              <h2 className="font-display text-5xl xl:text-6xl tracking-[0.005em] text-black leading-[0.98] mb-7">
                HESABINIZA<br />
                <span className="text-polen-orange">GİRİŞ YAPIN</span>
              </h2>
              <p className="text-black/55 text-[15px] leading-relaxed max-w-md">
                Sipariş geçmişiniz, favori taşlarınız ve teslimat adresleriniz tek noktada;
                yeni siparişlerde her şey otomatik dolu.
              </p>

              <div className="mt-12 grid grid-cols-3 gap-6 max-w-md border-t border-black/10 pt-8">
                <div>
                  <p className="font-display text-2xl text-black tabular-nums">120+</p>
                  <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-black/45 mt-1">Mermer Türü</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-black tabular-nums">25</p>
                  <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-black/45 mt-1">Yıl Tecrübe</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-black tabular-nums">∞</p>
                  <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-black/45 mt-1">Olasılık</p>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT — Form column */}
          <section className="flex flex-col bg-white">
            {/* Mobile compact hero block (visible <lg) */}
            <div className="relative lg:hidden bg-polen-cream border-b border-black/8 overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.16] pointer-events-none"
                style={{ backgroundImage: `url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                aria-hidden
              />
              <div className="relative z-10 px-6 py-8">
                <span className="block text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums mb-3">01 / Giriş</span>
                <h2 className="font-display text-3xl tracking-[0.005em] text-black leading-[0.98]">
                  HESABINIZA <span className="text-polen-orange">GİRİŞ YAPIN</span>
                </h2>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-6 lg:px-16 py-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
              >
                <div className="mb-10">
                  <div className="hidden lg:flex items-center gap-3 mb-5">
                    <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">01 / Hesabınız</span>
                    <span className="h-px flex-1 bg-black/12" />
                  </div>
                  <h1
                    className="font-display text-4xl sm:text-5xl tracking-[0.005em] text-black leading-[0.98] mb-3"
                    data-testid="text-page-title"
                  >
                    HOŞ GELDİNİZ
                  </h1>
                  <p className="text-black/50 text-sm leading-relaxed">
                    Sipariş geçmişiniz, favori taşlarınız ve teslimat adresleriniz tek noktada.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-medium tracking-[0.22em] uppercase text-black/55">
                      E-posta Adresi
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@email.com"
                        required
                        data-testid="input-email"
                        className="h-12 pl-11 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[10px] font-medium tracking-[0.22em] uppercase text-black/55">
                        Şifre
                      </Label>
                      <Link
                        href="/sifremi-unuttum"
                        className="text-[11px] tracking-wide text-black/45 hover:text-polen-orange transition-colors"
                      >
                        Şifremi unuttum →
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        data-testid="input-password"
                        className="h-12 pl-11 pr-11 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-polen-orange transition-colors"
                        aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }} className="pt-3">
                    <Button
                      type="submit"
                      className="w-full h-12 bg-black text-white hover:bg-polen-orange font-semibold tracking-[0.18em] text-xs uppercase group rounded-none transition-colors duration-300 gap-3"
                      disabled={loading}
                      data-testid="button-login"
                    >
                      {loading ? (
                        'Giriş yapılıyor...'
                      ) : (
                        <>
                          <span>Giriş Yap</span>
                          <ArrowUpRight
                            className="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-45deg]"
                            strokeWidth={1.75}
                          />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            </div>

            {/* BOTTOM — Full-width cross-link CTA block (shared) */}
            <AuthCrossLinkCTA
              href="/kayit"
              index="02"
              eyebrow="Yeni Misiniz?"
              headline="YENİ HESAP OLUŞTURUN"
              ctaLabel="Hesap Oluştur"
              testId="link-register"
            />
          </section>
        </div>
      </main>
    </div>
  );
}
