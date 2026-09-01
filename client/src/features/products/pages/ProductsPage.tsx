import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productApi } from '../api/product.api';
import { categoryApi } from '../../catalog/api/category.api';
import { brandApi } from '../../catalog/api/brand.api';
import { Product, ProductStatus } from '../types/product.types';
import { formatMoney } from '../../../utils/money';
import { usePermission } from '../../auth/hooks/usePermission';

export const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const canCreate = usePermission('product:create');
  const canUpdate = usePermission('product:update');
  const canPublish = usePermission('product:publish');
  const canDelete = usePermission('product:delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [featuredFilter, setFeaturedFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Products Query
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'admin',
      'products',
      {
        page,
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        brand: brandFilter,
        featured: featuredFilter,
      },
    ],
    queryFn: () =>
      productApi.listAdmin({
        page,
        limit: 15,
        search: searchTerm || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as ProductStatus),
        categoryId: categoryFilter || undefined,
        brandId: brandFilter || undefined,
        featured: featuredFilter === 'ALL' ? undefined : featuredFilter === 'TRUE',
      }),
  });

  // Filter dropdown data
  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories', 'filter-list'],
    queryFn: () => categoryApi.listAdmin({ limit: 100 }),
  });

  const { data: brandsData } = useQuery({
    queryKey: ['admin', 'brands', 'filter-list'],
    queryFn: () => brandApi.listAdmin({ limit: 100 }),
  });

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      productApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to update product status';
      alert(msg || 'Failed to update product status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setDeletingProduct(null);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : 'Failed to delete product';
      alert(msg || 'Failed to delete product');
    },
  });

  const products = data?.products || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Draft
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Product Catalog</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your store products, sellable variants, pricing, and publishing status.
          </p>
        </div>

        {canCreate && (
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by product name, slug, or tags..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
          className="px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">All Categories</option>
          {(categoriesData?.categories || []).map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by brand"
          className="px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">All Brands</option>
          {(brandsData?.brands || []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={featuredFilter}
          onChange={(e) => {
            setFeaturedFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by featured"
          className="px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="ALL">All Products</option>
          <option value="TRUE">Featured Only</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading products catalog...</div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-sm">Failed to load products.</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-2">
            <p>No products found matching your search or filters.</p>
            {canCreate && (
              <Link to="/admin/products/new" className="text-xs text-indigo-400 hover:underline">
                Create your first product
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase font-semibold text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category / Brand</th>
                  <th className="py-3.5 px-4">Variants</th>
                  <th className="py-3.5 px-4">Price Range</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => {
                  const primaryImg = p.images?.find((img) => img.isPrimary) || p.images?.[0];

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          {primaryImg ? (
                            <img
                              src={primaryImg.url}
                              alt={primaryImg.altText || p.name}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                              {p.name[0]}
                            </div>
                          )}
                          <div>
                            <span className="block font-semibold text-slate-100">{p.name}</span>
                            <span className="block text-xs font-mono text-slate-400">{p.slug}</span>
                            {p.featured && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                            {p.category?.name || 'Unassigned'}
                          </span>
                          {p.brand && (
                            <div className="text-[11px] text-slate-400 font-medium">
                              Brand: {p.brand.name}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <span className="font-semibold text-slate-200">{p.variantsCount || 0}</span>{' '}
                        <span className="text-slate-400">variant(s)</span>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono">
                        {p.priceRange ? (
                          p.priceRange.min === p.priceRange.max ? (
                            <span className="text-emerald-400 font-semibold">
                              {formatMoney(p.priceRange.min)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">
                              {formatMoney(p.priceRange.min)} - {formatMoney(p.priceRange.max)}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 italic">No active pricing</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(p.status)}

                          {canPublish && (
                            <select
                              value={p.status}
                              onChange={(e) =>
                                statusMutation.mutate({
                                  id: p.id,
                                  status: e.target.value as ProductStatus,
                                })
                              }
                              aria-label="Change product status"
                              className="text-[11px] px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-indigo-500"
                            >
                              <option value="DRAFT">Draft</option>
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="ARCHIVED">Archived</option>
                            </select>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {canUpdate && (
                            <Link
                              to={`/admin/products/${p.id}/edit`}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                            >
                              Edit / Variants
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(p)}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-slate-200">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-200">{pagination.totalPages}</span> (
              {pagination.total} total)
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Delete Product</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-rose-400">"{deletingProduct.name}"</span>?
            </p>
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
              Warning: Deleting this product will permanently remove all of its associated variants.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingProduct.id)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
