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
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen" style={{ background: '#0c1220' }}>
      <SEO title="Giriş Yap" description="GoCards hesabınıza giriş yapın." url="/giris" noIndex />
      <Header />

      <main className="flex items-center justify-center min-h-[calc(100vh-72px)] px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Card */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} className="rounded-2xl p-8">
            <h1 className="text-2xl sm:text-[28px] font-bold text-white mb-1" data-testid="text-page-title">
              Giriş Yap
            </h1>
            <p className="text-white/40 text-[13px] mb-8">
              Hesabınız yok mu?{' '}
              <Link href="/kayit" className="text-[hsl(var(--polen-orange))] hover:opacity-80 transition-opacity font-medium">
                Ücretsiz kaydol
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">
                  E-posta
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" strokeWidth={1.75} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    autoComplete="email"
                    data-testid="input-email"
                    className="h-11 pl-10 bg-white/[0.06] border-white/[0.10] focus:border-[hsl(var(--polen-orange))] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">
                    Şifre
                  </Label>
                  <Link
                    href="/sifremi-unuttum"
                    className="text-[11px] text-white/30 hover:text-[hsl(var(--polen-orange))] transition-colors"
                  >
                    Şifremi unuttum
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" strokeWidth={1.75} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    data-testid="input-password"
                    className="h-11 pl-10 pr-10 bg-white/[0.06] border-white/[0.10] focus:border-[hsl(var(--polen-orange))] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-white placeholder:text-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 bg-[hsl(var(--polen-orange))] hover:bg-[hsl(var(--polen-orange-deep))] text-white font-semibold text-[13px] rounded-lg transition-colors duration-200 gap-2"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? 'Giriş yapılıyor…' : (
                    <>Giriş Yap <ArrowRight className="w-4 h-4" strokeWidth={2} /></>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-center text-[11px] text-white/20">
              Giriş yaparak{' '}
              <span className="underline underline-offset-2 cursor-pointer hover:text-white/40 transition-colors">Kullanım Koşulları</span>
              {' '}ve{' '}
              <span className="underline underline-offset-2 cursor-pointer hover:text-white/40 transition-colors">Gizlilik Politikası</span>
              'nı kabul etmiş olursunuz.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
