import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Trash2, Pencil, X, Loader2 } from 'lucide-react';
import type { WholesaleSeries } from './_shared/types';
import {
  PageHeader,
  Card,
  EmptyState,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  FormField,
  TextInput,
  StatusBadge,
  InlineAlert,
} from './_ui/AdminUI';

interface SizeRow {
  size: string;
  quantity: string;
}

interface EditorState {
  id: string | null;
  name: string;
  isActive: boolean;
  rows: SizeRow[];
}

const emptyEditor: EditorState = {
  id: null,
  name: '',
  isActive: true,
  rows: [{ size: '', quantity: '' }],
};

function totalPieces(dist: { size: string; quantity: number }[]): number {
  return dist.reduce((s, d) => s + (d.quantity || 0), 0);
}

export default function WholesaleSeriesTab() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: series = [], isLoading } = useQuery<WholesaleSeries[]>({
    queryKey: ['admin', 'wholesale-series'],
    queryFn: async () => {
      const res = await fetch('/api/admin/wholesale-series', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch series');
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (state: EditorState) => {
      const sizeDistribution = state.rows
        .filter((r) => r.size.trim() && Number(r.quantity) > 0)
        .map((r) => ({ size: r.size.trim(), quantity: Number(r.quantity) }));
      const body = { name: state.name.trim(), isActive: state.isActive, sizeDistribution };
      const url = state.id ? `/api/admin/wholesale-series/${state.id}` : '/api/admin/wholesale-series';
      const method = state.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Seri kaydedilemedi');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'wholesale-series'] });
      setEditor(null);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/wholesale-series/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Seri silinemedi');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'wholesale-series'] }),
  });

  const openCreate = () => {
    setError(null);
    setEditor({ ...emptyEditor, rows: [{ size: '', quantity: '' }] });
  };

  const openEdit = (s: WholesaleSeries) => {
    setError(null);
    setEditor({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      rows: s.sizeDistribution.length
        ? s.sizeDistribution.map((d) => ({ size: d.size, quantity: String(d.quantity) }))
        : [{ size: '', quantity: '' }],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    if (!editor.name.trim()) {
      setError('Seri adı zorunludur.');
      return;
    }
    const valid = editor.rows.filter((r) => r.size.trim() && Number(r.quantity) > 0);
    if (valid.length === 0) {
      setError('En az bir geçerli beden/adet girin.');
      return;
    }
    saveMutation.mutate(editor);
  };

  const editorTotal = editor
    ? editor.rows.reduce((s, r) => s + (Number(r.quantity) > 0 ? Number(r.quantity) : 0), 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Toptan Seriler"
        description="Bir seri, tek birim olarak satılan sabit beden dağılımıdır. Ürünlere atanır ve adet başına fiyatlandırılır."
        actions={
          <PrimaryButton onClick={openCreate} data-testid="button-new-series">
            <Plus className="w-4 h-4" />
            Yeni Seri
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : series.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="Henüz seri yok"
            description="Toptan satış için bir beden serisi oluşturun (örn. 30-32-34-36 = 8 adet)."
            action={
              <PrimaryButton onClick={openCreate} data-testid="button-new-series-empty">
                <Plus className="w-4 h-4" />
                Yeni Seri
              </PrimaryButton>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {series.map((s) => (
            <Card key={s.id} className="p-4" data-testid={`card-series-${s.id}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-neutral-900 truncate" data-testid={`text-series-name-${s.id}`}>
                    {s.name}
                  </p>
                  <p className="text-[12px] text-neutral-500 mt-0.5">
                    Toplam {totalPieces(s.sizeDistribution)} adet
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StatusBadge tone={s.isActive ? 'emerald' : 'neutral'}>
                    {s.isActive ? 'Aktif' : 'Pasif'}
                  </StatusBadge>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {s.sizeDistribution.map((d, i) => (
                  <span
                    key={`${d.size}-${i}`}
                    className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-700"
                  >
                    <span className="font-semibold">{d.size}</span>
                    <span className="text-neutral-400">×</span>
                    {d.quantity}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-end gap-1 border-t border-neutral-100 pt-2">
                <IconButton onClick={() => openEdit(s)} data-testid={`button-edit-series-${s.id}`}>
                  <Pencil className="w-4 h-4" />
                </IconButton>
                <IconButton
                  tone="danger"
                  onClick={() => {
                    if (window.confirm(`"${s.name}" serisini silmek istediğinize emin misiniz?`)) {
                      deleteMutation.mutate(s.id);
                    }
                  }}
                  data-testid={`button-delete-series-${s.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white">
              <h3 className="text-[15px] font-semibold text-neutral-900">
                {editor.id ? 'Seriyi Düzenle' : 'Yeni Seri'}
              </h3>
              <IconButton onClick={() => setEditor(null)} data-testid="button-close-series-editor">
                <X className="w-4 h-4" />
              </IconButton>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <InlineAlert tone="error">{error}</InlineAlert>}
              <FormField label="Seri Adı" required>
                <TextInput
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  placeholder="Örn: Standart Seri (30-38)"
                  data-testid="input-series-name"
                />
              </FormField>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-neutral-700">
                    Beden Dağılımı <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-neutral-500">Toplam: {editorTotal} adet</span>
                </div>
                <div className="space-y-2">
                  {editor.rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <TextInput
                        value={row.size}
                        onChange={(e) => {
                          const rows = [...editor.rows];
                          rows[i] = { ...rows[i], size: e.target.value };
                          setEditor({ ...editor, rows });
                        }}
                        placeholder="Beden (örn. 32)"
                        data-testid={`input-series-size-${i}`}
                      />
                      <TextInput
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => {
                          const rows = [...editor.rows];
                          rows[i] = { ...rows[i], quantity: e.target.value };
                          setEditor({ ...editor, rows });
                        }}
                        placeholder="Adet"
                        className="max-w-[120px]"
                        data-testid={`input-series-qty-${i}`}
                      />
                      <IconButton
                        tone="danger"
                        type="button"
                        onClick={() => {
                          const rows = editor.rows.filter((_, idx) => idx !== i);
                          setEditor({ ...editor, rows: rows.length ? rows : [{ size: '', quantity: '' }] });
                        }}
                        data-testid={`button-remove-row-${i}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <SecondaryButton
                  type="button"
                  className="mt-2"
                  onClick={() => setEditor({ ...editor, rows: [...editor.rows, { size: '', quantity: '' }] })}
                  data-testid="button-add-row"
                >
                  <Plus className="w-4 h-4" />
                  Beden Ekle
                </SecondaryButton>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editor.isActive}
                  onChange={(e) => setEditor({ ...editor, isActive: e.target.checked })}
                  className="w-4 h-4 accent-neutral-900"
                  data-testid="checkbox-series-active"
                />
                <span className="text-[13px] text-neutral-700">Aktif (ürünlerde kullanılabilir)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <SecondaryButton type="button" onClick={() => setEditor(null)}>
                  İptal
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={saveMutation.isPending} data-testid="button-save-series">
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Kaydet
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
