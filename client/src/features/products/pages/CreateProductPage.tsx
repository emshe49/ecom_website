import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productApi } from '../api/product.api';
import { categoryApi } from '../../catalog/api/category.api';
import { brandApi } from '../../catalog/api/brand.api';
import {
  CreateProductInput,
  ProductImage,
  ProductAttribute,
} from '../types/product.types';
import { productFormSchema, ProductFormValues } from '../schemas/product.schemas';

export const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic Image rows
  const [images, setImages] = useState<ProductImage[]>([
    { url: '', altText: '', sortOrder: 0, isPrimary: true },
  ]);

  // Dynamic Attribute rows
  const [attributes, setAttributes] = useState<ProductAttribute[]>([
    { name: 'Material', value: '' },
  ]);

  // Fetch active categories and brands
  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories', 'create-select'],
    queryFn: () => categoryApi.listAdmin({ limit: 100 }),
  });

  const { data: brandsData } = useQuery({
    queryKey: ['admin', 'brands', 'create-select'],
    queryFn: () => brandApi.listAdmin({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      shortDescription: '',
      description: '',
      categoryId: '',
      brandId: '',
      featured: false,
      tagsInput: '',
      seoTitle: '',
      seoDescription: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductInput) => productApi.create(data),
    onSuccess: (product) => {
      // Direct navigation to Edit Product page to immediately configure Variants
      navigate(`/admin/products/${product.id}/edit`);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to create product';
      setFormError(msg || 'Failed to create product');
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

    // Clean images
    const validImages = images
      .filter((img) => img.url.trim())
      .map((img, idx) => ({
        url: img.url.trim(),
        altText: img.altText?.trim() || null,
        sortOrder: idx,
        isPrimary: img.isPrimary,
      }));

    // Clean attributes
    const validAttributes = attributes
      .filter((attr) => attr.name.trim() && attr.value.trim())
      .map((attr) => ({ name: attr.name.trim(), value: attr.value.trim() }));

    // Parse comma-separated tags
    const tags = values.tagsInput
      ? values.tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      : [];

    const payload: CreateProductInput = {
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

    createMutation.mutate(payload);
  };

  // Find leaf categories (categories without subcategories)
  const allCategories = categoriesData?.categories || [];
  const parentIds = new Set(
    allCategories.map((c) => (c.parentId ? c.parentId.toString() : null)).filter(Boolean)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            ← Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Product</h1>
          <p className="text-sm text-slate-400">
            Define basic catalog details. Variants and inventory options can be added after creation.
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: General Information */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-white">General Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Product Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Nike Air Max 270"
                {...register('name')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custom URL Slug (Optional)
              </label>
              <input
                type="text"
                placeholder="Auto-generated from title if blank"
                {...register('slug')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {errors.slug && <p className="text-xs text-rose-400 mt-1">{errors.slug.message}</p>}
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="featured"
                {...register('featured')}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
              />
              <label htmlFor="featured" className="text-xs font-medium text-slate-200">
                Mark as Featured Product (Highlights on Homepage)
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
                <option value="">Select Category</option>
                {allCategories.map((c) => {
                  const isParent = parentIds.has(c.id);
                  return (
                    <option key={c.id} value={c.id} disabled={isParent || !c.isActive}>
                      {c.name} {isParent ? '(Parent - Has subcategories)' : !c.isActive ? '(Inactive)' : ''}
                    </option>
                  );
                })}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-rose-400 mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Brand (Optional)
              </label>
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
                placeholder="Brief single-line summary for product cards"
                {...register('shortDescription')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Description
              </label>
              <textarea
                rows={4}
                placeholder="Detailed marketing and technical description..."
                {...register('description')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. running, sneakers, lifestyle, cushion"
                {...register('tagsInput')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Product Images */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Product Gallery Images</h2>
              <p className="text-xs text-slate-400">
                Add image URLs and pick which image should serve as the primary card photo.
              </p>
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
                    name="primaryImage"
                    checked={img.isPrimary}
                    onChange={() => handleSetPrimaryImage(idx)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Primary
                </label>
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Technical Specifications */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Technical Specifications</h2>
              <p className="text-xs text-slate-400">
                Key-value attributes applicable to all variants (e.g. Sole Material, Origin, Warranty).
              </p>
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
                  placeholder="Key (e.g. Material)"
                  value={attr.name}
                  onChange={(e) => {
                    const next = [...attributes];
                    next[idx].name = e.target.value;
                    setAttributes(next);
                  }}
                  className="w-1/2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. 100% Synthetic Rubber)"
                  value={attr.value}
                  onChange={(e) => {
                    const next = [...attributes];
                    next[idx].value = e.target.value;
                    setAttributes(next);
                  }}
                  className="w-1/2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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

        {/* Section 4: SEO Metadata */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-white">Search Engine Optimization (SEO)</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Meta Title
              </label>
              <input
                type="text"
                placeholder="Custom title tag (max 70 chars)"
                {...register('seoTitle')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Meta Description
              </label>
              <textarea
                rows={2}
                placeholder="Search snippet description (max 160 chars)"
                {...register('seoDescription')}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/admin/products"
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating Product...' : 'Create & Configure Variants →'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
