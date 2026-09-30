import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['flat', 'percent'], required: true },
    value: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, _id: false }
);

CouponSchema.virtual('id').get(function () {
  return this._id;
});
CouponSchema.set('toJSON', { virtuals: true });
CouponSchema.set('toObject', { virtuals: true });

export default mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
