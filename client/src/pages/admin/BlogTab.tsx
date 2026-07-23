import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Eye, EyeOff, FileText, Search, ExternalLink } from 'lucide-react';
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
  category: 'general',
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

// ── Rich text editor ─────────────────────────────────────────────────────────
function RichEditor({
  content, onChange,
}: {
  content: string; onChange: (html: string) => void;
}) {
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

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL girin:');
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Resim URL\'si girin:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
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
        <ToolbarBtn onClick={addImage} title="Resim ekle">🖼</ToolbarBtn>
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
    category: post?.category ?? 'general',
    status: post?.status ?? 'draft',
    publishedAt: toDatetimeLocal(post?.publishedAt),
    metaTitle: post?.metaTitle ?? '',
    metaDescription: post?.metaDescription ?? '',
  });
  const [content, setContent] = useState(post?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleTitleChange = (v: string) => {
    set('title', v);
    if (!post) set('slug', slugify(v));
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
                onChange={e => set('status', e.target.value)}
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
            <label className="block text-[12px] font-medium text-neutral-700 mb-1">Kapak Resmi URL</label>
            <input
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900"
              value={form.coverImageUrl}
              onChange={e => set('coverImageUrl', e.target.value)}
              placeholder="https://..."
              data-testid="input-blog-cover"
            />
          </div>

          {/* Content editor */}
          <div>
            <label className="block text-[12px] font-medium text-neutral-700 mb-1">İçerik</label>
            <RichEditor content={content} onChange={setContent} />
          </div>

          {/* SEO section */}
          <details className="border border-neutral-200 rounded-lg overflow-hidden">
            <summary className="px-4 py-2.5 text-[12px] font-medium text-neutral-700 cursor-pointer select-none bg-neutral-50 hover:bg-neutral-100 transition-colors">
              SEO Ayarları (opsiyonel)
            </summary>
            <div className="p-4 space-y-3">
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
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const filtered = posts.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()),
  );

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
        <SearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Başlık veya slug ile ara…"
          data-testid="input-blog-search"
        />
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'Sonuç bulunamadı' : 'Henüz yazı yok'}
          description={search ? 'Arama kriterini değiştirin.' : 'Yeni yazı oluşturarak başlayın.'}
          action={
            !search ? (
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
                  </div>
                  {post.summary && (
                    <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">{post.summary}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {post.status === 'published' && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                      title="Canlıda gör"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
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
    </>
  );
}
