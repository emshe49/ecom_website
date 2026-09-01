import { Types } from 'mongoose';
import { Wishlist, IWishlist } from './wishlist.model.js';
import { Product, IProduct, IProductImage } from '../catalog/products/product.model.js';
import { ProductVariant, IProductVariant } from '../catalog/products/product-variant.model.js';
import { ICategory } from '../catalog/categories/category.model.js';
import { IBrand } from '../catalog/brands/brand.model.js';
import { PRODUCT_STATUS } from '../catalog/products/product.constants.js';
import {
  MAX_WISHLIST_ITEMS,
  UNAVAILABLE_REASON,
  UnavailableReason,
} from './wishlist.constants.js';
import {
  WishlistDTO,
  WishlistItemDTO,
  WishlistVariantOptionDTO,
} from './wishlist.types.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

type IPopulatedProduct = Omit<IProduct, 'categoryId' | 'brandId'> & {
  _id: Types.ObjectId;
  categoryId: ICategory | null;
  brandId: IBrand | null;
};

export class WishlistService {
  /**
   * Enriches raw wishlist items in batch to avoid N+1 database queries.
   */
  private async enrichWishlist(wishlist: IWishlist | null): Promise<WishlistDTO> {
    if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
      return {
        items: [],
        itemCount: 0,
      };
    }

