import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { Calendar, ChevronRight, BookOpen, ArrowLeft, Clock, User, ChevronDown, MessageCircleQuestion, Tag } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CANONICAL_SITE_URL } from '@shared/siteConfig';
import {
  resolveBlogPageTitle,
  resolveBlogDescription,
  buildBlogPostingSchema,
  buildBlogFaqSchema,
  buildBlogHowToSchema,
} from '@shared/blogSchema';

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
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'TCG Rehberi',
  analysis: 'Kart Analizi',
  news: 'Haberler',
  announcements: 'Duyurular',
};

const CATEGORY_COLORS: Record<string, string> = {
  guide: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  analysis: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  news: 'bg-amber-50 text-amber-700 border-amber-200',
  announcements: 'bg-rose-50 text-rose-700 border-rose-200',
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
          <div key={i} className="border border-neutral-200 rounded-xl overflow-hidden" data-testid={`faq-item-${i}`}>
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left text-[14px] font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors"
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
        className="group flex gap-3 p-3 rounded-xl border border-neutral-200 hover:border-indigo-200 hover:shadow-sm transition-all bg-white"
        data-testid={`card-related-${post.id}`}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-100">
          {post.coverImageUrl ? (
            <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-indigo-50">
              <BookOpen className="w-4 h-4 text-indigo-200" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          <p className="text-[12px] font-bold text-neutral-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2 mt-0.5">
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
    return [...sameCat, ...others].slice(0, 4);
  }, [post, allPosts]);

  const safeContent = useMemo(() => {
    if (!post?.content) return '';
    return DOMPurify.sanitize(post.content, {
      ALLOWED_TAGS: ['p','br','strong','em','s','u','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','a','img','figure','figcaption','table','thead','tbody','tr','th','td'],
      ALLOWED_ATTR: ['href','src','alt','class','target','rel'],
    });
  }, [post?.content]);

  useEffect(() => {
    if (!post) return;
    const schema = buildBlogPostingSchema(post);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'blog-article');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { document.querySelector('script[data-schema="blog-article"]')?.remove(); };
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const faqSchema = buildBlogFaqSchema(post);
    if (!faqSchema) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'blog-faq');
    script.textContent = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    return () => { document.querySelector('script[data-schema="blog-faq"]')?.remove(); };
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const howToSchema = buildBlogHowToSchema(post);
    if (!howToSchema) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'blog-howto');
    script.textContent = JSON.stringify(howToSchema);
    document.head.appendChild(script);
    return () => { document.querySelector('script[data-schema="blog-howto"]')?.remove(); };
  }, [post]);

  const hasSidebar = relatedPosts.length > 0;

  return (
    <>
      {post && (
        <SEO
          title={post.metaTitle ?? post.title}
          description={resolveBlogDescription(post)}
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
          <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-4">
            <div className="h-4 bg-neutral-200 rounded w-1/3" />
            <div className="h-8 bg-neutral-200 rounded w-3/4" />
            <div className="h-[360px] bg-neutral-200 rounded-2xl" />
            <div className="space-y-2 pt-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-neutral-200 rounded" style={{ width: `${75 + Math.random() * 25}%` }} />
              ))}
            </div>
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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[12px] text-neutral-400 mb-6 flex-wrap">
              <Link href="/" className="hover:text-neutral-700 transition-colors">Ana Sayfa</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/blog" className="hover:text-neutral-700 transition-colors">Blog &amp; Rehber</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-neutral-600 truncate max-w-[240px]">{post.title}</span>
            </nav>

            <div className={`flex flex-col ${hasSidebar ? 'lg:flex-row' : ''} gap-10`}>

              {/* ── Main content ── */}
              <article className="flex-1 min-w-0">

                {/* Category + meta row */}
                <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                  <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${CATEGORY_COLORS[post.category] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
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
                <h1 className="text-2xl sm:text-[32px] font-bold text-neutral-900 leading-tight mb-5">
                  {post.title}
                </h1>

                {/* Author row */}
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-neutral-200">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-800">Go|Cards Editörü</p>
                    <p className="text-[11px] text-neutral-400">GoCards TCG</p>
                  </div>
                </div>

                {/* Cover image — editorial, inside content */}
                {post.coverImageUrl && (
                  <div className="mb-8 rounded-2xl overflow-hidden shadow-md bg-neutral-900">
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="w-full aspect-[16/7] object-cover object-center"
                    />
                  </div>
                )}

                {/* Summary */}
                {post.summary && (
                  <p className="text-[16px] text-neutral-600 leading-relaxed mb-8 border-l-4 border-indigo-300 pl-4 italic">
                    {post.summary}
                  </p>
                )}

                {/* Rich content */}
                <div
                  className="prose prose-neutral prose-base max-w-none
                    prose-headings:font-bold prose-headings:text-neutral-900
                    prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
                    prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                    prose-p:text-neutral-700 prose-p:leading-relaxed prose-p:text-[15px]
                    prose-li:text-neutral-700 prose-li:text-[15px]
                    prose-strong:text-neutral-900
                    prose-blockquote:border-indigo-300 prose-blockquote:text-neutral-600 prose-blockquote:not-italic
                    prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto"
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

              {/* ── Sidebar: only when there are related posts ── */}
              {hasSidebar && (
                <aside className="lg:w-72 shrink-0">
                  <div className="sticky top-20">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-3.5 h-3.5 text-neutral-400" />
                      <h3 className="text-[12px] font-bold text-neutral-500 uppercase tracking-widest">
                        {relatedPosts.some(p => p.category === post.category) ? 'İlgili Yazılar' : 'Son Yazılar'}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {relatedPosts.map(p => <RelatedPostCard key={p.id} post={p} />)}
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
