import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Percent,
  DollarSign,
  AlertCircle,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { promotionsApi } from '../../../promotions/api/promotions.api';
import {
  PromotionDTO,
  CreatePromotionInput,
  DiscountType,
} from '../../../promotions/types/promotions.types';
import { formatMoney } from '../../../../utils/money';

export const AdminPromotionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreatePromotionInput>({
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxDiscountAmount: null,
    minimumOrderAmount: null,
    startsAt: null,
    endsAt: null,
    active: true,
    priority: 10,
    stackable: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promotions', searchTerm, activeFilter, page],
    queryFn: () =>
      promotionsApi.getAdminPromotions({
        search: searchTerm || undefined,
        active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
        page,
        limit: 10,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreatePromotionInput) =>
      promotionsApi.createAdminPromotion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setIsCreateModalOpen(false);
      setModalError(null);
      resetForm();
    },
    onError: (err: any) => {
      setModalError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to create promotion.'
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      promotionsApi.updateAdminPromotion(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxDiscountAmount: null,
      minimumOrderAmount: null,
      startsAt: null,
      endsAt: null,
      active: true,
      priority: 10,
      stackable: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span>Automatic Promotions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automatic site-wide and targeted promotions applied without requiring coupon codes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError(null);
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Promotion</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search promotion name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === filter
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Promotion Name</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Stackable</th>
                <th className="py-3.5 px-4">Min Spend</th>
                <th className="py-3.5 px-4">Validity</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    <span>Loading promotions...</span>
                  </td>
                </tr>
              ) : !data?.data || data.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No automatic promotions found matching criteria.
                  </td>
                </tr>
              ) : (
                data.data.map((promo: PromotionDTO) => (
                  <tr key={promo.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{promo.name}</div>
                      {promo.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {promo.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-semibold text-white">
                        {promo.discountType === 'PERCENTAGE' ? (
                          <>
                            <Percent className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{promo.discountValue}% OFF</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{formatMoney(promo.discountValue, 'USD')} OFF</span>
                          </>
                        )}
                      </div>
                      {promo.maxDiscountAmount && (
                        <div className="text-[10px] text-slate-400">
                          Max: {formatMoney(promo.maxDiscountAmount, 'USD')}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded text-xs">
                        <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                        <span>P{promo.priority}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {promo.stackable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                          <Layers className="w-3 h-3" />
                          <span>Stackable</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Exclusive (No Stacking)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {promo.minimumOrderAmount
                        ? formatMoney(promo.minimumOrderAmount, 'USD')
                        : 'None'}
                    </td>

                    <td className="py-3.5 px-4 text-[11px]">
                      {promo.startsAt || promo.endsAt ? (
                        <div className="space-y-0.5 text-slate-300">
                          {promo.startsAt && (
                            <div>From: {new Date(promo.startsAt).toLocaleDateString()}</div>
                          )}
                          {promo.endsAt && (
                            <div>To: {new Date(promo.endsAt).toLocaleDateString()}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Always active</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: promo.id,
                            active: !promo.active,
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                          promo.active
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {promo.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Showing Page {data.pagination.page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.pagination.hasPrevPage}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.pagination.hasNextPage}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Create Automatic Promotion</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Promotion Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Flash Sale 15% Sitewide"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional customer banner / internal description"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as DiscountType,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (Minor Units)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {formData.discountType === 'PERCENTAGE'
                      ? 'Discount Percentage (1-100) *'
                      : 'Discount Value (in minor units) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Max Discount Amount (Cap)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxDiscountAmount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscountAmount: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    placeholder="e.g. 5000 for 50.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Minimum Order Amount
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.minimumOrderAmount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minimumOrderAmount: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    placeholder="e.g. 3000 for 30.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Priority Level (Higher wins tiebreak)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.stackable}
                      onChange={(e) =>
                        setFormData({ ...formData, stackable: e.target.checked })
                      }
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-slate-300 font-medium">
                      Stackable with Coupons
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.checked })
                      }
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-slate-300 font-medium">
                      Active Immediately
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Create Promotion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
