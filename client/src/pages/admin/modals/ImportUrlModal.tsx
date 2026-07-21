import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, X, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

interface ImportResult {
  name: string;
  price: string;
  imageCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  productType?: string;
  title?: string;
  quickLinks?: Array<{ label: string; url: string }>;
}

export default function ImportUrlModal({ open, onClose, productType = 'sealed', title, quickLinks }: Props) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => { setUrl(''); setError(''); setResult(null); };
  const close = () => { reset(); onClose(); };

  const doImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/import-product-url', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, productType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata oluştu');
      setResult(data.scraped);
      setUrl('');
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    } catch (e: any) {
      setError(e.message || 'İçe aktarma başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-[15px] font-semibold text-neutral-800">
              {title || 'URL\'den Ürün İçe Aktar'}
            </h2>
          </div>
          <button onClick={close} className="p-1 hover:bg-neutral-100 rounded-md">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[13px] text-neutral-500">
            Ürün sayfasının URL'sini yapıştırın. İsim, açıklama ve fotoğraf otomatik alınıp
            <strong> sunucuya indirilir</strong>. Ürün <strong>pasif</strong> olarak oluşturulur —
            fiyatı ve kategoriyi siz ayarlarsınız.
          </p>

          {/* Input row */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(''); setResult(null); }}
              onKeyDown={e => { if (e.key === 'Enter') doImport(); }}
              placeholder="https://bnb-games.com/..."
              className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              data-testid="input-import-url"
              disabled={loading}
            />
            <button
              onClick={doImport}
              disabled={loading || !url.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-[13px] font-medium rounded-lg transition-colors"
              data-testid="button-do-import-url"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {loading ? 'Alınıyor…' : 'Al'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[12px] text-emerald-800 space-y-0.5">
                <p className="font-semibold">Ürün oluşturuldu (pasif)</p>
                <p>İsim: {result.name}</p>
                {result.price && <p>Fiyat: {result.price} (düzenlemeniz gerekebilir)</p>}
                <p>
                  Fotoğraf:{' '}
                  {result.imageCount > 0
                    ? `${result.imageCount} görsel kaynağı bulundu, ilki indirildi`
                    : 'Fotoğraf bulunamadı — manuel eklemeniz gerekiyor'}
                </p>
                <p className="text-emerald-600 mt-1">
                  Listede bulup fiyat, kategori ve stoğu ayarlayabilirsiniz.
                </p>
              </div>
            </div>
          )}

          {/* Quick links */}
          {quickLinks && quickLinks.length > 0 && (
            <div>
              <p className="text-[11px] text-neutral-400 font-medium mb-1.5">Hızlı yapıştır:</p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {quickLinks.map(({ label, url: qUrl }) => (
                  <button
                    key={qUrl}
                    type="button"
                    onClick={() => { setUrl(qUrl); setError(''); setResult(null); setTimeout(() => inputRef.current?.focus(), 30); }}
                    className="w-full flex items-center gap-1.5 text-left text-[11px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors group"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 flex justify-end">
          <button
            onClick={close}
            className="px-4 py-2 text-[13px] text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
