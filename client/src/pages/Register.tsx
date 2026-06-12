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
import { COUNTRIES } from '@/lib/countries';

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
    customerType: 'retail' as 'retail' | 'wholesale',
    companyName: '',
    taxNumber: '',
    taxOffice: '',
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
    if (formData.customerType === 'wholesale' && !formData.companyName.trim()) {
      toast({ title: 'Hata', description: 'Toptan hesap için firma adı zorunludur', variant: 'destructive' });
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
        customerType: formData.customerType,
        companyName: formData.customerType === 'wholesale' ? (formData.companyName || undefined) : undefined,
        taxNumber: formData.customerType === 'wholesale' ? (formData.taxNumber || undefined) : undefined,
        taxOffice: formData.customerType === 'wholesale' ? (formData.taxOffice || undefined) : undefined,
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
    'h-11 bg-stone-50 border-black/12 focus:border-polen-orange focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-black placeholder:text-black/25';
  const labelCls = 'text-[10px] font-medium tracking-[0.22em] uppercase text-black/55';

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Üye Ol" description="Ecarte Jeans üyelik kaydı." url="/kayit" noIndex />
      <Header />

      <main className="flex items-start justify-center min-h-[calc(100vh-72px)] px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
          className="w-full max-w-[480px]"
        >
          <h1
            className="font-display text-3xl sm:text-[34px] tracking-[0.005em] text-black leading-[1.02] mb-2"
            data-testid="text-page-title"
          >
            Hesap Oluşturun
          </h1>
          <p className="text-black/50 text-[13px] leading-relaxed mb-8">
            Bilgilerinizi bir kez girin, sonraki siparişlerde otomatik dolu gelsin.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Hesap türü */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Hesap Türü</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'retail', label: 'Bireysel' },
                  { value: 'wholesale', label: 'Toptan' },
                ] as const).map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, customerType: opt.value })}
                    data-testid={`button-customertype-${opt.value}`}
                    className={`h-11 border text-[11px] font-medium tracking-[0.18em] uppercase transition-colors ${
                      formData.customerType === opt.value
                        ? 'border-polen-orange bg-polen-orange text-white'
                        : 'border-black/12 bg-stone-50 text-black/55 hover:border-polen-orange/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toptan firma bilgileri */}
            {formData.customerType === 'wholesale' && (
              <div className="space-y-3.5 border-l-2 border-polen-orange/40 pl-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName" className={labelCls}>Firma Adı / Ünvan *</Label>
                  <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Firma adınız" data-testid="input-companyName" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="taxNumber" className={labelCls}>Vergi No</Label>
                    <Input id="taxNumber" name="taxNumber" value={formData.taxNumber} onChange={handleChange} placeholder="Vergi numarası" data-testid="input-taxNumber" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="taxOffice" className={labelCls}>Vergi Dairesi</Label>
                    <Input id="taxOffice" name="taxOffice" value={formData.taxOffice} onChange={handleChange} placeholder="Vergi dairesi" data-testid="input-taxOffice" className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {/* Ad Soyad */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className={labelCls}>Ad</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Adınız" data-testid="input-firstName" className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className={labelCls}>Soyad</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Soyadınız" data-testid="input-lastName" className={`${inputCls} pl-10`} />
                </div>
              </div>
            </div>

            {/* E-posta + Telefon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className={labelCls}>E-posta *</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="ornek@email.com" required autoComplete="email" data-testid="input-email" className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className={labelCls}>Telefon *</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="05XX XXX XX XX" required autoComplete="tel" data-testid="input-phone" className={`${inputCls} pl-10`} />
                </div>
              </div>
            </div>

            {/* Adres */}
            <div className="space-y-1.5">
              <Label htmlFor="address" className={labelCls}>Adres</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Sokak, Mahalle, Bina No, Daire No" data-testid="input-address" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city" className={labelCls}>İl</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="İstanbul" data-testid="input-city" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district" className={labelCls}>İlçe</Label>
                <Input id="district" name="district" value={formData.district} onChange={handleChange} placeholder="Kadıköy" data-testid="input-district" className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country" className={labelCls}>Ülke</Label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                data-testid="select-country"
                className="w-full h-11 bg-stone-50 border border-black/12 focus:border-polen-orange focus:outline-none rounded-none px-4 text-black text-sm"
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {/* Şifre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className={labelCls}>Şifre *</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="En az 6 karakter"
                    required
                    autoComplete="new-password"
                    data-testid="input-password"
                    className={`${inputCls} pl-10 pr-10`}
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
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className={labelCls}>Şifre Tekrar *</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" strokeWidth={1.75} />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Tekrar girin"
                    required
                    autoComplete="new-password"
                    data-testid="input-confirmPassword"
                    className={`${inputCls} pl-10 pr-10`}
                  />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-polen-orange" strokeWidth={2.25} />
                  )}
                </div>
              </div>
            </div>

            {/* Şifre güç göstergesi */}
            {formData.password.length > 0 && (
              <div className="flex items-center gap-3 -mt-1">
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
                    passwordStrength === 1 ? 'text-red-500'
                      : passwordStrength === 2 ? 'text-amber-500'
                      : passwordStrength === 3 ? 'text-polen-orange'
                      : ''
                  }`}
                >
                  {strengthTexts[passwordStrength]}
                </span>
              </div>
            )}

            <motion.div whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }} className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 bg-black text-white hover:bg-polen-orange font-semibold tracking-[0.18em] text-[11px] uppercase group rounded-none transition-colors duration-300 gap-3"
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

            <p className="text-[11px] text-black/40 text-center pt-1 leading-relaxed">
              Kayıt olarak{' '}
              <span className="underline underline-offset-2 hover:text-polen-orange transition-colors cursor-pointer">Kullanım Koşulları</span>
              {' '}ve{' '}
              <span className="underline underline-offset-2 hover:text-polen-orange transition-colors cursor-pointer">Gizlilik Politikası</span>
              'nı kabul etmiş olursunuz.
            </p>
          </form>

          <div className="mt-6 pt-5 border-t border-black/8 text-center">
            <span className="text-[12px] text-black/50">Zaten hesabınız var mı? </span>
            <Link
              href="/giris"
              data-testid="link-login"
              className="text-[12px] font-medium text-black hover:text-polen-orange transition-colors underline underline-offset-2"
            >
              Giriş Yap
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
