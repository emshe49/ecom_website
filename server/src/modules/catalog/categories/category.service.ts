import { Types, FilterQuery } from 'mongoose';
import { Category, ICategory } from './category.model.js';
import {
  CategoryDTO,
  PublicCategoryDTO,
  CategoryTreeNodeDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryQueryFilters,
} from './category.types.js';
import { slugify, escapeRegex } from '../catalog.utils.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ErrorCodes } from '../../../shared/errors/error-codes.js';

export const MAX_CATEGORY_DEPTH = 3;

export class CategoryService {
  /**
   * Calculates the depth of a category given its parent ID.
   * Root category has depth 1.
   */
  private async calculateDepth(parentId: Types.ObjectId | null): Promise<number> {
    if (!parentId) return 1;

    let depth = 1;
    let currentParentId: Types.ObjectId | null = parentId;

    while (currentParentId) {
      depth++;
      if (depth > MAX_CATEGORY_DEPTH) {
        break;
      }
      const parentRecord: { parentId?: Types.ObjectId | null } | null = await Category.findById(
        currentParentId
      )
        .select('parentId')
        .lean();

      if (!parentRecord) {
        throw AppError.badRequest(
          'Parent category not found.',
          ErrorCodes.ERR_PARENT_CATEGORY_NOT_FOUND
        );
      }
      currentParentId = parentRecord.parentId ? new Types.ObjectId(parentRecord.parentId) : null;
    }

    return depth;
  }

  /**
   * Calculates maximum height of descendants for a category.
   */
  private async getDescendantHeight(categoryId: Types.ObjectId): Promise<number> {
    const children = await Category.find({ parentId: categoryId }).select('_id');
    if (children.length === 0) return 0;

    let maxHeight = 0;
    for (const child of children) {
      const height = 1 + (await this.getDescendantHeight(child._id));
      if (height > maxHeight) {
        maxHeight = height;
      }
    }
    return maxHeight;
  }

  /**
   * Checks if parentCandidateId is a descendant of categoryId (to prevent cycles).
   */
  private async isDescendant(
    parentCandidateId: Types.ObjectId,
    categoryId: Types.ObjectId
  ): Promise<boolean> {
    let currentId: Types.ObjectId | null = parentCandidateId;

    while (currentId) {
      if (currentId.equals(categoryId)) {
        return true;
      }
      const currentRecord: { parentId?: Types.ObjectId | null } | null = await Category.findById(
        currentId
      )
        .select('parentId')
        .lean();

      if (!currentRecord) break;
      currentId = currentRecord.parentId ? new Types.ObjectId(currentRecord.parentId) : null;
    }

    return false;
  }

  private mapToDTO(
    category: {
      _id: Types.ObjectId;
      name: string;
      slug: string;
      description?: string | null;
      parentId?: Types.ObjectId | ICategory | null;
      imageUrl?: string | null;
      isActive: boolean;
      sortOrder: number;
      seoTitle?: string | null;
      seoDescription?: string | null;
      createdBy?: Types.ObjectId | null;
      updatedBy?: Types.ObjectId | null;
      createdAt: Date;
      updatedAt: Date;
    },
    parentName?: string | null
  ): CategoryDTO {
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId
        ? category.parentId instanceof Types.ObjectId
          ? category.parentId.toString()
          : (category.parentId as ICategory)._id.toString()
        : null,
      parentName: parentName || null,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
      createdBy: category.createdBy ? category.createdBy.toString() : null,
      updatedBy: category.updatedBy ? category.updatedBy.toString() : null,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private mapToPublicDTO(category: ICategory): PublicCategoryDTO {
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId ? category.parentId.toString() : null,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
    };
  }

