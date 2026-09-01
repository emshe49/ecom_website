import { Types } from 'mongoose';
import { ShippingMethod } from './shipping-method.model.js';
import {
  CreateShippingMethodInput,
  UpdateShippingMethodInput,
  ShippingMethodDTO,
} from './shipping.types.js';
import { shippingMapper } from './shipping.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';

export const shippingMethodService = {
  /**
   * Creates a new Shipping Method.
   */
  async createMethod(
    input: CreateShippingMethodInput
  ): Promise<ShippingMethodDTO> {
    const normalizedCode = input.code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await ShippingMethod.findOne({ code: normalizedCode });
    if (existing) {
      throw AppError.conflict(
        `Shipping method with code '${normalizedCode}' already exists.`,
        ErrorCodes.ERR_SHIPPING_METHOD_CODE_EXISTS
      );
    }

    const method = new ShippingMethod({
      ...input,
      code: normalizedCode,
      currency: input.currency?.toUpperCase() || 'PKR',
    });

    await method.save();
    logger.info(`ShippingMethod created: ${method.code} (ID: ${method._id})`);
    return shippingMapper.toShippingMethodDTO(method);
  },

  /**
   * Updates an existing Shipping Method.
   */
  async updateMethod(
    id: string,
    input: UpdateShippingMethodInput
  ): Promise<ShippingMethodDTO> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest(
        'Invalid shipping method ID format.',
        ErrorCodes.BAD_REQUEST
      );
    }

    const method = await ShippingMethod.findById(id);
    if (!method) {
      throw AppError.notFound(
        'Shipping method not found.',
        ErrorCodes.ERR_SHIPPING_METHOD_NOT_FOUND
      );
    }

    if (input.code) {
      const normalizedCode = input.code.trim().toUpperCase();
      if (normalizedCode !== method.code) {
        const existing = await ShippingMethod.findOne({ code: normalizedCode });
        if (existing) {
          throw AppError.conflict(
            `Shipping method with code '${normalizedCode}' already exists.`,
            ErrorCodes.ERR_SHIPPING_METHOD_CODE_EXISTS
          );
        }
        method.code = normalizedCode;
      }
    }

    if (input.name !== undefined) method.name = input.name;
    if (input.description !== undefined) method.description = input.description;
    if (input.type !== undefined) method.type = input.type;
    if (input.baseFee !== undefined) method.baseFee = input.baseFee;
    if (input.currency !== undefined) method.currency = input.currency.toUpperCase();
    if (input.estimatedMinDays !== undefined) method.estimatedMinDays = input.estimatedMinDays;
    if (input.estimatedMaxDays !== undefined) method.estimatedMaxDays = input.estimatedMaxDays;
    if (input.active !== undefined) method.active = input.active;
    if (input.sortOrder !== undefined) method.sortOrder = input.sortOrder;
    if (input.eligibility !== undefined) {
      method.eligibility = {
        ...method.eligibility,
        ...input.eligibility,
      };
    }

    // Final sanity check for min/max days
    if (method.estimatedMaxDays < method.estimatedMinDays) {
      throw AppError.badRequest(
        'Estimated max days must be greater than or equal to estimated min days.',
        ErrorCodes.ERR_SHIPPING_INVALID_ESTIMATE
      );
    }

    await method.save();
    logger.info(`ShippingMethod updated: ${method.code} (ID: ${method._id})`);
    return shippingMapper.toShippingMethodDTO(method);
  },

  /**
   * Retrieves a single shipping method by ID.
   */
  async getMethodById(id: string): Promise<ShippingMethodDTO> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest(
        'Invalid shipping method ID format.',
        ErrorCodes.BAD_REQUEST
      );
    }

    const method = await ShippingMethod.findById(id);
    if (!method) {
      throw AppError.notFound(
        'Shipping method not found.',
        ErrorCodes.ERR_SHIPPING_METHOD_NOT_FOUND
      );
    }

    return shippingMapper.toShippingMethodDTO(method);
  },

  /**
   * Lists all shipping methods for admin management.
   */
  async getAllMethods(search?: string): Promise<ShippingMethodDTO[]> {
    const filter: Record<string, any> = {};
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { code: { $regex: sanitized, $options: 'i' } },
        { name: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const methods = await ShippingMethod.find(filter).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    return methods.map(shippingMapper.toShippingMethodDTO);
  },

  /**
   * Lists all active shipping methods.
   */
  async getActiveMethods(): Promise<ShippingMethodDTO[]> {
    const methods = await ShippingMethod.find({ active: true }).sort({
      sortOrder: 1,
      baseFee: 1,
    });
    return methods.map(shippingMapper.toShippingMethodDTO);
  },

  /**
   * Soft-deactivates a shipping method to preserve historical referential integrity.
   */
  async deactivateMethod(id: string): Promise<ShippingMethodDTO> {
    return this.updateMethod(id, { active: false });
  },
};
