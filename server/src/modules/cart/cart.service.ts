import { Types } from 'mongoose';
import { Cart, ICart } from './cart.model.js';
import { ProductVariant, IProductVariant } from '../catalog/products/product-variant.model.js';
import { Product, IProduct, IProductImage } from '../catalog/products/product.model.js';
import { ICategory } from '../catalog/categories/category.model.js';
import { IBrand } from '../catalog/brands/brand.model.js';
import { PRODUCT_STATUS } from '../catalog/products/product.constants.js';
import {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_DISTINCT_ITEMS,
  UNAVAILABLE_REASON,
  UnavailableReason,
} from './cart.constants.js';
import {
  CartDTO,
  CartItemDTO,
  AddToCartDTO,
} from './cart.types.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

type IPopulatedProduct = Omit<IProduct, 'categoryId' | 'brandId'> & {
  _id: Types.ObjectId;
  categoryId: ICategory | null;
  brandId: IBrand | null;
};

export class CartService {
  /**
   * Enriches raw cart items in batch to avoid N+1 database queries.
   */
  private async enrichCart(cart: ICart | null): Promise<CartDTO> {
    if (!cart || !cart.items || cart.items.length === 0) {
      return {
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        subtotal: 0,
        currency: env.STORE_CURRENCY,
      };
    }

    // Sort items by addedAt descending (newest first)
    const sortedItems = [...cart.items].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );

    const variantIds = sortedItems.map((item) => item.variantId);

    // 1. Batch fetch all variants
    const variants = await ProductVariant.find({ _id: { $in: variantIds } });
    const variantMap = new Map<string, IProductVariant>();
    const productIds: Types.ObjectId[] = [];

    for (const v of variants) {
      variantMap.set(v._id.toString(), v);
      if (v.productId) {
        productIds.push(v.productId);
      }
    }

    // 2. Batch fetch parent products with category and brand populated
    const products = await Product.find({ _id: { $in: productIds } })
      .populate<{ categoryId: ICategory | null }>('categoryId')
      .populate<{ brandId: IBrand | null }>('brandId');

    const productMap = new Map<string, IPopulatedProduct>();
    for (const p of products) {
      productMap.set(p._id.toString(), p as unknown as IPopulatedProduct);
    }


    // 3. Assemble dynamic CartItemDTOs
    const enrichedItems: CartItemDTO[] = [];

