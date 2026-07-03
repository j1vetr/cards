import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardSet } from '@/hooks/useTcg';
import { useCards } from '@/hooks/useTcg';
import { useState, useCallback } from 'react';
import { useSearch, useLocation } from 'wouter';
import { ChevronRight, ChevronLeft, Loader2, Search, X, Calendar, Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LIMIT = 24;
const SORT_OPTIONS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name_asc', label: 'İsme Göre (A-Z)' },
];

export default function CardSet() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const searchStr = useSearch();
  const [, navigate] = useLocation();

  const urlParams = new URLSearchParams(searchStr);
  const sort = urlParams.get('sort') || 'name_asc';
  const page = Math.max(1, parseInt(urlParams.get('page') || '1', 10));
  const search = urlParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(search);

  const { data: set, isLoading: setLoading } = useCardSet(slug);
  const { data, isLoading: cardsLoading } = useCards({
    set: slug,
    sort: sort as any,
    page,
    limit: LIMIT,
    search: search || undefined,
  });

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const setFilter = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const p = new URLSearchParams(searchStr);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') p.delete(key);
      else p.set(key, value);
    }
    if (resetPage) p.delete('page');
    navigate(`/set/${slug}` + (p.toString() ? '?' + p.toString() : ''), { replace: true });
  }, [searchStr, navigate, slug]);

  if (setLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Set bulunamadı</h1>
          <Link href="/magaza"><button className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">Mağazaya Dön</button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <SEO title={`${set.name} — ${set.game_name} | Ecarte TCG`} description={`${set.name} setindeki kartları satın al. ${set.game_name} TCG.`} />
      <Header />

      {/* ── Set Header ── */}
      <div className="relative overflow-hidden border-b border-white/[0.07]"
        style={{ background: 'linear-gradient(135deg, #0f1020 0%, #12122a 50%, #0d0d1a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 60%, rgba(99,102,241,0.14) 0%, transparent 60%)' }} />
        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">

          <nav className="flex items-center gap-1.5 text-xs text-zinc-600 mb-7 flex-wrap">
            <Link href="/magaza" className="hover:text-zinc-400 transition-colors">Mağaza</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/oyun/${set.game_slug}`} className="hover:text-zinc-400 transition-colors">{set.game_name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-zinc-400">{set.name}</span>
          </nav>

          <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
            {set.logo_url && (
              <img src={set.logo_url} alt={set.name}
                className="h-14 sm:h-16 object-contain shrink-0"
                style={{ filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.4)) brightness(1.05)' }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight mb-2"
                style={{ fontFamily: 'var(--font-display)' }}>
                {set.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                {set.series && (
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-zinc-600" />
                    <span className="text-xs text-zinc-500">{set.series}</span>
                  </div>
                )}
                {set.release_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-zinc-600" />
                    <span className="text-xs text-zinc-500">{set.release_date}</span>
                  </div>
                )}
                {set.total_cards && (
                  <span className="text-xs text-zinc-500">{set.total_cards} kart</span>
                )}
                {total > 0 && (
                  <span className="text-xs font-semibold text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10">
                    {total} satışta
                  </span>
                )}
              </div>
            </div>
            {set.symbol_url && (
              <img src={set.symbol_url} alt=""
                className="h-10 object-contain shrink-0 opacity-60"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06]"
        style={{ background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="text"
                placeholder="Kart ara..."
                value={localSearch}
                onChange={e => {
                  setLocalSearch(e.target.value);
                  clearTimeout((window as any).__searchTimeout);
                  (window as any).__searchTimeout = setTimeout(() => setFilter({ search: e.target.value || null }), 400);
                }}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-zinc-200 placeholder-zinc-600 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
              {localSearch && (
                <button onClick={() => { setLocalSearch(''); setFilter({ search: null }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-zinc-500" />
                </button>
              )}
            </div>

            <Select value={sort} onValueChange={v => setFilter({ sort: v })}>
              <SelectTrigger className="w-48 text-sm border-white/10 text-zinc-300" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <p className="text-xs text-zinc-600 ml-auto tabular-nums">
              {total.toLocaleString('tr-TR')} kart
            </p>
          </div>
        </div>
      </div>

      {/* ── Card Grid ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cardsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="aspect-[63/88] rounded-t-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🃏</div>
            <p className="text-base font-semibold text-zinc-400 mb-1">
              {search ? 'Arama sonucu bulunamadı' : 'Bu sette satışta kart yok'}
            </p>
            <p className="text-sm text-zinc-600">
              {search ? `"${search}" için eşleşen kart bulunamadı` : 'Henüz listeleme yapılmamış'}
            </p>
            {search && (
              <button onClick={() => { setLocalSearch(''); setFilter({ search: null }); }}
                className="mt-5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                Aramayı Temizle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map(card => <CardCard key={card.id} card={card} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button onClick={() => setFilter({ page: String(page - 1) }, false)} disabled={page <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : (page <= 4 ? i + 1 : (page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i));
              return (
                <button key={p} onClick={() => setFilter({ page: String(p) }, false)}
                  className={`w-9 h-9 text-sm rounded-xl border transition-colors ${p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'text-zinc-400 border-white/10 hover:text-white hover:border-white/20'}`}
                  style={p !== page ? { background: 'rgba(255,255,255,0.04)' } : {}}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setFilter({ page: String(page + 1) }, false)} disabled={page >= totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
