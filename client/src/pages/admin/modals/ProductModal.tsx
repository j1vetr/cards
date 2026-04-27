import { useState, useEffect, useMemo } from 'react';
import { X, Upload, ImageIcon, Loader2, Plus, Trash2, Sparkles, Wand2, ChevronDown, ChevronUp, Edit, Check, GripVertical, Package, Eye, RefreshCw } from 'lucide-react';
import type { Product, ProductDraft, Category } from '../_shared/types';
import AdminModal from '../_ui/AdminModal';

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

const COLOR_OPTIONS = [
  { name: 'Siyah', hex: '#000000' },
  { name: 'Beyaz', hex: '#FFFFFF' },
  { name: 'Gri', hex: '#6B7280' },
  { name: 'Lacivert', hex: '#1E3A5F' },
  { name: 'Kırmızı', hex: '#EF4444' },
  { name: 'Mavi', hex: '#3B82F6' },
  { name: 'Yeşil', hex: '#22C55E' },
  { name: 'Sarı', hex: '#EAB308' },
  { name: 'Turuncu', hex: '#F97316' },
  { name: 'Mor', hex: '#A855F7' },
  { name: 'Pembe', hex: '#EC4899' },
  { name: 'Kahverengi', hex: '#92400E' },
  { name: 'Bej', hex: '#D4C4A8' },
  { name: 'Bordo', hex: '#7C2D12' },
  { name: 'Antrasit', hex: '#374151' },
  { name: 'Haki', hex: '#6B8E23' },
];

