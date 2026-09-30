import mongoose from 'mongoose';

const ProductAddonSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    categoryIds: { type: [String], ref: 'Category', default: [] },
    stock: { type: Number, default: 0 },
    isOutOfStock: { type: Boolean, default: false },
    images: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    codAvailable: { type: Boolean, default: true },
    specifications: { type: mongoose.Schema.Types.Mixed, default: [] },
    addons: { type: [ProductAddonSchema], default: [] },
    productLink: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, _id: false }
);

ProductSchema.virtual('id').get(function () {
  return this._id;
});
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
