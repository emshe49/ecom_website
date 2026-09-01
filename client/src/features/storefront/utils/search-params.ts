import { ProductSearchApiParams } from '../api/product-search.api';
import { StorefrontFilterState, ProductSortOption } from '../types/product-search.types';
import { toMinorUnits } from '../../../utils/money';

/**
 * Parses URLSearchParams into StorefrontFilterState.
 */
export const parseSearchParams = (searchParams: URLSearchParams): StorefrontFilterState => {
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;

  // Brands (comma-separated or multiple)
  const brandParam = searchParams.get('brand');
  const brand = brandParam
    ? brandParam
        .split(',')
        .map((b) => b.trim())
        .filter((b) => b.length > 0)
    : undefined;

  // Prices in PKR (converted to major float for inputs)
  const minPriceMinor = searchParams.get('minPrice');
  const maxPriceMinor = searchParams.get('maxPrice');
  const minPriceMajor = minPriceMinor ? Number(minPriceMinor) / 100 : '';
  const maxPriceMajor = maxPriceMinor ? Number(maxPriceMinor) / 100 : '';

  // Dynamic Attributes
  const rawAttributes = searchParams.getAll('attribute');
  const attributes: Record<string, string[]> = {};

  for (const raw of rawAttributes) {
    const colonIdx = raw.indexOf(':');
    if (colonIdx > 0 && colonIdx < raw.length - 1) {
      const name = raw.substring(0, colonIdx).trim().toLowerCase();
      const val = raw.substring(colonIdx + 1).trim();
      if (!attributes[name]) {
        attributes[name] = [];
      }
      if (!attributes[name].includes(val)) {
        attributes[name].push(val);
      }
    }
  }

  const sort = (searchParams.get('sort') as ProductSortOption) || 'newest';
  const page = Number(searchParams.get('page')) || 1;

  return {
    search,
    category,
    brand,
    minPriceMajor,
    maxPriceMajor,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    sort,
    page,
  };
};

/**
 * Serializes StorefrontFilterState into URLSearchParams.
 */
export const serializeSearchParams = (state: StorefrontFilterState): URLSearchParams => {
  const params = new URLSearchParams();

  if (state.search && state.search.trim()) {
    params.set('search', state.search.trim());
  }

  if (state.category) {
    params.set('category', state.category);
  }

  if (state.brand && state.brand.length > 0) {
    params.set('brand', state.brand.join(','));
  }

  if (state.minPriceMajor !== '' && state.minPriceMajor !== undefined) {
    params.set('minPrice', toMinorUnits(state.minPriceMajor).toString());
  }

  if (state.maxPriceMajor !== '' && state.maxPriceMajor !== undefined) {
    params.set('maxPrice', toMinorUnits(state.maxPriceMajor).toString());
  }

  if (state.attributes) {
    for (const [name, values] of Object.entries(state.attributes)) {
      for (const val of values) {
        params.append('attribute', `${name}:${val}`);
      }
    }
  }

  if (state.sort && state.sort !== 'newest') {
    params.set('sort', state.sort);
  }

  if (state.page && state.page > 1) {
    params.set('page', state.page.toString());
  }

  return params;
};

/**
 * Converts StorefrontFilterState into API parameters.
 */
export const toApiParams = (state: StorefrontFilterState): ProductSearchApiParams => {
  const attributeList: string[] = [];
  if (state.attributes) {
    for (const [name, values] of Object.entries(state.attributes)) {
      for (const val of values) {
        attributeList.push(`${name}:${val}`);
      }
    }
  }

  return {
    search: state.search || undefined,
    category: state.category || undefined,
    brand: state.brand && state.brand.length > 0 ? state.brand.join(',') : undefined,
    minPrice:
      state.minPriceMajor !== '' && state.minPriceMajor !== undefined
        ? toMinorUnits(state.minPriceMajor)
        : undefined,
    maxPrice:
      state.maxPriceMajor !== '' && state.maxPriceMajor !== undefined
        ? toMinorUnits(state.maxPriceMajor)
        : undefined,
    attribute: attributeList.length > 0 ? attributeList : undefined,
    sort: state.sort || 'newest',
    page: state.page || 1,
    limit: 24,
  };
};
