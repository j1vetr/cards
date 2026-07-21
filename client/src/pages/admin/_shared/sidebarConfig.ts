import {
  LayoutDashboard,
  BarChart3,
  Package,
  Grid3x3,
  Warehouse,
  ShoppingCart,
  Users,
  Menu as MenuIcon,
  Settings,
  Database,
  Ticket,
  MessageSquare,
  RefreshCw,
  Layers,
  BookOpen,
  ShoppingBag,
  Box,
} from 'lucide-react';
import type { SidebarCategory } from '../_layout/AdminLayout';
import type { TabType } from './types';

export const VALID_TABS: TabType[] = [
  'dashboard',
  'orders',
  'users',
  'analytics',
  'inventory',
  'settings',
  'database',
  'menu',
  'coupons',
  'reviews',
  'card-api-sync',
  'cards',
  'card-sets',
  'accessories',
  'boxes',
];

export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    title: 'Genel',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'analytics', icon: BarChart3, label: 'Analitik' },
    ],
  },
  {
    title: 'TCG Kataloğu',
    items: [
      { id: 'cards', icon: Layers, label: 'Kartlar' },
      { id: 'card-sets', icon: BookOpen, label: 'Kart Setleri' },
      { id: 'card-api-sync', icon: RefreshCw, label: 'Kart API Sync' },
      { id: 'accessories', icon: ShoppingBag, label: 'Aksesuarlar' },
      { id: 'boxes', icon: Box, label: 'Box & Sealed' },
    ],
  },
  {
    title: 'Satış & Siparişler',
    items: [
      { id: 'orders', icon: ShoppingCart, label: 'Siparişler' },
      { id: 'inventory', icon: Warehouse, label: 'Stok Yönetimi' },
      { id: 'coupons', icon: Ticket, label: 'Kuponlar' },
    ],
  },
  {
    title: 'Müşteriler',
    items: [
      { id: 'users', icon: Users, label: 'Kullanıcılar' },
      { id: 'reviews', icon: MessageSquare, label: 'Yorumlar' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { id: 'menu', icon: MenuIcon, label: 'Menü Yönetimi' },
      { id: 'settings', icon: Settings, label: 'Ayarlar' },
      { id: 'database', icon: Database, label: 'Veritabanı' },
    ],
  },
];

export const ALL_SIDEBAR_ITEMS = SIDEBAR_CATEGORIES.flatMap((c) => c.items);

export function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'processing':
      return 'bg-blue-500/20 text-blue-400';
    case 'shipped':
      return 'bg-purple-500/20 text-purple-400';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-yellow-500/20 text-yellow-400';
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Tamamlandı';
    case 'processing':
      return 'İşleniyor';
    case 'shipped':
      return 'Kargoda';
    case 'cancelled':
      return 'İptal';
    default:
      return 'Beklemede';
  }
}
