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
        ],
      },
    ],
  },
]);

