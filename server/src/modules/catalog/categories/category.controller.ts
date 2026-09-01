import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export class CategoryController {
  // Admin Handlers
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.createCategory(req.user!.id, req.body);
      sendSuccess(res, { category }, 201);
    } catch (error) {
      next(error);
    }
  }

  async listAdminCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await categoryService.listAdminCategories(req.query as unknown as import('./category.types.js').CategoryQueryFilters);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = req.params.categoryId as string;
      const category = await categoryService.getCategoryById(categoryId);
      sendSuccess(res, { category }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = req.params.categoryId as string;
      const category = await categoryService.updateCategory(req.user!.id, categoryId, req.body);
      sendSuccess(res, { category }, 200);
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = req.params.categoryId as string;
      await categoryService.deleteCategory(categoryId);
      sendSuccess(res, { message: 'Category deleted successfully.' }, 200);
    } catch (error) {
      next(error);
    }
  }

  // Public Handlers
  async listPublicCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await categoryService.listPublicCategories(req.query as unknown as import('./category.types.js').CategoryQueryFilters);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getPublicCategoryBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug as string;
      const category = await categoryService.getPublicCategoryBySlug(slug);
      sendSuccess(res, { category }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getPublicCategoryTree(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tree = await categoryService.getPublicCategoryTree();
      sendSuccess(res, { tree }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
