import mongoose from 'mongoose';

const BannerSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String },
    subtitle: { type: String },
    imageUrl: { type: String },
    bgColor: { type: String, default: '#18181b', required: true },
    linkUrl: { type: String },
    isActive: { type: Boolean, default: true, required: true },
    sortOrder: { type: Number, default: 0, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false, _id: false }
);

BannerSchema.virtual('id').get(function () {
  return this._id;
});
BannerSchema.set('toJSON', { virtuals: true });
BannerSchema.set('toObject', { virtuals: true });

export default mongoose.models.Banner || mongoose.model('Banner', BannerSchema);
