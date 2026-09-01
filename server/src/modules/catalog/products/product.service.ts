import { Types, FilterQuery } from 'mongoose';
import { Product, IProduct, IProductImage, IProductAttribute, IRatingDistribution } from './product.model.js';
import { ProductVariant } from './product-variant.model.js';
import { Category, ICategory } from '../categories/category.model.js';
import { Brand, IBrand } from '../brands/brand.model.js';
import { PRODUCT_STATUS, ProductStatus } from './product.constants.js';
import {
  ProductDTO,
  ProductDetailDTO,
  PublicProductDTO,
  PublicProductDetailDTO,
  CreateProductDTO,
  UpdateProductDTO,
  ProductQueryFilters,
  PublicProductQueryFilters,
  PriceRangeDTO,
} from './product.types.js';
import { Inventory, IInventory } from '../../inventory/inventory.model.js';

import { InventoryTransaction } from '../../inventory/inventory-transaction.model.js';
import { variantService } from './variant.service.js';
import { slugify, escapeRegex } from '../catalog.utils.js';
import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ErrorCodes } from '../../../shared/errors/error-codes.js';

export class ProductService {
  private normalizeTags(tags: string[] = []): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of tags) {
      const normalized = tag.trim().toLowerCase();
      if (normalized.length >= 2 && !seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    }
    return result;
  }

  private normalizeImages(images: IProductImage[] = []): IProductImage[] {
    if (!images || images.length === 0) return [];

    let hasPrimary = false;
    const normalized: IProductImage[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const isPrimary = img.isPrimary && !hasPrimary;
      if (isPrimary) hasPrimary = true;

      normalized.push({
        url: img.url.trim(),
        altText: img.altText?.trim() || null,
        sortOrder: img.sortOrder !== undefined ? img.sortOrder : i,
        isPrimary,
      });
    }

    // If no image is marked primary, make the first one primary
    if (!hasPrimary && normalized.length > 0) {
      normalized[0].isPrimary = true;
    }

    return normalized;
  }

  private normalizeAttributes(attributes: IProductAttribute[] = []): IProductAttribute[] {
    if (!attributes || attributes.length === 0) return [];

    const seenNames = new Set<string>();
    const normalized: IProductAttribute[] = [];

    for (const attr of attributes) {
      const trimmedName = attr.name.trim();
      const lowerName = trimmedName.toLowerCase();
      if (seenNames.has(lowerName)) {
        throw AppError.badRequest(
          `Duplicate product specification attribute '${trimmedName}'.`,
          ErrorCodes.VALIDATION_ERROR
        );
      }
      seenNames.add(lowerName);
      normalized.push({
        name: trimmedName,
        value: attr.value.trim(),
      });
    }

    return normalized;
  }

  private async validateCategory(categoryId: Types.ObjectId): Promise<ICategory> {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw AppError.badRequest(
        'Category not found.',
        ErrorCodes.ERR_PRODUCT_INVALID_CATEGORY
      );
    }

    if (!category.isActive) {
      throw AppError.badRequest(
        'Cannot assign product to an inactive category.',
        ErrorCodes.ERR_CATEGORY_INACTIVE
      );
    }

    // Leaf category rule: category must not have child subcategories
    const childrenCount = await Category.countDocuments({ parentId: categoryId });
    if (childrenCount > 0) {
      throw AppError.badRequest(
        `Category '${category.name}' has subcategories. Products must be assigned to leaf categories.`,
        ErrorCodes.ERR_CATEGORY_NOT_LEAF
      );
    }

    return category;
  }

  private async validateBrand(brandId: Types.ObjectId | null): Promise<IBrand | null> {
    if (!brandId) return null;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw AppError.badRequest('Brand not found.', ErrorCodes.ERR_PRODUCT_BRAND_NOT_FOUND);
    }

    if (!brand.isActive) {
      throw AppError.badRequest(
        'Cannot assign product to an inactive brand.',
        ErrorCodes.ERR_PRODUCT_BRAND_INACTIVE
      );
    }

    return brand;
  }

  private mapToDTO(
    product: {
      _id: Types.ObjectId;
      name: string;
      slug: string;
      shortDescription?: string | null;
      description?: string | null;
      categoryId: Types.ObjectId | ICategory | null;
      brandId?: Types.ObjectId | IBrand | null;
      status: ProductStatus;
      featured: boolean;
      tags: string[];
      images: IProductImage[];
      attributes: IProductAttribute[];
      ratingAverage?: number;
      ratingCount?: number;
      ratingDistribution?: IRatingDistribution;
      seoTitle?: string | null;
      seoDescription?: string | null;
      createdBy?: Types.ObjectId | null;
      updatedBy?: Types.ObjectId | null;
      publishedAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    categoryDoc?: ICategory | null,
    brandDoc?: IBrand | null,
    priceRange?: PriceRangeDTO | null,
    variantsCount = 0
  ): ProductDTO {
    const categoryIdStr =
      product.categoryId instanceof Types.ObjectId
        ? product.categoryId.toString()
        : product.categoryId
        ? (product.categoryId as ICategory)._id.toString()
        : '';

    const brandIdStr = product.brandId
      ? product.brandId instanceof Types.ObjectId
        ? product.brandId.toString()
        : (product.brandId as IBrand)._id.toString()
      : null;

    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      categoryId: categoryIdStr,
      category: categoryDoc
        ? {
            id: categoryDoc._id.toString(),
            name: categoryDoc.name,
            slug: categoryDoc.slug,
          }
        : null,
      brandId: brandIdStr,
      brand: brandDoc
        ? {
            id: brandDoc._id.toString(),
            name: brandDoc.name,
            slug: brandDoc.slug,
          }
        : null,
      status: product.status,
      featured: product.featured,
      tags: product.tags || [],
      images: (product.images || []).map((img) => ({
        url: img.url,
        altText: img.altText || null,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
      attributes: product.attributes || [],
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      variantsCount,
      priceRange: priceRange || null,
      ratingAverage: product.ratingAverage || 0,
      ratingCount: product.ratingCount || 0,
      ratingDistribution: product.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      createdBy: product.createdBy ? product.createdBy.toString() : null,
      updatedBy: product.updatedBy ? product.updatedBy.toString() : null,
      publishedAt: product.publishedAt ? product.publishedAt.toISOString() : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  async createProduct(adminId: string, dto: CreateProductDTO): Promise<ProductDTO> {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    // Slug uniqueness check
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      throw AppError.conflict(
        `A product with slug '${slug}' already exists.`,
        ErrorCodes.ERR_PRODUCT_SLUG_EXISTS
      );
    }

    const categoryObjectId = new Types.ObjectId(dto.categoryId);
    const category = await this.validateCategory(categoryObjectId);

    const brandObjectId = dto.brandId ? new Types.ObjectId(dto.brandId) : null;
    const brand = await this.validateBrand(brandObjectId);

    const tags = this.normalizeTags(dto.tags);
    const images = this.normalizeImages(dto.images as IProductImage[]);
    const attributes = this.normalizeAttributes(dto.attributes as IProductAttribute[]);

    const product = new Product({
      name: dto.name.trim(),
      slug,
      shortDescription: dto.shortDescription?.trim() || null,
      description: dto.description?.trim() || null,
      categoryId: categoryObjectId,
      brandId: brandObjectId,
      status: PRODUCT_STATUS.DRAFT, // Products always default to DRAFT
      featured: dto.featured || false,
      tags,
      images,
      attributes,
      seoTitle: dto.seoTitle?.trim() || null,
      seoDescription: dto.seoDescription?.trim() || null,
      createdBy: new Types.ObjectId(adminId),
      updatedBy: new Types.ObjectId(adminId),
      publishedAt: null,
    });

    await product.save();
    return this.mapToDTO(product, category, brand, null, 0);
  }

  async listAdminProducts(
    filters: ProductQueryFilters
  ): Promise<{ products: ProductDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IProduct> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.categoryId) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }

    if (filters.brandId) {
      query.brandId = new Types.ObjectId(filters.brandId);
    }

    if (filters.featured !== undefined) {
      query.featured = filters.featured;
    }

    if (filters.search) {
      const escaped = escapeRegex(filters.search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate<{ categoryId: ICategory | null }>('categoryId', 'name slug')
        .populate<{ brandId: IBrand | null }>('brandId', 'name slug')
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    // Batch query variant counts and price ranges
    const productIds = products.map((p) => p._id);
    const variants = await ProductVariant.find({ productId: { $in: productIds } }).select(
      'productId price isActive'
    );

    const variantCountMap = new Map<string, number>();
    const priceMap = new Map<string, { min: number; max: number }>();

    for (const v of variants) {
      const pid = v.productId.toString();
      variantCountMap.set(pid, (variantCountMap.get(pid) || 0) + 1);

      if (v.isActive) {
        const current = priceMap.get(pid);
        if (!current) {
          priceMap.set(pid, { min: v.price, max: v.price });
        } else {
          priceMap.set(pid, {
            min: Math.min(current.min, v.price),
            max: Math.max(current.max, v.price),
          });
        }
      }
    }

    const dtos = products.map((p) => {
      const pid = p._id.toString();
      const pRange = priceMap.get(pid);
      const priceRange: PriceRangeDTO | null = pRange
        ? { min: pRange.min, max: pRange.max, currency: env.STORE_CURRENCY }
        : null;

      const categoryDoc =
        p.categoryId && typeof p.categoryId === 'object' ? (p.categoryId as unknown as ICategory) : null;
      const brandDoc =
        p.brandId && typeof p.brandId === 'object' ? (p.brandId as unknown as IBrand) : null;

      return this.mapToDTO(p, categoryDoc, brandDoc, priceRange, variantCountMap.get(pid) || 0);
    });

    return {
      products: dtos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProductById(productId: string): Promise<ProductDetailDTO> {
    const productObjectId = new Types.ObjectId(productId);
    const product = await Product.findById(productObjectId)
      .populate<{ categoryId: ICategory | null }>('categoryId', 'name slug')
      .populate<{ brandId: IBrand | null }>('brandId', 'name slug');

    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const variants = await ProductVariant.find({ productId: productObjectId }).sort({
      createdAt: 1,
    });

    const activeVariants = variants.filter((v) => v.isActive);
    let priceRange: PriceRangeDTO | null = null;
    if (activeVariants.length > 0) {
      const prices = activeVariants.map((v) => v.price);
      priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices),
        currency: env.STORE_CURRENCY,
      };
    }

    const categoryDoc =
      product.categoryId && typeof product.categoryId === 'object'
        ? (product.categoryId as unknown as ICategory)
        : null;
    const brandDoc =
      product.brandId && typeof product.brandId === 'object'
        ? (product.brandId as unknown as IBrand)
        : null;

    const baseDTO = this.mapToDTO(
      product,
      categoryDoc,
      brandDoc,
      priceRange,
      variants.length
    );

    return {
      ...baseDTO,
      variants: variants.map((v) => variantService.mapToDTO(v)),
    };
  }

  async updateProduct(adminId: string, productId: string, dto: UpdateProductDTO): Promise<ProductDTO> {
    const productObjectId = new Types.ObjectId(productId);
    const product = await Product.findById(productObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    // Slug update
    if (dto.slug && dto.slug !== product.slug) {
      const normalizedSlug = slugify(dto.slug);
      const existingSlug = await Product.findOne({
        slug: normalizedSlug,
        _id: { $ne: productObjectId },
      });
      if (existingSlug) {
        throw AppError.conflict(
          `A product with slug '${normalizedSlug}' already exists.`,
          ErrorCodes.ERR_PRODUCT_SLUG_EXISTS
        );
      }
      product.slug = normalizedSlug;
    }

    // Category update
    if (dto.categoryId !== undefined) {
      const categoryObjectId = new Types.ObjectId(dto.categoryId);
      await this.validateCategory(categoryObjectId);
      product.categoryId = categoryObjectId;
    }

    // Brand update
    if (dto.brandId !== undefined) {
      const brandObjectId = dto.brandId ? new Types.ObjectId(dto.brandId) : null;
      await this.validateBrand(brandObjectId);
      product.brandId = brandObjectId;
    }

    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.shortDescription !== undefined) product.shortDescription = dto.shortDescription?.trim() || null;
    if (dto.description !== undefined) product.description = dto.description?.trim() || null;
    if (dto.featured !== undefined) product.featured = dto.featured;
    if (dto.tags !== undefined) product.tags = this.normalizeTags(dto.tags);
    if (dto.images !== undefined) product.images = this.normalizeImages(dto.images as IProductImage[]);
    if (dto.attributes !== undefined) product.attributes = this.normalizeAttributes(dto.attributes as IProductAttribute[]);
    if (dto.seoTitle !== undefined) product.seoTitle = dto.seoTitle?.trim() || null;
    if (dto.seoDescription !== undefined) product.seoDescription = dto.seoDescription?.trim() || null;
    product.updatedBy = new Types.ObjectId(adminId);

    await product.save();

    return this.getProductById(productId);
  }

  async updateProductStatus(
    adminId: string,
    productId: string,
    newStatus: ProductStatus
  ): Promise<ProductDTO> {
    const productObjectId = new Types.ObjectId(productId);
    const product = await Product.findById(productObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    // Validation for transitioning to ACTIVE
    if (newStatus === PRODUCT_STATUS.ACTIVE) {
      // 1. Verify category is active and leaf
      await this.validateCategory(product.categoryId);

      // 2. Verify brand if present
      if (product.brandId) {
        await this.validateBrand(product.brandId);
      }

      // 3. Verify at least one active variant exists
      const activeVariantCount = await ProductVariant.countDocuments({
        productId: productObjectId,
        isActive: true,
      });

      if (activeVariantCount === 0) {
        throw AppError.badRequest(
          'Cannot publish product without at least one active variant. Please create or activate a variant first.',
          ErrorCodes.ERR_PRODUCT_REQUIRES_ACTIVE_VARIANT
        );
      }

      if (!product.publishedAt) {
        product.publishedAt = new Date();
      }
    }

    product.status = newStatus;
    product.updatedBy = new Types.ObjectId(adminId);
    await product.save();

    return this.getProductById(productId);
  }

  async deleteProduct(productId: string): Promise<void> {
    const productObjectId = new Types.ObjectId(productId);
    const product = await Product.findById(productObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const variants = await ProductVariant.find({ productId: productObjectId });
    const variantIds = variants.map((v) => v._id);

    const [activeStock, hasTransactions] = await Promise.all([
      Inventory.exists({
        variantId: { $in: variantIds },
        $or: [{ onHand: { $gt: 0 } }, { reserved: { $gt: 0 } }],
      }),
      InventoryTransaction.exists({
        variantId: { $in: variantIds },
      }),
    ]);

    if (activeStock || hasTransactions) {
      throw AppError.badRequest(
        'Cannot hard-delete product with inventory stock or transaction history. Deactivate or archive the product instead.',
        ErrorCodes.ERR_VARIANT_HAS_INVENTORY_HISTORY
      );
    }

    // Delete associated inventory docs, variants, and product
    await Inventory.deleteMany({ variantId: { $in: variantIds } });
    await ProductVariant.deleteMany({ productId: productObjectId });
    await Product.findByIdAndDelete(productObjectId);
  }


  // Cross-module dependency check helpers
  async existsByCategory(categoryId: string): Promise<boolean> {
    const count = await Product.countDocuments({ categoryId: new Types.ObjectId(categoryId) });
    return count > 0;
  }

  async existsByBrand(brandId: string): Promise<boolean> {
    const count = await Product.countDocuments({ brandId: new Types.ObjectId(brandId) });
    return count > 0;
  }

  // Public Catalog Browsing API
  async listPublicProducts(
    filters: PublicProductQueryFilters
  ): Promise<{ products: PublicProductDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Fetch active categories and brands to enforce catalog visibility
    const [activeCategories, activeBrands] = await Promise.all([
      Category.find({ isActive: true }).select('_id slug'),
      Brand.find({ isActive: true }).select('_id slug'),
    ]);

    const activeCategoryIds = activeCategories.map((c) => c._id);
    const activeBrandIds = activeBrands.map((b) => b._id);

    const query: FilterQuery<IProduct> = {
      status: PRODUCT_STATUS.ACTIVE,
      categoryId: { $in: activeCategoryIds },
      $or: [{ brandId: null }, { brandId: { $in: activeBrandIds } }],
    };

    if (filters.category) {
      const catMatch = activeCategories.find(
        (c) => c.slug === filters.category || c._id.toString() === filters.category
      );
      if (catMatch) {
        query.categoryId = catMatch._id;
      } else {
        // Requested category is inactive or non-existent
        return { products: [], pagination: { page, limit, total: 0, totalPages: 1 } };
      }
    }

    if (filters.brand) {
      const brandMatch = activeBrands.find(
        (b) => b.slug === filters.brand || b._id.toString() === filters.brand
      );
      if (brandMatch) {
        query.brandId = brandMatch._id;
      } else {
        return { products: [], pagination: { page, limit, total: 0, totalPages: 1 } };
      }
    }

    if (filters.featured !== undefined) {
      query.featured = filters.featured;
    }

    if (filters.search) {
      const escaped = escapeRegex(filters.search.trim());
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { slug: { $regex: escaped, $options: 'i' } },
            { tags: { $regex: escaped, $options: 'i' } },
          ],
        },
      ];
    }

    // Only include products that have at least one active variant
    const activeVariants = await ProductVariant.find({ isActive: true }).select('productId price');
    const activeProductIds = Array.from(new Set(activeVariants.map((v) => v.productId.toString()))).map(
      (id) => new Types.ObjectId(id)
    );

    query._id = { $in: activeProductIds };

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate<{ categoryId: ICategory }>('categoryId', 'name slug')
        .populate<{ brandId: IBrand | null }>('brandId', 'name slug')
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    // Build price ranges map
    const priceMap = new Map<string, { min: number; max: number }>();
    for (const v of activeVariants) {
      const pid = v.productId.toString();
      const current = priceMap.get(pid);
      if (!current) {
        priceMap.set(pid, { min: v.price, max: v.price });
      } else {
        priceMap.set(pid, {
          min: Math.min(current.min, v.price),
          max: Math.max(current.max, v.price),
        });
      }
    }

    const dtos: PublicProductDTO[] = products.map((p) => {
      const pid = p._id.toString();
      const pRange = priceMap.get(pid) || { min: 0, max: 0 };
      const categoryDoc = p.categoryId as unknown as ICategory;
      const brandDoc = p.brandId ? (p.brandId as unknown as IBrand) : null;

      return {
        id: pid,
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription || null,
        category: {
          id: categoryDoc._id.toString(),
          name: categoryDoc.name,
          slug: categoryDoc.slug,
        },
        brand: brandDoc
          ? {
              id: brandDoc._id.toString(),
              name: brandDoc.name,
              slug: brandDoc.slug,
            }
          : null,
        featured: p.featured,
        tags: p.tags || [],
        images: (p.images || []).map((img) => ({
          url: img.url,
          altText: img.altText || null,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })),
        attributes: p.attributes || [],
        priceRange: {
          min: pRange.min,
          max: pRange.max,
          currency: env.STORE_CURRENCY,
        },
        ratingAverage: p.ratingAverage || 0,
        ratingCount: p.ratingCount || 0,
      };
    });

    return {
      products: dtos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPublicProductBySlug(slug: string): Promise<PublicProductDetailDTO> {
    const product = await Product.findOne({
      slug: slug.trim().toLowerCase(),
      status: PRODUCT_STATUS.ACTIVE,
    })
      .populate<{ categoryId: ICategory }>('categoryId', 'name slug isActive')
      .populate<{ brandId: IBrand | null }>('brandId', 'name slug isActive');

    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const categoryDoc = product.categoryId as unknown as ICategory;
    if (!categoryDoc || !categoryDoc.isActive) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const brandDoc = product.brandId ? (product.brandId as unknown as IBrand) : null;
    if (brandDoc && !brandDoc.isActive) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const activeVariants = await ProductVariant.find({
      productId: product._id,
      isActive: true,
    }).sort({ createdAt: 1 });

    if (activeVariants.length === 0) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const prices = activeVariants.map((v) => v.price);
    const priceRange: PriceRangeDTO = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: env.STORE_CURRENCY,
    };

    const variantIds = activeVariants.map((v) => v._id);
    const inventories = await Inventory.find({ variantId: { $in: variantIds } });
    const invMap = new Map<string, IInventory>();
    for (const inv of inventories) {
      invMap.set(inv.variantId.toString(), inv);
    }

    return {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription || null,
      description: product.description || null,
      category: {
        id: categoryDoc._id.toString(),
        name: categoryDoc.name,
        slug: categoryDoc.slug,
      },
      brand: brandDoc
        ? {
            id: brandDoc._id.toString(),
            name: brandDoc.name,
            slug: brandDoc.slug,
          }
        : null,
      featured: product.featured,
      tags: product.tags || [],
      images: (product.images || []).map((img) => ({
        url: img.url,
        altText: img.altText || null,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
      attributes: product.attributes || [],
      seoTitle: product.seoTitle || null,
      seoDescription: product.seoDescription || null,
      priceRange,
      ratingAverage: product.ratingAverage || 0,
      ratingCount: product.ratingCount || 0,
      ratingDistribution: product.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      variants: activeVariants.map((v) =>
        variantService.mapToPublicDTO(v, invMap.get(v._id.toString()))
      ),
    };
  }
}


export const productService = new ProductService();
