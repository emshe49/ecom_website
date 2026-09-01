import { Schema, model, Document, Types } from 'mongoose';
import { PRODUCT_STATUS_LIST, ProductStatus, PRODUCT_STATUS } from './product.constants.js';

export interface IProductImage {
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface IProductAttribute {
  name: string;
  value: string;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId: Types.ObjectId;
  brandId?: Types.ObjectId | null;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  images: IProductImage[];
  attributes: IProductAttribute[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    altText: {
      type: String,
      default: null,
      trim: true,
      maxlength: 200,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const productAttributeSchema = new Schema<IProductAttribute>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    shortDescription: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: PRODUCT_STATUS_LIST,
      default: PRODUCT_STATUS.DRAFT,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    attributes: {
      type: [productAttributeSchema],
      default: [],
    },
    seoTitle: {
      type: String,
      default: null,
      trim: true,
      maxlength: [70, 'SEO title cannot exceed 70 characters'],
    },
    seoDescription: {
      type: String,
      default: null,
      trim: true,
      maxlength: [160, 'SEO description cannot exceed 160 characters'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

productSchema.index({ createdAt: -1 });

export const Product = model<IProduct>('Product', productSchema);
