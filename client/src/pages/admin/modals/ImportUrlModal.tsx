import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, X, Loader2, AlertCircle, CheckCircle2, ExternalLink, List, RotateCcw } from 'lucide-react';

interface ImportResult {
  name: string;
  price: string;
  imageCount: number;
  foundCount?: number;
}

interface BulkItem {
  url: string;
  status: 'waiting' | 'processing' | 'success' | 'error';
  result?: ImportResult;
  error?: string;
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
  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  // Single mode
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Bulk mode
  const [bulkText, setBulkText] = useState('');
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);

  if (!open) return null;

  const invalidateProducts = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const reset = () => {
    setUrl(''); setError(''); setResult(null);
    setBulkText(''); setBulkItems([]); setBulkRunning(false); setBulkDone(false);
  };
  const close = () => { reset(); onClose(); };

  // --- Single import ---
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
      invalidateProducts();
    } catch (e: any) {
      setError(e.message || 'İçe aktarma başarısız');
    } finally {
      setLoading(false);
    }
  };

  // --- Bulk import ---
  const parseBulkUrls = (text: string) =>
    text.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));

  const startBulk = async () => {
    const urls = parseBulkUrls(bulkText);
    if (!urls.length) return;
    const initial: BulkItem[] = urls.map(u => ({ url: u, status: 'waiting' }));
    setBulkItems(initial);
    setBulkRunning(true);
    setBulkDone(false);

    // Client-side sequential loop — each URL gets its own request so the UI
    // updates live (waiting → processing → success/error) for every row.
    const current = [...initial];
    for (let i = 0; i < current.length; i++) {
      current[i] = { ...current[i], status: 'processing' };
      setBulkItems([...current]);
      try {
        const res = await fetch('/api/admin/import-product-url', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: current[i].url, productType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Hata oluştu');
        current[i] = { ...current[i], status: 'success', result: data.scraped };
      } catch (e: any) {
        current[i] = { ...current[i], status: 'error', error: e.message || 'Hata' };
      }
      setBulkItems([...current]);
    }
    invalidateProducts();
    setBulkRunning(false);
    setBulkDone(true);
  };

  const retryFailed = () => {
    const failedUrls = bulkItems.filter(i => i.status === 'error').map(i => i.url);
    setBulkText(failedUrls.join('\n'));
    setBulkItems([]);
    setBulkDone(false);
  };

  const bulkSuccessCount = bulkItems.filter(i => i.status === 'success').length;
  const bulkErrorCount = bulkItems.filter(i => i.status === 'error').length;
  const bulkPendingCount = bulkItems.filter(i => i.status === 'waiting' || i.status === 'processing').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-[15px] font-semibold text-neutral-800">
              {title || "URL'den Ürün İçe Aktar"}
            </h2>
          </div>
          <button onClick={close} className="p-1 hover:bg-neutral-100 rounded-md">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 shrink-0">
          <button
            data-testid="tab-single-import"
            onClick={() => setTab('single')}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${tab === 'single' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Tekli
          </button>
          <button
            data-testid="tab-bulk-import"
            onClick={() => setTab('bulk')}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === 'bulk' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <List className="w-3.5 h-3.5" />
            Toplu
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {tab === 'single' ? (
            <div className="px-5 py-4 space-y-3">
              <p className="text-[13px] text-neutral-500">
                Ürün sayfasının URL'sini yapıştırın. İsim, açıklama ve fotoğraf otomatik alınıp
                <strong> sunucuya indirilir</strong>. Ürün <strong>pasif</strong> olarak oluşturulur —
                fiyatı ve kategoriyi siz ayarlarsınız.
              </p>

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

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-700">{error}</p>
                </div>
              )}

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
                        ? `${result.imageCount} görsel indirildi${result.foundCount && result.foundCount > result.imageCount ? ` (${result.foundCount} bulundu)` : ''}`
                        : 'Fotoğraf bulunamadı — manuel eklemeniz gerekiyor'}
                    </p>
                    <p className="text-emerald-600 mt-1">
                      Listede bulup fiyat, kategori ve stoğu ayarlayabilirsiniz.
                    </p>
                  </div>
                </div>
              )}

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
          ) : (
            <div className="px-5 py-4 space-y-3">
              {bulkItems.length === 0 ? (
                <>
                  <p className="text-[13px] text-neutral-500">
                    Her satıra bir URL yazın. "Sırayla Al" butonuna basınca URL'ler sırayla işlenir,
                    her ürün <strong>pasif</strong> olarak oluşturulur.
                  </p>
                  <textarea
                    data-testid="textarea-bulk-urls"
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={"https://bnb-games.com/urun-1\nhttps://bnb-games.com/urun-2\nhttps://bnb-games.com/urun-3"}
                    rows={8}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-y"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">
                      {parseBulkUrls(bulkText).length} URL tespit edildi
                    </span>
                    <button
                      data-testid="button-start-bulk-import"
                      onClick={startBulk}
                      disabled={parseBulkUrls(bulkText).length === 0}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-[13px] font-medium rounded-lg transition-colors"
                    >
                      <Link2 className="w-4 h-4" />
                      Sırayla Al
                    </button>
                  </div>

                  {quickLinks && quickLinks.length > 0 && (
                    <div>
                      <p className="text-[11px] text-neutral-400 font-medium mb-1.5">Hızlı ekle (tıkla):</p>
                      <div className="space-y-0.5 max-h-32 overflow-y-auto">
                        {quickLinks.map(({ label, url: qUrl }) => (
                          <button
                            key={qUrl}
                            type="button"
                            onClick={() => {
                              setBulkText(prev => {
                                const lines = prev.split('\n').map(l => l.trim()).filter(Boolean);
                                if (lines.includes(qUrl)) return prev;
                                return [...lines, qUrl].join('\n');
                              });
                            }}
                            className="w-full flex items-center gap-1.5 text-left text-[11px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors group"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" />
                            <span className="truncate">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {bulkDone && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg border text-[12px] font-medium ${bulkErrorCount > 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Tamamlandı — {bulkSuccessCount} başarılı{bulkErrorCount > 0 ? `, ${bulkErrorCount} hatalı` : ''}.
                      </span>
                      {bulkErrorCount > 0 && (
                        <button
                          data-testid="button-retry-failed"
                          onClick={retryFailed}
                          className="ml-auto flex items-center gap-1 text-[11px] text-yellow-700 hover:text-yellow-900 font-semibold"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Hatalıları Tekrar Dene
                        </button>
                      )}
                    </div>
                  )}
                  {!bulkDone && bulkRunning && (
                    <div className="flex items-center gap-2 text-[12px] text-indigo-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{bulkSuccessCount + bulkErrorCount} / {bulkItems.length} işlendi…</span>
                    </div>
                  )}
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {bulkItems.map((item, idx) => (
                      <div
                        key={item.url}
                        data-testid={`bulk-item-${idx}`}
                        className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[12px] ${
                          item.status === 'success' ? 'bg-emerald-50' :
                          item.status === 'error' ? 'bg-red-50' :
                          item.status === 'processing' ? 'bg-indigo-50' :
                          'bg-neutral-50'
                        }`}
                      >
                        <span className="shrink-0 mt-0.5">
                          {item.status === 'waiting' && <span className="text-neutral-400">⏳</span>}
                          {item.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                          {item.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {item.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          {item.status === 'success' && item.result ? (
                            <p className="text-emerald-800 font-medium truncate">{item.result.name}</p>
                          ) : item.status === 'error' ? (
                            <>
                              <p className="text-red-700 truncate">{item.url}</p>
                              <p className="text-red-500 text-[11px]">{item.error}</p>
                            </>
                          ) : (
                            <p className="text-neutral-600 truncate">{item.url}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {bulkDone && (
                    <button
                      onClick={() => { setBulkItems([]); setBulkText(''); setBulkDone(false); }}
                      className="text-[12px] text-neutral-500 hover:text-neutral-700 underline"
                    >
                      Yeni toplu import başlat
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 flex justify-end shrink-0">
          <button
            onClick={close}
            disabled={bulkRunning}
            className="px-4 py-2 text-[13px] text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
