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
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Check } from 'lucide-react';
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
  const strengthColors = ['', 'bg-red-400', 'bg-amber-400', 'bg-[hsl(var(--polen-orange))]'];
  const strengthTexts = ['', 'Zayıf', 'Orta', 'Güçlü'];

  const inputCls =
    'h-11 bg-white/5 border-white/10 focus:border-[hsl(var(--polen-orange))] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-white placeholder:text-white/20';
  const labelCls = 'text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40';

  return (
    <div className="min-h-screen bg-[hsl(var(--polen-stone))]">
      <SEO title="Kayıt Ol" description="GoCards hesabı oluşturun ve TCG kartlarında alışverişe başlayın." url="/kayit" noIndex />
      <Header />

      <main className="flex items-start justify-center min-h-[calc(100vh-72px)] px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
          className="w-full max-w-[480px]"
        >
          <h1 className="text-2xl sm:text-[28px] font-bold text-white mb-1" data-testid="text-page-title">
            Hesap Oluştur
          </h1>
          <p className="text-white/40 text-[13px] mb-8">
            Zaten hesabınız var mı?{' '}
            <Link href="/giris" className="text-[hsl(var(--polen-orange))] hover:opacity-80 transition-opacity font-medium">
              Giriş yap
            </Link>
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
                    className={`h-11 border rounded-lg text-[11px] font-semibold tracking-[0.15em] uppercase transition-colors ${
                      formData.customerType === opt.value
                        ? 'border-[hsl(var(--polen-orange))] bg-[hsl(var(--polen-orange))] text-white'
                        : 'border-white/10 bg-white/5 text-white/40 hover:border-white/25 hover:text-white/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toptan firma bilgileri */}
            {formData.customerType === 'wholesale' && (
              <div className="space-y-3.5 border-l-2 border-[hsl(var(--polen-orange))]/40 pl-4">
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
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" strokeWidth={1.75} />
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Adınız" data-testid="input-firstName" className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className={labelCls}>Soyad</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" strokeWidth={1.75} />
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Soyadınız" data-testid="input-lastName" className={`${inputCls} pl-10`} />
                </div>
              </div>
            </div>

            {/* E-posta + Telefon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className={labelCls}>E-posta *</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" strokeWidth={1.75} />
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="ornek@email.com" required autoComplete="email" data-testid="input-email" className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className={labelCls}>Telefon *</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" strokeWidth={1.75} />
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
                className="w-full h-11 bg-white/5 border border-white/10 focus:border-[hsl(var(--polen-orange))] focus:outline-none rounded-lg px-4 text-white text-sm"
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country} className="bg-[hsl(var(--polen-stone))] text-white">{country}</option>
                ))}
              </select>
            </div>

            {/* Şifre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className={labelCls}>Şifre *</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" strokeWidth={1.75} />
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className={labelCls}>Şifre Tekrar *</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" strokeWidth={1.75} />
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
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--polen-orange))]" strokeWidth={2.25} />
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
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-[10px] font-mono tracking-wider uppercase ${
                  passwordStrength === 1 ? 'text-red-400' : passwordStrength === 2 ? 'text-amber-400' : 'text-[hsl(var(--polen-orange))]'
                }`}>
                  {strengthTexts[passwordStrength]}
                </span>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 bg-[hsl(var(--polen-orange))] hover:bg-[hsl(var(--polen-orange-deep))] text-white font-semibold text-[13px] rounded-lg transition-colors duration-200 gap-2"
                disabled={loading}
                data-testid="button-register"
              >
                {loading ? 'Kayıt yapılıyor…' : (
                  <>Kayıt Ol <ArrowRight className="w-4 h-4" strokeWidth={2} /></>
                )}
              </Button>
            </div>

            <p className="text-[11px] text-white/25 text-center leading-relaxed">
              Kayıt olarak{' '}
              <span className="underline underline-offset-2 hover:text-white/50 transition-colors cursor-pointer">Kullanım Koşulları</span>
              {' '}ve{' '}
              <span className="underline underline-offset-2 hover:text-white/50 transition-colors cursor-pointer">Gizlilik Politikası</span>
              'nı kabul etmiş olursunuz.
            </p>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