export default function ProductModal({ 
  product, 
  categories, 
  onClose, 
  onSave, 
  isSaving 
}: { 
  product: Product | ProductDraft | null; 
  categories: Category[];
  onClose: () => void; 
  onSave: (product: Partial<Product>) => void;
  isSaving: boolean;
}) {
  const generateSlug = (name: string) => {
    const turkishMap: { [key: string]: string } = {
      'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
    };
    return name
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    sku: product?.sku || '',
    basePrice: product?.basePrice || '',
    categoryId: product?.categoryId || '',
    categoryIds: product?.categoryIds || (product?.categoryId ? [product.categoryId] : []) as string[],
    images: product?.images || [] as string[],
    availableSizes: product?.availableSizes || [],
    availableColors: product?.availableColors || [],
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    isNew: product?.isNew ?? false,
    initialStock: '',
  });
  
  const regenerateSlug = () => {
    setFormData(prev => ({ ...prev, slug: generateSlug(prev.name) }));
  };

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // AI Description Generation
  const [aiStyle, setAiStyle] = useState<string>('professional');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  const aiStyles = [
    { id: 'professional', name: 'Profesyonel', description: 'Kurumsal ve güvenilir ton' },
    { id: 'energetic', name: 'Enerjik', description: 'Dinamik ve motive edici' },
    { id: 'minimal', name: 'Minimal', description: 'Kısa ve öz' },
    { id: 'luxury', name: 'Lüks', description: 'Premium ve sofistike' },
    { id: 'natural', name: 'Doğal', description: 'Anadolu mirası ve el işçiliği vurgusu' },
  ];
  
  const generateAIDescription = async () => {
    if (!product?.id) {
      alert('Önce ürünü kaydedin, ardından AI açıklaması oluşturabilirsiniz.');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ style: aiStyle }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'AI açıklaması oluşturulamadı');
      }
      
      const data = await res.json();
      setAiPreview(data.description);
    } catch (error) {
      console.error('AI generation error:', error);
      alert(error instanceof Error ? error.message : 'AI açıklaması oluşturulamadı');
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  const applyAIDescription = () => {
    if (aiPreview) {
      setFormData({ ...formData, description: aiPreview });
      setAiPreview(null);
      setShowAiPanel(false);
    }
  };
  
  const [previewSize, setPreviewSize] = useState<string | null>(formData.availableSizes[0] || null);
  const [previewColor, setPreviewColor] = useState<{name: string; hex: string} | null>(formData.availableColors[0] || null);
  const [previewImage, setPreviewImage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const toggleSize = (size: string) => {
    setFormData(prev => {
      const isRemoving = prev.availableSizes.includes(size);
      const newSizes = isRemoving
        ? prev.availableSizes.filter(s => s !== size)
        : [...prev.availableSizes, size];
      
      if (isRemoving && previewSize === size) {
        setPreviewSize(newSizes[0] || null);
      } else if (!isRemoving && newSizes.length === 1) {
        setPreviewSize(size);
      }
      
      return { ...prev, availableSizes: newSizes };
    });
  };

  const toggleColor = (color: { name: string; hex: string }) => {
    setFormData(prev => {
      const isRemoving = prev.availableColors.some(c => c.name === color.name);
      const newColors = isRemoving
        ? prev.availableColors.filter(c => c.name !== color.name)
        : [...prev.availableColors, color];
      
      if (isRemoving && previewColor?.name === color.name) {
        setPreviewColor(newColors[0] || null);
      } else if (!isRemoving && newColors.length === 1) {
        setPreviewColor(color);
      }
      
      return { ...prev, availableColors: newColors };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setPendingFiles(prev => [...prev, ...files]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    
    let uploadedUrls: string[] = [];
    
    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        const formDataUpload = new FormData();
        pendingFiles.forEach(file => formDataUpload.append('images', file));
        
        const response = await fetch('/api/admin/upload/products', {
          method: 'POST',
          body: formDataUpload,
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          uploadedUrls = data.urls;
          setPendingFiles([]);
        } else {
          setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
          setIsUploading(false);
          return;
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadError('Resim yüklenemedi. Lütfen tekrar deneyin.');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }
    
    onSave({
      ...product,
      ...formData,
      slug: formData.slug || generateSlug(formData.name),
      images: [...formData.images, ...uploadedUrls],
    });
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
      size="xl"
      testId="modal-product"
      headerActions={
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            showPreview
              ? 'bg-neutral-900 text-white hover:bg-neutral-800'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
          data-testid="button-toggle-preview"
        >
          <Eye className="w-3.5 h-3.5" />
          Önizleme
        </button>
      }
    >
        <div className={`flex ${showPreview ? 'flex-row' : 'flex-col'} -mx-6 -my-5`}>
        <form onSubmit={handleSubmit} className={`p-6 space-y-4 ${showPreview ? 'w-1/2 border-r border-neutral-200' : 'w-full'}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Ürün Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-zinc-500"
                required
                data-testid="input-product-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Stok Kodu (SKU)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-zinc-500"
                placeholder="Örn: HNK-001"
                data-testid="input-product-sku"
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-500">URL Slug</label>
              <button
                type="button"
                onClick={regenerateSlug}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200 hover:bg-zinc-600 text-neutral-900 text-xs font-medium rounded-lg transition-all"
                data-testid="button-regenerate-slug"
              >
                <RefreshCw className="w-3 h-3" />
                İsimden Oluştur
              </button>
            </div>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-zinc-500"
              placeholder="urun-adi-slug"
              data-testid="input-product-slug"
            />
            <p className="text-xs text-neutral-500 mt-1">Site URL'sinde görünecek: polenstone.com.tr/urun/{formData.slug || 'slug'}</p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-500">Açıklama</label>
              {product?.id && (
                <button
                  type="button"
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-neutral-900 text-xs font-medium rounded-lg transition-all"
                  data-testid="button-ai-description"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI ile Oluştur
                </button>
              )}
            </div>
            
            {showAiPanel && (
              <div className="mb-3 p-4 bg-neutral-100 border border-purple-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                  <Wand2 className="w-4 h-4" />
                  AI Açıklama Oluşturucu
                </div>
                
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">Yazım Stili</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {aiStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setAiStyle(style.id)}
                        className={`px-2 py-1.5 text-xs rounded-lg transition-all ${
                          aiStyle === style.id
                            ? 'bg-purple-600 text-neutral-900'
                            : 'bg-neutral-200 text-neutral-700 hover:bg-zinc-600'
                        }`}
                        title={style.description}
                        data-testid={`button-ai-style-${style.id}`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={generateAIDescription}
                  disabled={isGeneratingAI}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 text-sm font-medium rounded-lg transition-all"
                  data-testid="button-ai-generate"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Açıklama Oluştur
                    </>
                  )}
                </button>
                
                {aiPreview && (
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-500">Önizleme:</div>
                    <div 
                      className="p-3 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-700 max-h-40 overflow-y-auto prose prose-sm prose-invert"
                      dangerouslySetInnerHTML={{ __html: aiPreview }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={applyAIDescription}
                        className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-neutral-900 text-xs font-medium rounded-lg transition-colors"
                        data-testid="button-ai-apply"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" />
                        Uygula
                      </button>
                      <button
                        type="button"
                        onClick={generateAIDescription}
                        disabled={isGeneratingAI}
                        className="flex-1 px-3 py-1.5 bg-neutral-200 hover:bg-zinc-600 text-neutral-900 text-xs font-medium rounded-lg transition-colors"
                        data-testid="button-ai-regenerate"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                        Yeniden Oluştur
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAiPreview(null); setShowAiPanel(false); }}
                        className="px-3 py-1.5 bg-neutral-200 hover:bg-zinc-600 text-neutral-900 text-xs font-medium rounded-lg transition-colors"
                        data-testid="button-ai-cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-zinc-500 font-mono text-sm"
              placeholder="Ürün açıklaması (HTML destekler)..."
              data-testid="input-product-description"
            />
            {formData.description && formData.description.includes('<') && (
              <div className="mt-2">
                <div className="text-xs text-neutral-500 mb-1">Önizleme:</div>
                <div 
                  className="p-3 bg-neutral-100 border border-neutral-200 rounded-lg text-sm text-neutral-700 prose prose-sm prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formData.description }}
                />
              </div>
            )}
          </div>
          
          <div className={`grid ${!product ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Fiyat (₺)</label>
              <input
                type="text"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-zinc-500"
                required
                data-testid="input-product-price"
              />
            </div>
            {!product && (
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">Başlangıç Stoğu</label>
                <input
                  type="number"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  placeholder="Tüm varyasyonlar için"
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-zinc-500"
                  min="0"
                  data-testid="input-product-stock"
                />
                <p className="text-xs text-neutral-500 mt-1">Tüm beden/renk kombinasyonlarına uygulanır</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-2">Kategoriler</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      const newIds = formData.categoryIds.includes(cat.id)
                        ? formData.categoryIds.filter(id => id !== cat.id)
                        : [...formData.categoryIds, cat.id];
                      setFormData({
                        ...formData,
                        categoryIds: newIds,
                        categoryId: newIds[0] || ''
                      });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.categoryIds.includes(cat.id)
                        ? 'bg-white text-black'
                        : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-200'
                    }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              {formData.categoryIds.length === 0 && (
                <p className="text-xs text-red-400 mt-1">En az bir kategori seçin</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Bedenler</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.availableSizes.includes(size)
                      ? 'bg-white text-black'
                      : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-200'
                  }`}
                  data-testid={`button-size-${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Renkler</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    formData.availableColors.some(c => c.name === color.name)
                      ? 'bg-neutral-200 ring-2 ring-white'
                      : 'bg-neutral-50 hover:bg-neutral-200'
                  }`}
                  data-testid={`button-color-${color.name}`}
                >
                  <span 
                    className="w-4 h-4 rounded-full border border-zinc-600" 
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-neutral-700">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">Ürün Resimleri</label>
            
            {uploadError && (
              <div className="mb-3 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-400 text-sm">
                {uploadError}
              </div>
            )}
            
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-white bg-neutral-50' : 'border-neutral-200 hover:border-zinc-500'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
                data-testid="input-product-images"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-500" />
                <p className="text-sm text-neutral-500">
                  Resimleri sürükleyip bırakın veya <span className="text-neutral-900 underline">seçin</span>
                </p>
                <p className="text-xs text-neutral-500 mt-1">PNG, JPG, WEBP (max 10MB)</p>
              </label>
            </div>

            {(formData.images.length > 0 || pendingFiles.length > 0) && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {formData.images.map((image, index) => (
                  <div key={`existing-${index}`} className="relative group aspect-square">
                    <img
                      src={image}
                      alt={`Ürün ${index + 1}`}
                      className={`w-full h-full object-cover rounded-lg cursor-pointer transition-all ${
                        index === 0 ? 'ring-2 ring-white' : 'hover:ring-2 hover:ring-zinc-500'
                      }`}
                      onClick={() => {
                        if (index !== 0) {
                          const newImages = [...formData.images];
                          const [selected] = newImages.splice(index, 1);
                          newImages.unshift(selected);
                          setFormData({ ...formData, images: newImages });
                        }
                      }}
                      title={index === 0 ? 'Ana fotoğraf' : 'Ana fotoğraf olarak ayarla'}
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 ? (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-white text-black px-1.5 py-0.5 rounded font-medium">
                        Ana
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = [...formData.images];
                          const [selected] = newImages.splice(index, 1);
                          newImages.unshift(selected);
                          setFormData({ ...formData, images: newImages });
                        }}
                        className="absolute bottom-1 left-1 text-[10px] bg-neutral-200 text-neutral-900 px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-600"
                      >
                        Ana Yap
                      </button>
                    )}
                  </div>
                ))}
                {pendingFiles.map((file, index) => (
                  <div key={`pending-${index}`} className="relative group aspect-square">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Yeni ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg ring-2 ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-green-600 text-neutral-900 px-1.5 py-0.5 rounded font-medium">
                      Yeni
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-6">
            {/* Active/Inactive Toggle Switch */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500">Ürün Durumu:</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  formData.isActive ? 'bg-emerald-500' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${
                    formData.isActive ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${formData.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                {formData.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            
            <label className="flex items-center gap-2 text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded bg-neutral-200 border-zinc-600"
              />
              Öne Çıkan
            </label>
            <label className="flex items-center gap-2 text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                className="w-4 h-4 rounded bg-neutral-200 border-zinc-600"
              />
              Yeni
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-neutral-50 text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              data-testid="button-save-product"
            >
              {(isSaving || isUploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUploading ? 'Yükleniyor...' : isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
        
        {showPreview && (
          <div className="w-1/2 p-6 bg-white/50 max-h-[calc(90vh-80px)] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-sm py-2 mb-4 -mt-2 z-10">
              <h4 className="text-sm font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Müşteri Görünümü Önizlemesi
              </h4>
            </div>
            
            <div className="space-y-6">
              {(formData.images.length > 0 || pendingFiles.length > 0) && (
                <div className="space-y-3">
                  <div className="aspect-[4/5] bg-neutral-50 rounded-xl overflow-hidden">
                    {formData.images[previewImage] ? (
                      <img 
                        src={formData.images[previewImage]} 
                        alt="Önizleme" 
                        className="w-full h-full object-cover"
                      />
                    ) : pendingFiles[0] ? (
                      <img 
                        src={URL.createObjectURL(pendingFiles[0])} 
                        alt="Yeni" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <Package className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  {formData.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {formData.images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewImage(idx)}
                          className={`w-16 h-20 rounded-lg overflow-hidden shrink-0 transition-all ${
                            previewImage === idx ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                  {formData.sku || 'SKU'}
                </p>
                <h3 className="text-xl font-bold text-neutral-900">
                  {formData.name || 'Ürün Adı'}
                </h3>
                <p className="text-2xl font-bold text-neutral-900 mt-2">
                  {formData.basePrice ? `${parseFloat(formData.basePrice).toLocaleString('tr-TR')} ₺` : '0 ₺'}
                </p>
              </div>
              
              {formData.availableColors.length > 0 && (
                <div>
                  <p className="text-sm text-neutral-500 mb-2">
                    Renk: <span className="text-neutral-900">{previewColor?.name || formData.availableColors[0]?.name}</span>
                  </p>
                  <div className="flex gap-2">
                    {formData.availableColors.map((color) => {
                      const isSelected = previewColor?.name === color.name || (!previewColor && color.name === formData.availableColors[0]?.name);
                      const isLight = color.hex === '#FFFFFF' || color.hex === '#D4C4A8';
                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setPreviewColor(color)}
                          className={`w-8 h-8 rounded-full transition-all ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''} ${isLight ? 'border border-zinc-600' : ''}`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {formData.availableSizes.length > 0 && (
                <div>
                  <p className="text-sm text-neutral-500 mb-2">
                    Beden: <span className="text-neutral-900">{previewSize || formData.availableSizes[0]}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.availableSizes.map((size) => {
                      const isSelected = previewSize === size || (!previewSize && size === formData.availableSizes[0]);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setPreviewSize(size)}
                          className={`min-w-[48px] h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                            isSelected 
                              ? 'bg-white text-black' 
                              : 'bg-neutral-50 text-neutral-900 hover:bg-neutral-200'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {formData.description && (
                <div>
                  <p className="text-sm text-neutral-500 mb-2">Açıklama</p>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {formData.description}
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 h-12 bg-white text-black rounded-xl font-bold text-sm"
                  disabled
                >
                  SEPETE EKLE
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-neutral-100 rounded-lg border border-neutral-200/50">
                <p className="text-xs text-neutral-500">
                  Bu önizleme, müşterilerin ürün sayfasında göreceği görünümü yansıtır. 
                  Kaydet'e tıkladığınızda seçtiğiniz bedenler ve renkler ürün sayfasında görünecektir.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
    </AdminModal>
  );
}
