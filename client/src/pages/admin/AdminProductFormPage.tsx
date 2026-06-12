import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Upload,
  Loader2,
  Package,
  Eye,
  Trash2,
  RefreshCw,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  SectionHeading,
  TextInput,
  TextArea,
  FormField,
  InlineAlert,
  StatusBadge,
  SelectInput,
} from './_ui/AdminUI';
import { SIDEBAR_CATEGORIES } from './_shared/sidebarConfig';
import type { Product, ProductDraft, Category, WholesaleSeries } from './_shared/types';
const toovLogo = '/toov-logo.png';

function toTurkishUpper(value: string): string {
  return value.toLocaleUpperCase('tr-TR');
}

function generateSlug(name: string) {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
    ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
  };
  return name
    .split('')
    .map((c) => map[c] || c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const JEANS_ATTR_KEYS = [
  { key: 'Materyal', label: 'Materyal', placeholder: 'Örn: %98 Pamuk, %2 Elastan' },
  { key: 'Likra', label: 'Likra / Elastan', placeholder: 'Örn: %2' },
  { key: 'Kumaş Tipi', label: 'Kumaş Tipi', placeholder: 'Örn: Dokuma, Örme' },
  { key: 'Paça Tipi', label: 'Paça Tipi', placeholder: 'Örn: Skinny, Straight, Wide Leg' },
  { key: 'Bel', label: 'Bel', placeholder: 'Örn: Normal Bel, Yüksek Bel, Düşük Bel' },
  { key: 'Kalıp', label: 'Kalıp', placeholder: 'Örn: Slim Fit, Regular Fit, Loose Fit' },
  { key: 'Desen', label: 'Desen', placeholder: 'Örn: Düz, Çizgili, Baskılı' },
  { key: 'Renk', label: 'Renk Tonu', placeholder: 'Örn: Açık Mavi, Koyu İndigo' },
  { key: 'Cep', label: 'Cep', placeholder: 'Örn: 5 Cep, Kargo Cepli' },
] as const;

/* ──────────────────────────────────────────────────────────────
   Mini sidebar (same look as AdminLayout but self-contained)
   ────────────────────────────────────────────────────────────── */
function PageSidebar({
  adminUser,
  onLogout,
  mobileOpen,
  setMobileOpen,
}: {
  adminUser: { username?: string };
  onLogout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const [, navigate] = useLocation();
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-neutral-200 flex flex-col
        transform transition-transform duration-200 ease-out
        md:relative md:translate-x-0 md:w-60
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="px-5 h-14 border-b border-neutral-200 flex items-center justify-between shrink-0">
        <img src={toovLogo} alt="TOOV" className="h-5 w-auto object-contain select-none" draggable={false} />
        <button onClick={() => setMobileOpen(false)} className="p-1.5 hover:bg-neutral-100 rounded-md md:hidden">
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {SIDEBAR_CATEGORIES.map((category, i) => (
          <div key={category.title} className={i > 0 ? 'mt-4' : ''}>
            <p className="px-2 py-1.5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.08em]">
              {category.title}
            </p>
            {category.items.map((item) => {
              const isActive = item.id === 'products';
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/toov-admin?tab=${item.id}`)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md mb-0.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-neutral-200 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[11px] font-semibold">
            {adminUser.username?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-neutral-900 truncate">{adminUser.username}</p>
            <p className="text-[11px] text-neutral-500">Yönetici</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main page
   ────────────────────────────────────────────────────────────── */
export default function AdminProductFormPage() {
  const params = useParams<{ id?: string }>();
  const productId = params.id; // undefined → new product
  const copyFromId = new URLSearchParams(window.location.search).get('copyFrom') ?? undefined;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── auth ── */
  const { data: adminUser, isLoading: userLoading } = useQuery<{ username: string }>({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const r = await fetch('/api/admin/me');
      if (!r.ok) throw new Error('Not authenticated');
      return r.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (!userLoading && !adminUser) navigate('/toov-admin/login');
  }, [adminUser, userLoading, navigate]);

  /* ── data ── */
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const r = await fetch('/api/categories');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!adminUser,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const r = await fetch('/api/admin/products');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!adminUser && (!!productId || !!copyFromId),
  });

  const { data: wholesaleSeriesList = [] } = useQuery<WholesaleSeries[]>({
    queryKey: ['admin', 'wholesale-series'],
    queryFn: async () => {
      const r = await fetch('/api/admin/wholesale-series', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!adminUser,
  });

  const existingProduct: Product | null = productId
    ? products.find((p) => p.id === productId) ?? null
    : null;

  const copySource: Product | null = copyFromId
    ? products.find((p) => p.id === copyFromId) ?? null
    : null;

  const product: Product | ProductDraft | null = existingProduct;

  /* ── form state ── */
  const initForm = (p: Product | ProductDraft | null) => ({
    name: p?.name || '',
    slug: p?.slug || '',
    description: p?.description || '',
    sku: p?.sku || '',
    basePrice: p?.basePrice || '',
    categoryId: p?.categoryId || '',
    categoryIds: (p?.categoryIds && p.categoryIds.length > 0) ? p.categoryIds : (p?.categoryId ? [p.categoryId] : [] as string[]),
    images: p?.images || [] as string[],
    videoUrl: p?.videoUrl || '',
    availableSizes: p?.availableSizes || [] as string[],
    availableColors: p?.availableColors || [],
    attributes: p?.attributes || {} as Record<string, string>,
    isActive: p?.isActive ?? true,
    isFeatured: p?.isFeatured ?? false,
    isNew: p?.isNew ?? false,
    wholesaleEnabled: p?.wholesaleEnabled ?? false,
    wholesalePrice: p?.wholesalePrice || '',
    wholesaleSeriesId: p?.wholesaleSeriesId || '',
    initialStock: '',
  });

  const [formData, setFormData] = useState(() => initForm(null));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!productId && !copyFromId) {
      setFormData(initForm(null));
      setInitialized(true);
      return;
    }
    if (!productId && copyFromId && copySource && !initialized) {
      // Duplicate: pre-fill from source, clear id/slug
      setFormData({
        ...initForm(copySource),
        name: `${copySource.name} (Kopya)`,
        slug: '',
        sku: copySource.sku ? `${copySource.sku}-KOPYA` : '',
      });
      setColorInput(
        copySource.availableColors?.[0]?.name
          ? toTurkishUpper(copySource.availableColors[0].name)
          : '',
      );
      setInitialized(true);
      return;
    }
    if (existingProduct && !initialized) {
      setFormData(initForm(existingProduct));
      setInitialized(true);
      setColorInput(
        existingProduct.availableColors?.[0]?.name
          ? toTurkishUpper(existingProduct.availableColors[0].name)
          : '',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingProduct?.id, copySource?.id, productId, copyFromId]);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [colorInput, setColorInput] = useState('');
  const [previewImage, setPreviewImage] = useState(0);

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPendingPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  /* ── save mutation ── */
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const isEdit = !!(data as Product).id;
      const url = isEdit ? `/api/admin/products/${(data as Product).id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Kaydetme başarısız');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      navigate('/toov-admin?tab=products');
    },
  });

  /* ── logout ── */
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    },
    onSuccess: () => navigate('/toov-admin/login'),
  });

  /* ── handlers ── */
  const regenerateSlug = () => setFormData((p) => ({ ...p, slug: generateSlug(p.name) }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const removeExistingImage = (i: number) =>
    setFormData((p) => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));

  const removePendingFile = (i: number) => setPendingFiles((p) => p.filter((_, idx) => idx !== i));

  const promoteImage = (i: number) => {
    if (i === 0) return;
    setFormData((p) => {
      const imgs = [...p.images];
      const [sel] = imgs.splice(i, 1);
      imgs.unshift(sel);
      return { ...p, images: imgs };
    });
    setPreviewImage(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    let uploadedUrls: string[] = [];

    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append('images', f));
        const r = await fetch('/api/admin/upload/products', { method: 'POST', body: fd, credentials: 'include' });
        if (r.ok) {
          uploadedUrls = (await r.json()).urls;
          setPendingFiles([]);
        } else {
          setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
          setIsUploading(false);
          return;
        }
      } catch {
        setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const trimmedColor = colorInput.trim();
    const normalizedColors = trimmedColor ? [{ name: toTurkishUpper(trimmedColor), hex: null }] : [];
    const cleanAttributes: Record<string, string> = {};
    for (const [k, v] of Object.entries(formData.attributes)) {
      if (v && v.trim()) cleanAttributes[k] = v.trim();
    }

    const wholesaleEnabled = !!formData.wholesaleEnabled;
    const wholesalePriceTrimmed = String(formData.wholesalePrice || '').trim();

    // A wholesale-enabled product without a price + series is a dead-end on the PDP
    // (the "Toptan Sepete Ekle" button can never resolve a series). Block the save.
    if (wholesaleEnabled && (!wholesalePriceTrimmed || !formData.wholesaleSeriesId)) {
      setUploadError('Toptan satış açıkken adet fiyatı ve seri seçimi zorunludur.');
      return;
    }

    saveMutation.mutate({
      ...product,
      ...formData,
      slug: formData.slug || generateSlug(formData.name),
      images: [...formData.images, ...uploadedUrls],
      availableColors: normalizedColors,
      attributes: cleanAttributes,
      wholesaleEnabled,
      wholesalePrice: wholesaleEnabled && wholesalePriceTrimmed ? wholesalePriceTrimmed : null,
      wholesaleSeriesId: wholesaleEnabled && formData.wholesaleSeriesId ? formData.wholesaleSeriesId : null,
    });
  };

  /* ── derived ── */
  const wholesaleValid = !formData.wholesaleEnabled || (!!String(formData.wholesalePrice || '').trim() && !!formData.wholesaleSeriesId);
  const isValid = !!formData.name.trim() && !!formData.basePrice.trim() && formData.categoryIds.length > 0 && wholesaleValid;
  const isSaving = saveMutation.isPending;
  const totalImageCount = formData.images.length + pendingFiles.length;
  const previewImages = useMemo(() => [
    ...formData.images.map((url) => ({ url, isPending: false })),
    ...pendingPreviewUrls.map((url) => ({ url, isPending: true })),
  ], [formData.images, pendingPreviewUrls]);

  const pageTitle = productId
    ? (existingProduct?.name ? `${existingProduct.name}` : 'Ürün Düzenle')
    : 'Yeni Ürün Ekle';

  /* ── loading states ── */
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }
  if (!adminUser) return null;
  if (productId && !initialized && products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex font-sans">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <PageSidebar
        adminUser={adminUser}
        onLogout={() => logoutMutation.mutate()}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-neutral-200 px-4 md:px-6 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 hover:bg-neutral-100 rounded-md md:hidden"
          >
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
          <button
            onClick={() => navigate('/toov-admin?tab=products')}
            className="inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
            data-testid="button-back-products"
          >
            <ChevronLeft className="w-4 h-4" />
            Ürünler
          </button>
          <span className="text-neutral-300">/</span>
          <span className="text-[13px] font-semibold text-neutral-900 truncate">{pageTitle}</span>

          <div className="ml-auto flex items-center gap-2">
            {existingProduct?.slug && (
              <a
                href={`/urun/${existingProduct.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ürünü Gör</span>
              </a>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto bg-neutral-50">
          <form id="product-form" onSubmit={handleSubmit}>
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex gap-8 items-start">

              {/* ── Left: form sections ── */}
              <div className="flex-1 min-w-0 space-y-6">

                {saveMutation.isError && (
                  <InlineAlert tone="error">Ürün kaydedilemedi. Lütfen tekrar deneyin.</InlineAlert>
                )}

                {/* Section 1 — Temel Bilgiler */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading
                    number={1}
                    title="Temel Bilgiler"
                    description="Mağazada görünen başlık, kod ve URL adresini ayarlayın."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Ürün Adı" required>
                      <TextInput
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Örn: Slim Fit Erkek Jean"
                        data-testid="input-product-name"
                      />
                    </FormField>
                    <FormField label="Stok Kodu (SKU)">
                      <TextInput
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Örn: EJ-001"
                        data-testid="input-product-sku"
                      />
                    </FormField>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[12px] font-medium text-neutral-700">URL Slug</label>
                      <button
                        type="button"
                        onClick={regenerateSlug}
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
                        data-testid="button-regenerate-slug"
                      >
                        <RefreshCw className="w-3 h-3" />
                        İsimden Oluştur
                      </button>
                    </div>
                    <TextInput
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
                      }
                      placeholder="urun-adi-slug"
                      data-testid="input-product-slug"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      ecartejeans.com/urun/<span className="text-neutral-700">{formData.slug || 'slug'}</span>
                    </p>
                  </div>

                  <div className="mt-3">
                    <FormField
                      label="Kategoriler"
                      required
                      error={formData.categoryIds.length === 0 ? 'En az bir kategori seçin.' : undefined}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => {
                          const selected = formData.categoryIds.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                const newIds = selected
                                  ? formData.categoryIds.filter((id) => id !== cat.id)
                                  : [...formData.categoryIds, cat.id];
                                setFormData({ ...formData, categoryIds: newIds, categoryId: newIds[0] || '' });
                              }}
                              className={`px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors border ${
                                selected
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                              }`}
                              data-testid={`button-category-${cat.id}`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </FormField>
                  </div>
                </div>

                {/* Section 2 — Açıklama */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading number={2} title="Açıklama" />
                  <TextArea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    placeholder="Ürün açıklaması (HTML destekler)…"
                    className="font-mono text-[12px]"
                    data-testid="input-product-description"
                  />
                  {formData.description && formData.description.includes('<') && (
                    <div className="mt-2">
                      <p className="text-[11px] text-neutral-500 mb-1">Önizleme:</p>
                      <div
                        className="p-3 bg-neutral-50 border border-neutral-200 rounded-md text-[13px] text-neutral-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formData.description }}
                      />
                    </div>
                  )}
                </div>

                {/* Section 3 — Görseller */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeading number={3} title="Görseller" description="İlk görsel, ana ürün fotoğrafı olarak kullanılır." />
                    {totalImageCount > 0 && (
                      <span className="text-[11px] text-neutral-500 tabular-nums">{totalImageCount} görsel</span>
                    )}
                  </div>

                  {uploadError && (
                    <div className="mb-3"><InlineAlert tone="error">{uploadError}</InlineAlert></div>
                  )}

                  <div
                    className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                      dragOver ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="image-upload" data-testid="input-product-images" />
                    <label htmlFor="image-upload" className="cursor-pointer block">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
                      <p className="text-[13px] text-neutral-700">
                        Resimleri sürükleyip bırakın veya{' '}
                        <span className="text-neutral-900 font-medium underline underline-offset-2">seçin</span>
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1">PNG, JPG, WEBP · max 10MB</p>
                    </label>
                  </div>

                  {totalImageCount > 0 && (
                    <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {formData.images.map((image, index) => (
                        <div
                          key={`existing-${index}`}
                          className={`relative group aspect-square bg-neutral-50 rounded-md overflow-hidden border ${
                            index === 0 ? 'border-neutral-900' : 'border-neutral-200'
                          }`}
                        >
                          <img src={image} alt={`Ürün ${index + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => promoteImage(index)} />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-white border border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          {index === 0 ? (
                            <span className="absolute bottom-1 left-1 inline-flex items-center px-1.5 h-4 rounded bg-neutral-900 text-white text-[9px] font-medium uppercase tracking-wide leading-none">Ana</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => promoteImage(index)}
                              className="absolute bottom-1 left-1 inline-flex items-center px-1.5 h-4 rounded bg-white border border-neutral-200 text-neutral-700 text-[9px] font-medium leading-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-50"
                            >
                              Ana Yap
                            </button>
                          )}
                        </div>
                      ))}
                      {pendingPreviewUrls.map((url, index) => (
                        <div key={`pending-${index}`} className="relative group aspect-square bg-neutral-50 rounded-md overflow-hidden border border-emerald-300">
                          <img src={url} alt={`Yeni ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePendingFile(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-white border border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 inline-flex items-center px-1.5 h-4 rounded bg-emerald-600 text-white text-[9px] font-medium uppercase tracking-wide leading-none">Yeni</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video URL */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading number={0} title="Video" description="Trendyol'dan gelen ürün videosu. Doğrudan URL girin (mp4, m3u8, vb.)." />
                  <div className="mt-4">
                    <label className="block text-[12px] font-medium text-neutral-700 mb-1">Video URL (opsiyonel)</label>
                    <input
                      type="url"
                      placeholder="https://cdn.trendyol.com/... veya herhangi bir video linki"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData((f) => ({ ...f, videoUrl: e.target.value }))}
                      className="w-full px-3 py-2 text-[13px] border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      data-testid="input-product-video-url"
                    />
                    {formData.videoUrl && (
                      <div className="mt-3 aspect-video bg-black rounded-md overflow-hidden">
                        <video src={formData.videoUrl} controls className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4 — Beden & Renk */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading number={4} title="Beden & Renk" description="Ürünün beden ve rengini belirtin (opsiyonel)." />

                  <div className="mb-4">
                    <p className="text-[12px] font-medium text-neutral-700 mb-2">Jean Bedenleri (sayısal)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[32,33,34,35,36,37,38,39,40,41,42,43,44].map((s) => {
                        const sz = String(s);
                        const selected = formData.availableSizes.includes(sz);
                        return (
                          <button
                            key={sz} type="button"
                            onClick={() => {
                              const next = selected ? formData.availableSizes.filter((x) => x !== sz) : [...formData.availableSizes, sz];
                              setFormData({ ...formData, availableSizes: next });
                            }}
                            className={`w-10 h-9 rounded-md text-[12px] font-medium border transition-colors ${selected ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
                            data-testid={`button-size-${sz}`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-[12px] font-medium text-neutral-700 mb-2">Harf Bedenleri (XS–3XL)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['XS','S','M','L','XL','XXL','3XL'].map((s) => {
                        const selected = formData.availableSizes.includes(s);
                        return (
                          <button
                            key={s} type="button"
                            onClick={() => {
                              const next = selected ? formData.availableSizes.filter((x) => x !== s) : [...formData.availableSizes, s];
                              setFormData({ ...formData, availableSizes: next });
                            }}
                            className={`min-w-[40px] px-2 h-9 rounded-md text-[12px] font-medium border transition-colors ${selected ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
                            data-testid={`button-size-${s}`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    {formData.availableSizes.length > 0 && (
                      <p className="mt-2 text-[11px] text-neutral-500">
                        Seçili: {formData.availableSizes.join(', ')} ·{' '}
                        <button type="button" className="text-red-500 hover:underline" onClick={() => setFormData({ ...formData, availableSizes: [] })}>Temizle</button>
                      </p>
                    )}
                  </div>

                  <FormField label="Renk (otomatik büyük harf)">
                    <TextInput
                      value={colorInput}
                      onChange={(e) => setColorInput(toTurkishUpper(e.target.value))}
                      placeholder="Örn. SİYAH, BEYAZ, LACİVERT, KIRMIZI"
                      data-testid="input-product-color"
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">Boş bırakılırsa renksiz tek varyant oluşturulur.</p>
                  </FormField>
                </div>

                {/* Section 5 — Fiyat & Stok */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading
                    number={5}
                    title="Fiyat & Stok"
                    description={product?.id ? 'Stok bilgileri varyant yönetiminden ayarlanır.' : 'Yeni ürün için başlangıç stok miktarını girin.'}
                  />
                  <div className={`grid grid-cols-1 sm:${product?.id ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                    <FormField label="Fiyat (₺)" required>
                      <TextInput
                        type="text"
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                        required
                        placeholder="Örn: 1490"
                        data-testid="input-product-price"
                      />
                    </FormField>
                    {!product?.id && (
                      <FormField label="Başlangıç Stoğu" hint="Bu değer otomatik oluşturulan varyanta atanır.">
                        <TextInput
                          type="number"
                          value={formData.initialStock}
                          onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                          placeholder="Tüm varyasyonlar için"
                          min="0"
                          data-testid="input-product-stock"
                        />
                      </FormField>
                    )}
                  </div>
                </div>

                {/* Section — Toptan Satış */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading
                    title="Toptan Satış"
                    description="Toptan müşterilere seri (sabit beden dağılımı) bazlı satış için fiyat ve seri seçin."
                  />
                  <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-md bg-white cursor-pointer hover:bg-neutral-50 mb-3">
                    <div>
                      <p className="text-[13px] font-medium text-neutral-900">Toptan satışa aç</p>
                      <p className="text-[11px] text-neutral-500">Açık olduğunda toptan müşteriler bu ürünü seri olarak sipariş edebilir.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, wholesaleEnabled: !formData.wholesaleEnabled })}
                      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${formData.wholesaleEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                      aria-pressed={formData.wholesaleEnabled}
                      data-testid="toggle-wholesale-enabled"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${formData.wholesaleEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </label>
                  {formData.wholesaleEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField label="Toptan Fiyat — adet başına (₺)" required>
                        <TextInput
                          type="text"
                          value={formData.wholesalePrice}
                          onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                          placeholder="Örn: 850"
                          data-testid="input-wholesale-price"
                        />
                      </FormField>
                      <FormField label="Seri" hint="Sabit beden dağılımı. Toplam tutar = adet fiyatı × seri adedi.">
                        <SelectInput
                          value={formData.wholesaleSeriesId}
                          onChange={(e) => setFormData({ ...formData, wholesaleSeriesId: e.target.value })}
                          data-testid="select-wholesale-series"
                        >
                          <option value="">Seri seçin…</option>
                          {wholesaleSeriesList.filter((s) => s.isActive).map((s) => {
                            const total = s.sizeDistribution.reduce((sum, d) => sum + (d.quantity || 0), 0);
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name} ({total} adet)
                              </option>
                            );
                          })}
                        </SelectInput>
                      </FormField>
                    </div>
                  )}
                </div>

                {/* Section 6 — Ürün Özellikleri */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading number={6} title="Ürün Özellikleri" description="Trendyol'dan otomatik doldurulur; manuel olarak da girilebilir." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {JEANS_ATTR_KEYS.map(({ key, label, placeholder }) => (
                      <FormField key={key} label={label}>
                        <TextInput
                          type="text"
                          value={formData.attributes[key] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, attributes: { ...prev.attributes, [key]: e.target.value } }))
                          }
                          placeholder={placeholder}
                          data-testid={`input-attr-${key.replace(/\s+/g, '-').toLowerCase()}`}
                        />
                      </FormField>
                    ))}
                  </div>
                </div>

                {/* Section 7 — Görünürlük */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <SectionHeading number={7} title="Görünürlük" description="Ürünün mağazadaki yerini kontrol edin." />
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-md bg-white cursor-pointer hover:bg-neutral-50">
                      <div>
                        <p className="text-[13px] font-medium text-neutral-900">Aktif</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Pasif ürünler mağazada görünmez.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${formData.isActive ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                        aria-pressed={formData.isActive}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${formData.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </label>
                    <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-md bg-white cursor-pointer hover:bg-neutral-50">
                      <div>
                        <p className="text-[13px] font-medium text-neutral-900">Öne Çıkan</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Anasayfada öne çıkanlar arasına eklenir.</p>
                      </div>
                      <input type="checkbox" checked={formData.isFeatured} onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })} className="w-4 h-4 accent-neutral-900 shrink-0" />
                    </label>
                    <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-md bg-white cursor-pointer hover:bg-neutral-50">
                      <div>
                        <p className="text-[13px] font-medium text-neutral-900">Yeni</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Ürün kartında "Yeni" rozeti gösterilir.</p>
                      </div>
                      <input type="checkbox" checked={formData.isNew} onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })} className="w-4 h-4 accent-neutral-900 shrink-0" />
                    </label>
                  </div>
                </div>

                {/* Bottom action bar (mobile) */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3 md:hidden">
                  <GhostButton type="button" onClick={() => navigate('/toov-admin?tab=products')}>İptal</GhostButton>
                  <PrimaryButton type="submit" form="product-form" disabled={isSaving || isUploading || !isValid} data-testid="button-save-product">
                    {(isSaving || isUploading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isUploading ? 'Yükleniyor…' : isSaving ? 'Kaydediliyor…' : 'Kaydet'}
                  </PrimaryButton>
                </div>
              </div>

              {/* ── Right: sticky preview + actions ── */}
              <aside className="hidden md:flex flex-col gap-4 w-72 shrink-0 sticky top-8">
                {/* Save card */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4">
                  <p className="text-[12px] text-neutral-500 mb-3">
                    {!isValid
                      ? <span className="text-amber-700">Ürün adı, fiyat ve en az bir kategori gerekli.</span>
                      : pendingFiles.length > 0
                      ? <span>{pendingFiles.length} resim kaydederken yüklenecek</span>
                      : <span>Tüm değişiklikler kaydedilecek</span>
                    }
                  </p>
                  <div className="flex flex-col gap-2">
                    <PrimaryButton
                      type="submit"
                      form="product-form"
                      disabled={isSaving || isUploading || !isValid}
                      data-testid="button-save-product"
                    >
                      {(isSaving || isUploading) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isUploading ? 'Yükleniyor…' : isSaving ? 'Kaydediliyor…' : 'Kaydet'}
                    </PrimaryButton>
                    <GhostButton type="button" onClick={() => navigate('/toov-admin?tab=products')}>
                      İptal
                    </GhostButton>
                  </div>
                </div>

                {/* Preview card */}
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Müşteri Görünümü</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="aspect-[4/5] bg-neutral-50 border border-neutral-200 rounded-md overflow-hidden">
                      {previewImages[previewImage]?.url ? (
                        <img src={previewImages[previewImage].url} alt="Önizleme" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                    </div>

                    {previewImages.length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {previewImages.map((img, idx) => (
                          <button key={idx} type="button" onClick={() => setPreviewImage(idx)}
                            className={`w-10 h-12 rounded-md overflow-hidden shrink-0 transition-all border ${previewImage === idx ? 'border-neutral-900' : 'border-neutral-200 opacity-60 hover:opacity-100'}`}
                          >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wider">{formData.sku || 'SKU'}</p>
                      <h3 className="text-[14px] font-semibold text-neutral-900 leading-snug mt-0.5">
                        {formData.name || 'Ürün Adı'}
                      </h3>
                      <p className="text-[16px] font-semibold text-neutral-900 mt-1 tabular-nums">
                        {formData.basePrice ? `${parseFloat(formData.basePrice).toLocaleString('tr-TR')} ₺` : '0 ₺'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {formData.isActive
                          ? <StatusBadge tone="emerald">Aktif</StatusBadge>
                          : <StatusBadge tone="neutral">Pasif</StatusBadge>}
                        {formData.isFeatured && <StatusBadge tone="indigo">Öne çıkan</StatusBadge>}
                        {formData.isNew && <StatusBadge tone="blue">Yeni</StatusBadge>}
                      </div>
                    </div>

                    {colorInput.trim() && (
                      <p className="text-[11px] text-neutral-500">
                        Renk: <span className="text-neutral-900 font-medium">{toTurkishUpper(colorInput.trim())}</span>
                      </p>
                    )}

                    <button type="button" className="w-full h-9 bg-neutral-900 text-white rounded-md font-semibold text-[11px] uppercase tracking-wide opacity-50 cursor-not-allowed" disabled>
                      SEPETE EKLE
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
