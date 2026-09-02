import { Router } from 'express';
import { healthRouter } from './v1/health.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { userRouter } from '../modules/users/user.routes.js';
import { addressRouter } from '../modules/addresses/address.routes.js';
import { adminUserRouter } from '../modules/users/admin-user.routes.js';
import {
  publicCategoryRouter,
  adminCategoryRouter,
} from '../modules/catalog/categories/category.routes.js';
import {
  publicBrandRouter,
  adminBrandRouter,
} from '../modules/catalog/brands/brand.routes.js';
import {
  publicProductRouter,
  adminProductRouter,
} from '../modules/catalog/products/product.routes.js';
import { cartRouter } from '../modules/cart/cart.routes.js';
import { wishlistRouter } from '../modules/wishlist/wishlist.routes.js';
import { inventoryRouter } from '../modules/inventory/inventory.routes.js';
import { checkoutRouter } from '../modules/checkout/checkout.routes.js';
import { orderRouter, adminOrderRouter } from '../modules/orders/order.routes.js';
import {
  paymentRoutes,
  adminPaymentRoutes,
} from '../modules/payments/payment.routes.js';
import { paymentWebhookRoutes } from '../modules/payments/payment-webhook.routes.js';
import { shippingRouter } from '../modules/shipping/shipping.routes.js';
import {
  adminShippingMethodRouter,
  adminShipmentRouter,
} from '../modules/shipping/admin-shipping.routes.js';
import { reviewRouter } from '../modules/reviews/review.routes.js';
import { adminReviewRouter } from '../modules/reviews/admin-review.routes.js';
import { promotionRouter } from '../modules/promotions/promotion.routes.js';
import {
  adminCouponRouter,
  adminPromotionRouter,
} from '../modules/promotions/admin-promotion.routes.js';
import notificationRouter from '../modules/notifications/notification.routes.js';
import { emailRoutes, adminEmailRoutes } from '../modules/email/index.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';

const apiRouter = Router();

// Version 1 API Routes
const v1Router = Router();
v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);
v1Router.use('/addresses', addressRouter);
v1Router.use('/admin/users', adminUserRouter);

// Catalog Routes
v1Router.use('/categories', publicCategoryRouter);
v1Router.use('/admin/categories', adminCategoryRouter);
v1Router.use('/brands', publicBrandRouter);
v1Router.use('/admin/brands', adminBrandRouter);
v1Router.use('/products', publicProductRouter);
v1Router.use('/admin/products', adminProductRouter);

// Inventory Routes (Module 10)
v1Router.use('/admin/inventory', inventoryRouter);

// Cart Routes (Module 08)
v1Router.use('/cart', cartRouter);

// Wishlist Routes (Module 09)
v1Router.use('/wishlist', wishlistRouter);

// Checkout Routes (Module 11 & Module 16 coupon endpoints)
v1Router.use('/checkout', checkoutRouter);
v1Router.use('/checkout', promotionRouter);

// Orders Routes (Module 12)
v1Router.use('/orders', orderRouter);
v1Router.use('/admin/orders', adminOrderRouter);

// Payments & Webhook Routes (Module 13)
v1Router.use('/payments', paymentRoutes);
v1Router.use('/admin/payments', adminPaymentRoutes);
v1Router.use('/webhooks', paymentWebhookRoutes);

// Shipping & Fulfillment Routes (Module 14)
v1Router.use('/shipping', shippingRouter);
v1Router.use('/admin/shipping-methods', adminShippingMethodRouter);
v1Router.use('/admin/shipments', adminShipmentRouter);

// Reviews & Ratings Routes (Module 15)
v1Router.use('/reviews', reviewRouter);
v1Router.use('/admin/reviews', adminReviewRouter);

// Coupons & Promotions Routes (Module 16)
v1Router.use('/admin/coupons', adminCouponRouter);
v1Router.use('/admin/promotions', adminPromotionRouter);

// Notifications Routes (Module 18)
v1Router.use('/notifications', notificationRouter);

// Email Routes (Module 19)
v1Router.use('/email', emailRoutes);
v1Router.use('/admin/email', adminEmailRoutes);

// Admin Dashboard Routes (Module 20)
v1Router.use('/admin/dashboard', dashboardRouter);

// Mount versioned routers
apiRouter.use('/v1', v1Router);

export default apiRouter;

