import { z } from 'zod';
import { PRODUCT_STATUS_LIST } from './product.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuRegex = /^[A-Za-z0-9-_]{3,64}$/;

export const productIdParamSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .regex(objectIdRegex, 'Invalid product ID format'),
});

export const productSlugParamSchema = z.object({
  slug: z
    .string({ required_error: 'Product slug is required' })
    .trim()
    .min(1, 'Slug cannot be empty')
    .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
});

export const variantIdParamSchema = z.object({
  productId: z
    .string({ required_error: 'Product ID is required' })
    .regex(objectIdRegex, 'Invalid product ID format'),
  variantId: z
    .string({ required_error: 'Variant ID is required' })
    .regex(objectIdRegex, 'Invalid variant ID format'),
});

const productImageSchema = z.object({
  url: z.string().trim().url('Image URL must be a valid URL'),
  altText: z.string().trim().max(200, 'Alt text cannot exceed 200 characters').nullable().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isPrimary: z.boolean().optional().default(false),
});

const productAttributeSchema = z.object({
  name: z.string().trim().min(1, 'Attribute name is required').max(100, 'Attribute name cannot exceed 100 characters'),
  value: z.string().trim().min(1, 'Attribute value is required').max(500, 'Attribute value cannot exceed 500 characters'),
});

const variantAttributeSchema = z.object({
  name: z.string().trim().min(1, 'Attribute name is required').max(50, 'Attribute name cannot exceed 50 characters'),
  value: z.string().trim().min(1, 'Attribute value is required').max(100, 'Attribute value cannot exceed 100 characters'),
});

const variantDimensionsSchema = z.object({
  lengthCm: z.number().min(0, 'Length must be non-negative'),
  widthCm: z.number().min(0, 'Width must be non-negative'),
  heightCm: z.number().min(0, 'Height must be non-negative'),
});

export const createProductSchema = z
  .object({
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(2, 'Product name must be at least 2 characters')
      .max(200, 'Product name cannot exceed 200 characters'),
    slug: z
      .string()
      .trim()
      .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens')
      .optional(),
    shortDescription: z
      .string()
      .trim()
      .max(500, 'Short description cannot exceed 500 characters')
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .max(10000, 'Description cannot exceed 10000 characters')
      .nullable()
      .optional(),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .regex(objectIdRegex, 'Invalid category ID format'),
    brandId: z
      .string()
      .regex(objectIdRegex, 'Invalid brand ID format')
      .nullable()
      .optional(),
    status: z.enum(PRODUCT_STATUS_LIST as [string, ...string[]]).optional(),
    featured: z.boolean().optional().default(false),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(2, 'Tag must be at least 2 characters')
          .max(50, 'Tag cannot exceed 50 characters')
      )
      .max(20, 'Maximum of 20 tags allowed')
      .optional()
      .default([]),
    images: z.array(productImageSchema).max(10, 'Maximum of 10 images allowed').optional().default([]),
    attributes: z
      .array(productAttributeSchema)
      .max(50, 'Maximum of 50 attributes allowed')
      .optional()
      .default([]),
    seoTitle: z
      .string()
      .trim()
      .max(70, 'SEO title cannot exceed 70 characters')
      .nullable()
      .optional(),
    seoDescription: z
      .string()
      .trim()
      .max(160, 'SEO description cannot exceed 160 characters')
      .nullable()
      .optional(),
  })
  .strict('Unexpected fields provided in product creation request');

