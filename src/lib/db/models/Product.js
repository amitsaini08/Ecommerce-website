import mongoose from 'mongoose';

const ProductAddonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    stock: { type: Number, default: 0 },
    isOutOfStock: { type: Boolean, default: false },
    images: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    codAvailable: { type: Boolean, default: true },
    specifications: [{ label: String, value: String, _id: false }],
    addons: { type: [ProductAddonSchema], default: [] },
    productLink: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
