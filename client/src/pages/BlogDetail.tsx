import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { Calendar, ChevronRight, BookOpen, ArrowLeft, Clock, User, ChevronDown, MessageCircleQuestion } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';

const CANONICAL_SITE_URL = 'https://gocards.toov.com.tr';

interface FaqItem { question: string; answer: string; }

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
  faqItems: FaqItem[] | null;
  publishedAt: string | null;
  createdAt: string;
}

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

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-10 border-t border-neutral-200 pt-8" data-testid="faq-section">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircleQuestion className="w-5 h-5 text-indigo-500 shrink-0" />
        <h2 className="text-lg font-bold text-neutral-900">Sık Sorulan Sorular</h2>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="border border-neutral-200 rounded-lg overflow-hidden" data-testid={`faq-item-${i}`}>
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-[14px] font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors"
              aria-expanded={openIdx === i}
              data-testid={`button-faq-toggle-${i}`}
            >
              <span>{item.question}</span>
              <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 ml-3 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 text-[14px] text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3" data-testid={`text-faq-answer-${i}`}>
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedPostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <div
        className="group flex gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all bg-white"
        data-testid={`card-related-${post.id}`}
      >
        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-neutral-100">
          {post.coverImageUrl ? (
            <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-indigo-50">
              <BookOpen className="w-4 h-4 text-indigo-200" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-neutral-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
            {post.title}
          </p>
          {post.publishedAt && (
            <p className="text-[10px] text-neutral-400 mt-1">{formatDate(post.publishedAt)}</p>
          )}
        </div>
      </div>
    </Link>
  );
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

  const { data: allPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ['blog-list'],
    queryFn: () => fetch('/api/blog').then(r => r.json()),
    staleTime: 120_000,
    enabled: !!post,
  });

  const relatedPosts = useMemo(() => {
    if (!post || !allPosts.length) return [];
    const sameCat = allPosts.filter(p => p.id !== post.id && p.category === post.category);
    const others = allPosts.filter(p => p.id !== post.id && p.category !== post.category);
    return [...sameCat, ...others].slice(0, 3);
  }, [post, allPosts]);

  const safeContent = useMemo(() => {
    if (!post?.content) return '';
    return DOMPurify.sanitize(post.content, {
      ALLOWED_TAGS: ['p','br','strong','em','s','u','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','a','img','figure','figcaption','table','thead','tbody','tr','th','td'],
      ALLOWED_ATTR: ['href','src','alt','class','target','rel'],
    });
  }, [post?.content]);

  // Article / BlogPosting JSON-LD — injected separately from SEO component
  useEffect(() => {
    if (!post) return;
    const canonicalUrl = `${CANONICAL_SITE_URL}/blog/${post.slug}`;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.metaTitle ?? post.title,
      description: post.metaDescription ?? post.summary ?? '',
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      url: canonicalUrl,
      ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
      datePublished: post.publishedAt ?? post.createdAt,
      dateModified: post.publishedAt ?? post.createdAt,
      author: {
        '@type': 'Organization',
        name: 'Go|Cards',
        url: CANONICAL_SITE_URL,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Go|Cards',
        logo: { '@type': 'ImageObject', url: `${CANONICAL_SITE_URL}/gocards-logo-white.png` },
      },
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'blog-article');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      document.querySelector('script[data-schema="blog-article"]')?.remove();
    };
  }, [post]);

  // FAQPage JSON-LD — injected when faqItems exist
  useEffect(() => {
    if (!post || !post.faqItems || post.faqItems.length === 0) return;
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faqItems.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'blog-faq');
    script.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    return () => {
      document.querySelector('script[data-schema="blog-faq"]')?.remove();
    };
  }, [post]);

  // HowTo JSON-LD — for guide category articles with ordered steps
  useEffect(() => {
    if (!post || post.category !== 'guide') return;
    // Detect ordered list steps in content
    const stepMatches = post.content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    const hasOrderedList = /<ol[\s>]/.test(post.content);
    if (!hasOrderedList || !stepMatches || stepMatches.length < 3) return;
    const steps = stepMatches.slice(0, 10).map((li, i) => {
      const text = li.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        '@type': 'HowToStep',
        position: i + 1,
        name: text.slice(0, 80) || `Adım ${i + 1}`,
        text,
      };
    });
    const howToSchema = {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: post.metaTitle ?? post.title,
      description: post.metaDescription ?? post.summary ?? '',
      step: steps,
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'blog-howto');
    script.textContent = JSON.stringify(howToSchema);
    document.head.appendChild(script);
    return () => {
      document.querySelector('script[data-schema="blog-howto"]')?.remove();
    };
  }, [post]);

  return (
    <>
      {post && (
        <SEO
          title={post.metaTitle ?? post.title}
          description={post.metaDescription ?? post.summary ?? `Go|Cards blog: ${post.title}`}
          image={post.coverImageUrl ?? undefined}
          url={`/blog/${post.slug}`}
          type="article"
          breadcrumbs={[
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Blog & Rehber', url: '/blog' },
            { name: post.title, url: `/blog/${post.slug}` },
          ]}
        />
      )}
      <Header />

      <main className="min-h-screen bg-[hsl(var(--polen-cream))]">
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

            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="flex flex-col lg:flex-row gap-10">

                {/* ── Main content ── */}
                <article className="flex-1 min-w-0">
                  {/* Breadcrumb */}
                  <nav className="flex items-center gap-1.5 text-[12px] text-neutral-400 mb-6 flex-wrap">
                    <Link href="/" className="hover:text-neutral-700 transition-colors">Ana Sayfa</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link href="/blog" className="hover:text-neutral-700 transition-colors">Blog &amp; Rehber</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-neutral-600 truncate max-w-[200px]">{post.title}</span>
                  </nav>

                  {/* Category + meta row */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </span>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1 text-[12px] text-neutral-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(post.publishedAt)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[12px] text-neutral-400">
                      <Clock className="w-3.5 h-3.5" />
                      {readingTime(post.content)} dk okuma
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight mb-4">
                    {post.title}
                  </h1>

                  {/* Author row */}
                  <div className="flex items-center gap-2.5 mb-6 pb-6 border-b border-neutral-200">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-neutral-800">Go|Cards Editörü</p>
                      <p className="text-[11px] text-neutral-400">GoCards TCG</p>
                    </div>
                  </div>

                  {/* Summary */}
                  {post.summary && (
                    <p className="text-[15px] text-neutral-500 leading-relaxed mb-8 border-l-4 border-indigo-200 pl-4">
                      {post.summary}
                    </p>
                  )}

                  {/* Rich content — sanitized */}
                  <div
                    className="prose prose-neutral prose-sm sm:prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: safeContent }}
                  />

                  {/* FAQ Accordion */}
                  {post.faqItems && post.faqItems.length > 0 && (
                    <FaqAccordion items={post.faqItems} />
                  )}

                  {/* Back link */}
                  <div className="mt-10 pt-6 border-t border-neutral-200">
                    <Link href="/blog" className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-[13px] hover:underline">
                      <ArrowLeft className="w-4 h-4" /> Tüm Yazılara Dön
                    </Link>
                  </div>
                </article>

                {/* ── Sidebar: related/latest ── */}
                <aside className="lg:w-72 shrink-0">
                  <div className="sticky top-20">
                    <h3 className="text-[13px] font-bold text-neutral-800 mb-3 uppercase tracking-wide">
                      {relatedPosts.some(p => p.category === post.category)
                        ? 'İlgili Yazılar'
                        : 'Son Yazılar'}
                    </h3>
                    <div className="space-y-2">
                      {relatedPosts.length > 0
                        ? relatedPosts.map(p => <RelatedPostCard key={p.id} post={p} />)
                        : (
                          <p className="text-[12px] text-neutral-400">Henüz başka yazı yok.</p>
                        )}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