  async createCategory(adminId: string, dto: CreateCategoryDTO): Promise<CategoryDTO> {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    // Check slug uniqueness
    const existingSlug = await Category.findOne({ slug });
    if (existingSlug) {
      throw AppError.conflict(
        `A category with slug '${slug}' already exists.`,
        ErrorCodes.ERR_CATEGORY_SLUG_EXISTS
      );
    }

    let parentObjectId: Types.ObjectId | null = null;
    let parentName: string | null = null;

    if (dto.parentId) {
      parentObjectId = new Types.ObjectId(dto.parentId);
      const parent = await Category.findById(parentObjectId);
      if (!parent) {
        throw AppError.badRequest(
          'Parent category does not exist.',
          ErrorCodes.ERR_PARENT_CATEGORY_NOT_FOUND
        );
      }
      parentName = parent.name;

      const depth = await this.calculateDepth(parentObjectId);
      if (depth > MAX_CATEGORY_DEPTH) {
        throw AppError.badRequest(
          `Category hierarchy cannot exceed ${MAX_CATEGORY_DEPTH} levels of nesting.`,
          ErrorCodes.ERR_CATEGORY_MAX_DEPTH
        );
      }
    }

    const category = new Category({
      name: dto.name.trim(),
      slug,
      description: dto.description || null,
      parentId: parentObjectId,
      imageUrl: dto.imageUrl || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : 0,
      seoTitle: dto.seoTitle || null,
      seoDescription: dto.seoDescription || null,
      createdBy: new Types.ObjectId(adminId),
      updatedBy: new Types.ObjectId(adminId),
    });

    await category.save();
    return this.mapToDTO(category, parentName);
  }

  async listAdminCategories(
    filters: CategoryQueryFilters
  ): Promise<{ categories: CategoryDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<ICategory> = {};

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.parentId !== undefined) {
      query.parentId = filters.parentId ? new Types.ObjectId(filters.parentId) : null;
    }

    if (filters.search) {
      const escaped = escapeRegex(filters.search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'sortOrder';
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

    const [categories, total] = await Promise.all([
      Category.find(query)
        .populate<{ parentId: ICategory | null }>('parentId', 'name')
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query),
    ]);

    const dtos = categories.map((cat) => {
      const parentName = cat.parentId && typeof cat.parentId === 'object' ? (cat.parentId as ICategory).name : null;
      return this.mapToDTO(cat, parentName);
    });

    return {
      categories: dtos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getCategoryById(categoryId: string): Promise<CategoryDTO> {
    const category = await Category.findById(new Types.ObjectId(categoryId)).populate<{ parentId: ICategory | null }>(
      'parentId',
      'name'
    );
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.ERR_CATEGORY_NOT_FOUND);
    }
    const parentName = category.parentId && typeof category.parentId === 'object' ? (category.parentId as ICategory).name : null;
    return this.mapToDTO(category, parentName);
  }

