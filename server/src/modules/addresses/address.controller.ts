import { Request, Response, NextFunction } from 'express';
import { addressService } from './address.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class AddressController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const address = await addressService.createAddress(req.user!.id, req.body);
      sendSuccess(res, { address }, 201);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addresses = await addressService.listAddresses(req.user!.id);
      sendSuccess(res, { addresses }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addressId = req.params.addressId as string;
      const address = await addressService.getAddress(req.user!.id, addressId);
      sendSuccess(res, { address }, 200);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addressId = req.params.addressId as string;
      const address = await addressService.updateAddress(req.user!.id, addressId, req.body);
      sendSuccess(res, { address }, 200);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addressId = req.params.addressId as string;
      await addressService.deleteAddress(req.user!.id, addressId);
      sendSuccess(res, { message: 'Address deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  async setDefaultShipping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addressId = req.params.addressId as string;
      const address = await addressService.setDefaultShipping(req.user!.id, addressId);
      sendSuccess(res, { address }, 200);
    } catch (error) {
      next(error);
    }
  }

  async setDefaultBilling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addressId = req.params.addressId as string;
      const address = await addressService.setDefaultBilling(req.user!.id, addressId);
      sendSuccess(res, { address }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const addressController = new AddressController();
