import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import ProfilePage from '../features/auth/pages/ProfilePage';
import CartPage from '../features/cart/pages/CartPage';
import WishlistPage from '../features/wishlist/pages/WishlistPage';
import CheckoutPage from '../features/checkout/pages/CheckoutPage';

import GuestRoute from '../features/auth/components/GuestRoute';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import PermissionRoute from '../features/auth/components/PermissionRoute';
import AdminLayout from '../features/admin/layouts/AdminLayout';
import AdminHomePage from '../features/admin/pages/AdminHomePage';
import StaffUsersPage from '../features/admin/pages/StaffUsersPage';
import CategoriesPage from '../features/catalog/pages/CategoriesPage';
import BrandsPage from '../features/catalog/pages/BrandsPage';
import ProductsPage from '../features/products/pages/ProductsPage';
import CreateProductPage from '../features/products/pages/CreateProductPage';
import EditProductPage from '../features/products/pages/EditProductPage';
import { InventoryPage } from '../features/inventory/pages/InventoryPage';
import StorefrontProductsPage from '../features/storefront/pages/StorefrontProductsPage';
import StorefrontProductDetailPage from '../features/storefront/pages/StorefrontProductDetailPage';


import { OrdersPage } from '../features/orders/pages/OrdersPage';
import { OrderDetailsPage } from '../features/orders/pages/OrderDetailsPage';
import { AdminOrdersPage } from '../features/orders/pages/AdminOrdersPage';
import { AdminOrderDetailsPage } from '../features/orders/pages/AdminOrderDetailsPage';
import { PaymentPage } from '../features/payments/pages/PaymentPage';
import { PaymentResultPage } from '../features/payments/pages/PaymentResultPage';
import { AdminPaymentsPage } from '../features/payments/pages/AdminPaymentsPage';
import { AdminPaymentDetailsPage } from '../features/payments/pages/AdminPaymentDetailsPage';
import { AdminShippingMethodsPage } from '../features/shipping/pages/AdminShippingMethodsPage';
import { AdminShipmentsPage } from '../features/shipping/pages/AdminShipmentsPage';
import { AdminShipmentDetailsPage } from '../features/shipping/pages/AdminShipmentDetailsPage';
import { MyReviewsPage } from '../features/reviews/pages/MyReviewsPage';
import { AdminReviewsPage } from '../features/reviews/pages/AdminReviewsPage';
import { AdminReviewDetailsPage } from '../features/reviews/pages/AdminReviewDetailsPage';
import { AdminCouponsPage } from '../features/admin/promotions/pages/AdminCouponsPage';
import { AdminCouponDetailsPage } from '../features/admin/promotions/pages/AdminCouponDetailsPage';
import { AdminPromotionsPage } from '../features/admin/promotions/pages/AdminPromotionsPage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';

import {
  AnalyticsOverviewPage,
  SalesAnalyticsPage,
  OrdersAnalyticsPage,
  ProductsAnalyticsPage,
  CustomersAnalyticsPage,
  InventoryAnalyticsPage,
  ReturnsRefundsAnalyticsPage,
  PromotionsAnalyticsPage,
  ShippingAnalyticsPage,
  ReviewsAnalyticsPage,
} from '../features/analytics';

