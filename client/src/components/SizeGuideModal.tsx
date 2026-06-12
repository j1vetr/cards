import { useEffect, useMemo, useState } from 'react';
import { X, Ruler, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface SizeChart {
  id: string;
  columns: string[];
  rows: string[][];
}

const FALLBACK_CHART: SizeChart = {
  id: 'fallback',
  columns: ['Beden', 'Bel (cm)', 'Kalça (cm)', 'TR No', 'US No'],
  rows: [
    ['XS', '60–63', '86–89', '34', '24'],
    ['S', '64–67', '90–93', '36', '26'],
    ['M', '68–71', '94–97', '38', '28'],
    ['L', '72–75', '98–101', '40', '30'],
    ['XL', '76–79', '102–105', '42', '32'],
    ['XXL', '80–83', '106–109', '44', '34'],
  ],
};

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string;
}

// "68–71", "68-71", "60 - 63", "80+" → { min, max }. Open-ended ("80+") → max=Infinity.
function parseRange(raw: string): { min: number; max: number } | null {
  if (!raw) return null;
  const normalized = raw.replace(/[–—]/g, '-');
  const nums = normalized.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => parseFloat(n.replace(',', '.')));
  const min = values[0];
  const max = values.length > 1 ? values[1] : (/\+/.test(normalized) ? Infinity : values[0]);
  return { min, max };
}

// Find the smallest size (first ascending row) whose upper bound covers the value.
// Values below a size's min still round UP into that size; values above all rows → largest.
function indexForValue(value: number, ranges: (({ min: number; max: number }) | null)[]): number | null {
  let lastValid = -1;
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (!r) continue;
    lastValid = i;
    if (value <= r.max) return i;
  }
  return lastValid >= 0 ? lastValid : null;
}

