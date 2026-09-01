import { Schema, model, Document, Types } from 'mongoose';

export interface IVariantAttribute {
  name: string;
  value: string;
}

export interface IVariantDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface IProductVariant extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  name?: string | null;
  attributes: IVariantAttribute[];
  attributeSignature: string;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: IVariantDimensions | null;
  isActive: boolean;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const variantAttributeSchema = new Schema<IVariantAttribute>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  { _id: false }
);

const variantDimensionsSchema = new Schema<IVariantDimensions>(
  {
    lengthCm: { type: Number, required: true, min: 0 },
    widthCm: { type: Number, required: true, min: 0 },
    heightCm: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productVariantSchema = new Schema<IProductVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
      maxlength: 150,
    },
    attributes: {
      type: [variantAttributeSchema],
      default: [],
    },
    attributeSignature: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be stored as an integer in minor monetary units',
      },
    },
    compareAtPrice: {
      type: Number,
      default: null,
      min: [0, 'Compare-at price must be greater than or equal to 0'],
      validate: {
        validator: function (val: number | null | undefined) {
          if (val === null || val === undefined) return true;
          return Number.isInteger(val) && val >= (this as unknown as IProductVariant).price;
        },
        message: 'Compare-at price must be an integer greater than or equal to the selling price',
      },
    },
    costPrice: {
      type: Number,
      default: null,
      min: [0, 'Cost price must be greater than or equal to 0'],
      validate: {
        validator: (val: number | null | undefined) => (val === null || val === undefined ? true : Number.isInteger(val)),
        message: 'Cost price must be stored as an integer in minor monetary units',
      },
    },
    barcode: {
      type: String,
      default: null,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    weightGrams: {
      type: Number,
      default: null,
      min: [0, 'Weight must be greater than or equal to 0'],
    },
    dimensions: {
      type: variantDimensionsSchema,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
        delete ret.attributeSignature;
        return ret;
      },
    },
  }
);

// Compound unique index to prevent duplicate attribute combination under the same Product
productVariantSchema.index({ productId: 1, attributeSignature: 1 }, { unique: true });

export const ProductVariant = model<IProductVariant>('ProductVariant', productVariantSchema);
