import { Request, Response, NextFunction } from 'express';
import { wishlistService } from './wishlist.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class WishlistController {
  async getWishlist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wishlist = await wishlistService.getWishlist(req.user!.id);
      sendSuccess(res, { wishlist });
    } catch (error) {
      next(error);
    }
  }

  async addItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wishlist = await wishlistService.addItem(
        req.user!.id,
        req.body.productId
      );
      sendSuccess(res, { wishlist });
    } catch (error) {
      next(error);
    }
  }

  async removeItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wishlist = await wishlistService.removeItem(
        req.user!.id,
        req.params.productId as string
      );
      sendSuccess(res, { wishlist });
    } catch (error) {
      next(error);
    }
  }

  async clearWishlist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wishlist = await wishlistService.clearWishlist(req.user!.id);
      sendSuccess(res, { wishlist });
    } catch (error) {
      next(error);
    }
  }
}

export const wishlistController = new WishlistController();
