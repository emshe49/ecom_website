import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { shippingApi } from '../api/shipping.api';
import { ShippingMethodDTO, CreateShippingMethodInput, UpdateShippingMethodInput } from '../types/shipping.types';
import { ShippingMethodModal } from '../components/ShippingMethodModal';
import { formatMoney } from '../../../utils/money';

export const AdminShippingMethodsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethodDTO | null>(null);

  const {
    data: methods = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-shipping-methods', searchTerm],
    queryFn: () => shippingApi.listShippingMethods({ search: searchTerm.trim() || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateShippingMethodInput) =>
      shippingApi.createShippingMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-methods'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateShippingMethodInput;
    }) => shippingApi.updateShippingMethod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-methods'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => shippingApi.deactivateShippingMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-methods'] });
    },
  });

  const handleOpenCreate = () => {
    setEditingMethod(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: ShippingMethodDTO) => {
    setEditingMethod(m);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate shipping method '${name}'?`)) {
      await deactivateMutation.mutateAsync(id);
    }
  };

  const handleModalSubmit = async (data: CreateShippingMethodInput | UpdateShippingMethodInput) => {
    if (editingMethod) {
      await updateMutation.mutateAsync({ id: editingMethod.id, data });
    } else {
      await createMutation.mutateAsync(data as CreateShippingMethodInput);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Shipping Methods
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure delivery methods, rates, estimated days, and free shipping thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Shipping Method
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
          />
        </div>
      </div>

      {/* Methods Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
            <p className="text-sm font-medium">Loading shipping methods...</p>
          </div>
        ) : methods.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
            <h3 className="font-bold text-zinc-700 dark:text-zinc-300">No Shipping Methods Found</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Create your first shipping method to enable checkout delivery options.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3.5 px-6">Code / Name</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Base Fee</th>
                  <th className="py-3.5 px-6">Free Threshold</th>
                  <th className="py-3.5 px-6">Est. Days</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {methods.map((method) => (
                  <tr
                    key={method.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-zinc-900 dark:text-white">
                        {method.name}
                      </div>
                      <div className="font-mono text-xs text-zinc-400 mt-0.5">
                        {method.code}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {method.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-zinc-900 dark:text-white">
                      {formatMoney(method.baseFee, method.currency)}
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-600 dark:text-zinc-300">
                      {method.freeAboveSubtotal ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="w-3 h-3" />
                          {formatMoney(method.freeAboveSubtotal, method.currency)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                      {method.estimatedMinDays}–{method.estimatedMaxDays} days
                    </td>
                    <td className="py-4 px-6">
                      {method.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(method)}
                        className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                        title="Edit Method"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {method.active && (
                        <button
                          onClick={() => handleDeactivate(method.id, method.name)}
                          className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Deactivate Method"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <ShippingMethodModal
        isOpen={isModalOpen}
        method={editingMethod}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};
