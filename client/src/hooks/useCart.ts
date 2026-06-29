import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CartItem {
  id: string;
  sessionId: string;
  productId: string | null;
  variantId: string | null;
  cardListingId: string | null;
  quantity: number;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    basePrice: string;
    images: string[];
  } | null;
  variant?: {
    id: string;
    size: string | null;
    color: string | null;
    price: string;
    condition?: string;
  } | null;
  listing?: {
    id: string;
    price: string;
    condition: string;
    stock: number;
  } | null;
  card?: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  } | null;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (productId?: string, variantId?: string, quantity?: number, opts?: { cardListingId?: string }) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
}

export const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export function useCartProvider() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<CartItem[]>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await fetch('/api/cart', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const addMutation = useMutation({
    mutationFn: async ({ productId, variantId, quantity = 1, cardListingId }: { productId?: string; variantId?: string; quantity?: number; cardListingId?: string }) => {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity, cardListingId }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Sepete eklenemedi');
      }
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Güncelleme başarısız');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Silme başarısız');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Sepet temizlenemedi');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = items.reduce((sum, item) => {
    // Card-listing: use listing price as authoritative
    if (item.cardListingId && item.listing) {
      return sum + parseFloat(item.listing.price) * item.quantity;
    }
    const price = item.variant?.price || item.product?.basePrice || '0';
    return sum + parseFloat(price) * item.quantity;
  }, 0);

  return {
    items,
    isLoading,
    addToCart: async (productId?: string, variantId?: string, quantity = 1, opts?: { cardListingId?: string }) => {
      await addMutation.mutateAsync({ productId, variantId, quantity, cardListingId: opts?.cardListingId });
      await queryClient.refetchQueries({ queryKey: ['cart'] });
    },
    updateQuantity: async (itemId: string, quantity: number) => {
      await updateMutation.mutateAsync({ itemId, quantity });
    },
    removeItem: async (itemId: string) => {
      await removeMutation.mutateAsync(itemId);
    },
    clearCart: async () => {
      await clearMutation.mutateAsync();
    },
    totalItems,
    subtotal,
  };
}