    for (const item of sortedItems) {
      const vidStr = item.variantId.toString();
      const variant = variantMap.get(vidStr);

      if (!variant) {
        // Variant document was deleted
        enrichedItems.push({
          variantId: vidStr,
          productId: null,
          productName: null,
          productSlug: null,
          primaryImage: null,
          sku: null,
          variantAttributes: [],
          quantity: item.quantity,
          unitPrice: 0,
          lineTotal: 0,
          currency: env.STORE_CURRENCY,
          isAvailable: false,
          unavailableReason: UNAVAILABLE_REASON.VARIANT_NOT_FOUND,
          addedAt: item.addedAt.toISOString(),
        });
        continue;
      }

      const pidStr = variant.productId ? variant.productId.toString() : '';
      const product = pidStr ? productMap.get(pidStr) : null;

      if (!product) {
        // Parent product was deleted
        enrichedItems.push({
          variantId: vidStr,
          productId: pidStr || null,
          productName: null,
          productSlug: null,
          primaryImage: variant.imageUrl || null,
          sku: variant.sku,
          variantAttributes: (variant.attributes || []).map((a) => ({
            name: a.name,
            value: a.value,
          })),
          quantity: item.quantity,
          unitPrice: 0,
          lineTotal: 0,
          currency: env.STORE_CURRENCY,
          isAvailable: false,
          unavailableReason: UNAVAILABLE_REASON.PRODUCT_NOT_FOUND,
          addedAt: item.addedAt.toISOString(),
        });
        continue;
      }

      // Check availability hierarchy
      let isAvailable = true;
      let unavailableReason: UnavailableReason | null = null;

      if (!variant.isActive) {
        isAvailable = false;
        unavailableReason = UNAVAILABLE_REASON.VARIANT_INACTIVE;
      } else if (product.status !== PRODUCT_STATUS.ACTIVE) {
        isAvailable = false;
        unavailableReason = UNAVAILABLE_REASON.PRODUCT_INACTIVE;
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
          }
        }
      }

      // Determine product primary image
      const primaryImageObj =
        (product.images || []).find((img: IProductImage) => img.isPrimary) ||
        product.images?.[0];
      const primaryImage =
        primaryImageObj?.url || variant.imageUrl || null;


      const unitPrice = isAvailable ? variant.price : variant.price || 0;
      const lineTotal = isAvailable ? variant.price * item.quantity : 0;

      enrichedItems.push({
        variantId: vidStr,
        productId: product._id.toString(),
        productName: product.name,
        productSlug: product.slug,
        primaryImage,
        sku: variant.sku,
        variantAttributes: (variant.attributes || []).map((a) => ({
          name: a.name,
          value: a.value,
        })),
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        currency: env.STORE_CURRENCY,
        isAvailable,
        unavailableReason,
        addedAt: item.addedAt.toISOString(),
      });
    }

    // Subtotal sums only currently available items
    const subtotal = enrichedItems
      .filter((i) => i.isAvailable)
      .reduce((sum, i) => sum + i.lineTotal, 0);

    const totalQuantity = enrichedItems.reduce(
      (sum, i) => sum + i.quantity,
      0
    );

    return {
      items: enrichedItems,
      itemCount: enrichedItems.length,
      totalQuantity,
      subtotal,
      currency: env.STORE_CURRENCY,
    };
  }

  /**
   * Retrieves the authenticated user's cart, enriched with live product and pricing data.
   */
  async getCart(userId: string): Promise<CartDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const cart = await Cart.findOne({ userId: userObjectId });
    return this.enrichCart(cart);
  }

  /**
   * Adds an item to the customer's cart or increments quantity if already present.
   */
  async addItem(userId: string, dto: AddToCartDTO): Promise<CartDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const variantObjectId = new Types.ObjectId(dto.variantId);

    // 1. Verify variant exists
    const variant = await ProductVariant.findById(variantObjectId);
    if (!variant) {
      throw AppError.notFound(
        'Product variant not found.',
        ErrorCodes.ERR_CART_VARIANT_NOT_FOUND
      );
    }

    // 2. Verify variant is active
    if (!variant.isActive) {
      throw AppError.conflict(
        'Product variant is currently unavailable.',
        ErrorCodes.ERR_CART_VARIANT_UNAVAILABLE
      );
    }

    // 3. Verify parent product exists and is active
    const product = await Product.findById(variant.productId)
      .populate<{ categoryId: ICategory | null }>('categoryId')
      .populate<{ brandId: IBrand | null }>('brandId');

    if (!product || product.status !== PRODUCT_STATUS.ACTIVE) {
      throw AppError.conflict(
        'Product is currently unavailable.',
        ErrorCodes.ERR_CART_PRODUCT_UNAVAILABLE
      );
    }

    // 4. Verify category is active
    const category = product.categoryId as unknown as ICategory | null;
    if (!category || !category.isActive) {
      throw AppError.conflict(
        'Product category is currently unavailable.',
        ErrorCodes.ERR_CART_PRODUCT_UNAVAILABLE
      );
    }

    // 5. Verify brand is active (if brand is present)
    const brand = product.brandId as unknown as IBrand | null;
    if (brand && !brand.isActive) {
      throw AppError.conflict(
        'Product brand is currently unavailable.',
        ErrorCodes.ERR_CART_PRODUCT_UNAVAILABLE
      );
    }

    // 6. Find or create Cart
    let cart = await Cart.findOne({ userId: userObjectId });

    if (!cart) {
      cart = new Cart({
        userId: userObjectId,
        items: [
          {
            variantId: variantObjectId,
            quantity: dto.quantity,
            addedAt: new Date(),
          },
        ],
      });
      await cart.save();
    } else {
      const existingIndex = cart.items.findIndex((item) =>
        item.variantId.equals(variantObjectId)
      );

      if (existingIndex > -1) {
        const nextQuantity =
          cart.items[existingIndex].quantity + dto.quantity;
        if (nextQuantity > MAX_CART_ITEM_QUANTITY) {
          throw AppError.badRequest(
            `Cannot add ${dto.quantity} item(s). Total item quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}.`,
            ErrorCodes.ERR_CART_QUANTITY_LIMIT
          );
        }
        cart.items[existingIndex].quantity = nextQuantity;
      } else {
        if (cart.items.length >= MAX_CART_DISTINCT_ITEMS) {
          throw AppError.badRequest(
            `Cart item limit reached. You can have at most ${MAX_CART_DISTINCT_ITEMS} distinct items in your cart.`,
            ErrorCodes.ERR_CART_ITEM_LIMIT_REACHED
          );
        }

        cart.items.push({
          variantId: variantObjectId,
          quantity: dto.quantity,
          addedAt: new Date(),
        });
      }

      await cart.save();
    }

    return this.enrichCart(cart);
  }

  /**
   * Updates quantity for an existing cart item.
   */
  async updateItemQuantity(
    userId: string,
    variantId: string,
    quantity: number
  ): Promise<CartDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const variantObjectId = new Types.ObjectId(variantId);

    const cart = await Cart.findOne({ userId: userObjectId });
    if (!cart) {
      throw AppError.notFound(
        'Cart item not found.',
        ErrorCodes.ERR_CART_ITEM_NOT_FOUND
      );
    }

    const item = cart.items.find((i) => i.variantId.equals(variantObjectId));
    if (!item) {
      throw AppError.notFound(
        'Cart item not found in your cart.',
        ErrorCodes.ERR_CART_ITEM_NOT_FOUND
      );
    }

    item.quantity = quantity;
    await cart.save();

    return this.enrichCart(cart);
  }

  /**
   * Removes a variant line from the authenticated user's cart.
   * Note: Works even if the variant document was hard deleted.
   */
  async removeItem(userId: string, variantId: string): Promise<CartDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const variantObjectId = new Types.ObjectId(variantId);

    const cart = await Cart.findOne({ userId: userObjectId });
    if (!cart) {
      throw AppError.notFound(
        'Cart item not found.',
        ErrorCodes.ERR_CART_ITEM_NOT_FOUND
      );
    }

    const index = cart.items.findIndex((i) =>
      i.variantId.equals(variantObjectId)
    );
    if (index === -1) {
      throw AppError.notFound(
        'Cart item not found in your cart.',
        ErrorCodes.ERR_CART_ITEM_NOT_FOUND
      );
    }

    cart.items.splice(index, 1);
    await cart.save();

    return this.enrichCart(cart);
  }

  /**
   * Clears all items from the customer's cart.
   */
  async clearCart(userId: string): Promise<CartDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const cart = await Cart.findOne({ userId: userObjectId });

    if (cart) {
      cart.items = [];
      await cart.save();
      return this.enrichCart(cart);
    }

    return {
      items: [],
      itemCount: 0,
      totalQuantity: 0,
      subtotal: 0,
      currency: env.STORE_CURRENCY,
    };
  }
}

export const cartService = new CartService();
