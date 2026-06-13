import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { Link } from 'wouter';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface CartSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    image: string;
    price: number;
    size?: string;
    quantity: number;
  } | null;
  cartTotal: number;
  cartItemCount: number;
}

const AUTO_CLOSE_MS = 4500;

export function CartSuccessModal({ isOpen, onClose, product, cartTotal, cartItemCount }: CartSuccessModalProps) {
  const { data: config } = useQuery<{ freeShippingThreshold: number }>({
    queryKey: ['/api/config'],
    staleTime: Infinity,
  });
  const FREE_SHIPPING_THRESHOLD = config?.freeShippingThreshold ?? 500;

  const [progress, setProgress] = useState(100);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const remaining = Math.max(0, 1 - elapsed / AUTO_CLOSE_MS);
      setProgress(remaining * 100);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onClose();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, onClose]);

  if (!product) return null;

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const freeShipReached = remainingForFreeShipping === 0;
  const shippingProgress = Math.min((cartTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="cart-toast"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] w-[calc(100vw-2rem)] sm:w-[360px]"
          data-testid="toast-cart-success"
        >
          <div className="bg-[hsl(var(--polen-stone))] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[hsl(var(--polen-orange))] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.20em] uppercase text-white">
                  Sepete Eklendi
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                data-testid="button-close-toast"
                aria-label="Kapat"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>

            {/* Product row */}
            <div className="flex gap-3 px-4 py-3.5">
              <div className="w-14 h-16 shrink-0 overflow-hidden bg-white/[0.05]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <p
                  className="text-[12.5px] font-medium text-white leading-snug line-clamp-2"
                  data-testid="text-toast-product-name"
                >
                  {product.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {product.size && (
                    <span className="px-1.5 py-0.5 text-[10px] border border-white/15 text-white/60">
                      {product.size}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 text-[10px] border border-white/15 text-white/60">
                    {product.quantity} Adet
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[15px] font-bold text-white tabular-nums"
                  data-testid="text-toast-price"
                >
                  {product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </p>
              </div>
            </div>

            {/* Shipping bar */}
            <div className="px-4 pb-3.5">
              {freeShipReached ? (
                <div className="flex items-center gap-2 text-[11px] text-white">
                  <Truck className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  <span className="font-semibold">Ücretsiz Kargo Kazandınız!</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] text-white/45">
                      <Truck className="w-3 h-3 shrink-0" strokeWidth={2} />
                      <span>
                        Ücretsiz kargo için{' '}
                        <span className="font-semibold text-white/70">
                          {remainingForFreeShipping.toLocaleString('tr-TR')} ₺
                        </span>{' '}
                        daha
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-white/40">
                      <ShoppingBag className="w-3 h-3" strokeWidth={2} />
                      <span>{cartItemCount} Ürün</span>
                    </div>
                  </div>
                  <div className="h-0.5 bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--polen-orange))] transition-all duration-300"
                      style={{ width: `${shippingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 border-t border-white/[0.08]">
              <button
                onClick={onClose}
                className="px-4 py-3 text-[11px] font-semibold tracking-[0.10em] uppercase text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors border-r border-white/[0.08]"
                data-testid="button-continue-shopping"
              >
                Alışverişe Devam
              </button>
              <Link
                href="/sepet"
                onClick={onClose}
                data-testid="button-go-to-cart"
                className="flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-semibold tracking-[0.10em] uppercase text-white hover:bg-white/10 transition-colors"
              >
                Sepete Git
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </Link>
            </div>

            {/* Auto-close progress line */}
            <div className="h-[2px] bg-white/[0.05]">
              <div
                className="h-full bg-[hsl(var(--polen-orange))]/50"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
