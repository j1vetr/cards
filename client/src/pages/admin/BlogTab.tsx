import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Eye, EyeOff, FileText, Search, ExternalLink, Upload, X, Image as ImageIcon, Wand2, Loader2, Sparkles, ChevronDown, Target, CheckCircle2, XCircle, AlertCircle, Share2, Copy, Check, ListOrdered, ArrowUp, ArrowDown, History } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  PageHeader,
  Card,
  EmptyState,
  LoadingState,
  InlineAlert,
  SearchInput,
  PrimaryButton,
  SecondaryButton,
} from './_ui/AdminUI';

interface FaqItem { question: string; answer: string; }

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  content: string;
  category: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  faqItems: FaqItem[] | null;
  focusKeyword: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'guide', label: 'TCG Rehberi' },
  { value: 'analysis', label: 'Kart Analizi' },
  { value: 'news', label: 'Haberler' },
  { value: 'announcements', label: 'Duyurular' },
];

async function adminFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  summary: '',
  coverImageUrl: '',
  category: 'guide',
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
};

// ── Tiptap toolbar button ────────────────────────────────────────────────────
function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
        active ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}

async function uploadBlogImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('images', file);
  const res = await fetch('/api/admin/upload/blog', { method: 'POST', body: fd, credentials: 'include' });
  if (!res.ok) throw new Error('Resim yüklenemedi');
  const data = await res.json();
  return data.urls[0];
}

