import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { NotificationPreference } from '../types/notifications.types';

export const NotificationPreferencesForm: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notificationsApi.getPreferences,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreference>) =>
      notificationsApi.updatePreferences(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['notifications', 'preferences'], updated);
    },
  });

  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-slate-400">
        Loading preferences...
      </div>
    );
  }

  const handleToggle = (key: keyof Omit<NotificationPreference, 'updatedAt'>) => {
    if (!preferences) return;
    updateMutation.mutate({ [key]: !preferences[key] });
  };

  const categories: Array<{
    key: keyof Omit<NotificationPreference, 'updatedAt'>;
    label: string;
    description: string;
    critical?: boolean;
  }> = [
    {
      key: 'orders',
      label: 'Order Updates',
      description: 'Receive notifications when your order is placed, confirmed, or completed.',
      critical: true,
    },
    {
      key: 'payments',
      label: 'Payment Notices',
      description: 'Transaction receipts, payment confirmations, and billing alerts.',
      critical: true,
    },
    {
      key: 'shipping',
      label: 'Shipping & Delivery',
      description: 'Tracking numbers, in-transit milestones, and delivery updates.',
    },
    {
      key: 'reviews',
      label: 'Review Moderation',
      description: 'Approval, publish notices, and moderation feedback on your reviews.',
    },
    {
      key: 'returns',
      label: 'Return Requests',
      description: 'Status changes on return approvals, item receipt, and resolution.',
    },
    {
      key: 'refunds',
      label: 'Refunds & Adjustments',
      description: 'Notices regarding refund processing and credit issuance.',
      critical: true,
    },
    {
      key: 'promotions',
      label: 'Promotions & Deals',
      description: 'Exclusive coupons, seasonal discounts, and special offers.',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="divide-y divide-slate-800/80">
        {categories.map((cat) => {
          const isEnabled = preferences ? preferences[cat.key] : true;
          return (
            <div
              key={cat.key}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-slate-200">
                    {cat.label}
                  </h4>
                  {cat.critical && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      Essential
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{cat.description}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => handleToggle(cat.key)}
                disabled={updateMutation.isPending}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 ${
                  isEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
