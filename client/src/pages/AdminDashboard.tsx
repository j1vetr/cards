import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

import OrdersTab from './admin/OrdersTab';
import AdminLayout from './admin/_layout/AdminLayout';

import DashboardTab from './admin/DashboardTab';
import UsersTab from './admin/UsersTab';
import AnalyticsTab from './admin/AnalyticsTab';
import InventoryTab from './admin/InventoryTab';
import SettingsTab from './admin/SettingsTab';
import DatabaseTab from './admin/DatabaseTab';
import MenuTab from './admin/MenuTab';
import CouponsTab from './admin/CouponsTab';
import ReviewsTab from './admin/ReviewsTab';
import CardApiSyncTab from './admin/CardApiSyncTab';
import CardsTab from './admin/CardsTab';
import CardSetsTab from './admin/CardSetsTab';
import AccessoriesTab from './admin/AccessoriesTab';

import UserDetailModal from './admin/modals/UserDetailModal';

import type { User, TabType } from './admin/_shared/types';
import {
  VALID_TABS,
  SIDEBAR_CATEGORIES,
  ALL_SIDEBAR_ITEMS,
  getStatusLabel,
} from './admin/_shared/sidebarConfig';
import { useAdminDashboardData } from './admin/_shared/useAdminDashboardData';
import { usePendingReviewsCount } from '@/hooks/useReviews';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return tab && VALID_TABS.includes(tab as TabType) ? (tab as TabType) : 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  const data = useAdminDashboardData({
    searchQuery,
    onLoggedOut: () => setLocation('/toov-admin/login'),
    onProductSaved: () => {},
    onCategorySaved: () => {},
  });

  const {
    adminUser,
    userLoading,
    stats,
    statsLoading,
    statsError,
    products,
    productsLoading,
    productsError,
    categories,
    orders,
    ordersLoading,
    ordersError,
    refetchOrders,
    users,
    logoutMutation,
    deleteUserMutation,
  } = data;

  useEffect(() => {
    if (activeTab === 'orders' && adminUser) refetchOrders();
  }, [activeTab, adminUser, refetchOrders]);

  useEffect(() => {
    if (!userLoading && !adminUser) setLocation('/toov-admin/login');
  }, [adminUser, userLoading, setLocation]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url.toString());
  };

  const { data: pendingReviewsData } = usePendingReviewsCount(!!adminUser);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[13px] text-neutral-500">Yükleniyor...</div>
      </div>
    );
  }
  if (!adminUser) return null;

  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'confirmed',
  ).length;
  const pendingReviewsCount = pendingReviewsData?.count ?? 0;
  const pageTitle = ALL_SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.label ?? '';

  return (
    <>
      <AdminLayout
        adminUser={adminUser}
        sidebarCategories={SIDEBAR_CATEGORIES}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={() => logoutMutation.mutate()}
        pendingOrdersCount={pendingOrdersCount}
        pendingReviewsCount={pendingReviewsCount}
        pageTitle={pageTitle}
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            orders={orders}
            products={products}
            getStatusLabel={getStatusLabel}
            onNavigate={handleTabChange}
            statsLoading={statsLoading}
            ordersLoading={ordersLoading}
            productsLoading={productsLoading}
            statsError={statsError}
            ordersError={ordersError}
            productsError={productsError}
          />
        )}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setViewingUser={setViewingUser}
            deleteUserMutation={deleteUserMutation}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'database' && <DatabaseTab />}
        {activeTab === 'menu' && <MenuTab categories={categories} />}
        {activeTab === 'coupons' && <CouponsTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'card-api-sync' && <CardApiSyncTab />}
        {activeTab === 'cards' && <CardsTab />}
        {activeTab === 'card-sets' && <CardSetsTab />}
        {activeTab === 'accessories' && <AccessoriesTab />}
      </AdminLayout>

      {viewingUser && <UserDetailModal user={viewingUser} onClose={() => setViewingUser(null)} />}
    </>
  );
}