import { SupportTicketsPage } from '../features/support/pages/SupportTicketsPage';
import { CreateSupportTicketPage } from '../features/support/pages/CreateSupportTicketPage';
import { SupportTicketDetailsPage } from '../features/support/pages/SupportTicketDetailsPage';
import { AdminSupportTicketsPage } from '../features/support/pages/AdminSupportTicketsPage';
import { AdminSupportTicketDetailsPage } from '../features/support/pages/AdminSupportTicketDetailsPage';
import { AuditLogsPage } from '../features/audit/pages/AuditLogsPage';
import { AuditLogDetailsPage } from '../features/audit/pages/AuditLogDetailsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'products',
        element: <StorefrontProductsPage />,
      },
      {
        path: 'products/:slug',
        element: <StorefrontProductDetailPage />,
      },
      {
        path: 'verify-email',
        element: <VerifyEmailPage />,
      },
      // Guest-only routes
      {
        element: <GuestRoute />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
          {
            path: 'forgot-password',
            element: <ForgotPasswordPage />,
          },
          {
            path: 'reset-password',
            element: <ResetPasswordPage />,
          },
        ],
      },
      // Protected customer/user routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'cart',
            element: <CartPage />,
          },
          {
            path: 'wishlist',
            element: <WishlistPage />,
          },
          {
            path: 'checkout',
            element: <CheckoutPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'orders/:orderId',
            element: <OrderDetailsPage />,
          },
          {
            path: 'orders/:orderId/payment',
            element: <PaymentPage />,
          },
          {
            path: 'payment/result',
            element: <PaymentResultPage />,
          },
          {
            path: 'account/reviews',
            element: <MyReviewsPage />,
          },
          {
            path: 'reviews',
            element: <MyReviewsPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'account/notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'support',
            element: <SupportTicketsPage />,
          },
          {
            path: 'support/new',
            element: <CreateSupportTicketPage />,
          },
          {
            path: 'support/:ticketId',
            element: <SupportTicketDetailsPage />,
          },
        ],
      },

      // 404 Not Found
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },

  // Administrative console routes (Protected + Non-Customer Admin Access)
  {
    path: '/admin',
    element: <PermissionRoute requireAdminAccess={true} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminHomePage />,
          },
          {
            element: <PermissionRoute permission="order:read" />,
            children: [
              {
                path: 'orders',
                element: <AdminOrdersPage />,
              },
              {
                path: 'orders/:orderId',
                element: <AdminOrderDetailsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="payment:read" />,
            children: [
              {
                path: 'payments',
                element: <AdminPaymentsPage />,
              },
              {
                path: 'payments/:paymentId',
                element: <AdminPaymentDetailsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute anyPermissions={['shipping:read', 'shipping:fulfill']} />,
            children: [
              {
                path: 'shipments',
                element: <AdminShipmentsPage />,
              },
              {
                path: 'shipments/:shipmentId',
                element: <AdminShipmentDetailsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="shipping:manage" />,
            children: [
              {
                path: 'shipping-methods',
                element: <AdminShippingMethodsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute anyPermissions={['review:read', 'review:moderate']} />,
            children: [
              {
                path: 'reviews',
                element: <AdminReviewsPage />,
              },
              {
                path: 'reviews/:reviewId',
                element: <AdminReviewDetailsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute anyPermissions={['coupon:read', 'coupon:manage']} />,
            children: [
              {
                path: 'coupons',
                element: <AdminCouponsPage />,
              },
              {
                path: 'coupons/:couponId',
                element: <AdminCouponDetailsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute anyPermissions={['promotion:read', 'promotion:manage']} />,
            children: [
              {
                path: 'promotions',
                element: <AdminPromotionsPage />,
              },
            ],
          },

          {
            element: <PermissionRoute permission="admin-user:read" />,
            children: [
              {
                path: 'users',
                element: <StaffUsersPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="product:read" />,
            children: [
              {
                path: 'products',
                element: <ProductsPage />,
              },
              {
                path: 'products/new',
                element: <CreateProductPage />,
              },
              {
                path: 'products/:productId/edit',
                element: <EditProductPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="category:read" />,
            children: [
              {
                path: 'categories',
                element: <CategoriesPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="brand:read" />,
            children: [
              {
                path: 'brands',
                element: <BrandsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="inventory:read" />,
            children: [
              {
                path: 'inventory',
                element: <InventoryPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="analytics:read" />,
            children: [
              {
                path: 'analytics',
                element: <AnalyticsOverviewPage />,
              },
              {
                path: 'analytics/sales',
                element: <SalesAnalyticsPage />,
              },
              {
                path: 'analytics/orders',
                element: <OrdersAnalyticsPage />,
              },
              {
                path: 'analytics/products',
                element: <ProductsAnalyticsPage />,
              },
              {
                path: 'analytics/customers',
                element: <CustomersAnalyticsPage />,
              },
              {
                path: 'analytics/inventory',
                element: <InventoryAnalyticsPage />,
              },
              {
                path: 'analytics/returns',
                element: <ReturnsRefundsAnalyticsPage />,
              },
              {
                path: 'analytics/promotions',
                element: <PromotionsAnalyticsPage />,
              },
              {
                path: 'analytics/shipping',
                element: <ShippingAnalyticsPage />,
              },
              {
                path: 'analytics/reviews',
                element: <ReviewsAnalyticsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="support:read" />,
            children: [
              {
                path: 'support',
                element: <AdminSupportTicketsPage />,
              },
              {
                path: 'support/:ticketId',
                element: <AdminSupportTicketDetailsPage />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="audit:read" />,
            children: [
              {
                path: 'audit',
                element: <AuditLogsPage />,
              },
              {
                path: 'audit/:auditLogId',
                element: <AuditLogDetailsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);