    // Sort items by addedAt descending (newest first)
    const sortedItems = [...wishlist.items].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );

    const productIds = sortedItems.map((item) => item.productId);

    // 1. Batch fetch all parent products with category and brand populated
    const products = await Product.find({ _id: { $in: productIds } })
      .populate<{ categoryId: ICategory | null }>('categoryId')
      .populate<{ brandId: IBrand | null }>('brandId');

    const productMap = new Map<string, IPopulatedProduct>();
    for (const p of products) {
      productMap.set(p._id.toString(), p as unknown as IPopulatedProduct);
    }

    // 2. Batch fetch all variants belonging to these products
    const variants = await ProductVariant.find({ productId: { $in: productIds } });
    const variantsByProduct = new Map<string, IProductVariant[]>();
    for (const v of variants) {
      if (v.productId) {
        const pidStr = v.productId.toString();
        const existing = variantsByProduct.get(pidStr) || [];
        existing.push(v);
        variantsByProduct.set(pidStr, existing);
      }
    }

    // 3. Assemble dynamic WishlistItemDTOs
    const enrichedItems: WishlistItemDTO[] = [];

    for (const item of sortedItems) {
      const pidStr = item.productId.toString();
      const product = productMap.get(pidStr);

      if (!product) {
        // Product was hard-deleted from database
        enrichedItems.push({
          productId: pidStr,
          name: null,
          slug: null,
          shortDescription: null,
          primaryImage: null,
          category: null,
          brand: null,
          featured: false,
          priceRange: null,
          availableVariantCount: 0,
          isAvailable: false,
          unavailableReason: UNAVAILABLE_REASON.PRODUCT_NOT_FOUND,
          addedAt: item.addedAt.toISOString(),
          variants: [],
        });
        continue;
      }

      const productVariants = variantsByProduct.get(pidStr) || [];
      const activeVariants = productVariants.filter((v) => v.isActive);

      // Check availability hierarchy
      let isAvailable = true;
      let unavailableReason: UnavailableReason | null = null;

      if (product.status === PRODUCT_STATUS.DRAFT) {
        isAvailable = false;
        unavailableReason = UNAVAILABLE_REASON.PRODUCT_DRAFT;
      } else if (product.status === PRODUCT_STATUS.INACTIVE) {
        isAvailable = false;
        unavailableReason = UNAVAILABLE_REASON.PRODUCT_INACTIVE;
      } else if (product.status === PRODUCT_STATUS.ARCHIVED) {
        isAvailable = false;
        unavailableReason = UNAVAILABLE_REASON.PRODUCT_ARCHIVED;
      } else {
        const category = product.categoryId as unknown as ICategory | null;
        if (!category || !category.isActive) {
          isAvailable = false;
          unavailableReason = UNAVAILABLE_REASON.CATEGORY_INACTIVE;
        } else {
          const brand = product.brandId as unknown as IBrand | null;
          if (brand && !brand.isActive) {
            isAvailable = false;
            unavailableReason = UNAVAILABLE_REASON.BRAND_INACTIVE;
          } else if (activeVariants.length === 0) {
            isAvailable = false;
            unavailableReason = UNAVAILABLE_REASON.NO_ACTIVE_VARIANTS;
          }
        }
      }

      // Compute dynamic priceRange from active variants
      let priceRange = null;
      if (activeVariants.length > 0) {
        const prices = activeVariants.map((v) => v.price);
        priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices),
          currency: env.STORE_CURRENCY,
        };
      }

      // Determine product primary image
      const primaryImageObj =
        (product.images || []).find((img: IProductImage) => img.isPrimary) ||
        product.images?.[0];
      const primaryImage =
        primaryImageObj?.url || activeVariants[0]?.imageUrl || null;

      const categoryDoc = product.categoryId as unknown as ICategory | null;
      const brandDoc = product.brandId as unknown as IBrand | null;

      const variantOptions: WishlistVariantOptionDTO[] = productVariants.map((v) => ({
        id: v._id.toString(),
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice || null,
        imageUrl: v.imageUrl || null,
        attributes: (v.attributes || []).map((a) => ({
          name: a.name,
          value: a.value,
        })),
        isActive: v.isActive,
      }));

      enrichedItems.push({
        productId: pidStr,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription || null,
        primaryImage,
        category: categoryDoc
          ? {
              id: categoryDoc._id.toString(),
              name: categoryDoc.name,
              slug: categoryDoc.slug,
            }
          : null,
        brand: brandDoc
          ? {
              id: brandDoc._id.toString(),
              name: brandDoc.name,
              slug: brandDoc.slug,
            }
          : null,
        featured: product.featured,
        priceRange,
        availableVariantCount: activeVariants.length,
        isAvailable,
        unavailableReason,
        addedAt: item.addedAt.toISOString(),
        variants: variantOptions,
      });
    }

    return {
      items: enrichedItems,
      itemCount: enrichedItems.length,
    };
  }

  /**
   * Retrieves the current customer's wishlist.
   */
  async getWishlist(userId: string): Promise<WishlistDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const wishlist = await Wishlist.findOne({ userId: userObjectId });
    return this.enrichWishlist(wishlist);
  }

  /**
   * Adds a product to the customer's wishlist (or returns current state if duplicate).
   */
  async addItem(userId: string, productId: string): Promise<WishlistDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const productObjectId = new Types.ObjectId(productId);

    // 1. Verify product existence and public availability
    const product = await Product.findById(productObjectId)
      .populate<{ categoryId: ICategory | null }>('categoryId')
      .populate<{ brandId: IBrand | null }>('brandId');

    if (!product) {
      throw AppError.notFound(
        'Product not found.',
        ErrorCodes.ERR_WISHLIST_PRODUCT_NOT_FOUND
      );
    }

    if (product.status !== PRODUCT_STATUS.ACTIVE) {
      throw AppError.conflict(
        'Product is not currently available.',
        ErrorCodes.ERR_WISHLIST_PRODUCT_UNAVAILABLE
      );
    }

    const category = product.categoryId as unknown as ICategory | null;
    if (!category || !category.isActive) {
      throw AppError.conflict(
        'Product category is inactive.',
        ErrorCodes.ERR_WISHLIST_PRODUCT_UNAVAILABLE
      );
    }

    const brand = product.brandId as unknown as IBrand | null;
    if (brand && !brand.isActive) {
      throw AppError.conflict(
        'Product brand is inactive.',
        ErrorCodes.ERR_WISHLIST_PRODUCT_UNAVAILABLE
      );
    }

    // Verify at least one active variant
    const activeVariantsCount = await ProductVariant.countDocuments({
      productId: productObjectId,
      isActive: true,
    });

    if (activeVariantsCount === 0) {
      throw AppError.conflict(
        'Product has no active variants.',
        ErrorCodes.ERR_WISHLIST_PRODUCT_UNAVAILABLE
      );
    }

    // 2. Fetch or initialize customer wishlist
    let wishlist = await Wishlist.findOne({ userId: userObjectId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: userObjectId,
        items: [],
      });
    }

    // 3. Idempotent check: if product already in wishlist, return success preserving addedAt
    const exists = wishlist.items.some(
      (item) => item.productId.toString() === productId
    );

    if (exists) {
      return this.enrichWishlist(wishlist);
    }

    // 4. Enforce max wishlist items limit
    if (wishlist.items.length >= MAX_WISHLIST_ITEMS) {
      throw AppError.conflict(
        `Wishlist item limit of ${MAX_WISHLIST_ITEMS} reached.`,
        ErrorCodes.ERR_WISHLIST_ITEM_LIMIT_REACHED
      );
    }

    // 5. Append item and save
    wishlist.items.push({
      productId: productObjectId,
      addedAt: new Date(),
    });

    await wishlist.save();

    return this.enrichWishlist(wishlist);
  }

  /**
   * Removes a product from the customer's wishlist.
   */
  async removeItem(userId: string, productId: string): Promise<WishlistDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const wishlist = await Wishlist.findOne({ userId: userObjectId });

    if (!wishlist) {
      throw AppError.notFound(
        'Product is not in your wishlist.',
        ErrorCodes.ERR_WISHLIST_ITEM_NOT_FOUND
      );
    }

    const itemIndex = wishlist.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      throw AppError.notFound(
        'Product is not in your wishlist.',
        ErrorCodes.ERR_WISHLIST_ITEM_NOT_FOUND
      );
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    return this.enrichWishlist(wishlist);
  }

  /**
   * Clears all items from the customer's wishlist.
   */
  async clearWishlist(userId: string): Promise<WishlistDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const wishlist = await Wishlist.findOne({ userId: userObjectId });

    if (wishlist && wishlist.items.length > 0) {
      wishlist.items = [];
      await wishlist.save();
    }

    return {
      items: [],
      itemCount: 0,
    };
  }
}

export const wishlistService = new WishlistService();
