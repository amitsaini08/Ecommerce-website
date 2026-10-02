import mongoose from 'mongoose';

const BannerSchema = new mongoose.Schema(
  {
    title: { type: String },
    subtitle: { type: String },
    imageUrl: { type: String },
    bgColor: { type: String, default: '#18181b', required: true },
    linkUrl: { type: String },
    isActive: { type: Boolean, default: true, required: true },
    sortOrder: { type: Number, default: 0, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false }
);



export default mongoose.models.Banner || mongoose.model('Banner', BannerSchema);
