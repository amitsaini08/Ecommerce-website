import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    imageUrl: { type: String },
    parentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    createdAt: { type: Date, default: Date.now },
    isRoot: { type: Boolean, default: false },
  },
  { timestamps: false }
);
CategorySchema.index({ parentIds: 1 });

CategorySchema.index({ parentIds: 1, createdAt: -1, _id: -1 });
CategorySchema.index({ isRoot: 1, createdAt: -1, _id: -1 }); 
CategorySchema.index({ name: 'text' });  

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
