import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productSearchApi } from '../api/product-search.api';
import { ProductCard } from '../components/ProductCard';
import { ProductFilters } from '../components/ProductFilters';
import { SortSelect } from '../components/SortSelect';
import { ProductPagination } from '../components/ProductPagination';
import {
  parseSearchParams,
  serializeSearchParams,
  toApiParams,
} from '../utils/search-params';
import {
  StorefrontFilterState,
  ProductSortOption,
} from '../types/product-search.types';
import { formatMoney } from '../../../utils/money';

export const StorefrontProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Parse state from URL
  const filterState = parseSearchParams(searchParams);

  // Local debounced search input state
  const [searchInput, setSearchInput] = useState(filterState.search || '');

  useEffect(() => {
    setSearchInput(filterState.search || '');
  }, [filterState.search]);

  // Debounced search handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== (filterState.search || '')) {
        handleFilterChange({ search: searchInput || undefined, page: 1 });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  const apiParams = toApiParams(filterState);

  // 1. Fetch Products
  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['products', apiParams],
    queryFn: () => productSearchApi.getProducts(apiParams),
    placeholderData: keepPreviousData,
  });

  // 2. Fetch Contextual Facets
  const { data: facetsData } = useQuery({
    queryKey: [
      'product-facets',
      { search: filterState.search, category: filterState.category, brand: filterState.brand },
    ],
    queryFn: () =>
      productSearchApi.getProductFacets({
        search: filterState.search,
        category: filterState.category,
        brand: filterState.brand,
      }),
  });

  const handleFilterChange = (newValues: Partial<StorefrontFilterState>) => {
    const nextState: StorefrontFilterState = {
      ...filterState,
      ...newValues,
      // Whenever filters change (except page change), reset page to 1
      page: newValues.page !== undefined ? newValues.page : 1,
    };

    const newParams = serializeSearchParams(nextState);
    setSearchParams(newParams);
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const products = searchData?.products || [];
  const pagination = searchData?.pagination;

  // Active filter chip helpers
  const selectedBrands = filterState.brand || [];
  const selectedAttributes = filterState.attributes || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Search */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explore Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Browse our complete collection with real-time faceted search, category filtering, brand options, and price controls.
          </p>

          <div className="relative pt-1">
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
              placeholder="Search products by title, tag, or keywords..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  handleFilterChange({ search: undefined });
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout (Sidebar Filters + Products Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-lg sticky top-20">
          <ProductFilters
            facets={facetsData}
            filters={filterState}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAll}
          />
        </aside>

        {/* Products Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header Row: Mobile Filter Button, Result Count, Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/30 border border-slate-800/60 p-3.5 rounded-xl">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>

              <span className="text-xs text-slate-400">
                Found{' '}
                <strong className="text-slate-200 font-semibold font-mono">
                  {pagination?.total || 0}
                </strong>{' '}
                products
              </span>
            </div>

            <SortSelect
              value={filterState.sort || 'newest'}
              onChange={(s: ProductSortOption) => handleFilterChange({ sort: s })}
            />
          </div>

          {/* Active Filter Chips Bar */}
          {(filterState.category ||
            selectedBrands.length > 0 ||
            filterState.minPriceMajor !== '' ||
            filterState.maxPriceMajor !== '' ||
            Object.keys(selectedAttributes).length > 0) && (
            <div className="flex flex-wrap items-center gap-2 py-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Filters:
              </span>

              {filterState.category && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                  <span>Category: {filterState.category}</span>
                  <button
                    type="button"
                    onClick={() => handleFilterChange({ category: undefined })}
                    className="text-indigo-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedBrands.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
                >
                  <span>Brand: {b}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedBrands.filter((br) => br !== b);
                      handleFilterChange({ brand: next.length > 0 ? next : undefined });
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}

              {(filterState.minPriceMajor !== '' || filterState.maxPriceMajor !== '') && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                  <span>
                    Price:{' '}
                    {filterState.minPriceMajor !== ''
                      ? formatMoney(Number(filterState.minPriceMajor) * 100)
                      : 'Rs 0'}{' '}
                    –{' '}
                    {filterState.maxPriceMajor !== ''
                      ? formatMoney(Number(filterState.maxPriceMajor) * 100)
                      : 'Max'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleFilterChange({ minPriceMajor: '', maxPriceMajor: '' })
                    }
                    className="text-slate-400 hover:text-white font-sans"
                  >
                    ×
                  </button>
                </span>
              )}

              {Object.entries(selectedAttributes).map(([name, vals]) =>
                vals.map((v) => (
                  <span
                    key={`${name}-${v}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    <span>
                      {name}: {v}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVals = vals.filter((val) => val !== v);
                        const nextAttrs = { ...selectedAttributes };
                        if (nextVals.length > 0) {
                          nextAttrs[name] = nextVals;
                        } else {
                          delete nextAttrs[name];
                        }
                        handleFilterChange({
                          attributes:
                            Object.keys(nextAttrs).length > 0 ? nextAttrs : undefined,
                        });
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}

              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium ml-1"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 py-8">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse"
                >
                  <div className="aspect-square bg-slate-800/60 rounded-xl"></div>
                  <div className="h-4 bg-slate-800/60 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-20 text-center text-rose-400 text-sm bg-slate-900/40 border border-slate-800 rounded-2xl">
              Failed to load products. Please try again.
            </div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center bg-slate-900/30 border border-slate-800 rounded-2xl p-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
                🔍
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-200">No products found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  We couldn't find any products matching your search criteria. Try removing some filters or searching with different keywords.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && (
            <ProductPagination
              pagination={pagination}
              onPageChange={(p) => handleFilterChange({ page: p })}
            />
          )}
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs bg-slate-900 h-full p-6 overflow-y-auto border-l border-slate-800 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <h2 className="text-base font-bold text-white">Filter Products</h2>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <ProductFilters
                facets={facetsData}
                filters={filterState}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
              />
            </div>

            <div className="pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontProductsPage;
