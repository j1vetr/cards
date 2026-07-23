import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { Calendar, ChevronRight, BookOpen, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  content: string;
  category: string;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Genel',
  guide: 'Rehber',
  news: 'Haberler',
  strategy: 'Strateji',
  collection: 'Koleksiyon',
};

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function BlogDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: post, isLoading, isError } = useQuery<BlogPost>({
    queryKey: ['blog-post', slug],
    queryFn: () => fetch(`/api/blog/${slug}`).then(async r => {
      if (!r.ok) throw new Error('not found');
      return r.json();
    }),
    staleTime: 120_000,
    retry: false,
  });

  // Article JSON-LD
  const jsonLd = post
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.metaTitle ?? post.title,
        description: post.metaDescription ?? post.summary ?? undefined,
        image: post.coverImageUrl ?? undefined,
        datePublished: post.publishedAt ?? post.createdAt,
        dateModified: post.publishedAt ?? post.createdAt,
        publisher: {
          '@type': 'Organization',
          name: 'GoCards',
          url: 'https://gocards.com.tr',
        },
      })
    : null;

  return (
    <>
      <Header />

      {/* JSON-LD */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}

      <main className="min-h-screen bg-[--polen-cream]">
        {isLoading && (
          <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-4">
            <div className="h-6 bg-neutral-200 rounded w-2/3" />
            <div className="h-10 bg-neutral-200 rounded w-full" />
            <div className="h-60 bg-neutral-200 rounded" />
          </div>
        )}

        {isError && (
          <div className="max-w-3xl mx-auto px-4 py-20 text-center">
            <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium mb-1">Yazı bulunamadı</p>
            <p className="text-neutral-400 text-sm mb-6">Bu yazı mevcut değil veya kaldırılmış olabilir.</p>
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-sm hover:underline">
              <ArrowLeft className="w-4 h-4" /> Tüm Yazılara Dön
            </Link>
          </div>
        )}

        {post && (
          <>
            {/* Hero / cover */}
            {post.coverImageUrl && (
              <div className="w-full max-h-[400px] overflow-hidden bg-neutral-900">
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="w-full max-h-[400px] object-cover opacity-90"
                />
              </div>
            )}

            <div className="max-w-3xl mx-auto px-4 py-8">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-[12px] text-neutral-400 mb-6">
                <Link href="/" className="hover:text-neutral-700 transition-colors">Ana Sayfa</Link>
                <ChevronRight className="w-3 h-3" />
                <Link href="/blog" className="hover:text-neutral-700 transition-colors">Blog &amp; Rehber</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-neutral-600 truncate max-w-[200px]">{post.title}</span>
              </nav>

              {/* Meta */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {CATEGORY_LABELS[post.category] ?? post.category}
                </span>
                {post.publishedAt && (
                  <span className="flex items-center gap-1 text-[12px] text-neutral-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.publishedAt)}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight mb-3">
                {post.title}
              </h1>

              {/* Summary */}
              {post.summary && (
                <p className="text-[15px] text-neutral-500 leading-relaxed mb-8 border-l-4 border-indigo-200 pl-4">
                  {post.summary}
                </p>
              )}

              {/* Rich content */}
              <div
                className="prose prose-neutral prose-sm sm:prose max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Back link */}
              <div className="mt-10 pt-6 border-t border-neutral-200">
                <Link href="/blog" className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-[13px] hover:underline">
                  <ArrowLeft className="w-4 h-4" /> Tüm Yazılara Dön
                </Link>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
