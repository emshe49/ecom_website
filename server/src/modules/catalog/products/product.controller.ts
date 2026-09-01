import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service.js';
import { variantService } from './variant.service.js';
import { sendSuccess } from '../../../shared/utils/response.js';
import {
  ProductQueryFilters,
  PublicProductQueryFilters,
} from './product.types.js';
import { ProductStatus } from './product.constants.js';

export class ProductController {
  // Admin Product Handlers
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.createProduct(req.user!.id, req.body);
      sendSuccess(res, { product }, 201);
    } catch (error) {
      next(error);
    }
  }

  async listAdminProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.listAdminProducts(
        req.query as unknown as ProductQueryFilters
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const product = await productService.getProductById(productId);
      sendSuccess(res, { product }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const product = await productService.updateProduct(req.user!.id, productId, req.body);
      sendSuccess(res, { product }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProductStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const { status } = req.body as { status: ProductStatus };
      const product = await productService.updateProductStatus(req.user!.id, productId, status);
      sendSuccess(res, { product }, 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      await productService.deleteProduct(productId);
      sendSuccess(res, { message: 'Product deleted successfully.' }, 200);
    } catch (error) {
      next(error);
    }
  }

  // Admin Variant Handlers
  async createVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const variant = await variantService.createVariant(req.user!.id, productId, req.body);
      sendSuccess(res, { variant }, 201);
    } catch (error) {
      next(error);
    }
  }

  async listVariants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const variants = await variantService.listVariants(productId);
      sendSuccess(res, { variants }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getVariantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const variantId = req.params.variantId as string;
      const variant = await variantService.getVariantById(productId, variantId);
      sendSuccess(res, { variant }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const variantId = req.params.variantId as string;
      const variant = await variantService.updateVariant(
        req.user!.id,
        productId,
        variantId,
        req.body
      );
      sendSuccess(res, { variant }, 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const variantId = req.params.variantId as string;
      await variantService.deleteVariant(productId, variantId);
      sendSuccess(res, { message: 'Variant deleted successfully.' }, 200);
    } catch (error) {
      next(error);
    }
  }

  // Public Product Handlers
  async listPublicProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.listPublicProducts(
        req.query as unknown as PublicProductQueryFilters
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getPublicProductBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug as string;
      const product = await productService.getPublicProductBySlug(slug);
      sendSuccess(res, { product }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
