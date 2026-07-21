import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardSet, useCards } from '@/hooks/useTcg';
import { useState, useCallback } from 'react';
import { useSearch, useLocation } from 'wouter';
import { ChevronRight, ChevronLeft, Loader2, Search, X, Calendar, Hash, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LIMIT = 24;

const SORT_OPTIONS = [
  { value: 'newest',     label: 'En Yeni' },
  { value: 'price_asc',  label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name_asc',   label: 'İsme Göre (A–Z)' },
];

const GAME_ACCENT: Record<string, { color: string; dim: string; glow: string }> = {
  pokemon:   { color: '#f59e0b', dim: 'rgba(245,158,11,0.15)', glow: 'rgba(245,158,11,0.3)' },
  riftbound: { color: '#818cf8', dim: 'rgba(129,140,248,0.15)', glow: 'rgba(129,140,248,0.3)' },
};
const DEFAULT_ACCENT = GAME_ACCENT.riftbound;

function formatDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw.replace(/\//g, '-') + 'T00:00:00');
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ─── Booster Box Widget ─────────────────────────────────────────────── */
function SetBoosterBoxWidget({
  gameSlug,
  setName,
  accent,
}: {
  gameSlug?: string;
  setName: string;
  accent: { color: string; dim: string; glow: string };
}) {
  const { data: boxes = [] } = useQuery<any[]>({
    queryKey: ['boxes-for-game', gameSlug],
    queryFn: async () => {
      const res = await fetch(`/api/products/boxes?game=${encodeURIComponent(gameSlug!)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!gameSlug,
    staleTime: 5 * 60 * 1000,
  });

  const setNameLower = setName.toLowerCase();
  const matchingBox = boxes.find((box: any) =>
    box.name.toLowerCase().includes(setNameLower)
  );

  if (!matchingBox) return null;

  const boxImage = matchingBox.images?.[0];
  const price = matchingBox.basePrice ? parseFloat(matchingBox.basePrice) : null;

  return (
    <a
      href={`/urun/${matchingBox.slug}`}
      className="mt-6 sm:mt-8 inline-flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:opacity-90 w-full sm:w-auto"
      style={{
        background: accent.dim,
        borderColor: `${accent.color}40`,
      }}
      data-testid="link-set-booster-box"
    >
      {boxImage && (
        <img
          src={boxImage}
          alt={matchingBox.name}
          className="w-10 h-10 object-contain rounded-lg shrink-0"
        />
      )}
      {!boxImage && (
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent.color}20` }}
        >
          <Package className="w-5 h-5" style={{ color: accent.color }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accent.color }}>
          Bu Setin Booster Kutusu
        </p>
        <p className="text-sm font-semibold text-white truncate">{matchingBox.name}</p>
        {price != null && (
          <p className="text-xs" style={{ color: accent.color }}>
            ₺{price.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 ml-auto shrink-0" style={{ color: accent.color }} />
    </a>
  );
}

export default function CardSet() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const searchStr = useSearch();
  const [, navigate] = useLocation();

  const urlParams  = new URLSearchParams(searchStr);
  const sort       = urlParams.get('sort') || 'name_asc';
  const page       = Math.max(1, parseInt(urlParams.get('page') || '1', 10));
  const search     = urlParams.get('search') || '';
  const typeFilter = urlParams.get('type') || '';
  const [localSearch, setLocalSearch] = useState(search);

  const { data: set, isLoading: setLoading } = useCardSet(slug);
  const { data, isLoading: cardsLoading } = useCards({
    set: slug,
    sort: sort as any,
    page,
    limit: LIMIT,
    search: search || undefined,
    type: typeFilter || undefined,
  });

  const cards      = data?.cards ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const accent = set?.game_slug ? (GAME_ACCENT[set.game_slug] ?? DEFAULT_ACCENT) : DEFAULT_ACCENT;

  const setFilter = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const p = new URLSearchParams(searchStr);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') p.delete(key);
      else p.set(key, value);
    }
    if (resetPage) p.delete('page');
    navigate(`/set/${slug}` + (p.toString() ? '?' + p.toString() : ''), { replace: true });
  }, [searchStr, navigate, slug]);

  // Pagination page numbers with ellipsis
  const pageNumbers: number[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 3) return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -2, totalPages];
  })();

  if (setLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#09090f' }}>
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent.color }} />
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
          <h1 className="text-2xl font-bold text-white mb-4">Set Bulunamadı</h1>
          <Link href="/magaza">
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
              Mağazaya Dön
            </button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <SEO
        title={`${set.name} — ${set.game_name} | Go|Cards`}
        description={`${set.name} setindeki kartları satın al. ${set.game_name}.`}
      />
      <Header />

      {/* ── Set Header ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0c0c18 0%, #10101f 50%, #0a0a14 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 30% 60%, ${accent.dim} 0%, transparent 60%)` }} />
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accent.color}50, transparent)` }} />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500 mb-8 flex-wrap">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Ana Sayfa</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/oyun/${set.game_slug}`} className="hover:text-zinc-300 transition-colors">
              {set.game_name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-zinc-300">{set.name}</span>
          </nav>

          <div className="flex items-center gap-6 sm:gap-10 flex-wrap">
            {/* Set logo */}
            {set.logo_url && (
              <div className="shrink-0">
                <img
                  src={set.logo_url}
                  alt={set.name}
                  className="h-16 sm:h-20 object-contain"
                  style={{ filter: `drop-shadow(0 0 24px ${accent.glow}) brightness(1.05)` }}
                />
              </div>
            )}

            {/* Set info */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {set.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                {set.series && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    <Hash className="w-3 h-3 text-zinc-600" />
                    {set.series}
                  </span>
                )}
                {set.release_date && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    <Calendar className="w-3 h-3 text-zinc-600" />
                    {formatDate(set.release_date)}
                  </span>
                )}
                {set.total_cards && (
                  <span className="text-xs font-medium text-zinc-400">{set.total_cards} Kart</span>
                )}
                {total > 0 && (
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: accent.dim, color: accent.color, border: `1px solid ${accent.color}40` }}
                  >
                    {total} Satışta
                  </span>
                )}
              </div>
            </div>

            {/* Set symbol */}
            {set.symbol_url && (
              <img src={set.symbol_url} alt="" className="h-12 object-contain shrink-0 opacity-70" />
            )}
          </div>

          {/* Booster box widget */}
          <SetBoosterBoxWidget gameSlug={set.game_slug} setName={set.name} accent={accent} />
        </div>
      </div>

      {/* ── Sticky Filter Bar ── */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{ background: 'rgba(9,9,15,0.94)', backdropFilter: 'blur(14px)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Kart Ara..."
                value={localSearch}
                onChange={e => {
                  setLocalSearch(e.target.value);
                  clearTimeout((window as any).__searchTimeout);
                  (window as any).__searchTimeout = setTimeout(() => setFilter({ search: e.target.value || null }), 400);
                }}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-white/10 focus:outline-none text-zinc-200 placeholder-zinc-600 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />
              {localSearch && (
                <button onClick={() => { setLocalSearch(''); setFilter({ search: null }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-zinc-500 hover:text-zinc-300 transition-colors" />
                </button>
              )}
            </div>

            {/* Sort */}
            <Select value={sort} onValueChange={v => setFilter({ sort: v })}>
              <SelectTrigger
                className="w-52 text-sm border-white/10 text-zinc-200"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Count */}
            <p className="text-sm font-semibold text-zinc-300 ml-auto tabular-nums">
              {total.toLocaleString('tr-TR')} Kart
            </p>
          </div>

          {/* Active type filter chip */}
          {typeFilter && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-zinc-500">Tip:</span>
              <button
                data-testid="btn-clear-type-filter"
                onClick={() => setFilter({ type: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-opacity hover:opacity-75"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.35)' }}
              >
                {typeFilter}
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
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
            <p className="text-base font-bold text-zinc-200 mb-1">
              {search ? 'Arama Sonucu Bulunamadı' : 'Bu Sette Satışta Kart Yok'}
            </p>
            <p className="text-sm text-zinc-500">
              {search ? `"${search}" için eşleşen kart bulunamadı` : 'Henüz listeleme yapılmamış'}
            </p>
            {search && (
              <button
                onClick={() => { setLocalSearch(''); setFilter({ search: null }); }}
                className="mt-5 text-sm font-semibold transition-colors hover:opacity-80"
                style={{ color: accent.color }}
              >
                Aramayı Temizle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map(card => <CardCard key={card.id} card={card} />)}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setFilter({ page: String(page - 1) }, false)}
              disabled={page <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border transition-all disabled:opacity-25"
              style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.map((p, idx) =>
              p < 0 ? (
                <span key={`dot-${idx}`} className="w-10 h-10 flex items-center justify-center text-zinc-500 text-sm select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setFilter({ page: String(p) }, false)}
                  className="w-10 h-10 text-sm font-bold rounded-xl border transition-all"
                  style={p === page ? {
                    background: accent.color,
                    borderColor: accent.color,
                    color: gameSlugIsDark(set.game_slug) ? '#fff' : '#000',
                  } : {
                    background: 'rgba(255,255,255,0.07)',
                    borderColor: 'rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setFilter({ page: String(page + 1) }, false)}
              disabled={page >= totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-xl border transition-all disabled:opacity-25"
              style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function gameSlugIsDark(slug?: string) {
  return slug === 'riftbound';
}
