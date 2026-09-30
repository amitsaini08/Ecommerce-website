import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    productId: { type: String, ref: 'Product', required: true },
    userId: { type: String, ref: 'User', default: null },
    userName: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    imageUrl: { type: String },
    mediaUrls: { type: [String], default: [] },
    isHidden: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