// ── SEO quality panel ────────────────────────────────────────────────────────
function SeoQualityPanel({ keyword, title, slug, metaDescription, content }: {
  keyword: string; title: string; slug: string; metaDescription: string; content: string;
}) {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return null;

  const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const wordCount = plainContent.trim().split(/\s+/).filter(Boolean).length;
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const kwCount = (plainContent.match(new RegExp(escaped, 'g')) || []).length;
  const slugKw = kw.replace(/\s+/g, '-');

  const criteria: Array<{ label: string; pass: boolean; warn?: boolean; hint: string }> = [
    {
      label: 'Başlıkta anahtar kelime',
      pass: title.toLowerCase().includes(kw),
      hint: 'Başlığa anahtar kelimeyi ekleyin',
    },
    {
      label: 'Meta açıklamada anahtar kelime',
      pass: metaDescription.toLowerCase().includes(kw),
      hint: 'Meta açıklamaya anahtar kelimeyi ekleyin',
    },
    {
      label: `İçerikte geçiş: ${kwCount}x (ideal 5-10)`,
      pass: kwCount >= 5 && kwCount <= 10,
      warn: kwCount > 0 && kwCount < 5,
      hint: kwCount === 0 ? 'İçerikte hiç kullanılmamış' : kwCount < 5 ? 'Biraz daha kullanın (ideal 5-10)' : kwCount > 10 ? 'Çok fazla — doğallık için azaltın' : '',
    },
    {
      label: `İçerik uzunluğu: ${wordCount} kelime (ideal 800+)`,
      pass: wordCount >= 800,
      warn: wordCount >= 400 && wordCount < 800,
      hint: wordCount < 400 ? 'Çok kısa — en az 800 kelime hedefleyin' : wordCount < 800 ? '800 kelimeye tamamlamak sıralamayı iyileştirir' : '',
    },
    {
      label: 'Slug\'da anahtar kelime',
      pass: slug.includes(slugKw),
      hint: 'Slug\'a anahtar kelimeyi ekleyin',
    },
  ];

  const passed = criteria.filter(c => c.pass).length;
  const { label: scoreLabel, cls: scoreCls } = passed <= 1
    ? { label: 'Zayıf', cls: 'text-red-600 bg-red-50 border-red-200' }
    : passed <= 3
      ? { label: 'Orta', cls: 'text-amber-600 bg-amber-50 border-amber-200' }
      : passed === 4
        ? { label: 'İyi', cls: 'text-blue-600 bg-blue-50 border-blue-200' }
        : { label: 'Mükemmel', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' };

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 overflow-hidden" data-testid="seo-quality-panel">
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-b border-neutral-100">
        <span className="text-[11px] font-semibold text-neutral-600 flex items-center gap-1">
          <Target className="w-3 h-3" />
          SEO Kalitesi
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreCls}`} data-testid="seo-score-label">
          {passed}/{criteria.length} — {scoreLabel}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {criteria.map((c, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-1.5" data-testid={`seo-criterion-${i}`}>
            {c.pass
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              : c.warn
                ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            }
            <div className="min-w-0">
              <span className={`text-[11px] font-medium ${c.pass ? 'text-neutral-700' : c.warn ? 'text-amber-700' : 'text-neutral-500'}`}>
                {c.label}
              </span>
              {!c.pass && c.hint && (
                <p className="text-[10px] text-neutral-400">{c.hint}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Social media kit modal ────────────────────────────────────────────────────
function SocialKitModal({ post, onClose }: { post: BlogPost; onClose: () => void }) {
  const [data, setData] = useState<{ instagram: string; twitter: string; whatsapp: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/blog/ai/social', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: post.title, summary: post.summary, slug: post.slug }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Üretilemedi');
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [post.id]);

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const platforms = data ? [
    { key: 'instagram', label: 'Instagram Caption', color: 'text-pink-600 bg-pink-50 border-pink-200', text: data.instagram },
    { key: 'twitter', label: 'Twitter / X', color: 'text-sky-600 bg-sky-50 border-sky-200', text: data.twitter },
    { key: 'whatsapp', label: 'WhatsApp Yayın', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', text: data.whatsapp },
  ] : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center p-4 overflow-y-auto" data-testid="modal-social-kit">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-violet-500" />
              Sosyal Medya Kiti
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-xs">{post.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <p className="text-[12px] text-neutral-500">GPT-4o-mini ile sosyal medya metinleri üretiliyor…</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[12px] text-red-700">
              {error}
            </div>
          )}
          {platforms.map(({ key, label, color, text }) => (
            <div key={key} className="space-y-1.5" data-testid={`social-kit-${key}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                <div className="flex items-center gap-2">
                  {key === 'twitter' && (
                    <span className={`text-[10px] font-mono ${text.length > 280 ? 'text-red-500' : 'text-neutral-400'}`}>
                      {text.length}/280
                    </span>
                  )}
                  <button
                    onClick={() => copyText(key, text)}
                    className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800 transition-colors"
                    data-testid={`button-copy-${key}`}
                  >
                    {copied === key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === key ? 'Kopyalandı!' : 'Kopyala'}
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                rows={key === 'instagram' ? 6 : 3}
                value={text}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[12px] text-neutral-700 bg-neutral-50 resize-none focus:outline-none"
                data-testid={`textarea-social-${key}`}
              />
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rich text editor ─────────────────────────────────────────────────────────
function RichEditor({
  content, onChange,
}: {
  content: string; onChange: (html: string) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Yazı içeriğini buraya girin…' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none min-h-[300px] p-3 focus:outline-none text-neutral-900' },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL girin:');
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const url = await uploadBlogImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      alert('Resim yüklenirken hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-neutral-200 bg-neutral-50">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Kalın"><strong>B</strong></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="İtalik"><em>I</em></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Üstü çizili"><s>S</s></ToolbarBtn>
        <div className="w-px h-4 bg-neutral-200 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Başlık 2">H2</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Başlık 3">H3</ToolbarBtn>
        <div className="w-px h-4 bg-neutral-200 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Madde listesi">• —</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numaralı liste">1.</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Alıntı">"</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Kod bloğu">{`<>`}</ToolbarBtn>
        <div className="w-px h-4 bg-neutral-200 mx-1" />
        <ToolbarBtn onClick={addLink} active={editor.isActive('link')} title="Link ekle">🔗</ToolbarBtn>
        <ToolbarBtn
          onClick={() => imageInputRef.current?.click()}
          title={uploading ? 'Yükleniyor…' : 'Resim yükle'}
        >
          {uploading ? <span className="text-[10px]">…</span> : '🖼'}
        </ToolbarBtn>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
          data-testid="input-inline-image-upload"
        />
        <div className="w-px h-4 bg-neutral-200 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Geri al">↩</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="İleri al">↪</ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

// ── Post form modal ──────────────────────────────────────────────────────────
function PostModal({
  post,
  onClose,
  onSave,
}: {
  post: BlogPost | null;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}) {
  const toDatetimeLocal = (iso: string | null | undefined) => {
    if (!iso) return '';
    return iso.slice(0, 16);
  };

  const [form, setForm] = useState({
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    summary: post?.summary ?? '',
    coverImageUrl: post?.coverImageUrl ?? '',
    category: post?.category ?? 'guide',
    status: post?.status ?? 'draft',
    publishedAt: toDatetimeLocal(post?.publishedAt),
    metaTitle: post?.metaTitle ?? '',
    metaDescription: post?.metaDescription ?? '',
    focusKeyword: post?.focusKeyword ?? '',
  });
  const [content, setContent] = useState(post?.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // FAQ state
  const [faqItems, setFaqItems] = useState<FaqItem[]>(
    Array.isArray((post as any)?.faqItems) ? (post as any).faqItems : []
  );
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  const addFaqItem = () => setFaqItems(f => [...f, { question: '', answer: '' }]);
  const removeFaqItem = (i: number) => setFaqItems(f => f.filter((_, idx) => idx !== i));
  const updateFaqItem = (i: number, field: 'question' | 'answer', val: string) =>
    setFaqItems(f => f.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleAiFaq = async () => {
    setFaqError(null);
    setFaqLoading(true);
    try {
      const res = await fetch('/api/admin/blog/ai/faq', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, content, category: form.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'FAQ üretilemedi');
      if (Array.isArray(data.faqItems)) setFaqItems(data.faqItems);
    } catch (e: any) {
      setFaqError(e.message);
    } finally {
      setFaqLoading(false);
    }
  };

  // AI panel state
  const [aiGame, setAiGame] = useState<'pokemon' | 'riftbound'>('pokemon');
  const [aiTone, setAiTone] = useState<'resmi' | 'samimi' | 'enerjik'>('samimi');
  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [aiSelectedTopic, setAiSelectedTopic] = useState('');
  const [aiOutline, setAiOutline] = useState<Array<{ level: 2 | 3; text: string }>>([]);
  const [aiOutlineHistory, setAiOutlineHistory] = useState<Array<{ topic: string; ts: Date; outline: Array<{ level: 2 | 3; text: string }> }>>([]);
  const [aiOutlineHistoryOpen, setAiOutlineHistoryOpen] = useState(false);
  const [aiTitlesHistory, setAiTitlesHistory] = useState<Array<{ topic: string; ts: Date; titles: string[] }>>([]);
  const [aiLoading, setAiLoading] = useState<'topics' | 'outline' | 'titles' | 'generate' | 'cover' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(!post);

  const { data: aiStatus } = useQuery<{ hasKey: boolean }>({
    queryKey: ['admin', 'blog', 'ai', 'status'],
    queryFn: () => adminFetch('/api/admin/blog/ai/status'),
    staleTime: 60_000,
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleTitleChange = (v: string) => {
    set('title', v);
    if (!post) set('slug', slugify(v));
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCoverUploading(true);
    try {
      const url = await uploadBlogImage(file);
      set('coverImageUrl', url);
    } catch {
      setError('Kapak resmi yüklenirken hata oluştu.');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleAiTopics = async () => {
    setAiError(null);
    setAiLoading('topics');
    try {
      const res = await fetch('/api/admin/blog/ai/topics', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: aiGame, category: form.category, tone: aiTone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Konu önerileri alınamadı');
      setAiTopics(data.topics ?? []);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiOutline = async () => {
    if (!aiSelectedTopic) return;
    setAiError(null);
    setAiLoading('outline');
    try {
      const res = await fetch('/api/admin/blog/ai/outline', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiSelectedTopic, game: aiGame, category: form.category, tone: aiTone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Taslak oluşturulamadı');
      const newOutline = data.outline ?? [];
      setAiOutline(newOutline);
      if (newOutline.length > 0) {
        setAiOutlineHistory(prev => {
          const entry = { topic: aiSelectedTopic, ts: new Date(), outline: newOutline };
          const next = [entry, ...prev].slice(0, 3);
          return next;
        });
      }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiTitles = async () => {
    const topicForTitles = aiSelectedTopic || form.title;
    if (!topicForTitles) { setAiError('Önce bir konu seçin veya başlık girin.'); return; }
    setAiError(null);
    setAiLoading('titles');
    try {
      const res = await fetch('/api/admin/blog/ai/titles', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicForTitles, game: aiGame, tone: aiTone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Başlık önerileri alınamadı');
      const newTitles = data.titles ?? [];
      if (newTitles.length > 0) {
        setAiTitlesHistory(prev => [
          ...prev,
          { topic: topicForTitles, ts: new Date(), titles: newTitles },
        ]);
      }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiSelectedTopic) return;
    setAiError(null);
    setAiLoading('generate');
    try {
      const res = await fetch('/api/admin/blog/ai/generate', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiSelectedTopic, game: aiGame, category: form.category,
          focusKeyword: form.focusKeyword, tone: aiTone,
          outline: aiOutline.length > 0 ? aiOutline : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Makale üretilemedi');
      if (data.title) { handleTitleChange(data.title); }
      if (data.summary) { set('summary', data.summary); }
      if (data.metaTitle) { set('metaTitle', data.metaTitle); }
      if (data.metaDescription) { set('metaDescription', data.metaDescription); }
      if (data.content) { setContent(data.content); }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiCover = async () => {
    const topicForCover = aiSelectedTopic || form.title;
    if (!topicForCover) { setAiError('Önce bir konu seçin veya başlık girin.'); return; }
    setAiError(null);
    setAiLoading('cover');
    try {
      const res = await fetch('/api/admin/blog/ai/cover', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicForCover, game: aiGame }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kapak görseli üretilemedi');
      if (data.url) { set('coverImageUrl', data.url); }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Başlık zorunludur'); return; }
    if (!form.slug.trim()) { setError('Slug zorunludur'); return; }
    const payload: Record<string, any> = { ...form, content };
    if (form.publishedAt) {
      payload.publishedAt = new Date(form.publishedAt).toISOString();
    } else {
      payload.publishedAt = null;
    }
    const validFaq = faqItems.filter(f => f.question.trim() && f.answer.trim());
    payload.faqItems = validFaq.length > 0 ? validFaq : null;
    payload.focusKeyword = form.focusKeyword.trim() || null;
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h3 className="text-[15px] font-semibold text-neutral-900">
            {post ? 'Yazıyı Düzenle' : 'Yeni Yazı'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <InlineAlert tone="error">{error}</InlineAlert>}

          {/* Title + slug row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-neutral-700 mb-1">Başlık *</label>
              <input
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Yazı başlığı"
                data-testid="input-blog-title"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-neutral-700 mb-1">Slug (URL) *</label>
              <input
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                value={form.slug}
                onChange={e => set('slug', slugify(e.target.value))}
                placeholder="ornek-yazi-slug"
                data-testid="input-blog-slug"
              />
            </div>
          </div>

          {/* Category + status row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-neutral-700 mb-1">Kategori</label>
              <select
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                data-testid="select-blog-category"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-neutral-700 mb-1">Durum</label>
              <select
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                value={form.status}
                onChange={e => {
                  const next = e.target.value;
                  setForm(f => ({
                    ...f,
                    status: next,
                    publishedAt: next === 'published' && !f.publishedAt
                      ? new Date().toISOString().slice(0, 16)
                      : f.publishedAt,
                  }));
                }}
                data-testid="select-blog-status"
              >
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-neutral-700 mb-1">Yayın Tarihi</label>
              <input
                type="datetime-local"
                className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                value={form.publishedAt}
                onChange={e => set('publishedAt', e.target.value)}
                data-testid="input-blog-published-at"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Özet</label>
            <textarea
              rows={2}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              placeholder="Yazı özeti (liste görünümünde gösterilir)"
              data-testid="input-blog-summary"
            />
          </div>

          {/* Cover image */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Kapak Resmi</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFileChange}
              data-testid="input-blog-cover-file"
            />
            {form.coverImageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
                <img
                  src={form.coverImageUrl}
                  alt="Kapak"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                    className="bg-white text-neutral-800 text-[12px] font-medium px-3 py-1.5 rounded-md shadow flex items-center gap-1.5 hover:bg-neutral-100 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {coverUploading ? 'Yükleniyor…' : 'Değiştir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => set('coverImageUrl', '')}
                    className="bg-white text-red-600 text-[12px] font-medium px-3 py-1.5 rounded-md shadow flex items-center gap-1.5 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Kaldır
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-200 rounded-lg py-8 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors"
                data-testid="button-blog-cover-upload"
              >
                {coverUploading ? (
                  <span className="text-[13px]">Yükleniyor…</span>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[13px] font-medium">Kapak resmi yükle</span>
                    <span className="text-[11px]">veya URL gir</span>
                  </>
                )}
              </button>
            )}
            <input
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 mt-2"
              value={form.coverImageUrl}
              onChange={e => set('coverImageUrl', e.target.value)}
              placeholder="https://... (URL ile de ekleyebilirsiniz)"
              data-testid="input-blog-cover"
            />
          </div>

          {/* Content editor */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 mb-1">İçerik</label>
            <RichEditor content={content} onChange={setContent} />
          </div>

          {/* AI Assistant Panel */}
          <div className="border border-violet-200 rounded-lg overflow-hidden bg-violet-50/40">
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-medium text-violet-800 bg-violet-50 hover:bg-violet-100 transition-colors"
              data-testid="button-ai-panel-toggle"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Yapay Zeka ile Yaz
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>

            {aiOpen && (
              <div className="p-4 space-y-3">
                {/* Proactive key warning */}
                {aiStatus && !aiStatus.hasKey && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-[11px] text-amber-800" data-testid="alert-ai-no-key">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      OpenAI API anahtarı henüz ayarlanmamış.{' '}
                      <strong>Ayarlar → OpenAI API Anahtarı</strong> bölümünden ekleyebilirsiniz.
                    </span>
                  </div>
                )}

                {/* Game + topic suggest row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={aiGame}
                    onChange={e => { setAiGame(e.target.value as any); setAiTopics([]); setAiSelectedTopic(''); setAiOutline([]); }}
                    className="border border-violet-200 rounded-md px-3 py-1.5 text-[12px] text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                    data-testid="select-ai-game"
                  >
                    <option value="pokemon">Pokémon TCG</option>
                    <option value="riftbound">Riftbound</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAiTopics}
                    disabled={!!aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-[12px] font-medium rounded-md hover:bg-violet-700 disabled:opacity-60 transition-colors"
                    data-testid="button-ai-topics"
                  >
                    {aiLoading === 'topics' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    {aiLoading === 'topics' ? 'Öneriliyor…' : 'Konu Öner'}
                  </button>
                </div>

                {/* Tone selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 font-medium shrink-0">Ton:</span>
                  {(['resmi', 'samimi', 'enerjik'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiTone(t)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors capitalize ${
                        aiTone === t
                          ? 'bg-violet-100 text-violet-700 border-violet-400'
                          : 'bg-white text-neutral-500 border-neutral-200 hover:border-violet-300 hover:text-violet-600'
                      }`}
                      data-testid={`button-tone-${t}`}
                    >
                      {t === 'resmi' ? '🎩 Resmi' : t === 'samimi' ? '😊 Samimi' : '⚡ Enerjik'}
                    </button>
                  ))}
                </div>

                {/* Topic chips */}
                {aiTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {aiTopics.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setAiSelectedTopic(t); setAiOutline([]); }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          aiSelectedTopic === t
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-violet-700 border-violet-300 hover:border-violet-500 hover:bg-violet-50'
                        }`}
                        data-testid={`button-ai-topic-${i}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected topic display */}
                {aiSelectedTopic && (
                  <div className="flex items-start gap-2 bg-white border border-violet-200 rounded-md px-3 py-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                    <span className="text-[12px] text-neutral-700 flex-1">{aiSelectedTopic}</span>
                    <button
                      type="button"
                      onClick={() => { setAiSelectedTopic(''); setAiOutline([]); }}
                      className="text-neutral-400 hover:text-neutral-600 text-[11px]"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Outline history dropdown */}
                {aiOutlineHistory.length > 1 && (
                  <div className="relative" data-testid="outline-history">
                    <button
                      type="button"
                      onClick={() => setAiOutlineHistoryOpen(o => !o)}
                      className="flex items-center gap-1.5 text-[11px] text-violet-600 hover:text-violet-800 font-medium transition-colors"
                      data-testid="button-outline-history-toggle"
                    >
                      <History className="w-3 h-3" />
                      Önceki Taslaklar ({aiOutlineHistory.length - 1})
                      <ChevronDown className={`w-3 h-3 transition-transform ${aiOutlineHistoryOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {aiOutlineHistoryOpen && (
                      <div className="absolute z-10 top-6 left-0 w-72 bg-white border border-violet-200 rounded-lg shadow-lg overflow-hidden" data-testid="outline-history-dropdown">
                        {aiOutlineHistory.slice(1).map((entry, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setAiOutline(entry.outline); setAiOutlineHistoryOpen(false); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-violet-50 transition-colors border-b border-violet-50 last:border-0"
                            data-testid={`button-outline-history-${i}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-[10px] text-violet-500 font-medium">
                                {entry.ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] text-neutral-400">{entry.outline.length} bölüm</span>
                            </div>
                            <p className="text-[11px] text-neutral-600 truncate">{entry.topic}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Outline editor */}
                {aiOutline.length > 0 && (
                  <div className="border border-violet-200 rounded-lg overflow-hidden" data-testid="outline-editor">
                    <div className="flex items-center justify-between px-3 py-2 bg-violet-50 border-b border-violet-100">
                      <span className="text-[11px] font-semibold text-violet-700 flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5" />
                        Makale İskeleti — düzenleyin, sonra makale oluşturun
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiOutline([])}
                        className="text-[10px] text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        Temizle
                      </button>
                    </div>
                    <div className="divide-y divide-violet-50">
                      {aiOutline.map((item, i) => (
                        <div key={i} className="flex items-center gap-1 px-3 py-1.5" data-testid={`outline-item-${i}`}>
                          <div className="flex flex-col shrink-0">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => setAiOutline(o => {
                                const n = [...o];
                                [n[i - 1], n[i]] = [n[i], n[i - 1]];
                                return n;
                              })}
                              className="text-neutral-300 hover:text-violet-500 disabled:opacity-20 transition-colors"
                              title="Yukarı taşı"
                              data-testid={`button-outline-up-${i}`}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={i === aiOutline.length - 1}
                              onClick={() => setAiOutline(o => {
                                const n = [...o];
                                [n[i], n[i + 1]] = [n[i + 1], n[i]];
                                return n;
                              })}
                              className="text-neutral-300 hover:text-violet-500 disabled:opacity-20 transition-colors"
                              title="Aşağı taşı"
                              data-testid={`button-outline-down-${i}`}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAiOutline(o => o.map((x, idx) => idx === i ? { ...x, level: x.level === 2 ? 3 : 2 } : x))}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors ${
                              item.level === 2
                                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                            }`}
                            title="H2/H3 değiştir"
                            data-testid={`button-outline-level-${i}`}
                          >
                            H{item.level}
                          </button>
                          <input
                            className="flex-1 text-[12px] text-neutral-700 bg-transparent border-none outline-none"
                            value={item.text}
                            onChange={e => setAiOutline(o => o.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))}
                            data-testid={`input-outline-${i}`}
                          />
                          <button
                            type="button"
                            onClick={() => setAiOutline(o => o.filter((_, idx) => idx !== i))}
                            className="text-neutral-300 hover:text-red-500 transition-colors shrink-0"
                            data-testid={`button-outline-remove-${i}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-2 border-t border-violet-100">
                      <button
                        type="button"
                        onClick={() => setAiOutline(o => [...o, { level: 2, text: 'Yeni Bölüm' }])}
                        className="text-[11px] text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 transition-colors"
                        data-testid="button-outline-add"
                      >
                        <Plus className="w-3 h-3" /> Başlık Ekle
                      </button>
                    </div>
                  </div>
                )}

                {/* Title history — accumulated batches */}
                {aiTitlesHistory.length > 0 && (
                  <div className="border border-amber-200 rounded-lg overflow-hidden" data-testid="title-suggestions">
                    <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                        <History className="w-3 h-3" />
                        Önceki Başlıklar — birini seçin
                      </span>
                      <button type="button" onClick={() => setAiTitlesHistory([])} className="text-[10px] text-neutral-400 hover:text-neutral-600" data-testid="button-clear-title-history">✕</button>
                    </div>
                    <div className="divide-y divide-amber-100">
                      {[...aiTitlesHistory].reverse().map((batch, bi) => (
                        <div key={bi} data-testid={`title-batch-${bi}`}>
                          <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
                            <span className="text-[10px] text-neutral-400 font-medium">
                              {batch.ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-neutral-300">·</span>
                            <span className="text-[10px] text-neutral-400 truncate max-w-[180px]">{batch.topic}</span>
                          </div>
                          {batch.titles.map((t, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { handleTitleChange(t); }}
                              className="w-full text-left px-3 py-2 text-[12px] text-neutral-700 hover:bg-amber-50 transition-colors"
                              data-testid={`button-title-suggestion-${bi}-${i}`}
                            >
                              <span className="text-[10px] font-bold text-amber-500 mr-1.5">
                                {i === 0 ? 'SORU' : i === 1 ? 'LİSTE' : 'VAAT'}
                              </span>
                              {t}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAiOutline}
                    disabled={!aiSelectedTopic || !!aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 border border-violet-300 text-[12px] font-medium rounded-md hover:bg-violet-200 disabled:opacity-50 transition-colors"
                    data-testid="button-ai-outline"
                  >
                    {aiLoading === 'outline' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListOrdered className="w-3.5 h-3.5" />}
                    {aiLoading === 'outline' ? 'Taslak oluşturuluyor…' : 'Taslak Oluştur'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAiTitles}
                    disabled={(!aiSelectedTopic && !form.title) || !!aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-300 text-[12px] font-medium rounded-md hover:bg-amber-100 disabled:opacity-50 transition-colors"
                    data-testid="button-ai-titles"
                  >
                    {aiLoading === 'titles' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    {aiLoading === 'titles' ? 'Öneriliyor…' : '3 Başlık Öner'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={!aiSelectedTopic || !!aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[12px] font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    data-testid="button-ai-generate"
                  >
                    {aiLoading === 'generate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {aiLoading === 'generate'
                      ? 'Makale yazılıyor…'
                      : aiOutline.length > 0
                        ? 'Onaylayıp Makale Oluştur'
                        : 'Makale Oluştur'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAiCover}
                    disabled={(!aiSelectedTopic && !form.title) || !!aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 border border-indigo-300 text-[12px] font-medium rounded-md hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                    data-testid="button-ai-cover"
                  >
                    {aiLoading === 'cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {aiLoading === 'cover' ? 'Görsel üretiliyor…' : 'Kapak Görseli Üret'}
                  </button>
                </div>

                {aiError && (
                  <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="text-ai-error">
                    {aiError}
                  </p>
                )}

                {aiLoading === 'outline' && (
                  <p className="text-[11px] text-violet-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Makale iskeleti oluşturuluyor…
                  </p>
                )}
                {aiLoading === 'generate' && (
                  <p className="text-[11px] text-violet-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    GPT-4o ile makale yazılıyor, 15-30 saniye sürebilir…
                    {aiOutline.length > 0 && ' (iskelet kullanılıyor)'}
                  </p>
                )}
                {aiLoading === 'cover' && (
                  <p className="text-[11px] text-violet-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    DALL-E 3 ile kapak görseli üretiliyor, 10-20 saniye sürebilir…
                  </p>
                )}
              </div>
            )}
          </div>

          {/* FAQ section */}
          <details className="border border-emerald-200 rounded-lg overflow-hidden" open={faqItems.length > 0}>
            <summary className="flex items-center justify-between px-4 py-2.5 text-[12px] font-medium text-emerald-800 cursor-pointer select-none bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Sık Sorulan Sorular (FAQ)
                {faqItems.length > 0 && (
                  <span className="ml-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{faqItems.length}</span>
                )}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </summary>
            <div className="p-4 space-y-3">
              {/* AI generate button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiFaq}
                  disabled={faqLoading || (!form.title && !content)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[12px] font-medium rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  data-testid="button-ai-faq"
                >
                  {faqLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {faqLoading ? 'Üretiliyor…' : 'AI ile Üret'}
                </button>
                <span className="text-[11px] text-neutral-400">Mevcut başlık ve içerikten otomatik soru-cevap oluşturur</span>
              </div>

              {faqError && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="text-faq-error">
                  {faqError}
                </p>
              )}

              {/* FAQ item list */}
              {faqItems.length > 0 && (
                <div className="space-y-3">
                  {faqItems.map((item, i) => (
                    <div key={i} className="border border-neutral-200 rounded-lg p-3 bg-white space-y-2" data-testid={`faq-item-${i}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0">S{i + 1}</span>
                        <input
                          className="flex-1 border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          value={item.question}
                          onChange={e => updateFaqItem(i, 'question', e.target.value)}
                          placeholder="Soru?"
                          data-testid={`input-faq-question-${i}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeFaqItem(i)}
                          className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                          title="Soruyu sil"
                          data-testid={`button-faq-remove-${i}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
                        value={item.answer}
                        onChange={e => updateFaqItem(i, 'answer', e.target.value)}
                        placeholder="Cevap…"
                        data-testid={`input-faq-answer-${i}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Add question button */}
              <button
                type="button"
                onClick={addFaqItem}
                className="flex items-center gap-1.5 text-[12px] text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
                data-testid="button-faq-add"
              >
                <Plus className="w-3.5 h-3.5" />
                Soru Ekle
              </button>

              {faqItems.length > 0 && (
                <p className="text-[10px] text-neutral-400">
                  Boş bırakılan sorular kaydedilmez. Yayımlanan yazılarda FAQPage şeması otomatik eklenir.
                </p>
              )}
            </div>
          </details>

          {/* SEO section */}
          <details className="border border-neutral-200 rounded-lg overflow-hidden" open={!!form.focusKeyword}>
            <summary className="px-4 py-2.5 text-[12px] font-medium text-neutral-700 cursor-pointer select-none bg-neutral-50 hover:bg-neutral-100 transition-colors flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              SEO Ayarları (opsiyonel)
            </summary>
            <div className="p-4 space-y-3">
              {/* Focus keyword */}
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3 text-indigo-500" />
                  Odak Anahtar Kelime
                </label>
                <input
                  className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={form.focusKeyword}
                  onChange={e => set('focusKeyword', e.target.value.slice(0, 100))}
                  placeholder="ör. pokemon kart satın al, charizard fiyatı…"
                  maxLength={100}
                  data-testid="input-blog-focus-keyword"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Bu kelime tüm SEO sinyallerini yönlendirir ve AI yazı üretiminde kullanılır.
                </p>
                <SeoQualityPanel
                  keyword={form.focusKeyword}
                  title={form.title}
                  slug={form.slug}
                  metaDescription={form.metaDescription}
                  content={content}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-medium text-neutral-700">Meta Başlık</label>
                  <span className={`text-[10px] font-mono ${
                    form.metaTitle.length > 60 ? 'text-red-500' : form.metaTitle.length > 50 ? 'text-amber-500' : 'text-neutral-400'
                  }`}>
                    {form.metaTitle.length}/60
                  </span>
                </div>
                <input
                  className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  value={form.metaTitle}
                  onChange={e => set('metaTitle', e.target.value)}
                  maxLength={80}
                  placeholder="Google'da görünecek başlık (ideal: 50-60 karakter)"
                  data-testid="input-blog-meta-title"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-medium text-neutral-700">Meta Açıklama</label>
                  <span className={`text-[10px] font-mono ${
                    form.metaDescription.length > 160 ? 'text-red-500' : form.metaDescription.length > 140 ? 'text-amber-500' : 'text-neutral-400'
                  }`}>
                    {form.metaDescription.length}/160
                  </span>
                </div>
                <textarea
                  rows={2}
                  className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
                  value={form.metaDescription}
                  onChange={e => set('metaDescription', e.target.value)}
                  maxLength={200}
                  placeholder="Arama sonuçlarında görünecek açıklama (ideal: 140-160 karakter)"
                  data-testid="input-blog-meta-description"
                />
              </div>
            </div>
          </details>

          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={onClose}>İptal</SecondaryButton>
            <PrimaryButton type="submit" data-testid="button-blog-save">
              {post ? 'Kaydet' : 'Oluştur'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main BlogTab ─────────────────────────────────────────────────────────────
export default function BlogTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialKitPost, setSocialKitPost] = useState<BlogPost | null>(null);

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ['admin', 'blog'],
    queryFn: () => adminFetch('/api/admin/blog'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      adminFetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'blog'] }); setShowModal(false); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      adminFetch(`/api/admin/blog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'blog'] }); setShowModal(false); setEditingPost(null); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/blog/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'blog'] }),
    onError: (e: Error) => setError(e.message),
  });

  const handleSave = useCallback((data: Record<string, any>) => {
    setError(null);
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [editingPost, createMutation, updateMutation]);

  const handleDelete = (post: BlogPost) => {
    if (!window.confirm(`"${post.title}" yazısını silmek istediğinize emin misiniz?`)) return;
    deleteMutation.mutate(post.id);
  };

  const filtered = posts.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label ?? cat;

  return (
    <>
      <PageHeader
        title="Blog / Rehber"
        description="Yazıları yönetin, taslak veya yayında durumunu ayarlayın."
        actions={
          <PrimaryButton
            onClick={() => { setEditingPost(null); setShowModal(true); }}
            data-testid="button-new-post"
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Yazı
          </PrimaryButton>
        }
      />

      {error && <InlineAlert tone="error" >{error}</InlineAlert>}

      <Card className="mb-4 px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Başlık veya slug ile ara…"
              data-testid="input-blog-search"
            />
          </div>
          <select
            className="border border-neutral-200 rounded-md px-3 py-2 text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
            data-testid="select-blog-status-filter"
          >
            <option value="all">Tüm Yazılar ({posts.length})</option>
            <option value="published">Yayında ({posts.filter(p => p.status === 'published').length})</option>
            <option value="draft">Taslak ({posts.filter(p => p.status === 'draft').length})</option>
          </select>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || statusFilter !== 'all' ? 'Sonuç bulunamadı' : 'Henüz yazı yok'}
          description={
            search || statusFilter !== 'all'
              ? 'Arama ya da filtre kriterini değiştirin.'
              : 'Yeni yazı oluşturarak başlayın.'
          }
          action={
            !search && statusFilter === 'all' ? (
              <PrimaryButton onClick={() => { setEditingPost(null); setShowModal(true); }}>
                <Plus className="w-3.5 h-3.5" /> Yeni Yazı
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-neutral-100">
            {filtered.map(post => (
              <div key={post.id} className="flex items-start gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors" data-testid={`row-blog-${post.id}`}>
                {/* Cover thumbnail */}
                <div className="w-14 h-14 rounded-md overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                  {post.coverImageUrl ? (
                    <img src={post.coverImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-neutral-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-neutral-900 truncate">{post.title}</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none shrink-0 ${
                        post.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                      data-testid={`status-blog-${post.id}`}
                    >
                      {post.status === 'published' ? 'Yayında' : 'Taslak'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span className="font-mono">/blog/{post.slug}</span>
                    <span>{categoryLabel(post.category)}</span>
                    {post.publishedAt && (
                      <span>{new Date(post.publishedAt).toLocaleDateString('tr-TR')}</span>
                    )}
                    {post.focusKeyword && (
                      <span className="flex items-center gap-0.5 text-indigo-500" title="Odak anahtar kelime">
                        <Target className="w-3 h-3" />
                        {post.focusKeyword}
                      </span>
                    )}
                  </div>
                  {post.summary && (
                    <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">{post.summary}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {post.status === 'published' && (
                    <>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        title="Canlıda gör"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setSocialKitPost(post)}
                        className="p-1.5 rounded text-neutral-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Sosyal Medya Kiti"
                        data-testid={`button-social-kit-${post.id}`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      updateMutation.mutate({
                        id: post.id,
                        data: { status: post.status === 'published' ? 'draft' : 'published' },
                      });
                    }}
                    className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title={post.status === 'published' ? 'Taslağa al' : 'Yayınla'}
                    data-testid={`button-toggle-status-${post.id}`}
                  >
                    {post.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setEditingPost(post); setShowModal(true); }}
                    className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title="Düzenle"
                    data-testid={`button-edit-blog-${post.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    className="p-1.5 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Sil"
                    data-testid={`button-delete-blog-${post.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showModal && (
        <PostModal
          post={editingPost}
          onClose={() => { setShowModal(false); setEditingPost(null); }}
          onSave={handleSave}
        />
      )}

      {socialKitPost && (
        <SocialKitModal
          post={socialKitPost}
          onClose={() => setSocialKitPost(null)}
        />
      )}
    </>
  );
}