  async updateCategory(
    adminId: string,
    categoryId: string,
    dto: UpdateCategoryDTO
  ): Promise<CategoryDTO> {
    const targetObjectId = new Types.ObjectId(categoryId);
    const category = await Category.findById(targetObjectId);
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.ERR_CATEGORY_NOT_FOUND);
    }

    // Slug update
    if (dto.slug && dto.slug !== category.slug) {
      const normalizedSlug = slugify(dto.slug);
      const existingSlug = await Category.findOne({
        slug: normalizedSlug,
        _id: { $ne: targetObjectId },
      });
      if (existingSlug) {
        throw AppError.conflict(
          `A category with slug '${normalizedSlug}' already exists.`,
          ErrorCodes.ERR_CATEGORY_SLUG_EXISTS
        );
      }
      category.slug = normalizedSlug;
    }

    // Parent update & hierarchy validations
    if (dto.parentId !== undefined) {
      if (dto.parentId === null || dto.parentId === '') {
        category.parentId = null;
      } else {
        const newParentObjectId = new Types.ObjectId(dto.parentId);

        // Self-parenting check
        if (newParentObjectId.equals(targetObjectId)) {
          throw AppError.badRequest(
            'A category cannot be its own parent.',
            ErrorCodes.ERR_CATEGORY_SELF_PARENT
          );
        }

        const newParent = await Category.findById(newParentObjectId);
        if (!newParent) {
          throw AppError.badRequest(
            'Parent category does not exist.',
            ErrorCodes.ERR_PARENT_CATEGORY_NOT_FOUND
          );
        }

        // Circular hierarchy check
        const isCycle = await this.isDescendant(newParentObjectId, targetObjectId);
        if (isCycle) {
          throw AppError.badRequest(
            'Circular category hierarchy detected.',
            ErrorCodes.ERR_CATEGORY_CYCLE
          );
        }

        // Depth check considering descendant subtree
        const parentDepth = await this.calculateDepth(newParentObjectId);
        const subtreeHeight = await this.getDescendantHeight(targetObjectId);
        if (parentDepth + subtreeHeight > MAX_CATEGORY_DEPTH) {
          throw AppError.badRequest(
            `Moving this category would cause its subcategories to exceed the maximum depth limit of ${MAX_CATEGORY_DEPTH} levels.`,
            ErrorCodes.ERR_CATEGORY_MAX_DEPTH
          );
        }

        category.parentId = newParentObjectId;
      }
    }

    if (dto.name !== undefined) category.name = dto.name.trim();
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl || null;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.seoTitle !== undefined) category.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) category.seoDescription = dto.seoDescription;
    category.updatedBy = new Types.ObjectId(adminId);

    await category.save();

    let parentName: string | null = null;
    if (category.parentId) {
      const parent = await Category.findById(category.parentId);
      parentName = parent ? parent.name : null;
    }

    return this.mapToDTO(category, parentName);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const targetObjectId = new Types.ObjectId(categoryId);
    const category = await Category.findById(targetObjectId);
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.ERR_CATEGORY_NOT_FOUND);
    }

    // Check for child categories
    const childrenCount = await Category.countDocuments({ parentId: targetObjectId });
    if (childrenCount > 0) {
      throw AppError.conflict(
        `Cannot delete category '${category.name}' because it contains ${childrenCount} child categories. Delete or reassign its children first.`,
        ErrorCodes.ERR_CATEGORY_HAS_CHILDREN
      );
    }

    // Check if products reference this category
    const { productService } = await import('../products/product.service.js');
    const hasProducts = await productService.existsByCategory(categoryId);
    if (hasProducts) {
      throw AppError.conflict(
        `Cannot delete category '${category.name}' because active products are assigned to it.`,
        ErrorCodes.ERR_CATEGORY_IN_USE
      );
    }

    await Category.findByIdAndDelete(targetObjectId);
  }

  async listPublicCategories(
    filters: CategoryQueryFilters
  ): Promise<{ categories: PublicCategoryDTO[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<ICategory> = { isActive: true };

    if (filters.parentId !== undefined) {
      query.parentId = filters.parentId ? new Types.ObjectId(filters.parentId) : null;
    }

    if (filters.search) {
      const escaped = escapeRegex(filters.search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'sortOrder';
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query),
    ]);

    return {
      categories: categories.map((cat) => this.mapToPublicDTO(cat)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPublicCategoryBySlug(slug: string): Promise<PublicCategoryDTO> {
    const category = await Category.findOne({ slug: slug.trim().toLowerCase(), isActive: true });
    if (!category) {
      throw AppError.notFound('Category not found.', ErrorCodes.ERR_CATEGORY_NOT_FOUND);
    }
    return this.mapToPublicDTO(category);
  }

  async getPublicCategoryTree(): Promise<CategoryTreeNodeDTO[]> {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });

    const nodeMap = new Map<string, CategoryTreeNodeDTO>();
    const rootNodes: CategoryTreeNodeDTO[] = [];

    // Create all tree nodes
    for (const cat of categories) {
      const id = cat._id.toString();
      nodeMap.set(id, {
        id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentId: cat.parentId ? cat.parentId.toString() : null,
        imageUrl: cat.imageUrl,
        sortOrder: cat.sortOrder,
        seoTitle: cat.seoTitle,
        seoDescription: cat.seoDescription,
        children: [],
      });
    }

    // Assemble tree relationships in-memory
    for (const cat of categories) {
      const id = cat._id.toString();
      const node = nodeMap.get(id)!;

      if (cat.parentId) {
        const parentIdStr = cat.parentId.toString();
        const parentNode = nodeMap.get(parentIdStr);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // If parent is inactive or missing, place at root level
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }
}

export const categoryService = new CategoryService();
