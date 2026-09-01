import { Request, Response, NextFunction } from 'express';
import { shippingMethodService } from './shipping-method.service.js';
import { shipmentService } from './shipment.service.js';
import {
  createShippingMethodSchema,
  updateShippingMethodSchema,
  createShipmentSchema,
  updateShipmentStatusSchema,
  updateShipmentTrackingSchema,
  adminShipmentListQuerySchema,
} from './shipping.validation.js';

export const adminShippingController = {
  // --- Shipping Methods Management ---

  async listShippingMethods(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const methods = await shippingMethodService.getAllMethods(search);
      res.status(200).json({
        success: true,
        data: methods,
      });
    } catch (err) {
      next(err);
    }
  },

  async getShippingMethod(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const method = await shippingMethodService.getMethodById(id);
      res.status(200).json({
        success: true,
        data: method,
      });
    } catch (err) {
      next(err);
    }
  },

  async createShippingMethod(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createShippingMethodSchema.parse(req.body);
      const created = await shippingMethodService.createMethod(validated);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateShippingMethod(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const validated = updateShippingMethodSchema.parse(req.body);
      const updated = await shippingMethodService.updateMethod(id, validated);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteShippingMethod(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const deactivated = await shippingMethodService.deactivateMethod(id);
      res.status(200).json({
        success: true,
        data: deactivated,
        message: 'Shipping method deactivated successfully.',
      });
    } catch (err) {
      next(err);
    }
  },

  // --- Shipment Fulfillment & Management ---

  async listShipments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = adminShipmentListQuerySchema.parse(req.query);
      const result = await shipmentService.listShipments(query);
      res.status(200).json({
        success: true,
        data: result.shipments,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  async getShipmentDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const shipmentId = req.params.shipmentId as string;
      const shipment = await shipmentService.getAdminShipmentDetail(shipmentId);
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (err) {
      next(err);
    }
  },

  async getShipmentByOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const shipment = await shipmentService.getShipmentByOrderId(orderId);
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (err) {
      next(err);
    }
  },

  async createShipment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderId = req.params.orderId as string;
      const validated = createShipmentSchema.parse(req.body);
      const adminUserId = req.user!.id;
      const shipment = await shipmentService.createShipment(
        orderId,
        adminUserId,
        validated
      );
      res.status(201).json({
        success: true,
        data: shipment,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateShipmentStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const shipmentId = req.params.shipmentId as string;
      const validated = updateShipmentStatusSchema.parse(req.body);
      const adminUserId = req.user!.id;
      const shipment = await shipmentService.updateShipmentStatus(
        shipmentId,
        adminUserId,
        validated
      );
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateShipmentTracking(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const shipmentId = req.params.shipmentId as string;
      const validated = updateShipmentTrackingSchema.parse(req.body);
      const adminUserId = req.user!.id;
      const shipment = await shipmentService.updateTracking(
        shipmentId,
        adminUserId,
        validated
      );
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (err) {
      next(err);
    }
  },

  async cancelShipment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const shipmentId = req.params.shipmentId as string;
      const note = req.body?.note as string | undefined;
      const adminUserId = req.user!.id;
      const shipment = await shipmentService.cancelShipment(
        shipmentId,
        adminUserId,
        note
      );
      res.status(200).json({
        success: true,
        data: shipment,
        message: 'Shipment cancelled successfully.',
      });
    } catch (err) {
      next(err);
    }
  },
};
