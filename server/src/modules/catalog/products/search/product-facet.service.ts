import { Types, FilterQuery } from 'mongoose';
import { Product, IProduct } from '../product.model.js';
import { ProductVariant } from '../product-variant.model.js';
import { Category, ICategory } from '../../categories/category.model.js';
import { Brand } from '../../brands/brand.model.js';
import { PRODUCT_STATUS } from '../product.constants.js';
import {
  ProductSearchQuery,
  ProductFacetResponseDTO,
  CategoryFacetItem,
  BrandFacetItem,
  VariantAttributeFacet,
} from './product-search.types.js';
import { productSearchService } from './product-search.service.js';
import { escapeRegex } from '../../catalog.utils.js';
import { env } from '../../../../config/env.js';

export class ProductFacetService {
  /**
   * Generates contextual faceted metadata for customer filter UI.
   */
  async getFacets(query: ProductSearchQuery): Promise<ProductFacetResponseDTO> {
    // 1. Fetch active categories & brands
    const [allActiveCategories, allActiveBrands] = await Promise.all([
      Category.find({ isActive: true }).select('_id name slug parentId'),
      Brand.find({ isActive: true }).select('_id name slug'),
    ]);

    const activeCategoryIds = allActiveCategories.map((c) => c._id as Types.ObjectId);
    const activeBrandIds = allActiveBrands.map((b) => b._id as Types.ObjectId);

    // 2. Category filtering with descendant resolution
    let targetCategoryIds: Types.ObjectId[] = activeCategoryIds;

    if (query.category || query.categoryId) {
      let matchedCategory: ICategory | null = null;

      if (query.categoryId && Types.ObjectId.isValid(query.categoryId)) {
        matchedCategory =
          allActiveCategories.find(
            (c) => c._id.toString() === query.categoryId
          ) || null;
      } else if (query.category) {
        matchedCategory =
          allActiveCategories.find(
            (c) => c.slug === query.category?.trim().toLowerCase()
          ) || null;
      }

      if (!matchedCategory) {
        return {
          categories: [],
          brands: [],
          variantAttributes: [],
          price: { min: 0, max: 0, currency: env.STORE_CURRENCY },
        };
      }

      targetCategoryIds = await productSearchService.getDescendantCategoryIds(
        matchedCategory._id as Types.ObjectId
      );
    }

    // 3. Brand filtering
    let targetBrandIds: Types.ObjectId[] | null = null;
    const requestedBrands: string[] = [];

    if (query.brand) {
      const brandsArr = Array.isArray(query.brand) ? query.brand : [query.brand];
      requestedBrands.push(
        ...brandsArr.flatMap((b) => b.split(',')).map((b) => b.trim().toLowerCase())
      );
    }

    if (query.brandId) {
      const brandIdsArr = Array.isArray(query.brandId) ? query.brandId : [query.brandId];
      requestedBrands.push(
        ...brandIdsArr.flatMap((b) => b.split(',')).map((b) => b.trim())
      );
    }

    if (requestedBrands.length > 0) {
      const matchedBrands = allActiveBrands.filter(
        (b) =>
          requestedBrands.includes(b.slug) ||
          requestedBrands.includes(b._id.toString())
      );

      if (matchedBrands.length === 0) {
        return {
          categories: [],
          brands: [],
          variantAttributes: [],
          price: { min: 0, max: 0, currency: env.STORE_CURRENCY },
        };
      }

      targetBrandIds = matchedBrands.map((b) => b._id as Types.ObjectId);
    }

    // 4. Base matching Product Query
    const productQuery: FilterQuery<IProduct> = {
      status: PRODUCT_STATUS.ACTIVE,
      categoryId: { $in: targetCategoryIds },
    };

    if (targetBrandIds !== null) {
      productQuery.brandId = { $in: targetBrandIds };
    } else {
      productQuery.$or = [{ brandId: null }, { brandId: { $in: activeBrandIds } }];
    }

    // Keyword Search context
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      const searchRegex = { $regex: sanitized, $options: 'i' };

      productQuery.$and = [
        {
          $or: [
            { name: searchRegex },
            { slug: searchRegex },
            { tags: searchRegex },
            { shortDescription: searchRegex },
            { description: searchRegex },
          ],
        },
      ];
    }

    // Fetch qualifying products
    const matchingProducts = await Product.find(productQuery).select('_id categoryId brandId');

    if (matchingProducts.length === 0) {
      return {
        categories: [],
        brands: [],
        variantAttributes: [],
        price: { min: 0, max: 0, currency: env.STORE_CURRENCY },
      };
    }

    const matchingProductIds = matchingProducts.map((p) => p._id as Types.ObjectId);

    // 5. Aggregate Category & Brand Facets
    const categoryCountMap = new Map<string, number>();
    const brandCountMap = new Map<string, number>();

    for (const p of matchingProducts) {
      const catId = p.categoryId.toString();
      categoryCountMap.set(catId, (categoryCountMap.get(catId) || 0) + 1);

      if (p.brandId) {
        const bId = p.brandId.toString();
        brandCountMap.set(bId, (brandCountMap.get(bId) || 0) + 1);
      }
    }

    const categories: CategoryFacetItem[] = allActiveCategories
      .filter((c) => categoryCountMap.has(c._id.toString()))
      .map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        count: categoryCountMap.get(c._id.toString()) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const brands: BrandFacetItem[] = allActiveBrands
      .filter((b) => brandCountMap.has(b._id.toString()))
      .map((b) => ({
        id: b._id.toString(),
        name: b.name,
        slug: b.slug,
        count: brandCountMap.get(b._id.toString()) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    // 6. Aggregate Variant Attributes and Price Range
    const activeVariants = await ProductVariant.find({
      productId: { $in: matchingProductIds },
      isActive: true,
    }).select('price attributes');

    if (activeVariants.length === 0) {
      return {
        categories,
        brands,
        variantAttributes: [],
        price: { min: 0, max: 0, currency: env.STORE_CURRENCY },
      };
    }

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    const attributeValueCounts = new Map<string, Map<string, number>>();

    for (const v of activeVariants) {
      if (v.price < minPrice) minPrice = v.price;
      if (v.price > maxPrice) maxPrice = v.price;

      if (v.attributes && Array.isArray(v.attributes)) {
        for (const attr of v.attributes) {
          const name = attr.name.trim();
          const value = attr.value.trim();

          if (!name || !value) continue;

          if (!attributeValueCounts.has(name)) {
            attributeValueCounts.set(name, new Map());
          }

          const valMap = attributeValueCounts.get(name)!;
          valMap.set(value, (valMap.get(value) || 0) + 1);
        }
      }
    }

    const variantAttributes: VariantAttributeFacet[] = [];

    for (const [name, valMap] of attributeValueCounts.entries()) {
      const values = Array.from(valMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

      variantAttributes.push({
        name,
        values,
      });
    }

    variantAttributes.sort((a, b) => a.name.localeCompare(b.name));

    return {
      categories,
      brands,
      variantAttributes,
      price: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === -Infinity ? 0 : maxPrice,
        currency: env.STORE_CURRENCY,
      },
    };
  }
}

export const productFacetService = new ProductFacetService();
