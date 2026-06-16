import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Package, MapPin, LogOut, Truck, CheckCircle2, Clock, XCircle,
  Eye, X, Edit3, Save, Phone, Mail, Calendar, ShoppingBag, CreditCard,
  Loader2, Heart, Plus, Trash2, Home, ChevronRight, AlertCircle, Building2,
  ArrowRight, Star,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { formatTRDate, formatTRDateTime } from '@shared/dateFormat';
import { useFavorites } from '@/hooks/useFavorites';
import { ProductCard } from '@/components/ProductCard';
import { COUNTRIES } from '@/lib/countries';

type TabType = 'overview' | 'orders' | 'payments' | 'profile' | 'addresses' | 'favorites';

interface MyPaymentRequest {
  token: string;
  amount: string;
  description: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: { address: string; city: string; district: string; postalCode: string };
  subtotal: string;
  shippingCost: string;
  total: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingCarrier?: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  productName: string;
  variantDetails: string;
  price: string;
  quantity: number;
  subtotal: string;
}

interface UserAddress {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  pending: { label: 'Beklemede', color: 'text-black/55', icon: Clock, bg: 'bg-black/[0.04] border border-black/8' },
  processing: { label: 'İşleniyor', color: 'text-polen-orange', icon: Package, bg: 'bg-polen-orange/10 border border-polen-orange/30' },
  shipped: { label: 'Kargoda', color: 'text-polen-orange', icon: Truck, bg: 'bg-polen-orange/15 border border-polen-orange/40' },
  delivered: { label: 'Teslim Edildi', color: 'text-white', icon: CheckCircle2, bg: 'bg-black border border-black' },
  completed: { label: 'Tamamlandı', color: 'text-white', icon: CheckCircle2, bg: 'bg-black border border-black' },
  cancelled: { label: 'İptal Edildi', color: 'text-destructive', icon: XCircle, bg: 'bg-destructive/10 border border-destructive/30' },
};

