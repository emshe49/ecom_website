import { Types, FilterQuery } from 'mongoose';
import { Brand, IBrand } from './brand.model.js';
import {
  BrandDTO,
  PublicBrandDTO,
  CreateBrandDTO,
  UpdateBrandDTO,
  BrandQueryFilters,
} from './brand.types.js';
import { slugify, escapeRegex } from '../catalog.utils.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ErrorCodes } from '../../../shared/errors/error-codes.js';

export class BrandService {
  private mapToDTO(brand: IBrand): BrandDTO {
    return {
      id: brand._id.toString(),
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logoUrl: brand.logoUrl,
      websiteUrl: brand.websiteUrl,
      isActive: brand.isActive,
      sortOrder: brand.sortOrder,
      seoTitle: brand.seoTitle,
      seoDescription: brand.seoDescription,
      createdBy: brand.createdBy ? brand.createdBy.toString() : null,
      updatedBy: brand.updatedBy ? brand.updatedBy.toString() : null,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  private mapToPublicDTO(brand: IBrand): PublicBrandDTO {
    return {
      id: brand._id.toString(),
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logoUrl: brand.logoUrl,
      websiteUrl: brand.websiteUrl,
      sortOrder: brand.sortOrder,
      seoTitle: brand.seoTitle,
      seoDescription: brand.seoDescription,
    };
  }

  async createBrand(adminId: string, dto: CreateBrandDTO): Promise<BrandDTO> {
    const normalizedName = dto.name.trim().toLowerCase();
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    // Case-insensitive name uniqueness check
    const existingName = await Brand.findOne({ normalizedName });
    if (existingName) {
      throw AppError.conflict(
        `A brand with the name '${dto.name.trim()}' already exists.`,
        ErrorCodes.ERR_BRAND_NAME_EXISTS
      );
    }

    // Slug uniqueness check
    const existingSlug = await Brand.findOne({ slug });
    if (existingSlug) {
      throw AppError.conflict(
        `A brand with the slug '${slug}' already exists.`,
        ErrorCodes.ERR_BRAND_SLUG_EXISTS
      );
    }

    const brand = new Brand({
      name: dto.name.trim(),
      normalizedName,
      slug,
      description: dto.description || null,
      logoUrl: dto.logoUrl || null,
      websiteUrl: dto.websiteUrl || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : 0,
      seoTitle: dto.seoTitle || null,
      seoDescription: dto.seoDescription || null,
      createdBy: new Types.ObjectId(adminId),
      updatedBy: new Types.ObjectId(adminId),
    });

    await brand.save();
    return this.mapToDTO(brand);
  }

  async listAdminBrands(
    filters: BrandQueryFilters
  ): Promise<{ brands: BrandDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IBrand> = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      const escaped = escapeRegex(filters.search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit),
      Brand.countDocuments(query),
    ]);

    return {
      brands: brands.map((b) => this.mapToDTO(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getBrandById(brandId: string): Promise<BrandDTO> {
    const brand = await Brand.findById(new Types.ObjectId(brandId));
    if (!brand) {
      throw AppError.notFound('Brand not found.', ErrorCodes.ERR_BRAND_NOT_FOUND);
    }
    return this.mapToDTO(brand);
  }

  async updateBrand(adminId: string, brandId: string, dto: UpdateBrandDTO): Promise<BrandDTO> {
    const targetObjectId = new Types.ObjectId(brandId);
    const brand = await Brand.findById(targetObjectId);
    if (!brand) {
      throw AppError.notFound('Brand not found.', ErrorCodes.ERR_BRAND_NOT_FOUND);
    }

    // Name update with case-insensitive uniqueness check
    if (dto.name && dto.name.trim() !== brand.name) {
      const normalizedName = dto.name.trim().toLowerCase();
      const existingName = await Brand.findOne({
        normalizedName,
        _id: { $ne: targetObjectId },
      });
      if (existingName) {
        throw AppError.conflict(
          `A brand with the name '${dto.name.trim()}' already exists.`,
          ErrorCodes.ERR_BRAND_NAME_EXISTS
        );
      }
      brand.name = dto.name.trim();
      brand.normalizedName = normalizedName;
    }

    // Slug update
    if (dto.slug && dto.slug !== brand.slug) {
      const normalizedSlug = slugify(dto.slug);
      const existingSlug = await Brand.findOne({
        slug: normalizedSlug,
        _id: { $ne: targetObjectId },
      });
      if (existingSlug) {
        throw AppError.conflict(
          `A brand with slug '${normalizedSlug}' already exists.`,
          ErrorCodes.ERR_BRAND_SLUG_EXISTS
        );
      }
      brand.slug = normalizedSlug;
    }

    if (dto.description !== undefined) brand.description = dto.description;
    if (dto.logoUrl !== undefined) brand.logoUrl = dto.logoUrl || null;
    if (dto.websiteUrl !== undefined) brand.websiteUrl = dto.websiteUrl || null;
    if (dto.isActive !== undefined) brand.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) brand.sortOrder = dto.sortOrder;
    if (dto.seoTitle !== undefined) brand.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) brand.seoDescription = dto.seoDescription;
    brand.updatedBy = new Types.ObjectId(adminId);

    await brand.save();
    return this.mapToDTO(brand);
  }

  async deleteBrand(brandId: string): Promise<void> {
    const targetObjectId = new Types.ObjectId(brandId);
    const brand = await Brand.findById(targetObjectId);
    if (!brand) {
      throw AppError.notFound('Brand not found.', ErrorCodes.ERR_BRAND_NOT_FOUND);
    }

    // Check if products reference this brand
    const { productService } = await import('../products/product.service.js');
    const hasProducts = await productService.existsByBrand(brandId);
    if (hasProducts) {
      throw AppError.conflict(
        `Cannot delete brand '${brand.name}' because products are assigned to it.`,
        ErrorCodes.ERR_BRAND_IN_USE
      );
    }

    await Brand.findByIdAndDelete(targetObjectId);
  }

  async listPublicBrands(
    filters: BrandQueryFilters
  ): Promise<{ brands: PublicBrandDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<IBrand> = { isActive: true };

    if (filters.search) {
      const escaped = escapeRegex(filters.search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit),
      Brand.countDocuments(query),
    ]);

    return {
      brands: brands.map((b) => this.mapToPublicDTO(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPublicBrandBySlug(slug: string): Promise<PublicBrandDTO> {
    const brand = await Brand.findOne({ slug: slug.trim().toLowerCase(), isActive: true });
    if (!brand) {
      throw AppError.notFound('Brand not found.', ErrorCodes.ERR_BRAND_NOT_FOUND);
    }
    return this.mapToPublicDTO(brand);
  }
}

export const brandService = new BrandService();
