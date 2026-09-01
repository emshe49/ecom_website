import React from 'react';
import { ProductSortOption } from '../types/product-search.types';

interface SortSelectProps {
  value: ProductSortOption;
  onChange: (sort: ProductSortOption) => void;
}

export const SortSelect: React.FC<SortSelectProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="shrink-0 font-medium">Sort by:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductSortOption)}
        aria-label="Sort products by"
        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition-colors"
      >
        <option value="newest">Newest Arrivals</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="name-asc">Name: A to Z</option>
        <option value="name-desc">Name: Z to A</option>
        <option value="featured">Featured First</option>
        <option value="oldest">Oldest First</option>
      </select>
    </div>
  );
};
