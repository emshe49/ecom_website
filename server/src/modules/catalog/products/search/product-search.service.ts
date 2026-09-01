import { Types, FilterQuery, PipelineStage } from 'mongoose';
import { Product, IProduct } from '../product.model.js';
import { ProductVariant } from '../product-variant.model.js';
import { Category, ICategory } from '../../categories/category.model.js';
import { Brand } from '../../brands/brand.model.js';
import { PRODUCT_STATUS } from '../product.constants.js';
import {
  ProductSearchQuery,
  AttributeFilter,
  PublicProductCardDTO,
  PublicProductSearchResponse,
} from './product-search.types.js';
import { escapeRegex } from '../../catalog.utils.js';
import { env } from '../../../../config/env.js';

export class ProductSearchService {
  /**
   * Resolves a category and all its active descendant category IDs.
   * Traverses up to 3 levels of hierarchy.
   */
  async getDescendantCategoryIds(categoryId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const descendantIds: Types.ObjectId[] = [categoryId];

    // Level 1 children
    const level1 = await Category.find({
      parentId: categoryId,
      isActive: true,
    }).select('_id');

    if (level1.length === 0) {
      return descendantIds;
    }

    const level1Ids = level1.map((c) => c._id as Types.ObjectId);
    descendantIds.push(...level1Ids);

    // Level 2 children (grandchildren of root)
    const level2 = await Category.find({
      parentId: { $in: level1Ids },
      isActive: true,
    }).select('_id');

    if (level2.length > 0) {
      descendantIds.push(...level2.map((c) => c._id as Types.ObjectId));
    }

    return descendantIds;
  }

  /**
   * Parses repeated or array attribute/spec query parameters into structured filters.
   * Example: ["color:black", "color:white", "size:large"]
   * -> [{ name: "color", values: ["black", "white"] }, { name: "size", values: ["large"] }]
   */
  parseAttributeFilters(rawFilters?: string[]): AttributeFilter[] {
    if (!rawFilters || rawFilters.length === 0) return [];

    const map = new Map<string, Set<string>>();

    for (const raw of rawFilters) {
      const colonIndex = raw.indexOf(':');
      if (colonIndex <= 0 || colonIndex >= raw.length - 1) continue;

      const name = raw.substring(0, colonIndex).trim().toLowerCase();
      const value = raw.substring(colonIndex + 1).trim().toLowerCase();

      if (name && value) {
        if (!map.has(name)) {
          map.set(name, new Set());
        }
        map.get(name)!.add(value);
      }
    }

    const result: AttributeFilter[] = [];
    for (const [name, valSet] of map.entries()) {
      result.push({
        name,
        values: Array.from(valSet),
      });
    }

    return result;
  }

  /**
   * Main Public Product Discovery & Search Engine
   */
  async searchProducts(query: ProductSearchQuery): Promise<PublicProductSearchResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
    const skip = (page - 1) * limit;

    // 1. Fetch active categories & brands for visibility boundary
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
        // Filtered category is inactive or does not exist -> return empty results
        return {
          products: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }

