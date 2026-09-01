import { Types } from 'mongoose';
import { Inventory, IInventory } from './inventory.model.js';
import { InventoryTransaction } from './inventory-transaction.model.js';

import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  STOCK_STATUS,
  StockStatus,
  TRANSACTION_TYPE,
  REFERENCE_TYPE,
  ReferenceType,
} from './inventory.constants.js';
import {
  InventoryItemDTO,
  InventoryDetailDTO,
  InventoryTransactionDTO,
  StockAdjustmentDTO,
  InventoryFilterQuery,
  InventoryListResponse,
} from './inventory.types.js';
import { ProductVariant } from '../catalog/products/product-variant.model.js';
import { Product, IProduct } from '../catalog/products/product.model.js';
import { Category } from '../catalog/categories/category.model.js';
import { Brand } from '../catalog/brands/brand.model.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { escapeRegex } from '../catalog/catalog.utils.js';

export class InventoryService {
  /**
   * Computes stock status based on available units and low stock threshold.
   */
  computeStockStatus(available: number, lowStockThreshold: number): StockStatus {
    if (available <= 0) {
      return STOCK_STATUS.OUT_OF_STOCK;
    }
    if (available <= lowStockThreshold) {
      return STOCK_STATUS.LOW_STOCK;
    }
    return STOCK_STATUS.IN_STOCK;
  }

  /**
   * Retrieves or lazily creates an Inventory document for a ProductVariant.
   */
  async getOrCreateInventory(variantId: Types.ObjectId | string): Promise<IInventory> {
    const vId = typeof variantId === 'string' ? new Types.ObjectId(variantId) : variantId;

    let inventory = await Inventory.findOne({ variantId: vId });
    if (inventory) {
      return inventory;
    }

    // Verify variant exists before creating inventory
    const variantExists = await ProductVariant.exists({ _id: vId });
    if (!variantExists) {
      throw AppError.notFound(
        'Product variant not found.',
        ErrorCodes.ERR_VARIANT_NOT_FOUND
      );
    }

    try {
      inventory = await Inventory.create({
        variantId: vId,
        onHand: 0,
        reserved: 0,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
      });
      return inventory;
    } catch (err: unknown) {
      // If concurrent request created it simultaneously, fetch it
      const existing = await Inventory.findOne({ variantId: vId });
      if (existing) {
        return existing;
      }
      throw err;
    }
  }

