import { Types } from 'mongoose';
import { ProductVariant, IProductVariant } from './product-variant.model.js';
import { Product } from './product.model.js';
import { PRODUCT_STATUS } from './product.constants.js';
import {
  ProductVariantDTO,
  PublicVariantDTO,
  CreateVariantDTO,
  UpdateVariantDTO,
  ProductAttributeDTO,
} from './product.types.js';
import { Inventory, IInventory } from '../../inventory/inventory.model.js';
import { InventoryTransaction } from '../../inventory/inventory-transaction.model.js';
import { inventoryService } from '../../inventory/inventory.service.js';
import { AppError } from '../../../shared/errors/app-error.js';

import { ErrorCodes } from '../../../shared/errors/error-codes.js';

export class VariantService {
  /**
   * Generates a deterministic, sorted, lowercase attribute signature.
   * Example: [{ name: "Size", value: "M" }, { name: "Color", value: "Black" }]
   * -> "color:black|size:m"
   */
  generateAttributeSignature(attributes: ProductAttributeDTO[] = []): string {
    if (!attributes || attributes.length === 0) {
      return 'default';
    }

    const seenNames = new Set<string>();
    for (const attr of attributes) {
      const normalizedName = attr.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        throw AppError.badRequest(
          `Duplicate attribute name '${attr.name}' found in variant.`,
          ErrorCodes.ERR_VARIANT_INVALID_ATTRIBUTES
        );
      }
      seenNames.add(normalizedName);
    }