export function SizeGuideModal({ isOpen, onClose, categoryId }: SizeGuideModalProps) {
  const { data: chart } = useQuery<SizeChart | null>({
    queryKey: ['size-chart-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const res = await fetch(`/api/size-charts/category/${categoryId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!categoryId && isOpen,
    staleTime: 10 * 60 * 1000,
  });

  const displayChart = chart ?? FALLBACK_CHART;

  const [bel, setBel] = useState('');
  const [kalca, setKalca] = useState('');
  const [recommendedIdx, setRecommendedIdx] = useState<number | null>(null);

  // Detect which columns hold beden / bel / kalça so the recommender works on
  // category-specific charts too. If neither bel nor kalça exists, hide it.
  const cols = useMemo(() => {
    const find = (re: RegExp) => displayChart.columns.findIndex((c) => re.test(c));
    const belIdx = find(/bel/i);
    const kalcaIdx = find(/kal[çc]a/i);
    let bedenIdx = find(/beden/i);
    if (bedenIdx < 0) bedenIdx = 0;
    return { belIdx, kalcaIdx, bedenIdx };
  }, [displayChart]);

  const canRecommend = cols.belIdx >= 0 || cols.kalcaIdx >= 0;

  // Reset transient state whenever the modal opens or the chart changes.
  useEffect(() => {
    if (isOpen) {
      setBel('');
      setKalca('');
      setRecommendedIdx(null);
    }
  }, [isOpen, displayChart.id]);

  const handleRecommend = (e: React.FormEvent) => {
    e.preventDefault();
    const belVal = parseFloat(bel.replace(',', '.'));
    const kalcaVal = parseFloat(kalca.replace(',', '.'));
    const hasBel = Number.isFinite(belVal) && belVal > 0 && cols.belIdx >= 0;
    const hasKalca = Number.isFinite(kalcaVal) && kalcaVal > 0 && cols.kalcaIdx >= 0;
    if (!hasBel && !hasKalca) {
      setRecommendedIdx(null);
      return;
    }
    const belRanges = displayChart.rows.map((r) => parseRange(r[cols.belIdx] ?? ''));
    const kalcaRanges = displayChart.rows.map((r) => parseRange(r[cols.kalcaIdx] ?? ''));
    const belIdx = hasBel ? indexForValue(belVal, belRanges) : null;
    const kalcaIdx = hasKalca ? indexForValue(kalcaVal, kalcaRanges) : null;
    // When both measurements are given, pick the LARGER recommended size so the
    // garment fits the bigger dimension.
    const candidates = [belIdx, kalcaIdx].filter((i): i is number => i !== null);
    if (candidates.length === 0) {
      setRecommendedIdx(null);
      return;
    }
    setRecommendedIdx(Math.max(...candidates));
  };

  const recommendedSize = recommendedIdx !== null ? displayChart.rows[recommendedIdx]?.[cols.bedenIdx] : null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="Beden Rehberi"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[111] w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-black/8 shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8">
              <h2 className="font-display text-xl tracking-wide text-black">Beden Rehberi</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center bg-black/6 hover:bg-black/12 transition-colors"
                aria-label="Kapat"
                data-testid="button-size-guide-close"
              >
                <X className="w-4 h-4 text-black/60" />
              </button>
            </div>

            <div className="p-6">
              {/* Interactive size recommender */}
              {canRecommend && (
                <div className="mb-6 border border-black/8 bg-stone-50/70 p-5" data-testid="panel-size-recommender">
                  <div className="flex items-center gap-2 mb-1">
                    <Ruler className="w-4 h-4 text-polen-orange" />
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-black">
                      Bedenimi Bul
                    </h3>
                  </div>
                  <p className="text-[12px] text-black/50 mb-4 leading-relaxed">
                    Bel ve kalça ölçünüzü santimetre cinsinden girin, size en uygun bedeni önerelim.
                  </p>
                  <form onSubmit={handleRecommend} className="flex flex-wrap items-end gap-3">
                    {cols.belIdx >= 0 && (
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-[11px] uppercase tracking-[0.12em] text-black/50 mb-1.5">
                          Bel (cm)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          inputMode="decimal"
                          value={bel}
                          onChange={(e) => setBel(e.target.value)}
                          placeholder="Örn. 70"
                          className="w-full px-3 py-2.5 border border-black/15 text-black focus:border-black outline-none text-sm"
                          data-testid="input-size-bel"
                        />
                      </div>
                    )}
                    {cols.kalcaIdx >= 0 && (
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-[11px] uppercase tracking-[0.12em] text-black/50 mb-1.5">
                          Kalça (cm)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          inputMode="decimal"
                          value={kalca}
                          onChange={(e) => setKalca(e.target.value)}
                          placeholder="Örn. 96"
                          className="w-full px-3 py-2.5 border border-black/15 text-black focus:border-black outline-none text-sm"
                          data-testid="input-size-kalca"
                        />
                      </div>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-black text-white hover:bg-polen-orange hover:text-black text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors"
                      data-testid="button-size-recommend"
                    >
                      Öner
                    </button>
                  </form>

                  <AnimatePresence>
                    {recommendedSize && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-2.5 bg-polen-orange/10 border border-polen-orange/30 px-4 py-3"
                          data-testid="text-size-recommendation"
                        >
                          <Sparkles className="w-4 h-4 text-polen-orange shrink-0" />
                          <span className="text-sm text-black">
                            Sizin için önerilen beden:{' '}
                            <strong className="font-display text-lg tracking-wide">{recommendedSize}</strong>
                          </span>
                        </div>
                        <p className="text-[11px] text-black/40 mt-2">
                          Ölçüleriniz iki beden arasındaysa rahat kullanım için büyük beden önerilir.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <p className="text-[12px] text-black/50 mb-5 leading-relaxed">
                Doğru bedeni bulmak için bel ve kalça ölçülerinizi alın. Ölçüleriniz iki beden arasındaysa büyük bedeni tercih edin.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid="table-size-guide">
                  <thead>
                    <tr className="bg-stone-50">
                      {displayChart.columns.map((col, i) => (
                        <th
                          key={i}
                          className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-black/55 border border-black/8 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayChart.rows.map((row, i) => {
                      const isRecommended = i === recommendedIdx;
                      return (
                        <tr
                          key={i}
                          className={
                            isRecommended
                              ? 'bg-polen-orange/15'
                              : i % 2 === 0
                                ? 'bg-white'
                                : 'bg-stone-50'
                          }
                          data-testid={isRecommended ? 'row-size-recommended' : undefined}
                        >
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={`px-3 py-2.5 border border-black/8 ${
                                j === 0
                                  ? `font-semibold ${isRecommended ? 'text-polen-orange' : 'text-black'}`
                                  : 'text-black/65'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-black/35 mt-4">
                * Ölçüler vücut ölçülerinizi yansıtmaktadır, giysi ölçüleri değildir.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
