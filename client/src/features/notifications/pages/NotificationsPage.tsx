import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Filter,
  Settings,
  Inbox,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { NotificationCategory } from '../types/notifications.types';
import { NotificationItem } from '../components/NotificationItem';
import { NotificationPreferencesForm } from '../components/NotificationPreferencesForm';

export const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [selectedCategory, setSelectedCategory] = useState<
    NotificationCategory | 'ALL'
  >('ALL');
  const [page, setPage] = useState(1);
  const [showPreferences, setShowPreferences] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['notifications', { tab: activeTab, category: selectedCategory, page }],
    queryFn: () =>
      notificationsApi.getNotifications({
        page,
        limit: 15,
        status: activeTab === 'unread' ? 'unread' : undefined,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      }),
    placeholderData: (prev) => prev,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const categories: Array<{ id: NotificationCategory | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'ORDER', label: 'Orders' },
    { id: 'PAYMENT', label: 'Payments' },
    { id: 'SHIPPING', label: 'Shipping' },
    { id: 'REVIEW', label: 'Reviews' },
    { id: 'RETURN', label: 'Returns' },
    { id: 'REFUND', label: 'Refunds' },
    { id: 'INVENTORY', label: 'Inventory' },
  ];

  const notifications = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Notifications
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Stay updated on your orders, payments, shipments, and account activity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-indigo-400" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              showPreferences
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Main Notifications Feed */}
        <div className={showPreferences ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            {/* Tabs (All / Unread) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 w-fit">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setActiveTab('unread');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'unread'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-800/60">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    selectedCategory === cat.id
                      ? 'bg-slate-800 text-indigo-400 border-indigo-500/50'
                      : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-800/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center rounded-2xl bg-slate-900/30 border border-slate-800/60 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No notifications found</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {activeTab === 'unread'
                  ? "You're all caught up! There are no unread notifications."
                  : 'You have no notifications matching the selected filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage || isPlaceholderData}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage || isPlaceholderData}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preferences Drawer / Card */}
        {showPreferences && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 h-fit shadow-lg shadow-black/40">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Notification Settings
                </h3>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-2">
              <NotificationPreferencesForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