    return attributes
      .map((attr) => ({
        name: attr.name.trim().toLowerCase(),
        value: attr.value.trim().toLowerCase(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((attr) => `${attr.name}:${attr.value}`)
      .join('|');
  }

  mapToDTO(variant: IProductVariant): ProductVariantDTO {
    return {
      id: variant._id.toString(),
      productId: variant.productId.toString(),
      sku: variant.sku,
      name: variant.name || null,
      attributes: variant.attributes || [],
      price: variant.price,
      compareAtPrice: variant.compareAtPrice || null,
      costPrice: variant.costPrice || null,
      barcode: variant.barcode || null,
      imageUrl: variant.imageUrl || null,
      weightGrams: variant.weightGrams || null,
      dimensions: variant.dimensions || null,
      isActive: variant.isActive,
      createdBy: variant.createdBy ? variant.createdBy.toString() : null,
      updatedBy: variant.updatedBy ? variant.updatedBy.toString() : null,
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString(),
    };
  }

  mapToPublicDTO(
    variant: IProductVariant,
    inventory?: IInventory | null
  ): PublicVariantDTO {
    const onHand = inventory?.onHand ?? 0;
    const reserved = inventory?.reserved ?? 0;
    const available = Math.max(0, onHand - reserved);
    const threshold = inventory?.lowStockThreshold ?? 5;
    const inStock = available > 0;
    const stockStatus = inventoryService.computeStockStatus(available, threshold);

    return {
      id: variant._id.toString(),
      productId: variant.productId.toString(),
      sku: variant.sku,
      name:
        variant.name ||
        (variant.attributes && variant.attributes.length > 0
          ? variant.attributes.map((a) => a.value).join(' / ')
          : 'Default'),
      attributes: variant.attributes || [],
      price: variant.price,
      compareAtPrice: variant.compareAtPrice || null,
      imageUrl: variant.imageUrl || null,
      weightGrams: variant.weightGrams || null,
      dimensions: variant.dimensions || null,
      isActive: variant.isActive,
      inStock,
      stockStatus,
    };
  }

  async createVariant(
    adminId: string,
    productId: string,
    dto: CreateVariantDTO
  ): Promise<ProductVariantDTO> {
    const productObjectId = new Types.ObjectId(productId);
    const product = await Product.findById(productObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const sku = dto.sku.trim().toUpperCase();

    // Check SKU uniqueness
    const existingSku = await ProductVariant.findOne({ sku });
    if (existingSku) {
      throw AppError.conflict(
        `A variant with SKU '${sku}' already exists.`,
        ErrorCodes.ERR_VARIANT_SKU_EXISTS
      );
    }

    // Generate and check attribute signature uniqueness for this product
    const attributeSignature = this.generateAttributeSignature(dto.attributes);
    const existingCombination = await ProductVariant.findOne({
      productId: productObjectId,
      attributeSignature,
    });

    if (existingCombination) {
      throw AppError.conflict(
        'A variant with this attribute combination already exists for this product.',
        ErrorCodes.ERR_VARIANT_DUPLICATE_ATTRIBUTES
      );
    }

    const variant = new ProductVariant({
      productId: productObjectId,
      sku,
      name: dto.name?.trim() || null,
      attributes: dto.attributes || [],
      attributeSignature,
      price: dto.price,
      compareAtPrice: dto.compareAtPrice !== undefined ? dto.compareAtPrice : null,
      costPrice: dto.costPrice !== undefined ? dto.costPrice : null,
      barcode: dto.barcode?.trim() || null,
      imageUrl: dto.imageUrl?.trim() || null,
      weightGrams: dto.weightGrams !== undefined ? dto.weightGrams : null,
      dimensions: dto.dimensions || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      createdBy: new Types.ObjectId(adminId),
      updatedBy: new Types.ObjectId(adminId),
    });

    await variant.save();

    // Automatically initialize Inventory record for new Variant
    await inventoryService.getOrCreateInventory(variant._id);

    return this.mapToDTO(variant);
  }


  async listVariants(productId: string): Promise<ProductVariantDTO[]> {
    const productObjectId = new Types.ObjectId(productId);
    const product = await Product.findById(productObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const variants = await ProductVariant.find({ productId: productObjectId }).sort({
      createdAt: 1,
    });
    return variants.map((v) => this.mapToDTO(v));
  }

  async getVariantById(productId: string, variantId: string): Promise<ProductVariantDTO> {
    const productObjectId = new Types.ObjectId(productId);
    const variantObjectId = new Types.ObjectId(variantId);

    // IDOR Ownership verification
    const variant = await ProductVariant.findOne({
      _id: variantObjectId,
      productId: productObjectId,
    });

    if (!variant) {
      throw AppError.notFound('Variant not found.', ErrorCodes.ERR_VARIANT_NOT_FOUND);
    }

    return this.mapToDTO(variant);
  }

  async updateVariant(
    adminId: string,
    productId: string,
    variantId: string,
    dto: UpdateVariantDTO
  ): Promise<ProductVariantDTO> {
    const productObjectId = new Types.ObjectId(productId);
    const variantObjectId = new Types.ObjectId(variantId);

    const product = await Product.findById(productObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const variant = await ProductVariant.findOne({
      _id: variantObjectId,
      productId: productObjectId,
    });

    if (!variant) {
      throw AppError.notFound('Variant not found.', ErrorCodes.ERR_VARIANT_NOT_FOUND);
    }

    // SKU uniqueness check if changed
    if (dto.sku && dto.sku.trim().toUpperCase() !== variant.sku) {
      const normalizedSku = dto.sku.trim().toUpperCase();
      const existingSku = await ProductVariant.findOne({
        sku: normalizedSku,
        _id: { $ne: variantObjectId },
      });
      if (existingSku) {
        throw AppError.conflict(
          `A variant with SKU '${normalizedSku}' already exists.`,
          ErrorCodes.ERR_VARIANT_SKU_EXISTS
        );
      }
      variant.sku = normalizedSku;
    }

    // Attribute signature check if attributes changed
    if (dto.attributes !== undefined) {
      const newSignature = this.generateAttributeSignature(dto.attributes);
      if (newSignature !== variant.attributeSignature) {
        const existingCombination = await ProductVariant.findOne({
          productId: productObjectId,
          attributeSignature: newSignature,
          _id: { $ne: variantObjectId },
        });
        if (existingCombination) {
          throw AppError.conflict(
            'A variant with this attribute combination already exists for this product.',
            ErrorCodes.ERR_VARIANT_DUPLICATE_ATTRIBUTES
          );
        }
        variant.attributes = dto.attributes;
        variant.attributeSignature = newSignature;
      }
    }

    // Last active variant protection
    if (dto.isActive === false && variant.isActive && product.status === PRODUCT_STATUS.ACTIVE) {
      const remainingActive = await ProductVariant.countDocuments({
        productId: productObjectId,
        isActive: true,
        _id: { $ne: variantObjectId },
      });
      if (remainingActive === 0) {
        throw AppError.badRequest(
          'Cannot deactivate the last active variant of an active product. Deactivate or archive the product first.',
          ErrorCodes.ERR_PRODUCT_REQUIRES_ACTIVE_VARIANT
        );
      }
    }

    if (dto.name !== undefined) variant.name = dto.name?.trim() || null;
    if (dto.price !== undefined) variant.price = dto.price;
    if (dto.compareAtPrice !== undefined) variant.compareAtPrice = dto.compareAtPrice;
    if (dto.costPrice !== undefined) variant.costPrice = dto.costPrice;
    if (dto.barcode !== undefined) variant.barcode = dto.barcode?.trim() || null;
    if (dto.imageUrl !== undefined) variant.imageUrl = dto.imageUrl?.trim() || null;
    if (dto.weightGrams !== undefined) variant.weightGrams = dto.weightGrams;
    if (dto.dimensions !== undefined) variant.dimensions = dto.dimensions;
    if (dto.isActive !== undefined) variant.isActive = dto.isActive;
    variant.updatedBy = new Types.ObjectId(adminId);

    await variant.save();
    return this.mapToDTO(variant);
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    const productObjectId = new Types.ObjectId(productId);
    const variantObjectId = new Types.ObjectId(variantId);

    const product = await Product.findById(productObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    const variant = await ProductVariant.findOne({
      _id: variantObjectId,
      productId: productObjectId,
    });

    if (!variant) {
      throw AppError.notFound('Variant not found.', ErrorCodes.ERR_VARIANT_NOT_FOUND);
    }

    // Last active variant protection
    if (variant.isActive && product.status === PRODUCT_STATUS.ACTIVE) {
      const remainingActive = await ProductVariant.countDocuments({
        productId: productObjectId,
        isActive: true,
        _id: { $ne: variantObjectId },
      });
      if (remainingActive === 0) {
        throw AppError.badRequest(
          'Cannot delete the last active variant of an active product. Deactivate or archive the product first.',
          ErrorCodes.ERR_PRODUCT_REQUIRES_ACTIVE_VARIANT
        );
      }
    }

    // Inventory check: cannot hard-delete variant with positive stock or transaction history
    const inv = await Inventory.findOne({ variantId: variantObjectId });
    const hasTransactions = await InventoryTransaction.exists({
      variantId: variantObjectId,
    });

    if ((inv && (inv.onHand > 0 || inv.reserved > 0)) || hasTransactions) {
      throw AppError.badRequest(
        'Cannot hard-delete variant with inventory stock or transaction history. Deactivate or archive the variant instead.',
        ErrorCodes.ERR_VARIANT_HAS_INVENTORY_HISTORY
      );
    }

    if (inv) {
      await Inventory.deleteOne({ _id: inv._id });
    }

    await ProductVariant.findByIdAndDelete(variantObjectId);
  }
}



export const variantService = new VariantService();
