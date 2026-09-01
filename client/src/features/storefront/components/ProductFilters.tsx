import React, { useState } from 'react';
import {
  ProductFacetResponse,
  StorefrontFilterState,
} from '../types/product-search.types';
import { formatMoney } from '../../../utils/money';

interface ProductFiltersProps {
  facets?: ProductFacetResponse;
  filters: StorefrontFilterState;
  onFilterChange: (newFilters: Partial<StorefrontFilterState>) => void;
  onClearAll: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  facets,
  filters,
  onFilterChange,
  onClearAll,
}) => {
  const [minPriceInput, setMinPriceInput] = useState<string>(
    filters.minPriceMajor !== undefined && filters.minPriceMajor !== ''
      ? filters.minPriceMajor.toString()
      : ''
  );
  const [maxPriceInput, setMaxPriceInput] = useState<string>(
    filters.maxPriceMajor !== undefined && filters.maxPriceMajor !== ''
      ? filters.maxPriceMajor.toString()
      : ''
  );

  const selectedBrands = filters.brand || [];
  const selectedAttributes = filters.attributes || {};

  const handleCategorySelect = (slug: string) => {
    if (filters.category === slug) {
      onFilterChange({ category: undefined });
    } else {
      onFilterChange({ category: slug });
    }
  };

  const handleBrandToggle = (slug: string) => {
    let next: string[];
    if (selectedBrands.includes(slug)) {
      next = selectedBrands.filter((b) => b !== slug);
    } else {
      next = [...selectedBrands, slug];
    }
    onFilterChange({ brand: next.length > 0 ? next : undefined });
  };

  const handleAttributeToggle = (attrName: string, value: string) => {
    const normName = attrName.toLowerCase();
    const currentValues = selectedAttributes[normName] || [];
    let nextValues: string[];

    if (currentValues.includes(value)) {
      nextValues = currentValues.filter((v) => v !== value);
    } else {
      nextValues = [...currentValues, value];
    }

    const nextAttributes = { ...selectedAttributes };
    if (nextValues.length > 0) {
      nextAttributes[normName] = nextValues;
    } else {
      delete nextAttributes[normName];
    }

    onFilterChange({
      attributes: Object.keys(nextAttributes).length > 0 ? nextAttributes : undefined,
    });
  };

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = minPriceInput ? parseFloat(minPriceInput) : '';
    const maxVal = maxPriceInput ? parseFloat(maxPriceInput) : '';

    onFilterChange({
      minPriceMajor: minVal,
      maxPriceMajor: maxVal,
    });
  };

  const handleClearPrice = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    onFilterChange({
      minPriceMajor: '',
      maxPriceMajor: '',
    });
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.category) ||
    (filters.brand && filters.brand.length > 0) ||
    (filters.minPriceMajor !== '' && filters.minPriceMajor !== undefined) ||
    (filters.maxPriceMajor !== '' && filters.maxPriceMajor !== undefined) ||
    (filters.attributes && Object.keys(filters.attributes).length > 0);

  return (
    <div className="space-y-6">
      {/* Header & Clear All */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Categories Facet */}
      {facets?.categories && facets.categories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Categories
          </h3>
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {facets.categories.map((c) => {
              const isSelected = filters.category === c.slug;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategorySelect(c.slug)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] text-slate-500 ml-2 font-mono">({c.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Brands Facet */}
      {facets?.brands && facets.brands.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Brands
          </h3>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {facets.brands.map((b) => {
              const isChecked = selectedBrands.includes(b.slug);
              return (
                <label
                  key={b.id}
                  className="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleBrandToggle(b.slug)}
                      className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                    />
                    <span className="truncate">{b.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">({b.count})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Price Range
          </h3>
          {facets?.price && facets.price.max > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              Max: {formatMoney(facets.price.max)}
            </span>
          )}
        </div>

        <form onSubmit={handleApplyPrice} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Min (PKR)</label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Max (PKR)</label>
              <input
                type="number"
                placeholder="Any"
                min="0"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all"
            >
              Apply Price
            </button>
            {(minPriceInput || maxPriceInput) && (
              <button
                type="button"
                onClick={handleClearPrice}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Dynamic Variant Attributes (Color, Size, Storage, etc.) */}
      {facets?.variantAttributes &&
        facets.variantAttributes.map((attr) => {
          const normName = attr.name.toLowerCase();
          const selectedVals = selectedAttributes[normName] || [];

          return (
            <div key={attr.name} className="space-y-3 pt-3 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {attr.name}
              </h3>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {attr.values.map((v) => {
                  const isChecked = selectedVals.includes(v.value);
                  return (
                    <label
                      key={v.value}
                      className="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAttributeToggle(attr.name, v.value)}
                          className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                        />
                        <span className="truncate">{v.value}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">({v.count})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
};
