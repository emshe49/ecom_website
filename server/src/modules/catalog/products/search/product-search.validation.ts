import { z } from 'zod';

const sortOptions = [
  'newest',
  'oldest',
  'name-asc',
  'name-desc',
  'price-asc',
  'price-desc',
  'featured',
] as const;

export const productSearchQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, 'Search keyword cannot exceed 100 characters')
      .optional(),
    category: z.string().trim().max(100).optional(),
    categoryId: z.string().trim().optional(),
    brand: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (Array.isArray(val)) return val.flatMap((b) => b.split(',')).map((b) => b.trim());
        return val.split(',').map((b) => b.trim()).filter((b) => b.length > 0);
      }),
    brandId: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (Array.isArray(val)) return val.flatMap((b) => b.split(',')).map((b) => b.trim());
        return val.split(',').map((b) => b.trim()).filter((b) => b.length > 0);
      }),
    minPrice: z.coerce.number().int().min(0, 'minPrice must be non-negative').optional(),
    maxPrice: z.coerce.number().int().min(0, 'maxPrice must be non-negative').optional(),
    featured: z
      .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        if (typeof val === 'boolean') return val;
        return val === 'true' || val === '1';
      }),
    attribute: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
      }),
    spec: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
      }),
    sort: z.enum(sortOptions).default('newest'),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(24),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: 'minPrice cannot be greater than maxPrice',
      path: ['minPrice'],
    }
  )
  .refine(
    (data) => {
      if (data.brand && data.brand.length > 20) {
        return false;
      }
      if (data.brandId && data.brandId.length > 20) {
        return false;
      }
      return true;
    },
    {
      message: 'Too many brand filters requested (maximum 20 brands allowed)',
      path: ['brand'],
    }
  )
  .refine(
    (data) => {
      if (data.attribute && data.attribute.length > 20) {
        return false;
      }
      if (data.spec && data.spec.length > 20) {
        return false;
      }
      return true;
    },
    {
      message: 'Too many attribute/spec filters requested (maximum 20 allowed)',
      path: ['attribute'],
    }
  );

export const productFacetsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  brand: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.flatMap((b) => b.split(',')).map((b) => b.trim());
      return val.split(',').map((b) => b.trim()).filter((b) => b.length > 0);
    }),
  brandId: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.flatMap((b) => b.split(',')).map((b) => b.trim());
      return val.split(',').map((b) => b.trim()).filter((b) => b.length > 0);
    }),
});
