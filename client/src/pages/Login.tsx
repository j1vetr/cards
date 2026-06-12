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
import { Eye, EyeOff, Mail, Lock, ArrowUpRight } from 'lucide-react';

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
      <SEO title="Giriş Yap" description="Ecarte Jeans üyelik girişi." url="/giris" noIndex />
      <Header />

      <main className="flex items-center justify-center min-h-[calc(100vh-72px)] px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
          className="w-full max-w-[400px]"
        >
          <h1
            className="font-display text-3xl sm:text-[34px] tracking-[0.005em] text-black leading-[1.02] mb-2"
            data-testid="text-page-title"
          >
            Giriş Yap
          </h1>
          <p className="text-black/50 text-[13px] leading-relaxed mb-8">
            Hesabınıza giriş yapın.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-medium tracking-[0.22em] uppercase text-black/55">
                E-posta
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  required
                  autoComplete="email"
                  data-testid="input-email"
                  className="h-11 pl-10 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25"
                />
              </div>
            </div>

            <div className="space-y-1.5">
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
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  data-testid="input-password"
                  className="h-11 pl-10 pr-10 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-polen-orange transition-colors"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }} className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 bg-black text-white hover:bg-polen-orange font-semibold tracking-[0.18em] text-[11px] uppercase group rounded-none transition-colors duration-300 gap-3"
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

          <div className="mt-6 pt-5 border-t border-black/8 text-center">
            <span className="text-[12px] text-black/50">Hesabınız yok mu? </span>
            <Link
              href="/kayit"
              data-testid="link-register"
              className="text-[12px] font-medium text-black hover:text-polen-orange transition-colors underline underline-offset-2"
            >
              Kayıt Ol
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
