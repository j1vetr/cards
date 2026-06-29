import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Product {
  videoUrl?: string | null;
  id: string;
  name: string;
  slug: string;
  description?: string;
  sku?: string;
  categoryId?: string;
  basePrice: string;
  images: string[];
  availableSizes: string[];
  availableColors: { name: string; hex: string | null }[];
  attributes?: Record<string, string>;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  discountBadge?: string | null;
  wholesaleEnabled?: boolean;
  wholesalePrice?: string | null;
  wholesaleSeriesId?: string | null;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  size?: string;
  color?: string;
  colorHex?: string;
  price: string;
  stock: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  displayOrder: number;
}

export interface ProductFilters {
  categoryId?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  fits?: string[];
  discounted?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface PaginatedProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FacetsResponse {
  sizes: string[];
  colors: { name: string; hex: string | null }[];
  fits: string[];
}

function buildProductParams(filters?: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters?.categoryId) params.append('categoryId', filters.categoryId);
  if (filters?.isFeatured !== undefined) params.append('isFeatured', String(filters.isFeatured));
  if (filters?.isNew !== undefined) params.append('isNew', String(filters.isNew));
  if (filters?.search) params.append('search', filters.search);
  if (filters?.minPrice !== undefined) params.append('minPrice', String(filters.minPrice));
  if (filters?.maxPrice !== undefined) params.append('maxPrice', String(filters.maxPrice));
  if (filters?.sort) params.append('sort', filters.sort);
  if (filters?.sizes && filters.sizes.length > 0) params.append('sizes', filters.sizes.join(','));
  if (filters?.colors && filters.colors.length > 0) params.append('colors', filters.colors.join(','));
  if (filters?.fits && filters.fits.length > 0) params.append('fits', filters.fits.join(','));
  if (filters?.discounted) params.append('discounted', 'true');
  if (filters?.page !== undefined) params.append('page', String(filters.page));
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
  return params;
}

export function useProducts(filters?: ProductFilters) {
  return useQuery<PaginatedProductsResponse>({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = buildProductParams(filters);
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json() as Promise<PaginatedProductsResponse>;
    },
  });
}

export function useFacets(filters?: {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  return useQuery<FacetsResponse>({
    queryKey: ['facets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.set('categoryId', filters.categoryId);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
      if (filters?.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
      const res = await fetch(`/api/products/facets?${params.toString()}`);
      if (!res.ok) return { sizes: [], colors: [], fits: [] };
      return res.json() as Promise<FacetsResponse>;
    },
    staleTime: 60_000,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['products', slug],
    queryFn: async () => {
      const response = await fetch(`/api/products/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      return response.json() as Promise<Product>;
    },
    enabled: !!slug,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json() as Promise<Category[]>;
    },
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ['categories', slug],
    queryFn: async () => {
      const response = await fetch(`/api/categories/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      return response.json() as Promise<Category>;
    },
    enabled: !!slug,
  });
}

export function useAdminProducts(search?: string) {
  return useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/admin/products${params}`);
      if (!response.ok) throw new Error('Failed to fetch admin products');
      return response.json() as Promise<Product[]>;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productData: any) => {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error('Failed to create product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete product');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });
}
