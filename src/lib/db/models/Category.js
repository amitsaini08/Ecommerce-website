import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    imageUrl: { type: String },
    parentIds: { type: [String], ref: 'Category', default: [] },
    createdAt: { type: Date, default: Date.now },
    isRoot: { type: Boolean, default: false },
  },
  { timestamps: false, _id: false }
);
CategorySchema.index({ parentIds: 1 });
CategorySchema.virtual('id').get(function () {
  return this._id;
});
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });
CategorySchema.index({ parentIds: 1, createdAt: -1, _id: -1 });
CategorySchema.index({ isRoot: 1, createdAt: -1, _id: -1 }); 
CategorySchema.index({ name: 'text' });  

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
