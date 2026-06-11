import { useState, useEffect } from 'react';
import { X, Minus, Plus, Loader2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { useCartModal } from '@/hooks/useCartModal';
import { getOriginalPrice } from '@/lib/discountPrice';

interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: string;
  stock: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
  discountBadge?: string | null;
  variants?: ProductVariant[];
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { showModal } = useCartModal();

  // Auto-select the first in-stock variant when the product/modal changes
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setCurrentImageIndex(0);
      const first =
        product.variants?.find((v) => v.isActive && v.stock > 0) ??
        product.variants?.find((v) => v.isActive);
      setSelectedSize(first?.size ?? null);
      setSelectedColor(first?.color ?? null);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!product) return null;

  const price = parseFloat(product.basePrice || '0');
  const originalPrice = getOriginalPrice(price, product.discountBadge);

  // Derive the matched variant from the two independent size/color selections
  const selectedVariant =
    product.variants?.find(
      (v) =>
        v.isActive &&
        (selectedSize === null || v.size === selectedSize) &&
        (selectedColor === null || v.color === selectedColor)
    ) ?? null;

  const hasVariants = !!product.variants && product.variants.length > 0;
  const totalStock = product.variants?.reduce((s, v) => s + (v.stock || 0), 0) ?? 0;
  const isOutOfStock = hasVariants && totalStock === 0;
  const needsSelection = hasVariants && !selectedVariant;

  const sizes = hasVariants
    ? [...new Set(product.variants!.filter((v) => v.size).map((v) => v.size!))]
    : [];
  const colors = hasVariants
    ? [...new Set(product.variants!.filter((v) => v.color).map((v) => v.color!))]
    : [];

  const handleAddToCart = async () => {
    if (needsSelection) return;
    setIsAdding(true);
    try {
      await addToCart(product.id, selectedVariant?.id, quantity);
      showModal({
        name: product.name,
        image: product.images[0],
        price: price * quantity,
        quantity,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-black/8"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/6 flex items-center justify-center hover:bg-black/12 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5 text-black/60" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square md:aspect-auto md:h-full bg-stone-100">
                <img
                  src={product.images[currentImageIndex] || '/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {product.images.slice(0, 5).map((img, index) => (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-12 h-12 overflow-hidden border-2 transition-colors ${
                          currentImageIndex === index
                            ? 'border-black'
                            : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 md:p-8 flex flex-col">
                <h2 className="font-display text-2xl md:text-3xl tracking-wide mb-2 text-black">
                  {product.name}
                </h2>

                <div className="flex items-baseline gap-3 mb-6">
                  {originalPrice && (
                    <span className="text-lg text-black/30 line-through">
                      {originalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                    </span>
                  )}
                  <p className="text-2xl font-bold text-black">
                    {price.toLocaleString('tr-TR')} ₺
                  </p>
                </div>

                {/* Beden seçici */}
                {sizes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black mb-2">
                      Beden
                      {selectedSize && (
                        <span className="ml-2 text-black/50 normal-case font-normal tracking-normal">
                          {selectedSize}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => {
                        const isSelected = selectedSize === size;
                        const isAvailable = selectedColor
                          ? product.variants!.some(v => v.size === size && v.color === selectedColor && v.stock > 0 && v.isActive)
                          : product.variants!.some(v => v.size === size && v.stock > 0 && v.isActive);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setSelectedSize(size);
                              if (selectedColor) {
                                const keepColor = product.variants!.some(v => v.size === size && v.color === selectedColor && v.isActive);
                                if (!keepColor) {
                                  const bestColor = product.variants!.find(v => v.size === size && v.isActive && v.stock > 0)?.color ?? null;
                                  setSelectedColor(bestColor);
                                }
                              }
                            }}
                            disabled={!isAvailable}
                            className={`min-w-[40px] h-9 px-3 text-[11px] font-medium border transition-all ${
                              isSelected
                                ? 'border-black bg-black text-white'
                                : isAvailable
                                  ? 'border-black/20 text-black hover:border-black'
                                  : 'border-black/10 text-black/25 line-through cursor-not-allowed'
                            }`}
                            data-testid={`qv-size-${size}`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Renk seçici */}
                {colors.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black mb-2">
                      Renk
                      {selectedColor && (
                        <span className="ml-2 text-black/50 normal-case font-normal tracking-normal">
                          {selectedColor}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => {
                        const isSelected = selectedColor === color;
                        const isAvailable = selectedSize
                          ? product.variants!.some(v => v.color === color && v.size === selectedSize && v.stock > 0 && v.isActive)
                          : product.variants!.some(v => v.color === color && v.stock > 0 && v.isActive);
                        const hex = product.variants!.find(v => v.color === color)?.colorHex;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setSelectedColor(color);
                              if (selectedSize) {
                                const keepSize = product.variants!.some(v => v.color === color && v.size === selectedSize && v.isActive);
                                if (!keepSize) {
                                  const bestSize = product.variants!.find(v => v.color === color && v.isActive && v.stock > 0)?.size ?? null;
                                  setSelectedSize(bestSize);
                                }
                              }
                            }}
                            disabled={!isAvailable}
                            title={color}
                            className={`relative h-8 px-3 text-[11px] font-medium border transition-all flex items-center gap-2 ${
                              isSelected
                                ? 'border-black bg-black text-white'
                                : isAvailable
                                  ? 'border-black/20 text-black hover:border-black'
                                  : 'border-black/10 text-black/25 cursor-not-allowed'
                            }`}
                            data-testid={`qv-color-${color}`}
                          >
                            {hex && (
                              <span
                                className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                                style={{ backgroundColor: hex }}
                              />
                            )}
                            {color}
                            {!isAvailable && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="w-full h-px bg-black/25 rotate-45 absolute" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                {!hasVariants && (
                  <div className="mb-6">
                    <p className="text-xs text-black/45 mb-3 uppercase tracking-wider">Adet</p>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 border border-black/15 flex items-center justify-center hover:border-black/50 transition-colors"
                        aria-label="Azalt"
                      >
                        <Minus className="w-4 h-4 text-black/60" />
                      </button>
                      <span className="text-xl font-medium w-8 text-center text-black tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-10 h-10 border border-black/15 flex items-center justify-center hover:border-black/50 transition-colors"
                        aria-label="Artır"
                      >
                        <Plus className="w-4 h-4 text-black/60" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-black/8">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding || isOutOfStock || needsSelection}
                    className={`w-full py-4 font-bold tracking-wider uppercase flex items-center justify-center gap-3 transition-colors ${
                      isOutOfStock
                        ? 'bg-black/8 text-black/35 cursor-not-allowed'
                        : needsSelection
                          ? 'bg-black/8 text-black/35 cursor-not-allowed'
                          : 'bg-black text-white hover:bg-polen-orange'
                    } disabled:cursor-not-allowed`}
                    data-testid="qv-button-add-to-cart"
                  >
                    {isAdding ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-5 h-5" />
                    )}
                    {isAdding
                      ? 'Ekleniyor...'
                      : isOutOfStock
                        ? 'Tükendi'
                        : needsSelection
                          ? 'Beden / Renk Seçin'
                          : 'Sepete Ekle'}
                  </button>

                  <a
                    href={`/urun/${product.slug}`}
                    className="block text-center text-sm text-black/50 hover:text-polen-orange mt-4 transition-colors"
                  >
                    Ürün Detaylarını Gör →
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