const payReqConfig = {
  pending: { label: 'Bekliyor', bg: 'bg-amber-50 border border-amber-200', color: 'text-amber-700', icon: Clock },
  paid: { label: 'Ödendi', bg: 'bg-emerald-50 border border-emerald-200', color: 'text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'İptal Edildi', bg: 'bg-stone-100 border border-black/8', color: 'text-black/50', icon: XCircle },
  expired: { label: 'Süresi Doldu', bg: 'bg-stone-100 border border-black/8', color: 'text-black/50', icon: XCircle },
};

export default function Profile() {
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [payAmount, setPayAmount] = useState('');
  const [payDescription, setPayDescription] = useState('');

  const isWholesale = user?.customerType === 'wholesale';

  useEffect(() => {
    if (location === '/hesabim/siparislerim') setActiveTab('orders');
  }, [location]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders/my', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: paymentRequests = [], isLoading: paymentRequestsLoading } = useQuery<MyPaymentRequest[]>({
    queryKey: ['my-payment-requests'],
    queryFn: async () => {
      const res = await fetch('/api/payment-requests/mine', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!user,
  });

  const pendingPayments = paymentRequests.filter((p) => p.status === 'pending');
  const pendingPaymentCount = pendingPayments.length;

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string }) => {
      const res = await fetch('/api/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Ödeme talebi oluşturulamadı');
      return json as { token: string; paymentUrl: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-payment-requests'] });
      navigate(data.paymentUrl || `/odeme/${data.token}`);
    },
    onError: (err: any) => {
      toast({ title: 'Hata', description: err?.message || 'Ödeme talebi oluşturulamadı', variant: 'destructive' });
    },
  });

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Geçersiz tutar', description: 'Lütfen geçerli bir tutar girin.', variant: 'destructive' });
      return;
    }
    createPaymentMutation.mutate({ amount, description: payDescription.trim() });
  };

  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites();

  const { data: orderDetail, isLoading: orderDetailLoading } = useQuery<Order>({
    queryKey: ['my-order', selectedOrder?.id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/my/${selectedOrder?.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedOrder?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone: string }) => {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast({ title: 'Başarılı', description: 'Profil bilgileriniz güncellendi.' });
      setIsEditing(false);
    },
    onError: () => toast({ title: 'Hata', description: 'Profil güncellenemedi.', variant: 'destructive' }),
  });

  const updateWhatsappOptInMutation = useMutation({
    mutationFn: async (whatsappOptIn: boolean) => {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappOptIn }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_d, val) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast({ title: 'Tercih güncellendi', description: val ? 'WhatsApp bildirimleri açıldı.' : 'WhatsApp bildirimleri kapatıldı.' });
    },
    onError: () => toast({ title: 'Hata', description: 'Tercih güncellenemedi.', variant: 'destructive' }),
  });

  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    title: '', firstName: '', lastName: '', phone: '', address: '', city: '', district: '', postalCode: '', country: 'Türkiye', isDefault: false,
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery<UserAddress[]>({
    queryKey: ['user-addresses'],
    queryFn: async () => {
      const res = await fetch('/api/auth/addresses', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: typeof addressForm) => {
      const res = await fetch('/api/auth/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-addresses'] }); toast({ title: 'Başarılı', description: 'Adres eklendi.' }); setShowAddressForm(false); resetAddressForm(); },
    onError: () => toast({ title: 'Hata', description: 'Adres eklenemedi.', variant: 'destructive' }),
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof addressForm }) => {
      const res = await fetch(`/api/auth/addresses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-addresses'] }); toast({ title: 'Başarılı', description: 'Adres güncellendi.' }); setEditingAddress(null); setShowAddressForm(false); resetAddressForm(); },
    onError: () => toast({ title: 'Hata', description: 'Adres güncellenemedi.', variant: 'destructive' }),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/auth/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-addresses'] }); toast({ title: 'Başarılı', description: 'Adres silindi.' }); },
    onError: () => toast({ title: 'Hata', description: 'Adres silinemedi.', variant: 'destructive' }),
  });

  const resetAddressForm = () => setAddressForm({ title: '', firstName: '', lastName: '', phone: '', address: '', city: '', district: '', postalCode: '', country: 'Türkiye', isDefault: false });

  const handleEditAddress = (addr: UserAddress) => {
    setEditingAddress(addr);
    setAddressForm({ title: addr.title, firstName: addr.firstName, lastName: addr.lastName, phone: addr.phone, address: addr.address, city: addr.city, district: addr.district, postalCode: addr.postalCode || '', country: addr.country || 'Türkiye', isDefault: addr.isDefault });
    setShowAddressForm(true);
  };

  const handleSaveAddress = () => {
    if (editingAddress) updateAddressMutation.mutate({ id: editingAddress.id, data: addressForm });
    else createAddressMutation.mutate(addressForm);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleEditProfile = () => {
    setProfileForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: (user as any)?.phone || '' });
    setIsEditing(true);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/giris');
  }, [authLoading, user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white">
        <SEO title="Hesabım" description="Hesap bilgileriniz" url="/hesabim" noIndex />
        <Header />
        <main className="pt-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black/20" />
        </main>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Genel Bakış', icon: Home },
    { id: 'orders', label: 'Siparişlerim', icon: Package, count: orders.length },
    ...(isWholesale ? [{ id: 'payments' as TabType, label: 'Ödemeler', icon: CreditCard, count: pendingPaymentCount || undefined }] : []),
    { id: 'favorites', label: 'Favoriler', icon: Heart, count: favorites.length || undefined },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'addresses', label: 'Adresler', icon: MapPin, count: addresses.length || undefined },
  ];

  const inputCls = 'w-full px-4 py-3 bg-stone-50 border border-black/10 text-black placeholder:text-black/30 focus:outline-none focus:border-black/40 transition-colors text-sm';

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      <SEO title="Hesabım" description="Hesap bilgileriniz, siparişleriniz ve adresleriniz." url="/hesabim" noIndex />
      <Header />

      <main className="pt-20 pb-16">
        {/* Page header */}
        <div className="bg-white border-b border-black/8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white text-base font-bold shrink-0">
                {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-black leading-tight truncate" data-testid="text-page-title">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0]}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-black/45 truncate">{user.email}</span>
                  {isWholesale && (
                    <span className="shrink-0 inline-flex items-center gap-1 bg-polen-orange/10 text-polen-orange text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                      <Building2 className="w-3 h-3" />Toptan
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-black/45 hover:text-black transition-colors shrink-0" data-testid="button-logout">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>

          {/* Tab bar — horizontal scrollable pills */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex gap-0 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={`tab-${tab.id}`}
                    className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 shrink-0 ${
                      isActive
                        ? 'border-black text-black'
                        : 'border-transparent text-black/45 hover:text-black/70'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full ${
                        isActive ? 'bg-black text-white' : 'bg-black/10 text-black/60'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <AnimatePresence mode="wait">
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Wholesale: pending payment alert */}
                {isWholesale && pendingPaymentCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-amber-900 text-sm">
                          {pendingPaymentCount} bekleyen ödeme talebiniz var
                        </p>
                        <p className="text-amber-700 text-xs mt-0.5">Aşağıda hızlıca ödeyebilirsiniz.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 transition-colors shrink-0"
                    >
                      Ödemelere Git <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Stats grid */}
                <div className={`grid gap-3 ${isWholesale ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  <button onClick={() => setActiveTab('orders')} className="bg-white border border-black/8 p-5 text-left hover:border-black/20 transition-colors group">
                    <Package className="w-5 h-5 text-black/30 mb-3 group-hover:text-black/50 transition-colors" />
                    <p className="text-2xl font-bold text-black">{orders.length}</p>
                    <p className="text-xs text-black/45 mt-0.5">Sipariş</p>
                  </button>
                  {isWholesale && (
                    <button onClick={() => setActiveTab('payments')} className="bg-white border border-black/8 p-5 text-left hover:border-black/20 transition-colors group relative">
                      <CreditCard className="w-5 h-5 text-black/30 mb-3 group-hover:text-black/50 transition-colors" />
                      <p className="text-2xl font-bold text-black">{pendingPaymentCount}</p>
                      <p className="text-xs text-black/45 mt-0.5">Bekleyen Ödeme</p>
                      {pendingPaymentCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500" />}
                    </button>
                  )}
                  <button onClick={() => setActiveTab('favorites')} className="bg-white border border-black/8 p-5 text-left hover:border-black/20 transition-colors group">
                    <Heart className="w-5 h-5 text-black/30 mb-3 group-hover:text-black/50 transition-colors" />
                    <p className="text-2xl font-bold text-black">{favorites.length}</p>
                    <p className="text-xs text-black/45 mt-0.5">Favori</p>
                  </button>
                  <button onClick={() => setActiveTab('addresses')} className="bg-white border border-black/8 p-5 text-left hover:border-black/20 transition-colors group">
                    <MapPin className="w-5 h-5 text-black/30 mb-3 group-hover:text-black/50 transition-colors" />
                    <p className="text-2xl font-bold text-black">{addresses.length}</p>
                    <p className="text-xs text-black/45 mt-0.5">Adres</p>
                  </button>
                </div>

                {/* Wholesale: quick pay section */}
                {isWholesale && (
                  <div className="bg-white border border-black/8">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-black/45" />
                        <h3 className="font-semibold text-black text-sm">Hızlı Ödeme</h3>
                      </div>
                      <span className="text-xs text-black/40">Toptan Müşteri</span>
                    </div>
                    <div className="p-5">
                      {/* Pending requests */}
                      {paymentRequestsLoading ? (
                        <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-black/30" /></div>
                      ) : pendingPayments.length > 0 ? (
                        <div className="space-y-2 mb-5">
                          {pendingPayments.map((pr) => (
                            <div key={pr.token} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 px-4 py-3">
                              <div>
                                <p className="font-semibold text-black">{Number(pr.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                {pr.description && <p className="text-xs text-black/50 mt-0.5 truncate max-w-[200px]">{pr.description}</p>}
                              </div>
                              <Link href={`/odeme/${pr.token}`}>
                                <button className="flex items-center gap-1.5 bg-black hover:bg-polen-orange text-white text-xs font-bold px-4 py-2 transition-colors" data-testid={`button-pay-${pr.token}`}>
                                  <CreditCard className="w-3.5 h-3.5" />
                                  Öde
                                </button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-black/40 mb-4">Bekleyen ödeme talebiniz yok.</p>
                      )}

                      {/* Pay form */}
                      <form onSubmit={handleCreatePayment} data-testid="form-create-payment">
                        <p className="text-xs text-black/40 uppercase tracking-wider mb-3">Tutar girerek ödeme yap</p>
                        <div className="flex gap-2">
                          <input
                            type="number" min="1" step="0.01" required
                            value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="Tutar (₺)"
                            className="w-32 px-3 py-2.5 border border-black/12 text-black text-sm focus:border-black/40 outline-none bg-white"
                            data-testid="input-payment-amount"
                          />
                          <input
                            type="text" maxLength={500}
                            value={payDescription} onChange={(e) => setPayDescription(e.target.value)}
                            placeholder="Açıklama (isteğe bağlı)"
                            className="flex-1 px-3 py-2.5 border border-black/12 text-black text-sm focus:border-black/40 outline-none bg-white"
                            data-testid="input-payment-description"
                          />
                          <button
                            type="submit" disabled={createPaymentMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-black hover:bg-polen-orange text-white text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
                            data-testid="button-create-payment"
                          >
                            {createPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            <span className="hidden sm:inline">Ödemeye Geç</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Recent orders */}
                <div className="bg-white border border-black/8">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-black/45" />
                      <h3 className="font-semibold text-black text-sm">Son Siparişler</h3>
                    </div>
                    <button onClick={() => setActiveTab('orders')} className="text-xs text-black/40 hover:text-black flex items-center gap-1 transition-colors">
                      Tümü <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {ordersLoading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/20" /></div>
                  ) : orders.length === 0 ? (
                    <div className="py-10 text-center">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-black/15" />
                      <p className="text-sm text-black/40">Henüz sipariş yok</p>
                      <Link href="/magaza">
                        <button className="mt-3 text-xs text-black/55 hover:text-black underline underline-offset-2 transition-colors">Alışverişe başla</button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/5">
                      {orders.slice(0, 3).map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        return (
                          <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-black/[0.01] transition-colors" data-testid={`order-row-${order.id}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-mono text-sm font-semibold text-black">#{order.orderNumber}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium ${status.bg} ${status.color}`}>
                                  <StatusIcon className="w-3 h-3" />{status.label}
                                </span>
                              </div>
                              <p className="text-xs text-black/40 mt-1">{formatTRDate(order.createdAt)} · {order.total}₺</p>
                            </div>
                            <button onClick={() => setSelectedOrder(order)} className="p-2 hover:bg-black/5 transition-colors" data-testid={`button-view-order-${order.id}`}>
                              <Eye className="w-4 h-4 text-black/40" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Profil Bilgilerini Düzenle', icon: User, tab: 'profile' as TabType },
                    { label: 'Adres Ekle / Düzenle', icon: MapPin, tab: 'addresses' as TabType },
                    { label: 'Favori Ürünlerim', icon: Star, tab: 'favorites' as TabType },
                  ].map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => setActiveTab(item.tab)}
                      className="flex items-center justify-between gap-3 bg-white border border-black/8 px-4 py-3.5 hover:border-black/20 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-black/35 group-hover:text-black/60 transition-colors" />
                        <span className="text-sm text-black/70 group-hover:text-black transition-colors">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-black/25 group-hover:text-black/50 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── ORDERS ── */}
            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black">Siparişlerim</h2>
                  <span className="text-sm text-black/40">{orders.length} sipariş</span>
                </div>
                {ordersLoading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-black/20" /></div>
                ) : orders.length === 0 ? (
                  <div className="bg-white border border-black/8 p-12 text-center">
                    <ShoppingBag className="w-14 h-14 mx-auto mb-4 text-black/15" />
                    <h3 className="text-lg font-semibold text-black mb-2">Henüz sipariş yok</h3>
                    <p className="text-black/40 mb-5 text-sm">Alışverişe başlayarak ilk siparişini oluştur.</p>
                    <Link href="/magaza"><button className="px-6 py-2.5 bg-black text-white text-sm font-medium hover:bg-polen-orange transition-colors" data-testid="button-start-shopping">Alışverişe Başla</button></Link>
                  </div>
                ) : (
                  orders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-black/8 p-5 hover:border-black/15 transition-colors" data-testid={`order-card-${order.id}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <span className="font-mono font-bold text-black">#{order.orderNumber}</span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" />{status.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-black/45">
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatTRDate(order.createdAt)}</span>
                              <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />{order.total}₺</span>
                            </div>
                          </div>
                          <button onClick={() => setSelectedOrder(order)} className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-sm font-medium text-black transition-colors self-start sm:self-center" data-testid={`button-view-order-${order.id}`}>
                            <Eye className="w-4 h-4" />Detaylar
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            )}

            {/* ── PAYMENTS (wholesale only) ── */}
            {activeTab === 'payments' && isWholesale && (
              <motion.div key="payments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                {/* Quick pay form */}
                <div className="bg-white border border-black/8">
                  <div className="px-5 py-4 border-b border-black/8 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-black/45" />
                    <h3 className="font-semibold text-black text-sm">Ödeme Yap</h3>
                  </div>
                  <form onSubmit={handleCreatePayment} className="p-5" data-testid="form-create-payment">
                    <p className="text-sm text-black/50 mb-4">Tutar ve açıklama girip kredi kartıyla ödeme yapın.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3 mb-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-black/40 mb-1.5">Tutar (₺)</label>
                        <input type="number" min="1" step="0.01" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0,00" className={inputCls} data-testid="input-payment-amount" />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-black/40 mb-1.5">Açıklama</label>
                        <input type="text" maxLength={500} value={payDescription} onChange={(e) => setPayDescription(e.target.value)} placeholder="Örn. Sipariş bakiyesi" className={inputCls} data-testid="input-payment-description" />
                      </div>
                    </div>
                    <button type="submit" disabled={createPaymentMutation.isPending} className="inline-flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-polen-orange text-white text-sm font-semibold tracking-wide uppercase transition-colors disabled:opacity-50" data-testid="button-create-payment">
                      {createPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Ödemeye Geç
                    </button>
                  </form>
                </div>

                {/* Payment history */}
                <div>
                  <h3 className="text-sm font-semibold text-black/50 uppercase tracking-wider mb-3">Ödeme Geçmişi</h3>
                  {paymentRequestsLoading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/20" /></div>
                  ) : paymentRequests.length === 0 ? (
                    <div className="bg-white border border-black/8 p-10 text-center">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-black/15" />
                      <p className="text-sm text-black/40">Henüz ödeme talebiniz yok.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentRequests.map((pr) => {
                        const cfg = payReqConfig[pr.status];
                        const StatusIcon = cfg.icon;
                        return (
                          <div key={pr.token} className="bg-white border border-black/8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid={`payment-request-card-${pr.token}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap mb-1">
                                <span className="font-bold text-black" data-testid={`text-pr-amount-${pr.token}`}>{Number(pr.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                                  <StatusIcon className="w-3.5 h-3.5" />{cfg.label}
                                </span>
                              </div>
                              {pr.description && <p className="text-sm text-black/50">{pr.description}</p>}
                              <p className="text-xs text-black/35 mt-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatTRDate(pr.createdAt)}</p>
                            </div>
                            {pr.status === 'pending' && (
                              <Link href={`/odeme/${pr.token}`}>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-polen-orange text-white text-sm font-semibold tracking-wide uppercase transition-colors" data-testid={`button-pay-${pr.token}`}>
                                  <CreditCard className="w-4 h-4" />Öde
                                </button>
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── FAVORITES ── */}
            {activeTab === 'favorites' && (
              <motion.div key="favorites" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h2 className="text-lg font-semibold text-black mb-4">Favorilerim</h2>
                {favoritesLoading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-black/20" /></div>
                ) : favorites.length === 0 ? (
                  <div className="bg-white border border-black/8 p-10 text-center">
                    <Heart className="w-12 h-12 mx-auto mb-3 text-black/15" />
                    <p className="text-sm font-medium text-black mb-1">Henüz favori ürün yok</p>
                    <p className="text-sm text-black/40 mb-5">Beğendiğiniz ürünleri ❤ ile favorileyin.</p>
                    <Link href="/magaza"><button className="px-6 py-2.5 bg-black text-white text-sm font-medium hover:bg-polen-orange transition-colors">Alışverişe Başla</button></Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {favorites.map((product) => <ProductCard key={product.id} product={product} />)}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PROFILE ── */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black">Profil Bilgileri</h2>
                  {!isEditing && (
                    <button onClick={handleEditProfile} className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-sm font-medium text-black transition-colors" data-testid="button-edit-profile">
                      <Edit3 className="w-4 h-4" />Düzenle
                    </button>
                  )}
                </div>
                <div className="bg-white border border-black/8 p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">Ad</label>
                          <input type="text" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} className={inputCls} placeholder="Adınız" data-testid="input-firstName" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">Soyad</label>
                          <input type="text" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} className={inputCls} placeholder="Soyadınız" data-testid="input-lastName" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black/50 mb-2">Telefon</label>
                        <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className={inputCls} placeholder="05XX XXX XX XX" data-testid="input-phone" />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsEditing(false)} className="flex-1 px-4 py-3 border border-black/12 text-black hover:bg-black/5 transition-colors text-sm" data-testid="button-cancel-edit">İptal</button>
                        <button onClick={() => updateProfileMutation.mutate(profileForm)} disabled={updateProfileMutation.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white font-medium hover:bg-polen-orange transition-colors disabled:opacity-50 text-sm" data-testid="button-save-profile">
                          {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[
                          { icon: User, label: 'Ad Soyad', value: `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-' },
                          { icon: Mail, label: 'E-posta', value: user.email },
                          { icon: Phone, label: 'Telefon', value: (user as any)?.phone || '-' },
                          { icon: Calendar, label: 'Üyelik Tarihi', value: (user as any)?.createdAt ? formatTRDate((user as any).createdAt) : '-' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-3 p-4 bg-stone-50">
                            <item.icon className="w-5 h-5 text-black/30 shrink-0" />
                            <div>
                              <p className="text-xs text-black/40 uppercase tracking-wider">{item.label}</p>
                              <p className="text-black font-medium text-sm mt-0.5">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-black/8">
                        <h4 className="text-xs font-semibold text-black/40 uppercase tracking-wider mb-3">İletişim Tercihleri</h4>
                        <div className="flex items-start justify-between gap-4 p-4 bg-stone-50">
                          <div className="flex items-start gap-3 min-w-0">
                            <Phone className="w-5 h-5 text-black/30 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-black" data-testid="text-whatsapp-pref-title">WhatsApp bildirimleri</p>
                              <p className="text-xs text-black/45 mt-1 leading-relaxed">Sipariş güncellemelerini WhatsApp ile alın. KVKK kapsamında istediğiniz zaman kapatabilirsiniz.</p>
                            </div>
                          </div>
                          <button
                            type="button" role="switch" aria-checked={user?.whatsappOptIn !== false}
                            disabled={updateWhatsappOptInMutation.isPending}
                            onClick={() => updateWhatsappOptInMutation.mutate(user?.whatsappOptIn === false)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${user?.whatsappOptIn !== false ? 'bg-black' : 'bg-black/15'}`}
                            data-testid="toggle-whatsapp-opt-in"
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${user?.whatsappOptIn !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── ADDRESSES ── */}
            {activeTab === 'addresses' && (
              <motion.div key="addresses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black">Adreslerim</h2>
                  {!showAddressForm && (
                    <button onClick={() => { resetAddressForm(); setEditingAddress(null); setShowAddressForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium hover:bg-polen-orange transition-colors" data-testid="button-add-address">
                      <Plus className="w-4 h-4" />Yeni Adres
                    </button>
                  )}
                </div>

                {showAddressForm ? (
                  <div className="bg-white border border-black/8 p-6">
                    <h3 className="text-base font-semibold text-black mb-4">{editingAddress ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-black/50 mb-2">Adres Başlığı *</label>
                        <input type="text" value={addressForm.title} onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })} className={inputCls} placeholder="Ev, İş..." data-testid="input-address-title" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">Ad *</label>
                          <input type="text" value={addressForm.firstName} onChange={(e) => setAddressForm({ ...addressForm, firstName: e.target.value })} className={inputCls} placeholder="Adınız" data-testid="input-address-firstName" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">Soyad *</label>
                          <input type="text" value={addressForm.lastName} onChange={(e) => setAddressForm({ ...addressForm, lastName: e.target.value })} className={inputCls} placeholder="Soyadınız" data-testid="input-address-lastName" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black/50 mb-2">Telefon *</label>
                        <input type="tel" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} className={inputCls} placeholder="05XX XXX XX XX" data-testid="input-address-phone" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black/50 mb-2">Adres *</label>
                        <input type="text" value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} className={inputCls} placeholder="Sokak, Mahalle, Bina No, Daire No" data-testid="input-address-address" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">İl *</label>
                          <input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className={inputCls} placeholder="İstanbul" data-testid="input-address-city" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">İlçe *</label>
                          <input type="text" value={addressForm.district} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })} className={inputCls} placeholder="Kadıköy" data-testid="input-address-district" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">Posta Kodu</label>
                          <input type="text" value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })} className={inputCls} placeholder="34000" data-testid="input-address-postalCode" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black/50 mb-2">Ülke *</label>
                          <select value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} className={inputCls} data-testid="select-address-country">
                            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="isDefault" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="w-4 h-4 accent-black" data-testid="checkbox-address-default" />
                        <label htmlFor="isDefault" className="text-sm text-black/55">Varsayılan adres olarak ayarla</label>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); resetAddressForm(); }} className="flex-1 px-4 py-3 border border-black/12 text-black hover:bg-black/5 transition-colors text-sm" data-testid="button-cancel-address">İptal</button>
                        <button onClick={handleSaveAddress} disabled={createAddressMutation.isPending || updateAddressMutation.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white font-medium hover:bg-polen-orange transition-colors disabled:opacity-50 text-sm" data-testid="button-save-address">
                          {(createAddressMutation.isPending || updateAddressMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Kaydet
                        </button>
                      </div>
                    </div>
                  </div>
                ) : addressesLoading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-black/20" /></div>
                ) : addresses.length === 0 ? (
                  <div className="bg-white border border-black/8 p-10 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-black/15" />
                    <p className="text-sm font-medium text-black mb-1">Henüz adres yok</p>
                    <p className="text-sm text-black/40 mb-5">Siparişlerinizi hızlandırmak için adres ekleyin.</p>
                    <button onClick={() => { resetAddressForm(); setShowAddressForm(true); }} className="px-6 py-2.5 bg-black text-white text-sm font-medium hover:bg-polen-orange transition-colors" data-testid="button-add-first-address">İlk Adresimi Ekle</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="bg-white border border-black/8 p-5 hover:border-black/15 transition-colors" data-testid={`address-card-${addr.id}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Home className="w-4 h-4 text-black/35" />
                              <span className="font-semibold text-black">{addr.title}</span>
                              {addr.isDefault && <span className="text-[10px] bg-black text-white font-semibold uppercase tracking-wider px-2 py-0.5">Varsayılan</span>}
                            </div>
                            <p className="text-sm text-black/70">{addr.firstName} {addr.lastName}</p>
                            <p className="text-sm text-black/45">{addr.address}</p>
                            <p className="text-sm text-black/45">{addr.district}, {addr.city} {addr.postalCode}</p>
                            <p className="text-sm text-black/45 mt-0.5">{addr.phone}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditAddress(addr)} className="p-2 hover:bg-stone-100 transition-colors text-black/40 hover:text-black" data-testid={`button-edit-address-${addr.id}`}><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => { if (confirm('Bu adresi silmek istediğinizden emin misiniz?')) deleteAddressMutation.mutate(addr.id); }} className="p-2 hover:bg-red-50 transition-colors text-black/40 hover:text-red-600" data-testid={`button-delete-address-${addr.id}`}><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Order detail modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-black/8">
                <div>
                  <h3 className="text-lg font-semibold text-black">Sipariş #{selectedOrder.orderNumber}</h3>
                  <p className="text-xs text-black/40 mt-0.5">{formatTRDateTime(selectedOrder.createdAt)}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-stone-100 transition-colors" data-testid="button-close-order-modal"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-5">
                {(() => { const s = statusConfig[selectedOrder.status] || statusConfig.pending; const SI = s.icon; return <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${s.bg} ${s.color}`}><SI className="w-4 h-4" />{s.label}</span>; })()}

                {selectedOrder.status === 'shipped' && (
                  <div className="bg-stone-50 border border-black/8 p-5">
                    <div className="flex items-center justify-center gap-2 mb-3"><Truck className="w-5 h-5 text-black/60" /><span className="font-bold text-sm tracking-wider uppercase">Aras Kargo</span></div>
                    <p className="text-center text-xs text-black/45 uppercase tracking-wider mb-1">Kargo Takip No</p>
                    <p className="text-center text-xl font-mono font-bold text-black tracking-widest">{selectedOrder.trackingNumber || 'Bekleniyor...'}</p>
                    {selectedOrder.trackingNumber && (
                      <a href={selectedOrder.trackingUrl || `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${selectedOrder.trackingNumber}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-black hover:bg-polen-orange text-white font-bold text-xs tracking-widest uppercase transition-colors">
                        <Truck className="w-4 h-4" />ARAS KARGO'DA TAKİP ET
                      </a>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-black/40 uppercase tracking-wider mb-3">Ürünler</p>
                  {orderDetailLoading ? (
                    <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-black/20" /></div>
                  ) : (
                    <div className="space-y-2">
                      {orderDetail?.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-stone-50">
                          <div>
                            <p className="font-medium text-black text-sm">{item.productName}</p>
                            {item.variantDetails && <p className="text-xs text-black/40">{item.variantDetails}</p>}
                            <p className="text-xs text-black/40">Adet: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-black text-sm">{item.subtotal}₺</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-black/40 uppercase tracking-wider mb-3">Teslimat Adresi</p>
                  <div className="p-4 bg-stone-50 text-sm">
                    <p className="font-medium text-black">{selectedOrder.customerName}</p>
                    <p className="text-black/50">{selectedOrder.shippingAddress.address}</p>
                    <p className="text-black/50">{selectedOrder.shippingAddress.district}, {selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.postalCode}</p>
                    <p className="text-black/50 mt-1">{selectedOrder.customerPhone}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-black/40 uppercase tracking-wider mb-3">Özet</p>
                  <div className="p-4 bg-stone-50 space-y-2 text-sm">
                    <div className="flex justify-between text-black/50"><span>Ara Toplam</span><span>{selectedOrder.subtotal}₺</span></div>
                    <div className="flex justify-between text-black/50"><span>Kargo</span><span>{parseFloat(selectedOrder.shippingCost) === 0 ? 'Ücretsiz' : `${selectedOrder.shippingCost}₺`}</span></div>
                    <div className="flex justify-between text-black font-bold text-base pt-2 border-t border-black/10"><span>Toplam</span><span>{selectedOrder.total}₺</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
