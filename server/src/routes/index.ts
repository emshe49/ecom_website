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

// Cart Routes (Module 08)
v1Router.use('/cart', cartRouter);

// Mount versioned routers
apiRouter.use('/v1', v1Router);

export default apiRouter;

