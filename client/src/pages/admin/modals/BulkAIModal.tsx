import { useState } from 'react';
import type { BulkAIResult } from '../_shared/types';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Check } from 'lucide-react';
import type { Category } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';

interface BulkAIModalProps {
  categories: Category[];
  onClose: () => void;
}

export default function BulkAIModal({ categories, onClose }: BulkAIModalProps) {
  const queryClient = useQueryClient();
  const [bulkAIStyle, setBulkAIStyle] = useState('natural');
  const [bulkAICategory, setBulkAICategory] = useState('');
  const [bulkAIOnlyEmpty, setBulkAIOnlyEmpty] = useState(true);
  const [bulkAIOverwrite, setBulkAIOverwrite] = useState(false);
  const [bulkAIProgress, setBulkAIProgress] = useState<{
    running: boolean;
    done: boolean;
    message: string;
    results?: BulkAIResult[];
  }>({ running: false, done: false, message: '' });

  const handleClose = () => {
    if (!bulkAIProgress.running) {
      onClose();
      setBulkAIProgress({ running: false, done: false, message: '' });
    }
  };

  return (
    <AdminModal
      open
      onClose={handleClose}
      closeOnOutsideClick={!bulkAIProgress.running}
      title={
        <>
          <Sparkles className="w-4 h-4 text-purple-500" />
          Toplu AI Açıklama
        </>
      }
      size="md"
      testId="modal-bulk-ai"
    >

        {!bulkAIProgress.running && !bulkAIProgress.done ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Açıklama Stili</label>
              <select
                value={bulkAIStyle}
                onChange={(e) => setBulkAIStyle(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
                data-testid="select-bulk-ai-style"
              >
                <option value="professional">Profesyonel - Kurumsal ve güvenilir ton</option>
                <option value="energetic">Enerjik - Dinamik ve motive edici</option>
                <option value="minimal">Minimal - Kısa ve öz</option>
                <option value="luxury">Lüks - Premium ve sofistike</option>
                <option value="natural">Doğal - Anadolu mirası ve el işçiliği vurgusu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Kategori Filtresi (Opsiyonel)</label>
              <select
                value={bulkAICategory}
                onChange={(e) => setBulkAICategory(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900"
                data-testid="select-bulk-ai-category"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 bg-neutral-100 p-4 rounded-lg">
              <label className="block text-sm font-medium text-neutral-500 mb-3">Hangi ürünlere uygulansın?</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="bulkAIMode"
                    checked={bulkAIOnlyEmpty && !bulkAIOverwrite}
                    onChange={() => {
                      setBulkAIOnlyEmpty(true);
                      setBulkAIOverwrite(false);
                    }}
                    className="w-5 h-5 bg-neutral-200 border-zinc-600 text-purple-600 focus:ring-purple-500"
                    data-testid="radio-bulk-ai-empty-only"
                  />
                  <span className="text-neutral-700">Sadece açıklaması boş ürünler</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="bulkAIMode"
                    checked={bulkAIOverwrite}
                    onChange={() => {
                      setBulkAIOnlyEmpty(false);
                      setBulkAIOverwrite(true);
                    }}
                    className="w-5 h-5 bg-neutral-200 border-zinc-600 text-purple-600 focus:ring-purple-500"
                    data-testid="radio-bulk-ai-overwrite"
                  />
                  <span className="text-neutral-700">Tüm ürünler (mevcut açıklamalar silinir)</span>
                </label>
              </div>
            </div>

            <div className="bg-neutral-900/10 border border-neutral-900/20 rounded-lg p-4">
              <p className="text-neutral-900 text-sm">
                ⚠️ Bu işlem, seçilen filtrelere göre tüm ürünlerin açıklamalarını AI ile oluşturacak. Her ürün için yaklaşık 2-3 saniye sürer.
              </p>
            </div>

            <button
              onClick={async () => {
                setBulkAIProgress({ running: true, done: false, message: 'Başlatılıyor...' });
                try {
                  const res = await fetch('/api/admin/products/bulk-ai-description', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      style: bulkAIStyle,
                      categoryId: bulkAICategory || undefined,
                      onlyEmpty: bulkAIOnlyEmpty,
                      overwrite: bulkAIOverwrite,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setBulkAIProgress({ running: false, done: true, message: data.error || 'Hata oluştu' });
                  } else {
                    setBulkAIProgress({ running: false, done: true, message: data.message, results: data.results });
                    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
                  }
                } catch (error) {
                  setBulkAIProgress({ running: false, done: true, message: 'Bağlantı hatası' });
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-colors"
              data-testid="button-start-bulk-ai"
            >
              <Sparkles className="w-5 h-5" />
              Toplu Açıklama Oluştur
            </button>
          </div>
        ) : bulkAIProgress.running ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-neutral-700">{bulkAIProgress.message}</p>
            <p className="text-neutral-500 text-sm mt-2">Bu işlem biraz zaman alabilir...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg ${
                bulkAIProgress.results
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              <p className={bulkAIProgress.results ? 'text-green-400' : 'text-red-400'}>
                {bulkAIProgress.message}
              </p>
            </div>

            {bulkAIProgress.results && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {bulkAIProgress.results.map((r: BulkAIResult, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded ${
                      r.success ? 'bg-neutral-50' : 'bg-red-900/20'
                    }`}
                  >
                    <span className="text-sm text-neutral-700 truncate flex-1">{r.productName}</span>
                    {r.success ? (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <span className="text-xs text-red-400 flex-shrink-0">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                onClose();
                setBulkAIProgress({ running: false, done: false, message: '' });
              }}
              className="w-full px-4 py-3 bg-neutral-50 text-neutral-900 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
              data-testid="button-close-bulk-ai"
            >
              Kapat
            </button>
          </div>
        )}
    </AdminModal>
  );
}