  /**
   * Maps an Inventory doc + Variant + Product into an InventoryItemDTO.
   */
  mapToItemDTO(
    inventory: IInventory,
    variant: any,
    product: any
  ): InventoryItemDTO {
    const onHand = inventory.onHand ?? 0;
    const reserved = inventory.reserved ?? 0;
    const available = Math.max(0, onHand - reserved);
    const lowStockThreshold =
      inventory.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const status = this.computeStockStatus(available, lowStockThreshold);

    return {
      id: inventory._id.toString(),
      variantId: variant._id.toString(),
      productId: product._id ? product._id.toString() : product.toString(),
      productName: product.name || 'Unknown Product',
      productSlug: product.slug || '',
      sku: variant.sku,
      variantAttributes: (variant.attributes || []).map((a: any) => ({
        name: a.name,
        value: a.value,
      })),
      imageUrl: variant.imageUrl || product.images?.[0]?.url || null,
      price: variant.price || 0,
      onHand,
      reserved,
      available,
      lowStockThreshold,
      status,
      stockStatus: status,
      inStock: available > 0,
      createdAt: inventory.createdAt
        ? inventory.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: inventory.updatedAt
        ? inventory.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  /**
   * Maps an InventoryTransaction doc into an InventoryTransactionDTO.
   */
  mapToTransactionDTO(tx: any): InventoryTransactionDTO {
    let createdByUser = null;
    if (tx.createdBy && typeof tx.createdBy === 'object' && tx.createdBy.email) {
      createdByUser = {
        id: tx.createdBy._id.toString(),
        name: `${tx.createdBy.firstName} ${tx.createdBy.lastName}`,
        email: tx.createdBy.email,
      };
    }

    return {
      id: tx._id.toString(),
      variantId: tx.variantId.toString(),
      type: tx.type,
      quantity: tx.quantity,
      previousOnHand: tx.previousOnHand,
      newOnHand: tx.newOnHand,
      previousReserved: tx.previousReserved,
      newReserved: tx.newReserved,
      reason: tx.reason,
      referenceType: tx.referenceType || null,
      referenceId: tx.referenceId || null,
      createdBy: createdByUser,
      createdAt: tx.createdAt.toISOString(),
    };
  }

  /**
   * Atomically adjusts stock for a variant (STOCK_IN, STOCK_OUT, ADJUSTMENT) and records an immutable transaction.
   */
  async adjustStock(
    adminId: string,
    variantId: string,
    dto: StockAdjustmentDTO
  ): Promise<InventoryItemDTO> {
    const vId = new Types.ObjectId(variantId);
    const inv = await this.getOrCreateInventory(vId);

    const prevOnHand = inv.onHand;
    const prevReserved = inv.reserved;
    let updatedInv: IInventory | null = null;
    let txQuantity = 0;

    if (dto.type === TRANSACTION_TYPE.STOCK_IN) {
      const qty = dto.quantity || 0;
      txQuantity = qty;
      updatedInv = await Inventory.findOneAndUpdate(
        { _id: inv._id },
        { $inc: { onHand: qty } },
        { new: true }
      );
    } else if (dto.type === TRANSACTION_TYPE.STOCK_OUT) {
      const qty = dto.quantity || 0;
      txQuantity = qty;
      // Atomic guard: physical onHand cannot drop below reserved stock
      updatedInv = await Inventory.findOneAndUpdate(
        {
          _id: inv._id,
          $expr: { $gte: [{ $subtract: ['$onHand', qty] }, '$reserved'] },
        },
        { $inc: { onHand: -qty } },
        { new: true }
      );

      if (!updatedInv) {
        throw AppError.badRequest(
          `Insufficient stock. Reducing on-hand by ${qty} would cause on-hand (${prevOnHand}) to drop below reserved (${prevReserved}).`,
          ErrorCodes.ERR_INVENTORY_INSUFFICIENT_STOCK
        );
      }
    } else if (dto.type === TRANSACTION_TYPE.ADJUSTMENT) {
      const newOnHand =
        dto.newOnHand !== undefined
          ? dto.newOnHand
          : dto.quantity !== undefined
          ? dto.quantity
          : 0;
      txQuantity = Math.abs(newOnHand - prevOnHand);
      // Atomic guard: newOnHand cannot be less than current reserved
      updatedInv = await Inventory.findOneAndUpdate(
        {
          _id: inv._id,
          reserved: { $lte: newOnHand },
        },
        { $set: { onHand: newOnHand } },
        { new: true }
      );

      if (!updatedInv) {
        throw AppError.badRequest(
          `New on-hand (${newOnHand}) cannot be lower than current reserved stock (${prevReserved}).`,
          ErrorCodes.ERR_INVENTORY_RESERVED_EXCEEDS_ON_HAND
        );
      }
    }

    if (!updatedInv) {
      throw AppError.badRequest(
        'Inventory adjustment failed.',
        ErrorCodes.ERR_INVENTORY_ADJUSTMENT_INVALID
      );
    }

    // Record immutable audit transaction
    await InventoryTransaction.create({
      variantId: vId,
      type: dto.type,
      quantity: txQuantity,
      previousOnHand: prevOnHand,
      newOnHand: updatedInv.onHand,
      previousReserved: prevReserved,
      newReserved: updatedInv.reserved,
      reason: dto.reason.trim(),
      referenceType: REFERENCE_TYPE.MANUAL,
      referenceId: null,
      createdBy: new Types.ObjectId(adminId),
    });

    const variant = await ProductVariant.findById(vId);
    const product = await Product.findById(variant!.productId);

    return this.mapToItemDTO(updatedInv, variant, product);
  }

  /**
   * Updates the low stock threshold for a variant.
   */
  async updateThreshold(
    variantId: string,
    lowStockThreshold: number
  ): Promise<InventoryItemDTO> {
    const vId = new Types.ObjectId(variantId);
    const inv = await this.getOrCreateInventory(vId);

    const updatedInv = await Inventory.findOneAndUpdate(
      { _id: inv._id },
      { $set: { lowStockThreshold } },
      { new: true }
    );

    const variant = await ProductVariant.findById(vId);
    const product = await Product.findById(variant!.productId);

    return this.mapToItemDTO(updatedInv!, variant, product);
  }

  /**
   * Internal service function for future Checkout/Orders to atomically reserve stock.
   */
  async reserveStock(
    variantId: Types.ObjectId | string,
    quantity: number,
    referenceId?: string,
    referenceType: ReferenceType = REFERENCE_TYPE.CHECKOUT,
    reason: string = 'Checkout session inventory reservation'
  ): Promise<{
    success: boolean;
    onHand: number;
    reserved: number;
    available: number;
  }> {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw AppError.badRequest(
        'Reservation quantity must be a positive integer.',
        ErrorCodes.ERR_INVENTORY_INVALID_QUANTITY
      );
    }

    const vId = typeof variantId === 'string' ? new Types.ObjectId(variantId) : variantId;
    const inv = await this.getOrCreateInventory(vId);

    const prevOnHand = inv.onHand;
    const prevReserved = inv.reserved;

    // Atomic guard: available = onHand - reserved >= quantity
    const updated = await Inventory.findOneAndUpdate(
      {
        _id: inv._id,
        $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, quantity] },
      },
      { $inc: { reserved: quantity } },
      { new: true }
    );

