import { Request, Response, NextFunction } from 'express';
import { brandService } from './brand.service.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class BrandController {
  // Admin Handlers
  async createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brand = await brandService.createBrand(req.user!.id, req.body);
      sendSuccess(res, { brand }, 201);
    } catch (error) {
      next(error);
    }
  }

  async listAdminBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await brandService.listAdminBrands(req.query as unknown as import('./brand.types.js').BrandQueryFilters);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getBrandById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brandId = req.params.brandId as string;
      const brand = await brandService.getBrandById(brandId);
      sendSuccess(res, { brand }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brandId = req.params.brandId as string;
      const brand = await brandService.updateBrand(req.user!.id, brandId, req.body);
      sendSuccess(res, { brand }, 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brandId = req.params.brandId as string;
      await brandService.deleteBrand(brandId);
      sendSuccess(res, { message: 'Brand deleted successfully.' }, 200);
    } catch (error) {
      next(error);
    }
  }

  // Public Handlers
  async listPublicBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await brandService.listPublicBrands(req.query as unknown as import('./brand.types.js').BrandQueryFilters);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getPublicBrandBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug as string;
      const brand = await brandService.getPublicBrandBySlug(slug);
      sendSuccess(res, { brand }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const brandController = new BrandController();
