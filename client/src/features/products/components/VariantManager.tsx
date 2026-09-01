import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productApi } from '../api/product.api';
import {
  ProductVariant,
  CreateVariantInput,
  UpdateVariantInput,
  ProductAttribute,
} from '../types/product.types';
import { variantFormSchema, VariantFormValues } from '../schemas/product.schemas';
import { formatMoney, toMinorUnits } from '../../../utils/money';
import { usePermission } from '../../auth/hooks/usePermission';

interface VariantManagerProps {
  productId: string;
  productStatus: string;
}

export const VariantManager: React.FC<VariantManagerProps> = ({ productId, productStatus }) => {
  const queryClient = useQueryClient();
  const canUpdate = usePermission('product:update');
  const canDelete = usePermission('product:delete');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [deletingVariant, setDeletingVariant] = useState<ProductVariant | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic attributes state inside modal
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['admin', 'products', productId, 'variants'],
    queryFn: () => productApi.listVariants(productId),
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateVariantInput) => productApi.createVariant(productId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to create variant';
      setFormError(msg || 'Failed to create variant');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateVariantInput }) =>
      productApi.updateVariant(productId, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId] });
      setIsModalOpen(false);
      setEditingVariant(null);
      resetForm();
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to update variant';
      setFormError(msg || 'Failed to update variant');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => productApi.deleteVariant(productId, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId] });
      setDeletingVariant(null);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to delete variant';
      alert(msg || 'Failed to delete variant');
    },
  });

  const {
    register,
    handleSubmit,
    reset: resetForm,
    setValue,
    formState: { errors },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      sku: '',
      name: '',
      priceMajor: 0,
      compareAtPriceMajor: '',
      costPriceMajor: '',
      barcode: '',
      imageUrl: '',
      weightGrams: '',
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      isActive: true,
    },
  });

  const openCreateModal = () => {
    setEditingVariant(null);
    setFormError(null);
    setAttributes([{ name: 'Color', value: '' }]);
    resetForm({
      sku: '',
      name: '',
      priceMajor: 0,
      compareAtPriceMajor: '',
      costPriceMajor: '',
      barcode: '',
      imageUrl: '',
      weightGrams: '',
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (v: ProductVariant) => {
    setEditingVariant(v);
    setFormError(null);
    setAttributes(v.attributes && v.attributes.length > 0 ? [...v.attributes] : []);
    setValue('sku', v.sku);
    setValue('name', v.name || '');
    setValue('priceMajor', v.price ? v.price / 100 : 0);
    setValue('compareAtPriceMajor', v.compareAtPrice ? v.compareAtPrice / 100 : '');
    setValue('costPriceMajor', v.costPrice ? v.costPrice / 100 : '');
    setValue('barcode', v.barcode || '');
    setValue('imageUrl', v.imageUrl || '');
    setValue('weightGrams', v.weightGrams ?? '');
    setValue('lengthCm', v.dimensions?.lengthCm ?? '');
    setValue('widthCm', v.dimensions?.widthCm ?? '');
    setValue('heightCm', v.dimensions?.heightCm ?? '');
    setValue('isActive', v.isActive);
    setIsModalOpen(true);
  };

  const handleAddAttributeRow = () => {
    if (attributes.length < 10) {
      setAttributes([...attributes, { name: '', value: '' }]);
    }
  };

  const handleRemoveAttributeRow = (idx: number) => {
    setAttributes(attributes.filter((_, i) => i !== idx));
  };

  const handleAttributeChange = (idx: number, field: 'name' | 'value', val: string) => {
    const next = [...attributes];
    next[idx][field] = val;
    setAttributes(next);
  };

  const onSubmit = (values: VariantFormValues) => {
    setFormError(null);

    // Filter valid attributes
    const cleanAttrs = attributes
      .filter((a) => a.name.trim() && a.value.trim())
      .map((a) => ({ name: a.name.trim(), value: a.value.trim() }));

    const payload: CreateVariantInput = {
      sku: values.sku.trim().toUpperCase(),
      name: values.name?.trim() || null,
      attributes: cleanAttrs,
      price: toMinorUnits(values.priceMajor),
      compareAtPrice: values.compareAtPriceMajor !== '' ? toMinorUnits(values.compareAtPriceMajor as number) : null,
      costPrice: values.costPriceMajor !== '' ? toMinorUnits(values.costPriceMajor as number) : null,
      barcode: values.barcode?.trim() || null,
      imageUrl: values.imageUrl?.trim() || null,
      weightGrams: values.weightGrams !== '' ? Number(values.weightGrams) : null,
      dimensions:
        values.lengthCm !== '' && values.widthCm !== '' && values.heightCm !== ''
          ? {
              lengthCm: Number(values.lengthCm),
              widthCm: Number(values.widthCm),
              heightCm: Number(values.heightCm),
            }
          : null,
      isActive: values.isActive,
    };

    if (editingVariant) {
      updateMutation.mutate({ id: editingVariant.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Sellable Product Variants</h3>
          <p className="text-xs text-slate-400">
            Define options (e.g. Size, Color, Storage), SKU codes, and pricing for this product.
          </p>
        </div>

        {canUpdate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Variant
          </button>
        )}
      </div>

      {/* Variants Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading variants...</div>
        ) : variants.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs space-y-2">
            <p>No variants configured for this product yet.</p>
            {productStatus === 'DRAFT' && (
              <p className="text-amber-400 text-[11px]">
                Note: Products must have at least one active variant before they can be published.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase font-semibold text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">SKU & Title</th>
                  <th className="py-3 px-3.5">Options / Attributes</th>
                  <th className="py-3 px-3.5">Selling Price</th>
                  <th className="py-3 px-3.5">Compare Price</th>
                  <th className="py-3 px-3.5">Cost Price</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-white">
                      <div className="font-mono text-indigo-400">{v.sku}</div>
                      {v.name && <div className="text-[11px] text-slate-400">{v.name}</div>}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="flex flex-wrap gap-1">
                        {v.attributes && v.attributes.length > 0 ? (
                          v.attributes.map((a, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              <span className="text-slate-400 mr-1">{a.name}:</span> {a.value}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">Default</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-emerald-400 font-mono">
                      {formatMoney(v.price)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-400 line-through">
                      {formatMoney(v.compareAtPrice)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-400">
                      {formatMoney(v.costPrice)}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {v.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditModal(v)}
                            className="px-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeletingVariant(v)}
                            className="px-2 py-1 text-[11px] font-medium rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Variant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {editingVariant ? 'Edit Variant' : 'Create Variant'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NK-AM270-BLK-9"
                    {...register('sku')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 uppercase"
                  />
                  {errors.sku && <p className="text-xs text-rose-400 mt-1">{errors.sku.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Black / 9"
                    {...register('name')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Options / Attributes */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Variant Options</span>
                  <button
                    type="button"
                    onClick={handleAddAttributeRow}
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    + Add Option
                  </button>
                </div>

                {attributes.map((attr, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Option (e.g. Color)"
                      value={attr.name}
                      onChange={(e) => handleAttributeChange(idx, 'name', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Black)"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttributeRow(idx)}
                      className="text-rose-400 hover:text-rose-300 px-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Selling Price (PKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="18500"
                    {...register('priceMajor')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-400 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  {errors.priceMajor && (
                    <p className="text-xs text-rose-400 mt-1">{errors.priceMajor.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Compare-At Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="20000"
                    {...register('compareAtPriceMajor')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  {errors.compareAtPriceMajor && (
                    <p className="text-xs text-rose-400 mt-1">
                      {errors.compareAtPriceMajor.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cost Price (Internal)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="12000"
                    {...register('costPriceMajor')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Physical specifications */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="EAN/UPC Code"
                    {...register('barcode')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    placeholder="450"
                    {...register('weightGrams')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Variant Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  {...register('imageUrl')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="variantIsActive"
                  {...register('isActive')}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                />
                <label htmlFor="variantIsActive" className="text-xs font-medium text-slate-200">
                  Active (Sellable for customer orders)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingVariant
                    ? 'Save Variant'
                    : 'Create Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white">Delete Variant</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete SKU{' '}
              <span className="font-mono font-semibold text-rose-400">{deletingVariant.sku}</span>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVariant(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingVariant.id)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Variant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