      targetCategoryIds = await this.getDescendantCategoryIds(
        matchedCategory._id as Types.ObjectId
      );
    }

    // 3. Brand filtering (single or multiple brands with OR semantics)
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
        // Requested brands are inactive or non-existent
        return {
          products: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }

      targetBrandIds = matchedBrands.map((b) => b._id as Types.ObjectId);
    }

    // 4. Variant matching for Price & Attributes (Same-Variant Combination Matching)
    const variantAttributes = this.parseAttributeFilters(
      Array.isArray(query.attribute)
        ? query.attribute
        : query.attribute
        ? [query.attribute]
        : []
    );

    const hasPriceFilter = query.minPrice !== undefined || query.maxPrice !== undefined;
    const hasAttributeFilter = variantAttributes.length > 0;

    // Filter qualifying variants (must be active)
    const variantMatchCriteria: FilterQuery<any> = { isActive: true };

    if (hasPriceFilter) {
      variantMatchCriteria.price = {};
      if (query.minPrice !== undefined) {
        variantMatchCriteria.price.$gte = Number(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        variantMatchCriteria.price.$lte = Number(query.maxPrice);
      }
    }

    if (hasAttributeFilter) {
      // Same-variant requirement: each distinct attribute name must match within the SAME variant document
      variantMatchCriteria.$and = variantAttributes.map((attr) => ({
        attributes: {
          $elemMatch: {
            name: { $regex: new RegExp(`^${escapeRegex(attr.name)}$`, 'i') },
            value: {
              $in: attr.values.map((v) => new RegExp(`^${escapeRegex(v)}$`, 'i')),
            },
          },
        },
      }));
    }

    // Query active variants meeting price/attribute criteria
    const qualifyingVariants = await ProductVariant.find(variantMatchCriteria).select(
      'productId price'
    );

    if (qualifyingVariants.length === 0) {
      return {
        products: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const qualifyingProductIds = Array.from(
      new Set(qualifyingVariants.map((v) => v.productId.toString()))
    ).map((id) => new Types.ObjectId(id));

    // 5. Construct Product Query
    const productQuery: FilterQuery<IProduct> = {
      status: PRODUCT_STATUS.ACTIVE,
      categoryId: { $in: targetCategoryIds },
      _id: { $in: qualifyingProductIds },
    };

    if (targetBrandIds !== null) {
      productQuery.brandId = { $in: targetBrandIds };
    } else {
      productQuery.$or = [{ brandId: null }, { brandId: { $in: activeBrandIds } }];
    }

    if (query.featured !== undefined) {
      productQuery.featured = Boolean(query.featured);
    }

    // Specification filters (Product level attributes)
    const specifications = this.parseAttributeFilters(
      Array.isArray(query.spec)
        ? query.spec
        : query.spec
        ? [query.spec]
        : []
    );

    if (specifications.length > 0) {
      productQuery.$and = specifications.map((spec) => ({
        attributes: {
          $elemMatch: {
            name: { $regex: new RegExp(`^${escapeRegex(spec.name)}$`, 'i') },
            value: {
              $in: spec.values.map((v) => new RegExp(`^${escapeRegex(v)}$`, 'i')),
            },
          },
        },
      }));
    }

    // Keyword Search
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      const searchRegex = { $regex: sanitized, $options: 'i' };

      const searchConditions = [
        { name: searchRegex },
        { slug: searchRegex },
        { tags: searchRegex },
        { shortDescription: searchRegex },
        { description: searchRegex },
      ];

      if (productQuery.$and) {
        productQuery.$and.push({ $or: searchConditions });
      } else {
        productQuery.$and = [{ $or: searchConditions }];
      }
    }

    // 6. Build Aggregation Pipeline for Sorting, Pagination, and Price Range Calculation
    const sort = query.sort || 'newest';

    const pipeline: PipelineStage[] = [{ $match: productQuery }];

    // Lookup active variants to compute minPrice, maxPrice, and availableVariantCount
    pipeline.push(
      {
        $lookup: {
          from: 'productvariants',
          let: { prodId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productId', '$$prodId'] },
                    { $eq: ['$isActive', true] },
                  ],
                },
              },
            },
            {
              $project: {
                price: 1,
              },
            },
          ],
          as: 'activeVariants',
        },
      },
      {
        $addFields: {
          availableVariantCount: { $size: '$activeVariants' },
          minPrice: { $min: '$activeVariants.price' },
          maxPrice: { $max: '$activeVariants.price' },
        },
      }
    );

    // Sorting stage
    const sortStage: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'price-asc':
        sortStage.minPrice = 1;
        sortStage._id = 1;
        break;
      case 'price-desc':
        sortStage.minPrice = -1;
        sortStage._id = 1;
        break;
      case 'name-asc':
        sortStage.name = 1;
        sortStage._id = 1;
        break;
      case 'name-desc':
        sortStage.name = -1;
        sortStage._id = 1;
        break;
      case 'oldest':
        sortStage.createdAt = 1;
        sortStage._id = 1;
        break;
      case 'featured':
        sortStage.featured = -1;
        sortStage.createdAt = -1;
        sortStage._id = 1;
        break;
      case 'newest':
      default:
        sortStage.createdAt = -1;
        sortStage._id = 1;
        break;
    }

    pipeline.push({ $sort: sortStage });

    // Facet for pagination and data
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryDoc',
            },
          },
          {
            $lookup: {
              from: 'brands',
              localField: 'brandId',
              foreignField: '_id',
              as: 'brandDoc',
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              shortDescription: 1,
              featured: 1,
              tags: 1,
              images: 1,
              minPrice: 1,
              maxPrice: 1,
              availableVariantCount: 1,
              category: { $arrayElemAt: ['$categoryDoc', 0] },
              brand: { $arrayElemAt: ['$brandDoc', 0] },
            },
          },
        ],
      },
    });

    const [aggResult] = await Product.aggregate(pipeline).collation({
      locale: 'en',
      strength: 2,
    });

    const total = aggResult.metadata[0]?.total || 0;
    const totalPages = Math.ceil(total / limit) || 0;
    const rawProducts = aggResult.data || [];

    const products: PublicProductCardDTO[] = rawProducts.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription || null,
      category: {
        id: p.category?._id?.toString() || '',
        name: p.category?.name || 'Uncategorized',
        slug: p.category?.slug || '',
      },
      brand: p.brand
        ? {
            id: p.brand._id.toString(),
            name: p.brand.name,
            slug: p.brand.slug,
          }
        : null,
      featured: p.featured || false,
      tags: p.tags || [],
      images: (p.images || []).map((img: any) => ({
        url: img.url,
        altText: img.altText || null,
        sortOrder: img.sortOrder || 0,
        isPrimary: Boolean(img.isPrimary),
      })),
      priceRange: {
        min: p.minPrice || 0,
        max: p.maxPrice || 0,
        currency: env.STORE_CURRENCY,
      },
      availableVariantCount: p.availableVariantCount || 0,
    }));

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}

export const productSearchService = new ProductSearchService();
