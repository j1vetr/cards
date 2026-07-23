import { useQuery } from '@tanstack/react-query';
import { Link, useSearch, useLocation } from 'wouter';
import { Calendar, ChevronRight, BookOpen, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  content: string;
  category: string;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Tümü' },
  { value: 'guide', label: 'TCG Rehberi' },
  { value: 'analysis', label: 'Kart Analizi' },
  { value: 'news', label: 'Haberler' },
  { value: 'announcements', label: 'Duyurular' },
];

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'TCG Rehberi',
  analysis: 'Kart Analizi',
  news: 'Haberler',
  announcements: 'Duyurular',
};

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function readingTime(content: string): number {
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export default function BlogList() {
  const search = useSearch();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(search);
  const activeCategory = params.get('category') ?? 'all';

  function selectCategory(value: string) {
    if (value === 'all') {
      setLocation('/blog');
    } else {
      setLocation(`/blog?category=${value}`);
    }
  }

  const { data: posts = [], isLoading, isError } = useQuery<BlogPost[]>({
    queryKey: ['blog-list'],
    queryFn: () => fetch('/api/blog').then(r => r.json()),
    staleTime: 120_000,
  });

  const filtered = activeCategory === 'all'
    ? posts
    : posts.filter(p => p.category === activeCategory);

  function categoryCount(value: string): number {
    if (value === 'all') return posts.length;
    return posts.filter(p => p.category === value).length;
  }

  return (
    <>
      <SEO
        title="Blog &amp; Rehber"
        description="Pokémon TCG ve Riftbound hakkında rehberler, haberler ve stratejiler. Go|Cards blog ve rehber içerikleri."
        url="/blog"
        type="website"
      />
      <Header />
      <main className="min-h-screen bg-[hsl(var(--polen-cream))]">
        {/* Hero bar */}
        <div className="bg-[hsl(var(--polen-stone))] text-white py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-white/40 text-[12px] mb-3">
              <Link href="/" className="hover:text-white/70 transition-colors">Ana Sayfa</Link>
              <ChevronRight className="w-3 h-3" />
              <span>Blog &amp; Rehber</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Blog &amp; Rehber</h1>
            <p className="text-white/55 mt-2 text-[14px]">Pokémon TCG ve Riftbound hakkında rehberler, haberler ve stratejiler.</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto py-3" style={{ scrollbarWidth: 'none' }}>
              {CATEGORIES.filter(cat => cat.value === 'all' || isLoading || categoryCount(cat.value) > 0).map(cat => (
                <button
                  key={cat.value}
                  onClick={() => selectCategory(cat.value)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                    activeCategory === cat.value
                      ? 'bg-indigo-600 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                  data-testid={`filter-category-${cat.value}`}
                >
                  {cat.label}{!isLoading && ` (${categoryCount(cat.value)})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-10">
          {isLoading && (
            <div className="grid sm:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-neutral-200 animate-pulse">
                  <div className="h-44 bg-neutral-100" />
                  <div className="p-5 space-y-2">
                    <div className="h-3 bg-neutral-100 rounded w-1/4" />
                    <div className="h-5 bg-neutral-100 rounded w-3/4" />
                    <div className="h-3 bg-neutral-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center py-20 text-neutral-500">
              Yazılar yüklenirken bir hata oluştu.
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="text-center py-20">
              <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 text-[14px]">
                {activeCategory === 'all'
                  ? 'Henüz yayınlanmış yazı yok.'
                  : 'Bu kategoride yazı bulunamadı.'}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-6">
              {filtered.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <article
                    className="group bg-white rounded-2xl overflow-hidden border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all duration-200 h-full flex flex-col"
                    data-testid={`card-blog-${post.id}`}
                  >
                    {/* Cover */}
                    <div className="h-44 bg-neutral-100 overflow-hidden shrink-0">
                      {post.coverImageUrl ? (
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
                          <BookOpen className="w-8 h-8 text-indigo-200" />
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {CATEGORY_LABELS[post.category] ?? post.category}
                        </span>
                        {post.publishedAt && (
                          <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.publishedAt)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400 ml-auto">
                          <Clock className="w-3 h-3" />
                          {readingTime(post.content)} dk okuma
                        </span>
                      </div>

                      <h2 className="text-[15px] font-bold text-neutral-900 leading-snug mb-2 group-hover:text-indigo-700 transition-colors line-clamp-2">
                        {post.title}
                      </h2>

                      {post.summary && (
                        <p className="text-[12px] text-neutral-500 line-clamp-2 flex-1">{post.summary}</p>
                      )}

                      <div className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                        Devamını Oku <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
