import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class CartController {
  async getCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const cart = await cartService.getCart(req.user!.id);
      sendSuccess(res, { cart });
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
      const cart = await cartService.addItem(req.user!.id, req.body);
      sendSuccess(res, { cart });
    } catch (error) {
      next(error);
    }
  }

  async updateItemQuantity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const cart = await cartService.updateItemQuantity(
        req.user!.id,
        req.params.variantId as string,
        req.body.quantity
      );
      sendSuccess(res, { cart });
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
      const cart = await cartService.removeItem(
        req.user!.id,
        req.params.variantId as string
      );
      sendSuccess(res, { cart });
    } catch (error) {
      next(error);
    }
  }


  async clearCart(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const cart = await cartService.clearCart(req.user!.id);
      sendSuccess(res, { cart });
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();
