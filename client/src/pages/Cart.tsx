import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { Minus, Plus, Trash2, ShoppingBag, Truck, Shield, RotateCcw, ArrowRight, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '@/components/SEO';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
}

const FREE_SHIPPING_THRESHOLD = 500;

export default function Cart() {
  const { items, isLoading, updateQuantity, removeItem, totalItems, subtotal } = useCart();

  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
  });
  const products = productsData?.products ?? [];

  const cartItemsWithProducts = items.map(item => {
    const product = products.find(p => p.id === item.productId) ?? item.product;
    return { ...item, product };
  });

  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 200;
  const total = subtotal + shippingCost;
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--polen-stone))]">
        <Header />
        <main className="pt-20 pb-12 px-6 flex items-center justify-center min-h-[calc(100vh-72px)]">
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white/40 text-sm"
          >
            Yükleniyor…
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--polen-stone))] overflow-x-hidden w-full">
      <SEO title="Sepetim" description="GoCards alışveriş sepetiniz." url="/sepet" noIndex />
      <Header />

      <main className="pt-20 lg:pt-8 pb-16 px-4 sm:px-6 w-full box-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-page-title">
              Sepetim
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {totalItems > 0 ? `${totalItems} ürün` : 'Sepetiniz boş'}
            </p>
          </motion.div>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <ShoppingBag className="w-9 h-9 text-white/20" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Sepetiniz Boş</h2>
              <p className="text-white/40 text-sm mb-8 max-w-xs">
                Henüz sepetinize ürün eklemediniz. Koleksiyonumuzu keşfedin.
              </p>
              <Link href="/">
                <Button
                  className="h-11 px-8 bg-[hsl(var(--polen-orange))] hover:bg-[hsl(var(--polen-orange-deep))] text-white font-semibold rounded-lg gap-2"
                  data-testid="button-continue-shopping"
                >
                  Kartlara Bak <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Sol — ürünler */}
              <div className="lg:col-span-2 space-y-3">

                {/* Ücretsiz kargo banner */}
                {remainingForFreeShipping > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/8 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--polen-orange))]/15 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4 text-[hsl(var(--polen-orange))]" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">Ücretsiz Kargoya Az Kaldı</p>
                        <p className="text-white/40 text-xs mt-0.5">
                          <span className="font-bold text-[hsl(var(--polen-orange))]">{remainingForFreeShipping.toFixed(0)} ₺</span> daha ekleyin
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${shippingProgress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-[hsl(var(--polen-orange))]"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[hsl(var(--polen-orange))]/10 border border-[hsl(var(--polen-orange))]/20 rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--polen-orange))]/20 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-[hsl(var(--polen-orange))]" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">Ücretsiz Kargo Kazandınız!</p>
                      <p className="text-white/40 text-xs mt-0.5">Siparişiniz ücretsiz kargo ile gönderilecek</p>
                    </div>
                  </motion.div>
                )}

                {/* Kargo bilgi satırı */}
                <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                  <p className="text-xs text-white/35 text-center">
                    <span className="text-white/50 font-medium">Türkiye içi:</span> 500 ₺ üzeri ücretsiz, altı 200 ₺
                    {'  ·  '}
                    <span className="text-white/50 font-medium">Uluslararası:</span> 2.500 ₺ (ödeme adımında)
                  </p>
                </div>

                {/* Ürün listesi */}
                <AnimatePresence mode="popLayout">
                  {cartItemsWithProducts.map((item, index) => {
                    const isCard = !!item.cardListingId;
                    const cardHref = isCard && item.card?.slug ? `/kart/${item.card.slug}` : null;
                    const productHref = !isCard && item.product?.slug ? `/urun/${item.product.slug}` : null;
                    const href = cardHref ?? productHref ?? '/magaza';
                    const displayName = isCard ? (item.card?.name ?? 'Kart') : (item.product?.name ?? 'Ürün');
                    const displayImage = isCard ? item.card?.imageUrl : item.product?.images?.[0];
                    const itemPrice = isCard && item.listing
                      ? parseFloat(item.listing.price) * item.quantity
                      : parseFloat(item.variant?.price || item.product?.basePrice || '0') * item.quantity;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="bg-white/5 border border-white/8 hover:border-white/15 rounded-xl transition-colors overflow-hidden"
                        data-testid={`cart-item-${item.id}`}
                      >
                        <div className="flex gap-4 p-4">
                          <Link href={href}>
                            <motion.div
                              whileHover={{ scale: 1.03 }}
                              className={`shrink-0 bg-white/5 overflow-hidden relative rounded-lg ${isCard ? 'w-[52px] h-[74px]' : 'w-20 h-24'}`}
                            >
                              {displayImage && (
                                <img
                                  src={displayImage}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </motion.div>
                          </Link>

                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <Link href={href}>
                                <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2 hover:text-white/70 transition-colors" data-testid={`text-product-name-${item.id}`}>
                                  {displayName}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {isCard && item.listing?.condition && (
                                  <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--polen-orange))]/15 text-[hsl(var(--polen-orange))] rounded-md font-medium border border-[hsl(var(--polen-orange))]/20" data-testid={`badge-condition-${item.id}`}>
                                    {item.listing.condition}
                                  </span>
                                )}
                                {!isCard && item.variant?.condition && (
                                  <span className="text-[11px] px-2 py-0.5 bg-white/8 text-white/60 rounded-md font-medium" data-testid={`badge-condition-${item.id}`}>
                                    {item.variant.condition}
                                  </span>
                                )}
                                {!isCard && item.variant?.size && (
                                  <span className="text-[11px] px-2 py-0.5 bg-white/5 text-white/40 rounded-md">
                                    Beden: {item.variant.size}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-3">
                              <div className="flex items-center bg-white/6 rounded-lg p-0.5 shrink-0">
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                                  data-testid={`button-decrease-${item.id}`}
                                >
                                  <Minus className="w-3 h-3" />
                                </motion.button>
                                <span className="w-7 text-center text-sm font-semibold text-white" data-testid={`text-quantity-${item.id}`}>
                                  {item.quantity}
                                </span>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                                  data-testid={`button-increase-${item.id}`}
                                >
                                  <Plus className="w-3 h-3" />
                                </motion.button>
                              </div>
                              <p className="font-bold text-base text-white shrink-0" data-testid={`text-price-${item.id}`}>
                                {itemPrice.toLocaleString('tr-TR')} ₺
                              </p>
                            </div>
                          </div>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors self-start shrink-0"
                            data-testid={`button-remove-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Sağ — sipariş özeti */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/8 rounded-xl p-5 sticky top-24"
                >
                  <h2 className="text-base font-bold text-white mb-5">Sipariş Özeti</h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/45">Ara Toplam ({totalItems} ürün)</span>
                      <span className="font-semibold text-white" data-testid="text-subtotal">{subtotal.toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/45">Kargo</span>
                      <span data-testid="text-shipping" className={shippingCost === 0 ? 'text-emerald-400 font-semibold' : 'text-white font-semibold'}>
                        {shippingCost === 0 ? 'ÜCRETSİZ' : `${shippingCost.toLocaleString('tr-TR')} ₺`}
                      </span>
                    </div>
                    <div className="h-px bg-white/8 my-1" />
                    <div className="flex justify-between">
                      <span className="font-bold text-white">Toplam</span>
                      <span className="font-bold text-xl text-white" data-testid="text-total">{total.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>

                  <Link href="/odeme">
                    <Button
                      className="w-full h-12 mt-6 bg-[hsl(var(--polen-orange))] hover:bg-[hsl(var(--polen-orange-deep))] text-white font-bold text-sm rounded-lg gap-2 transition-colors"
                      data-testid="button-checkout"
                    >
                      Ödemeye Geç <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Link href="/">
                    <Button
                      variant="ghost"
                      className="w-full mt-2 text-sm text-white/30 hover:text-white/60 hover:bg-white/5 rounded-lg"
                      data-testid="button-continue"
                    >
                      Alışverişe Devam Et
                    </Button>
                  </Link>

                  <div className="mt-5 pt-5 border-t border-white/8 space-y-2.5">
                    {[
                      { icon: Shield, text: 'Güvenli Ödeme — 256-bit SSL' },
                      { icon: RotateCcw, text: 'Orijinal Kart Garantisi' },
                      { icon: Package, text: 'Hızlı Kargo — 1–2 İş Günü' },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-2.5 text-xs text-white/30">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
