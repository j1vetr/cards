import { useParams, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardSet } from '@/hooks/useTcg';
import { useCards } from '@/hooks/useTcg';
import { useState, useCallback } from 'react';
import { useSearch, useLocation } from 'wouter';
import { ChevronRight, ChevronLeft, Loader2, Search, X } from 'lucide-react';
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
      <div className="min-h-screen bg-zinc-50">
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
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="text-2xl font-bold mb-4">Set bulunamadı</h1>
          <Link href="/magaza"><button className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">Mağazaya Dön</button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO title={`${set.name} — ${set.game_name} | Ecarte TCG`} description={`${set.name} setindeki kartları satın al. ${set.game_name} TCG.`} />
      <Header />

      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-1.5 text-sm text-zinc-400 mb-4 flex-wrap">
            <Link href="/magaza" className="hover:text-indigo-600 transition-colors">Mağaza</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/magaza?game=${set.game_slug}`} className="hover:text-indigo-600 transition-colors">{set.game_name}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-zinc-600 font-medium">{set.name}</span>
          </nav>

          <div className="flex items-center gap-6 flex-wrap">
            {set.logo_url && (
              <img src={set.logo_url} alt={set.name} className="h-14 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{set.name}</h1>
              <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1 flex-wrap">
                {set.series && <span>{set.series}</span>}
                {set.release_date && <span>· {set.release_date}</span>}
                {set.total_cards && <span>· {set.total_cards} kart</span>}
                {total > 0 && <span className="text-indigo-600 font-medium">· {total} satışta</span>}
              </div>
            </div>
            {set.symbol_url && (
              <img src={set.symbol_url} alt="" className="h-8 object-contain ml-auto" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Kart ara..."
              value={localSearch}
              onChange={e => {
                setLocalSearch(e.target.value);
                clearTimeout((window as any).__searchTimeout);
                (window as any).__searchTimeout = setTimeout(() => setFilter({ search: e.target.value || null }), 400);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {localSearch && (
              <button onClick={() => { setLocalSearch(''); setFilter({ search: null }); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            )}
          </div>

          <Select value={sort} onValueChange={v => setFilter({ sort: v })}>
            <SelectTrigger className="w-44 text-sm bg-white border-zinc-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <p className="text-sm text-zinc-500 ml-auto">{total.toLocaleString('tr-TR')} kart</p>
        </div>

        {cardsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white border border-zinc-100 animate-pulse">
                <div className="aspect-[63/88] bg-zinc-100 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                  <div className="h-4 bg-zinc-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg font-semibold text-zinc-700 mb-2">Kart bulunamadı</p>
            <p className="text-sm text-zinc-400">Bu sette satışa sunulmuş kart yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map(card => <CardCard key={card.id} card={card} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button onClick={() => setFilter({ page: String(page - 1) }, false)} disabled={page <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : (page <= 4 ? i + 1 : (page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i));
              return (
                <button key={p} onClick={() => setFilter({ page: String(p) }, false)}
                  className={`w-9 h-9 text-sm rounded-xl border transition-colors ${p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setFilter({ page: String(page + 1) }, false)} disabled={page >= totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
