import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productApi } from '../api/product.api';
import { categoryApi } from '../../catalog/api/category.api';
import { brandApi } from '../../catalog/api/brand.api';
import {
  UpdateProductInput,
  ProductImage,
  ProductAttribute,
  ProductStatus,
} from '../types/product.types';
import { productFormSchema, ProductFormValues } from '../schemas/product.schemas';
import { VariantManager } from '../components/VariantManager';
import { usePermission } from '../../auth/hooks/usePermission';

export const EditProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const queryClient = useQueryClient();
  const canUpdate = usePermission('product:update');
  const canPublish = usePermission('product:publish');

  const [activeTab, setActiveTab] = useState<'details' | 'variants'>('details');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic Image and Attribute state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  // Fetch product detail
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['admin', 'products', productId],
    queryFn: () => productApi.getAdminById(productId!),
    enabled: !!productId,
  });

  // Fetch categories and brands
  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories', 'edit-select'],
    queryFn: () => categoryApi.listAdmin({ limit: 100 }),
  });

  const { data: brandsData } = useQuery({
    queryKey: ['admin', 'brands', 'edit-select'],
    queryFn: () => brandApi.listAdmin({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        categoryId: product.categoryId,
        brandId: product.brandId || '',
        featured: product.featured,
        tagsInput: product.tags?.join(', ') || '',
        seoTitle: product.seoTitle || '',
        seoDescription: product.seoDescription || '',
      });

      setImages(product.images || []);
      setAttributes(product.attributes || []);
    }
  }, [product, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductInput) => productApi.update(productId!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'products', productId], updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to update product';
      setFormError(msg || 'Failed to update product');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: ProductStatus) => productApi.updateStatus(productId!, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'products', productId], updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setSuccessMessage(`Product status updated to ${updated.status}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to change status';
      alert(msg || 'Failed to change status');
    },
  });

  const handleAddImage = () => {
    if (images.length < 10) {
      setImages([
        ...images,
        { url: '', altText: '', sortOrder: images.length, isPrimary: images.length === 0 },
      ]);
    }
  };

  const handleRemoveImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((img) => img.isPrimary)) {
      next[0].isPrimary = true;
    }
    setImages(next);
  };

  const handleSetPrimaryImage = (idx: number) => {
    const next = images.map((img, i) => ({
      ...img,
      isPrimary: i === idx,
    }));
    setImages(next);
  };

  const handleAddAttribute = () => {
    if (attributes.length < 20) {
      setAttributes([...attributes, { name: '', value: '' }]);
    }
  };

  const handleRemoveAttribute = (idx: number) => {
    setAttributes(attributes.filter((_, i) => i !== idx));
  };

  const onSubmit = (values: ProductFormValues) => {
    setFormError(null);

    const validImages = images
      .filter((img) => img.url.trim())
      .map((img, idx) => ({
        url: img.url.trim(),
        altText: img.altText?.trim() || null,
        sortOrder: idx,
        isPrimary: img.isPrimary,
      }));

    const validAttributes = attributes
      .filter((attr) => attr.name.trim() && attr.value.trim())
      .map((attr) => ({ name: attr.name.trim(), value: attr.value.trim() }));

    const tags = values.tagsInput
      ? values.tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      : [];

    const payload: UpdateProductInput = {
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      shortDescription: values.shortDescription?.trim() || null,
      description: values.description?.trim() || null,
      categoryId: values.categoryId,
      brandId: values.brandId || null,
      featured: values.featured,
      tags,
      images: validImages,
      attributes: validAttributes,
      seoTitle: values.seoTitle?.trim() || null,
      seoDescription: values.seoDescription?.trim() || null,
    };

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm animate-fadeIn">
        Loading product details...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-20 text-center text-rose-400 text-sm space-y-2 animate-fadeIn">
        <p>Product not found or failed to load.</p>
        <Link to="/admin/products" className="text-xs text-indigo-400 hover:underline">
          Return to Products
        </Link>
      </div>
    );
  }

  const allCategories = categoriesData?.categories || [];
  const parentIds = new Set(
    allCategories.map((c) => (c.parentId ? c.parentId.toString() : null)).filter(Boolean)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            ← Back to Products
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{product.name}</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                product.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : product.status === 'DRAFT'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}
            >
              {product.status}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">Slug: {product.slug}</p>
        </div>

        {canPublish && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={product.status}
              onChange={(e) => statusMutation.mutate(e.target.value as ProductStatus)}
              aria-label="Change product status"
              className="text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active (Publish)</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'details'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Product Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('variants')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'variants'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Variants & Pricing</span>
          <span className="px-2 py-0.2 rounded-full text-xs bg-slate-800 text-slate-300">
            {product.variants?.length || 0}
          </span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
          {successMessage}
        </div>
      )}

      {formError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
          {formError}
        </div>
      )}

      {/* Tab 1: Product Details */}
      {activeTab === 'details' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white">General Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  {...register('slug')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {errors.slug && <p className="text-xs text-rose-400 mt-1">{errors.slug.message}</p>}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="editFeatured"
                  {...register('featured')}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                />
                <label htmlFor="editFeatured" className="text-xs font-medium text-slate-200">
                  Featured Product
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Leaf Category *
                </label>
                <select
                  {...register('categoryId')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {allCategories.map((c) => {
                    const isParent = parentIds.has(c.id);
                    return (
                      <option key={c.id} value={c.id} disabled={isParent || !c.isActive}>
                        {c.name} {isParent ? '(Parent)' : !c.isActive ? '(Inactive)' : ''}
                      </option>
                    );
                  })}
                </select>
                {errors.categoryId && (
                  <p className="text-xs text-rose-400 mt-1">{errors.categoryId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Brand</label>
                <select
                  {...register('brandId')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No Brand (Generic)</option>
                  {(brandsData?.brands || []).map((b) => (
                    <option key={b.id} value={b.id} disabled={!b.isActive}>
                      {b.name} {!b.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Short Summary
                </label>
                <input
                  type="text"
                  {...register('shortDescription')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Description
                </label>
                <textarea
                  rows={4}
                  {...register('description')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  {...register('tagsInput')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Product Gallery Images */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Gallery Images</h2>
                <p className="text-xs text-slate-400">Manage image URLs and primary thumbnail selection.</p>
              </div>
              <button
                type="button"
                onClick={handleAddImage}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                + Add Image URL
              </button>
            </div>

            <div className="space-y-3">
              {images.map((img, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={img.url}
                    onChange={(e) => {
                      const next = [...images];
                      next[idx].url = e.target.value;
                      setImages(next);
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Alt text"
                    value={img.altText || ''}
                    onChange={(e) => {
                      const next = [...images];
                      next[idx].altText = e.target.value;
                      setImages(next);
                    }}
                    className="w-48 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-slate-300 px-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editPrimaryImage"
                      checked={img.isPrimary}
                      onChange={() => handleSetPrimaryImage(idx)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Primary
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Technical Specifications</h2>
                <p className="text-xs text-slate-400">Specifications shared across all variants.</p>
              </div>
              <button
                type="button"
                onClick={handleAddAttribute}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                + Add Specification
              </button>
            </div>

            <div className="space-y-2.5">
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Key"
                    value={attr.name}
                    onChange={(e) => {
                      const next = [...attributes];
                      next[idx].name = e.target.value;
                      setAttributes(next);
                    }}
                    className="w-1/2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={attr.value}
                    onChange={(e) => {
                      const next = [...attributes];
                      next[idx].value = e.target.value;
                      setAttributes(next);
                    }}
                    className="w-1/2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white">SEO Metadata</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  {...register('seoTitle')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={2}
                  {...register('seoDescription')}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {canUpdate && (
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving Changes...' : 'Save Product Changes'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Tab 2: Variants & Pricing */}
      {activeTab === 'variants' && (
        <div className="animate-fadeIn">
          <VariantManager productId={product.id} productStatus={product.status} />
        </div>
      )}
    </div>
  );
};

export default EditProductPage;