    if (!updated) {
      throw AppError.badRequest(
        'Insufficient available stock to complete reservation.',
        ErrorCodes.ERR_INVENTORY_INSUFFICIENT_STOCK
      );
    }

    // Record reservation transaction
    await InventoryTransaction.create({
      variantId: vId,
      type: TRANSACTION_TYPE.RESERVATION,
      quantity,
      previousOnHand: prevOnHand,
      newOnHand: updated.onHand,
      previousReserved: prevReserved,
      newReserved: updated.reserved,
      reason,
      referenceType,
      referenceId: referenceId || null,
      createdBy: null,
    });

    return {
      success: true,
      onHand: updated.onHand,
      reserved: updated.reserved,
      available: Math.max(0, updated.onHand - updated.reserved),
    };
  }

  /**
   * Internal service function for future Checkout/Orders to atomically release reserved stock.
   */
  async releaseStock(
    variantId: Types.ObjectId | string,
    quantity: number,
    referenceId?: string,
    referenceType: ReferenceType = REFERENCE_TYPE.CHECKOUT,
    reason: string = 'Checkout cancellation / expiry stock release'
  ): Promise<{
    success: boolean;
    onHand: number;
    reserved: number;
    available: number;
  }> {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw AppError.badRequest(
        'Release quantity must be a positive integer.',
        ErrorCodes.ERR_INVENTORY_INVALID_QUANTITY
      );
    }

    const vId = typeof variantId === 'string' ? new Types.ObjectId(variantId) : variantId;
    const inv = await this.getOrCreateInventory(vId);

    const prevOnHand = inv.onHand;
    const prevReserved = inv.reserved;

    // Atomic guard: reserved >= quantity
    const updated = await Inventory.findOneAndUpdate(
      {
        _id: inv._id,
        reserved: { $gte: quantity },
      },
      { $inc: { reserved: -quantity } },
      { new: true }
    );

    if (!updated) {
      throw AppError.badRequest(
        'Cannot release more stock than currently reserved.',
        ErrorCodes.ERR_INVENTORY_INVALID_QUANTITY
      );
    }

    // Record release transaction
    await InventoryTransaction.create({
      variantId: vId,
      type: TRANSACTION_TYPE.RELEASE,
      quantity,
      previousOnHand: prevOnHand,
      newOnHand: updated.onHand,
      previousReserved: prevReserved,
      newReserved: updated.reserved,
      reason,
      referenceType,
      referenceId: referenceId || null,
      createdBy: null,
    });

    return {
      success: true,
      onHand: updated.onHand,
      reserved: updated.reserved,
      available: Math.max(0, updated.onHand - updated.reserved),
    };
  }

  /**
   * Internal service function for Orders to atomically finalize reserved stock into a permanent sale.
   * Atomically decrements both onHand and reserved:
   * onHand -= quantity, reserved -= quantity
   */
  async finalizeReservation(
    variantId: Types.ObjectId | string,
    quantity: number,
    orderId?: string,
    reason: string = 'Order creation final inventory consumption'
  ): Promise<{
    success: boolean;
    onHand: number;
    reserved: number;
    available: number;
  }> {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw AppError.badRequest(
        'Finalization quantity must be a positive integer.',
        ErrorCodes.ERR_INVENTORY_INVALID_QUANTITY
      );
    }

    const vId = typeof variantId === 'string' ? new Types.ObjectId(variantId) : variantId;
    const inv = await this.getOrCreateInventory(vId);

    const prevOnHand = inv.onHand;
    const prevReserved = inv.reserved;

    // Atomic guard: both reserved and onHand must be >= quantity
    const updated = await Inventory.findOneAndUpdate(
      {
        _id: inv._id,
        reserved: { $gte: quantity },
        onHand: { $gte: quantity },
      },
      {
        $inc: {
          onHand: -quantity,
          reserved: -quantity,
        },
      },
      { new: true }
    );

    if (!updated) {
      throw AppError.badRequest(
        `Cannot finalize inventory reservation for variant ${vId.toString()}. Insufficient on-hand or reserved stock.`,
        ErrorCodes.ERR_INVENTORY_INSUFFICIENT_STOCK
      );
    }

    // Record immutable SALE audit transaction
    await InventoryTransaction.create({
      variantId: vId,
      type: TRANSACTION_TYPE.SALE,
      quantity,
      previousOnHand: prevOnHand,
      newOnHand: updated.onHand,
      previousReserved: prevReserved,
      newReserved: updated.reserved,
      reason,
      referenceType: REFERENCE_TYPE.ORDER,
      referenceId: orderId || null,
      createdBy: null,
    });

    return {
      success: true,
      onHand: updated.onHand,
      reserved: updated.reserved,
      available: Math.max(0, updated.onHand - updated.reserved),
    };
  }

  /**
   * Internal service function for Order cancellation to atomically restore on-hand physical stock.
   * Atomically increments onHand: onHand += quantity
   */
  async restoreStockFromCancellation(
    variantId: Types.ObjectId | string,
    quantity: number,
    orderId?: string,
    reason: string = 'Order cancellation inventory restoration'
  ): Promise<{
    success: boolean;
    onHand: number;
    reserved: number;
    available: number;
  }> {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw AppError.badRequest(
        'Restoration quantity must be a positive integer.',
        ErrorCodes.ERR_INVENTORY_INVALID_QUANTITY
      );
    }

    const vId = typeof variantId === 'string' ? new Types.ObjectId(variantId) : variantId;
    const inv = await this.getOrCreateInventory(vId);

    const prevOnHand = inv.onHand;
    const prevReserved = inv.reserved;

    const updated = await Inventory.findOneAndUpdate(
      { _id: inv._id },
      { $inc: { onHand: quantity } },
      { new: true }
    );

    if (!updated) {
      throw AppError.badRequest(
        `Failed to restore inventory for variant ${vId.toString()}.`,
        ErrorCodes.ERR_INVENTORY_ADJUSTMENT_INVALID
      );
    }

    // Record immutable ORDER_CANCELLATION audit transaction
    await InventoryTransaction.create({
      variantId: vId,
      type: TRANSACTION_TYPE.ORDER_CANCELLATION,
      quantity,
      previousOnHand: prevOnHand,
      newOnHand: updated.onHand,
      previousReserved: prevReserved,
      newReserved: updated.reserved,
      reason,
      referenceType: REFERENCE_TYPE.ORDER,
      referenceId: orderId || null,
      createdBy: null,
    });

    return {
      success: true,
      onHand: updated.onHand,
      reserved: updated.reserved,
      available: Math.max(0, updated.onHand - updated.reserved),
    };
  }



  /**
   * Admin: List inventory across variants with comprehensive filters, search, and pagination.
   */
  async listInventory(query: InventoryFilterQuery): Promise<InventoryListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // 1. Resolve category or brand filter to product IDs if requested
    const productMatch: any = {};
    if (query.category) {
      const cat = await Category.findOne({
        slug: query.category.trim().toLowerCase(),
      });
      if (cat) {
        productMatch.categoryId = cat._id;
      }
    }

    if (query.brand) {
      const br = await Brand.findOne({
        slug: query.brand.trim().toLowerCase(),
      });
      if (br) {
        productMatch.brandId = br._id;
      }
    }

    let candidateProductIds: Types.ObjectId[] | null = null;
    if (Object.keys(productMatch).length > 0) {
      const matchedProducts = await Product.find(productMatch).select('_id');
      candidateProductIds = matchedProducts.map((p) => p._id as Types.ObjectId);
    }

    // 2. Build variant query
    const variantQuery: any = {};
    if (candidateProductIds !== null) {
      variantQuery.productId = { $in: candidateProductIds };
    }

    if (query.search) {
      const safe = escapeRegex(query.search.trim());
      // Match SKU or Product Name
      const matchingProducts = await Product.find({
        name: { $regex: safe, $options: 'i' },
      }).select('_id');
      const matchingProductIds = matchingProducts.map((p) => p._id);

      variantQuery.$or = [
        { sku: { $regex: safe, $options: 'i' } },
        { productId: { $in: matchingProductIds } },
      ];
    }

    // Fetch all matched variants
    const allVariants = await ProductVariant.find(variantQuery)
      .populate<{ productId: IProduct }>('productId')
      .lean();

    const variantIds = allVariants.map((v) => v._id);
    const inventoryDocs = await Inventory.find({
      variantId: { $in: variantIds },
    }).lean();

    const invMap = new Map<string, any>();
    for (const inv of inventoryDocs) {
      invMap.set(inv.variantId.toString(), inv);
    }

    // Map each variant to full inventory DTO
    let allItems: InventoryItemDTO[] = allVariants.map((v: any) => {
      const inv = invMap.get(v._id.toString()) || {
        _id: new Types.ObjectId(),
        variantId: v._id,
        onHand: 0,
        reserved: 0,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      };
      return this.mapToItemDTO(inv, v, v.productId || {});
    });

    // Apply Status / LowStock filter in memory if specified
    if (query.status) {
      allItems = allItems.filter((item) => item.status === query.status);
    }

    if (query.lowStockOnly) {
      allItems = allItems.filter(
        (item) =>
          item.status === STOCK_STATUS.LOW_STOCK ||
          item.status === STOCK_STATUS.OUT_OF_STOCK
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || 'updatedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    allItems.sort((a, b) => {
      const valA: any = (a as any)[sortBy];
      const valB: any = (b as any)[sortBy];

      if (typeof valA === 'string') {

        return sortOrder * valA.localeCompare(valB);
      }
      return sortOrder * ((valA || 0) - (valB || 0));
    });

    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginatedItems = allItems.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Admin: Get inventory detail for a single variant with recent transactions.
   */
  async getInventoryDetail(variantId: string): Promise<InventoryDetailDTO> {
    const vId = new Types.ObjectId(variantId);
    const variant = await ProductVariant.findById(vId);
    if (!variant) {
      throw AppError.notFound(
        'Product variant not found.',
        ErrorCodes.ERR_VARIANT_NOT_FOUND
      );
    }

    const product = await Product.findById(variant.productId);
    const inv = await this.getOrCreateInventory(vId);

    const baseDTO = this.mapToItemDTO(inv, variant, product);

    const recentTxDocs = await InventoryTransaction.find({ variantId: vId })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(20);

    const recentTransactions = recentTxDocs.map((tx) =>
      this.mapToTransactionDTO(tx)
    );

    return {
      ...baseDTO,
      recentTransactions,
    };
  }

  /**
   * Admin: List transaction history for a single variant.
   */
  async listTransactions(
    variantId: string,
    page: number = 1,
    limit: number = 20,
    type?: string
  ): Promise<{
    transactions: InventoryTransactionDTO[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  }> {
    const vId = new Types.ObjectId(variantId);
    const filter: any = { variantId: vId };
    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;
    const [totalItems, docs] = await Promise.all([
      InventoryTransaction.countDocuments(filter),
      InventoryTransaction.find(filter)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      transactions: docs.map((tx) => this.mapToTransactionDTO(tx)),
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Admin: Global transactions list across all variants.
   */
  async listAllTransactions(
    page: number = 1,
    limit: number = 20,
    type?: string
  ): Promise<{
    transactions: InventoryTransactionDTO[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  }> {
    const filter: any = {};
    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;
    const [totalItems, docs] = await Promise.all([
      InventoryTransaction.countDocuments(filter),
      InventoryTransaction.find(filter)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      transactions: docs.map((tx) => this.mapToTransactionDTO(tx)),
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }
}

export const inventoryService = new InventoryService();
