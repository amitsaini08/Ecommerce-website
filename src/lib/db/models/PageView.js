import mongoose from 'mongoose';

const PageViewSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    visitorId: { type: String, required: true },
    path: { type: String, required: true },
    userAgent: { type: String },
    device: { type: String },
    referrer: { type: String },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false, _id: false }
);

PageViewSchema.virtual('id').get(function () {
  return this._id;
});
PageViewSchema.set('toJSON', { virtuals: true });
PageViewSchema.set('toObject', { virtuals: true });

export default mongoose.models.PageView || mongoose.model('PageView', PageViewSchema);
