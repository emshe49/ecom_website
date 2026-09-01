import { Request, Response, NextFunction } from 'express';
import { productSearchService } from './product-search.service.js';
import { productFacetService } from './product-facet.service.js';
import { sendSuccess } from '../../../../shared/utils/response.js';
import { ProductSearchQuery } from './product-search.types.js';

export class ProductSearchController {
  async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productSearchService.searchProducts(
        req.query as unknown as ProductSearchQuery
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getFacets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productFacetService.getFacets(
        req.query as unknown as ProductSearchQuery
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const productSearchController = new ProductSearchController();
