import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, X, Loader2, Copy, Check, Ban, Search, Package, Trash2 } from 'lucide-react';
import type { PaymentRequest } from './_shared/types';
import { formatTRDateTime } from '@shared/dateFormat';
import {
  PageHeader,
  Card,
  EmptyState,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  IconButton,
  FormField,
  TextInput,
  TextArea,
  StatusBadge,
  InlineAlert,
} from './_ui/AdminUI';

interface ShowcaseItem {
  productId: number;
  productName: string;
  quantity: number;
  imageUrl: string | null;
  note: string;
}

interface FormState {
  amount: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  expiresInDays: string;
  showcaseItems: ShowcaseItem[];
}

const emptyForm: FormState = {
  amount: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  description: '',
  expiresInDays: '',
  showcaseItems: [],
};

const STATUS_META: Record<PaymentRequest['status'], { label: string; tone: 'amber' | 'emerald' | 'neutral' | 'red' }> = {
  pending: { label: 'Bekliyor', tone: 'amber' },
  paid: { label: 'Ödendi', tone: 'emerald' },
  cancelled: { label: 'İptal', tone: 'neutral' },
  expired: { label: 'Süresi Doldu', tone: 'red' },
};

function formatAmount(v: string): string {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface ProductSearchResult {
  id: number;
  name: string;
  images: string[];
  basePrice: string;
  slug: string;
}

function ProductPicker({ items, onChange }: { items: ShowcaseItem[]; onChange: (items: ShowcaseItem[]) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 350);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isFetching } = useQuery<ProductSearchResult[]>({
    queryKey: ['product-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      const params = new URLSearchParams({ search: debouncedSearch.trim(), limit: '12' });
      const res = await fetch(`/api/products?${params}`, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.products ?? []);
    },
    enabled: debouncedSearch.trim().length > 0,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addProduct = (p: ProductSearchResult) => {
    if (items.some(i => i.productId === p.id)) return;
    onChange([...items, {
      productId: p.id,
      productName: p.name,
      quantity: 1,
      imageUrl: p.images?.[0] ?? null,
      note: '',
    }]);
    setSearch('');
    setOpen(false);
  };

  const removeItem = (productId: number) => {
    onChange(items.filter(i => i.productId !== productId));
  };

  const updateItem = (productId: number, patch: Partial<ShowcaseItem>) => {
    onChange(items.map(i => i.productId === productId ? { ...i, ...patch } : i));
  };

  return (
    <div className="space-y-3">
      {/* Search box */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Ürün adı ile ara…"
            className="w-full h-9 pl-8 pr-3 text-[13px] bg-white border border-neutral-200 rounded-md text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300"
            data-testid="input-showcase-search"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 animate-spin" />
          )}
        </div>

        {open && debouncedSearch.trim().length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {results.length === 0 && !isFetching ? (
              <div className="px-4 py-3 text-[12px] text-neutral-400">Ürün bulunamadı</div>
            ) : (
              results.map(p => {
                const already = items.some(i => i.productId === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !already && addProduct(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors ${already ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-9 h-9 object-cover rounded border border-neutral-100 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 bg-neutral-100 rounded flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-neutral-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-neutral-500">{parseFloat(p.basePrice).toLocaleString('tr-TR')} ₺</p>
                    </div>
                    {already && <span className="ml-auto text-[11px] text-neutral-400 shrink-0">Eklendi</span>}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.productId} className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-md p-2.5">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="w-10 h-10 object-cover rounded border border-neutral-100 shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-neutral-300" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-[12px] font-medium text-neutral-800 leading-tight">{item.productName}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-neutral-500">Adet:</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(item.productId, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-14 h-7 px-2 text-[12px] border border-neutral-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={item.note}
                    onChange={e => updateItem(item.productId, { note: e.target.value })}
                    placeholder="Not (beden, renk, seri…)"
                    className="flex-1 h-7 px-2 text-[12px] border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white placeholder:text-neutral-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="p-1 text-neutral-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PaymentRequestsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery<PaymentRequest[]>({
    queryKey: ['admin', 'payment-requests'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payment-requests', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payment requests');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (state: FormState) => {
      const body = {
        amount: state.amount.trim(),
        customerName: state.customerName.trim() || undefined,
        customerEmail: state.customerEmail.trim() || undefined,
        customerPhone: state.customerPhone.trim() || undefined,
        description: state.description.trim() || undefined,
        expiresInDays: state.expiresInDays.trim() ? Number(state.expiresInDays) : undefined,
        showcaseItems: state.showcaseItems.length > 0 ? state.showcaseItems : undefined,
      };
      const res = await fetch('/api/admin/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ödeme talebi oluşturulamadı');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-requests'] });
      setShowForm(false);
      setForm(emptyForm);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/payment-requests/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'İptal edilemedi');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'payment-requests'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(form.amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Geçerli bir tutar girin.');
      return;
    }
    createMutation.mutate(form);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/odeme/${token}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 2000);
    });
  };

  return (
    <div>
      <PageHeader
        title="Ödeme Talepleri"
        description="Müşteriye özel ödeme bağlantıları oluşturun. Ödenen talepler sipariş veya stok hareketi oluşturmaz."
        actions={
          <PrimaryButton onClick={() => { setForm(emptyForm); setError(null); setShowForm(true); }} data-testid="button-new-payment-request">
            <Plus className="w-4 h-4" />
            Yeni Ödeme Talebi
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={Link2}
            title="Henüz ödeme talebi yok"
            description="Esnek tutarlı bir ödeme bağlantısı oluşturup müşterinize gönderin."
            action={
              <PrimaryButton onClick={() => { setForm(emptyForm); setError(null); setShowForm(true); }} data-testid="button-new-payment-request-empty">
                <Plus className="w-4 h-4" />
                Yeni Ödeme Talebi
              </PrimaryButton>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Tutar</th>
                  <th className="px-4 py-3 font-medium">Ürünler</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                  const showcase = (r as any).showcaseItems ?? [];
                  return (
                    <tr key={r.id} className="border-b border-neutral-50 hover:bg-neutral-50/50" data-testid={`row-payment-request-${r.id}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{r.customerName || '—'}</p>
                        {r.customerEmail && <p className="text-[11px] text-neutral-500">{r.customerEmail}</p>}
                        {r.description && <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[220px] truncate">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-900 whitespace-nowrap">{formatAmount(r.amount)}₺</td>
                      <td className="px-4 py-3">
                        {showcase.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {showcase.slice(0, 4).map((item: ShowcaseItem) => (
                              item.imageUrl ? (
                                <img
                                  key={item.productId}
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  title={`${item.productName}${item.note ? ` — ${item.note}` : ''} × ${item.quantity}`}
                                  className="w-7 h-7 rounded border-2 border-white object-cover"
                                />
                              ) : (
                                <div key={item.productId} title={item.productName} className="w-7 h-7 rounded border-2 border-white bg-neutral-100 flex items-center justify-center">
                                  <Package className="w-3.5 h-3.5 text-neutral-400" />
                                </div>
                              )
                            ))}
                            {showcase.length > 4 && (
                              <div className="w-7 h-7 rounded border-2 border-white bg-neutral-200 flex items-center justify-center text-[10px] font-semibold text-neutral-600">
                                +{showcase.length - 4}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{formatTRDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <GhostButton onClick={() => copyLink(r.token)} data-testid={`button-copy-link-${r.id}`}>
                            {copiedToken === r.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedToken === r.token ? 'Kopyalandı' : 'Linki Kopyala'}
                          </GhostButton>
                          {r.status === 'pending' && (
                            <IconButton
                              tone="danger"
                              onClick={() => {
                                if (window.confirm('Bu ödeme talebini iptal etmek istediğinize emin misiniz?')) {
                                  cancelMutation.mutate(r.id);
                                }
                              }}
                              data-testid={`button-cancel-request-${r.id}`}
                            >
                              <Ban className="w-4 h-4" />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <h3 className="text-[15px] font-semibold text-neutral-900">Yeni Ödeme Talebi</h3>
              <IconButton onClick={() => setShowForm(false)} data-testid="button-close-request-form">
                <X className="w-4 h-4" />
              </IconButton>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <InlineAlert tone="error">{error}</InlineAlert>}
              <FormField label="Tutar (₺)" required>
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Örn: 2500"
                  data-testid="input-request-amount"
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Müşteri Adı">
                  <TextInput
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Ad Soyad"
                    data-testid="input-request-name"
                  />
                </FormField>
                <FormField label="Telefon">
                  <TextInput
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="05XX XXX XX XX"
                    data-testid="input-request-phone"
                  />
                </FormField>
              </div>
              <FormField label="E-posta">
                <TextInput
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="ornek@eposta.com"
                  data-testid="input-request-email"
                />
              </FormField>
              <FormField label="Açıklama">
                <TextArea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Bu ödeme talebi neyle ilgili?"
                  data-testid="input-request-description"
                />
              </FormField>

              {/* Product showcase picker */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Package className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-[12px] font-semibold text-neutral-700">Göstermelik Ürünler</span>
                  <span className="text-[11px] text-neutral-400">— isteğe bağlı, stok etkilenmez</span>
                </div>
                <ProductPicker
                  items={form.showcaseItems}
                  onChange={(items) => setForm({ ...form, showcaseItems: items })}
                />
              </div>

              <FormField label="Geçerlilik (gün)" hint="Boş bırakılırsa süresiz geçerli olur.">
                <TextInput
                  type="number"
                  min="1"
                  value={form.expiresInDays}
                  onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}
                  placeholder="Örn: 7"
                  data-testid="input-request-expiry"
                />
              </FormField>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <SecondaryButton type="button" onClick={() => setShowForm(false)}>
                  İptal
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={createMutation.isPending} data-testid="button-create-request">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Oluştur
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
