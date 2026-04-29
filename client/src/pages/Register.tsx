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
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowUpRight, Check } from 'lucide-react';
import { AuthCrossLinkCTA } from '@/components/AuthCrossLinkCTA';
import { COUNTRIES } from '@/lib/countries';
import polenLogo from '@assets/Polen-Sticker-1.pdf_1777239312980.png';
import heroImg from '@assets/generated_images/polen-hero-1.png';

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    country: 'Türkiye',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Hata', description: 'Şifreler eşleşmiyor', variant: 'destructive' });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: 'Hata', description: 'Şifre en az 6 karakter olmalıdır', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        district: formData.district || undefined,
        country: formData.country || 'Türkiye',
      });
      toast({ title: 'Başarılı', description: 'Kayıt tamamlandı' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message || 'Kayıt başarısız', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength =
    formData.password.length === 0 ? 0 : formData.password.length < 6 ? 1 : formData.password.length < 8 ? 2 : 3;

  const strengthColors = ['', 'bg-red-400', 'bg-amber-400', 'bg-polen-orange'];
  const strengthTexts = ['', 'Zayıf', 'Orta', 'Güçlü'];

  const inputCls =
    'h-12 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25';
  const labelCls = 'text-[10px] font-medium tracking-[0.22em] uppercase text-black/55';

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Üye Ol" description="Polen Stone üyelik kaydı." url="/kayit" noIndex />
      <Header />

      <main className="pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] min-h-[calc(100vh-5rem)]">
          {/* LEFT — Form column */}
          <section className="flex flex-col bg-white order-2 lg:order-1">
            {/* Mobile compact hero block (visible <lg) */}
            <div className="relative lg:hidden bg-polen-cream border-b border-black/8 overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.16] pointer-events-none"
                style={{ backgroundImage: `url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                aria-hidden
              />
              <div className="relative z-10 px-6 py-8">
                <span className="block text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums mb-3">02 / Kayıt</span>
                <h2 className="font-display text-3xl tracking-[0.005em] text-black leading-[0.98]">
                  <span className="text-polen-orange">PROJEYE ÖZEL</span> FİYAT VE DESTEK.
                </h2>
              </div>
            </div>

            <div className="flex-1 flex items-start justify-center px-6 lg:px-14 py-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
              >
                <div className="mb-10">
                  <div className="hidden lg:flex items-center gap-3 mb-5">
                    <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">02 / Üye Olun</span>
                    <span className="h-px flex-1 bg-black/12" />
                  </div>
                  <h1
                    className="font-display text-4xl sm:text-5xl tracking-[0.005em] text-black leading-[0.98] mb-3"
                    data-testid="text-page-title"
                  >
                    HESAP OLUŞTUR
                  </h1>
                  <p className="text-black/50 text-sm leading-relaxed">
                    Bilgilerinizi tek seferlik girin; sonraki siparişlerde tüm detaylar
                    otomatik dolu gelsin.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className={labelCls}>Ad</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="Adınız"
                          data-testid="input-firstName"
                          className={`${inputCls} pl-11`}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className={labelCls}>Soyad</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Soyadınız"
                          data-testid="input-lastName"
                          className={`${inputCls} pl-11`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className={labelCls}>E-posta Adresi *</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="ornek@email.com"
                        required
                        data-testid="input-email"
                        className={`${inputCls} pl-11`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className={labelCls}>Telefon *</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="05XX XXX XX XX"
                        required
                        data-testid="input-phone"
                        className={`${inputCls} pl-11`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className={labelCls}>Adres</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Sokak, Mahalle, Bina No, Daire No"
                      data-testid="input-address"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className={labelCls}>İl</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="İstanbul"
                        data-testid="input-city"
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district" className={labelCls}>İlçe</Label>
                      <Input
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        placeholder="Kadıköy"
                        data-testid="input-district"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className={labelCls}>Ülke</Label>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      data-testid="select-country"
                      className="w-full h-12 bg-stone-50 border border-black/12 focus:border-polen-orange focus:outline-none rounded-none px-4 text-black text-sm"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className={labelCls}>Şifre *</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="En az 6 karakter"
                        required
                        data-testid="input-password"
                        className={`${inputCls} pl-11 pr-11`}
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
                    {formData.password.length > 0 && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 flex gap-1">
                          {[1, 2, 3].map((level) => (
                            <div
                              key={level}
                              className={`h-0.5 flex-1 transition-colors ${
                                passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-black/10'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-[10px] font-mono tracking-wider uppercase ${
                            passwordStrength === 1
                              ? 'text-red-500'
                              : passwordStrength === 2
                              ? 'text-amber-500'
                              : passwordStrength === 3
                              ? 'text-polen-orange'
                              : ''
                          }`}
                        >
                          {strengthTexts[passwordStrength]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className={labelCls}>Şifre Tekrar *</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Şifrenizi tekrar girin"
                        required
                        data-testid="input-confirmPassword"
                        className={`${inputCls} pl-11 pr-11`}
                      />
                      {formData.confirmPassword && formData.password === formData.confirmPassword && (
                        <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-polen-orange" strokeWidth={2.25} />
                      )}
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }} className="pt-3">
                    <Button
                      type="submit"
                      className="w-full h-12 bg-black text-white hover:bg-polen-orange font-semibold tracking-[0.18em] text-xs uppercase group rounded-none transition-colors duration-300 gap-3"
                      disabled={loading}
                      data-testid="button-register"
                    >
                      {loading ? (
                        'Kayıt yapılıyor...'
                      ) : (
                        <>
                          <span>Kayıt Ol</span>
                          <ArrowUpRight
                            className="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-45deg]"
                            strokeWidth={1.75}
                          />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <p className="text-[11px] text-black/40 text-center pt-2">
                    Kayıt olarak{' '}
                    <span className="underline underline-offset-2 hover:text-polen-orange transition-colors cursor-pointer">
                      Kullanım Koşulları
                    </span>{' '}
                    ve{' '}
                    <span className="underline underline-offset-2 hover:text-polen-orange transition-colors cursor-pointer">
                      Gizlilik Politikası
                    </span>
                    'nı kabul etmiş olursunuz.
                  </p>
                </form>
              </motion.div>
            </div>

            {/* BOTTOM — Full-width cross-link CTA block (shared) */}
            <AuthCrossLinkCTA
              href="/giris"
              index="01"
              eyebrow="Zaten Üye Misiniz?"
              headline="HESABINIZA GİRİŞ YAPIN"
              ctaLabel="Giriş Yap"
              testId="link-login"
              containerClassName="px-6 lg:px-14 py-7"
            />
          </section>

          {/* RIGHT — Editorial brand panel */}
          <aside className="relative hidden lg:flex flex-col justify-between bg-polen-cream overflow-hidden order-1 lg:order-2">
            <div
              className="absolute inset-0 opacity-[0.18] pointer-events-none"
              style={{
                backgroundImage: `url(${heroImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-bl from-polen-cream via-polen-cream/80 to-transparent"
              aria-hidden
            />

            <div className="relative z-10 flex items-center justify-between px-12 py-10">
              <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">02 / Kayıt</span>
              <Link href="/" className="flex items-center gap-3" data-testid="link-logo-register-aside">
                <img src={polenLogo} alt="Polen Stone" className="h-12 w-auto" />
              </Link>
            </div>

            <div className="relative z-10 px-12 pb-16 max-w-xl">
              <span className="block text-[10px] font-mono tracking-[0.32em] uppercase text-black/45 mb-6">— Üyeliğin Ayrıcalığı</span>
              <h2 className="font-display text-5xl xl:text-6xl tracking-[0.005em] text-black leading-[0.98] mb-7">
                <span className="text-polen-orange">PROJEYE ÖZEL</span><br />
                FİYAT VE<br />
                DESTEK.
              </h2>
              <p className="text-black/55 text-[15px] leading-relaxed max-w-md">
                Polen Stone üyeleri projeye özel kesim ve fiyatlandırma alır, uzman
                danışmanlık eşliğinde yeni koleksiyonlara erken erişir.
              </p>

              <ul className="mt-10 space-y-4 max-w-md border-t border-black/10 pt-7">
                {[
                  ['01.', 'Projeye özel kesim & fiyat'],
                  ['02.', 'Uzman taş danışmanlığı'],
                  ['03.', 'Yeni koleksiyonlara erken erişim'],
                ].map(([n, t]) => (
                  <li key={n} className="flex items-baseline gap-4">
                    <span className="text-[10px] font-mono tracking-[0.32em] uppercase text-polen-orange tabular-nums">{n}</span>
                    <span className="text-black/75 text-sm tracking-wide">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
