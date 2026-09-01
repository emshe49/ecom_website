import { Types } from 'mongoose';
import { Order } from '../orders/order.model.js';
import { ORDER_STATUS } from '../orders/order.constants.js';
import { Review } from './review.model.js';
import { Product } from '../catalog/products/product.model.js';
import { EligibleProductToReviewDTO } from './review.types.js';

export interface ReviewEligibilityResult {
  isEligible: boolean;
  orderId?: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  orderNumber?: string;
  deliveredAt?: Date | null;
}

export class ReviewEligibilityService {
  /**
   * Verifies if a customer has an eligible delivered purchase for the specified product.
   * If multiple delivered purchases exist, returns the most recent one.
   */
  async getEligiblePurchase(
    userId: string | Types.ObjectId,
    productId: string | Types.ObjectId
  ): Promise<ReviewEligibilityResult> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const prodObjectId = typeof productId === 'string' ? new Types.ObjectId(productId) : productId;

    // Find delivered orders owned by this customer containing the product
    const eligibleOrder = await Order.findOne({
      userId: userObjectId,
      status: ORDER_STATUS.DELIVERED,
      'items.productId': prodObjectId,
    }).sort({ placedAt: -1, createdAt: -1 });

    if (!eligibleOrder) {
      return { isEligible: false };
    }

    // Find the specific item in the order to extract variantId if applicable
    const orderItem = eligibleOrder.items.find(
      (item) => item.productId.toString() === prodObjectId.toString()
    );

    return {
      isEligible: true,
      orderId: eligibleOrder._id,
      variantId: orderItem?.variantId || null,
      orderNumber: eligibleOrder.orderNumber,
      deliveredAt: eligibleOrder.completedAt || eligibleOrder.updatedAt,
    };
  }

  /**
   * Returns all delivered products purchased by the customer that have not yet been reviewed.
   */
  async getEligibleProductsToReview(
    userId: string | Types.ObjectId
  ): Promise<EligibleProductToReviewDTO[]> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    // 1. Fetch all delivered orders for the user
    const deliveredOrders = await Order.find({
      userId: userObjectId,
      status: ORDER_STATUS.DELIVERED,
    }).sort({ placedAt: -1, createdAt: -1 });

    if (!deliveredOrders || deliveredOrders.length === 0) {
      return [];
    }

    // 2. Fetch all reviews already created by the user
    const userReviews = await Review.find({ userId: userObjectId }).select('productId');
    const reviewedProductIds = new Set(userReviews.map((r) => r.productId.toString()));

    // 3. Extract unreviewed products, de-duplicating by productId (keeping most recent)
    const productMap = new Map<
      string,
      {
        orderNumber: string;
        deliveredAt: string;
        variantSummary?: { name: string; sku: string } | null;
        itemSnapshot: any;
      }
    >();

    for (const order of deliveredOrders) {
      for (const item of order.items) {
        const prodIdStr = item.productId.toString();
        if (!reviewedProductIds.has(prodIdStr) && !productMap.has(prodIdStr)) {
          const attrStr = (item.variantAttributes || [])
            .map((a: any) => `${a.name}: ${a.value}`)
            .join(', ');

          productMap.set(prodIdStr, {
            orderNumber: order.orderNumber,
            deliveredAt: (order.completedAt || order.updatedAt).toISOString(),
            variantSummary: item.variantId
              ? {
                  name: attrStr || 'Standard',
                  sku: item.sku || '',
                }
              : null,
            itemSnapshot: item,
          });
        }
      }
    }

    if (productMap.size === 0) {
      return [];
    }

    // 4. Batch query Product records for current title, slug, and image
    const unreviewedProductIds = Array.from(productMap.keys()).map((id) => new Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: unreviewedProductIds } }).select(
      'name slug images'
    );

    const productDocMap = new Map(products.map((p) => [p._id.toString(), p]));

    const result: EligibleProductToReviewDTO[] = [];

    for (const [prodIdStr, details] of productMap.entries()) {
      const productDoc = productDocMap.get(prodIdStr);
      let primaryImage: string | null = null;

      if (productDoc?.images && Array.isArray(productDoc.images)) {
        const primary = productDoc.images.find((img: any) => img.isPrimary);
        primaryImage = primary?.url || productDoc.images[0]?.url || null;
      } else if (details.itemSnapshot.primaryImage) {
        primaryImage = details.itemSnapshot.primaryImage;
      }

      result.push({
        productId: prodIdStr,
        productName: productDoc?.name || details.itemSnapshot.productName,
        productSlug: productDoc?.slug || details.itemSnapshot.productSlug,
        primaryImage,
        variantSummary: details.variantSummary,
        orderNumber: details.orderNumber,
        deliveredAt: details.deliveredAt,
      });
    }

    return result;
  }
}

export const reviewEligibilityService = new ReviewEligibilityService();