export const updateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Product name must be at least 2 characters')
      .max(200, 'Product name cannot exceed 200 characters')
      .optional(),
    slug: z
      .string()
      .trim()
      .regex(slugRegex, 'Slug must contain only lowercase alphanumeric characters and hyphens')
      .optional(),
    shortDescription: z
      .string()
      .trim()
      .max(500, 'Short description cannot exceed 500 characters')
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .max(10000, 'Description cannot exceed 10000 characters')
      .nullable()
      .optional(),
    categoryId: z
      .string()
      .regex(objectIdRegex, 'Invalid category ID format')
      .optional(),
    brandId: z
      .string()
      .regex(objectIdRegex, 'Invalid brand ID format')
      .nullable()
      .optional(),
    featured: z.boolean().optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(2, 'Tag must be at least 2 characters')
          .max(50, 'Tag cannot exceed 50 characters')
      )
      .max(20, 'Maximum of 20 tags allowed')
      .optional(),
    images: z.array(productImageSchema).max(10, 'Maximum of 10 images allowed').optional(),
    attributes: z
      .array(productAttributeSchema)
      .max(50, 'Maximum of 50 attributes allowed')
      .optional(),
    seoTitle: z
      .string()
      .trim()
      .max(70, 'SEO title cannot exceed 70 characters')
      .nullable()
      .optional(),
    seoDescription: z
      .string()
      .trim()
      .max(160, 'SEO description cannot exceed 160 characters')
      .nullable()
      .optional(),
  })
  .strict('Unexpected fields provided in product update request');

export const updateProductStatusSchema = z
  .object({
    status: z.enum(PRODUCT_STATUS_LIST as [string, ...string[]], {
      required_error: 'Status is required',
    }),
  })
  .strict('Unexpected fields provided in status update request');

export const createVariantSchema = z
  .object({
    sku: z
      .string({ required_error: 'SKU is required' })
      .trim()
      .regex(skuRegex, 'SKU must be 3-64 characters alphanumeric, hyphens, or underscores'),
    name: z.string().trim().max(150, 'Variant name cannot exceed 150 characters').nullable().optional(),
    attributes: z
      .array(variantAttributeSchema)
      .max(10, 'Maximum of 10 variant attributes allowed')
      .optional()
      .default([]),
    price: z
      .number({ required_error: 'Price is required' })
      .int('Price must be an integer in minor units')
      .min(0, 'Price must be non-negative'),
    compareAtPrice: z
      .number()
      .int('Compare-at price must be an integer in minor units')
      .min(0, 'Compare-at price must be non-negative')
      .nullable()
      .optional(),
    costPrice: z
      .number()
      .int('Cost price must be an integer in minor units')
      .min(0, 'Cost price must be non-negative')
      .nullable()
      .optional(),
    barcode: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url('Image URL must be a valid URL').nullable().optional().or(z.literal('')),
    weightGrams: z.number().int().min(0, 'Weight must be non-negative').nullable().optional(),
    dimensions: variantDimensionsSchema.nullable().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.compareAtPrice !== undefined && data.compareAtPrice !== null) {
        return data.compareAtPrice >= data.price;
      }
      return true;
    },
    {
      message: 'Compare-at price must be greater than or equal to selling price',
      path: ['compareAtPrice'],
    }
  );

export const updateVariantSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .regex(skuRegex, 'SKU must be 3-64 characters alphanumeric, hyphens, or underscores')
      .optional(),
    name: z.string().trim().max(150, 'Variant name cannot exceed 150 characters').nullable().optional(),
    attributes: z
      .array(variantAttributeSchema)
      .max(10, 'Maximum of 10 variant attributes allowed')
      .optional(),
    price: z
      .number()
      .int('Price must be an integer in minor units')
      .min(0, 'Price must be non-negative')
      .optional(),
    compareAtPrice: z
      .number()
      .int('Compare-at price must be an integer in minor units')
      .min(0, 'Compare-at price must be non-negative')
      .nullable()
      .optional(),
    costPrice: z
      .number()
      .int('Cost price must be an integer in minor units')
      .min(0, 'Cost price must be non-negative')
      .nullable()
      .optional(),
    barcode: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url('Image URL must be a valid URL').nullable().optional().or(z.literal('')),
    weightGrams: z.number().int().min(0, 'Weight must be non-negative').nullable().optional(),
    dimensions: variantDimensionsSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.price !== undefined && data.compareAtPrice !== undefined && data.compareAtPrice !== null) {
        return data.compareAtPrice >= data.price;
      }
      return true;
    },
    {
      message: 'Compare-at price must be greater than or equal to selling price',
      path: ['compareAtPrice'],
    }
  );

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(PRODUCT_STATUS_LIST as [string, ...string[]]).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const publicProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['name', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
