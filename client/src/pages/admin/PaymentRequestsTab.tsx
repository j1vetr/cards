import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, X, Loader2, Copy, Check, Ban } from 'lucide-react';
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

interface FormState {
  amount: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  expiresInDays: string;
}

const emptyForm: FormState = {
  amount: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  description: '',
  expiresInDays: '',
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
    const url = `${window.location.origin}/odeme-talebi/${token}`;
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
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                  return (
                    <tr key={r.id} className="border-b border-neutral-50 hover:bg-neutral-50/50" data-testid={`row-payment-request-${r.id}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{r.customerName || '—'}</p>
                        {r.customerEmail && <p className="text-[11px] text-neutral-500">{r.customerEmail}</p>}
                        {r.description && <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[220px] truncate">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-900 whitespace-nowrap">{formatAmount(r.amount)}₺</td>
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
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white">
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
